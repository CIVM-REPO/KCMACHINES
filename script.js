const STORAGE_KEY = "kc-machines-v28-product-total";
const SYNC_META_KEY = `${STORAGE_KEY}-sync-meta`;
const LOCAL_BACKUPS_KEY = `${STORAGE_KEY}-local-backups`;
const PENDING_VISIT_SYNC_KEY = `${STORAGE_KEY}-pending-visit-sync`;
const PENDING_CLOSURE_SYNC_KEY = `${STORAGE_KEY}-pending-closure-sync`;
const APP_BUILD_VERSION = "20260630-remote-closures-merge";
const EMPTY_PRODUCT = "EMPTY";
const CONVEX_URL = String(window.KC_CONVEX_URL || "").trim().replace(/\/$/, "");
const LEGACY_APPSTATE_SAVE_ENABLED = false;
const SYNC_RETRY_BASE_MS = 3000;
const SYNC_RETRY_MAX_MS = 60000;
let convexSaveTimer = null;
let convexRetryTimer = null;
let convexSaveInFlight = null;

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
const productImageVersion = "20260602-product-cache";
const preloadedProductImages = new Set();
const productColors = ["#46b8ff", "#35e79a", "#f8c45c", "#ef7b8c", "#b98cff", "#72dfdf", "#ff9d5c", "#a6f06f"];
const machineColors = ["#35e79a", "#46b8ff", "#f8c45c", "#ef7b8c", "#b98cff", "#72dfdf", "#ff9d5c", "#a6f06f", "#ff6fcb", "#b7f36d"];
const monthNamesShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const baseProductLayout = {};
const defaultMachineSettings = {
  bankCommissionPercent: 3,
  fuelReminderEveryVisits: 4,
  monthlyFloorCost: 0
};
const defaultGlobalSettings = {
  currency: "USD",
  language: null,
  visualPreferences: {}
};

const defaultRowSizes = [5, 5, 10, 10, 10, 10];
const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const state = loadState();
let syncMeta = loadSyncMeta();
syncProductCatalog();
let currentSlots = [];
let currentVisitDetails = new Map();
let activeSlotCode = null;

const machineTarget = document.getElementById("machineOperator");
const machineContextLabels = document.querySelectorAll("[data-machine-context]");
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
const syncStatus = document.getElementById("syncStatus");
const mainViewButton = document.getElementById("mainViewButton");
const machineSwitcher = document.getElementById("machineSwitcher");
const machineMenuList = document.getElementById("machineMenuList");
const productsViewButton = document.getElementById("productsViewButton");
const settingsViewButton = document.getElementById("settingsViewButton");
const backToMain = document.getElementById("backToMain");
const backToMainFromProducts = document.getElementById("backToMainFromProducts");
const backToMainFromSettings = document.getElementById("backToMainFromSettings");
const accountingView = document.getElementById("accountingView");
const productsView = document.getElementById("productsView");
const settingsView = document.getElementById("settingsView");
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
const zeroStatePanel = document.getElementById("zeroStatePanel");
const zeroCreateMachine = document.getElementById("zeroCreateMachine");
const currencyInput = document.getElementById("currencyInput");
const languageInput = document.getElementById("languageInput");
const visualPreferencesInput = document.getElementById("visualPreferencesInput");
const startMachineCreateButton = document.getElementById("startMachineCreateButton");
const machineCreateForm = document.getElementById("machineCreateForm");
const cancelMachineCreateButton = document.getElementById("cancelMachineCreateButton");
const newMachineNameInput = document.getElementById("newMachineNameInput");
const inheritMachineSelect = document.getElementById("inheritMachineSelect");
const machineLayoutFields = document.getElementById("machineLayoutFields");
const addMatrixRowButton = document.getElementById("addMatrixRowButton");
const machineMatrixPreview = document.getElementById("machineMatrixPreview");
const matrixDesignerStatus = document.getElementById("matrixDesignerStatus");
const newMachineRowsInput = document.getElementById("newMachineRowsInput");
const newMachineSpacesInput = document.getElementById("newMachineSpacesInput");
const machineAdminList = document.getElementById("machineAdminList");
const machineSettingsAccess = document.getElementById("machineSettingsAccess");
const globalSettingsAccess = document.getElementById("globalSettingsAccess");
const machineSettingsPanel = document.getElementById("machineSettingsPanel");
const globalSettingsPanel = document.getElementById("globalSettingsPanel");
const machineSettingsEmpty = document.getElementById("machineSettingsEmpty");
const machineSettingsForm = document.getElementById("machineSettingsForm");
const machineNameInput = document.getElementById("machineNameInput");
const bankCommissionInput = document.getElementById("bankCommissionInput");
const fuelReminderEveryInput = document.getElementById("fuelReminderEveryInput");
const monthlyFloorCostInput = document.getElementById("monthlyFloorCostInput");
const machineProductAssignSelect = document.getElementById("machineProductAssignSelect");
const assignMachineProductButton = document.getElementById("assignMachineProductButton");
const machineProductsList = document.getElementById("machineProductsList");
const saveSettingsButton = document.getElementById("saveSettingsButton");
const exportMachineButton = document.getElementById("exportMachineButton");
const importMachineButton = document.getElementById("importMachineButton");
const resetMachineButton = document.getElementById("resetMachineButton");
let showAllHistory = false;
let activeMonthCard = null;
let expandedSalesCard = null;
let settingsScope = "machine";
let createMachineRowSizes = defaultRowSizes.slice();
let isCreatingMachine = false;

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)) || { records: [], monthClosures: [], yearClosures: [] });
  } catch {
    return normalizeState({ records: [], monthClosures: [], yearClosures: [] });
  }
}

function loadSyncMeta() {
  try {
    const saved = JSON.parse(localStorage.getItem(SYNC_META_KEY)) || {};
    return {
      pendingUpdatedAt: Number(saved.pendingUpdatedAt || 0),
      syncedUpdatedAt: Number(saved.syncedUpdatedAt || 0),
      retryCount: Number(saved.retryCount || 0),
      lastError: saved.lastError || null,
      lastAttemptAt: Number(saved.lastAttemptAt || 0),
      lastSyncedAt: Number(saved.lastSyncedAt || 0),
      lastNormalizedError: saved.lastNormalizedError || null
    };
  } catch {
    return {
      pendingUpdatedAt: 0,
      syncedUpdatedAt: 0,
      retryCount: 0,
      lastError: null,
      lastAttemptAt: 0,
      lastSyncedAt: 0,
      lastNormalizedError: null
    };
  }
}

function saveSyncMeta() {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(syncMeta));
}

function saveLocalBackup(reason) {
  try {
    if (!stateHasUserData(state)) return;
    const backups = JSON.parse(localStorage.getItem(LOCAL_BACKUPS_KEY)) || [];
    const snapshot = {
      reason,
      savedAt: Date.now(),
      updatedAt: Number(state.updatedAt || 0),
      records: Array.isArray(state.records) ? state.records.length : 0,
      activeMachineId: state.activeMachineId || null,
      data: state
    };
    const nextBackups = [snapshot, ...backups]
      .filter((backup, index, all) => all.findIndex((item) => item.updatedAt === backup.updatedAt && item.reason === backup.reason) === index)
      .slice(0, 30);
    localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(nextBackups));
  } catch (error) {
    console.warn("Local backup failed", error);
  }
}

function hasPendingSync() {
  if (hasPendingVisitSync()) return true;
  if (hasPendingClosureSync()) return true;
  if (!LEGACY_APPSTATE_SAVE_ENABLED) return false;
  return Number(syncMeta.pendingUpdatedAt || 0) > Number(syncMeta.syncedUpdatedAt || 0);
}

function pendingVisitSyncPayload() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_VISIT_SYNC_KEY)) || null;
  } catch {
    return null;
  }
}

function hasPendingVisitSync() {
  return Boolean(pendingVisitSyncPayload()?.visit);
}

function pendingClosureSyncPayload() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_CLOSURE_SYNC_KEY)) || null;
  } catch {
    return null;
  }
}

function hasPendingClosureSync() {
  const payload = pendingClosureSyncPayload();
  return Boolean(payload?.monthClosure || payload?.yearClosure);
}

function renderSyncStatus(options = {}) {
  if (!syncStatus || !CONVEX_URL) return;
  clearTimeout(renderSyncStatus.hideTimer);
  syncStatus.title = `KC build ${APP_BUILD_VERSION}`;

  if (convexSaveInFlight) {
    syncStatus.dataset.state = "syncing";
    syncStatus.textContent = "Sincronizando con Convex...";
    syncStatus.hidden = false;
    return;
  }

  if (hasPendingSync()) {
    syncStatus.dataset.state = syncMeta.lastError ? "error" : "pending";
    syncStatus.textContent = syncMeta.lastError
      ? `Pendiente de sincronizar. Reintentando: ${syncMeta.lastError.slice(0, 110)}`
      : "Cambios guardados localmente. Pendiente de sincronizar con Convex.";
    syncStatus.hidden = false;
    return;
  }

  if (syncMeta.lastNormalizedError) {
    syncStatus.dataset.state = "error";
    syncStatus.textContent = `Datos guardados. Reportes pendientes: ${syncMeta.lastNormalizedError.slice(0, 110)}`;
    syncStatus.hidden = false;
    return;
  }

  if (options.showSynced) {
    syncStatus.dataset.state = "synced";
    syncStatus.textContent = "Sincronizado con Convex";
    syncStatus.hidden = false;
    renderSyncStatus.hideTimer = setTimeout(() => {
      syncStatus.hidden = true;
    }, 1800);
    return;
  }

  syncStatus.hidden = true;
}

function markSyncPending() {
  syncMeta.pendingUpdatedAt = Number(state.updatedAt || Date.now());
  syncMeta.lastError = null;
  saveSyncMeta();
  renderSyncStatus();
}

function markSyncConfirmed(updatedAt, result) {
  syncMeta.syncedUpdatedAt = Math.max(Number(syncMeta.syncedUpdatedAt || 0), Number(updatedAt || 0));
  syncMeta.retryCount = 0;
  syncMeta.lastError = null;
  syncMeta.lastSyncedAt = Date.now();
  syncMeta.lastNormalizedError = result?.normalizedSynced === false
    ? result.normalizedError || "No se pudieron actualizar las tablas de reporte"
    : null;
  saveSyncMeta();
  renderSyncStatus({ showSynced: !hasPendingSync() && !syncMeta.lastNormalizedError });
}

function rememberSyncFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  syncMeta.retryCount = Number(syncMeta.retryCount || 0) + 1;
  syncMeta.lastAttemptAt = Date.now();
  syncMeta.lastError = message;
  saveSyncMeta();
  renderSyncStatus();
}

function nextRetryDelay() {
  return Math.min(SYNC_RETRY_MAX_MS, SYNC_RETRY_BASE_MS * (2 ** Math.min(syncMeta.retryCount, 5)));
}

