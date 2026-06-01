const SPREADSHEET_ID = "1ymGeV9018BkS1aMhv6Q7hPHW2mn_gNWz599T9J8bHcg";

const SHEETS = {
  inventory: "INVENTARIO",
  newDonors: "1 - NUEVOS DONANTES",
  donorSuccesses: "2 - CASOS DE EXITO",
  rejectedDonors: "3 - DONANTE RECHAZADO",
  procedures: "4 - PROCEDIMIENTOS",
  index: "APP_REGISTROS"
};

const INDEX_HEADERS = [
  "REPORT_ID",
  "FECHA_REGISTRO",
  "CORREO_AUTORIZADO",
  "ESTABLECIMIENTO",
  "NIT",
  "ANIO_REPORTADO",
  "TRIMESTRE",
  "PAYLOAD_JSON"
];

const EXTRA_HEADERS = ["REPORT_ID", "CORREO_AUTORIZADO"];

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "directory";

  if (action === "directory") {
    return jsonOutput({
      success: true,
      institutions: getDirectory_()
    });
  }

  return jsonOutput({
    success: false,
    message: "Accion no soportada."
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (payload.action === "login") {
      const user = authenticate_(payload.email, payload.password);
      return jsonOutput({ success: true, user });
    }

    if (payload.action === "saveReport") {
      const user = authenticate_(payload.email, payload.password);
      return saveReport_(payload.report || {}, user);
    }

    if (payload.action === "updatePayloadOnly") {
      const user = authenticate_(payload.email, payload.password);
      return updatePayloadOnly_(payload.report || {}, user);
    }

    if (payload.action === "updateItemAndSheet") {
      const user = authenticate_(payload.email, payload.password);
      return updateItemAndSheet_(payload || {}, user);
    }

    if (payload.action === "deleteItemAndSheet") {
      const user = authenticate_(payload.email, payload.password);
      return deleteItemAndSheet_(payload || {}, user);
    }

    if (payload.action === "listReports") {
      const user = authenticate_(payload.email, payload.password);
      return jsonOutput({
        success: true,
        records: listReports_(user, Number(payload.year), String(payload.quarter || ""))
      });
    }

    if (payload.action === "deleteReport") {
      const user = authenticate_(payload.email, payload.password);
      return deleteReport_(payload.reportId, user);
    }

    return jsonOutput({
      success: false,
      message: "Accion no soportada."
    });
  } catch (error) {
    return jsonOutput({
      success: false,
      message: error.message || "No fue posible procesar la solicitud."
    });
  }
}

function saveReport_(report, user) {
  const year = Number(report.year);

  if (year < 2026) {
    throw new Error("Este proyecto solo recibe informacion desde el anio 2026.");
  }

  if (!String(report.quarter || "").trim()) {
    throw new Error("Selecciona el trimestre del reporte.");
  }

  validateRequiredReportFields_(report);

  const normalizedReport = Object.assign({}, report, {
    id: report.id || Utilities.getUuid(),
    savedAt: report.savedAt || new Date().toISOString(),
    authorizedEmail: user.email,
    institution: report.institution || user.institution,
    nit: report.nit || user.nit,
    email: report.email || user.email,
    phone: normalizePhone_(report.phone || user.phone)
  });

  replaceExistingReportIfNeeded_(normalizedReport, user);

  appendIndex_(normalizedReport);
  appendNewDonors_(normalizedReport);
  appendDonorSuccesses_(normalizedReport);
  appendRejectedDonors_(normalizedReport);
  deleteProcedureRowsForQuarter_(normalizedReport);
  appendProcedures_(normalizedReport);

  return jsonOutput({
    success: true,
    message: "Reporte guardado correctamente.",
    reportId: normalizedReport.id
  });
}

