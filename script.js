const STORAGE_KEY = "kc-machines-v28-product-total";
const EMPTY_PRODUCT = "EMPTY";
const CONVEX_URL = String(window.KC_CONVEX_URL || "").trim().replace(/\/$/, "");
let convexSaveTimer = null;

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
let products = [];
let productOrder = new Map();
let imageRefreshVersion = Date.now();
const productColors = ["#46b8ff", "#35e79a", "#f8c45c", "#ef7b8c", "#b98cff", "#72dfdf", "#ff9d5c", "#a6f06f"];
const monthNamesShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const baseProductLayout = {};

const rowSizes = [5, 5, 10, 10, 10, 10];
const rowLetters = ["A", "B", "C", "D", "E", "F"];
const state = loadState();
syncProductCatalog();
let currentSlots = [];
let currentVisitDetails = new Map();
let activeSlotCode = null;

const machineTarget = document.getElementById("machineOperator");
const slotDialog = document.getElementById("slotDialog");
const slotDialogCode = document.getElementById("slotDialogCode");
const slotDialogTitle = document.getElementById("slotDialogTitle");
const foundInput = document.getElementById("foundInput");
const leftInput = document.getElementById("leftInput");
const previousStockLabel = document.getElementById("previousStockLabel");
const dialogResult = document.getElementById("dialogResult");
const saveSlot = document.getElementById("saveSlot");
const updateStock = document.getElementById("updateStock");
const saveDateChanges = document.getElementById("saveDateChanges");
const pendingSales = document.getElementById("pendingSales");
const lastUpdateLabel = document.getElementById("lastUpdateLabel");
const salesList = document.getElementById("salesList");
const stockStatus = document.getElementById("stockStatus");
const dateStatus = document.getElementById("dateStatus");
const dateButton = document.getElementById("dateButton");
const visitDate = document.getElementById("visitDate");
const historyList = document.getElementById("historyList");
const menuToggle = document.getElementById("menuToggle");
const appMenu = document.getElementById("appMenu");
const menuBackdrop = document.getElementById("menuBackdrop");
const generateReport = document.getElementById("generateReport");
const toast = document.getElementById("toast");
const fillTestStock = document.getElementById("fillTestStock");
const clearTestData = document.getElementById("clearTestData");
const mainViewButton = document.getElementById("mainViewButton");
const machineSwitcher = document.getElementById("machineSwitcher");
const productsViewButton = document.getElementById("productsViewButton");
const backToMain = document.getElementById("backToMain");
const backToMainFromProducts = document.getElementById("backToMainFromProducts");
const accountingView = document.getElementById("accountingView");
const productsView = document.getElementById("productsView");
const mainView = document.querySelector(".theme-operator");
const accountingChart = document.getElementById("accountingChart");
const operatingExpenses = document.getElementById("operatingExpenses");
const monthCards = document.getElementById("monthCards");
const closeMonthTemplate = document.getElementById("closeMonthTemplate");
const fuelReminder = document.getElementById("fuelReminder");
const fuelInput = document.getElementById("fuelInput");
const productForm = document.getElementById("productForm");
const productNameInput = document.getElementById("productNameInput");
const productCostInput = document.getElementById("productCostInput");
const productPriceInput = document.getElementById("productPriceInput");
const productsTable = document.getElementById("productsTable");
let showAllHistory = false;
let activeMonthCard = null;
let expandedSalesCard = null;

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)) || { records: [], monthClosures: [], yearClosures: [] });
  } catch {
    return normalizeState({ records: [], monthClosures: [], yearClosures: [] });
  }
}

function stateHasUserData(appState) {
  return Boolean(
    appState.records?.length
    || appState.monthClosures?.length
    || appState.yearClosures?.length
    || appState.pendingProducts?.length
    || appState.pendingProductsEffectiveMonth
  );
}

function shouldKeepLocalState(remoteState) {
  const normalizedRemote = normalizeState(remoteState);
  const localHasData = stateHasUserData(state);
  const remoteHasData = stateHasUserData(normalizedRemote);

  if (localHasData && !remoteHasData) {
    return Number(state.updatedAt || 0) > Number(normalizedRemote.updatedAt || 0);
  }
  if (!localHasData) return false;

  return Number(state.updatedAt || 0) > Number(normalizedRemote.updatedAt || 0);
}

