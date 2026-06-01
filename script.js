const CONFIG = {
  mode: "quarterly",
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxFiscBDMxA6GwgQnePzKXtvEJ4BLd6kyc895WhM81IhrOqexmq39p3_xMAJrVTaKfy/exec",
  storageKey: "banco-gametos-trimestral-2026-v1",
  sessionKey: "banco-gametos-trimestral-session-v1",
  pageSize: 10,
  defaultYear: 2026,
  minYear: 2026,
  institutions: [
    "ASOCIADOS EN FERTILIDAD Y REPRODUCCION HUMANA",
    "UNIDAD DE FERTILIDAD DE LA CLINICA DEL COUNTRY CONCEPTUM",
    "CENTRO DE FERTILIDAD - REPROTEC",
    "PROCREACION MEDICAMENTE ASISTIDA LTDA.",
    "MEDIFERTIL S.A.S. / CLINICA EUGIN",
    "INSER - INSTITUTO DE REPRODUCCION HUMANA",
    "UNIDAD DE FERTILIDAD FERTIVIDA",
    "NOVAFEM S.A.S",
    "CEMAE S.A.S",
    "UNIDAD DE BIOMEDICINA REPRODUCTIVA DE PROFAMILIA",
    "INVIGEN- VITA",
    "CLINICA DE LA MUJER CENTRO DE FERTILIDAD",
    "CENTRO COLOMBIANO DE ENDOCRINOLOGIA Y FERTILIDAD S.A.S - CORNEL S.A.S",
    "CORPORACION REPRONAT S.A.S.",
    "US FERTILITY COLOMBIA",
    "ORIGGEN HEALTHCARE SAS",
    "FUNDACION SANTA FE DE BOGOTA"
  ]
};

const repeaterDefinitions = {
  newDonors: [
    { name: "donorCode", label: "Codigo del donante", type: "text" },
    { name: "freezeDate", label: "Fecha de congelacion", type: "date" }
  ],
  donorSuccesses: [
    { name: "donorCode", label: "Codigo del donante", type: "text" },
    { name: "successes", label: "Exitos", type: "number", min: "0" }
  ],
  rejectedDonors: [
    { name: "donorCode", label: "Codigo del donante", type: "text" },
    {
      name: "cause",
      label: "Causa de rechazo o descarte",
      type: "select",
      options: [
        "MEDICA Y CALIDAD DE GAMETOS",
        "GENETICA",
        "INFECCIOSAS",
        "PSICOLOGICO",
        "LEGAL - ADMINISTRATIVA"
      ]
    }
  ]
};

const entryModalConfig = {
  newDonors: {
    title: "Agregar nuevo donante",
    addButtonText: "Agregar otro donante",
    emptyText: "No hay donantes agregados.",
    savedText: "Donante agregado. Puedes registrar otro o salir."
  },
  donorSuccesses: {
    title: "Agregar caso de exito",
    addButtonText: "Agregar otro exito",
    emptyText: "No hay casos de exito agregados.",
    savedText: "Caso de exito agregado. Puedes registrar otro o salir."
  },
  rejectedDonors: {
    title: "Agregar rechazo o descarte",
    addButtonText: "Agregar otro rechazo",
    emptyText: "No hay rechazos agregados.",
    savedText: "Rechazo agregado. Puedes registrar otro o salir."
  }
};

const els = {
  form: document.getElementById("reportForm"),
  loginShell: document.getElementById("loginShell"),
  appShell: document.getElementById("appShell"),
  loginForm: document.getElementById("loginForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginMessage: document.getElementById("loginMessage"),
  userBadge: document.getElementById("userBadge"),
  btnLogout: document.getElementById("btnLogout"),
  quarterTabs: document.getElementById("quarterTabs"),
  institutionList: document.getElementById("institutionList"),
  statusMessage: document.getElementById("statusMessage"),
  backendBadge: document.getElementById("backendBadge"),
  recordsTitle: document.getElementById("recordsTitle"),
  recordsBody: document.getElementById("recordsBody"),
  btnClear: document.getElementById("btnClear"),
  btnExport: document.getElementById("btnExport"),
  entryModal: document.getElementById("entryModal"),
  entryModalTitle: document.getElementById("entryModalTitle"),
  entryModalFields: document.getElementById("entryModalFields"),
  btnModalAddAnother: document.getElementById("btnModalAddAnother"),
  btnModalExit: document.getElementById("btnModalExit"),
  saveModal: document.getElementById("saveModal"),
  saveSpinner: document.getElementById("saveSpinner"),
  saveModalTitle: document.getElementById("saveModalTitle"),
  saveModalMessage: document.getElementById("saveModalMessage"),
  saveModalActions: document.getElementById("saveModalActions"),
  btnSaveModalClose: document.getElementById("btnSaveModalClose"),
  confirmModal: document.getElementById("confirmModal"),
  confirmModalMessage: document.getElementById("confirmModalMessage"),
  btnConfirmCancel: document.getElementById("btnConfirmCancel"),
  btnConfirmAccept: document.getElementById("btnConfirmAccept")
};

const state = {
  activeEntryKey: "",
  activeQuarter: "I",
  currentUser: null,
  remoteRecords: [],
  registeredUi: {
    newDonors: { search: "", page: 1 },
    donorSuccesses: { search: "", page: 1 },
    rejectedDonors: { search: "", page: 1 }
  },
  draftUi: {
    newDonors: { search: "", page: 1 },
    donorSuccesses: { search: "", page: 1 },
    rejectedDonors: { search: "", page: 1 }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  els.form.setAttribute("novalidate", "novalidate");
  populateInstitutions();
  populateQuarterTabs();
  syncQuarter();
  initializeRepeaters();
  bindEvents();
  setupResponsibleNameRule();
  setupPhoneRule();
  setupStrictNumericRule();
  setupRequiredFieldMessages();
  refreshBackendBadge();
  restoreSession();
});

function bindEvents() {
  els.form.addEventListener("submit", saveReport);
  els.loginForm.addEventListener("submit", handleLogin);
  els.btnLogout.addEventListener("click", logout);
  if (els.btnClear) {
    els.btnClear.addEventListener("click", clearForm);
  }
  if (els.btnExport) {
    els.btnExport.addEventListener("click", exportCsv);
  }
  if (els.recordsBody) {
    els.recordsBody.addEventListener("click", event => {
      const button = event.target.closest("[data-delete-id]");
      if (button) {
        deleteRecord(button.dataset.deleteId);
      }
    });
  }
  document.querySelectorAll(".repeater").forEach(container => {
    container.addEventListener("input", handleRegisteredSearch);
    container.addEventListener("click", handleRegisteredAction);
  });
  els.btnModalAddAnother.addEventListener("click", addEntryFromModal);
  els.btnModalExit.addEventListener("click", closeEntryModal);
  if (els.btnSaveModalClose) {
    els.btnSaveModalClose.addEventListener("click", closeSaveModal);
  }
  document.getElementById("year").addEventListener("change", () => {
    syncDatePickerLimits(document);
    populateQuarterTabs();
    syncQuarter();
    if (state.currentUser) {
      loadRecords();
    }
  });
  document.querySelectorAll("[data-add-row]").forEach(button => {
    button.addEventListener("click", () => openEntryModal(button.dataset.addRow));
  });
  bindDatePickerAutoOpen(els.entryModal);
}

function populateQuarterTabs() {
  const quarters = ["I", "II", "III", "IV"];
  const enabledQuarters = getEnabledQuartersForYear();

  if (!enabledQuarters.includes(state.activeQuarter)) {
    state.activeQuarter = enabledQuarters[0] || "";
  }

  els.quarterTabs.innerHTML = quarters.map(quarter => `
    <button
      type="button"
      class="quarter-tab ${quarter === state.activeQuarter ? "is-active" : ""}"
      data-quarter="${quarter}"
      aria-pressed="${quarter === state.activeQuarter ? "true" : "false"}"
      ${enabledQuarters.includes(quarter) ? "" : "disabled"}
    >${quarter} trimestre</button>
  `).join("");

  els.quarterTabs.querySelectorAll("[data-quarter]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }
      state.activeQuarter = button.dataset.quarter;
      syncQuarter();
      if (state.currentUser) {
        loadRecords();
      }
      setStatus(`Trimestre ${state.activeQuarter} seleccionado.`);
    });
  });
}