function validateRequiredReportFields_(report) {
  const requiredValues = [
    report.responsibleName,
    report.responsibleRole,
    report.email,
    report.phone
  ];

  if (requiredValues.some(value => !String(value || "").trim())) {
    throw new Error("Completa responsable del reporte, cargo, correo institucional y telefono.");
  }

  if (!isValidResponsibleName_(report.responsibleName)) {
    throw new Error("Responsable del reporte solo admite letras y espacios.");
  }

  if (!isValidPhone_(report.phone)) {
    throw new Error("Telefono solo admite numeros (celular de 10 o fijo de 7/10).");
  }

  validateNumericFields_(report);
}

function isValidResponsibleName_(value) {
  const text = String(value || "").trim();
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/.test(text);
}

function replaceExistingReportIfNeeded_(report, user) {
  const existingReport = findReport_(report.id) || rebuildReportsFromSheets_(user, Number(report.year), String(report.quarter || ""))
    .find(item => String(item.id) === String(report.id));

  if (!existingReport) {
    return;
  }

  if (normalizeEmail_(existingReport.authorizedEmail || existingReport.email) !== user.email) {
    throw new Error("No tienes permiso para editar este registro.");
  }

  deleteRowsByReportId_(SHEETS.index, 1, report.id);
  deleteRowsByReportId_(SHEETS.newDonors, 11, report.id);
  deleteRowsByReportId_(SHEETS.donorSuccesses, 11, report.id);
  deleteRowsByReportId_(SHEETS.rejectedDonors, 11, report.id);
  deleteRowsByReportId_(SHEETS.procedures, 15, report.id);
}

function appendIndex_(report) {
  const sheet = getOrCreateSheet_(SHEETS.index, INDEX_HEADERS);

  sheet.appendRow([
    report.id,
    new Date(),
    report.authorizedEmail || "",
    report.institution || "",
    report.nit || "",
    report.year || "",
    report.quarter || "",
    JSON.stringify(report)
  ]);
}

function appendNewDonors_(report) {
  const sheet = getSheet_(SHEETS.newDonors);
  ensureExtraHeaders_(sheet);

  (report.newDonors || []).forEach(item => {
    sheet.appendRow([
      report.institution || "",
      report.nit || "",
      report.responsibleName || "",
      report.responsibleRole || "",
      report.email || "",
      report.phone || "",
      report.year || "",
      report.quarter || "",
      item.donorCode || "",
      item.freezeDate || "",
      report.id,
      report.authorizedEmail || ""
    ]);
  });
}

function appendDonorSuccesses_(report) {
  const sheet = getSheet_(SHEETS.donorSuccesses);
  ensureExtraHeaders_(sheet);

  (report.donorSuccesses || []).forEach(item => {
    sheet.appendRow([
      report.institution || "",
      report.nit || "",
      report.responsibleName || "",
      report.responsibleRole || "",
      report.email || "",
      report.phone || "",
      report.year || "",
      report.quarter || "",
      item.donorCode || "",
      item.successes || "",
      report.id,
      report.authorizedEmail || ""
    ]);
  });
}

function appendRejectedDonors_(report) {
  const sheet = getSheet_(SHEETS.rejectedDonors);
  ensureExtraHeaders_(sheet);

  (report.rejectedDonors || []).forEach(item => {
    sheet.appendRow([
      report.institution || "",
      report.nit || "",
      report.responsibleName || "",
      report.responsibleRole || "",
      report.email || "",
      report.phone || "",
      report.year || "",
      report.quarter || "",
      item.donorCode || "",
      item.cause || "",
      report.id,
      report.authorizedEmail || ""
    ]);
  });
}

function appendProcedures_(report) {
  const sheet = getSheet_(SHEETS.procedures);
  ensureExtraHeaders_(sheet);

  const procedures = report.procedures || {};

  sheet.appendRow([
    report.institution || "",
    report.nit || "",
    report.responsibleName || "",
    report.responsibleRole || "",
    report.email || "",
    report.phone || "",
    report.year || "",
    report.quarter || "",
    number_(procedures.fiv),
    number_(procedures.icsi),
    number_(procedures.vitrification),
    number_(procedures.embryoTransfer),
    number_(procedures.iiuIa),
    number_(procedures.otherProcedures),
    report.id,
    report.authorizedEmail || ""
  ]);
}

