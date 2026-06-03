import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  appState: defineTable({
    key: v.string(),
    data: v.any(),
    updatedAt: v.number()
  }).index("by_key", ["key"]),

  maquinas: defineTable({
    idMaquina: v.string(),
    nombreMaquina: v.string(),
    status: v.string(),
    deletedAt: v.union(v.number(), v.null()),
    settings: v.object({
      bankCommissionPercent: v.number(),
      fuelReminderEveryVisits: v.number(),
      monthlyFloorCost: v.number()
    }),
    configuracionFilas: v.array(v.object({
      fila: v.string(),
      espacios: v.number()
    })),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_idMaquina", ["idMaquina"]),

  productos: defineTable({
    idProducto: v.string(),
    nombreProducto: v.string(),
    precio: v.number(),
    costo: v.number(),
    activo: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_idProducto", ["idProducto"])
    .index("by_nombreProducto", ["nombreProducto"]),

  maquina_productos: defineTable({
    idMaquina: v.string(),
    idProducto: v.string(),
    ordenContable: v.number(),
    activoEnMaquina: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_maquina", ["idMaquina"])
    .index("by_maquina_producto", ["idMaquina", "idProducto"]),

  matriz_visual: defineTable({
    idMaquina: v.string(),
    coordenada: v.string(),
    fila: v.string(),
    columna: v.number(),
    idProducto: v.union(v.string(), v.null()),
    updatedAt: v.number()
  }).index("by_maquina", ["idMaquina"])
    .index("by_maquina_coordenada", ["idMaquina", "coordenada"]),

  visitas: defineTable({
    idVisita: v.string(),
    idMaquina: v.string(),
    fecha: v.string(),
    tipo: v.string(),
    estado: v.string(),
    fuelCost: v.number(),
    createdAt: v.number(),
    closedAt: v.number()
  }).index("by_idVisita", ["idVisita"])
    .index("by_maquina_fecha", ["idMaquina", "fecha"])
    .index("by_maquina", ["idMaquina"]),

  detalle_visita: defineTable({
    idDetalleVisita: v.string(),
    idVisita: v.string(),
    idMaquina: v.string(),
    idProducto: v.string(),
    nombreProducto: v.string(),
    stockAnterior: v.number(),
    representante: v.string(),
    SM: v.number(),
    NS: v.number(),
    UV: v.number(),
    estadoValidacion: v.string(),
    notaValidacion: v.string(),
    precio: v.number(),
    costo: v.number(),
    createdAt: v.number()
  }).index("by_visita", ["idVisita"])
    .index("by_maquina", ["idMaquina"])
    .index("by_maquina_producto", ["idMaquina", "idProducto"])
});