function syncQuarter() {
  document.getElementById("quarter").value = state.activeQuarter;
  els.quarterTabs.querySelectorAll("[data-quarter]").forEach(button => {
    const isActive = button.dataset.quarter === state.activeQuarter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  syncRecordsTitle();
}

function getEnabledQuartersForYear() {
  const year = Number(document.getElementById("year").value || CONFIG.defaultYear);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) {
    return ["I", "II", "III", "IV"];
  }

  if (year > currentYear) {
    return [];
  }

  const enabled = [];
  if (currentMonth >= 4) enabled.push("I");
  if (currentMonth >= 7) enabled.push("II");
  if (currentMonth >= 10) enabled.push("III");
  if (currentMonth >= 12) enabled.push("IV");
  return enabled;
}

function setupRequiredFieldMessages() {
  els.form.querySelectorAll("[required]").forEach(input => {
    const error = ensureFieldError(input);
    input.addEventListener("invalid", event => {
      event.preventDefault();
      showFieldError(input, error);
    });
    input.addEventListener("input", () => clearFieldError(input, error));
    input.addEventListener("change", () => clearFieldError(input, error));
  });
}

function ensureFieldError(input) {
  const label = input.closest("label");
  if (!label) {
    return null;
  }

  let error = label.querySelector(".field-error");
  if (!error) {
    error = document.createElement("span");
    error.className = "field-error";
    label.appendChild(error);
  }
  return error;
}

function showFieldError(input, error) {
  if (!error) {
    return;
  }

  error.textContent = getRequiredFieldMessage(input);
  error.classList.add("is-visible");
  input.setAttribute("aria-invalid", "true");
}

function clearFieldError(input, error) {
  if (!error || !input.checkValidity()) {
    return;
  }

  error.textContent = "";
  error.classList.remove("is-visible");
  input.removeAttribute("aria-invalid");
}

function getRequiredFieldMessage(input) {
  const label = input.closest("label");
  const labelText = label ? (label.querySelector("span")?.textContent || "").trim() : "este campo";
  if (input.validity.valueMissing) {
    return `Debes completar ${labelText}.`;
  }
  if (input.validity.typeMismatch && input.type === "email") {
    return "Ingresa un correo institucional valido.";
  }
  if (input.id === "responsibleName") {
    return "Responsable del reporte solo admite letras y espacios.";
  }
  if (input.id === "phone") {
    return "Telefono solo admite numeros (celular de 10 o fijo de 7/10).";
  }
  return "Revisa este campo.";
}

function setupResponsibleNameRule() {
  const input = document.getElementById("responsibleName");
  if (!input) {
    return;
  }
  input.addEventListener("input", () => {
    input.value = sanitizeResponsibleName(input.value);
  });
}

function setupPhoneRule() {
  const input = document.getElementById("phone");
  if (!input) {
    return;
  }
  input.addEventListener("input", () => {
    const digits = digitsOnly(input.value).slice(0, 10);
    input.value = formatPhoneDisplay(digits);
  });
  input.addEventListener("blur", () => {
    const digits = digitsOnly(input.value).slice(0, 10);
    input.value = formatPhoneDisplay(digits);
  });
}

function setupStrictNumericRule() {
  const procedureIds = ["fiv", "icsi", "vitrification", "embryoTransfer", "iiuIa", "otherProcedures"];
  procedureIds.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("input", () => {
      input.value = digitsOnly(input.value);
    });
  });

  const sanitizeRepeaterNumeric = container => {
    if (!container) return;
    container.addEventListener("input", event => {
      const input = event.target.closest('input[data-field="successes"]');
      if (!input) return;
      input.value = digitsOnly(input.value);
    });
  };

  sanitizeRepeaterNumeric(els.form);
  sanitizeRepeaterNumeric(els.entryModal);
}

function restoreSession() {
  try {
    const user = JSON.parse(sessionStorage.getItem(CONFIG.sessionKey) || "null");
    if (user && user.email && user.password) {
      state.currentUser = user;
      showApp();
      loadRecords();
      return;
    }
  } catch (error) {
    sessionStorage.removeItem(CONFIG.sessionKey);
  }
  showLogin();
}