function scheduleConvexRetry() {
  if (!CONVEX_URL || !hasPendingSync()) return;
  clearTimeout(convexRetryTimer);
  convexRetryTimer = setTimeout(() => {
    flushPendingSync();
  }, nextRetryDelay());
}

async function requestPersistentStorage() {
  if (!navigator.storage?.persisted || !navigator.storage?.persist) return;
  try {
    const alreadyPersistent = await navigator.storage.persisted();
    if (!alreadyPersistent) await navigator.storage.persist();
  } catch (error) {
    console.warn("Persistent storage request failed", error);
  }
}

function stateHasUserData(appState) {
  return Boolean(
    appState.records?.length
    || appState.monthClosures?.length
    || appState.yearClosures?.length
    || appState.machines?.length
    || appState.products?.length
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

function mergeMissingRemoteClosures(remoteState) {
  const normalizedRemote = normalizeState(remoteState);
  const closureKey = (item) => `${item.machineId || ""}:${item.month || ""}`;
  const yearKeyForClosure = (item) => `${item.machineId || ""}:${item.year || item.month || ""}`;
  const localMonthKeys = new Set((state.monthClosures || []).map(closureKey));
  const localYearKeys = new Set((state.yearClosures || []).map(yearKeyForClosure));
  const missingMonthClosures = (normalizedRemote.monthClosures || [])
    .filter((closure) => closure.machineId && closure.month && !localMonthKeys.has(closureKey(closure)));
  const missingYearClosures = (normalizedRemote.yearClosures || [])
    .filter((closure) => closure.machineId && (closure.year || closure.month) && !localYearKeys.has(yearKeyForClosure(closure)));

  if (!missingMonthClosures.length && !missingYearClosures.length) return false;

  saveLocalBackup("before-remote-closures-merge");
  state.monthClosures = [...(state.monthClosures || []), ...missingMonthClosures];
  state.yearClosures = [...(state.yearClosures || []), ...missingYearClosures];
  state.updatedAt = Math.max(Number(state.updatedAt || 0), Number(normalizedRemote.updatedAt || 0));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compactStateForStorage(state)));
  return true;
}

function applyRemoteState(remoteState) {
  const normalized = normalizeState(remoteState);
  saveLocalBackup("before-remote-apply");
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, normalized);
  syncProductCatalog();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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

  const responseText = await response.text();
  let payload = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.errorMessage || responseText || response.statusText;
    throw new Error(`Convex HTTP ${response.status}: ${detail}`);
  }

  if (payload.status === "error") {
    throw new Error(payload.errorMessage || "Convex request failed");
  }

  return payload.value;
}

function normalizedRowSizesFromMachine(machine) {
  return normalizeRowSizes(rowSizesFromConfig(machine?.configuracionFilas) || machine?.rowSizes);
}

function normalizedBootstrapProducts(bootstrap) {
  const productsById = new Map((bootstrap?.productos || []).map((product) => [normalizeProductName(product.idProducto || product.nombreProducto), product]));
  const orderedIds = [...(bootstrap?.maquinaProductos || [])]
    .filter((item) => item?.activoEnMaquina !== false)
    .sort((a, b) => Number(a.ordenContable ?? 0) - Number(b.ordenContable ?? 0))
    .map((item) => normalizeProductName(item.idProducto))
    .filter(Boolean);
  const ids = [...new Set([...orderedIds, ...productsById.keys()])];

  return ids
    .map((id) => {
      const product = productsById.get(id);
      return {
        name: id,
        price: Number(product?.precio ?? product?.price ?? 0),
        cost: Number(product?.costo ?? product?.cost ?? 0)
      };
    })
    .filter((product) => product.name);
}

function normalizedBootstrapMachineProductIds(bootstrap, machines, normalizedProducts) {
  const fallbackIds = normalizedProducts.map((product) => product.name);
  const byMachine = {};

  machines.forEach((machine) => {
    const ids = [...(bootstrap?.maquinaProductos || [])]
      .filter((item) => item.idMaquina === machine.id && item.activoEnMaquina !== false)
      .sort((a, b) => Number(a.ordenContable ?? 0) - Number(b.ordenContable ?? 0))
      .map((item) => normalizeProductName(item.idProducto))
      .filter(Boolean);
    byMachine[machine.id] = ids.length ? [...new Set(ids)] : fallbackIds.slice();
  });

  return byMachine;
}

function normalizedBootstrapVisualLayout(bootstrap, machine, rowSizes) {
  const layout = {};
  (bootstrap?.matrizVisual || [])
    .filter((cell) => cell.idMaquina === machine.idMaquina)
    .forEach((cell) => {
      layout[cell.coordenada] = normalizeProductName(cell.idProducto) || EMPTY_PRODUCT;
    });
  return normalizeVisualLayout(layout, rowSizes);
}

function normalizedVisitDetail(detail) {
  const productName = normalizeProductName(detail.idProducto || detail.nombreProducto || detail.product);
  return {
    product: productName,
    stockAnterior: Number(detail.stockAnterior || 0),
    representative: detail.representante || detail.representative || "SR",
    SM: Number(detail.SM || 0),
    NS: Number(detail.NS || 0),
    UV: Number(detail.UV || 0),
    status: detail.estadoValidacion || detail.status || "ok",
    note: detail.notaValidacion || detail.note || "",
    captured: true,
    price: Number(detail.precio ?? detail.price ?? productCatalogItem(productName)?.price ?? 0),
    cost: Number(detail.costo ?? detail.cost ?? productCatalogItem(productName)?.cost ?? 0)
  };
}

function remoteUpdatedAtFromBootstrap(bootstrap, visitsByMachine) {
  const appStateUpdatedAt = (bootstrap?.metadata?.appState || [])
    .map((row) => Number(row.updatedAt || 0));
  const entityUpdatedAt = [
    ...(bootstrap?.maquinas || []),
    ...(bootstrap?.productos || []),
    ...(bootstrap?.maquinaProductos || []),
    ...(bootstrap?.matrizVisual || []),
    ...(bootstrap?.cierresMensuales || []),
    ...(bootstrap?.cierresAnuales || []),
    ...Object.values(visitsByMachine || {}).flat()
  ].flatMap((item) => [Number(item.updatedAt || 0), Number(item.closedAt || 0), Number(item.createdAt || 0)]);

  return Math.max(0, ...appStateUpdatedAt, ...entityUpdatedAt);
}

function mergeLegacyClosures(normalizedState, legacyState) {
  const normalized = normalizeState(normalizedState);
  const legacy = normalizeState(legacyState || {});
  const machineIds = new Set(normalized.machines.map((machine) => machine.id));
  const closureKey = (item) => `${item.machineId || ""}:${item.month || ""}`;
  const yearKeyForClosure = (item) => `${item.machineId || ""}:${item.year || item.month || ""}`;
  const monthKeys = new Set(normalized.monthClosures.map(closureKey));
  const yearKeys = new Set(normalized.yearClosures.map(yearKeyForClosure));
  const legacyMonthClosures = legacy.monthClosures
    .filter((closure) => closure.month && machineIds.has(closure.machineId) && !monthKeys.has(closureKey(closure)));
  const legacyYearClosures = legacy.yearClosures
    .filter((closure) => (closure.year || closure.month) && machineIds.has(closure.machineId) && !yearKeys.has(yearKeyForClosure(closure)));

  if (!legacyMonthClosures.length && !legacyYearClosures.length) return normalized;

  return normalizeState({
    ...normalized,
    monthClosures: [...normalized.monthClosures, ...legacyMonthClosures],
    yearClosures: [...normalized.yearClosures, ...legacyYearClosures],
    updatedAt: Math.max(Number(normalized.updatedAt || 0), Number(legacy.updatedAt || 0))
  });
}

function normalizedBootstrapMonthClosures(bootstrap) {
  return (bootstrap?.cierresMensuales || [])
    .map((closure) => ({
      ...(closure.data || {}),
      machineId: closure.idMaquina || closure.data?.machineId || null,
      month: closure.mes || closure.data?.month || null,
      closedAt: closure.data?.closedAt || closure.closedAt || null
    }))
    .filter((closure) => closure.machineId && closure.month);
}

function normalizedBootstrapYearClosures(bootstrap) {
  return (bootstrap?.cierresAnuales || [])
    .map((closure) => ({
      ...(closure.data || {}),
      machineId: closure.idMaquina || closure.data?.machineId || null,
      year: closure.anio || closure.data?.year || closure.data?.month || null,
      month: closure.anio || closure.data?.month || closure.data?.year || null,
      closedAt: closure.data?.closedAt || closure.closedAt || null
    }))
    .filter((closure) => closure.machineId && (closure.year || closure.month));
}

async function loadNormalizedStateFromConvex() {
  const bootstrap = await convexRequest("query", "appState:getBootstrap", {});
  if (!bootstrap?.maquinas?.length) return null;

  const normalizedProducts = normalizedBootstrapProducts(bootstrap);
  const machines = (bootstrap.maquinas || [])
    .filter((machine) => machine.status !== "inactive" && !machine.deletedAt)
    .map((machine, index) => {
      const rowSizes = normalizedRowSizesFromMachine(machine);
      return {
        id: String(machine.idMaquina || `machine-${index + 1}`),
        name: String(machine.nombreMaquina || `Maquina ${index + 1}`),
        status: String(machine.status || "active"),
        deletedAt: machine.deletedAt || null,
        settings: normalizeMachineSettings(machine.settings || {}),
        rowSizes,
        visualLayout: normalizedBootstrapVisualLayout(bootstrap, machine, rowSizes)
      };
    });
  const activeMachineId = machines.find((machine) => machine.status === "active")?.id || machines[0]?.id || null;
  const visitsByMachine = {};
  const detailLists = await Promise.all(machines.map(async (machine) => {
    const visits = await convexRequest("query", "appState:listVisitsByMachine", { idMaquina: machine.id });
    visitsByMachine[machine.id] = visits || [];
    const records = await Promise.all((visits || []).map(async (visit) => {
      const details = await convexRequest("query", "appState:getVisitDetails", { idVisita: visit.idVisita });
      return {
        machineId: visit.idMaquina,
        date: visit.fecha,
        type: visit.tipo || "visita_real",
        status: visit.estado || "closed",
        fuelCost: Number(visit.fuelCost || 0),
        createdAt: Number(visit.createdAt || 0),
        closedAt: Number(visit.closedAt || 0),
        catalogSnapshot: catalogSnapshot(normalizedProducts),
        visitDetails: (details || []).map(normalizedVisitDetail).filter((detail) => detail.product && !isEmptyProduct(detail.product))
      };
    }));
    return records;
  }));

  const normalizedState = normalizeState({
    records: detailLists.flat().sort((a, b) => String(a.date).localeCompare(String(b.date))),
    monthClosures: normalizedBootstrapMonthClosures(bootstrap),
    yearClosures: normalizedBootstrapYearClosures(bootstrap),
    machines,
    activeMachineId,
    globalSettings: defaultGlobalSettings,
    machineProductIds: normalizedBootstrapMachineProductIds(bootstrap, machines, normalizedProducts),
    products: normalizedProducts,
    updatedAt: remoteUpdatedAtFromBootstrap(bootstrap, visitsByMachine)
  });

  try {
    const legacyState = await loadLegacyStateFromConvex();
    return mergeLegacyClosures(normalizedState, legacyState);
  } catch (legacyError) {
    console.warn("Convex legacy closures merge skipped", legacyError);
    return normalizedState;
  }
}

