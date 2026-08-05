(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SheetTableUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function parseSheetRows(values, fields, sortField) {
    if (!Array.isArray(values)) return [];
    return values
      .map(function (row) {
        row = row || [];
        var entry = {};
        for (var i = 0; i < fields.length; i++) {
          entry[fields[i]] = String(row[i] || '').trim();
        }
        return entry;
      })
      .filter(function (entry) {
        for (var i = 0; i < fields.length; i++) {
          if (!entry[fields[i]]) return false;
        }
        if (sortField && isNaN(parseInt(entry[sortField], 10))) return false;
        return true;
      });
  }

  function sortByFieldDesc(entries, field) {
    return entries.slice().sort(function (a, b) {
      return parseInt(b[field], 10) - parseInt(a[field], 10);
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

  function buildTableRowsHtml(entries, columnOrder) {
    return entries
      .map(function (entry) {
        var cells = columnOrder
          .map(function (field) {
            return '<td>' + escapeHtml(entry[field]) + '</td>';
          })
          .join('');
        return '<tr>' + cells + '</tr>';
      })
      .join('');
  }

  function buildCardsHtml(entries, cardConfig) {
    return entries
      .map(function (entry) {
        var badgeHtml = cardConfig.badgeField
          ? '<span class="sheet-card-badge">' + escapeHtml(entry[cardConfig.badgeField]) + '</span>'
          : '';
        var subtitlesHtml = cardConfig.subtitleFields
          .map(function (field) {
            return '<div class="sheet-card-subtitle">' + escapeHtml(entry[field]) + '</div>';
          })
          .join('');
        return (
          '<div class="sheet-card">' +
          '<div class="sheet-card-header">' +
          '<span class="sheet-card-title">' +
          escapeHtml(entry[cardConfig.titleField]) +
          '</span>' +
          badgeHtml +
          '</div>' +
          subtitlesHtml +
          '</div>'
        );
      })
      .join('');
  }

  return {
    parseSheetRows: parseSheetRows,
    sortByFieldDesc: sortByFieldDesc,
    escapeHtml: escapeHtml,
    buildTableRowsHtml: buildTableRowsHtml,
    buildCardsHtml: buildCardsHtml,
  };
});
