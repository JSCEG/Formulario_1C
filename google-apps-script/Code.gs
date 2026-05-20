var SHEET_NAME = 'Respuestas de formulario 1';
var SPREADSHEET_ID = '1c8uEbLdZzbq8EYHwc-NqVjhsTg6An_sKTMIRJbeBaCA';
var PROJECTS_SHEET_NAME = 'Proyectos';
var PROJECTS_NAME_COLUMN = 1;
var PROJECTS_KEY_COLUMN = 2;
var PROJECTS_ACTIVE_COLUMN = 3;
var DUPLICATE_COLUMN = 39;
var REPORT_DATE_COLUMN = 2;
var TOTAL_COLUMNS = 58;
var SCRIPT_VERSION = 'link-validation-2026-05-19-v2';

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'validate') {
    var projectName = e.parameter.projectName || '';
    var trackingKey = e.parameter.trackingKey || '';
    var isValidProjectLink = validateProjectAccess_(projectName, trackingKey);
    return jsonResponse({
      ok: isValidProjectLink,
      validProjectLink: isValidProjectLink,
      version: SCRIPT_VERSION,
      message: 'Validacion de liga de seguimiento.'
    });
  }

  return jsonResponse({ ok: true, version: SCRIPT_VERSION, message: 'Formulario 1C Apps Script activo.' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var payload = parsePayload_(e);
    var rowValues = ensureRowLength_(payload.rowValues || []);
    var projectName = normalize_(payload.projectName || rowValues[DUPLICATE_COLUMN - 1] || '');
    var reportDate = payload.reportDate || rowValues[REPORT_DATE_COLUMN - 1] || '';

    if (!projectName) {
      return jsonResponse({ ok: false, message: 'El nombre del proyecto es obligatorio.' }, 400);
    }

    if (!validateProjectAccess_(payload.projectName || rowValues[DUPLICATE_COLUMN - 1] || '', payload.trackingKey || '')) {
      return jsonResponse({ ok: false, message: 'La liga de seguimiento no es valida para este proyecto.' }, 403);
    }

    var sheet = getTargetSheet_();
    rowValues[0] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
    rowValues[DUPLICATE_COLUMN - 1] = payload.projectName || rowValues[DUPLICATE_COLUMN - 1];
    if (!rowValues[REPORT_DATE_COLUMN - 1] && reportDate) {
      rowValues[REPORT_DATE_COLUMN - 1] = reportDate;
    }
    sheet.appendRow(rowValues);

    return jsonResponse({ ok: true, message: 'Registro guardado correctamente.' });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message || 'Error no controlado al guardar el registro.' }, 500);
  } finally {
    lock.releaseLock();
  }
}

function getTargetSheet_() {
  var spreadsheet = getSpreadsheet_();

  if (SHEET_NAME) {
    var namedSheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!namedSheet) {
      throw new Error('No existe la hoja configurada en SHEET_NAME.');
    }
    return namedSheet;
  }

  var sheets = spreadsheet.getSheets();
  for (var index = 0; index < sheets.length; index += 1) {
    if (sheets[index].getName() !== PROJECTS_SHEET_NAME) {
      return sheets[index];
    }
  }

  throw new Error('No existe una hoja de seguimiento distinta a la hoja privada de proyectos.');
}

function getSpreadsheet_() {
  var spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('No se encontro la hoja de destino.');
  }
  return spreadsheet;
}

function validateProjectAccess_(projectName, trackingKey) {
  var normalizedProjectName = normalize_(projectName);
  var normalizedTrackingKey = normalizeKey_(trackingKey);
  if (!normalizedProjectName || !normalizedTrackingKey) {
    return false;
  }

  var spreadsheet = getSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(PROJECTS_SHEET_NAME);
  if (!sheet) {
    throw new Error('No existe la hoja privada de proyectos autorizados.');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return false;
  }

  var maxColumn = Math.max(PROJECTS_NAME_COLUMN, PROJECTS_KEY_COLUMN, PROJECTS_ACTIVE_COLUMN);
  var values = sheet.getRange(2, 1, lastRow - 1, maxColumn).getValues();
  for (var index = 0; index < values.length; index += 1) {
    var currentProject = normalize_(values[index][PROJECTS_NAME_COLUMN - 1]);
    var currentKey = normalizeKey_(values[index][PROJECTS_KEY_COLUMN - 1]);
    var activeValue = String(values[index][PROJECTS_ACTIVE_COLUMN - 1] || '').toLowerCase().trim();
    var isInactive = activeValue === 'no' || activeValue === 'false' || activeValue === 'inactivo';
    if (!isInactive && currentProject === normalizedProjectName && currentKey === normalizedTrackingKey) {
      return true;
    }
  }

  return false;
}

function ensureRowLength_(values) {
  var safeValues = values.slice(0, TOTAL_COLUMNS);
  while (safeValues.length < TOTAL_COLUMNS) {
    safeValues.push('');
  }
  return safeValues;
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('No se recibio informacion para guardar.');
  }
  return JSON.parse(e.postData.contents);
}

function normalize_(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function normalizeKey_(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

function parseDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return value;
  }

  var text = String(value || '').trim();
  var iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  var mx = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mx) {
    return new Date(Number(mx[3]), Number(mx[2]) - 1, Number(mx[1]));
  }

  return null;
}

function jsonResponse(payload, status) {
  var output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
