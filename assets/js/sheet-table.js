(function () {
  function renderStatus(tbody, cardsEl, colspan, message) {
    tbody.innerHTML = '<tr><td colspan="' + colspan + '">' + message + '</td></tr>';
    cardsEl.innerHTML = '<div class="sheet-card sheet-card-status">' + message + '</div>';
  }

  function renderEntries(tbody, cardsEl, entries, config) {
    if (entries.length === 0) {
      renderStatus(tbody, cardsEl, config.tableColumnOrder.length, config.emptyMessage);
      return;
    }
    tbody.innerHTML = window.SheetTableUtils.buildTableRowsHtml(entries, config.tableColumnOrder);
    cardsEl.innerHTML = window.SheetTableUtils.buildCardsHtml(entries, config.card);
  }

  function init(config) {
    var tbody = document.getElementById(config.tableBodyId);
    var cardsEl = document.getElementById(config.cardsContainerId);
    if (!tbody || !cardsEl) return;

    var apiUrl =
      'https://sheets.googleapis.com/v4/spreadsheets/' +
      config.spreadsheetId +
      '/values/' +
      encodeURIComponent(config.range) +
      '?key=' +
      config.apiKey;

    renderStatus(tbody, cardsEl, config.tableColumnOrder.length, config.loadingMessage);

    fetch(apiUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Sheets API error: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var entries = window.SheetTableUtils.parseSheetRows(
          data.values || [],
          config.fields,
          config.sortField
        );
        if (config.sortField) {
          entries = window.SheetTableUtils.sortByFieldDesc(entries, config.sortField);
        }
        renderEntries(tbody, cardsEl, entries, config);
      })
      .catch(function (err) {
        if (window.console) console.error('sheet-table[' + config.key + ']:', err);
        renderStatus(tbody, cardsEl, config.tableColumnOrder.length, config.errorMessage);
      });
  }

  window.SheetTable = { init: init };
})();