function deleteProcedureRowsForQuarter_(report) {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.procedures);

  if (!sheet || sheet.getLastRow() < 2) {
    return;
  }

  ensureExtraHeaders_(sheet);

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 16)
    .getDisplayValues();

  const reportYear = String(report.year || "").trim();
  const reportQuarter = String(report.quarter || "").trim();
  const reportEmail = normalizeEmail_(report.authorizedEmail || report.email);
  const reportNit = String(report.nit || "").trim();

  for (let index = values.length - 1; index >= 0; index--) {
    const row = values[index];
    const rowYear = String(row[6] || "").trim();
    const rowQuarter = String(row[7] || "").trim();
    const rowEmail = normalizeEmail_(row[15]);
    const rowNit = String(row[1] || "").trim();

    if (rowYear === reportYear && rowQuarter === reportQuarter && rowNit === reportNit && (!rowEmail || rowEmail === reportEmail)) {
      sheet.deleteRow(index + 2);
    }
  }
}

function listReports_(user, year, quarter) {
  const sheet = getOrCreateSheet_(SHEETS.index, INDEX_HEADERS);

  if (sheet.getLastRow() < 2) {
    return rebuildReportsFromSheets_(user, year, quarter);
  }

  const records = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, INDEX_HEADERS.length)
    .getValues()
    .map(row => parseReport_(row[7]))
    .filter(report => (
      report &&
      normalizeEmail_(report.authorizedEmail || report.email) === user.email &&
      (!year || Number(report.year) === year) &&
      (!quarter || String(report.quarter || "") === quarter)
    ));

  return records.length ? records : rebuildReportsFromSheets_(user, year, quarter);
}

function rebuildReportsFromSheets_(user, year, quarter) {
  const reports = {};

  collectNewDonors_(reports, user, year, quarter);
  collectDonorSuccesses_(reports, user, year, quarter);
  collectRejectedDonors_(reports, user, year, quarter);
  collectProcedures_(reports, user, year, quarter);

  return Object.keys(reports).map(id => reports[id]);
}

function getBaseReport_(reports, row, reportId, authorizedEmail) {
  if (!reports[reportId]) {
    reports[reportId] = {
      id: reportId,
      savedAt: "",
      mode: "quarterly",
      authorizedEmail,
      institution: row[0] || "",
      nit: row[1] || "",
      responsibleName: row[2] || "",
      responsibleRole: row[3] || "",
      email: row[4] || "",
      phone: row[5] || "",
      year: Number(row[6] || 0),
      quarter: row[7] || "",
      newDonors: [],
      donorSuccesses: [],
      rejectedDonors: [],
      procedures: {
        fiv: 0,
        icsi: 0,
        vitrification: 0,
        embryoTransfer: 0,
        iiuIa: 0,
        otherProcedures: 0
      }
    };
  }

  return reports[reportId];
}

function collectNewDonors_(reports, user, year, quarter) {
  getDataRows_(SHEETS.newDonors, 12).forEach(row => {
    const reportId = String(row[10] || "").trim();
    const authorizedEmail = normalizeEmail_(row[11]);

    if (!shouldCollectRow_(reportId, authorizedEmail, row[6], row[7], user, year, quarter)) return;

    const report = getBaseReport_(reports, row, reportId, authorizedEmail);

    report.newDonors.push({
      donorCode: row[8] || "",
      freezeDate: row[9] || ""
    });
  });
}

function collectDonorSuccesses_(reports, user, year, quarter) {
  getDataRows_(SHEETS.donorSuccesses, 12).forEach(row => {
    const reportId = String(row[10] || "").trim();
    const authorizedEmail = normalizeEmail_(row[11]);

    if (!shouldCollectRow_(reportId, authorizedEmail, row[6], row[7], user, year, quarter)) return;

    const report = getBaseReport_(reports, row, reportId, authorizedEmail);

    report.donorSuccesses.push({
      donorCode: row[8] || "",
      successes: row[9] || ""
    });
  });
}

