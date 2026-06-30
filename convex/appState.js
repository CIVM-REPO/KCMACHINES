import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const EMPTY_PRODUCT = "EMPTY";
const defaultRowSizes = [5, 5, 10, 10, 10, 10];
const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MAX_LEGACY_APPSTATE_BYTES = 700_000;
const DEFAULT_APPSTATE_KEY = "kc-machines-v28-product-total";

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

function jsonByteSize(value) {
  return JSON.stringify(value).length;
}

function compactLegacyRecord(record) {
  const compact = { ...(record || {}) };
  const hasVisitDetails = Array.isArray(compact.visitDetails) && compact.visitDetails.length;

  if (hasVisitDetails) {
    delete compact.slotsSnapshot;
    delete compact.catalogSnapshot;
  }
  delete compact.slots;
  delete compact.salesMovements;
  delete compact.nextStock;

  return compact;
}

function compactLegacyAppState(appState) {
  if (!appState || typeof appState !== "object") return appState;
  return {
    ...appState,
    records: Array.isArray(appState.records) ? appState.records.map(compactLegacyRecord) : appState.records
  };
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

function normalizedVisitDetails(details) {
  return (Array.isArray(details) ? details : [])
    .map((detail) => {
      const idProducto = productId(detail?.idProducto || detail?.product || detail?.nombreProducto);
      return {
        idProducto,
        nombreProducto: productId(detail?.nombreProducto || detail?.product || detail?.idProducto),
        stockAnterior: Number(detail?.stockAnterior || 0),
        representante: String(detail?.representante || detail?.representative || "SR"),
        SM: Number(detail?.SM || 0),
        NS: Number(detail?.NS || 0),
        UV: Number(detail?.UV || 0),
        estadoValidacion: String(detail?.estadoValidacion || detail?.status || "ok"),
        notaValidacion: String(detail?.notaValidacion || detail?.note || ""),
        precio: Number(detail?.precio ?? detail?.price ?? 0),
        costo: Number(detail?.costo ?? detail?.cost ?? 0)
      };
    })
    .filter((detail) => detail.idProducto && detail.idProducto !== EMPTY_PRODUCT);
}

function matrixEntriesFromArgs(args) {
  const source = Array.isArray(args.matriz)
    ? args.matriz
    : Array.isArray(args.visualLayout)
      ? args.visualLayout
      : args.visualLayout && typeof args.visualLayout === "object"
        ? Object.entries(args.visualLayout).map(([coordenada, idProducto]) => ({ coordenada, idProducto }))
        : [];

  return source
    .map((entry) => {
      const coordenada = String(entry?.coordenada || entry?.code || "").trim().toUpperCase();
      const match = coordenada.match(/^([A-Z]+)(\d+)$/);
      const idProducto = productId(entry?.idProducto || entry?.product || entry?.nombreProducto);
      return {
        coordenada,
        fila: String(entry?.fila || match?.[1] || "").toUpperCase(),
        columna: Number(entry?.columna ?? match?.[2] ?? 0),
        idProducto: idProducto && idProducto !== EMPTY_PRODUCT ? idProducto : null
      };
    })
    .filter((entry) => entry.coordenada && entry.fila && entry.columna > 0);
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

async function deleteVisitBundle(ctx, idVisita) {
  const details = await ctx.db.query("detalle_visita").withIndex("by_visita", (q) => q.eq("idVisita", idVisita)).collect();
  await Promise.all(details.map((detail) => ctx.db.delete(detail._id)));
}

async function deleteMachineBundle(ctx, idMaquina) {
  await deleteByMachine(ctx, "maquina_productos", idMaquina);
  await deleteByMachine(ctx, "matriz_visual", idMaquina);
  await deleteByMachine(ctx, "cierres_mensuales", idMaquina);
  await deleteByMachine(ctx, "cierres_anuales", idMaquina);
  const visits = await ctx.db.query("visitas").withIndex("by_maquina", (q) => q.eq("idMaquina", idMaquina)).collect();
  for (const visit of visits) {
    await deleteVisitBundle(ctx, visit.idVisita);
    await ctx.db.delete(visit._id);
  }
}

function normalizeMonthlyClosure(closure, idMaquinaFallback = "") {
  const idMaquina = String(closure?.machineId || closure?.idMaquina || idMaquinaFallback || "");
  const mes = String(closure?.month || closure?.mes || "");
  return {
    idMaquina,
    mes,
    data: {
      ...closure,
      machineId: idMaquina,
      month: mes
    },
    closedAt: String(closure?.closedAt || "")
  };
}

function normalizeYearClosure(closure, idMaquinaFallback = "") {
  const idMaquina = String(closure?.machineId || closure?.idMaquina || idMaquinaFallback || "");
  const anio = String(closure?.year || closure?.month || closure?.anio || "");
  return {
    idMaquina,
    anio,
    data: {
      ...closure,
      machineId: idMaquina,
      year: anio,
      month: anio
    },
    closedAt: String(closure?.closedAt || "")
  };
}

async function syncClosuresForMachine(ctx, appState, idMaquina, now) {
  const monthlyClosures = (appState?.monthClosures || [])
    .map((closure) => normalizeMonthlyClosure(closure, idMaquina))
    .filter((closure) => closure.idMaquina === idMaquina && closure.mes);
  const yearlyClosures = (appState?.yearClosures || [])
    .map((closure) => normalizeYearClosure(closure, idMaquina))
    .filter((closure) => closure.idMaquina === idMaquina && closure.anio);

  const nextMonthlyIds = new Set(monthlyClosures.map((closure) => `${closure.idMaquina}:${closure.mes}`));
  const existingMonthly = await ctx.db.query("cierres_mensuales").withIndex("by_maquina", (q) => q.eq("idMaquina", idMaquina)).collect();
  await Promise.all(existingMonthly
    .filter((closure) => !nextMonthlyIds.has(closure.idCierreMensual))
    .map((closure) => ctx.db.delete(closure._id)));

  for (const closure of monthlyClosures) {
    await upsertByIndex(
      ctx,
      "cierres_mensuales",
      "by_maquina_mes",
      (q) => q.eq("idMaquina", closure.idMaquina).eq("mes", closure.mes),
      {
        idCierreMensual: `${closure.idMaquina}:${closure.mes}`,
        idMaquina: closure.idMaquina,
        mes: closure.mes,
        data: closure.data,
        closedAt: closure.closedAt,
        updatedAt: now
      }
    );
  }

  const nextYearlyIds = new Set(yearlyClosures.map((closure) => `${closure.idMaquina}:${closure.anio}`));
  const existingYearly = await ctx.db.query("cierres_anuales").withIndex("by_maquina", (q) => q.eq("idMaquina", idMaquina)).collect();
  await Promise.all(existingYearly
    .filter((closure) => !nextYearlyIds.has(closure.idCierreAnual))
    .map((closure) => ctx.db.delete(closure._id)));

  for (const closure of yearlyClosures) {
    await upsertByIndex(
      ctx,
      "cierres_anuales",
      "by_maquina_anio",
      (q) => q.eq("idMaquina", closure.idMaquina).eq("anio", closure.anio),
      {
        idCierreAnual: `${closure.idMaquina}:${closure.anio}`,
        idMaquina: closure.idMaquina,
        anio: closure.anio,
        data: closure.data,
        closedAt: closure.closedAt,
        updatedAt: now
      }
    );
  }
}

async function syncVisitDetails(ctx, idVisita, idMaquina, details, now) {
  const existingDetails = await ctx.db.query("detalle_visita").withIndex("by_visita", (q) => q.eq("idVisita", idVisita)).collect();
  const nextIds = new Set(details.map((detail) => `${idVisita}:${detail.idProducto}`));

  await Promise.all(existingDetails
    .filter((detail) => !nextIds.has(detail.idDetalleVisita))
    .map((detail) => ctx.db.delete(detail._id)));

  const existingById = new Map(existingDetails.map((detail) => [detail.idDetalleVisita, detail]));
  for (const detail of details) {
    const idDetalleVisita = `${idVisita}:${detail.idProducto}`;
    const patch = {
      idDetalleVisita,
      idVisita,
      idMaquina,
      ...detail,
      createdAt: now
    };
    const existing = existingById.get(idDetalleVisita);
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("detalle_visita", patch);
    }
  }
}

async function syncVisualMatrixPatch(ctx, idMaquina, entries, now) {
  for (const entry of entries) {
    await upsertByIndex(
      ctx,
      "matriz_visual",
      "by_maquina_coordenada",
      (q) => q.eq("idMaquina", idMaquina).eq("coordenada", entry.coordenada),
      {
        idMaquina,
        ...entry,
        updatedAt: now
      }
    );
  }
}

async function syncVisitsForMachine(ctx, appState, activeMachineId, productsById, now) {
  const records = recordsForMachine(appState, activeMachineId);
  const nextVisitIds = new Set(records.map((record) => `${activeMachineId}:${record.date}`));
  const existingVisits = await ctx.db.query("visitas").withIndex("by_maquina", (q) => q.eq("idMaquina", activeMachineId)).collect();

  for (const visit of existingVisits.filter((visit) => !nextVisitIds.has(visit.idVisita))) {
    await deleteVisitBundle(ctx, visit.idVisita);
    await ctx.db.delete(visit._id);
  }

  for (const record of records) {
    const idVisita = `${activeMachineId}:${record.date}`;
    const patch = {
      idVisita,
      idMaquina: activeMachineId,
      fecha: String(record.date || ""),
      tipo: String(record.type || "visita_real"),
      estado: String(record.status || "closed"),
      fuelCost: Number(record.fuelCost || 0),
      createdAt: Number(record.createdAt || now),
      closedAt: Number(record.closedAt || now)
    };
    const existing = await ctx.db
      .query("visitas")
      .withIndex("by_idVisita", (q) => q.eq("idVisita", idVisita))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("visitas", patch);
    }

    await syncVisitDetails(ctx, idVisita, activeMachineId, visitDetailsForRecord(record, productsById), now);
  }
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

  await syncVisitsForMachine(ctx, appState, activeMachineId, productsById, now);
  await syncClosuresForMachine(ctx, appState, activeMachineId, now);
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
    detalleVisita: (await ctx.db.query("detalle_visita").collect()).length,
    cierresMensuales: (await ctx.db.query("cierres_mensuales").collect()).length,
    cierresAnuales: (await ctx.db.query("cierres_anuales").collect()).length
  })
});

