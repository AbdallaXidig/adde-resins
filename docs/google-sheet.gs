/**
 * Adde General: lead tracking sheet.
 *
 * Paste this into Extensions > Apps Script of your Google Sheet, set SECRET to the same value as
 * SHEET_WEBHOOK_SECRET on the website, then Deploy > New deployment > Web app
 * (Execute as: Me, Who has access: Anyone). Put the web app URL in SHEET_WEBHOOK_URL.
 * Full steps: docs/GOOGLE-SHEET.md
 */
const SECRET = 'PASTE-THE-SAME-SECRET-AS-SHEET_WEBHOOK_SECRET';
const SHEET_NAME = 'Quotations';

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'Invalid JSON' });
  }
  if (!SECRET || body.secret !== SECRET) return reply({ ok: false, error: 'Wrong secret' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
    const headers = ensureHeaders(sheet, body.headers || Object.keys(body.row || {}));
    const row = body.row || {};
    // Values starting with = + - @ are stored as text so they are never run as formulas.
    const values = headers.map(function (h) {
      const v = row[h] === undefined || row[h] === null ? '' : row[h];
      return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
    });

    // Resending a reference updates its existing row instead of adding a duplicate.
    const refCol = headers.indexOf('Reference') + 1;
    let target = 0;
    if (refCol > 0 && row.Reference && sheet.getLastRow() > 1) {
      const found = sheet.getRange(2, refCol, sheet.getLastRow() - 1, 1)
        .createTextFinder(String(row.Reference)).matchEntireCell(true).findNext();
      if (found) target = found.getRow();
    }
    if (target) sheet.getRange(target, 1, 1, values.length).setValues([values]);
    else sheet.appendRow(values);
    return reply({ ok: true, updated: !!target });
  } finally {
    lock.releaseLock();
  }
}

/** Writes the header row on first use and adds any new columns the website sends later. */
function ensureHeaders(sheet, wanted) {
  let current = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].filter(String)
    : [];
  const missing = wanted.filter(function (h) { return current.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    current = current.concat(missing);
    sheet.getRange(1, 1, 1, current.length).setFontWeight('bold').setBackground('#402313').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return current;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
