var SHEET_NAME = '';
var DUPLICATE_COLUMN = 39;
var REPORT_DATE_COLUMN = 2;
var TOTAL_COLUMNS = 58;

function doGet() {
  return jsonResponse({ ok: true, message: 'Formulario 1C Apps Script activo.' });
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

    var sheet = getTargetSheet_();
    if (isDuplicate_(sheet, projectName, reportDate)) {
      return jsonResponse({ ok: false, duplicate: true, message: 'Ya existe un avance para ese proyecto en la misma semana de reporte.' }, 409);
    }

    rowValues[0] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
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
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('No se encontro una hoja activa. Publica este script vinculado al spreadsheet de destino o adapta el codigo para abrir por ID.');
  }

  if (SHEET_NAME) {
    var namedSheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!namedSheet) {
      throw new Error('No existe la hoja configurada en SHEET_NAME.');
    }
    return namedSheet;
  }

  return spreadsheet.getSheets()[0];
}

function isDuplicate_(sheet, normalizedProjectName, reportDate) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return false;
  }

  var reportWeek = getWeekKey_(reportDate);
  var values = sheet.getRange(2, 1, lastRow - 1, Math.max(DUPLICATE_COLUMN, REPORT_DATE_COLUMN)).getValues();
  for (var index = 0; index < values.length; index += 1) {
    var currentValue = normalize_(values[index][DUPLICATE_COLUMN - 1]);
    var currentWeek = getWeekKey_(values[index][REPORT_DATE_COLUMN - 1]);
    if (currentValue && currentValue === normalizedProjectName && currentWeek === reportWeek) {
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

function getWeekKey_(value) {
  var date = parseDate_(value) || new Date();
  var weekDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  var day = weekDate.getUTCDay() || 7;
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - day);
  var yearStart = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));
  var week = Math.ceil((((weekDate - yearStart) / 86400000) + 1) / 7);
  return weekDate.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
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