function collectRejectedDonors_(reports, user, year, quarter) {
  getDataRows_(SHEETS.rejectedDonors, 12).forEach(row => {
    const reportId = String(row[10] || "").trim();
    const authorizedEmail = normalizeEmail_(row[11]);

    if (!shouldCollectRow_(reportId, authorizedEmail, row[6], row[7], user, year, quarter)) return;

    const report = getBaseReport_(reports, row, reportId, authorizedEmail);

    report.rejectedDonors.push({
      donorCode: row[8] || "",
      cause: row[9] || ""
    });
  });
}

function collectProcedures_(reports, user, year, quarter) {
  getDataRows_(SHEETS.procedures, 16).forEach(row => {
    const reportId = String(row[14] || "").trim();
    const authorizedEmail = normalizeEmail_(row[15]);

    if (!shouldCollectRow_(reportId, authorizedEmail, row[6], row[7], user, year, quarter)) return;

    const report = getBaseReport_(reports, row, reportId, authorizedEmail);

    report.procedures = {
      fiv: number_(row[8]),
      icsi: number_(row[9]),
      vitrification: number_(row[10]),
      embryoTransfer: number_(row[11]),
      iiuIa: number_(row[12]),
      otherProcedures: number_(row[13])
    };
  });
}

function getDataRows_(sheetName, columnCount) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, columnCount)
    .getDisplayValues();
}

function shouldCollectRow_(reportId, authorizedEmail, rowYear, rowQuarter, user, year, quarter) {
  return Boolean(
    reportId &&
    authorizedEmail === user.email &&
    (!year || Number(rowYear) === year) &&
    (!quarter || String(rowQuarter || "") === quarter)
  );
}

function findReport_(reportId) {
  const sheet = getOrCreateSheet_(SHEETS.index, INDEX_HEADERS);

  if (sheet.getLastRow() < 2) {
    return null;
  }

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, INDEX_HEADERS.length)
    .getValues();

  for (let index = 0; index < values.length; index++) {
    if (String(values[index][0]) === String(reportId)) {
      return parseReport_(values[index][7]);
    }
  }

  return null;
}

function deleteReport_(reportId, user) {
  if (!reportId) {
    throw new Error("No se recibio el registro a eliminar.");
  }

  const report = findReport_(reportId);

  if (!report || normalizeEmail_(report.authorizedEmail || report.email) !== user.email) {
    throw new Error("No tienes permiso para eliminar este registro o ya no existe.");
  }

  deleteRowsByReportId_(SHEETS.index, 1, reportId);
  deleteRowsByReportId_(SHEETS.newDonors, 11, reportId);
  deleteRowsByReportId_(SHEETS.donorSuccesses, 11, reportId);
  deleteRowsByReportId_(SHEETS.rejectedDonors, 11, reportId);
  deleteRowsByReportId_(SHEETS.procedures, 15, reportId);

  return jsonOutput({
    success: true,
    message: "Registro eliminado correctamente."
  });
}

function deleteRowsByReportId_(sheetName, reportIdColumn, reportId) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    return;
  }

  const values = sheet
    .getRange(2, reportIdColumn, sheet.getLastRow() - 1, 1)
    .getDisplayValues();

  for (let index = values.length - 1; index >= 0; index--) {
    if (String(values[index][0]) === String(reportId)) {
      sheet.deleteRow(index + 2);
    }
  }
}