async function handleLogin(event) {
  event.preventDefault();
  const email = normalizeEmail(els.loginEmail.value);
  const password = els.loginPassword.value.trim();

  if (!email || !password) {
    els.loginMessage.textContent = "Ingresa correo y contrasena.";
    return;
  }

  if (!CONFIG.appsScriptUrl) {
    els.loginMessage.textContent = "Primero configura CONFIG.appsScriptUrl para validar contra INVENTARIO.";
    return;
  }

  els.loginMessage.textContent = "Validando acceso...";
  try {
    const payload = await postRemote({ action: "login", email, password });
    if (!payload.success || !payload.user) {
      els.loginMessage.textContent = payload.message || "Credenciales no validas.";
      return;
    }
    state.currentUser = { ...payload.user, password };
    sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify(state.currentUser));
    showApp();
    await loadRecords();
  } catch (error) {
    els.loginMessage.textContent = error.message || "No fue posible validar el acceso.";
  }
}

function showLogin() {
  els.loginShell.classList.remove("is-hidden");
  els.appShell.classList.add("is-hidden");
}

function showApp() {
  els.loginShell.classList.add("is-hidden");
  els.appShell.classList.remove("is-hidden");
  hydrateUserFields();
}

function logout() {
  state.currentUser = null;
  state.remoteRecords = [];
  sessionStorage.removeItem(CONFIG.sessionKey);
  els.loginPassword.value = "";
  showLogin();
}

function hydrateUserFields() {
  const user = state.currentUser || {};
  els.userBadge.textContent = user.institution ? `${user.institution} | ${user.email}` : user.email || "";
  if (user.institution) document.getElementById("institution").value = user.institution;
  if (user.nit) document.getElementById("nit").value = user.nit;
}

function populateInstitutions() {
  els.institutionList.innerHTML = CONFIG.institutions
    .map(name => `<option value="${escapeHtml(name)}"></option>`)
    .join("");
}

function initializeRepeaters() {
  Object.keys(repeaterDefinitions).forEach(key => {
    ensureRepeaterLayout(key);
    renderRepeaterEmptyState(key);
    refreshDraftSection(key);
  });
}

