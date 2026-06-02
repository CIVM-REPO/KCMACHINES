const STORAGE_KEY = "kc-machines-v28-product-total";
const convexUrl = String(process.argv[2] || "").trim().replace(/\/$/, "");

if (!convexUrl) {
  console.error("Uso: node agentes/migracion/reset-convex-pruebas.mjs <CONVEX_URL>");
  process.exit(1);
}

const defaultProducts = [
  { name: "COCA-COLA", price: 0.9, cost: 0.6 },
  { name: "COCA-COLA ZERO", price: 0.9, cost: 0.6 },
  { name: "PEPSI", price: 0.85, cost: 0.6 },
  { name: "PEPSI LIGHT", price: 0.85, cost: 0.6 },
  { name: "JUGO PETIT", price: 0.85, cost: 0.5 },
  { name: "TE LIPTON", price: 0.85, cost: 0.63 },
  { name: "SALUTARIS", price: 0.85, cost: 0.63 },
  { name: "AGUA AQUA", price: 0.7, cost: 0.3 },
  { name: "HI ENERGY", price: 0.65, cost: 0.43 },
  { name: "ADRENALINE", price: 2, cost: 1.25 },
  { name: "MONSTER", price: 2.5, cost: 1.8 },
  { name: "PETIT CAJA", price: 0.45, cost: 0.27 },
  { name: "SALVA COLA Y SHAMPAN", price: 0.65, cost: 0.35 },
  { name: "MOUNTAIN DEW", price: 0.85, cost: 0.53 },
  { name: "LECHE DE FRESA", price: 1, cost: 0.73 },
  { name: "CHURRO DIANA", price: 0.35, cost: 0.2 },
  { name: "LAYS GRANDE", price: 0.75, cost: 0.5 },
  { name: "CHETOS AZUL", price: 0.5, cost: 0.25 },
  { name: "ELOTITO LIMON Y BACOA", price: 0.25, cost: 0.12 },
  { name: "ELOTITO Y MANI JAPONES", price: 0.35, cost: 0.2 },
  { name: "CERECITA Y GOMITA", price: 0.25, cost: 0.12 },
  { name: "BABY", price: 0.3, cost: 0.2 },
  { name: "TOTIS", price: 0.35, cost: 0.16 },
  { name: "MINI CHOKI", price: 0.75, cost: 0.44 },
  { name: "PRINCIPE", price: 1, cost: 0.59 },
  { name: "CHOKI REGULAR", price: 1, cost: 0.72 },
  { name: "CHIKI", price: 0.35, cost: 0.21 },
  { name: "QUAKER", price: 0.8, cost: 0.59 },
  { name: "SUSPIROS", price: 0.5, cost: 0.21 },
  { name: "GALLETA PICNIC", price: 0.35, cost: 0.2 },
  { name: "FLORENTINA", price: 1, cost: 0.72 }
];

function normalizeProducts(savedProducts) {
  const source = Array.isArray(savedProducts) && savedProducts.length ? savedProducts : defaultProducts;
  const seen = new Set();

  return source
    .map((product) => ({
      name: String(product.name || "").trim().toUpperCase(),
      price: Number(product.price || 0),
      cost: Number(product.cost || 0)
    }))
    .filter((product) => product.name && !seen.has(product.name) && seen.add(product.name));
}

async function convexRequest(type, path, args) {
  const response = await fetch(`${convexUrl}/api/${type}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      path,
      args,
      format: "json"
    })
  });

  if (!response.ok) throw new Error(`Convex HTTP ${response.status}`);

  const payload = await response.json();
  if (payload.status === "error") {
    throw new Error(payload.errorMessage || "Convex request failed");
  }

  return payload.value;
}

const remoteState = await convexRequest("query", "appState:get", { key: STORAGE_KEY });
const cleanState = {
  records: [],
  monthClosures: [],
  yearClosures: [],
  machines: remoteState?.machines || [{ id: "kc-01", name: "KC Machines" }],
  activeMachineId: remoteState?.activeMachineId || "kc-01",
  products: normalizeProducts(remoteState?.products),
  pendingProducts: null,
  pendingProductsEffectiveMonth: null,
  seedScenario: null,
  updatedAt: Date.now()
};

await convexRequest("mutation", "appState:save", {
  key: STORAGE_KEY,
  data: cleanState
});

console.log(JSON.stringify({
  key: STORAGE_KEY,
  products: cleanState.products.length,
  records: cleanState.records.length,
  monthClosures: cleanState.monthClosures.length,
  yearClosures: cleanState.yearClosures.length,
  updatedAt: cleanState.updatedAt
}, null, 2));