function updatePayloadOnly_(report, user) {
  if (!report || !report.id) {
    throw new Error("No se recibio el reporte a actualizar.");
  }

  const sheet = getOrCreateSheet_(SHEETS.index, INDEX_HEADERS);

  if (sheet.getLastRow() < 2) {
    throw new Error("No existe el reporte a actualizar.");
  }

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, INDEX_HEADERS.length)
    .getValues();

  for (let index = 0; index < values.length; index++) {
    const rowReportId = String(values[index][0]);
    const rowPayload = parseReport_(values[index][7]);

    if (rowReportId === String(report.id)) {
      if (!rowPayload || normalizeEmail_(rowPayload.authorizedEmail || rowPayload.email) !== user.email) {
        throw new Error("No tienes permiso para editar este registro.");
      }

      const normalizedReport = Object.assign({}, rowPayload, report, {
        id: rowPayload.id,
        savedAt: new Date().toISOString(),
        authorizedEmail: user.email,
        institution: report.institution || rowPayload.institution || user.institution,
        nit: report.nit || rowPayload.nit || user.nit,
        email: report.email || rowPayload.email || user.email,
        phone: normalizePhone_(report.phone || rowPayload.phone || user.phone)
      });

      const targetRow = index + 2;

      sheet
        .getRange(targetRow, 2, 1, 7)
        .setValues([[
          new Date(),
          normalizedReport.authorizedEmail || "",
          normalizedReport.institution || "",
          normalizedReport.nit || "",
          normalizedReport.year || "",
          normalizedReport.quarter || "",
          JSON.stringify(normalizedReport)
        ]]);

      return jsonOutput({
        success: true,
        message: "Reporte actualizado correctamente.",
        reportId: normalizedReport.id
      });
    }
  }

  throw new Error("No se encontro el reporte a actualizar.");
}

function updateItemAndSheet_(payload, user) {
  const report = payload.report || {};
  const section = payload.section;
  const itemIndex = Number(payload.itemIndex);
  const itemData = payload.itemData || {};

  if (!report.id) {
    throw new Error("No se recibio el ID del reporte.");
  }

  if (!section || isNaN(itemIndex)) {
    throw new Error("No se recibio la seccion o el indice del registro.");
  }

  const currentReport = findReport_(report.id);

  if (!currentReport) {
    throw new Error("No se encontro el reporte.");
  }

  if (normalizeEmail_(currentReport.authorizedEmail || currentReport.email) !== user.email) {
    throw new Error("No tienes permiso para editar este registro.");
  }

  if (!currentReport[section] || !currentReport[section][itemIndex]) {
    throw new Error("No se encontro el item dentro del reporte.");
  }

  currentReport[section][itemIndex] = itemData;
  currentReport.savedAt = new Date().toISOString();

  updateIndexPayload_(currentReport, user);
  updateDetailSheetItem_(currentReport, section, itemIndex, itemData);

  return jsonOutput({
    success: true,
    message: "Registro actualizado correctamente.",
    reportId: currentReport.id
  });
}

function deleteItemAndSheet_(payload, user) {
  const report = payload.report || {};
  const section = payload.section;
  const itemIndex = Number(payload.itemIndex);

  if (!report.id) {
    throw new Error("No se recibio el ID del reporte.");
  }

  if (!section || isNaN(itemIndex)) {
    throw new Error("No se recibio la seccion o el indice del registro.");
  }

  const currentReport = findReport_(report.id);

  if (!currentReport) {
    throw new Error("No se encontro el reporte.");
  }

  if (normalizeEmail_(currentReport.authorizedEmail || currentReport.email) !== user.email) {
    throw new Error("No tienes permiso para editar este registro.");
  }

  if (!currentReport[section] || !currentReport[section][itemIndex]) {
    throw new Error("No se encontro el item dentro del reporte.");
  }

  currentReport[section].splice(itemIndex, 1);
  currentReport.savedAt = new Date().toISOString();

  updateIndexPayload_(currentReport, user);
  deleteDetailSheetItem_(currentReport, section, itemIndex);

  return jsonOutput({
    success: true,
    message: "Registro eliminado correctamente.",
    reportId: currentReport.id
  });
}