export const getBootstrap = query({
  args: {},
  handler: async (ctx) => {
    const appStateRows = await ctx.db.query("appState").collect();
    return {
      maquinas: await ctx.db.query("maquinas").collect(),
      productos: await ctx.db.query("productos").collect(),
      maquinaProductos: await ctx.db.query("maquina_productos").collect(),
      matrizVisual: await ctx.db.query("matriz_visual").collect(),
      cierresMensuales: await ctx.db.query("cierres_mensuales").collect(),
      cierresAnuales: await ctx.db.query("cierres_anuales").collect(),
      metadata: {
        appState: appStateRows.map((row) => ({
          key: row.key,
          updatedAt: row.updatedAt
        })),
        counts: {
          maquinas: (await ctx.db.query("maquinas").collect()).length,
          productos: (await ctx.db.query("productos").collect()).length,
          maquinaProductos: (await ctx.db.query("maquina_productos").collect()).length,
          matrizVisual: (await ctx.db.query("matriz_visual").collect()).length,
          visitas: (await ctx.db.query("visitas").collect()).length,
          detalleVisita: (await ctx.db.query("detalle_visita").collect()).length,
          cierresMensuales: (await ctx.db.query("cierres_mensuales").collect()).length,
          cierresAnuales: (await ctx.db.query("cierres_anuales").collect()).length
        }
      }
    };
  }
});