async function loadLegacyStateFromConvex() {
  return await convexRequest("query", "appState:get", { key: STORAGE_KEY });
}

async function loadStateFromConvex() {
  if (!CONVEX_URL) return;

  try {
    let remoteState = null;
    try {
      remoteState = await loadNormalizedStateFromConvex();
    } catch (bootstrapError) {
      console.warn("Convex normalized bootstrap failed, falling back to appState:get", bootstrapError);
      remoteState = await loadLegacyStateFromConvex();
    }

    if (!remoteState) {
      if (stateHasUserData(state)) {
        console.info("Legacy appState upload skipped; normalized entity mutations are required for remote writes.");
        showToast("Datos locales conservados; appState legacy no se subio");
      }
      return;
    }

    if (shouldKeepLocalState(remoteState)) {
      const mergedClosures = mergeMissingRemoteClosures(remoteState);
      if (mergedClosures) {
        syncProductCatalog();
        loadDate(visitDate.value);
        renderSyncStatus();
        showToast("Cierres remotos agregados a este navegador");
        return;
      }
      console.info("Legacy appState upload skipped for newer local state.");
      showToast("Datos locales conservados; appState legacy no se subio");
      return;
    }

    applyRemoteState(remoteState);
    syncMeta.pendingUpdatedAt = Number(state.updatedAt || 0);
    syncMeta.syncedUpdatedAt = Number(state.updatedAt || 0);
    syncMeta.retryCount = 0;
    syncMeta.lastError = null;
    syncMeta.lastNormalizedError = null;
    saveSyncMeta();
    renderSyncStatus();
    loadDate(visitDate.value);
    showToast("Datos sincronizados con Convex");
  } catch (error) {
    console.warn("Convex sync failed", error);
    const message = error instanceof Error ? error.message : String(error);
    syncMeta.lastError = message;
    saveSyncMeta();
    renderSyncStatus();
    showToast(`Convex no sincronizo: ${message.slice(0, 80)}`);
    scheduleConvexRetry();
  }
}

function saveStateToConvex() {
  if (!CONVEX_URL) return Promise.resolve();
  return convexRequest("mutation", "appState:save", {
    key: STORAGE_KEY,
    data: compactStateForStorage(state)
  });
}

function visualLayoutForVisitSync(record) {
  return (record?.slotsSnapshot || record?.slots || []).reduce((layout, slot) => {
    if (!slot?.code) return layout;
    layout[slot.code] = isEmptyProduct(slot.product) ? EMPTY_PRODUCT : slot.product;
    return layout;
  }, {});
}

function buildVisitSyncPayload(record) {
  const now = Date.now();
  const idMaquina = String(record?.machineId || activeMachine()?.id || "");
  const fecha = String(record?.date || "");

  return {
    updatedAt: Number(state.updatedAt || now),
    visit: {
      idVisita: `${idMaquina}:${fecha}`,
      idMaquina,
      fecha,
      tipo: String(record?.type || "visita_real"),
      estado: String(record?.status || "closed"),
      fuelCost: Number(record?.fuelCost || 0),
      createdAt: Number(record?.createdAt || now),
      closedAt: Number(record?.closedAt || now),
      visitDetails: recordVisitDetails(record),
      visualLayout: visualLayoutForVisitSync(record)
    }
  };
}

function saveVisitToConvex(payload) {
  if (!CONVEX_URL || !payload?.visit) return Promise.resolve();
  return convexRequest("mutation", "appState:saveVisit", payload.visit);
}

function saveMonthClosureToConvex(closure) {
  if (!CONVEX_URL || !closure?.machineId || !closure?.month) return Promise.resolve();
  return convexRequest("mutation", "appState:saveMonthClosure", {
    idMaquina: closure.machineId,
    mes: closure.month,
    data: closure
  });
}

function saveYearClosureToConvex(closure) {
  const year = closure?.year || closure?.month;
  if (!CONVEX_URL || !closure?.machineId || !year) return Promise.resolve();
  return convexRequest("mutation", "appState:saveYearClosure", {
    idMaquina: closure.machineId,
    anio: year,
    data: closure
  });
}

function flushVisitSync() {
  const payload = pendingVisitSyncPayload();
  if (!CONVEX_URL || !payload?.visit) {
    renderSyncStatus();
    return Promise.resolve();
  }
  if (convexSaveInFlight) return convexSaveInFlight;

  clearTimeout(convexSaveTimer);
  clearTimeout(convexRetryTimer);
  syncMeta.lastAttemptAt = Date.now();
  saveSyncMeta();
  renderSyncStatus();

  convexSaveInFlight = saveVisitToConvex(payload)
    .then((result) => {
      localStorage.removeItem(PENDING_VISIT_SYNC_KEY);
      markSyncConfirmed(payload.updatedAt, { normalizedSynced: true });
      return result;
    })
    .catch((error) => {
      console.warn("Convex visit save failed", error);
      rememberSyncFailure(error);
      scheduleConvexRetry();
      throw error;
    })
    .finally(() => {
      convexSaveInFlight = null;
      renderSyncStatus();
    });

  return convexSaveInFlight;
}

function flushClosureSync() {
  const payload = pendingClosureSyncPayload();
  if (!CONVEX_URL || (!payload?.monthClosure && !payload?.yearClosure)) {
    renderSyncStatus();
    return Promise.resolve();
  }
  if (convexSaveInFlight) return convexSaveInFlight;

  clearTimeout(convexSaveTimer);
  clearTimeout(convexRetryTimer);
  syncMeta.lastAttemptAt = Date.now();
  saveSyncMeta();
  renderSyncStatus();

  convexSaveInFlight = Promise.resolve()
    .then(() => payload.monthClosure ? saveMonthClosureToConvex(payload.monthClosure) : null)
    .then(() => payload.yearClosure ? saveYearClosureToConvex(payload.yearClosure) : null)
    .then((result) => {
      localStorage.removeItem(PENDING_CLOSURE_SYNC_KEY);
      markSyncConfirmed(payload.updatedAt, { normalizedSynced: true });
      return result;
    })
    .catch((error) => {
      console.warn("Convex closure save failed", error);
      rememberSyncFailure(error);
      scheduleConvexRetry();
      throw error;
    })
    .finally(() => {
      convexSaveInFlight = null;
      renderSyncStatus();
    });

  return convexSaveInFlight;
}

function flushConvexSave() {
  if (!LEGACY_APPSTATE_SAVE_ENABLED) {
    renderSyncStatus();
    return Promise.resolve({ legacyAppStateSkipped: true });
  }
  if (!CONVEX_URL || !hasPendingSync()) {
    renderSyncStatus();
    return Promise.resolve();
  }
  if (convexSaveInFlight) return convexSaveInFlight;

  clearTimeout(convexSaveTimer);
  clearTimeout(convexRetryTimer);
  const snapshotUpdatedAt = Number(state.updatedAt || 0);
  syncMeta.lastAttemptAt = Date.now();
  saveSyncMeta();
  renderSyncStatus();

  convexSaveInFlight = saveStateToConvex()
    .then((result) => {
      markSyncConfirmed(snapshotUpdatedAt, result);
      if (hasPendingSync()) queueConvexSave(0);
      return result;
    })
    .catch((error) => {
      console.warn("Convex save failed", error);
      rememberSyncFailure(error);
      scheduleConvexRetry();
      throw error;
    })
    .finally(() => {
      convexSaveInFlight = null;
      renderSyncStatus();
    });

  return convexSaveInFlight;
}

function flushPendingSync() {
  if (hasPendingVisitSync()) return flushVisitSync();
  if (hasPendingClosureSync()) return flushClosureSync();
  if (LEGACY_APPSTATE_SAVE_ENABLED) return flushConvexSave();
  renderSyncStatus();
  return Promise.resolve({ legacyAppStateSkipped: true });
}

function queueVisitSave(record, delay = 400) {
  if (!CONVEX_URL) return;
  const payload = buildVisitSyncPayload(record);
  if (!payload.visit.idMaquina || !payload.visit.fecha) return;
  localStorage.setItem(PENDING_VISIT_SYNC_KEY, JSON.stringify(payload));
  markSyncPending();
  clearTimeout(convexSaveTimer);
  convexSaveTimer = setTimeout(() => {
    flushVisitSync().catch(() => {});
  }, delay);
}

function queueClosureSave(payload, delay = 400) {
  if (!CONVEX_URL || (!payload?.monthClosure && !payload?.yearClosure)) return;
  localStorage.setItem(PENDING_CLOSURE_SYNC_KEY, JSON.stringify({
    updatedAt: Number(state.updatedAt || Date.now()),
    ...payload
  }));
  markSyncPending();
  clearTimeout(convexSaveTimer);
  convexSaveTimer = setTimeout(() => {
    flushClosureSync().catch(() => {});
  }, delay);
}

function queueConvexSave(delay = 400) {
  if (!LEGACY_APPSTATE_SAVE_ENABLED) {
    renderSyncStatus();
    return;
  }
  if (!CONVEX_URL) return;
  clearTimeout(convexSaveTimer);
  convexSaveTimer = setTimeout(() => {
    flushConvexSave().catch(() => {});
  }, delay);
}

function normalizeMachineSettings(settings = {}) {
  return {
    bankCommissionPercent: Number(settings.bankCommissionPercent ?? defaultMachineSettings.bankCommissionPercent),
    fuelReminderEveryVisits: Math.max(0, Number(settings.fuelReminderEveryVisits ?? defaultMachineSettings.fuelReminderEveryVisits)),
    monthlyFloorCost: Number(settings.monthlyFloorCost ?? defaultMachineSettings.monthlyFloorCost)
  };
}

function normalizeRowSizes(value) {
  const source = Array.isArray(value) && value.length ? value : defaultRowSizes;
  return source
    .map((size) => Math.trunc(Number(size)))
    .filter((size) => size >= 1 && size <= 12)
    .slice(0, rowLetters.length);
}

function rowSizesFromConfig(configRows) {
  if (!Array.isArray(configRows)) return null;
  return configRows
    .map((row) => Math.trunc(Number(row?.spaces ?? row?.espacios)))
    .filter((size) => size >= 1 && size <= 12);
}

function buildUniformRowSizes(rowCount, spacesPerRow) {
  const rows = Math.trunc(Number(rowCount));
  const spaces = Math.trunc(Number(spacesPerRow));
  if (rows < 1 || rows > 12 || spaces < 1 || spaces > 12) return null;
  return Array.from({ length: rows }, () => spaces);
}