function updateIndexPayload_(report, user) {
  const sheet = getOrCreateSheet_(SHEETS.index, INDEX_HEADERS);

  if (sheet.getLastRow() < 2) {
    throw new Error("No existe el reporte en APP_REGISTROS.");
  }

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, INDEX_HEADERS.length)
    .getValues();

  for (let index = 0; index < values.length; index++) {
    const rowReportId = String(values[index][0]);

    if (rowReportId === String(report.id)) {
      const targetRow = index + 2;

      sheet
        .getRange(targetRow, 2, 1, 7)
        .setValues([[
          new Date(),
          user.email,
          report.institution || "",
          report.nit || "",
          report.year || "",
          report.quarter || "",
          JSON.stringify(report)
        ]]);

      return;
    }
  }

  throw new Error("No se encontro el reporte en APP_REGISTROS.");
}

function updateDetailSheetItem_(report, section, itemIndex, itemData) {
  const config = getSectionSheetConfig_(section);
  const sheet = getSheet_(config.sheetName);

  ensureExtraHeaders_(sheet);

  if (sheet.getLastRow() < 2) {
    throw new Error("La hoja detallada no tiene registros.");
  }

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 12)
    .getDisplayValues();

  let currentIndex = -1;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rowReportId = String(row[10] || "").trim();
    const rowEmail = normalizeEmail_(row[11]);

    if (rowReportId === String(report.id) && rowEmail === normalizeEmail_(report.authorizedEmail || report.email)) {
      currentIndex++;

      if (currentIndex === itemIndex) {
        const targetRow = i + 2;

        sheet
          .getRange(targetRow, 1, 1, 12)
          .setValues([config.buildRow(report, itemData)]);

        return;
      }
    }
  }

  throw new Error("No se encontro la fila detallada para actualizar.");
}

function deleteDetailSheetItem_(report, section, itemIndex) {
  const config = getSectionSheetConfig_(section);
  const sheet = getSheet_(config.sheetName);

  ensureExtraHeaders_(sheet);

  if (sheet.getLastRow() < 2) {
    throw new Error("La hoja detallada no tiene registros.");
  }

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 12)
    .getDisplayValues();

  let currentIndex = -1;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rowReportId = String(row[10] || "").trim();
    const rowEmail = normalizeEmail_(row[11]);

    if (rowReportId === String(report.id) && rowEmail === normalizeEmail_(report.authorizedEmail || report.email)) {
      currentIndex++;

      if (currentIndex === itemIndex) {
        sheet.deleteRow(i + 2);
        return;
      }
    }
  }

  throw new Error("No se encontro la fila detallada para eliminar.");
}

function getSectionSheetConfig_(section) {
  if (section === "newDonors") {
    return {
      sheetName: SHEETS.newDonors,
      buildRow: function(report, item) {
        return [
          report.institution || "",
          report.nit || "",
          report.responsibleName || "",
          report.responsibleRole || "",
          report.email || "",
          report.phone || "",
          report.year || "",
          report.quarter || "",
          item.donorCode || "",
          item.freezeDate || "",
          report.id,
          report.authorizedEmail || ""
        ];
      }
    };
  }

  if (section === "donorSuccesses") {
    return {
      sheetName: SHEETS.donorSuccesses,
      buildRow: function(report, item) {
        return [
          report.institution || "",
          report.nit || "",
          report.responsibleName || "",
          report.responsibleRole || "",
          report.email || "",
          report.phone || "",
          report.year || "",
          report.quarter || "",
          item.donorCode || "",
          item.successes || "",
          report.id,
          report.authorizedEmail || ""
        ];
      }
    };
  }

  if (section === "rejectedDonors") {
    return {
      sheetName: SHEETS.rejectedDonors,
      buildRow: function(report, item) {
        return [
          report.institution || "",
          report.nit || "",
          report.responsibleName || "",
          report.responsibleRole || "",
          report.email || "",
          report.phone || "",
          report.year || "",
          report.quarter || "",
          item.donorCode || "",
          item.cause || "",
          report.id,
          report.authorizedEmail || ""
        ];
      }
    };
  }

  throw new Error("Seccion no soportada: " + section);
}

