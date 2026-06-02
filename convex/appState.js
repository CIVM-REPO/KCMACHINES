import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const EMPTY_PRODUCT = "EMPTY";
const rowSizes = [5, 5, 10, 10, 10, 10];
const rowLetters = ["A", "B", "C", "D", "E", "F"];

function productId(productName) {
  return String(productName || "").trim().toUpperCase();
}

function normalizedProducts(appState) {
  const source = Array.isArray(appState?.products) ? appState.products : [];
  const seen = new Set();

  return source
    .map((product) => ({
      idProducto: productId(product.name || product.nombreProducto),
      nombreProducto: productId(product.name || product.nombreProducto),
      precio: Number(product.price ?? product.precio ?? 0),
      costo: Number(product.cost ?? product.costo ?? 0)
    }))
    .filter((product) => product.idProducto && !seen.has(product.idProducto) && seen.add(product.idProducto));
}

function machineList(appState) {
  const machines = Array.isArray(appState?.machines) && appState.machines.length
    ? appState.machines
    : [{ id: "kc-01", name: "KC Machines" }];

  return machines.map((machine) => ({
    idMaquina: String(machine.id || "kc-01"),
    nombreMaquina: String(machine.name || machine.nombreMaquina || "KC Machines")
  }));
}

function machineConfigRows() {
  return rowSizes.map((spaces, index) => ({
    fila: rowLetters[index],
    espacios: spaces
  }));
}

function defaultVisualMatrix(idMaquina) {
  return rowSizes.flatMap((size, rowIndex) => {
    const fila = rowLetters[rowIndex];
    return Array.from({ length: size }, (_, index) => ({
      idMaquina,
      coordenada: `${fila}${String(index + 1).padStart(2, "0")}`,
      fila,
      columna: index + 1,
      idProducto: null
    }));
  });
}

function latestRecord(appState) {
  return [...(appState?.records || [])].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0] || null;
}

function visualMatrixFromState(appState, idMaquina) {
  const record = latestRecord(appState);
  const slots = Array.isArray(record?.slotsSnapshot) ? record.slotsSnapshot : Array.isArray(record?.slots) ? record.slots : [];
  const byCode = new Map(slots.map((slot) => [slot.code, slot]));

  return defaultVisualMatrix(idMaquina).map((cell) => {
    const slot = byCode.get(cell.coordenada);
    const idProducto = productId(slot?.product);
    return {
      ...cell,
      idProducto: idProducto && idProducto !== EMPTY_PRODUCT ? idProducto : null
    };
  });
}

function visitDetailsForRecord(record, productsById) {
  if (Array.isArray(record?.visitDetails)) {
    return record.visitDetails
      .map((detail) => {
        const idProducto = productId(detail.product || detail.nombreProducto);
        const catalog = productsById.get(idProducto);
        return {
          idProducto,
          nombreProducto: idProducto,
          stockAnterior: Number(detail.stockAnterior || 0),
          representante: String(detail.representative || detail.representante || "SR"),
          SM: Number(detail.SM || 0),
          NS: Number(detail.NS || 0),
          UV: Number(detail.UV || 0),
          estadoValidacion: String(detail.status || detail.estadoValidacion || "ok"),
          notaValidacion: String(detail.note || detail.notaValidacion || ""),
          precio: Number(detail.price ?? catalog?.precio ?? 0),
          costo: Number(detail.cost ?? catalog?.costo ?? 0)
        };
      })
      .filter((detail) => detail.idProducto && detail.idProducto !== EMPTY_PRODUCT);
  }

  const movementByProduct = new Map();
  (record?.salesMovements || []).forEach((movement) => {
    const idProducto = productId(movement.product);
    const current = movementByProduct.get(idProducto) || {
      sold: 0,
      price: Number(movement.price || 0),
      cost: Number(movement.cost || 0),
      sourceSlot: movement.sourceSlot || ""
    };
    current.sold += Number(movement.sold || 0);
    movementByProduct.set(idProducto, current);
  });

  const stockByProduct = new Map();
  (record?.nextStock || []).forEach((stock) => {
    const idProducto = productId(stock.product);
    stockByProduct.set(idProducto, stock);
  });

  return [...new Set([...movementByProduct.keys(), ...stockByProduct.keys()])]
    .filter((idProducto) => idProducto && idProducto !== EMPTY_PRODUCT)
    .map((idProducto) => {
      const movement = movementByProduct.get(idProducto);
      const stock = stockByProduct.get(idProducto);
      const UV = Number(movement?.sold || 0);
      const NS = Number(stock?.stock || 0);
      const catalog = productsById.get(idProducto);

      return {
        idProducto,
        nombreProducto: idProducto,
        stockAnterior: NS + UV,
        representante: String(stock?.representative || stock?.slotCode || stock?.code || movement?.sourceSlot || "SR"),
        SM: NS,
        NS,
        UV,
        estadoValidacion: "migrated",
        notaValidacion: "Registro anterior convertido desde appState",
        precio: Number(movement?.price ?? stock?.price ?? catalog?.precio ?? 0),
        costo: Number(movement?.cost ?? stock?.cost ?? catalog?.costo ?? 0)
      };
    });
}

