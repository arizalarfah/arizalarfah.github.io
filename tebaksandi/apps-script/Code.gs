/**
 * Tebak Sandi — Google Apps Script Web App
 *
 * Records session start/finish events from the Tebak Sandi game into the
 * "peserta" tab of this spreadsheet (the spreadsheet's file name is
 * "tebaksandi", but the data tab itself is named "peserta" — confirmed via
 * the Sheets API on 2026-08-17, spreadsheet.sheets[].properties.title):
 *   https://docs.google.com/spreadsheets/d/1qdsGzZsu9G3eGjpKT4kut_l6VnzRpMNYvcH-G2XvtIM
 *
 * Columns (row 1 header already exists): Nama | sesi_mulai | sesi_selesai
 *
 * How it's called from the game (tebaksandi/js/app.js, logSessionEvent()):
 *   - action: "start"  -> appends a new row [nama, sesi_mulai, ""]
 *   - action: "finish" -> finds the row matching {nama, sesi_mulai} and
 *                         fills in sesi_selesai
 *
 * The request is sent with mode:"no-cors", so this script's response is
 * never read by the browser — logging is fire-and-forget and never blocks
 * or breaks gameplay if it fails.
 *
 * ---- Deployment steps ----
 * 1. Open the spreadsheet, then Extensions > Apps Script.
 * 2. Delete any placeholder code in Code.gs and paste this file's contents.
 * 3. Click Deploy > New deployment.
 * 4. Select type: "Web app".
 * 5. Execute as: "Me" (your account).
 * 6. Who has access: "Anyone" (required — the game runs in visitors'
 *    browsers with no Google login, so it must be able to call this
 *    without auth).
 * 7. Click Deploy, authorize the requested permissions when prompted.
 * 8. Copy the "Web app URL" it gives you (ends in /exec).
 * 9. Send that URL back — it goes into SHEET_WEBHOOK_URL in
 *    tebaksandi/js/app.js.
 *
 * If you ever edit this script after deploying, use Deploy > Manage
 * deployments > (pencil icon) > New version, so the same /exec URL picks
 * up the change — creating a brand new deployment gives a different URL.
 */

var SHEET_NAME = 'peserta';

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = JSON.parse(e.postData.contents);

  if (data.action === 'start') {
    sheet.appendRow([data.nama || '', data.sesi_mulai || '', '']);
  } else if (data.action === 'finish') {
    var values = sheet.getDataRange().getValues();
    // Search from the bottom so the most recent matching session (in case
    // of a duplicate name) gets updated, and skip row 0 (the header row).
    for (var i = values.length - 1; i >= 1; i--) {
      if (values[i][0] === data.nama && values[i][1] === data.sesi_mulai) {
        sheet.getRange(i + 1, 3).setValue(data.sesi_selesai || '');
        break;
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