function machineRowSizes(machine = activeMachine()) {
  return normalizeRowSizes(machine?.rowSizes || rowSizesFromConfig(machine?.configuracionFilas));
}

function machineConfigRows(machine = activeMachine()) {
  return machineRowSizes(machine).map((spaces, index) => ({
    fila: rowLetters[index],
    espacios: spaces
  }));
}

function normalizeMachine(machine, index = 0) {
  const id = String(machine?.id || machine?.idMaquina || "").trim() || uniqueId("machine");
  const name = String(machine?.name || machine?.nombreMaquina || `Maquina ${index + 1}`).trim() || `Maquina ${index + 1}`;
  const rowSizes = machineRowSizes(machine);
  return {
    id,
    name,
    status: machine?.status || (machine?.active === false ? "inactive" : "active"),
    deletedAt: machine?.deletedAt || null,
    settings: normalizeMachineSettings(machine?.settings || machine?.configuracion || {}),
    rowSizes,
    visualLayout: normalizeVisualLayout(machine?.visualLayout || machine?.layoutVisual, rowSizes)
  };
}

function normalizeMachines(savedMachines) {
  if (!Array.isArray(savedMachines)) return [];
  const seen = new Set();
  return savedMachines
    .map(normalizeMachine)
    .filter((machine) => machine.id && !seen.has(machine.id) && seen.add(machine.id) && !machine.deletedAt);
}

function normalizeGlobalSettings(settings = {}) {
  return {
    currency: String(settings.currency || defaultGlobalSettings.currency).trim().toUpperCase() || "USD",
    language: settings.language || null,
    visualPreferences: settings.visualPreferences && typeof settings.visualPreferences === "object" ? settings.visualPreferences : {}
  };
}

function normalizeMachineProductIds(savedIds, machines, normalizedProducts) {
  const productNames = normalizedProducts.map((product) => product.name);
  const byMachine = {};
  const hasSavedMap = savedIds && typeof savedIds === "object" && !Array.isArray(savedIds);

  machines.forEach((machine) => {
    const raw = hasSavedMap && Array.isArray(savedIds[machine.id]) ? savedIds[machine.id] : null;
    byMachine[machine.id] = raw
      ? raw.map(normalizeProductName).filter((name, index, arr) => name && arr.indexOf(name) === index)
      : hasSavedMap ? [] : productNames.slice();
  });

  return byMachine;
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
    const product = normalizeProductName(entry?.product || entry?.idProducto || entry?.nombreProducto);
    if (validCodes.has(code)) normalized[code] = product && product !== EMPTY_PRODUCT ? product : EMPTY_PRODUCT;
  });

  return normalized;
}

function normalizeState(savedState) {
  const normalizedProducts = normalizeProducts(savedState.products, { useDefaults: !("products" in savedState) });
  const machines = normalizeMachines(savedState.machines);
  const activeMachineId = machines.some((machine) => machine.id === savedState.activeMachineId)
    ? savedState.activeMachineId
    : machines.find((machine) => machine.status === "active")?.id || machines[0]?.id || null;

  return {
    records: (savedState.records || []).map((record) => ({ ...record, machineId: record.machineId || activeMachineId })),
    monthClosures: (savedState.monthClosures || []).map((closure) => ({ ...closure, machineId: closure.machineId || activeMachineId })),
    yearClosures: (savedState.yearClosures || []).map((closure) => ({ ...closure, machineId: closure.machineId || activeMachineId })),
    machines,
    activeMachineId,
    globalSettings: normalizeGlobalSettings(savedState.globalSettings),
    machineProductIds: normalizeMachineProductIds(savedState.machineProductIds, machines, normalizedProducts),
    products: normalizedProducts,
    pendingProducts: Array.isArray(savedState.pendingProducts) ? normalizeProducts(savedState.pendingProducts, { useDefaults: false }) : null,
    pendingProductsEffectiveMonth: savedState.pendingProductsEffectiveMonth || null,
    seedScenario: savedState.seedScenario || null,
    updatedAt: Number(savedState.updatedAt || 0)
  };
}

function normalizeProducts(savedProducts, options = {}) {
  const source = Array.isArray(savedProducts) ? savedProducts : options.useDefaults ? defaultProducts : [];
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

function activeMachine() {
  return state.machines.find((machine) => machine.id === state.activeMachineId && machine.status !== "inactive" && !machine.deletedAt) || null;
}

function activeMachineSettings() {
  return normalizeMachineSettings(activeMachine()?.settings);
}

function activeMachineName() {
  return activeMachine()?.name || "Sin maquina";
}

function hashString(value) {
  return String(value || "").split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function machineAccent(machine = activeMachine()) {
  if (!machine) return "#5f7480";
  const index = Math.abs(hashString(machine.id || machine.name)) % machineColors.length;
  return machineColors[index];
}

function machineContextLabel(machine = activeMachine()) {
  return machine ? `Maquina: ${machine.name}` : "Sin maquina activa";
}

function activeMachineProductNames() {
  return products.map((product) => product.name);
}

function activeProducts() {
  return products;
}

function ensureProductAssignedToActiveMachine(productName) {
  if (!productName) return;
  if (!products.some((product) => product.name === productName)) return;
  const machine = activeMachine();
  if (!machine) return;
  state.machineProductIds[machine.id] = activeMachineProductNames();
}

function updateMachineChrome() {
  const machine = activeMachine();
  const accent = machineAccent(machine);
  machineSwitcher.textContent = activeMachineName();
  machineSwitcher.style.setProperty("--machine-accent", accent);
  machineContextLabels.forEach((label) => {
    label.textContent = machineContextLabel(machine);
    label.style.setProperty("--machine-accent", accent);
  });
  document.body.style.setProperty("--machine-accent", accent);
  document.body.classList.toggle("no-active-machine", !machine);
  zeroStatePanel.hidden = Boolean(activeMachine());
  renderMachineMenu();
}

function machineScoped(items, key = "date") {
  const machine = activeMachine();
  if (!machine) return [];
  return (items || []).filter((item) => item.machineId === machine.id || item.idMaquina === machine.id);
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

function refreshCurrentSlotCatalogValues() {
  currentSlots.forEach((slot) => {
    const currentCatalogItem = productCatalogItem(slot.product);
    const previousCatalogItem = productCatalogItem(previousProductForSlot(slot));
    slot.currentPrice = currentCatalogItem?.price ?? 0;
    slot.currentCost = currentCatalogItem?.cost ?? 0;
    slot.previousPrice = previousCatalogItem?.price ?? slot.previousPrice ?? 0;
    slot.previousCost = previousCatalogItem?.cost ?? slot.previousCost ?? 0;
  });
  syncVisitDetailsFromVisual();
}

function scheduleCatalogChange(nextProducts, message, options = {}) {
  const shouldRebuildMachine = options.rebuildMachine !== false;
  if (!machineScoped(state.records).length && !machineScoped(state.monthClosures).length && !machineScoped(state.yearClosures).length) {
    state.products = normalizeProducts(nextProducts);
    syncProductCatalog();
    refreshCurrentSlotCatalogValues();
    saveState();
    renderProductsEditor();
    if (shouldRebuildMachine) buildMachine();
    updateSummary();
    showToast(message);
    return;
  }
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
  currentVisitDetails.forEach((detail) => {
    if (!detail?.representative || detail.representative === "SR") return;
    const representativeSlot = findSlot(detail.representative);
    if (!representativeSlot) return;
    representativeSlot.product = detail.product;
    representativeSlot.previousProduct = detail.product;
    representativeSlot.color = productColor(detail.product);
    representativeSlot.currentPrice = Number(detail.price ?? productCatalogItem(detail.product)?.price ?? 0);
    representativeSlot.currentCost = Number(detail.cost ?? productCatalogItem(detail.product)?.cost ?? 0);
  });

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
    const representative = detail?.representative && detail.representative !== "SR"
      ? detail.representative
      : representativeMapForSlots(currentSlots).get(slot.product);
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

function cloneRecord(record) {
  return JSON.parse(JSON.stringify(record));
}

function compactRecordForStorage(record) {
  const slotsSnapshot = Array.isArray(record?.slotsSnapshot)
    ? record.slotsSnapshot
    : Array.isArray(record?.slots)
      ? record.slots
      : [];
  const hasVisitDetails = Array.isArray(record?.visitDetails) && record.visitDetails.length;
  const compact = {
    ...record
  };

  if (hasVisitDetails) {
    delete compact.slotsSnapshot;
    delete compact.catalogSnapshot;
  } else {
    compact.slotsSnapshot = slotsSnapshot;
  }
  delete compact.slots;
  delete compact.salesMovements;
  delete compact.nextStock;
  return compact;
}

function compactStateForStorage(appState) {
  return {
    ...appState,
    records: (appState.records || []).map(compactRecordForStorage),
    monthClosures: (appState.monthClosures || []).map((closure) => ({ ...closure })),
    yearClosures: (appState.yearClosures || []).map((closure) => ({ ...closure })),
    machines: (appState.machines || []).map((machine) => ({ ...machine })),
    products: (appState.products || []).map((product) => ({ ...product })),
    pendingProducts: Array.isArray(appState.pendingProducts)
      ? appState.pendingProducts.map((product) => ({ ...product }))
      : appState.pendingProducts
  };
}

function detailHasDependentData(detail) {
  return Number(detail.stockAnterior || 0) > 0
    || Number(detail.SM || 0) > 0
    || Number(detail.UV || 0) > 0;
}

function recordStockEntriesByProduct(record) {
  return new Map(recordNextStock(record).map((entry) => [entry.product, entry]));
}

function slotsWithRecalculatedDetails(record, details) {
  const detailsByProduct = new Map(details.map((detail) => [detail.product, detail]));

  return (record.slotsSnapshot || record.slots || []).map((slot) => {
    const detail = detailsByProduct.get(slot.product);
    const isRepresentative = Boolean(detail)
      && detail.representative !== "SR"
      && detail.representative === slot.code;
    const previousStock = Number(detail?.stockAnterior || 0);
    const found = isRepresentative ? Number(detail.SM || 0) : 0;
    const left = isRepresentative ? Number(detail.NS || 0) : 0;
    const captured = isRepresentative ? Boolean(detail.captured) : false;

    return {
      ...slot,
      previousProduct: slot.product,
      previousStock,
      previousPrice: Number(detail?.price ?? slot.previousPrice ?? slot.price ?? productCatalogItem(slot.product)?.price ?? 0),
      previousCost: Number(detail?.cost ?? slot.previousCost ?? slot.cost ?? productCatalogItem(slot.product)?.cost ?? 0),
      currentPrice: Number(slot.currentPrice ?? detail?.price ?? productCatalogItem(slot.product)?.price ?? 0),
      currentCost: Number(slot.currentCost ?? detail?.cost ?? productCatalogItem(slot.product)?.cost ?? 0),
      found,
      left,
      sold: isRepresentative ? Math.max(previousStock - found, 0) : 0,
      hasEntry: isRepresentative && (captured || previousStock > 0 || left > 0),
      foundCaptured: captured,
      salesEntry: captured,
      stockEntry: isRepresentative && (captured || left > 0),
      counted: isRepresentative,
      salesCounted: isRepresentative,
      stockCounted: isRepresentative
    };
  });
}

function rebuildRecordFromDetails(record, details, type = record.type) {
  const recalculatedDetails = details.map((detail) => ({ ...detail }));
  const slotsSnapshot = slotsWithRecalculatedDetails(record, recalculatedDetails);

  return {
    ...record,
    type,
    slotsSnapshot,
    visitDetails: recalculatedDetails
  };
}

function recalculateRecordFromPrevious(record, previousRecord) {
  const previousStock = recordStockEntriesByProduct(previousRecord);
  const hasPreviousStock = [...previousStock.values()].some((entry) => Number(entry.stock || 0) > 0);
  const details = recordVisitDetails(record);
  const detailsByProduct = new Map(details.map((detail) => [detail.product, detail]));

  for (const [product, stockEntry] of previousStock) {
    if (Number(stockEntry.stock || 0) > 0 && !detailsByProduct.has(product)) {
      return {
        ok: false,
        message: `${formatDate(record.date)} no tiene captura para ${product}, pero la visita anterior deja stock de ese producto.`
      };
    }
  }

  const recalculatedDetails = details.map((detail) => {
    const stockEntry = previousStock.get(detail.product);
    const nextStockAnterior = Number(stockEntry?.stock || 0);

    if (nextStockAnterior === 0 && detailHasDependentData(detail)) {
      return {
        ...detail,
        status: "error",
        note: `${detail.product} ya no tiene stock anterior desde la visita previa`
      };
    }

    const SM = Number(detail.SM || 0);
    const UV = nextStockAnterior - SM;
    return {
      ...detail,
      stockAnterior: nextStockAnterior,
      UV,
      status: UV < 0 ? "error" : detail.captured ? "ok" : "pending",
      note: UV < 0 ? "SM mayor que stock anterior" : "",
      price: Number(detail.price ?? stockEntry?.price ?? productCatalogItem(detail.product)?.price ?? 0),
      cost: Number(detail.cost ?? stockEntry?.cost ?? productCatalogItem(detail.product)?.cost ?? 0)
    };
  });

  const conflict = recalculatedDetails.find((detail) => detail.status === "error");
  if (conflict) {
    return {
      ok: false,
      message: `${formatDate(record.date)} queda incoherente en ${conflict.product}: ${conflict.note}.`
    };
  }

  const pending = recalculatedDetails.find((detail) => detail.status === "pending");
  if (pending) {
    return {
      ok: false,
      message: `${formatDate(record.date)} queda pendiente en ${pending.product}; falta una captura valida.`
    };
  }

  return {
    ok: true,
    record: rebuildRecordFromDetails(record, recalculatedDetails, hasPreviousStock ? "visita_real" : "carga_inicial")
  };
}

function recalculateFollowingOpenRecords(records, startRecord) {
  const machineId = startRecord.machineId;
  const updatedRecords = records.map(cloneRecord);
  let previousRecord = cloneRecord(startRecord);
  const followingRecords = updatedRecords
    .filter((record) => record.machineId === machineId && record.date > startRecord.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const record of followingRecords) {
    if (isMonthClosed(record.date)) {
      return {
        ok: false,
        message: `No se puede guardar porque la cadena llega a un mes cerrado: ${monthKey(record.date)}.`
      };
    }

    const result = recalculateRecordFromPrevious(record, previousRecord);
    if (!result.ok) return result;

    const index = updatedRecords.findIndex((item) => item.machineId === machineId && item.date === record.date);
    updatedRecords[index] = result.record;
    previousRecord = result.record;
  }

  return { ok: true, records: updatedRecords };
}

function latestYearClosureBefore(date) {
  const activeYear = Number(yearKey(date));
  return [...machineScoped(state.yearClosures)]
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

function saveState(options = {}) {
  const syncRemote = options.syncRemote === true && LEGACY_APPSTATE_SAVE_ENABLED;
  state.records = state.records.map(compactRecordForStorage).sort((a, b) => a.date.localeCompare(b.date));
  state.products = products;
  state.updatedAt = Date.now();
  saveLocalBackup("before-local-save");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compactStateForStorage(state)));
  saveLocalBackup("after-local-save");
  if (syncRemote) {
    markSyncPending();
    queueConvexSave();
  }
}

function resetStateData() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("kc-machines-") && key !== STORAGE_KEY) {
      localStorage.removeItem(key);
    }
  });
  const machine = activeMachine();
  state.records = machine ? state.records.filter((record) => record.machineId && record.machineId !== machine.id) : [];
  state.monthClosures = machine ? state.monthClosures.filter((closure) => closure.machineId && closure.machineId !== machine.id) : [];
  state.yearClosures = machine ? state.yearClosures.filter((closure) => closure.machineId && closure.machineId !== machine.id) : [];
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
  return machineScoped(state.records).filter((record) => monthKey(record.date) === activeMonth);
}