function addRepeaterRow(key, values = {}) {
  const nodes = ensureRepeaterLayout(key);
  if (!nodes || !nodes.draftList) {
    return;
  }
  nodes.draftList.querySelector(".repeater-empty")?.remove();
  const row = document.createElement("div");
  row.className = `repeater-row draft-record ${key}-row`;
  row.innerHTML = repeaterDefinitions[key].map(field => {
    const value = values[field.name] || "";
    if (field.type === "textarea") {
      return `<label><span>${field.label}</span><textarea data-field="${field.name}">${escapeHtml(value)}</textarea></label>`;
    }
    if (field.type === "select") {
      const options = [
        '<option value="">Seleccionar</option>',
        ...field.options.map(option => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`)
      ].join("");
      return `<label><span>${field.label}</span><select data-field="${field.name}">${options}</select></label>`;
    }
    return `<label><span>${field.label}</span><input data-field="${field.name}" type="${field.type}" value="${escapeHtml(value)}" ${field.min ? `min="${field.min}"` : ""} /></label>`;
  }).join("") + '<button type="button" class="link-button remove-row">Quitar</button>';

  row.querySelector(".remove-row").addEventListener("click", () => {
    row.remove();
    renderRepeaterEmptyState(key);
    refreshDraftSection(key);
  });
  bindDatePickerAutoOpen(row);
  nodes.draftList.appendChild(row);
  refreshDraftSection(key);
}

function renderRepeaterEmptyState(key) {
  const nodes = ensureRepeaterLayout(key);
  if (!nodes || !nodes.draftList) {
    return;
  }
  if (nodes.draftList.querySelector(".draft-record")) {
    return;
  }
  nodes.draftList.innerHTML = `<div class="repeater-empty">${escapeHtml(entryModalConfig[key].emptyText)}</div>`;
}

function openEntryModal(key) {
  state.activeEntryKey = key;
  renderEntryModalFields(key);
  syncDatePickerLimits(els.entryModal);
  els.entryModalTitle.textContent = entryModalConfig[key].title;
  els.btnModalAddAnother.textContent = entryModalConfig[key].addButtonText;
  els.entryModal.classList.add("is-open");
  els.entryModal.setAttribute("aria-hidden", "false");
  const firstField = els.entryModalFields.querySelector("[data-field]");
  if (firstField) {
    firstField.focus();
  }
}

function closeEntryModal() {
  els.entryModal.classList.remove("is-open");
  els.entryModal.setAttribute("aria-hidden", "true");
  clearEntryModalFields();
  state.activeEntryKey = "";
}

function renderEntryModalFields(key) {
  els.entryModalFields.innerHTML = repeaterDefinitions[key].map(field => {
    if (field.type === "textarea") {
      return `<label><span>${field.label}</span><textarea data-field="${field.name}"></textarea></label>`;
    }
    if (field.type === "select") {
      const options = [
        '<option value="">Seleccionar</option>',
        ...field.options.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
      ].join("");
      return `<label><span>${field.label}</span><select data-field="${field.name}">${options}</select></label>`;
    }
    return `<label><span>${field.label}</span><input data-field="${field.name}" type="${field.type}" ${field.min ? `min="${field.min}"` : ""} /></label>`;
  }).join("");
  bindDatePickerAutoOpen(els.entryModalFields);
}

function clearEntryModalFields() {
  els.entryModalFields.querySelectorAll("[data-field]").forEach(input => {
    input.value = "";
    input.dataset.autoFilledDate = "";
  });
}

function addEntryFromModal() {
  const key = state.activeEntryKey;
  const values = getModalValues();

  if (!key || !Object.values(values).every(Boolean)) {
    setStatus("Completa todos los campos del registro.");
    return;
  }

  addRepeaterRow(key, values);
  clearEntryModalFields();
  syncDatePickerLimits(els.entryModal);
  const firstField = els.entryModalFields.querySelector("[data-field]");
  if (firstField) {
    firstField.focus();
  }
  setStatus(entryModalConfig[key].savedText);
}

function getModalValues() {
  const values = {};
  els.entryModalFields.querySelectorAll("[data-field]").forEach(input => {
    values[input.dataset.field] = getInputStoredValue(input);
  });
  return values;
}

function bindDatePickerAutoOpen(container) {
  container.querySelectorAll('input[type="date"]').forEach(input => {
    const openPicker = () => {
      prepareDatePickerYear(input);
      if (typeof input.showPicker === "function") {
        try {
          input.showPicker();
        } catch (error) {
          // Algunos navegadores solo permiten abrirlo desde un gesto directo del usuario.
        }
      }
    };

    input.addEventListener("focus", openPicker);
    input.addEventListener("click", openPicker);
    input.addEventListener("change", () => {
      input.dataset.autoFilledDate = "";
    });
    input.addEventListener("blur", () => {
      if (input.dataset.autoFilledDate === "true") {
        input.value = "";
        input.dataset.autoFilledDate = "";
      }
    });
  });
  syncDatePickerLimits(container);
}

function syncDatePickerLimits(container) {
  container.querySelectorAll('input[type="date"]').forEach(input => {
    const year = Number(document.getElementById("year").value || CONFIG.defaultYear);
    input.min = `${year}-01-01`;
    input.max = `${year}-12-31`;
    if (input.value && !input.value.startsWith(`${year}-`)) {
      input.value = "";
      input.dataset.autoFilledDate = "";
    }
  });
}

function prepareDatePickerYear(input) {
  if (input.value) {
    return;
  }

  const year = Number(document.getElementById("year").value || CONFIG.defaultYear);
  input.value = `${year}-01-01`;
  input.dataset.autoFilledDate = "true";
}

function getInputStoredValue(input) {
  if (input.type === "date" && input.dataset.autoFilledDate === "true") {
    return "";
  }

  return input.value.trim();
}

async function saveReport(event) {
  event.preventDefault();
  if (!state.currentUser) {
    showLogin();
    return;
  }

  if (!(await validateRequiredBeforeSave())) {
    return;
  }

  const report = buildReport();
  const validation = validateReport(report);
  if (!validation.ok) {
    setStatus(validation.message);
    return;
  }

  try {
    showSaveModal("loading", "Guardando reporte", "Estamos registrando la informacion.");
    if (CONFIG.appsScriptUrl) {
      await saveRemote(report);
      clearForm(false);
      await loadRecords();
      setStatus("Reporte guardado en Google Sheets.");
    } else {
      clearForm(false);
      setStatus("Reporte guardado en este navegador.");
      saveLocal(report);
      renderRecords();
    }
    showSaveModal("success", "Reporte guardado", "La informacion se guardo correctamente.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "No fue posible guardar el reporte.");
    showSaveModal("error", "No fue posible guardar", error.message || "Ocurrio un error.");
  }
}

function buildReport() {
  const formData = new FormData(els.form);
  return {
    id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
    savedAt: new Date().toISOString(),
    mode: CONFIG.mode,
    institution: state.currentUser ? state.currentUser.institution : value("institution"),
    nit: state.currentUser ? state.currentUser.nit : value("nit"),
    responsibleName: value("responsibleName"),
    responsibleRole: value("responsibleRole"),
    email: value("email"),
    phone: value("phone"),
    authorizedEmail: state.currentUser ? state.currentUser.email : "",
    year: Number(formData.get("year") || CONFIG.defaultYear),
    quarter: value("quarter"),
    newDonors: getRepeaterValues("newDonors"),
    donorSuccesses: getRepeaterValues("donorSuccesses"),
    rejectedDonors: getRepeaterValues("rejectedDonors"),
    procedures: {
      fiv: numberValue("fiv"),
      icsi: numberValue("icsi"),
      vitrification: numberValue("vitrification"),
      embryoTransfer: numberValue("embryoTransfer"),
      iiuIa: numberValue("iiuIa"),
      otherProcedures: numberValue("otherProcedures")
    }
  };
}

function validateReport(report) {
  if (report.year < CONFIG.minYear) {
    return { ok: false, message: "Este proyecto solo recibe informacion desde el año 2026." };
  }
  if (!report.quarter) {
    return { ok: false, message: "Selecciona el trimestre del reporte." };
  }
  if (!report.institution || !report.nit || !report.responsibleName || !report.responsibleRole || !report.email || !report.phone) {
    return { ok: false, message: "Completa responsable, cargo, correo institucional y telefono." };
  }
  if (!isValidResponsibleName(report.responsibleName)) {
    return { ok: false, message: "Responsable del reporte solo admite letras y espacios." };
  }
  if (!isValidPhoneDigits(report.phone)) {
    return { ok: false, message: "Telefono solo admite numeros (celular de 10 o fijo de 7/10)." };
  }
  return { ok: true };
}

function getRepeaterValues(key) {
  const nodes = ensureRepeaterLayout(key);
  return [...nodes.draftList.querySelectorAll(".repeater-row")]
    .map(row => {
      const item = {};
      row.querySelectorAll("[data-field]").forEach(input => item[input.dataset.field] = getInputStoredValue(input));
      return item;
    })
    .filter(item => Object.values(item).some(Boolean));
}

function value(id) {
  if (id === "phone") {
    return normalizePhoneForStorage(document.getElementById(id).value);
  }
  return document.getElementById(id).value.trim();
}

function numberValue(id) {
  return Number(document.getElementById(id).value || 0);
}

function setProcedureValue(id, value) {
  document.getElementById(id).value = Number(value || 0);
}

function saveLocal(report) {
  const records = getLocalRecords();
  records.push(report);
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(records));
}

function getLocalRecords() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.storageKey) || "[]");
  } catch {
    return [];
  }
}

async function saveRemote(report) {
  const payload = await postRemote({
    action: "saveReport",
    email: state.currentUser.email,
    password: state.currentUser.password,
    report
  });
  if (!payload.success) {
    throw new Error(payload.message || "Error guardando en Google Sheets.");
  }
}

async function postRemote(payload) {
  const response = await fetch(CONFIG.appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || `Respuesta no valida: ${response.status}`);
  }
  return result;
}

async function loadRecords() {
  if (!state.currentUser) {
    return;
  }

  if (!CONFIG.appsScriptUrl) {
    renderRecords();
    hydrateFormFromRecords(getLocalRecords());
    return;
  }

  try {
    const payload = await postRemote({
      action: "listReports",
      email: state.currentUser.email,
      password: state.currentUser.password,
      year: Number(document.getElementById("year").value || CONFIG.defaultYear),
      quarter: state.activeQuarter
    });
    if (!payload.success) {
      throw new Error(payload.message || "No fue posible cargar los registros.");
    }
    state.remoteRecords = payload.records || [];
    renderRecords();
    hydrateFormFromRecords(state.remoteRecords);
  } catch (error) {
    setStatus(error.message || "No fue posible cargar los registros.");
  }
}

function hydrateFormFromRecords(records) {
  renderRegisteredData(records);
  renderProceduresFromRecords(records);
}

function renderRegisteredData(records) {
  renderRegisteredSection("newDonors", records);
  renderRegisteredSection("donorSuccesses", records);
  renderRegisteredSection("rejectedDonors", records);
}

function renderRegisteredSection(key, records) {
  const nodes = ensureRepeaterLayout(key);
  if (!nodes || !nodes.registeredTools || !nodes.registeredList) {
    return;
  }
  nodes.registeredTools.innerHTML = "";
  nodes.registeredList.innerHTML = "";

  const allRows = collectRegisteredRowsFromRecords(key, records);
  const filteredRows = filterRegisteredRows(key, allRows);
  const pageSize = CONFIG.pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  state.registeredUi[key].page = Math.min(state.registeredUi[key].page, totalPages);
  state.registeredUi[key].page = Math.max(state.registeredUi[key].page, 1);
  const start = (state.registeredUi[key].page - 1) * pageSize;
  const currentRows = filteredRows.slice(start, start + pageSize);

  const tools = createRegisteredTools(key, allRows.length, filteredRows.length, totalPages);
  nodes.registeredTools.appendChild(tools);

  if (!currentRows.length) {
    const empty = document.createElement("div");
    empty.className = "repeater-empty";
    empty.textContent = entryModalConfig[key].emptyText;
    nodes.registeredList.appendChild(empty);
    refreshDraftSection(key);
    return;
  }

  currentRows.forEach(rowData => addRegisteredRepeaterRow(key, rowData));
  refreshDraftSection(key);
}

function collectRegisteredRowsFromRecords(key, records) {
  const rows = [];
  records.forEach(record => {
    (record[key] || []).forEach((item, itemIndex) => {
      rows.push({
        reportId: record.id,
        itemIndex,
        ...item
      });
    });
  });
  return rows;
}

function addRegisteredRepeaterRow(key, values) {
  const nodes = ensureRepeaterLayout(key);
  const row = document.createElement("div");
  row.className = `repeater-row existing-record ${key}-row`;
  row.dataset.section = key;
  row.dataset.reportId = values.reportId || "";
  row.dataset.itemIndex = String(values.itemIndex ?? "");
  row.innerHTML = repeaterDefinitions[key].map(field => {
    const value = values[field.name] || "";
    if (field.type === "select") {
      const options = [
        '<option value="">Seleccionar</option>',
        ...field.options.map(option => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`)
      ].join("");
      return `<label><span>${field.label}</span><select data-field="${field.name}" disabled>${options}</select></label>`;
    }
    return `<label><span>${field.label}</span><input data-field="${field.name}" type="${field.type}" value="${escapeHtml(value)}" readonly /></label>`;
  }).join("") + `
    <div class="registered-actions">
      <button type="button" class="link-button" data-edit-existing>Editar</button>
      <button type="button" class="danger-button" data-delete-existing>Eliminar</button>
      <button type="button" class="ghost-button is-hidden" data-save-existing>Guardar</button>
      <button type="button" class="ghost-button secondary is-hidden" data-cancel-existing>Cancelar</button>
    </div>
  `;
  nodes.registeredList.appendChild(row);
}