export const listVisitsByMachine = query({
  args: {
    idMaquina: v.string(),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const visits = await ctx.db.query("visitas").withIndex("by_maquina", (q) => q.eq("idMaquina", args.idMaquina)).collect();
    return visits
      .filter((visit) => !args.fromDate || visit.fecha >= args.fromDate)
      .filter((visit) => !args.toDate || visit.fecha <= args.toDate)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  }
});

export const getVisitDetails = query({
  args: {
    idVisita: v.string()
  },
  handler: async (ctx, args) => {
    const details = await ctx.db.query("detalle_visita").withIndex("by_visita", (q) => q.eq("idVisita", args.idVisita)).collect();
    return details.sort((a, b) => String(a.nombreProducto).localeCompare(String(b.nombreProducto)));
  }
});

export const getLatestVisitBefore = query({
  args: {
    idMaquina: v.string(),
    beforeDate: v.string()
  },
  handler: async (ctx, args) => {
    const visits = await ctx.db.query("visitas").withIndex("by_maquina", (q) => q.eq("idMaquina", args.idMaquina)).collect();
    const latest = visits
      .filter((visit) => visit.fecha < args.beforeDate)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0] || null;
    if (!latest) return null;
    const details = await ctx.db.query("detalle_visita").withIndex("by_visita", (q) => q.eq("idVisita", latest.idVisita)).collect();
    return {
      visit: latest,
      details
    };
  }
});