async function upsertByIndex(ctx, table, indexName, indexBuilder, patch) {
  const existing = await ctx.db.query(table).withIndex(indexName, indexBuilder).unique();
  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return existing._id;
  }
  return await ctx.db.insert(table, patch);
}

async function deleteByMachine(ctx, table, idMaquina) {
  const rows = await ctx.db.query(table).withIndex("by_maquina", (q) => q.eq("idMaquina", idMaquina)).collect();
  await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
}

async function syncNormalizedState(ctx, appState) {
  const now = Date.now();
  const machines = machineList(appState);
  const activeMachineId = String(appState?.activeMachineId || machines[0]?.idMaquina || "kc-01");
  const products = normalizedProducts(appState);
  const productsById = new Map(products.map((product) => [product.idProducto, product]));

  await Promise.all(machines.map((machine) => upsertByIndex(
    ctx,
    "maquinas",
    "by_idMaquina",
    (q) => q.eq("idMaquina", machine.idMaquina),
    {
      idMaquina: machine.idMaquina,
      nombreMaquina: machine.nombreMaquina,
      configuracionFilas: machineConfigRows(),
      createdAt: now,
      updatedAt: now
    }
  )));

  await Promise.all(products.map((product) => upsertByIndex(
    ctx,
    "productos",
    "by_idProducto",
    (q) => q.eq("idProducto", product.idProducto),
    {
      ...product,
      activo: true,
      createdAt: now,
      updatedAt: now
    }
  )));

  await Promise.all(products.map((product, index) => upsertByIndex(
    ctx,
    "maquina_productos",
    "by_maquina_producto",
    (q) => q.eq("idMaquina", activeMachineId).eq("idProducto", product.idProducto),
    {
      idMaquina: activeMachineId,
      idProducto: product.idProducto,
      ordenContable: index,
      activoEnMaquina: true,
      createdAt: now,
      updatedAt: now
    }
  )));

  await deleteByMachine(ctx, "matriz_visual", activeMachineId);
  await Promise.all(visualMatrixFromState(appState, activeMachineId).map((cell) => ctx.db.insert("matriz_visual", {
    ...cell,
    updatedAt: now
  })));

  await deleteByMachine(ctx, "detalle_visita", activeMachineId);
  await deleteByMachine(ctx, "visitas", activeMachineId);
  for (const record of appState?.records || []) {
    const idVisita = `${activeMachineId}:${record.date}`;
    await ctx.db.insert("visitas", {
      idVisita,
      idMaquina: activeMachineId,
      fecha: String(record.date || ""),
      tipo: String(record.type || "visita_real"),
      estado: String(record.status || "closed"),
      fuelCost: Number(record.fuelCost || 0),
      createdAt: Number(record.createdAt || now),
      closedAt: Number(record.closedAt || now)
    });

    const details = visitDetailsForRecord(record, productsById);
    await Promise.all(details.map((detail) => ctx.db.insert("detalle_visita", {
      idDetalleVisita: `${idVisita}:${detail.idProducto}`,
      idVisita,
      idMaquina: activeMachineId,
      ...detail,
      createdAt: now
    })));
  }
}

export const get = query({
  args: {
    key: v.string()
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("appState")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    return row?.data ?? null;
  }
});

export const normalizedCounts = query({
  args: {},
  handler: async (ctx) => ({
    maquinas: (await ctx.db.query("maquinas").collect()).length,
    productos: (await ctx.db.query("productos").collect()).length,
    maquinaProductos: (await ctx.db.query("maquina_productos").collect()).length,
    matrizVisual: (await ctx.db.query("matriz_visual").collect()).length,
    visitas: (await ctx.db.query("visitas").collect()).length,
    detalleVisita: (await ctx.db.query("detalle_visita").collect()).length
  })
});

export const save = mutation({
  args: {
    key: v.string(),
    data: v.any()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("appState")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    const patch = {
      key: args.key,
      data: args.data,
      updatedAt: Date.now()
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      await syncNormalizedState(ctx, args.data);
      return existing._id;
    }

    const id = await ctx.db.insert("appState", patch);
    await syncNormalizedState(ctx, args.data);
    return id;
  }
});
