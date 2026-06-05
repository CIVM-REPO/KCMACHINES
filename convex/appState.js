import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const EMPTY_PRODUCT = "EMPTY";
const defaultRowSizes = [5, 5, 10, 10, 10, 10];
const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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

function rowSizesFromConfig(configRows) {
  if (!Array.isArray(configRows)) return null;
  return configRows
    .map((row) => Math.trunc(Number(row?.spaces ?? row?.espacios)))
    .filter((size) => size >= 1 && size <= 12);
}

function normalizeRowSizes(value) {
  const source = Array.isArray(value) && value.length ? value : defaultRowSizes;
  return source
    .map((size) => Math.trunc(Number(size)))
    .filter((size) => size >= 1 && size <= 12)
    .slice(0, rowLetters.length);
}

function machineRowSizes(machine) {
  return normalizeRowSizes(machine?.rowSizes || rowSizesFromConfig(machine?.configuracionFilas));
}

function machineList(appState) {
  const machines = Array.isArray(appState?.machines) ? appState.machines : [];

  return machines
    .filter((machine) => !machine.deletedAt)
    .map((machine, index) => ({
      idMaquina: String(machine.id || machine.idMaquina || `machine-${index + 1}`),
      nombreMaquina: String(machine.name || machine.nombreMaquina || `Maquina ${index + 1}`),
      status: String(machine.status || "active"),
      deletedAt: machine.deletedAt || null,
      settings: {
        bankCommissionPercent: Number(machine.settings?.bankCommissionPercent ?? 3),
        fuelReminderEveryVisits: Number(machine.settings?.fuelReminderEveryVisits ?? 4),
        monthlyFloorCost: Number(machine.settings?.monthlyFloorCost ?? 0)
      },
      rowSizes: machineRowSizes(machine),
      visualLayout: normalizeVisualLayout(machine?.visualLayout || machine?.layoutVisual, machineRowSizes(machine))
    }));
}

function machineProductIds(appState, idMaquina, products) {
  return products.map((product) => product.idProducto);
}

function normalizeVisualLayout(layout, rowSizes = defaultRowSizes) {
  const validCodes = new Set(rowSizes.flatMap((size, rowIndex) => Array.from({ length: size }, (_, index) => (
    `${rowLetters[rowIndex]}${String(index + 1).padStart(2, "0")}`
  ))));
  const entries = Array.isArray(layout)
    ? layout
    : layout && typeof layout === "object"
      ? Object.entries(layout).map(([code, product]) => ({ code, product }))
      : [];
  const normalized = {};

  entries.forEach((entry) => {
    const code = String(entry?.code || entry?.coordenada || "").trim().toUpperCase();
    const idProducto = productId(entry?.product || entry?.idProducto || entry?.nombreProducto);
    if (validCodes.has(code)) normalized[code] = idProducto && idProducto !== EMPTY_PRODUCT ? idProducto : null;
  });

  return normalized;
}

function machineConfigRows(machine) {
  return machine.rowSizes.map((spaces, index) => ({
    fila: rowLetters[index],
    espacios: spaces
  }));
}

function defaultVisualMatrix(machine) {
  return machine.rowSizes.flatMap((size, rowIndex) => {
    const fila = rowLetters[rowIndex];
    return Array.from({ length: size }, (_, index) => ({
      idMaquina: machine.idMaquina,
      coordenada: `${fila}${String(index + 1).padStart(2, "0")}`,
      fila,
      columna: index + 1,
      idProducto: null
    }));
  });
}

function recordsForMachine(appState, idMaquina) {
  return (appState?.records || []).filter((record) => record.machineId === idMaquina || record.idMaquina === idMaquina);
}

function latestRecord(appState, idMaquina) {
  return [...recordsForMachine(appState, idMaquina)].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0] || null;
}

function visualMatrixFromState(appState, machine) {
  const record = latestRecord(appState, machine.idMaquina);
  const slots = Array.isArray(record?.slotsSnapshot) ? record.slotsSnapshot : Array.isArray(record?.slots) ? record.slots : [];
  const byCode = new Map(slots.map((slot) => [slot.code, slot]));

  return defaultVisualMatrix(machine).map((cell) => {
    const slot = byCode.get(cell.coordenada);
    const idProducto = productId(slot?.product) || machine.visualLayout[cell.coordenada] || null;
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

async function deleteMachineBundle(ctx, idMaquina) {
  await deleteByMachine(ctx, "maquina_productos", idMaquina);
  await deleteByMachine(ctx, "matriz_visual", idMaquina);
  await deleteByMachine(ctx, "detalle_visita", idMaquina);
  await deleteByMachine(ctx, "visitas", idMaquina);
}

async function syncNormalizedState(ctx, appState) {
  const now = Date.now();
  const machines = machineList(appState);
  const activeMachineId = appState?.activeMachineId && machines.some((machine) => machine.idMaquina === appState.activeMachineId && machine.status !== "inactive")
    ? String(appState.activeMachineId)
    : machines.find((machine) => machine.status !== "inactive")?.idMaquina || null;
  const products = normalizedProducts(appState);
  const productsById = new Map(products.map((product) => [product.idProducto, product]));
  const machineIds = new Set(machines.map((machine) => machine.idMaquina));

  const existingMachines = await ctx.db.query("maquinas").collect();
  await Promise.all(existingMachines
    .filter((machine) => !machineIds.has(machine.idMaquina))
    .map(async (machine) => {
      await deleteMachineBundle(ctx, machine.idMaquina);
      await ctx.db.delete(machine._id);
    }));

  await Promise.all(machines.map((machine) => upsertByIndex(
    ctx,
    "maquinas",
    "by_idMaquina",
    (q) => q.eq("idMaquina", machine.idMaquina),
    {
      idMaquina: machine.idMaquina,
      nombreMaquina: machine.nombreMaquina,
      status: machine.status,
      deletedAt: machine.deletedAt,
      settings: machine.settings,
      configuracionFilas: machineConfigRows(machine),
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

  await Promise.all(machines.map(async (machine) => {
    const machineProducts = machineProductIds(appState, machine.idMaquina, products)
      .map((idProducto) => productsById.get(idProducto))
      .filter(Boolean);

    await deleteByMachine(ctx, "maquina_productos", machine.idMaquina);
    await Promise.all(machineProducts.map((product, index) => upsertByIndex(
      ctx,
      "maquina_productos",
      "by_maquina_producto",
      (q) => q.eq("idMaquina", machine.idMaquina).eq("idProducto", product.idProducto),
      {
        idMaquina: machine.idMaquina,
        idProducto: product.idProducto,
        ordenContable: index,
        activoEnMaquina: true,
        createdAt: now,
        updatedAt: now
      }
    )));

    await deleteByMachine(ctx, "matriz_visual", machine.idMaquina);
    await Promise.all(visualMatrixFromState(appState, machine).map((cell) => ctx.db.insert("matriz_visual", {
      ...cell,
      updatedAt: now
    })));
  }));

  if (!activeMachineId) return;

  await deleteByMachine(ctx, "detalle_visita", activeMachineId);
  await deleteByMachine(ctx, "visitas", activeMachineId);
  for (const record of recordsForMachine(appState, activeMachineId)) {
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