export const saveVisit = mutation({
  args: {
    idVisita: v.optional(v.string()),
    idMaquina: v.string(),
    fecha: v.string(),
    tipo: v.string(),
    estado: v.string(),
    fuelCost: v.number(),
    createdAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    visitDetails: v.array(v.any()),
    visualLayout: v.optional(v.any()),
    matriz: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const idVisita = String(args.idVisita || `${args.idMaquina}:${args.fecha}`);
    const patch = {
      idVisita,
      idMaquina: args.idMaquina,
      fecha: args.fecha,
      tipo: args.tipo,
      estado: args.estado,
      fuelCost: Number(args.fuelCost || 0),
      createdAt: Number(args.createdAt || now),
      closedAt: Number(args.closedAt || now)
    };

    await upsertByIndex(
      ctx,
      "visitas",
      "by_idVisita",
      (q) => q.eq("idVisita", idVisita),
      patch
    );
    await syncVisitDetails(ctx, idVisita, args.idMaquina, normalizedVisitDetails(args.visitDetails), now);
    await syncVisualMatrixPatch(ctx, args.idMaquina, matrixEntriesFromArgs(args), now);

    return {
      idVisita,
      details: normalizedVisitDetails(args.visitDetails).length,
      matrixUpdated: matrixEntriesFromArgs(args).length
    };
  }
});

export const saveMonthClosure = mutation({
  args: {
    idMaquina: v.string(),
    mes: v.string(),
    data: v.any()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const closure = normalizeMonthlyClosure(args.data, args.idMaquina);
    if (!closure.idMaquina || !closure.mes) {
      throw new Error("Cierre mensual sin maquina o mes");
    }

    await upsertByIndex(
      ctx,
      "cierres_mensuales",
      "by_maquina_mes",
      (q) => q.eq("idMaquina", closure.idMaquina).eq("mes", closure.mes),
      {
        idCierreMensual: `${closure.idMaquina}:${closure.mes}`,
        idMaquina: closure.idMaquina,
        mes: closure.mes,
        data: closure.data,
        closedAt: closure.closedAt,
        updatedAt: now
      }
    );

    return {
      idCierreMensual: `${closure.idMaquina}:${closure.mes}`,
      updatedAt: now
    };
  }
});