function filterRegisteredRows(key, rows) {
  const term = normalizeText(state.registeredUi[key].search);
  if (!term) {
    return rows;
  }
  return rows.filter(row => repeaterDefinitions[key]
    .some(field => normalizeText(row[field.name]).includes(term)));
}

function createRegisteredTools(key, totalCount, filteredCount, totalPages) {
  const ui = state.registeredUi[key];
  const tools = document.createElement("div");
  tools.className = "registered-tools";
  tools.innerHTML = `
    <label class="registered-search">
      <span>Buscar</span>
      <input type="search" value="${escapeHtml(ui.search)}" data-search-existing="${key}" placeholder="Buscar en registros" />
    </label>
    <div class="registered-pagination">
      <span>${filteredCount} de ${totalCount} registros</span>
      <button type="button" class="link-button" data-page-existing="${key}" data-page-direction="-1" ${ui.page <= 1 ? "disabled" : ""}>Anterior</button>
      <span>Pagina ${ui.page} de ${totalPages}</span>
      <button type="button" class="link-button" data-page-existing="${key}" data-page-direction="1" ${ui.page >= totalPages ? "disabled" : ""}>Siguiente</button>
    </div>
  `;
  return tools;
}

function handleRegisteredSearch(event) {
  const input = event.target.closest("[data-search-existing]");
  if (input) {
    const key = input.dataset.searchExisting;
    state.registeredUi[key].search = input.value;
    state.registeredUi[key].page = 1;
    renderRegisteredData(state.remoteRecords);
    return;
  }
  const draftInput = event.target.closest("[data-search-draft]");
  if (!draftInput) {
    return;
  }
  const key = draftInput.dataset.searchDraft;
  state.draftUi[key].search = draftInput.value;
  state.draftUi[key].page = 1;
  refreshDraftSection(key);
}

function handleRegisteredAction(event) {
  const pageButton = event.target.closest("[data-page-existing]");
  if (pageButton) {
    const key = pageButton.dataset.pageExisting;
    state.registeredUi[key].page += Number(pageButton.dataset.pageDirection);
    renderRegisteredData(state.remoteRecords);
    return;
  }
  const draftPageButton = event.target.closest("[data-page-draft]");
  if (draftPageButton) {
    const key = draftPageButton.dataset.pageDraft;
    state.draftUi[key].page += Number(draftPageButton.dataset.pageDirection);
    refreshDraftSection(key);
    return;
  }

  const row = event.target.closest(".existing-record");
  if (!row) {
    return;
  }
  if (event.target.closest("[data-edit-existing]")) {
    enableExistingEdit(row);
    return;
  }
  if (event.target.closest("[data-delete-existing]")) {
    deleteExistingRow(row);
    return;
  }
  if (event.target.closest("[data-cancel-existing]")) {
    restoreExistingRow(row);
    return;
  }
  if (event.target.closest("[data-save-existing]")) {
    saveExistingRow(row);
  }
}