function applyRemoteState(remoteState) {
  const normalized = normalizeState(remoteState);
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, normalized);
  syncProductCatalog();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function convexRequest(type, path, args) {
  if (!CONVEX_URL) return null;

  const response = await fetch(`${CONVEX_URL}/api/${type}`, {
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

async function loadStateFromConvex() {
  if (!CONVEX_URL) return;

  try {
    const remoteState = await convexRequest("query", "appState:get", { key: STORAGE_KEY });
    if (!remoteState) {
      if (stateHasUserData(state)) {
        await saveStateToConvex();
        showToast("Datos locales subidos a Convex");
      }
      return;
    }

    if (shouldKeepLocalState(remoteState)) {
      await saveStateToConvex();
      showToast("Datos locales sincronizados con Convex");
      return;
    }

    applyRemoteState(remoteState);
    loadDate(visitDate.value);
    showToast("Datos sincronizados con Convex");
  } catch (error) {
    console.warn("Convex sync failed", error);
    showToast("Convex no disponible, usando datos locales");
  }
}

function saveStateToConvex() {
  if (!CONVEX_URL) return Promise.resolve();
  return convexRequest("mutation", "appState:save", {
    key: STORAGE_KEY,
    data: state
  });
}

function queueConvexSave() {
  if (!CONVEX_URL) return;
  clearTimeout(convexSaveTimer);
  convexSaveTimer = setTimeout(() => {
    saveStateToConvex().catch((error) => {
      console.warn("Convex save failed", error);
      showToast("No se pudo sincronizar con Convex");
    });
  }, 400);
}

function normalizeState(savedState) {
  return {
    records: savedState.records || [],
    monthClosures: savedState.monthClosures || [],
    yearClosures: savedState.yearClosures || [],
    machines: savedState.machines || [{ id: "kc-01", name: "KC Machines" }],
    activeMachineId: savedState.activeMachineId || "kc-01",
    products: normalizeProducts(savedState.products),
    pendingProducts: Array.isArray(savedState.pendingProducts) ? normalizeProducts(savedState.pendingProducts) : null,
    pendingProductsEffectiveMonth: savedState.pendingProductsEffectiveMonth || null,
    seedScenario: savedState.seedScenario || null,
    updatedAt: Number(savedState.updatedAt || 0)
  };
}

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

function syncProductCatalog() {
  products = normalizeProducts(state.products);
  state.products = products;
  productOrder = new Map(products.map((product, index) => [product.name, index]));
}

function applyPendingCatalogForDate(dateValue) {
  if (!state.pendingProducts || !state.pendingProductsEffectiveMonth) return;
  if (monthKey(dateValue) < state.pendingProductsEffectiveMonth) return;

  state.products = normalizeProducts(state.pendingProducts);
  state.pendingProducts = null;
  state.pendingProductsEffectiveMonth = null;
  syncProductCatalog();
  saveState();
}

function catalogDraftProducts() {
  return state.pendingProducts ? normalizeProducts(state.pendingProducts) : catalogSnapshot(products);
}

function catalogDraftEffectiveMonth() {
  return state.pendingProductsEffectiveMonth || monthKey(firstDayNextMonth(visitDate.value));
}

function scheduleCatalogChange(nextProducts, message) {
  const effectiveMonth = catalogDraftEffectiveMonth();
  state.pendingProducts = normalizeProducts(nextProducts);
  state.pendingProductsEffectiveMonth = effectiveMonth;
  saveState();
  renderProductsEditor();
  showToast(`${message}. Se aplicara desde ${effectiveMonth}`);
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dateToInputValue(date);
}

function dateToInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function stockMapFromRecord(record) {
  return new Map(recordNextStock(record).map((slot) => [slot.slotCode || slot.code || slot.product, Number(slot.stock || 0)]));
}

function stockEntryMapFromRecord(record) {
  return new Map(recordNextStock(record).map((slot) => [slot.slotCode || slot.code || slot.product, slot]));
}

function productStockMapFromRecord(record) {
  return new Map(recordNextStock(record).map((slot) => [slot.product, Number(slot.stock || 0)]));
}

function productStockEntryMapFromRecord(record) {
  return new Map(recordNextStock(record).map((slot) => [slot.product, slot]));
}

function productStockMapFromYearClosure(closure) {
  return new Map((closure?.openingStockNextYear || []).map((slot) => [slot.product, Number(slot.stock || 0)]));
}

function productStockEntryMapFromYearClosure(closure) {
  return new Map((closure?.openingStockNextYear || []).map((slot) => [slot.product, slot]));
}

function buildSlotsSnapshot(slots) {
  return slots.map((slot) => {
    const previousStock = Number(slot.previousStock || 0);
    const previousProduct = previousProductForSlot(slot);
    const salesEntry = slotHasSalesEntry(slot);
    const stockEntry = slotHasStockEntry(slot);
    const hasEntry = slotCanCapture(slot) && (salesEntry || stockEntry || previousStock > 0);
    const counted = isPrimarySalesSlot(slot);
    const stockCounted = isPrimaryStockSlot(slot);

    return {
      code: slot.code,
      product: slot.product,
      previousProduct,
      color: slot.color,
      price: previousProductPrice(slot),
      cost: previousProductCost(slot),
      previousPrice: previousProductPrice(slot),
      previousCost: previousProductCost(slot),
      currentPrice: Number(slot.currentPrice ?? productCatalogItem(slot.product)?.price ?? 0),
      currentCost: Number(slot.currentCost ?? productCatalogItem(slot.product)?.cost ?? 0),
      previousStock,
      found: Number(slot.found || 0),
      left: Number(slot.left || 0),
      sold: salesEntry && counted ? Math.max(previousStock - Number(slot.found || 0), 0) : 0,
      hasEntry,
      foundCaptured: Boolean(slot.foundCaptured),
      salesEntry,
      stockEntry,
      counted,
      salesCounted: counted,
      stockCounted
    };
  });
}

function buildSalesMovements(slotsSnapshot) {
  return slotsSnapshot
    .filter((slot, index) => isCountedRecordSlot({ slots: slotsSnapshot }, slot, index))
    .filter((slot) => recordSlotHasSalesEntry(slot) && Number(slot.previousStock || 0) > 0)
    .map((slot) => {
      const product = slot.previousProduct || slot.product;
      const sold = Math.max(Number(slot.previousStock || 0) - Number(slot.found || 0), 0);
      return {
        product,
        sold,
        price: Number(slot.previousPrice ?? slot.price ?? productCatalogItem(product)?.price ?? 0),
        cost: Number(slot.previousCost ?? slot.cost ?? productCatalogItem(product)?.cost ?? 0),
        sourceSlot: slot.code
      };
    })
    .filter((movement) => !isEmptyProduct(movement.product) && movement.sold > 0);
}

function buildNextStock(slotsSnapshot) {
  const seen = new Set();

  return slotsSnapshot
    .filter((slot) => !isEmptyProduct(slot.product))
    .filter((slot) => Boolean(slot.stockEntry) || Number(slot.left || 0) > 0)
    .filter((slot, index) => isCountedStockRecordSlot({ slots: slotsSnapshot }, slot, index))
    .filter((slot) => !seen.has(slot.product) && seen.add(slot.product))
    .map((slot) => ({
      slotCode: slot.code,
      code: slot.code,
      product: slot.product,
      stock: Number(slot.left || 0),
      price: Number(slot.currentPrice ?? productCatalogItem(slot.product)?.price ?? 0),
      cost: Number(slot.currentCost ?? productCatalogItem(slot.product)?.cost ?? 0)
    }));
}

function recordSalesMovements(record) {
  if (Array.isArray(record?.visitDetails)) {
    return record.visitDetails
      .map((detail) => ({
        product: detail.product || detail.nombreProducto || "",
        sold: Number(detail.UV || 0),
        price: Number(detail.price ?? productCatalogItem(detail.product)?.price ?? 0),
        cost: Number(detail.cost ?? productCatalogItem(detail.product)?.cost ?? 0),
        sourceSlot: detail.representative === "SR" ? "" : detail.representative || ""
      }))
      .filter((movement) => !isEmptyProduct(movement.product) && movement.sold > 0);
  }

  if (Array.isArray(record?.salesMovements)) {
    return record.salesMovements.map((movement) => ({
      product: movement.product,
      sold: Number(movement.sold || 0),
      price: Number(movement.price || 0),
      cost: Number(movement.cost || 0),
      sourceSlot: movement.sourceSlot || movement.code || ""
    })).filter((movement) => !isEmptyProduct(movement.product) && movement.sold > 0);
  }

  return buildSalesMovements(record?.slotsSnapshot || record?.slots || []);
}

function recordNextStock(record) {
  if (Array.isArray(record?.visitDetails)) {
    return record.visitDetails
      .map((detail) => ({
        product: detail.product || detail.nombreProducto || "",
        stock: Number(detail.NS || 0),
        price: Number(detail.price ?? productCatalogItem(detail.product)?.price ?? 0),
        cost: Number(detail.cost ?? productCatalogItem(detail.product)?.cost ?? 0),
        representative: detail.representative || detail.representante || "SR"
      }))
      .filter((slot) => !isEmptyProduct(slot.product) && slot.stock > 0);
  }

  if (Array.isArray(record?.nextStock)) {
    return record.nextStock.map((slot) => ({
      slotCode: slot.slotCode || slot.code,
      code: slot.slotCode || slot.code,
      product: slot.product,
      stock: Number(slot.stock ?? slot.left ?? 0),
      price: Number(slot.price || 0),
      cost: Number(slot.cost || 0)
    })).filter((slot) => !isEmptyProduct(slot.product));
  }

  return buildNextStock(record?.slotsSnapshot || record?.slots || []);
}

function recordVisitDetails(record) {
  if (Array.isArray(record?.visitDetails)) {
    return record.visitDetails.map((detail) => ({
      product: detail.product || detail.nombreProducto || "",
      stockAnterior: Number(detail.stockAnterior || 0),
      representative: detail.representative || detail.representante || "SR",
      SM: Number(detail.SM || 0),
      NS: Number(detail.NS || 0),
      UV: Number(detail.UV || 0),
      status: detail.status || detail.estadoValidacion || "ok",
      note: detail.note || detail.notaValidacion || "",
      captured: Boolean(detail.captured ?? detail.capturado ?? true),
      price: Number(detail.price || 0),
      cost: Number(detail.cost || 0)
    })).filter((detail) => !isEmptyProduct(detail.product));
  }

  const stockByProduct = new Map(recordNextStock(record).map((slot) => [slot.product, slot]));
  const salesByProduct = new Map();
  recordSalesMovements(record).forEach((movement) => {
    const current = salesByProduct.get(movement.product) || { ...movement, sold: 0 };
    current.sold += Number(movement.sold || 0);
    salesByProduct.set(movement.product, current);
  });

  return productReportOrder([...stockByProduct.keys(), ...salesByProduct.keys()]).map((product) => {
    const stock = stockByProduct.get(product);
    const sale = salesByProduct.get(product);
    const NS = Number(stock?.stock || 0);
    const UV = Number(sale?.sold || 0);
    const SM = Math.max(NS - UV, 0);

    return {
      product,
      stockAnterior: SM + UV,
      representative: stock?.slotCode || stock?.code || sale?.sourceSlot || "SR",
      SM,
      NS,
      UV,
      status: "migrated",
      note: "Registro anterior convertido a detalle por producto",
      captured: true,
      price: Number(sale?.price ?? stock?.price ?? productCatalogItem(product)?.price ?? 0),
      cost: Number(sale?.cost ?? stock?.cost ?? productCatalogItem(product)?.cost ?? 0)
    };
  });
}

function previousProductStockMap(date) {
  const previous = getPreviousRecord(date);
  const source = previous
    ? recordVisitDetails(previous)
    : (latestYearClosureBefore(date)?.openingStockNextYear || []).map((slot) => ({
        product: slot.product,
        NS: Number(slot.stock || 0),
        price: Number(slot.price || 0),
        cost: Number(slot.cost || 0)
      }));

  return new Map(source.map((detail) => [detail.product, {
    product: detail.product,
    stock: Number(detail.NS ?? detail.stock ?? 0),
    price: Number(detail.price ?? productCatalogItem(detail.product)?.price ?? 0),
    cost: Number(detail.cost ?? productCatalogItem(detail.product)?.cost ?? 0)
  }]));
}

function representativeMapForSlots(slots = currentSlots) {
  const representatives = new Map();
  slots.forEach((slot) => {
    if (!isEmptyProduct(slot.product) && !representatives.has(slot.product)) {
      representatives.set(slot.product, slot.code);
    }
  });
  return representatives;
}

function isRepresentativeSlot(slot) {
  return representativeMapForSlots().get(slot?.product) === slot?.code;
}

function createVisitDetailsForDate(date, existingRecord = null) {
  if (existingRecord) {
    return new Map(recordVisitDetails(existingRecord).map((detail) => [detail.product, detail]));
  }

  const previousStock = previousProductStockMap(date);
  const detailProducts = productReportOrder([...previousStock.keys()]);
  return new Map(detailProducts.map((productName) => {
    const product = productCatalogItem(productName);
    const prior = previousStock.get(productName);
    return [productName, {
      product: productName,
      stockAnterior: Number(prior?.stock || 0),
      representative: "SR",
      SM: 0,
      NS: 0,
      UV: 0,
      status: "pending",
      note: "",
      captured: Number(prior?.stock || 0) === 0,
      price: Number(prior?.price ?? product?.price ?? 0),
      cost: Number(prior?.cost ?? product?.cost ?? 0)
    }];
  }));
}

function syncVisitDetailsFromVisual() {
  const representatives = representativeMapForSlots();

  productReportOrder([...currentVisitDetails.keys()]).forEach((productName) => {
    const product = productCatalogItem(productName);
    const detail = currentVisitDetails.get(productName) || {
      product: productName,
      stockAnterior: 0,
      representative: "SR",
      SM: 0,
      NS: 0,
      UV: 0,
      status: "pending",
      note: "",
      captured: false,
      price: Number(product?.price || 0),
      cost: Number(product?.cost || 0)
    };
    const representative = representatives.get(productName) || "SR";
    const representativeSlot = representative === "SR" ? null : findSlot(representative);

    detail.representative = representative;
    if (representativeSlot) {
      detail.SM = Number(representativeSlot.found || 0);
      detail.NS = Number(representativeSlot.left || 0);
      detail.captured = Boolean(representativeSlot.foundCaptured && representativeSlot.stockEntry);
      detail.price = Number(representativeSlot.currentPrice ?? detail.price ?? product?.price ?? 0);
      detail.cost = Number(representativeSlot.currentCost ?? detail.cost ?? product?.cost ?? 0);
    } else {
      detail.NS = 0;
      if (Number(detail.stockAnterior || 0) === 0) {
        detail.SM = 0;
        detail.captured = true;
      }
    }

    detail.UV = Number(detail.stockAnterior || 0) - Number(detail.SM || 0);
    detail.status = detail.UV < 0 ? "error" : detail.captured ? "ok" : "pending";
    detail.note = detail.UV < 0 ? "SM mayor que stock anterior" : "";
    currentVisitDetails.set(productName, detail);
  });
}

function currentVisitDetailsList() {
  syncVisitDetailsFromVisual();
  return productReportOrder([...currentVisitDetails.keys()])
    .map((productName) => currentVisitDetails.get(productName))
    .filter(Boolean);
}

function applyVisitDetailsToSlots() {
  currentSlots.forEach((slot) => {
    if (isEmptyProduct(slot.product)) {
      slot.previousProduct = EMPTY_PRODUCT;
      slot.previousStock = 0;
      slot.found = 0;
      slot.left = 0;
      slot.sold = 0;
      slot.hasEntry = false;
      slot.foundCaptured = false;
      slot.salesEntry = false;
      slot.stockEntry = false;
      return;
    }

    const detail = currentVisitDetails.get(slot.product);
    const representative = representativeMapForSlots(currentSlots).get(slot.product);
    const isRepresentative = representative === slot.code;
    slot.previousProduct = slot.product;
    slot.previousStock = Number(detail?.stockAnterior || 0);
    slot.previousPrice = Number(detail?.price ?? productCatalogItem(slot.product)?.price ?? 0);
    slot.previousCost = Number(detail?.cost ?? productCatalogItem(slot.product)?.cost ?? 0);
    slot.found = isRepresentative ? Number(detail?.SM || 0) : 0;
    slot.left = isRepresentative ? Number(detail?.NS || 0) : 0;
    slot.foundCaptured = isRepresentative ? Boolean(detail?.captured) : false;
    slot.salesEntry = isRepresentative ? Boolean(detail?.captured) : false;
    slot.stockEntry = isRepresentative ? Boolean(detail?.captured || Number(detail?.NS || 0) > 0) : false;
    slot.hasEntry = isRepresentative && (slot.salesEntry || slot.stockEntry || slot.previousStock > 0);
    slot.sold = isRepresentative ? Math.max(slot.previousStock - slot.found, 0) : 0;
  });
}

function buildSalesMovementsFromDetails(details) {
  return details
    .filter((detail) => !isEmptyProduct(detail.product))
    .filter((detail) => Number(detail.UV || 0) > 0)
    .map((detail) => ({
      product: detail.product,
      sold: Number(detail.UV || 0),
      price: Number(detail.price ?? productCatalogItem(detail.product)?.price ?? 0),
      cost: Number(detail.cost ?? productCatalogItem(detail.product)?.cost ?? 0),
      sourceSlot: detail.representative === "SR" ? "" : detail.representative
    }));
}

function buildNextStockFromDetails(details) {
  return details
    .filter((detail) => !isEmptyProduct(detail.product))
    .filter((detail) => Number(detail.NS || 0) > 0)
    .map((detail) => ({
      product: detail.product,
      stock: Number(detail.NS || 0),
      price: Number(detail.price ?? productCatalogItem(detail.product)?.price ?? 0),
      cost: Number(detail.cost ?? productCatalogItem(detail.product)?.cost ?? 0),
      representative: detail.representative
    }));
}

function latestYearClosureBefore(date) {
  const activeYear = Number(yearKey(date));
  return [...state.yearClosures]
    .filter((closure) => Number(closure.year) < activeYear)
    .sort((a, b) => b.year.localeCompare(a.year))[0];
}

function buildVisitRecord(date, previousStock, visitIndex) {
  const slots = buildDefaultSlots().map((slot, index) => {
    const prior = Number(previousStock.get(slot.code) || 0);
    const targetStock = 6 + ((index + visitIndex) % 5);
    const sold = prior === 0 ? 0 : Math.min(prior, ((index + visitIndex * 2) % 4));
    const found = Math.max(prior - sold, 0);
    const left = Math.max(targetStock, found);

    return {
      code: slot.code,
      product: slot.product,
      previousProduct: slot.product,
      color: productColor(slot.product),
      previousStock: prior,
      found,
      left,
      sold,
      hasEntry: !isEmptyProduct(slot.product),
      salesEntry: !isEmptyProduct(slot.product) && prior > 0,
      stockEntry: !isEmptyProduct(slot.product),
      counted: index === buildDefaultSlots().findIndex((item) => item.product === slot.product),
      salesCounted: index === buildDefaultSlots().findIndex((item) => item.product === slot.product),
      stockCounted: index === buildDefaultSlots().findIndex((item) => item.product === slot.product)
    };
  });

  return { date, slots };
}

function saveState() {
  state.records.sort((a, b) => a.date.localeCompare(b.date));
  state.products = products;
  state.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueConvexSave();
}

function resetStateData() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("kc-machines-") && key !== STORAGE_KEY) {
      localStorage.removeItem(key);
    }
  });
  state.records = [];
  state.monthClosures = [];
  state.yearClosures = [];
  state.pendingProducts = null;
  state.pendingProductsEffectiveMonth = null;
  state.seedScenario = null;
  showAllHistory = false;
  activeMonthCard = null;
  expandedSalesCard = null;
  saveState();
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function percent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function monthRecords(dateValue) {
  const activeMonth = monthKey(dateValue);
  return state.records.filter((record) => monthKey(record.date) === activeMonth);
}