function getDirectory_() {
  const sheet = getSheet_(SHEETS.inventory);
  const lastRow = sheet.getLastRow();

  if (lastRow < 3) {
    return [];
  }

  return sheet
    .getRange(3, 1, lastRow - 2, 9)
    .getDisplayValues()
    .filter(row => row[1])
    .map(row => ({
      number: row[0],
      institution: row[1],
      nit: row[2],
      legalRepresentative: row[3],
      email: row[4],
      address: row[5],
      phone: row[6],
      authorizedEmail: row[7]
    }));
}

function authenticate_(email, password) {
  const normalizedEmail = normalizeEmail_(email);
  const normalizedPassword = String(password || "").trim();

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error("Ingresa correo y contrasena.");
  }

  const sheet = getSheet_(SHEETS.inventory);

  if (sheet.getLastRow() < 3) {
    throw new Error("No hay usuarios autorizados en INVENTARIO.");
  }

  const values = sheet
    .getRange(3, 1, sheet.getLastRow() - 2, 9)
    .getDisplayValues();

  for (let index = 0; index < values.length; index++) {
    const row = values[index];
    const authorizedEmail = normalizeEmail_(row[7] || row[4]);
    const storedPassword = String(row[8] || "").trim();

    if (authorizedEmail === normalizedEmail && storedPassword === normalizedPassword) {
      return {
        email: authorizedEmail,
        institution: row[1] || "",
        nit: row[2] || "",
        contactEmail: row[4] || "",
        phone: row[6] || ""
      };
    }
  }

  throw new Error("Correo o contrasena incorrectos.");
}

function ensureExtraHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet
    .getRange(1, 1, 1, Math.max(lastColumn, 1))
    .getDisplayValues()[0];

  if (headers.includes(EXTRA_HEADERS[0])) {
    const reportIdColumn = headers.indexOf(EXTRA_HEADERS[0]) + 1;

    if (reportIdColumn > 0) {
      sheet.hideColumns(reportIdColumn, EXTRA_HEADERS.length);
    }

    return;
  }

  sheet
    .getRange(1, lastColumn + 1, 1, EXTRA_HEADERS.length)
    .setValues([EXTRA_HEADERS]);

  sheet.hideColumns(lastColumn + 1, EXTRA_HEADERS.length);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`No existe la hoja ${sheetName}.`);
  }

  return sheet;
}

function getOrCreateSheet_(sheetName, headers) {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  if (sheetName === SHEETS.index) {
    sheet.hideSheet();
  }

  return sheet;
}

function parseReport_(value) {
  try {
    return JSON.parse(String(value || "{}"));
  } catch (error) {
    return null;
  }
}

function normalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone_(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidPhone_(value) {
  const phone = normalizePhone_(value);
  return /^\d{7}$/.test(phone) || /^\d{10}$/.test(phone);
}

function validateNumericFields_(report) {
  const procedureKeys = ["fiv", "icsi", "vitrification", "embryoTransfer", "iiuIa", "otherProcedures"];
  const procedures = report.procedures || {};

  for (let i = 0; i < procedureKeys.length; i++) {
    const key = procedureKeys[i];
    const raw = String(procedures[key] ?? "").trim();
    if (raw && !/^\d+$/.test(raw)) {
      throw new Error("Los procedimientos solo admiten numeros enteros.");
    }
  }

  const successes = report.donorSuccesses || [];
  for (let j = 0; j < successes.length; j++) {
    const rawSuccess = String(successes[j].successes ?? "").trim();
    if (rawSuccess && !/^\d+$/.test(rawSuccess)) {
      throw new Error("El campo exitos solo admite numeros enteros.");
    }
  }
}

function number_(value) {
  return Number(value || 0);
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