function ensureRepeaterLayout(key) {
  const container = document.getElementById(key);
  if (!container) {
    return null;
  }
  const needsLayout = !container.dataset.layoutReady
    || !container.querySelector("[data-registered-tools]")
    || !container.querySelector("[data-registered-list]")
    || !container.querySelector("[data-draft-tools]")
    || !container.querySelector("[data-draft-list]");

  if (needsLayout) {
    container.innerHTML = `
      <div class="split-group">
        <h3 class="split-title">Registros guardados</h3>
        <div data-registered-tools></div>
        <div data-registered-list></div>
      </div>
      <div class="split-group">
        <h3 class="split-title">Nuevos por registrar</h3>
        <div data-draft-tools></div>
        <div data-draft-list></div>
      </div>
    `;
    container.dataset.layoutReady = "true";
  }
  const nodes = {
    container,
    registeredTools: container.querySelector("[data-registered-tools]"),
    registeredList: container.querySelector("[data-registered-list]"),
    draftTools: container.querySelector("[data-draft-tools]"),
    draftList: container.querySelector("[data-draft-list]")
  };
  if (!nodes.registeredTools || !nodes.registeredList || !nodes.draftTools || !nodes.draftList) {
    return null;
  }
  return nodes;
}

function refreshDraftSection(key) {
  const nodes = ensureRepeaterLayout(key);
  if (!nodes || !nodes.draftList || !nodes.draftTools) {
    return;
  }
  const rows = [...nodes.draftList.querySelectorAll(".draft-record")];
  nodes.draftTools.innerHTML = "";

  if (!rows.length) {
    renderRepeaterEmptyState(key);
    return;
  }

  const ui = state.draftUi[key];
  const term = normalizeText(ui.search);
  const filteredRows = rows.filter(row => {
    if (!term) return true;
    const text = [...row.querySelectorAll("[data-field]")]
      .map(input => normalizeText(getInputStoredValue(input))).join(" ");
    return text.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / CONFIG.pageSize));
  ui.page = Math.max(1, Math.min(ui.page, totalPages));
  const start = (ui.page - 1) * CONFIG.pageSize;
  const visibleRows = filteredRows.slice(start, start + CONFIG.pageSize);

  rows.forEach(row => {
    row.classList.add("is-hidden");
  });
  visibleRows.forEach(row => {
    row.classList.remove("is-hidden");
  });

  const tools = document.createElement("div");
  tools.className = "registered-tools";
  tools.innerHTML = `
    <label class="registered-search">
      <span>Buscar</span>
      <input type="search" value="${escapeHtml(ui.search)}" data-search-draft="${key}" placeholder="Buscar en nuevos por registrar" />
    </label>
    <div class="registered-pagination">
      <span>${filteredRows.length} de ${rows.length} registros</span>
      <button type="button" class="link-button" data-page-draft="${key}" data-page-direction="-1" ${ui.page <= 1 ? "disabled" : ""}>Anterior</button>
      <span>Pagina ${ui.page} de ${totalPages}</span>
      <button type="button" class="link-button" data-page-draft="${key}" data-page-direction="1" ${ui.page >= totalPages ? "disabled" : ""}>Siguiente</button>
    </div>
  `;
  nodes.draftTools.appendChild(tools);
}

function getExistingRowValues(row) {
  const values = {};
  row.querySelectorAll("[data-field]").forEach(input => {
    values[input.dataset.field] = getInputStoredValue(input);
  });
  return values;
}

function enableExistingEdit(row) {
  row.dataset.originalValues = JSON.stringify(getExistingRowValues(row));
  row.querySelectorAll("[data-field]").forEach(input => {
    input.removeAttribute("readonly");
    input.removeAttribute("disabled");
  });
  row.classList.add("is-editing");
  row.querySelector("[data-edit-existing]")?.classList.add("is-hidden");
  row.querySelector("[data-delete-existing]")?.classList.add("is-hidden");
  row.querySelector("[data-save-existing]")?.classList.remove("is-hidden");
  row.querySelector("[data-cancel-existing]")?.classList.remove("is-hidden");
}

function disableExistingEdit(row) {
  row.querySelectorAll("[data-field]").forEach(input => {
    if (input.tagName === "SELECT") {
      input.setAttribute("disabled", "");
    } else {
      input.setAttribute("readonly", "");
    }
  });
  row.classList.remove("is-editing");
  row.querySelector("[data-edit-existing]")?.classList.remove("is-hidden");
  row.querySelector("[data-delete-existing]")?.classList.remove("is-hidden");
  row.querySelector("[data-save-existing]")?.classList.add("is-hidden");
  row.querySelector("[data-cancel-existing]")?.classList.add("is-hidden");
}

function restoreExistingRow(row) {
  const values = JSON.parse(row.dataset.originalValues || "{}");
  row.querySelectorAll("[data-field]").forEach(input => {
    input.value = values[input.dataset.field] || "";
  });
  disableExistingEdit(row);
}

async function saveExistingRow(row) {
  const key = row.dataset.section;
  const reportId = row.dataset.reportId;
  const itemIndex = Number(row.dataset.itemIndex);
  const itemData = getExistingRowValues(row);
  const record = getEditableRecord(reportId);

  if (!record || !record[key] || !record[key][itemIndex]) {
    setStatus("No fue posible encontrar el registro para editar.");
    return;
  }

  try {
    showSaveModal("loading", "Actualizando registro", "Estamos registrando la informacion.");
    await saveRemoteItemAndSheet(record, key, itemIndex, itemData);
    record[key][itemIndex] = itemData;
    updateRemoteRecordInState(record);
    disableExistingEdit(row);
    renderRegisteredData(state.remoteRecords);
    setStatus("Registro actualizado correctamente.");
    showSaveModal("success", "Registro actualizado", "La informacion se actualizo correctamente.");
  } catch (error) {
    setStatus(error.message || "No fue posible actualizar el registro.");
    showSaveModal("error", "No fue posible actualizar", error.message || "Ocurrio un error.");
  }
}

async function deleteExistingRow(row) {
  const key = row.dataset.section;
  const reportId = row.dataset.reportId;
  const itemIndex = Number(row.dataset.itemIndex);
  const record = getEditableRecord(reportId);

  if (!record || !record[key] || !record[key][itemIndex]) {
    setStatus("No fue posible encontrar el registro para eliminar.");
    return;
  }

  const confirmed = await confirmAction("Deseas eliminar este registro?");
  if (!confirmed) {
    return;
  }

  try {
    showSaveModal("loading", "Eliminando registro", "Estamos registrando la informacion.");
    await deleteRemoteItemAndSheet(record, key, itemIndex);
    record[key].splice(itemIndex, 1);
    updateRemoteRecordInState(record);
    renderRegisteredData(state.remoteRecords);
    setStatus("Registro eliminado correctamente.");
    showSaveModal("success", "Registro eliminado", "La informacion se actualizo correctamente.");
  } catch (error) {
    setStatus(error.message || "No fue posible eliminar el registro.");
    showSaveModal("error", "No fue posible eliminar", error.message || "Ocurrio un error.");
  }
}