function monthRecordsByKey(key) {
  return state.records.filter((record) => monthKey(record.date) === key);
}

function productForSlot(code) {
  return baseProductLayout[code] || EMPTY_PRODUCT;
}

function isEmptyProduct(productName) {
  return productName === EMPTY_PRODUCT;
}

function productColor(productName) {
  if (isEmptyProduct(productName)) return "#5f7480";
  const index = productOrder.get(productName) ?? 0;
  return productColors[index % productColors.length];
}

function productOptionsFromCatalog(selectedProduct, catalogProducts = products) {
  const emptyOption = `<option value="${EMPTY_PRODUCT}"${selectedProduct === EMPTY_PRODUCT ? " selected" : ""}>EMPTY</option>`;
  const knownProducts = catalogProducts.map((product) => `
    <option value="${product.name}"${product.name === selectedProduct ? " selected" : ""}>${product.name}</option>
  `).join("");
  const missingSelected = selectedProduct && selectedProduct !== EMPTY_PRODUCT && !productCatalogItemFrom(catalogProducts, selectedProduct)
    ? `<option value="${selectedProduct}" selected>${selectedProduct}</option>`
    : "";

  return emptyOption + missingSelected + knownProducts;
}

function productCatalogItem(productName) {
  return products[productOrder.get(productName)] || null;
}

function productCatalogItemFrom(catalogProducts, productName) {
  return (catalogProducts || []).find((product) => product.name === productName) || null;
}

function catalogSnapshot(sourceProducts = products) {
  return normalizeProducts(sourceProducts).map((product) => ({ ...product }));
}

function catalogForRecord(record) {
  return Array.isArray(record?.catalogSnapshot) && record.catalogSnapshot.length
    ? catalogSnapshot(record.catalogSnapshot)
    : catalogSnapshot(products);
}