function monthRecordsByKey(key) {
  return machineScoped(state.records).filter((record) => monthKey(record.date) === key);
}

function productForSlot(code) {
  return baseProductLayout[code] || EMPTY_PRODUCT;
}

function productForMachineSlot(machine, code) {
  const savedProduct = normalizeProductName(machine?.visualLayout?.[code]);
  if (savedProduct) return savedProduct === EMPTY_PRODUCT ? EMPTY_PRODUCT : savedProduct;
  return productForSlot(code);
}

function isEmptyProduct(productName) {
  return productName === EMPTY_PRODUCT;
}

function productColor(productName) {
  if (isEmptyProduct(productName)) return "#5f7480";
  const index = productOrder.get(productName) ?? 0;
  return productColors[index % productColors.length];
}

function productOptionsFromCatalog(selectedProduct, catalogProducts = activeProducts()) {
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
  return `assets/products/${encodeURIComponent(productName)}.png?v=${productImageVersion}`;
}

function preloadProductImages(catalogProducts = products) {
  catalogProducts.forEach((product) => {
    if (!product?.name || preloadedProductImages.has(product.name)) return;
    preloadedProductImages.add(product.name);
    const image = new Image();
    image.decoding = "async";
    image.src = productImageUrl(product.name);
    if (typeof image.decode === "function") image.decode().catch(() => {});
  });
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
      ${imageUrl ? `<img src="${imageUrl}" alt="" loading="eager" decoding="async" data-product-image="${escapeHtml(productName)}" onerror="${imageError}">` : ""}
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
  const machine = activeMachine();

  machineRowSizes(machine).forEach((size, rowIndex) => {
    for (let itemIndex = 0; itemIndex < size; itemIndex += 1) {
      const code = `${rowLetters[rowIndex]}${String(itemIndex + 1).padStart(2, "0")}`;
      const baseProductName = productForMachineSlot(machine, code);
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
  return machineScoped(state.records).find((record) => record.date === date);
}

function getPreviousRecord(date) {
  return [...machineScoped(state.records)]
    .filter((record) => record.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function isMonthClosed(date) {
  return machineScoped(state.monthClosures, "month").some((closure) => closure.month === monthKey(date))
    || machineScoped(state.yearClosures, "year").some((closure) => closure.year === yearKey(date));
}

function isDateLocked(date) {
  return isMonthClosed(date);
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
  preloadProductImages();
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
  updateMachineChrome();
  updateStock.disabled = !activeMachine();
  saveDateChanges.disabled = !activeMachine();
  stockStatus.textContent = activeMachine()
    ? stockStatus.textContent
    : "Crea una maquina para iniciar la operacion.";
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

  machineRowSizes().forEach((size) => {
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
  machineTarget.innerHTML = "";
  let slotIndex = 0;
  const locked = isDateLocked(visitDate.value);
  const visitCatalog = catalogForRecord(getRecord(visitDate.value));

  machineRowSizes().forEach((size) => {
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

function refreshMachineSlotValues() {
  machineTarget.querySelectorAll(".slot").forEach((slotElement) => {
    const slotData = findSlot(slotElement.dataset.code);
    if (!slotData) return;
    slotElement.classList.toggle("stock-error", hasStockMismatch(slotData));
    const foundValue = slotElement.querySelector(".slot-value.found strong");
    const leftValue = slotElement.querySelector(".slot-value.left strong");
    if (foundValue) foundValue.textContent = String(slotData.found);
    if (leftValue) leftValue.textContent = String(slotData.left);
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
  syncActiveMachineVisualLayout();
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
  const rows = [...machineScoped(state.records)]
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
  const dates = new Set(machineScoped(state.records).map((record) => record.date));
  if (!existing) dates.add(date);
  return [...dates].filter((item) => item <= date).sort((a, b) => a.localeCompare(b)).indexOf(date) + 1;
}

function updateFuelReminder() {
  const visitNumber = visitNumberForDate(visitDate.value);
  const every = Number(activeMachineSettings().fuelReminderEveryVisits || 0);
  const shouldRemind = every > 0 && visitNumber > 0 && visitNumber % every === 0 && !isMonthClosed(visitDate.value);

  fuelReminder.hidden = !shouldRemind;
  if (!shouldRemind && !fuelInput.value) fuelInput.value = "";
}

function productReportOrder(extraProducts = []) {
  const seen = new Set();
  const order = activeProducts().map((product) => product.name);

  extraProducts.forEach((productName) => {
    if (productName && !seen.has(productName) && !order.includes(productName)) order.push(productName);
  });

  return order.filter((productName) => productName && !seen.has(productName) && seen.add(productName));
}

function productTotalsForRecords(records) {
  const totals = new Map();

  activeProducts().forEach((product) => {
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
  const commissionPercent = Number(overrides.bankCommissionPercent ?? activeMachineSettings().bankCommissionPercent);
  const productTotals = productTotalsForRecords(records);
  const totalRevenue = productTotals.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const totalCost = productTotals.reduce((sum, item) => sum + Number(item.expense || 0), 0);
  const profitability = productTotals.reduce((sum, item) => sum + Number(item.profit || 0), 0);
  const fuelTotal = "fuelTotal" in overrides
    ? Number(overrides.fuelTotal || 0)
    : records.reduce((sum, record) => sum + Number(record.fuelCost || 0), 0);
  const floorFee = "floorFee" in overrides
    ? Number(overrides.floorFee || 0)
    : records.length
      ? Number(activeMachineSettings().monthlyFloorCost || 0)
      : 0;
  const cardSales = Number(overrides.cardSales || 0);
  const bankFee = cardSales * (commissionPercent / 100);
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
    bankCommissionPercent: commissionPercent,
    grossProfit
  };
}

function setMenuOpen(isOpen) {
  appMenu.hidden = !isOpen;
  menuBackdrop.hidden = !isOpen;
  if (!isOpen) machineMenuList.hidden = true;
  document.body.classList.toggle("menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
}

function renderMachineMenu() {
  const activeMachines = state.machines.filter((machine) => machine.status !== "inactive");
  const inactiveMachines = state.machines.filter((machine) => machine.status === "inactive");
  const row = (machine) => `
    <button type="button" class="machine-menu-option" style="--machine-accent: ${machineAccent(machine)}" data-switch-machine="${machine.id}"${machine.id === state.activeMachineId ? " disabled" : ""}>
      <span>${escapeHtml(machine.name)}${machine.status === "inactive" ? " (inactiva)" : ""}</span>
    </button>
  `;
  machineMenuList.innerHTML = `
    ${activeMachines.length ? activeMachines.map(row).join("") : `<span>No hay maquinas activas</span>`}
    ${inactiveMachines.length ? inactiveMachines.map(row).join("") : ""}
    <button type="button" data-open-settings="create">Crear maquina</button>
  `;
  machineMenuList.querySelectorAll("[data-switch-machine]").forEach((button) => {
    button.addEventListener("click", () => switchActiveMachine(button.dataset.switchMachine));
  });
  machineMenuList.querySelector("[data-open-settings]")?.addEventListener("click", openCreateMachineForm);
}

function switchActiveMachine(machineId) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return;
  state.activeMachineId = machine.id;
  saveState();
  updateMachineChrome();
  loadDate(visitDate.value);
  setMenuOpen(false);
  showToast(`Maquina activa: ${machine.name}`);
}

function renderSettings() {
  applySettingsScope();
  currencyInput.value = state.globalSettings.currency || "USD";
  languageInput.value = state.globalSettings.language || "";
  visualPreferencesInput.value = "";
  machineCreateForm.hidden = !isCreatingMachine;
  startMachineCreateButton.hidden = isCreatingMachine;
  inheritMachineSelect.innerHTML = `
    <option value="">Iniciar desde cero</option>
    ${state.machines.map((machine) => `<option value="${machine.id}">Heredar matriz de ${escapeHtml(machine.name)}</option>`).join("")}
  `;
  if (isCreatingMachine) updateCreateMachineLayoutFields();

  const machine = activeMachine();
  machineSettingsEmpty.hidden = Boolean(machine);
  machineSettingsForm.hidden = !machine;
  if (machine) {
    machineNameInput.value = machine.name;
    bankCommissionInput.value = Number(machine.settings.bankCommissionPercent || 0);
    fuelReminderEveryInput.value = Number(machine.settings.fuelReminderEveryVisits || 0);
    monthlyFloorCostInput.value = Number(machine.settings.monthlyFloorCost || 0);
  }

  machineAdminList.innerHTML = state.machines.length ? state.machines.map((item) => {
    const sizes = machineRowSizes(item);
    const spaces = sizes.reduce((sum, size) => sum + size, 0);
    return `
      <article class="machine-admin-row">
        <div>
          <strong><span class="machine-color-dot" style="--machine-accent: ${machineAccent(item)}"></span>${escapeHtml(item.name)}</strong>
          <span>${item.status === "inactive" ? "Inactiva" : "Activa"} - ${sizes.length} filas, ${spaces} espacios</span>
        </div>
        <button type="button" data-admin-switch="${item.id}"${item.id === state.activeMachineId ? " disabled" : ""}>Usar</button>
        <button type="button" data-admin-toggle="${item.id}">${item.status === "inactive" ? "Restaurar" : "Inactivar"}</button>
        <button class="clear-data-button" type="button" data-admin-delete="${item.id}">Eliminar</button>
      </article>
    `;
  }).join("") : `<div class="products-empty">No hay maquinas.</div>`;

  machineAdminList.querySelectorAll("[data-admin-switch]").forEach((button) => {
    button.addEventListener("click", () => switchActiveMachine(button.dataset.adminSwitch));
  });
  machineAdminList.querySelectorAll("[data-admin-toggle]").forEach((button) => {
    button.addEventListener("click", () => toggleMachineStatus(button.dataset.adminToggle));
  });
  machineAdminList.querySelectorAll("[data-admin-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteMachinePermanently(button.dataset.adminDelete));
  });
  renderMachineProductsManager();
}

function setSettingsScope(scope) {
  settingsScope = scope === "global" ? "global" : "machine";
  applySettingsScope();
}

function applySettingsScope() {
  const machineSelected = settingsScope === "machine";
  settingsView.dataset.settingsScope = settingsScope;
  machineSettingsPanel.hidden = !machineSelected;
  globalSettingsPanel.hidden = machineSelected;
  machineSettingsAccess.setAttribute("aria-selected", String(machineSelected));
  globalSettingsAccess.setAttribute("aria-selected", String(!machineSelected));
}

function resetCreateMachineForm() {
  machineCreateForm.reset();
  inheritMachineSelect.value = "";
  createMachineRowSizes = defaultRowSizes.slice();
}

function openCreateMachineForm() {
  isCreatingMachine = true;
  settingsScope = "global";
  showSettingsView();
  newMachineNameInput.focus();
}

function closeCreateMachineForm() {
  isCreatingMachine = false;
  resetCreateMachineForm();
  renderSettings();
}

function machineHasHistory(machineId) {
  return state.records.some((record) => record.machineId === machineId)
    || state.monthClosures.some((closure) => closure.machineId === machineId)
    || state.yearClosures.some((closure) => closure.machineId === machineId);
}

function renderMachineProductsManager() {
  const machine = activeMachine();
  if (!machine) {
    machineProductAssignSelect.innerHTML = `<option value="">Sin maquina activa</option>`;
    machineProductAssignSelect.disabled = true;
    assignMachineProductButton.disabled = true;
    machineProductsList.innerHTML = `<div class="products-empty">No hay maquina activa.</div>`;
    return;
  }

  machineProductAssignSelect.disabled = true;
  assignMachineProductButton.disabled = true;
  machineProductAssignSelect.innerHTML = `<option value="">Catalogo global compartido</option>`;
  machineProductsList.innerHTML = `<div class="products-empty">Los productos son globales. El uso por maquina se define en la matriz visual.</div>`;
}

function updateCreateMachineLayoutFields() {
  const sourceMachine = state.machines.find((machine) => machine.id === inheritMachineSelect.value);
  const wasInherited = machineLayoutFields.classList.contains("is-inherited");
  if (sourceMachine) {
    createMachineRowSizes = machineRowSizes(sourceMachine);
  } else if (wasInherited) {
    createMachineRowSizes = defaultRowSizes.slice();
  } else if (!Array.isArray(createMachineRowSizes) || !createMachineRowSizes.length) {
    createMachineRowSizes = defaultRowSizes.slice();
  }

  newMachineRowsInput.value = createMachineRowSizes.length;
  newMachineSpacesInput.value = createMachineRowSizes[0] || "";
  machineLayoutFields.classList.toggle("is-inherited", Boolean(sourceMachine));
  addMatrixRowButton.disabled = Boolean(sourceMachine) || createMachineRowSizes.length >= 12;
  renderCreateMachineMatrixDesigner(sourceMachine);
}

function renderCreateMachineMatrixDesigner(sourceMachine = null) {
  const inheritedLayout = sourceMachine ? latestVisualLayoutForMachine(sourceMachine.id) : {};
  const inherited = Boolean(sourceMachine);
  const totalSpaces = createMachineRowSizes.reduce((sum, size) => sum + size, 0);

  machineMatrixPreview.innerHTML = createMachineRowSizes.length
    ? createMachineRowSizes.map((size, rowIndex) => {
      const rowCode = rowLetters[rowIndex];
      const cells = Array.from({ length: size }, (_, index) => {
        const code = `${rowCode}${String(index + 1).padStart(2, "0")}`;
        const product = inheritedLayout[code] || EMPTY_PRODUCT;
        return `<span class="matrix-cell${!isEmptyProduct(product) ? " filled" : ""}" title="${code}${!isEmptyProduct(product) ? ` - ${escapeHtml(product)}` : ""}"></span>`;
      }).join("");
      return `
        <div class="matrix-designer-row">
          <span class="matrix-row-label">Fila ${rowCode}</span>
          <div class="matrix-cells" style="--matrix-columns: ${size}">${cells}</div>
          <div class="matrix-row-actions">
            <button type="button" data-matrix-add-space="${rowIndex}" aria-label="Agregar espacio a fila ${rowCode}"${inherited || size >= 12 ? " disabled" : ""}>+</button>
            <button type="button" data-matrix-remove-space="${rowIndex}" aria-label="Quitar espacio de fila ${rowCode}"${inherited || size <= 1 ? " disabled" : ""}>-</button>
            <button type="button" data-matrix-remove-row="${rowIndex}" aria-label="Eliminar fila ${rowCode}"${inherited || createMachineRowSizes.length <= 1 ? " disabled" : ""}>x</button>
          </div>
        </div>
      `;
    }).join("")
    : `<div class="products-empty">Agrega al menos una fila.</div>`;

  matrixDesignerStatus.textContent = inherited
    ? `Se heredaran ${createMachineRowSizes.length} filas, ${totalSpaces} espacios y posiciones visuales.`
    : `${createMachineRowSizes.length} filas, ${totalSpaces} espacios. Maximo 12 filas y 12 espacios por fila.`;

  machineMatrixPreview.querySelectorAll("[data-matrix-add-space]").forEach((button) => {
    button.addEventListener("click", () => addSpaceToCreateMachineRow(Number(button.dataset.matrixAddSpace)));
  });
  machineMatrixPreview.querySelectorAll("[data-matrix-remove-space]").forEach((button) => {
    button.addEventListener("click", () => removeSpaceFromCreateMachineRow(Number(button.dataset.matrixRemoveSpace)));
  });
  machineMatrixPreview.querySelectorAll("[data-matrix-remove-row]").forEach((button) => {
    button.addEventListener("click", () => removeCreateMachineRow(Number(button.dataset.matrixRemoveRow)));
  });
}

function addCreateMachineRow() {
  if (inheritMachineSelect.value || createMachineRowSizes.length >= 12) return;
  createMachineRowSizes.push(1);
  updateCreateMachineLayoutFields();
}

function addSpaceToCreateMachineRow(rowIndex) {
  if (inheritMachineSelect.value || createMachineRowSizes[rowIndex] >= 12) return;
  createMachineRowSizes[rowIndex] += 1;
  updateCreateMachineLayoutFields();
}

function removeSpaceFromCreateMachineRow(rowIndex) {
  if (inheritMachineSelect.value || createMachineRowSizes[rowIndex] <= 1) return;
  createMachineRowSizes[rowIndex] -= 1;
  updateCreateMachineLayoutFields();
}

function removeCreateMachineRow(rowIndex) {
  if (inheritMachineSelect.value || createMachineRowSizes.length <= 1) return;
  createMachineRowSizes.splice(rowIndex, 1);
  updateCreateMachineLayoutFields();
}

function selectedCreateMachineRowSizes() {
  const sourceMachine = state.machines.find((machine) => machine.id === inheritMachineSelect.value);
  return sourceMachine ? machineRowSizes(sourceMachine) : normalizeRowSizes(createMachineRowSizes);
}

function assignProductToActiveMachine() {
  const productName = machineProductAssignSelect.value;
  const machine = activeMachine();
  if (!machine || !productName) return;
  ensureProductAssignedToActiveMachine(productName);
  saveState();
  renderSettings();
  loadDate(visitDate.value);
  showToast("Producto asignado a esta maquina");
}

function removeProductFromActiveMachine(productName) {
  const machine = activeMachine();
  if (!machine || !productName) return;
  if (machineHasHistory(machine.id)) {
    showToast("No se quita con historial; deja el producto sin usar en la matriz");
    return;
  }
  state.machineProductIds[machine.id] = activeMachineProductNames().filter((name) => name !== productName);
  currentSlots.forEach((slot) => {
    if (slot.product === productName) resetSlotToEmpty(slot);
    if (slot.previousProduct === productName) slot.previousProduct = EMPTY_PRODUCT;
  });
  saveState();
  renderSettings();
  loadDate(visitDate.value);
  showToast("Producto quitado de esta maquina");
}

function createMachine(name, options = {}) {
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    showToast("Escribe el nombre de la maquina");
    return null;
  }
  const sourceMachineId = options.sourceMachineId || "";
  const sourceMachine = state.machines.find((machine) => machine.id === sourceMachineId);
  const rowSizes = sourceMachine ? machineRowSizes(sourceMachine) : normalizeRowSizes(options.rowSizes);
  const visualLayout = sourceMachine
    ? normalizeVisualLayout(latestVisualLayoutForMachine(sourceMachine.id), rowSizes)
    : {};

  const machine = normalizeMachine({
    id: uniqueId("machine"),
    name: cleanName,
    status: "active",
    settings: { ...defaultMachineSettings },
    rowSizes,
    visualLayout
  }, state.machines.length);
  state.machines.push(machine);
  state.machineProductIds[machine.id] = products.map((product) => product.name);
  state.activeMachineId = machine.id;
  saveState();
  updateMachineChrome();
  loadDate(visitDate.value);
  renderSettings();
  return machine;
}

function handleCreateMachine(event) {
  event.preventDefault();
  const sourceMachineId = inheritMachineSelect.value;
  const rowSizes = selectedCreateMachineRowSizes();
  if (!rowSizes.length || rowSizes.some((size) => size < 1 || size > 12) || rowSizes.length > 12) {
    showToast("Define una matriz entre 1 y 12 filas, con 1 a 12 espacios por fila");
    return;
  }
  const machine = createMachine(newMachineNameInput.value, { sourceMachineId, rowSizes });
  if (!machine) return;
  isCreatingMachine = false;
  resetCreateMachineForm();
  showToast("Maquina creada");
}

function saveSettings() {
  state.globalSettings = normalizeGlobalSettings({
    currency: currencyInput.value,
    language: languageInput.value || null,
    visualPreferences: state.globalSettings.visualPreferences
  });
  const machine = activeMachine();
  if (machine) {
    machine.name = String(machineNameInput.value || machine.name).trim() || machine.name;
    machine.settings = normalizeMachineSettings({
      bankCommissionPercent: bankCommissionInput.value,
      fuelReminderEveryVisits: fuelReminderEveryInput.value,
      monthlyFloorCost: monthlyFloorCostInput.value
    });
  }
  saveState();
  updateMachineChrome();
  updateFuelReminder();
  renderSettings();
  showToast("Configuracion guardada");
}

function toggleMachineStatus(machineId) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return;
  machine.status = machine.status === "inactive" ? "active" : "inactive";
  if (machine.id === state.activeMachineId && machine.status === "inactive") {
    state.activeMachineId = state.machines.find((item) => item.status === "active")?.id || null;
  }
  if (!state.activeMachineId && machine.status === "active") state.activeMachineId = machine.id;
  saveState();
  updateMachineChrome();
  renderSettings();
  loadDate(visitDate.value);
}

function resetActiveMachineData() {
  const machine = activeMachine();
  if (!machine) return;
  const typed = window.prompt(`Escribe ${machine.name} para limpiar el historial operativo de esta maquina.`);
  if (typed !== machine.name) {
    showToast("Reset cancelado");
    return;
  }
  state.records = state.records.filter((record) => record.machineId !== machine.id);
  state.monthClosures = state.monthClosures.filter((closure) => closure.machineId !== machine.id);
  state.yearClosures = state.yearClosures.filter((closure) => closure.machineId !== machine.id);
  saveState();
  visitDate.value = todayValue();
  loadDate(visitDate.value);
  showMainView();
  showToast("Maquina reiniciada");
}

function deleteMachinePermanently(machineId) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return;
  const typed = window.prompt(`Escribe ${machine.name} para eliminar definitivamente esta maquina.`);
  if (typed !== machine.name) {
    showToast("Eliminacion cancelada");
    return;
  }
  state.machines = state.machines.filter((item) => item.id !== machine.id);
  delete state.machineProductIds[machine.id];
  state.records = state.records.filter((record) => record.machineId !== machine.id);
  state.monthClosures = state.monthClosures.filter((closure) => closure.machineId !== machine.id);
  state.yearClosures = state.yearClosures.filter((closure) => closure.machineId !== machine.id);
  if (state.activeMachineId === machine.id) {
    state.activeMachineId = state.machines.find((item) => item.status === "active")?.id || state.machines[0]?.id || null;
  }
  saveState();
  updateMachineChrome();
  renderSettings();
  loadDate(visitDate.value);
  showToast("Maquina eliminada");
}

function exportActiveMachine() {
  const machine = activeMachine();
  if (!machine) return;
  const payload = {
    globalSettings: { currency: state.globalSettings.currency },
    machine,
    products,
    machineProductIds: activeMachineProductNames(),
    records: machineScoped(state.records),
    monthClosures: machineScoped(state.monthClosures),
    yearClosures: machineScoped(state.yearClosures)
  };
  navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))
    .then(() => showToast("Backup de maquina copiado"))
    .catch(() => showToast("No se pudo copiar el backup"));
}

function importActiveMachine() {
  const machine = activeMachine();
  if (!machine) return;
  const raw = window.prompt(`Pega el backup JSON para restaurar ${machine.name}.`);
  if (!raw) return;
  try {
    const payload = JSON.parse(raw);
    const backupMachine = payload.machine || {};
    const layoutMachine = backupMachine.rowSizes || backupMachine.configuracionFilas ? backupMachine : machine;
    machine.settings = normalizeMachineSettings(backupMachine.settings || machine.settings);
    machine.rowSizes = machineRowSizes(layoutMachine);
    machine.visualLayout = normalizeVisualLayout(backupMachine.visualLayout || backupMachine.layoutVisual || machine.visualLayout, machine.rowSizes);
    machine.name = String(backupMachine.name || machine.name).trim() || machine.name;
    if (payload.globalSettings?.currency) {
      state.globalSettings.currency = String(payload.globalSettings.currency).trim().toUpperCase();
    }
    if (Array.isArray(payload.products)) {
      const merged = new Map(products.map((product) => [product.name, product]));
      normalizeProducts(payload.products).forEach((product) => merged.set(product.name, product));
      state.products = [...merged.values()];
      syncProductCatalog();
    }
    state.machineProductIds[machine.id] = products.map((product) => product.name);
    state.records = [
      ...state.records.filter((record) => record.machineId !== machine.id),
      ...(payload.records || []).map((record) => ({ ...record, machineId: machine.id }))
    ];
    state.monthClosures = [
      ...state.monthClosures.filter((closure) => closure.machineId !== machine.id),
      ...(payload.monthClosures || []).map((closure) => ({ ...closure, machineId: machine.id }))
    ];
    state.yearClosures = [
      ...state.yearClosures.filter((closure) => closure.machineId !== machine.id),
      ...(payload.yearClosures || []).map((closure) => ({ ...closure, machineId: machine.id }))
    ];
    saveState();
    renderSettings();
    loadDate(visitDate.value);
    showToast("Backup restaurado");
  } catch (error) {
    console.warn("Machine import failed", error);
    showToast("Backup invalido");
  }
}

function showMainView() {
  mainView.hidden = false;
  mainView.classList.add("active");
  accountingView.hidden = true;
  productsView.hidden = true;
  settingsView.hidden = true;
  updateMachineChrome();
  setMenuOpen(false);
}

function showAccountingView() {
  mainView.hidden = true;
  mainView.classList.remove("active");
  accountingView.hidden = false;
  productsView.hidden = true;
  settingsView.hidden = true;
  renderAccounting();
  setMenuOpen(false);
}

function showProductsView() {
  mainView.hidden = true;
  mainView.classList.remove("active");
  accountingView.hidden = true;
  productsView.hidden = false;
  settingsView.hidden = true;
  renderProductsEditor();
  setMenuOpen(false);
}

function showSettingsView() {
  mainView.hidden = true;
  mainView.classList.remove("active");
  accountingView.hidden = true;
  productsView.hidden = true;
  settingsView.hidden = false;
  renderSettings();
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
  const pendingNotice = state.pendingProducts
    ? `<div class="products-empty">Cambios de catalogo programados para ${effectiveMonth}.</div>`
    : "";
  productsTable.innerHTML = draftProducts.length
    ? `${pendingNotice}${draftProducts.map(productEditorRow).join("")}`
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
  Object.keys(state.machineProductIds || {}).forEach((machineId) => {
    state.machineProductIds[machineId] = (state.machineProductIds[machineId] || []).map((name) => name === oldName ? nextName : name);
  });
  state.machines.forEach((machine) => {
    Object.keys(machine.visualLayout || {}).forEach((code) => {
      if (machine.visualLayout[code] === oldName) machine.visualLayout[code] = nextName;
    });
  });
  scheduleCatalogChange(draftProducts, "Producto actualizado", { rebuildMachine: oldName !== nextName });
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
  Object.keys(state.machineProductIds || {}).forEach((machineId) => {
    state.machineProductIds[machineId] = (state.machineProductIds[machineId] || []).filter((name) => name !== product.name);
  });
  state.machines.forEach((machine) => {
    Object.keys(machine.visualLayout || {}).forEach((code) => {
      if (machine.visualLayout[code] === product.name) machine.visualLayout[code] = EMPTY_PRODUCT;
    });
  });
  scheduleCatalogChange(draftProducts, "Producto eliminado");
}

function addProduct(event) {
  event.preventDefault();
  const currentProducts = catalogSnapshot(products);
  const pendingProducts = state.pendingProducts ? normalizeProducts(state.pendingProducts) : null;
  const name = normalizeProductName(productNameInput.value);
  if (!name) {
    showToast("Escribe el nombre del producto");
    return;
  }
  if (productCatalogItemFrom(currentProducts, name) || productCatalogItemFrom(pendingProducts, name)) {
    showToast("Ese producto ya existe");
    return;
  }

  const newProduct = {
    name,
    cost: Number(productCostInput.value || 0),
    price: Number(productPriceInput.value || 0)
  };
  state.products = normalizeProducts([...currentProducts, newProduct]);
  if (pendingProducts) state.pendingProducts = normalizeProducts([...pendingProducts, newProduct]);
  syncProductCatalog();
  refreshCurrentSlotCatalogValues();
  productForm.reset();
  saveState();
  renderProductsEditor();
  buildMachine();
  updateSummary();
  showToast("Producto agregado al catalogo");
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
    bankCommissionPercent: Number(closure.bankCommissionPercent ?? activeMachineSettings().bankCommissionPercent),
    grossProfit: Number(closure.grossProfit || 0),
    productTotals: closure.productTotals || [],
    productOrderSnapshot: closure.productOrderSnapshot || productReportOrder((closure.productTotals || []).map((item) => item.product)),
    monthSummaries: closure.monthSummaries || []
  };
}

function yearSummaryFromMonths(months) {
  const productTotals = activeProducts().map((product) => ({
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
    const yearClosure = machineScoped(state.yearClosures).find((item) => item.year === year);
    const compactMonth = yearClosure?.monthSummaries?.find((item) => item.month === month);
    const closure = machineScoped(state.monthClosures).find((item) => item.month === month);
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
  const activeMonthClosure = machineScoped(state.monthClosures).find((item) => item.month === activeMonth);
  const summary = activeMonthClosure ? summaryFromClosure(activeMonthClosure) : accountingSummaryForRecords(records);
  const currentMonth = {
    type: activeMonthClosure ? "closed" : "current",
    month: activeMonth,
    summary,
    records,
    lastDate: activeMonthClosure?.sourceDate || [...records].sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null,
    sourceDate: activeMonthClosure?.sourceDate,
    closedAt: activeMonthClosure?.closedAt,
    closure: activeMonthClosure,
    closed: Boolean(activeMonthClosure) || isMonthClosed(activeMonth)
  };
  const closedMonths = [...machineScoped(state.monthClosures)]
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((closure) => ({
      type: "closed",
      month: closure.month,
      summary: summaryFromClosure(closure),
      sourceDate: closure.sourceDate,
      closedAt: closure.closedAt,
      closure
  }));
  const finishedYears = [...machineScoped(state.yearClosures)]
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
  floorFeeInput.value = Number(activeMachineSettings().monthlyFloorCost || 0).toFixed(2);
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
    <div><span>Comision tarjeta ${percent(summary.bankCommissionPercent)}</span><strong>${money(summary.bankFee)}</strong></div>
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
    machineId: activeMachine()?.id || null,
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
    bankCommissionPercent: summary.bankCommissionPercent,
    floorFee: summary.floorFee,
    fuelTotal: summary.fuelTotal,
    grossProfit: summary.grossProfit,
    openingStockNextMonth: recordNextStock(closingRecord)
  };
  let savedYearClosure = null;
  const existingIndex = state.monthClosures.findIndex((item) => item.month === selectedMonth && (!item.machineId || item.machineId === activeMachine()?.id));

  if (existingIndex >= 0) {
    state.monthClosures[existingIndex] = closure;
  } else {
    state.monthClosures.push(closure);
  }

  if (selectedMonth.endsWith("-12")) {
    const closedYear = yearKey(selectedMonth);
    const monthsInYear = machineScoped(state.monthClosures)
      .filter((item) => yearKey(item.month) === closedYear)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({ ...item, summary: summaryFromClosure(item) }));
    const yearSummary = yearSummaryFromMonths(monthsInYear);
    const yearClosure = {
      machineId: activeMachine()?.id || null,
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
      bankCommissionPercent: summary.bankCommissionPercent,
      floorFee: yearSummary.floorFee,
      fuelTotal: yearSummary.fuelTotal,
      grossProfit: yearSummary.grossProfit,
      monthSummaries: monthsInYear.map(compactMonthSummary),
      openingStockNextYear: closure.openingStockNextMonth
    };
    const existingYearIndex = state.yearClosures.findIndex((item) => item.year === closedYear && (!item.machineId || item.machineId === activeMachine()?.id));

    if (existingYearIndex >= 0) {
      state.yearClosures[existingYearIndex] = yearClosure;
    } else {
      state.yearClosures.push(yearClosure);
    }
    savedYearClosure = yearClosure;

    state.monthClosures = state.monthClosures.filter((item) => item.machineId !== activeMachine()?.id || yearKey(item.month) !== closedYear);
    state.records = state.records.filter((item) => item.machineId !== activeMachine()?.id || yearKey(item.date) !== closedYear);
  }

  saveState();
  queueClosureSave({
    monthClosure: savedYearClosure ? null : closure,
    yearClosure: savedYearClosure
  });
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
  const report = machineScoped(state.monthClosures).find((item) => item.month === month);
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
  refreshMachineSlotValues();
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

function visualLayoutFromSlots(slots = []) {
  return (slots || []).reduce((layout, slot) => {
    if (!slot?.code) return layout;
    layout[slot.code] = isEmptyProduct(slot.product) ? EMPTY_PRODUCT : slot.product;
    return layout;
  }, {});
}

function latestVisualLayoutForMachine(machineId) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (machineId === state.activeMachineId && currentSlots.length) return visualLayoutFromSlots(currentSlots);
  const latest = [...state.records]
    .filter((record) => record.machineId === machineId)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
  const slots = latest?.slotsSnapshot || latest?.slots;
  if (Array.isArray(slots) && slots.length) return visualLayoutFromSlots(slots);
  return normalizeVisualLayout(machine?.visualLayout, machineRowSizes(machine));
}

function syncActiveMachineVisualLayout() {
  const machine = activeMachine();
  if (!machine) return;
  machine.visualLayout = normalizeVisualLayout(visualLayoutFromSlots(currentSlots), machineRowSizes(machine));
}

function currentRecord() {
  const details = currentVisitDetailsList();
  const slotsSnapshot = buildSlotsSnapshot(currentSlots);
  const existing = getRecord(visitDate.value);
  const isInitialLoad = !getPreviousRecord(visitDate.value)
    && ![...previousProductStockMap(visitDate.value).values()].some((entry) => Number(entry?.stock || 0) > 0);

  return {
    machineId: activeMachine()?.id || null,
    date: visitDate.value,
    type: isInitialLoad ? "carga_inicial" : "visita_real",
    status: "closed",
    fuelCost: Number(fuelInput.value || 0),
    catalogSnapshot: catalogForRecord(existing),
    slotsSnapshot,
    visitDetails: details
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
  if (!activeMachine()) {
    stockStatus.textContent = "Primero crea una maquina.";
    showToast("Crea una maquina para guardar datos");
    showSettingsView();
    return;
  }
  if (isMonthClosed(visitDate.value)) {
    stockStatus.textContent = "Este mes ya fue cerrado. No se pueden guardar cambios.";
    return;
  }
  if (!validateRequiredCaptures()) return;

  const record = currentRecord();
  const recordsDraft = state.records.map(cloneRecord);
  const index = recordsDraft.findIndex((item) => item.date === record.date && item.machineId === record.machineId);
  const isUpdate = index >= 0;

  if (isUpdate) {
    recordsDraft[index] = record;
  } else {
    recordsDraft.push(record);
  }

  const chainResult = recalculateFollowingOpenRecords(recordsDraft, record);
  if (!chainResult.ok) {
    stockStatus.textContent = chainResult.message;
    showToast("No se guardo: conflicto con visita posterior");
    return;
  }

  syncActiveMachineVisualLayout();
  state.records = chainResult.records;
  saveState({ syncRemote: false });
  queueVisitSave(record);
  loadDate(record.date);
  if (isUpdate) showToast("Datos actualizados localmente; sincronizando");
  else showToast("Datos guardados localmente; sincronizando");
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

window.KC_RECOVERY = {
  build: APP_BUILD_VERSION,
  listBackups() {
    try {
      return (JSON.parse(localStorage.getItem(LOCAL_BACKUPS_KEY)) || []).map((backup, index) => ({
        index,
        reason: backup.reason,
        savedAt: new Date(Number(backup.savedAt || 0)).toISOString(),
        updatedAt: backup.updatedAt,
        records: backup.records,
        activeMachineId: backup.activeMachineId
      }));
    } catch {
      return [];
    }
  },
  restoreBackup(index = 0) {
    const backups = JSON.parse(localStorage.getItem(LOCAL_BACKUPS_KEY)) || [];
    const backup = backups[index];
    if (!backup?.data) throw new Error("Backup no encontrado");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.data));
    localStorage.setItem(SYNC_META_KEY, JSON.stringify({
      pendingUpdatedAt: Number(backup.data.updatedAt || Date.now()),
      syncedUpdatedAt: 0,
      retryCount: 0,
      lastError: null,
      lastAttemptAt: 0,
      lastSyncedAt: 0,
      lastNormalizedError: null
    }));
    window.location.reload();
  }
};

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
  machineMenuList.hidden = !machineMenuList.hidden;
  renderMachineMenu();
});
backToMain.addEventListener("click", showMainView);
backToMainFromProducts.addEventListener("click", showMainView);
backToMainFromSettings.addEventListener("click", showMainView);
productForm.addEventListener("submit", addProduct);
settingsViewButton.addEventListener("click", showSettingsView);
zeroCreateMachine.addEventListener("click", openCreateMachineForm);
startMachineCreateButton.addEventListener("click", openCreateMachineForm);
cancelMachineCreateButton.addEventListener("click", closeCreateMachineForm);
machineCreateForm.addEventListener("submit", handleCreateMachine);
inheritMachineSelect.addEventListener("change", updateCreateMachineLayoutFields);
addMatrixRowButton.addEventListener("click", addCreateMachineRow);
machineSettingsAccess.addEventListener("click", () => setSettingsScope("machine"));
globalSettingsAccess.addEventListener("click", () => setSettingsScope("global"));
assignMachineProductButton.addEventListener("click", assignProductToActiveMachine);
saveSettingsButton.addEventListener("click", saveSettings);
resetMachineButton.addEventListener("click", resetActiveMachineData);
exportMachineButton.addEventListener("click", exportActiveMachine);
importMachineButton.addEventListener("click", importActiveMachine);
window.addEventListener("online", () => {
  if (hasPendingSync()) flushPendingSync().catch(() => {});
});
window.addEventListener("focus", () => {
  if (hasPendingSync()) flushPendingSync().catch(() => {});
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && hasPendingSync()) flushPendingSync().catch(() => {});
});
window.addEventListener("beforeunload", (event) => {
  if (!hasPendingSync() && !convexSaveInFlight) return;
  event.preventDefault();
  event.returnValue = "Hay cambios guardados localmente que todavia no se sincronizan con Convex.";
});
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
console.info(`KC Machines build ${APP_BUILD_VERSION}`);
requestPersistentStorage();
renderSyncStatus();
if (hasPendingSync()) {
  if (hasPendingVisitSync()) flushVisitSync().catch(() => {});
  else if (hasPendingClosureSync()) flushClosureSync().catch(() => {});
  else queueConvexSave(0);
}
loadDate(visitDate.value);
loadStateFromConvex();