export const saveYearClosure = mutation({
  args: {
    idMaquina: v.string(),
    anio: v.string(),
    data: v.any()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const closure = normalizeYearClosure(args.data, args.idMaquina);
    if (!closure.idMaquina || !closure.anio) {
      throw new Error("Cierre anual sin maquina o anio");
    }

    await upsertByIndex(
      ctx,
      "cierres_anuales",
      "by_maquina_anio",
      (q) => q.eq("idMaquina", closure.idMaquina).eq("anio", closure.anio),
      {
        idCierreAnual: `${closure.idMaquina}:${closure.anio}`,
        idMaquina: closure.idMaquina,
        anio: closure.anio,
        data: closure.data,
        closedAt: closure.closedAt,
        updatedAt: now
      }
    );

    return {
      idCierreAnual: `${closure.idMaquina}:${closure.anio}`,
      updatedAt: now
    };
  }
});

export const migrateLegacyClosures = mutation({
  args: {
    key: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("appState")
      .withIndex("by_key", (q) => q.eq("key", args.key || DEFAULT_APPSTATE_KEY))
      .unique();
    const appState = row?.data || {};
    const now = Date.now();
    const monthlyClosures = (appState.monthClosures || [])
      .map((closure) => normalizeMonthlyClosure(closure))
      .filter((closure) => closure.idMaquina && closure.mes);
    const yearlyClosures = (appState.yearClosures || [])
      .map((closure) => normalizeYearClosure(closure))
      .filter((closure) => closure.idMaquina && closure.anio);

    for (const closure of monthlyClosures) {
      await upsertByIndex(
        ctx,
        "cierres_mensuales",
        "by_maquina_mes",
        (q) => q.eq("idMaquina", closure.idMaquina).eq("mes", closure.mes),
        {
          idCierreMensual: `${closure.idMaquina}:${closure.mes}`,
          idMaquina: closure.idMaquina,
          mes: closure.mes,
          data: closure.data,
          closedAt: closure.closedAt,
          updatedAt: now
        }
      );
    }

    for (const closure of yearlyClosures) {
      await upsertByIndex(
        ctx,
        "cierres_anuales",
        "by_maquina_anio",
        (q) => q.eq("idMaquina", closure.idMaquina).eq("anio", closure.anio),
        {
          idCierreAnual: `${closure.idMaquina}:${closure.anio}`,
          idMaquina: closure.idMaquina,
          anio: closure.anio,
          data: closure.data,
          closedAt: closure.closedAt,
          updatedAt: now
        }
      );
    }

    return {
      migratedMonthClosures: monthlyClosures.length,
      migratedYearClosures: yearlyClosures.length
    };
  }
});

export const save = mutation({
  args: {
    key: v.string(),
    data: v.any()
  },
  handler: async (ctx, args) => {
    const data = compactLegacyAppState(args.data);
    const dataBytes = jsonByteSize(data);
    const existing = await ctx.db
      .query("appState")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (dataBytes > MAX_LEGACY_APPSTATE_BYTES) {
      return {
        id: existing?._id || null,
        normalizedSkipped: true,
        legacyAppStateSkipped: true,
        reason: `legacy appState payload exceeds ${MAX_LEGACY_APPSTATE_BYTES} bytes after compaction`,
        bytes: dataBytes
      };
    }

    const patch = {
      key: args.key,
      data,
      updatedAt: Date.now()
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return {
        id: existing._id,
        normalizedSkipped: true,
        legacyAppStateCompacted: data !== args.data,
        bytes: dataBytes
      };
    }

    const id = await ctx.db.insert("appState", patch);
    return {
      id,
      normalizedSkipped: true,
      legacyAppStateCompacted: data !== args.data,
      bytes: dataBytes
    };
  }
});