function getEditableRecord(reportId) {
  return state.remoteRecords.find(record => String(record.id) === String(reportId));
}

function updateRemoteRecordInState(record) {
  const index = state.remoteRecords.findIndex(item => String(item.id) === String(record.id));
  if (index >= 0) {
    state.remoteRecords[index] = record;
  }
}

async function saveRemoteItemAndSheet(report, section, itemIndex, itemData) {
  const payload = await postRemote({
    action: "updateItemAndSheet",
    email: state.currentUser.email,
    password: state.currentUser.password,
    report,
    section,
    itemIndex,
    itemData
  });
  if (!payload.success) {
    throw new Error(payload.message || "No fue posible actualizar el registro.");
  }
}

async function deleteRemoteItemAndSheet(report, section, itemIndex) {
  const payload = await postRemote({
    action: "deleteItemAndSheet",
    email: state.currentUser.email,
    password: state.currentUser.password,
    report,
    section,
    itemIndex
  });
  if (!payload.success) {
    throw new Error(payload.message || "No fue posible eliminar el registro.");
  }
}

function renderProceduresFromRecords(records) {
  if (!records.length) {
    setProcedureValue("fiv", 0);
    setProcedureValue("icsi", 0);
    setProcedureValue("vitrification", 0);
    setProcedureValue("embryoTransfer", 0);
    setProcedureValue("iiuIa", 0);
    setProcedureValue("otherProcedures", 0);
    return;
  }
  const latestRecord = records
    .slice()
    .sort((a, b) => new Date(a.savedAt || 0).getTime() - new Date(b.savedAt || 0).getTime())
    .pop() || {};
  const procedures = latestRecord.procedures || {};
  setProcedureValue("fiv", procedures.fiv);
  setProcedureValue("icsi", procedures.icsi);
  setProcedureValue("vitrification", procedures.vitrification);
  setProcedureValue("embryoTransfer", procedures.embryoTransfer);
  setProcedureValue("iiuIa", procedures.iiuIa);
  setProcedureValue("otherProcedures", procedures.otherProcedures);
}

function renderRecords() {
  if (!els.recordsBody) {
    return;
  }
  const records = CONFIG.appsScriptUrl
    ? state.remoteRecords
    : getLocalRecords().filter(record => (
      !record.authorizedEmail || !state.currentUser || record.authorizedEmail === state.currentUser.email
    ));
  if (!records.length) {
    els.recordsBody.innerHTML = '<tr><td colspan="7" class="empty-state">Aun no hay registros.</td></tr>';
    return;
  }
  els.recordsBody.innerHTML = records.slice().reverse().map(record => `
    <tr>
      <td>${escapeHtml(record.institution)}</td>
      <td>${escapeHtml(record.year)}</td>
      <td>${escapeHtml(record.quarter || "")}</td>
      <td>${escapeHtml(record.responsibleName)}</td>
      <td>${escapeHtml(record.email)}</td>
      <td>${escapeHtml(formatDate(record.savedAt))}</td>
      <td><button type="button" class="danger-button" data-delete-id="${escapeHtml(record.id)}">Eliminar</button></td>
    </tr>
  `).join("");
}

async function deleteRecord(id) {
  if (!id) {
    return;
  }

  const confirmed = await confirmAction("Deseas eliminar este registro?");
  if (!confirmed) {
    return;
  }

  if (CONFIG.appsScriptUrl) {
    try {
      showSaveModal("loading", "Eliminando reporte", "Estamos registrando la informacion.");
      const payload = await postRemote({
        action: "deleteReport",
        email: state.currentUser.email,
        password: state.currentUser.password,
        reportId: id
      });
      if (!payload.success) {
        throw new Error(payload.message || "No fue posible eliminar el registro.");
      }
      setStatus("Registro eliminado.");
      await loadRecords();
      showSaveModal("success", "Registro eliminado", "La informacion se actualizo correctamente.");
    } catch (error) {
      setStatus(error.message || "No fue posible eliminar el registro.");
      showSaveModal("error", "No fue posible eliminar", error.message || "Ocurrio un error.");
    }
    return;
  }

  const records = getLocalRecords().filter(record => record.id !== id);
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(records));
  setStatus("Registro eliminado.");
  renderRecords();
  showSaveModal("success", "Registro eliminado", "La informacion se actualizo correctamente.");
}

function clearForm(showMessage = true) {
  els.form.reset();
  document.getElementById("year").value = CONFIG.defaultYear;
  state.activeQuarter = "";
  Object.keys(state.registeredUi).forEach(key => {
    state.registeredUi[key] = { search: "", page: 1 };
  });
  populateQuarterTabs();
  syncQuarter();
  hydrateUserFields();
  Object.keys(repeaterDefinitions).forEach(key => {
    const container = document.getElementById(key);
    container.innerHTML = "";
    delete container.dataset.layoutReady;
    renderRepeaterEmptyState(key);
  });
  if (showMessage) {
    setStatus("Formulario limpio.");
  }
}

