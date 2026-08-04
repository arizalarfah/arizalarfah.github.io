(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ResearchUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function parseSheetRows(values) {
    if (!Array.isArray(values)) return [];
    return values
      .map(function (row) {
        row = row || [];
        return {
          article: String(row[0] || '').trim(),
          journal: String(row[1] || '').trim(),
          year: parseInt(row[2], 10),
        };
      })
      .filter(function (entry) {
        return entry.article && entry.journal && !isNaN(entry.year);
      });
  }

  function sortByYearDesc(entries) {
    return entries.slice().sort(function (a, b) {
      return b.year - a.year;
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildTableRowsHtml(entries) {
    return entries
      .map(function (entry) {
        return (
          '<tr><td>' +
          escapeHtml(entry.article) +
          '</td><td>' +
          escapeHtml(entry.journal) +
          '</td><td>' +
          escapeHtml(String(entry.year)) +
          '</td></tr>'
        );
      })
      .join('');
  }

  function buildCardsHtml(entries) {
    return entries
      .map(function (entry) {
        return (
          '<div class="research-card">' +
          '<div class="research-card-header">' +
          '<span class="research-card-title">' +
          escapeHtml(entry.article) +
          '</span>' +
          '<span class="research-card-year">' +
          escapeHtml(String(entry.year)) +
          '</span>' +
          '</div>' +
          '<div class="research-card-journal">' +
          escapeHtml(entry.journal) +
          '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  return {
    parseSheetRows: parseSheetRows,
    sortByYearDesc: sortByYearDesc,
    escapeHtml: escapeHtml,
    buildTableRowsHtml: buildTableRowsHtml,
    buildCardsHtml: buildCardsHtml,
  };
});