function normalizeProductName(value) {
  return String(value || "").trim().toUpperCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function productImageUrl(productName) {
  if (isEmptyProduct(productName)) return "";
  return `assets/products/${encodeURIComponent(productName)}.png?v=${imageRefreshVersion}`;
}

function productImageScaleClass(productName) {
  const largeImageProducts = new Set([
    "CERECITA Y GOMITA",
    "ELOTITO Y MANI JAPONES",
    "QUAKER",
    "FLORENTINA",
    "BABY",
    "GALLETA PICNIC"
  ]);

  return largeImageProducts.has(productName) ? " image-zoom-200" : "";
}

function productImageBaseScale(productName) {
  return productImageScaleClass(productName) ? 200 : 150;
}

function visualImageScale(productName, slotCount) {
  const baseScale = productImageBaseScale(productName);
  const scaleByCount = {
    1: 1,
    2: 0.9,
    3: 0.76,
    4: 0.66,
    5: 0.58
  };
  const scale = scaleByCount[Math.min(slotCount, 5)] || 0.58;

  return `${Math.max(Math.round(baseScale * scale), 92)}%`;
}

function productVisualMarkup(productName) {
  const imageUrl = productImageUrl(productName);
  const shape = productShape(productName);
  const imageError = "this.parentElement.classList.remove('has-image');this.remove();";

  return `
    <span class="product-visual ${shape}${imageUrl ? " has-image" : ""}${productImageScaleClass(productName)}" aria-hidden="true">
      <span></span>
      ${imageUrl ? `<img src="${imageUrl}" alt="" loading="lazy" onerror="${imageError}">` : ""}
    </span>
  `;
}

function productShape(productName) {
  if (isEmptyProduct(productName)) return "empty";
  if (/COCA|PEPSI|PETIT|LIPTON|SALUTARIS|ENERGY|ADRENALINE|MONSTER|COLA|DEW|LECHE/.test(productName)) return "can";
  if (/AGUA/.test(productName)) return "bottle";
  return "pack";
}

function previousProductForSlot(slot) {
  return slot?.previousProduct || slot?.product || EMPTY_PRODUCT;
}

function slotGroupKey(slot) {
  return `${slot.product}::${previousProductForSlot(slot)}`;
}

function slotHasPreviousStock(slot) {
  return !isEmptyProduct(previousProductForSlot(slot)) && Number(slot.previousStock || 0) > 0;
}

function slotCanCapture(slot) {
  return !isEmptyProduct(slot.product) || slotHasPreviousStock(slot);
}

function slotNeedsFoundCapture(slot) {
  return slotCanCapture(slot) && slotHasPreviousStock(slot) && !Boolean(slot.foundCaptured);
}

function pendingFoundCaptureSlots() {
  return currentSlots.filter(slotNeedsFoundCapture);
}

function pendingVisitDetails() {
  return currentVisitDetailsList().filter((detail) => !detail.captured);
}

function invalidVisitDetails() {
  return currentVisitDetailsList().filter((detail) => Number(detail.UV || 0) < 0);
}

// Sales belong to the product that was in the machine before this visit.
function slotHasSalesEntry(slot) {
  if (!slotCanCapture(slot)) return false;
  if ("salesEntry" in slot) return Boolean(slot.salesEntry);
  return Boolean(slot.hasEntry) || Number(slot.previousStock || 0) > 0;
}

function recordSlotHasSalesEntry(slot) {
  if ("salesEntry" in slot) return Boolean(slot.salesEntry);
  return Boolean(slot.hasEntry) || Number(slot.previousStock || 0) > 0;
}

// Stock left for the next visit belongs to the product assigned now.
function slotHasStockEntry(slot) {
  if (isEmptyProduct(slot?.product)) return false;
  if ("stockEntry" in slot) return Boolean(slot.stockEntry);
  return Boolean(slot.hasEntry) || Number(slot.left || 0) > 0;
}

function previousProductPrice(slot) {
  return Number(slot?.previousPrice ?? slot?.price ?? productCatalogItem(previousProductForSlot(slot))?.price ?? 0);
}

function previousProductCost(slot) {
  return Number(slot?.previousCost ?? slot?.cost ?? productCatalogItem(previousProductForSlot(slot))?.cost ?? 0);
}

function buildDefaultSlots() {
  const slots = [];

  rowSizes.forEach((size, rowIndex) => {
    for (let itemIndex = 0; itemIndex < size; itemIndex += 1) {
      const code = `${rowLetters[rowIndex]}${String(itemIndex + 1).padStart(2, "0")}`;
      const baseProductName = productForSlot(code);
      const productName = isEmptyProduct(baseProductName) || productCatalogItem(baseProductName) ? baseProductName : EMPTY_PRODUCT;
      slots.push({
        code,
        product: productName,
        previousProduct: productName,
        color: productColor(productName),
        previousStock: 0,
        found: 0,
        left: 0,
        sold: 0,
        hasEntry: false
      });
    }
  });

  return slots;
}

function initialRefillStock(index) {
  const pattern = [10, 10, 8, 9, 8, 9, 10, 7, 8, 9];
  return pattern[index % pattern.length];
}

function todayValue() {
  return dateToInputValue(new Date());
}

function monthKey(dateValue) {
  return String(dateValue).slice(0, 7);
}

function yearKey(dateValue) {
  return String(dateValue).slice(0, 4);
}

function firstDayNextMonth(dateValue) {
  const [year, month] = String(dateValue).slice(0, 7).split("-").map(Number);
  return dateToInputValue(new Date(year, month, 1));
}

function formatDate(dateValue) {
  if (!dateValue) return "Sin fecha";
  const [year, month, day] = String(dateValue).slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function getRecord(date) {
  return state.records.find((record) => record.date === date);
}

function getPreviousRecord(date) {
  return [...state.records]
    .filter((record) => record.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function isMonthClosed(date) {
  return state.monthClosures.some((closure) => closure.month === monthKey(date))
    || state.yearClosures.some((closure) => closure.year === yearKey(date));
}

function isDateLocked(date) {
  return isMonthClosed(date) || Boolean(getRecord(date));
}

function previousStockMap(date) {
  const previous = getPreviousRecord(date);
  const map = new Map();

  if (previous) {
    stockMapFromRecord(previous).forEach((stock, key) => map.set(key, stock));
  } else {
    stockMapFromYearClosure(latestYearClosureBefore(date)).forEach((stock, key) => map.set(key, stock));
  }

  return map;
}

function stockMapFromYearClosure(closure) {
  return new Map((closure?.openingStockNextYear || []).map((slot) => [slot.slotCode || slot.code || slot.product, Number(slot.stock || 0)]));
}

function stockEntryMapFromYearClosure(closure) {
  return new Map((closure?.openingStockNextYear || []).map((slot) => [slot.slotCode || slot.code || slot.product, slot]));
}

function legacyPreviousStockEntryForSlot(slot, legacyProductEntries, usedLegacyProducts) {
  const legacyEntry = legacyProductEntries.get(slot.product);
  if (!legacyEntry || legacyEntry.slotCode || legacyEntry.code || usedLegacyProducts.has(slot.product)) return null;
  usedLegacyProducts.add(slot.product);
  return legacyEntry;
}

function loadDate(date) {
  applyPendingCatalogForDate(date);
  const existing = getRecord(date);
  const visitCatalog = catalogForRecord(existing);
  const previousRecord = getPreviousRecord(date);
  const previousYearClosure = !previousRecord ? latestYearClosureBefore(date) : null;
  const defaultSlots = buildDefaultSlots();
  const existingSlots = existing?.slots || existing?.slotsSnapshot || [];
  const previousSlots = previousRecord?.slots || previousRecord?.slotsSnapshot || [];
  const previousStock = previousProductStockMap(date);
  const hasPreviousStock = [...previousStock.values()].some((entry) => Number(entry?.stock || 0) > 0);
  const isFirstDraft = !existing && !previousRecord && !hasPreviousStock;

  currentSlots = defaultSlots.map((slot) => {
    const savedSlot = existingSlots.find((item) => item.code === slot.code);
    const previousSlot = previousSlots.find((item) => item.code === slot.code);
    const assignedProduct = savedSlot?.product || previousSlot?.product || slot.product;
    const previousProduct = savedSlot?.previousProduct || assignedProduct;
    const currentCatalogItem = productCatalogItemFrom(visitCatalog, assignedProduct);
    const previousCatalogItem = productCatalogItemFrom(visitCatalog, previousProduct);
    const previousPrice = savedSlot?.previousPrice ?? savedSlot?.price ?? previousCatalogItem?.price ?? previousSlot?.previousPrice ?? previousSlot?.price ?? 0;
    const previousCost = savedSlot?.previousCost ?? savedSlot?.cost ?? previousCatalogItem?.cost ?? previousSlot?.previousCost ?? previousSlot?.cost ?? 0;

    return {
      ...slot,
      product: assignedProduct,
      previousProduct,
      previousPrice,
      previousCost,
      currentPrice: savedSlot?.currentPrice ?? currentCatalogItem?.price ?? 0,
      currentCost: savedSlot?.currentCost ?? currentCatalogItem?.cost ?? 0,
      color: productColor(assignedProduct),
      previousStock: savedSlot ? Number(savedSlot.previousStock || 0) : 0,
      found: savedSlot ? Number(savedSlot.found || 0) : 0,
      left: savedSlot ? Number(savedSlot.left || 0) : isFirstDraft ? initialRefillStock(defaultSlots.findIndex((item) => item.code === slot.code)) : 0,
      sold: savedSlot ? Number(savedSlot.sold || 0) : 0,
      hasEntry: Boolean(savedSlot?.hasEntry) || (Boolean(savedSlot) && Number(savedSlot.previousStock || 0) > 0),
      foundCaptured: savedSlot ? Boolean(savedSlot.foundCaptured ?? savedSlot.hasEntry) : false,
      salesEntry: savedSlot ? Boolean(savedSlot.salesEntry ?? savedSlot.hasEntry) : false,
      stockEntry: savedSlot ? Boolean(savedSlot.stockEntry ?? savedSlot.hasEntry) : isFirstDraft,
      counted: savedSlot?.counted,
      salesCounted: savedSlot?.salesCounted,
      stockCounted: savedSlot?.stockCounted
    };
  });

  currentVisitDetails = createVisitDetailsForDate(date, existing);
  applyVisitDetailsToSlots();
  ensureCaptureSlots();
  syncVisitDetailsFromVisual();
  updateDateButton();
  buildMachine();
  updateSummary();
  document.body.classList.toggle("editing-existing", Boolean(existing));
  document.body.classList.toggle("month-locked", isDateLocked(date));
  fuelInput.value = existing ? Number(existing.fuelCost || 0) || "" : "";
  updateFuelReminder();
}

function updateDateButton() {
  dateButton.textContent = formatDate(visitDate.value);
}

function soldForSlot(slot) {
  if (isEmptyProduct(previousProductForSlot(slot))) return 0;
  if (!slotHasSalesEntry(slot)) return 0;
  if (!isPrimaryProductSlot(slot)) return 0;
  return Math.max(Number(slot.previousStock || 0) - Number(slot.found || 0), 0);
}

function confirmedSoldForSlot(slot) {
  if (slotHasPreviousStock(slot) && !Boolean(slot.foundCaptured)) return 0;
  return soldForSlot(slot);
}

function hasStockMismatch(slot) {
  return !isEmptyProduct(previousProductForSlot(slot))
    && slotHasSalesEntry(slot)
    && isPrimaryProductSlot(slot)
    && Number(slot.previousStock || 0) > 0
    && Number(slot.found || 0) > Number(slot.previousStock || 0);
}

function productGroupForSlot(referenceSlot) {
  if (!referenceSlot || !slotCanCapture(referenceSlot)) return [];
  const key = slotGroupKey(referenceSlot);
  return currentSlots.filter((slot) => slotGroupKey(slot) === key && slotCanCapture(slot));
}

function salesGroupForSlot(referenceSlot) {
  if (!referenceSlot || !slotCanCapture(referenceSlot)) return [];
  const salesProduct = previousProductForSlot(referenceSlot);
  if (isEmptyProduct(salesProduct)) return [];
  return currentSlots.filter((slot) => previousProductForSlot(slot) === salesProduct && slotCanCapture(slot));
}

function stockGroupForSlot(referenceSlot) {
  if (!referenceSlot || isEmptyProduct(referenceSlot.product)) return [];
  return currentSlots.filter((slot) => slot.product === referenceSlot.product && slotCanCapture(slot));
}

function isPrimaryProductSlot(slot) {
  return isPrimarySalesSlot(slot);
}

function isPrimarySalesSlot(slot) {
  if (!slotCanCapture(slot)) return false;
  return captureSalesSlotForSlot(slot)?.code === slot.code;
}

function isPrimaryStockSlot(slot) {
  if (isEmptyProduct(slot?.product)) return false;
  return captureStockSlotForSlot(slot)?.code === slot.code;
}

function captureSalesSlotForSlot(slot) {
  const group = salesGroupForSlot(slot);
  return group.find((slot) => slot.salesCounted || slot.counted) || group[0];
}

function captureStockSlotForSlot(slot) {
  const group = stockGroupForSlot(slot);
  return group.find((slot) => slot.stockCounted) || group[0];
}

function ensureCaptureSlots() {
  const salesGroups = new Map();
  const stockGroups = new Map();
  const salesCaptures = new Map();
  const stockCaptures = new Map();

  currentSlots.forEach((slot) => {
    const salesProduct = previousProductForSlot(slot);
    if (!isEmptyProduct(salesProduct) && (slot.salesCounted || slot.counted)) {
      salesCaptures.set(salesProduct, slot.code);
    }
    if (!isEmptyProduct(slot.product) && slot.stockCounted) {
      stockCaptures.set(slot.product, slot.code);
    }
  });

  currentSlots.forEach((slot) => {
    slot.counted = false;
    slot.salesCounted = false;
    slot.stockCounted = false;
  });

  currentSlots.filter(slotCanCapture).forEach((slot) => {
    const salesProduct = previousProductForSlot(slot);
    if (!isEmptyProduct(salesProduct)) {
      if (!salesGroups.has(salesProduct)) salesGroups.set(salesProduct, []);
      salesGroups.get(salesProduct).push(slot);
    }

    if (!isEmptyProduct(slot.product)) {
      if (!stockGroups.has(slot.product)) stockGroups.set(slot.product, []);
      stockGroups.get(slot.product).push(slot);
    }
  });

  salesGroups.forEach((group) => {
    const existingCode = salesCaptures.get(previousProductForSlot(group[0]));
    group.forEach((slot, index) => {
      const isCapture = existingCode ? slot.code === existingCode : index === 0;
      slot.salesCounted = isCapture;
      slot.counted = isCapture;
    });
  });

  stockGroups.forEach((group) => {
    const existingCode = stockCaptures.get(group[0].product);
    group.forEach((slot, index) => {
      slot.stockCounted = existingCode ? slot.code === existingCode : index === 0;
    });
  });

  currentSlots
    .filter((slot) => !slotCanCapture(slot))
    .forEach((slot) => {
      slot.counted = false;
      slot.salesCounted = false;
      slot.stockCounted = false;
      slot.hasEntry = false;
      slot.salesEntry = false;
      slot.stockEntry = false;
      slot.found = 0;
      slot.foundCaptured = false;
      slot.left = 0;
      slot.sold = 0;
    });
}

function syncSlotEntryValues(referenceSlot) {
  const salesGroup = salesGroupForSlot(referenceSlot);
  const salesPrimary = captureSalesSlotForSlot(referenceSlot);
  if (salesPrimary && salesGroup.length > 1) {
    salesGroup.filter((slot) => slot.code !== salesPrimary.code).forEach((slot) => {
      slot.found = salesPrimary.found;
      slot.salesEntry = slotHasSalesEntry(salesPrimary);
      slot.hasEntry = slot.salesEntry || slotHasStockEntry(slot);
      slot.sold = 0;
    });
  }

  const stockGroup = stockGroupForSlot(referenceSlot);
  const stockPrimary = captureStockSlotForSlot(referenceSlot);
  if (stockPrimary && stockGroup.length > 1) {
    stockGroup.filter((slot) => slot.code !== stockPrimary.code).forEach((slot) => {
      slot.left = stockPrimary.left;
      slot.stockEntry = slotHasStockEntry(stockPrimary);
      slot.hasEntry = slotHasSalesEntry(slot) || slot.stockEntry;
    });
  }

  salesGroup.forEach((slot) => {
    slot.sold = soldForSlot(slot);
  });
}

function syncAllDuplicateEntryValues() {
  currentSlots.forEach(syncSlotEntryValues);
}

function applyVisualFusionByRow() {
  let slotIndex = 0;

  rowSizes.forEach((size) => {
    const rowSlots = currentSlots.slice(slotIndex, slotIndex + size);
    const counts = rowSlots.reduce((map, slot) => {
      if (!isEmptyProduct(slot.product)) map.set(slot.product, (map.get(slot.product) || 0) + 1);
      return map;
    }, new Map());
    const grouped = [];
    const groupedProducts = new Set();

    rowSlots.forEach((slot) => {
      const product = slot.product;
      if (!isEmptyProduct(product) && counts.get(product) > 1) {
        if (!groupedProducts.has(product)) {
          for (let index = 0; index < counts.get(product); index += 1) grouped.push(product);
          groupedProducts.add(product);
        }
        return;
      }
      grouped.push(product);
    });

    rowSlots.forEach((slot, index) => {
      const product = grouped[index] || EMPTY_PRODUCT;
      const catalogItem = productCatalogItem(product);
      slot.product = product;
      slot.color = productColor(product);
      slot.currentPrice = catalogItem?.price ?? 0;
      slot.currentCost = catalogItem?.cost ?? 0;
    });

    slotIndex += size;
  });
}

function visualGroupsForRow(rowSlots) {
  const groups = [];

  rowSlots.forEach((slot) => {
    const previousGroup = groups[groups.length - 1];
    const canMergeWithPrevious = previousGroup
      && !isEmptyProduct(slot.product)
      && previousGroup.product === slot.product;

    if (canMergeWithPrevious) {
      previousGroup.slots.push(slot);
      return;
    }

    groups.push({ product: slot.product, previousProduct: previousProductForSlot(slot), slots: [slot] });
  });

  return groups;
}

function visualSlotForGroup(group) {
  if (isEmptyProduct(group.product)) return group.slots[0];
  return group.slots.find((slot) => isRepresentativeSlot(slot))
    || group.slots.find((slot) => isPrimaryStockSlot(slot))
    || group.slots.find((slot) => isPrimarySalesSlot(slot))
    || group.slots[0];
}

function visualGroupWeight(group, rowSize) {
  if (rowSize !== 10) return group.slots.length;
  if (group.slots.length === 1) return 1.26;
  if (group.slots.length === 2) return 1.48;
  if (group.slots.length === 3) return 1.82;
  if (group.slots.length === 4) return 2.18;
  return 2.55;
}

function slotCodeSelectorMarkup(groupSlots, locked, catalogProducts) {
  return `
    <div class="slot-code-list">
      ${groupSlots.map((groupSlot) => `
        <label class="slot-code slot-product-select-label" aria-label="Producto en ${groupSlot.code}">
          <span>${groupSlot.code}</span>
          <select class="slot-product-select" data-slot-product="${groupSlot.code}"${locked ? " disabled" : ""}>
            ${productOptionsFromCatalog(groupSlot.product, catalogProducts)}
          </select>
        </label>
      `).join("")}
    </div>
  `;
}

function buildMachine() {
  imageRefreshVersion = Date.now();
  machineTarget.innerHTML = "";
  let slotIndex = 0;
  const locked = isDateLocked(visitDate.value);
  const visitCatalog = catalogForRecord(getRecord(visitDate.value));

  rowSizes.forEach((size) => {
    const rowSlots = currentSlots.slice(slotIndex, slotIndex + size);
    const rowGroups = visualGroupsForRow(rowSlots);
    const row = document.createElement("div");
    row.className = "vending-row";
    row.style.gridTemplateColumns = rowGroups
      .map((group) => `minmax(0, ${visualGroupWeight(group, size)}fr)`)
      .join(" ");

    rowGroups.forEach((group) => {
      const slotData = visualSlotForGroup(group);
      const groupCodes = group.slots.map((slot) => slot.code);
      const mergedEntry = group.slots.length > 1;
      const representativeEntry = isRepresentativeSlot(slotData);
      const orientationEntry = !representativeEntry;
      const emptyEntry = !slotCanCapture(slotData);
      const slot = document.createElement("div");
      slot.className = `slot${locked ? " locked-slot" : ""}${mergedEntry ? " merged-slot" : ""}${orientationEntry ? " duplicate-slot" : ""}${emptyEntry ? " empty-slot" : ""}${hasStockMismatch(slotData) ? " stock-error" : ""}`;
      slot.tabIndex = locked || emptyEntry ? -1 : 0;
      slot.setAttribute("role", "button");
      slot.setAttribute("aria-disabled", String(locked || emptyEntry));
      slot.setAttribute("aria-label", `${groupCodes.join(" + ")} ${slotData.product}`);
      slot.dataset.code = slotData.code;
      slot.dataset.codes = groupCodes.join(",");
      slot.style.setProperty("--slot-count", group.slots.length);
      slot.style.setProperty("--image-scale", visualImageScale(slotData.product, group.slots.length));
      slot.style.setProperty("--slot-color", slotData.color);
      slot.innerHTML = `
        ${slotCodeSelectorMarkup(group.slots, locked, visitCatalog)}
        ${productVisualMarkup(slotData.product)}
        ${slotData.product !== previousProductForSlot(slotData) && slotHasPreviousStock(slotData) ? `<span class="slot-previous-product">${previousProductForSlot(slotData)}</span>` : ""}
        <span class="slot-values" aria-label="Cantidades">
          ${orientationEntry
            ? `<span class="slot-value found" title="Referencia"><small>Ver total</small><strong></strong></span>`
            : `<span class="slot-value found" title="Encontre"><small>Encontre</small><strong>${slotData.found}</strong></span>
              <span class="slot-value left" title="Dejo"><small>Dejo</small><strong>${slotData.left}</strong></span>`}
        </span>
      `;
      slot.addEventListener("click", () => {
        if (!emptyEntry && representativeEntry) openSlotDialog(slotData.code);
      });
      slot.addEventListener("keydown", (event) => {
        if (!emptyEntry && representativeEntry && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openSlotDialog(slotData.code);
        }
      });
      slot.querySelectorAll(".slot-product-select").forEach((select) => {
        select.addEventListener("click", (event) => event.stopPropagation());
        select.addEventListener("change", (event) => {
          if (locked) return;
          const changed = updateSlotProduct(event.target.dataset.slotProduct, event.target.value);
          if (!changed) event.target.value = findSlot(event.target.dataset.slotProduct)?.product || EMPTY_PRODUCT;
        });
      });
      row.append(slot);
    });
    slotIndex += size;

    machineTarget.append(row);
  });
}

function updateSlotProduct(code, productName) {
  const slot = findSlot(code);
  if (!slot || isDateLocked(visitDate.value)) return false;
  if (slot.product === productName) return true;
  const visitCatalog = catalogForRecord(getRecord(visitDate.value));
  const nextCatalogItem = isEmptyProduct(productName) ? null : productCatalogItemFrom(visitCatalog, productName);
  if (!isEmptyProduct(productName) && !nextCatalogItem) {
    showToast("Ese producto no existia cuando se guardo esta visita");
    return false;
  }

  slot.product = productName;
  slot.color = productColor(productName);
  slot.currentPrice = nextCatalogItem?.price ?? 0;
  slot.currentCost = nextCatalogItem?.cost ?? 0;
  slot.counted = false;
  if (isEmptyProduct(productName)) {
    slot.left = 0;
    slot.stockEntry = false;
    if (!slotHasPreviousStock(slot)) {
      slot.found = 0;
      slot.hasEntry = false;
      slot.foundCaptured = false;
      slot.salesEntry = false;
      slot.sold = 0;
    }
  }
  applyVisualFusionByRow();
  applyVisitDetailsToSlots();
  syncVisitDetailsFromVisual();
  ensureCaptureSlots();
  buildMachine();
  updateSummary();
  return true;
}

function updateSummary() {
  const date = visitDate.value;
  const existing = Boolean(getRecord(date));
  const locked = isDateLocked(date);
  const details = currentVisitDetailsList();
  const confirmedTotal = details.reduce((sum, detail) => sum + Math.max(Number(detail.UV || 0), 0), 0);
  const pendingCaptureCount = pendingVisitDetails().length;
  const previous = getPreviousRecord(date);
  const previousYearClosure = !previous ? latestYearClosureBefore(date) : null;

  pendingSales.textContent = pendingCaptureCount > 0
    ? `${confirmedTotal} confirmadas · ${pendingCaptureCount} pendientes`
    : `${confirmedTotal} unidades`;
  lastUpdateLabel.textContent = previous
    ? `Stock anterior: ${formatDate(previous.date)}`
    : previousYearClosure
      ? `Stock anterior desde cierre ${previousYearClosure.year}`
      : "Sin stock anterior";
  dateStatus.textContent = locked
    ? existing
      ? `Fecha guardada: ${formatDate(date)}. Los datos quedan bloqueados.`
      : `Mes cerrado: ${monthKey(date)}. Los datos quedan bloqueados.`
    : existing
    ? `Fecha guardada: ${formatDate(date)}. Puedes modificarla y guardar cambios.`
    : previousYearClosure
      ? `Fecha nueva: se usara el stock del cierre anual ${previousYearClosure.year} como stock anterior.`
      : previous
      ? `Fecha nueva: ${formatDate(date)}. Se usará el último stock anterior como base.`
      : `Fecha nueva sin refill previo: será el stock inicial del mes y del año.`;
  stockStatus.textContent = locked
    ? existing
      ? "Esta fecha ya fue cerrada. No se pueden modificar datos."
      : "Este mes ya fue cerrado. No se pueden insertar ni modificar datos."
    : existing
    ? "Esta fecha ya existe. Si cambias datos, usa Guardar cambios."
    : "Al insertar datos, se guardará esta fecha en historial.";
  const mismatchCount = invalidVisitDetails().length;
  if (mismatchCount > 0) {
    stockStatus.textContent = `${mismatchCount} espacio(s) tienen más unidades encontradas que el stock anterior. Revisa esos productos.`;
  } else if (pendingCaptureCount > 0) {
    stockStatus.textContent = `${pendingCaptureCount} producto(s) tienen stock anterior pendiente. Indica cuanto encontraste antes de guardar o cambiar producto.`;
  }
  updateStock.hidden = existing || locked;
  saveDateChanges.hidden = !existing || locked;
  renderSalesList();
  renderHistory();
  if (!accountingView.hidden) renderAccounting();
}

function productTotals() {
  const totals = new Map();

  currentVisitDetailsList().forEach((detail) => {
    if (isEmptyProduct(detail.product)) return;
    const sold = detail.captured ? Math.max(Number(detail.UV || 0), 0) : 0;
    const current = totals.get(detail.product) || {
      product: detail.product,
      sold: 0,
      price: Number(detail.price || 0),
      cost: Number(detail.cost || 0),
      revenue: 0,
      expense: 0,
      profit: 0
    };

    current.sold += sold;
    current.revenue += sold * Number(detail.price || 0);
    current.expense += sold * Number(detail.cost || 0);
    current.profit += sold * (Number(detail.price || 0) - Number(detail.cost || 0));
    totals.set(detail.product, current);
  });

  return [...totals.values()]
    .sort((a, b) => (productOrder.get(a.product) ?? 9999) - (productOrder.get(b.product) ?? 9999));
}

function renderSalesList() {
  const rows = productTotals().filter((row) => row.sold > 0).slice(0, 6);

  salesList.innerHTML = rows.length
    ? rows.map((row) => `
        <div>
          <span>${row.product}</span>
          <strong>${row.sold} vendidas</strong>
        </div>
      `).join("")
    : `<div><span>Sin ventas registradas todavía</span><strong>0</strong></div>`;
}

function renderHistory() {
  const activeMonth = monthKey(visitDate.value);
  const rows = [...state.records]
    .filter((record) => monthKey(record.date) === activeMonth)
    .sort((a, b) => b.date.localeCompare(a.date));
  const visibleRows = showAllHistory ? rows : rows.slice(0, 3);

  historyList.innerHTML = rows.length
    ? `${visibleRows.map((record) => {
        const totalSold = recordSoldTotal(record);
        const totalStock = recordStockTotal(record);
        const activeClass = record.date === visitDate.value ? " active-history" : "";

        return `
          <button class="history-item${activeClass}" type="button" data-history-date="${record.date}">
            <span>${formatDate(record.date)}</span>
            <strong>${totalStock} unidades stock</strong>
            <small>${totalSold} vendidas</small>
          </button>
        `;
      }).join("")}
      ${rows.length > 3 ? `
        <button class="show-more-history" id="showMoreHistory" type="button">
          ${showAllHistory ? "Mostrar menos" : "Mostrar más"}
        </button>
      ` : ""}`
    : `<div class="history-empty">Sin fechas guardadas todavía en este mes</div>`;

  historyList.querySelectorAll("[data-history-date]").forEach((button) => {
    button.addEventListener("click", () => {
      visitDate.value = button.dataset.historyDate;
      loadDate(visitDate.value);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  document.getElementById("showMoreHistory")?.addEventListener("click", () => {
    showAllHistory = !showAllHistory;
    renderHistory();
  });
}

function visitNumberForDate(date) {
  const existing = Boolean(getRecord(date));
  const dates = new Set(state.records.map((record) => record.date));
  if (!existing) dates.add(date);
  return [...dates].filter((item) => item <= date).sort((a, b) => a.localeCompare(b)).indexOf(date) + 1;
}

function updateFuelReminder() {
  const visitNumber = visitNumberForDate(visitDate.value);
  const shouldRemind = visitNumber > 0 && visitNumber % 4 === 0 && !isMonthClosed(visitDate.value);

  fuelReminder.hidden = !shouldRemind;
  if (!shouldRemind && !fuelInput.value) fuelInput.value = "";
}

function productReportOrder(extraProducts = []) {
  const seen = new Set();
  const order = products.map((product) => product.name);

  extraProducts.forEach((productName) => {
    if (productName && !seen.has(productName) && !order.includes(productName)) order.push(productName);
  });

  return order.filter((productName) => productName && !seen.has(productName) && seen.add(productName));
}

function productTotalsForRecords(records) {
  const totals = new Map();

  products.forEach((product) => {
    totals.set(product.name, {
      product: product.name,
      sold: 0,
      price: product.price,
      cost: product.cost,
      revenue: 0,
      expense: 0,
      profit: 0
    });
  });

  records.forEach((record) => {
    recordSalesMovements(record).forEach((movement) => {
      const product = movement.product;
      if (isEmptyProduct(product)) return;

      const price = Number(movement.price || 0);
      const cost = Number(movement.cost || 0);
      const sold = Number(movement.sold || 0);
      const current = totals.get(product) || {
        product,
        sold: 0,
        price,
        cost,
        revenue: 0,
        expense: 0,
        profit: 0
      };

      current.sold += sold;
      current.price = price;
      current.cost = cost;
      current.revenue += sold * price;
      current.expense += sold * cost;
      current.profit += sold * (price - cost);
      totals.set(product, current);
    });
  });

  return [...totals.values()]
    .sort((a, b) => (productOrder.get(a.product) ?? 9999) - (productOrder.get(b.product) ?? 9999));
}

function recordSoldTotal(record) {
  return recordSalesMovements(record).reduce((sum, movement) => sum + Number(movement.sold || 0), 0);
}

function recordStockTotal(record) {
  return recordNextStock(record).reduce((sum, slot) => sum + Number(slot.stock || 0), 0);
}

function isCountedStockRecordSlot(record, slot, index) {
  if (isEmptyProduct(slot.product)) return false;
  if ("stockCounted" in slot) return Boolean(slot.stockCounted);
  return record.slots.findIndex((item) => item.product === slot.product) === index;
}

function isCountedRecordSlot(record, slot, index) {
  const salesProduct = slot.previousProduct || slot.product;
  if (isEmptyProduct(salesProduct)) return false;
  if ("salesCounted" in slot) return Boolean(slot.salesCounted);
  if ("counted" in slot) return Boolean(slot.counted);
  return record.slots.findIndex((item) => (item.previousProduct || item.product) === salesProduct) === index;
}

function recordsSoldTotal(records) {
  return records.reduce((sum, record) => sum + recordSoldTotal(record), 0);
}

function accountingSummaryForRecords(records, overrides = {}) {
  const productTotals = productTotalsForRecords(records);
  const totalRevenue = productTotals.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const totalCost = productTotals.reduce((sum, item) => sum + Number(item.expense || 0), 0);
  const profitability = productTotals.reduce((sum, item) => sum + Number(item.profit || 0), 0);
  const fuelTotal = "fuelTotal" in overrides
    ? Number(overrides.fuelTotal || 0)
    : records.reduce((sum, record) => sum + Number(record.fuelCost || 0), 0);
  const floorFee = Number(overrides.floorFee || 0);
  const cardSales = Number(overrides.cardSales || 0);
  const bankFee = cardSales * 0.03;
  const grossProfit = profitability - floorFee - fuelTotal - bankFee;
  const profitPercent = totalRevenue > 0 ? (profitability / totalRevenue) * 100 : 0;

  return {
    productTotals,
    totalSold: recordsSoldTotal(records),
    totalRevenue,
    totalCost,
    profitability,
    profitPercent,
    fuelTotal,
    floorFee,
    cardSales,
    bankFee,
    grossProfit
  };
}

function setMenuOpen(isOpen) {
  appMenu.hidden = !isOpen;
  menuBackdrop.hidden = !isOpen;
  document.body.classList.toggle("menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
}

function showMainView() {
  mainView.hidden = false;
  mainView.classList.add("active");
  accountingView.hidden = true;
  productsView.hidden = true;
  setMenuOpen(false);
}

function showAccountingView() {
  mainView.hidden = true;
  mainView.classList.remove("active");
  accountingView.hidden = false;
  productsView.hidden = true;
  renderAccounting();
  setMenuOpen(false);
}

function showProductsView() {
  mainView.hidden = true;
  mainView.classList.remove("active");
  accountingView.hidden = true;
  productsView.hidden = false;
  renderProductsEditor();
  setMenuOpen(false);
}

function productEditorRow(product, index) {
  return `
    <article class="product-editor-row" data-product-index="${index}">
      <span class="product-editor-order">${index + 1}</span>
      <label>
        Nombre
        <input class="product-name-edit" type="text" value="${escapeHtml(product.name)}">
      </label>
      <label>
        Costo
        <input class="product-cost-edit" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(product.cost || 0)}">
      </label>
      <label>
        Venta
        <input class="product-price-edit" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(product.price || 0)}">
      </label>
      <div class="product-editor-actions">
        <button class="product-save-button" type="button" data-product-save="${index}">Guardar</button>
        <button class="product-delete-button" type="button" data-product-delete="${index}">Eliminar</button>
      </div>
    </article>
  `;
}

function renderProductsEditor() {
  const draftProducts = catalogDraftProducts();
  const effectiveMonth = catalogDraftEffectiveMonth();
  productsTable.innerHTML = draftProducts.length
    ? `<div class="products-empty">Cambios de catalogo programados para ${effectiveMonth}.</div>${draftProducts.map(productEditorRow).join("")}`
    : `<div class="products-empty">No hay productos guardados.</div>`;

  productsTable.querySelectorAll("[data-product-save]").forEach((button) => {
    button.addEventListener("click", () => saveProductEdit(Number(button.dataset.productSave)));
  });
  productsTable.querySelectorAll("[data-product-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteProduct(Number(button.dataset.productDelete)));
  });
}

function applyCatalogChange(message) {
  syncProductCatalog();
  ensureCaptureSlots();
  syncAllDuplicateEntryValues();
  saveState();
  buildMachine();
  updateSummary();
  renderProductsEditor();
  showToast(message);
}

function saveProductEdit(index) {
  const row = productsTable.querySelector(`[data-product-index="${index}"]`);
  const draftProducts = catalogDraftProducts();
  const current = draftProducts[index];
  if (!row || !current) return;

  const oldName = current.name;
  const nextName = normalizeProductName(row.querySelector(".product-name-edit").value);
  const nextProduct = {
    name: nextName,
    cost: Number(row.querySelector(".product-cost-edit").value || 0),
    price: Number(row.querySelector(".product-price-edit").value || 0)
  };
  const duplicate = draftProducts.some((product, productIndex) => productIndex !== index && product.name === nextName);
  if (!nextName) {
    showToast("El producto necesita nombre");
    return;
  }
  if (duplicate) {
    showToast("Ese producto ya existe");
    return;
  }

  draftProducts[index] = nextProduct;
  scheduleCatalogChange(draftProducts, "Producto actualizado");
}

function resetSlotToEmpty(slot) {
  slot.product = EMPTY_PRODUCT;
  slot.color = productColor(EMPTY_PRODUCT);
  slot.found = 0;
  slot.left = 0;
  slot.sold = 0;
  slot.hasEntry = false;
  slot.foundCaptured = false;
  slot.counted = false;
}

function deleteProduct(index) {
  const draftProducts = catalogDraftProducts();
  const product = draftProducts[index];
  if (!product) return;
  const confirmed = window.confirm(`Seguro que quieres eliminar ${product.name}?`);
  if (!confirmed) return;

  draftProducts.splice(index, 1);
  scheduleCatalogChange(draftProducts, "Producto eliminado");
}

function addProduct(event) {
  event.preventDefault();
  const draftProducts = catalogDraftProducts();
  const name = normalizeProductName(productNameInput.value);
  if (!name) {
    showToast("Escribe el nombre del producto");
    return;
  }
  if (productCatalogItemFrom(draftProducts, name)) {
    showToast("Ese producto ya existe");
    return;
  }

  draftProducts.push({
    name,
    cost: Number(productCostInput.value || 0),
    price: Number(productPriceInput.value || 0)
  });
  productForm.reset();
  scheduleCatalogChange(draftProducts, "Producto agregado al final");
}

function summaryFromClosure(closure) {
  const totalRevenue = Number(closure.totalRevenue || 0);
  const profitability = Number(closure.profitability || 0);
  return {
    totalSold: Number(closure.totalSold || 0),
    totalRevenue,
    totalCost: Number(closure.totalCost || 0),
    profitability,
    profitPercent: totalRevenue > 0 ? (profitability / totalRevenue) * 100 : 0,
    fuelTotal: Number(closure.fuelTotal || 0),
    floorFee: Number(closure.floorFee || 0),
    cardSales: Number(closure.cardSales || 0),
    bankFee: Number(closure.bankFee || 0),
    grossProfit: Number(closure.grossProfit || 0),
    productTotals: closure.productTotals || [],
    productOrderSnapshot: closure.productOrderSnapshot || productReportOrder((closure.productTotals || []).map((item) => item.product)),
    monthSummaries: closure.monthSummaries || []
  };
}

function yearSummaryFromMonths(months) {
  const productTotals = products.map((product) => ({
    product: product.name,
    sold: 0,
    price: product.price,
    cost: product.cost,
    revenue: 0,
    expense: 0,
    profit: 0
  }));
  const totalsByProduct = new Map(productTotals.map((item) => [item.product, item]));
  const summary = months.reduce((acc, month) => {
    const monthSummary = month.summary || summaryFromClosure(month);
    acc.totalSold += Number(monthSummary.totalSold || 0);
    acc.totalRevenue += Number(monthSummary.totalRevenue || 0);
    acc.totalCost += Number(monthSummary.totalCost || 0);
    acc.profitability += Number(monthSummary.profitability || 0);
    acc.fuelTotal += Number(monthSummary.fuelTotal || 0);
    acc.floorFee += Number(monthSummary.floorFee || 0);
    acc.cardSales += Number(monthSummary.cardSales || 0);
    acc.bankFee += Number(monthSummary.bankFee || 0);
    acc.grossProfit += Number(monthSummary.grossProfit || 0);
    (monthSummary.productTotals || []).forEach((item) => {
      if (!totalsByProduct.has(item.product)) {
        const archivedProduct = {
          product: item.product,
          sold: 0,
          price: Number(item.price || 0),
          cost: Number(item.cost || 0),
          revenue: 0,
          expense: 0,
          profit: 0
        };
        productTotals.push(archivedProduct);
        totalsByProduct.set(item.product, archivedProduct);
      }
      const total = totalsByProduct.get(item.product);
      total.sold += Number(item.sold || 0);
      total.revenue += Number(item.revenue || 0);
      total.expense += Number(item.expense || 0);
      total.profit += Number(item.profit || 0);
    });
    return acc;
  }, {
    totalSold: 0,
    totalRevenue: 0,
    totalCost: 0,
    profitability: 0,
    fuelTotal: 0,
    floorFee: 0,
    cardSales: 0,
    bankFee: 0,
    grossProfit: 0
  });

  summary.profitPercent = summary.totalRevenue > 0 ? (summary.profitability / summary.totalRevenue) * 100 : 0;
  summary.productTotals = productTotals;
  summary.productOrderSnapshot = productReportOrder(productTotals.map((item) => item.product));
  return summary;
}

function compactMonthSummary(month) {
  const summary = month.summary || summaryFromClosure(month);
  return {
    month: month.month,
    closedAt: month.closedAt,
    sourceDate: month.sourceDate,
    totalSold: Number(summary.totalSold || 0),
    totalRevenue: Number(summary.totalRevenue || 0),
    totalCost: Number(summary.totalCost || 0),
    profitability: Number(summary.profitability || 0),
    fuelTotal: Number(summary.fuelTotal || 0),
    floorFee: Number(summary.floorFee || 0),
    cardSales: Number(summary.cardSales || 0),
    bankFee: Number(summary.bankFee || 0),
    grossProfit: Number(summary.grossProfit || 0),
    profitPercent: Number(summary.profitPercent || 0),
    productTotals: summary.productTotals || [],
    productOrderSnapshot: summary.productOrderSnapshot || []
  };
}

function annualChartItems(year) {
  return monthNamesShort.map((label, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const yearClosure = state.yearClosures.find((item) => item.year === year);
    const compactMonth = yearClosure?.monthSummaries?.find((item) => item.month === month);
    const closure = state.monthClosures.find((item) => item.month === month);
    return {
      month,
      label,
      summary: compactMonth || (closure ? summaryFromClosure(closure) : accountingSummaryForRecords(monthRecordsByKey(month)))
    };
  });
}

function annualSummaryForChartItems(chartItems) {
  return chartItems.reduce((summary, item) => {
    summary.fuelTotal += Number(item.summary.fuelTotal || 0);
    summary.floorFee += Number(item.summary.floorFee || 0);
    summary.bankFee += Number(item.summary.bankFee || 0);
    summary.grossProfit += Number(item.summary.grossProfit || 0);
    summary.totalRevenue += Number(item.summary.totalRevenue || 0);
    summary.profitability += Number(item.summary.profitability || 0);
    return summary;
  }, {
    fuelTotal: 0,
    floorFee: 0,
    bankFee: 0,
    grossProfit: 0,
    totalRevenue: 0,
    profitability: 0
  });
}

function monthCardLabel(card) {
  if (card.type === "year") return "A&ntilde;o";
  const monthIndex = Number(String(card.month).slice(5, 7)) - 1;
  return monthNamesShort[monthIndex] || "Mes";
}

function renderAccounting() {
  const activeMonth = monthKey(visitDate.value);
  const activeYear = yearKey(visitDate.value);
  const records = monthRecords(visitDate.value);
  const summary = accountingSummaryForRecords(records);
  const currentMonth = {
    type: "current",
    month: activeMonth,
    summary,
    records,
    lastDate: [...records].sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null,
    closed: isMonthClosed(activeMonth)
  };
  const closedMonths = [...state.monthClosures]
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((closure) => ({
      type: "closed",
      month: closure.month,
      summary: summaryFromClosure(closure),
      sourceDate: closure.sourceDate,
      closedAt: closure.closedAt,
      closure
  }));
  const finishedYears = [...state.yearClosures]
    .sort((a, b) => b.year.localeCompare(a.year))
    .map((closure) => ({
      type: "year",
      month: closure.year,
      summary: summaryFromClosure(closure),
      closedAt: closure.closedAt,
      closure
    }));
  const cards = [currentMonth, ...closedMonths.filter((item) => item.month !== activeMonth)];
  const allCards = [...cards, ...finishedYears];
  if (activeMonthCard && !allCards.some((card) => card.month === activeMonthCard)) {
    activeMonthCard = null;
  }

  renderAccountingChart(annualChartItems(activeYear), activeYear);
  renderMonthCards(cards, finishedYears);
}

function renderAccountingChart(chartItems, year) {
  const hasData = (item) => Number(item.summary.totalRevenue || 0) > 0 || Number(item.summary.profitability || 0) > 0;
  const maxValue = Math.max(
    1,
    ...chartItems.filter(hasData).map((item) => Math.max(item.summary.totalRevenue || 0, item.summary.profitability || 0))
  );
  const profitPoints = chartItems.map((item, index) => {
    if (!hasData(item)) return null;
    const x = 4 + (index * 92) / 11;
    const y = 88 - ((Number(item.summary.profitability || 0) / maxValue) * 72);
    return { x, y };
  }).filter(Boolean);
  const smoothPath = (points) => {
    if (!points.length) return "";
    if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
    return points.slice(1).reduce((path, point, index) => {
      const previous = points[index];
      const controlX = (previous.x + point.x) / 2;
      return `${path} C ${controlX},${previous.y} ${controlX},${point.y} ${point.x},${point.y}`;
    }, `M ${points[0].x},${points[0].y}`);
  };
  const pointDots = (points, type) => points.map((point) => (
    `<i class="chart-dot ${type}" style="left:${point.x}%; top:${point.y}%;"></i>`
  )).join("");
  const salesBars = chartItems.map((item, index) => {
    const value = Number(item.summary.totalRevenue || 0);
    const x = 2.8 + (index * 96) / 12;
    const height = value > 0 ? Math.max((value / maxValue) * 72, 1.6) : 0;
    const y = 92 - height;
    return value > 0
      ? `<rect class="chart-bar" x="${x}" y="${y}" width="2.4" height="${height}" rx="0.8"></rect>`
      : "";
  }).join("");

  accountingChart.innerHTML = `
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line class="chart-baseline" x1="4" y1="92" x2="96" y2="92"></line>
      ${chartItems.map((_, index) => `<line class="chart-section" x1="${4 + (index * 92) / 11}" y1="16" x2="${4 + (index * 92) / 11}" y2="92"></line>`).join("")}
      ${salesBars}
      ${profitPoints.length > 1 ? `<path class="chart-line profit" d="${smoothPath(profitPoints)}"></path>` : ""}
    </svg>
    <div class="chart-marker-layer">${pointDots(profitPoints, "profit")}</div>
    <div class="chart-labels">
      ${chartItems.map((item) => `<span>${item.label}</span>`).join("")}
    </div>
    <div class="chart-legend">
      <strong>${year}</strong>
      <span><i class="sales bar-key"></i>Venta</span>
      <span><i class="profit"></i>Rentabilidad</span>
    </div>
  `;
  const expenses = annualSummaryForChartItems(chartItems);
  operatingExpenses.innerHTML = `
    <div class="expenses-head">
      <span>Gastos operativos del a&ntilde;o ${year}</span>
    </div>
    <dl>
      <div><dt>Gasolina</dt><dd>${money(expenses.fuelTotal)}</dd></div>
      <div><dt>Derecho de piso</dt><dd>${money(expenses.floorFee)}</dd></div>
      <div><dt>Comisi&oacute;n banco</dt><dd>${money(expenses.bankFee)}</dd></div>
      <div class="expense-total"><dt>Ganancia bruta</dt><dd>${money(expenses.grossProfit || expenses.profitability)}</dd></div>
    </dl>
  `;
}

function metricGrid(summary) {
  return `
    <div><span>Venta total</span><strong>${money(summary.totalRevenue)}</strong></div>
    <div><span>Rentabilidad</span><strong>${money(summary.profitability)}</strong><small>${percent(summary.profitPercent)} de ganancia</small></div>
    <div><span>Ganancia bruta</span><strong>${money(summary.grossProfit ?? summary.profitability)}</strong></div>
    <div><span>Vendidas</span><strong>${summary.totalSold} unidades</strong></div>
  `;
}

function productListHtml(productTotals) {
  return (productTotals || []).map((item) => `
    <li><span>${item.product}</span><strong>${item.sold}</strong></li>
  `).join("");
}

function yearMonthSummaryHtml(card) {
  return (card.summary.monthSummaries || []).map((item) => `
    <div class="year-month-summary">
      <span>${monthCardLabel({ month: item.month })}</span>
      <strong>${money(item.totalRevenue)}</strong>
      <small>${money(item.profitability)} rentabilidad</small>
    </div>
  `).join("");
}

function renderMonthCards(cards, finishedYears = []) {
  const renderCard = (card, index) => {
    const isOpen = activeMonthCard ? activeMonthCard === card.month : card.type === "current";
    const salesOpen = expandedSalesCard === card.month;
    const status = card.type === "year"
      ? `A&ntilde;o finalizado ${formatDate(card.closedAt)}`
      : card.type === "current"
      ? (card.lastDate ? `Hasta ${formatDate(card.lastDate)}` : "Sin visitas guardadas")
      : `Cerrado ${formatDate(card.closedAt)}`;
    const details = isOpen ? `
      <div class="month-card-detail">
        <div class="accounting-metrics">${metricGrid(card.summary)}</div>
        ${card.type === "year" ? `<div class="year-month-grid">${yearMonthSummaryHtml(card)}</div>` : ""}
        <div class="report-money">
          <span>Gasolina: ${money(card.summary.fuelTotal || 0)}</span>
          <span>Derecho de piso: ${money(card.summary.floorFee || 0)}</span>
          <span>Tarjeta: ${money(card.summary.cardSales || 0)}</span>
          <span>Comision banco: ${money(card.summary.bankFee || 0)}</span>
        </div>
        <div class="month-card-actions">
          ${card.type !== "year" ? `<button class="copy-sales-column" type="button" data-copy-${card.type === "current" ? "current" : "sales"}="${card.month}">Copiar ventas</button>` : ""}
          <button class="copy-sales-column" type="button" data-toggle-sales="${card.month}">${salesOpen ? "Ocultar ventas" : "Desplegar ventas"}</button>
          ${card.type === "current" ? `<button class="month-close-button" id="closeMonth" type="button"${card.closed || !card.records.length ? " disabled" : ""}>${card.closed ? "Mes cerrado" : "Cerrar mes"}</button>` : ""}
        </div>
        <div data-close-form-host="${card.month}"></div>
        ${salesOpen ? `<ol class="month-products">${productListHtml(card.summary.productTotals)}</ol>` : ""}
      </div>
    ` : "";

    return `
      <article class="month-card${isOpen ? " open" : ""}${card.type === "closed" ? " month-closed-card" : ""}${card.type === "year" ? " year-finalized" : ""}">
        <button class="month-card-cover" type="button" data-month-card="${card.month}">
          <span class="month-card-month">${monthCardLabel(card)}</span>
          <strong class="month-card-date">${card.month}</strong>
          <span class="month-card-kind">${card.type === "year" ? "A&ntilde;o finalizado" : card.type === "current" ? "Mes actual" : "Mes cerrado"}</span>
          <small>${status}</small>
          <b>${money(card.summary.totalRevenue)} venta</b>
          <em>${money(card.summary.profitability)} rentabilidad</em>
        </button>
        ${details}
      </article>
    `;
  };

  monthCards.innerHTML = `
    ${cards.map(renderCard).join("")}
    ${finishedYears.length ? `
      <section class="year-archive">
        <h3>Cierres anuales</h3>
        <div class="year-archive-grid">
          ${finishedYears.map((card, index) => renderCard(card, cards.length + index)).join("")}
        </div>
      </section>
    ` : ""}
  `;

  bindAccountingCardActions();
}

function bindAccountingCardActions() {
  monthCards.querySelectorAll("[data-month-card]").forEach((button) => {
    button.addEventListener("click", () => {
      activeMonthCard = activeMonthCard === button.dataset.monthCard ? null : button.dataset.monthCard;
      renderAccounting();
    });
  });
  monthCards.querySelectorAll("[data-copy-sales]").forEach((button) => {
    button.addEventListener("click", () => copySalesColumn(button.dataset.copySales));
  });
  monthCards.querySelectorAll("[data-copy-current]").forEach((button) => {
    button.addEventListener("click", copyCurrentSalesColumn);
  });
  monthCards.querySelectorAll("[data-toggle-sales]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      expandedSalesCard = expandedSalesCard === button.dataset.toggleSales ? null : button.dataset.toggleSales;
      activeMonthCard = button.dataset.toggleSales;
      renderAccounting();
    });
  });
  monthCards.querySelector("#closeMonth")?.addEventListener("click", openCloseMonthForm);
}

function openCloseMonthForm() {
  const records = monthRecords(visitDate.value);
  if (isMonthClosed(visitDate.value) || !records.length) {
    renderAccounting();
    return;
  }
  const host = monthCards.querySelector(`[data-close-form-host="${monthKey(visitDate.value)}"]`);
  if (!host) return;
  host.innerHTML = closeMonthTemplate.innerHTML;

  const summary = accountingSummaryForRecords(records);
  const closeMonthForm = host.querySelector("#closeMonthForm");
  const cardSalesInput = host.querySelector("#cardSalesInput");
  const floorFeeInput = host.querySelector("#floorFeeInput");
  const fuelTotalInput = host.querySelector("#fuelTotalInput");
  const cancelCloseMonth = host.querySelector("#cancelCloseMonth");
  const confirmCloseMonth = host.querySelector("#confirmCloseMonth");

  cardSalesInput.value = "";
  floorFeeInput.value = "";
  fuelTotalInput.value = summary.fuelTotal.toFixed(2);
  closeMonthForm.hidden = false;
  const update = () => updateClosePreview(host);
  [cardSalesInput, floorFeeInput, fuelTotalInput].forEach((input) => {
    input.addEventListener("input", update);
  });
  cancelCloseMonth.addEventListener("click", () => {
    host.innerHTML = "";
  });
  confirmCloseMonth.addEventListener("click", confirmCloseMonthProcess);
  update();
}

function updateClosePreview(scope = document) {
  const records = monthRecords(visitDate.value);
  const cardSalesInput = scope.querySelector("#cardSalesInput");
  const floorFeeInput = scope.querySelector("#floorFeeInput");
  const fuelTotalInput = scope.querySelector("#fuelTotalInput");
  const closePreview = scope.querySelector("#closePreview");
  if (!cardSalesInput || !floorFeeInput || !fuelTotalInput || !closePreview) return;
  const summary = accountingSummaryForRecords(records, {
    cardSales: cardSalesInput.value,
    floorFee: floorFeeInput.value,
    fuelTotal: fuelTotalInput.value
  });

  closePreview.innerHTML = `
    <div><span>Venta total</span><strong>${money(summary.totalRevenue)}</strong></div>
    <div><span>Rentabilidad total</span><strong>${money(summary.profitability)}</strong><small>${percent(summary.profitPercent)} de ganancia</small></div>
    <div><span>Comision tarjeta 3%</span><strong>${money(summary.bankFee)}</strong></div>
    <div><span>Ganancia bruta</span><strong>${money(summary.grossProfit)}</strong></div>
  `;
}

function confirmCloseMonthProcess() {
  const confirmed = window.confirm(`Seguro que quieres cerrar el mes ${monthKey(visitDate.value)}?`);
  if (!confirmed) return;
  finalizeMonthClosure();
}

function finalizeMonthClosure() {
  if (isMonthClosed(visitDate.value)) {
    showToast("Este mes ya fue cerrado");
    return;
  }

  const selectedMonth = monthKey(visitDate.value);
  const recordsInMonth = monthRecords(visitDate.value);
  if (!recordsInMonth.length) {
    showToast("No hay ventas guardadas en el mes seleccionado");
    return;
  }

  const closingRecord = [...recordsInMonth].sort((a, b) => b.date.localeCompare(a.date))[0];
  const summary = accountingSummaryForRecords(recordsInMonth, {
    cardSales: monthCards.querySelector("#cardSalesInput")?.value,
    floorFee: monthCards.querySelector("#floorFeeInput")?.value,
    fuelTotal: monthCards.querySelector("#fuelTotalInput")?.value
  });
  const closure = {
    month: selectedMonth,
    closedAt: todayValue(),
    sourceDate: closingRecord.date,
    totalSold: summary.totalSold,
    productTotals: summary.productTotals,
    productOrderSnapshot: productReportOrder(summary.productTotals.map((item) => item.product)),
    totalRevenue: summary.totalRevenue,
    totalCost: summary.totalCost,
    profitability: summary.profitability,
    cardSales: summary.cardSales,
    bankFee: summary.bankFee,
    floorFee: summary.floorFee,
    fuelTotal: summary.fuelTotal,
    grossProfit: summary.grossProfit,
    openingStockNextMonth: recordNextStock(closingRecord)
  };
  const existingIndex = state.monthClosures.findIndex((item) => item.month === selectedMonth);

  if (existingIndex >= 0) {
    state.monthClosures[existingIndex] = closure;
  } else {
    state.monthClosures.push(closure);
  }

  if (selectedMonth.endsWith("-12")) {
    const closedYear = yearKey(selectedMonth);
    const monthsInYear = state.monthClosures
      .filter((item) => yearKey(item.month) === closedYear)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({ ...item, summary: summaryFromClosure(item) }));
    const yearSummary = yearSummaryFromMonths(monthsInYear);
    const yearClosure = {
      year: closedYear,
      month: closedYear,
      closedAt: todayValue(),
      sourceDate: closingRecord.date,
      totalSold: yearSummary.totalSold,
      productTotals: yearSummary.productTotals,
      productOrderSnapshot: yearSummary.productOrderSnapshot,
      totalRevenue: yearSummary.totalRevenue,
      totalCost: yearSummary.totalCost,
      profitability: yearSummary.profitability,
      cardSales: yearSummary.cardSales,
      bankFee: yearSummary.bankFee,
      floorFee: yearSummary.floorFee,
      fuelTotal: yearSummary.fuelTotal,
      grossProfit: yearSummary.grossProfit,
      monthSummaries: monthsInYear.map(compactMonthSummary),
      openingStockNextYear: closure.openingStockNextMonth
    };
    const existingYearIndex = state.yearClosures.findIndex((item) => item.year === closedYear);

    if (existingYearIndex >= 0) {
      state.yearClosures[existingYearIndex] = yearClosure;
    } else {
      state.yearClosures.push(yearClosure);
    }

    state.monthClosures = state.monthClosures.filter((item) => yearKey(item.month) !== closedYear);
    state.records = state.records.filter((item) => yearKey(item.date) !== closedYear);
  }

  saveState();
  visitDate.value = firstDayNextMonth(visitDate.value);
  activeMonthCard = null;
  expandedSalesCard = null;
  loadDate(visitDate.value);
  showAccountingView();
  showToast("Mes cerrado y guardado");
}

function salesColumnForReport(report) {
  const totals = new Map((report.productTotals || []).map((item) => [item.product, Number(item.sold || 0)]));
  const order = report.productOrderSnapshot || (report.productTotals || []).map((item) => item.product);
  return order.map((productName) => totals.get(productName) || 0).join("\n");
}

function salesColumnForCurrentMonth() {
  const summary = accountingSummaryForRecords(monthRecords(visitDate.value));
  const totals = new Map(summary.productTotals.map((item) => [item.product, Number(item.sold || 0)]));
  const order = productReportOrder(summary.productTotals.map((item) => item.product));
  return order.map((productName) => totals.get(productName) || 0).join("\n");
}

async function copySalesColumn(month) {
  const report = state.monthClosures.find((item) => item.month === month);
  if (!report) return;

  try {
    await navigator.clipboard.writeText(salesColumnForReport(report));
    showToast("Columna de ventas copiada");
  } catch {
    showToast("No se pudo copiar automáticamente");
  }
}

async function copyCurrentSalesColumn() {
  try {
    await navigator.clipboard.writeText(salesColumnForCurrentMonth());
    showToast("Ventas del mes actual copiadas");
  } catch {
    showToast("No se pudo copiar automáticamente");
  }
}

function findSlot(code) {
  return currentSlots.find((slot) => slot.code === code);
}

function openSlotDialog(code) {
  if (isDateLocked(visitDate.value)) return;
  const requestedSlot = findSlot(code);
  const slot = requestedSlot && slotCanCapture(requestedSlot) && isRepresentativeSlot(requestedSlot)
    ? requestedSlot
    : null;
  if (!slot || !slotCanCapture(slot)) return;
  syncVisitDetailsFromVisual();
  const detail = currentVisitDetails.get(slot.product);
  const visualRefs = currentSlots.filter((item) => item.product === slot.product).map((item) => item.code);
  activeSlotCode = slot.code;
  slotDialogCode.textContent = visualRefs.length > 1 ? visualRefs.join(" + ") : slot.code;
  slotDialogTitle.textContent = slot.product;
  foundInput.value = Number(detail?.SM || 0);
  leftInput.value = Number(detail?.NS || 0);
  previousStockLabel.textContent = visualRefs.length > 1
    ? `Stock anterior: ${Number(detail?.stockAnterior || 0)} unidades. Representante: ${slot.code}. Referencias: ${visualRefs.length}.`
    : `Stock anterior: ${Number(detail?.stockAnterior || 0)} unidades. Representante: ${slot.code}.`;
  updateDialogResult();
  slotDialog.showModal();
  foundInput.focus();
}

function updateDialogResult() {
  const slot = activeSlotCode ? findSlot(activeSlotCode) : null;
  const detail = slot ? currentVisitDetails.get(slot.product) : null;
  const previousStock = Number(detail?.stockAnterior || 0);
  const found = Number(foundInput.value || 0);

  if (!slot || previousStock === 0) {
    dialogResult.textContent = "Primera carga o sin stock anterior para este producto.";
    return;
  }

  if (found > previousStock) {
    dialogResult.textContent = `Revisar conteo: encontraste ${found} y el stock anterior era ${previousStock}.`;
    return;
  }

  dialogResult.textContent = `Vendidas desde stock anterior: ${Math.max(previousStock - found, 0)}`;
}

function saveSlotInputs() {
  if (isDateLocked(visitDate.value)) {
    slotDialog.close();
    showToast("Datos cerrados: edicion bloqueada");
    return;
  }

  const slot = findSlot(activeSlotCode);
  if (!slot || !slotCanCapture(slot) || !isRepresentativeSlot(slot)) return;
  const found = Number(foundInput.value || 0);
  const left = Number(leftInput.value || 0);
  const detail = currentVisitDetails.get(slot.product);
  if (detail) {
    detail.SM = found;
    detail.NS = left;
    detail.UV = Number(detail.stockAnterior || 0) - found;
    detail.captured = true;
    detail.status = detail.UV < 0 ? "error" : "ok";
    detail.note = detail.UV < 0 ? "SM mayor que stock anterior" : "";
    currentVisitDetails.set(slot.product, detail);
  }
  applyVisitDetailsToSlots();
  ensureCaptureSlots();
  buildMachine();
  updateSummary();
  slotDialog.close();
}

function handleSlotInputKeydown(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();

  if (event.currentTarget === foundInput) {
    leftInput.focus();
    leftInput.select();
    return;
  }

  saveSlotInputs();
}

function currentRecord() {
  const details = currentVisitDetailsList();
  const slotsSnapshot = buildSlotsSnapshot(currentSlots);
  const existing = getRecord(visitDate.value);
  const isInitialLoad = !getPreviousRecord(visitDate.value)
    && ![...previousProductStockMap(visitDate.value).values()].some((entry) => Number(entry?.stock || 0) > 0);

  return {
    date: visitDate.value,
    type: isInitialLoad ? "carga_inicial" : "visita_real",
    status: "closed",
    fuelCost: Number(fuelInput.value || 0),
    catalogSnapshot: catalogForRecord(existing),
    slots: slotsSnapshot,
    slotsSnapshot,
    visitDetails: details,
    salesMovements: isInitialLoad ? [] : buildSalesMovementsFromDetails(details),
    nextStock: buildNextStockFromDetails(details)
  };
}

function validateRequiredCaptures() {
  const details = currentVisitDetailsList();
  const missingWithoutRepresentative = details.find((detail) =>
    detail.representative === "SR" && Number(detail.stockAnterior || 0) > 0 && !detail.captured
  );

  if (missingWithoutRepresentative) {
    const value = window.prompt(`Indica cuanto encontraste de ${missingWithoutRepresentative.product}. No tiene representante visual.`, String(missingWithoutRepresentative.SM || ""));
    if (value === null || value === "") {
      stockStatus.textContent = `Falta indicar SM de ${missingWithoutRepresentative.product}.`;
      showToast(`Falta SM de ${missingWithoutRepresentative.product}`);
      return false;
    }
    missingWithoutRepresentative.SM = Number(value || 0);
    missingWithoutRepresentative.NS = 0;
    missingWithoutRepresentative.UV = Number(missingWithoutRepresentative.stockAnterior || 0) - missingWithoutRepresentative.SM;
    missingWithoutRepresentative.captured = true;
    missingWithoutRepresentative.status = missingWithoutRepresentative.UV < 0 ? "error" : "ok";
    missingWithoutRepresentative.note = missingWithoutRepresentative.UV < 0 ? "SM mayor que stock anterior" : "";
    currentVisitDetails.set(missingWithoutRepresentative.product, missingWithoutRepresentative);
    return validateRequiredCaptures();
  }

  const missingWithRepresentative = details.find((detail) => detail.representative !== "SR" && !detail.captured);
  if (missingWithRepresentative) {
    stockStatus.textContent = `Falta capturar SM y NS de ${missingWithRepresentative.product}.`;
    showToast(`Falta capturar ${missingWithRepresentative.product}`);
    openSlotDialog(missingWithRepresentative.representative);
    return false;
  }

  const invalid = details.find((detail) => Number(detail.UV || 0) < 0);
  if (invalid) {
    stockStatus.textContent = `${invalid.product} tiene SM mayor que stock anterior. Corrige antes de guardar.`;
    showToast(`Inconsistencia en ${invalid.product}`);
    if (invalid.representative !== "SR") openSlotDialog(invalid.representative);
    return false;
  }

  return true;
}

function saveSelectedDate() {
  if (isMonthClosed(visitDate.value)) {
    stockStatus.textContent = "Este mes ya fue cerrado. No se pueden guardar cambios.";
    return;
  }
  if (getRecord(visitDate.value)) {
    stockStatus.textContent = "Esta fecha ya fue cerrada. No se pueden guardar cambios.";
    showToast("Fecha cerrada: datos bloqueados");
    return;
  }
  if (!validateRequiredCaptures()) return;

  const record = currentRecord();
  const index = state.records.findIndex((item) => item.date === record.date);
  const isUpdate = index >= 0;

  if (isUpdate) {
    state.records[index] = record;
  } else {
    state.records.push(record);
  }

  saveState();
  loadDate(record.date);
  if (isUpdate) showToast("Datos actualizados");
}

function fillCurrentDateWithTestStock() {
  if (isDateLocked(visitDate.value)) {
    setMenuOpen(false);
    showToast("Datos cerrados: edicion bloqueada");
    return;
  }

  currentSlots.filter(isRepresentativeSlot).forEach((slot, index) => {
    const detail = currentVisitDetails.get(slot.product);
    const previous = Number(detail?.stockAnterior || 0);
    const found = previous > 0 ? Math.max(previous - ((index % 4) + 1), 0) : 0;
    const left = Math.max(found, 7 + ((index + 2) % 5));

    if (detail) {
      detail.SM = found;
      detail.NS = left;
      detail.UV = previous - found;
      detail.captured = true;
      detail.status = "ok";
      detail.note = "";
      currentVisitDetails.set(slot.product, detail);
    }
  });

  applyVisitDetailsToSlots();
  ensureCaptureSlots();
  buildMachine();
  setMenuOpen(false);
  updateSummary();
  showToast("Stock de prueba insertado");
}

function clearAllTestData() {
  const confirmed = window.confirm("Seguro que quieres limpiar todos los datos guardados?");
  if (!confirmed) return;

  resetStateData();
  visitDate.value = todayValue();
  loadDate(visitDate.value);
  showMainView();
  setMenuOpen(false);
  showToast("Datos limpiados");
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

[foundInput, leftInput].forEach((input) => {
  input.addEventListener("input", updateDialogResult);
  input.addEventListener("keydown", handleSlotInputKeydown);
});

saveSlot.addEventListener("click", saveSlotInputs);
updateStock.addEventListener("click", saveSelectedDate);
saveDateChanges.addEventListener("click", saveSelectedDate);
menuToggle.addEventListener("click", () => {
  setMenuOpen(appMenu.hidden);
});
menuBackdrop.addEventListener("click", () => setMenuOpen(false));
generateReport.addEventListener("click", () => {
  showAccountingView();
});
mainViewButton.addEventListener("click", showMainView);
productsViewButton.addEventListener("click", showProductsView);
machineSwitcher.addEventListener("click", () => {
  showToast("Cambio de maquina disponible en una proxima version");
  setMenuOpen(false);
});
backToMain.addEventListener("click", showMainView);
backToMainFromProducts.addEventListener("click", showMainView);
productForm.addEventListener("submit", addProduct);
fillTestStock.addEventListener("click", fillCurrentDateWithTestStock);
clearTestData.addEventListener("click", clearAllTestData);
function openVisitDatePicker() {
  try {
    if (typeof visitDate.showPicker === "function") {
      visitDate.showPicker();
      return;
    }
  } catch (error) {
    // Some mobile browsers expose showPicker but only allow direct input taps.
  }
  visitDate.focus();
}

dateButton.addEventListener("click", openVisitDatePicker);
visitDate.addEventListener("click", openVisitDatePicker);
visitDate.addEventListener("change", () => loadDate(visitDate.value));

visitDate.value = todayValue();
loadDate(visitDate.value);
loadStateFromConvex();