function exportCsv() {
  const records = CONFIG.appsScriptUrl ? state.remoteRecords : getLocalRecords();
  if (!records.length) {
    setStatus("No hay registros locales para exportar.");
    return;
  }
  const rows = [
    ["institucion", "nit", "responsable", "cargo", "correo", "telefono", "anio", "trimestre", "nuevos_donantes", "exitos", "rechazos", "fiv_fecundacion_in_vitro", "icsi_inyeccion_intracitoplasmatica_espermatozoides", "vitrificacion_criopreservacion_ovulos_embriones", "transferencia_embriones_ovodonacion_donacion_semen", "iiu_ia_inseminacion_intrauterina", "otros", "guardado"],
    ...records.map(record => [
      record.institution,
      record.nit,
      record.responsibleName,
      record.responsibleRole,
      record.email,
      record.phone,
      record.year,
      record.quarter,
      JSON.stringify(record.newDonors),
      JSON.stringify(record.donorSuccesses),
      JSON.stringify(record.rejectedDonors),
      record.procedures.fiv,
      record.procedures.icsi,
      record.procedures.vitrification,
      record.procedures.embryoTransfer,
      record.procedures.iiuIa,
      record.procedures.otherProcedures,
      record.savedAt
    ])
  ];
  const csv = rows.map(row => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "banco_gametos_trimestral_2026_en_adelante.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function refreshBackendBadge() {
  els.backendBadge.textContent = CONFIG.appsScriptUrl ? "Google Sheets" : "Modo local";
}

function syncRecordsTitle() {
  if (!els.recordsTitle) {
    return;
  }
  const year = Number(document.getElementById("year").value || CONFIG.defaultYear);
  const quarterLabel = state.activeQuarter ? ` - Trimestre ${state.activeQuarter}` : "";
  els.recordsTitle.textContent = `Registros guardados ${year}${quarterLabel}`;
}

function setStatus(message) {
  els.statusMessage.textContent = message;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("es-CO") : "";
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function validateRequiredBeforeSave() {
  const requiredFields = [...els.form.querySelectorAll("[required]")];
  let firstInvalid = null;
  let totalInvalid = 0;

  requiredFields.forEach(input => {
    const error = ensureFieldError(input);
    if (!input.checkValidity()) {
      totalInvalid++;
      if (!firstInvalid) {
        firstInvalid = input;
      }
      showFieldError(input, error);
    } else {
      clearFieldError(input, error);
    }
  });

  if (!firstInvalid) {
    const responsibleNameInput = document.getElementById("responsibleName");
    if (!isValidResponsibleName(responsibleNameInput.value)) {
      const error = ensureFieldError(responsibleNameInput);
      if (error) {
        error.textContent = "Responsable del reporte solo admite letras y espacios.";
        error.classList.add("is-visible");
      }
      responsibleNameInput.setAttribute("aria-invalid", "true");
      if (typeof Swal !== "undefined") {
        await Swal.fire({
          icon: "warning",
          title: "Formato no valido",
          text: "Responsable del reporte solo admite letras y espacios.",
          confirmButtonText: "Entendido",
          confirmButtonColor: "#0f766e"
        });
      }
      const section = responsibleNameInput.closest(".form-section") || responsibleNameInput;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => responsibleNameInput.focus(), 500);
      return false;
    }
    const phoneInput = document.getElementById("phone");
    const phoneDigits = normalizePhoneForStorage(phoneInput.value);
    phoneInput.value = formatPhoneDisplay(phoneDigits);
    if (!isValidPhoneDigits(phoneDigits)) {
      const error = ensureFieldError(phoneInput);
      if (error) {
        error.textContent = "Telefono solo admite numeros (celular de 10 o fijo de 7/10).";
        error.classList.add("is-visible");
      }
      phoneInput.setAttribute("aria-invalid", "true");
      if (typeof Swal !== "undefined") {
        await Swal.fire({
          icon: "warning",
          title: "Formato no valido",
          text: "Telefono solo admite numeros (celular de 10 o fijo de 7/10).",
          confirmButtonText: "Entendido",
          confirmButtonColor: "#0f766e"
        });
      }
      const section = phoneInput.closest(".form-section") || phoneInput;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => phoneInput.focus(), 500);
      return false;
    }
    return true;
  }

  if (typeof Swal !== "undefined") {
    await Swal.fire({
      icon: "warning",
      title: "Faltan datos por completar",
      text: `Debes completar ${totalInvalid} campo(s) obligatorio(s) antes de guardar.`,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#0f766e"
    });
  }

  const section = firstInvalid.closest(".form-section") || firstInvalid;
  section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  setTimeout(() => {
    firstInvalid.focus();
  }, 500);

  return false;
}

function sanitizeResponsibleName(value) {
  return String(value || "").replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, "");
}

function isValidResponsibleName(value) {
  const text = String(value || "").trim();
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/.test(text);
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePhoneForStorage(value) {
  return digitsOnly(value).slice(0, 10);
}

function isValidPhoneDigits(value) {
  return /^\d{7}$/.test(value) || /^\d{10}$/.test(value);
}

function formatPhoneDisplay(digits) {
  if (!digits) {
    return "";
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 10 && digits.startsWith("60")) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return digits;
}

function showSaveModal(type, title, message) {
  if (typeof Swal !== "undefined") {
    if (type === "loading") {
      Swal.fire({
        title,
        text: message,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      return;
    }

    Swal.close();
    Swal.fire({
      icon: type === "error" ? "error" : "success",
      title,
      text: message,
      timer: type === "error" ? undefined : 1300,
      showConfirmButton: type === "error"
    });
    return;
  }

  if (!els.saveModal) {
    return;
  }
  els.saveModal.classList.add("is-open");
  els.saveModal.setAttribute("aria-hidden", "false");
  els.saveModalTitle.textContent = title;
  els.saveModalMessage.textContent = message;
  els.saveSpinner.classList.toggle("is-hidden", type !== "loading");
  els.saveModalActions.classList.toggle("is-hidden", type === "loading");
}

function closeSaveModal() {
  if (typeof Swal !== "undefined") {
    Swal.close();
    return;
  }

  if (!els.saveModal) {
    return;
  }
  els.saveModal.classList.remove("is-open");
  els.saveModal.setAttribute("aria-hidden", "true");
}

function confirmAction(message) {
  if (typeof Swal !== "undefined") {
    return Swal.fire({
      title: "Deseas eliminar este registro?",
      text: "Esta accion eliminar la informacion seleccionada.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, continuar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d"
    }).then(result => Boolean(result.isConfirmed));
  }

  if (!els.confirmModal) {
    return Promise.resolve(window.confirm(message));
  }

  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      els.confirmModal.classList.remove("is-open");
      els.confirmModal.setAttribute("aria-hidden", "true");
      els.btnConfirmAccept.removeEventListener("click", onAccept);
      els.btnConfirmCancel.removeEventListener("click", onCancel);
      resolve(value);
    };
    const onAccept = () => finish(true);
    const onCancel = () => finish(false);

    els.confirmModalMessage.textContent = message;
    els.confirmModal.classList.add("is-open");
    els.confirmModal.setAttribute("aria-hidden", "false");
    els.btnConfirmAccept.addEventListener("click", onAccept);
    els.btnConfirmCancel.addEventListener("click", onCancel);
  });
}
