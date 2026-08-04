(function () {
  var SPREADSHEET_ID = '17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc';
  var API_KEY = 'AIzaSyBlPwbtiYu7G0Na3hwK_vBTxAWnxTd98Pw';
  var RANGE = 'research!A2:C';
  var API_URL =
    'https://sheets.googleapis.com/v4/spreadsheets/' +
    SPREADSHEET_ID +
    '/values/' +
    encodeURIComponent(RANGE) +
    '?key=' +
    API_KEY;

  var LOADING_TABLE_HTML = '<tr><td colspan="3">Memuat data publikasi...</td></tr>';
  var LOADING_CARDS_HTML =
    '<div class="research-card research-card-status">Memuat data publikasi...</div>';
  var ERROR_MESSAGE = 'Gagal memuat data publikasi, silakan muat ulang halaman.';
  var EMPTY_MESSAGE = 'Belum ada data publikasi.';

  function renderLoading(tbody, cardsEl) {
    tbody.innerHTML = LOADING_TABLE_HTML;
    cardsEl.innerHTML = LOADING_CARDS_HTML;
  }

  function renderError(tbody, cardsEl) {
    tbody.innerHTML = '<tr><td colspan="3">' + ERROR_MESSAGE + '</td></tr>';
    cardsEl.innerHTML =
      '<div class="research-card research-card-status">' + ERROR_MESSAGE + '</div>';
  }

  function renderEntries(tbody, cardsEl, entries) {
    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">' + EMPTY_MESSAGE + '</td></tr>';
      cardsEl.innerHTML =
        '<div class="research-card research-card-status">' + EMPTY_MESSAGE + '</div>';
      return;
    }
    tbody.innerHTML = window.ResearchUtils.buildTableRowsHtml(entries);
    cardsEl.innerHTML = window.ResearchUtils.buildCardsHtml(entries);
  }

  function init() {
    var tbody = document.getElementById('research-table-body');
    var cardsEl = document.getElementById('research-cards');
    if (!tbody || !cardsEl) return;

    renderLoading(tbody, cardsEl);

    fetch(API_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('Sheets API error: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var entries = window.ResearchUtils.parseSheetRows(data.values || []);
        var sorted = window.ResearchUtils.sortByYearDesc(entries);
        renderEntries(tbody, cardsEl, sorted);
      })
      .catch(function (err) {
        if (window.console) console.error('research-table:', err);
        renderError(tbody, cardsEl);
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
