(function () {
  var SPREADSHEET_ID = '17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc';
  var API_KEY = 'AIzaSyBlPwbtiYu7G0Na3hwK_vBTxAWnxTd98Pw';

  var CONFIGS = [
    {
      key: 'research',
      spreadsheetId: SPREADSHEET_ID,
      apiKey: API_KEY,
      range: 'research!A2:C',
      fields: ['article', 'journal', 'year'],
      sortField: 'year',
      tableBodyId: 'research-table-body',
      cardsContainerId: 'research-cards',
      tableColumnOrder: ['article', 'journal', 'year'],
      card: { titleField: 'article', badgeField: 'year', subtitleFields: ['journal'] },
      loadingMessage: 'Memuat data publikasi...',
      emptyMessage: 'Belum ada data publikasi.',
      errorMessage: 'Gagal memuat data publikasi, silakan muat ulang halaman.',
    },
    {
      key: 'training',
      spreadsheetId: SPREADSHEET_ID,
      apiKey: API_KEY,
      range: 'training!A2:D',
      fields: ['year', 'training', 'organizer', 'place'],
      sortField: 'year',
      tableBodyId: 'training-table-body',
      cardsContainerId: 'training-cards',
      tableColumnOrder: ['year', 'training', 'organizer', 'place'],
      card: { titleField: 'training', badgeField: 'year', subtitleFields: ['organizer', 'place'] },
      loadingMessage: 'Memuat data training...',
      emptyMessage: 'Belum ada data training.',
      errorMessage: 'Gagal memuat data training, silakan muat ulang halaman.',
    },
    {
      key: 'teaching',
      spreadsheetId: SPREADSHEET_ID,
      apiKey: API_KEY,
      range: 'teaching!A2:C',
      fields: ['course', 'level', 'school'],
      sortField: null,
      tableBodyId: 'teaching-table-body',
      cardsContainerId: 'teaching-cards',
      tableColumnOrder: ['course', 'level', 'school'],
      card: { titleField: 'course', badgeField: 'level', subtitleFields: ['school'] },
      loadingMessage: 'Memuat data teaching experience...',
      emptyMessage: 'Belum ada data teaching experience.',
      errorMessage: 'Gagal memuat data teaching experience, silakan muat ulang halaman.',
    },
    {
      key: 'books',
      spreadsheetId: SPREADSHEET_ID,
      apiKey: API_KEY,
      range: 'books!A2:C',
      fields: ['title', 'publisher', 'year'],
      sortField: 'year',
      tableBodyId: 'books-table-body',
      cardsContainerId: 'books-cards',
      tableColumnOrder: ['title', 'publisher', 'year'],
      card: { titleField: 'title', badgeField: 'year', subtitleFields: ['publisher'] },
      loadingMessage: 'Memuat data buku...',
      emptyMessage: 'Belum ada data buku.',
      errorMessage: 'Gagal memuat data buku, silakan muat ulang halaman.',
    },
    {
      key: 'ipr',
      spreadsheetId: SPREADSHEET_ID,
      apiKey: API_KEY,
      range: 'ipr!A2:C',
      fields: ['title', 'publisher', 'year'],
      sortField: 'year',
      tableBodyId: 'ipr-table-body',
      cardsContainerId: 'ipr-cards',
      tableColumnOrder: ['title', 'publisher', 'year'],
      card: { titleField: 'title', badgeField: 'year', subtitleFields: ['publisher'] },
      loadingMessage: 'Memuat data IPR...',
      emptyMessage: 'Belum ada data IPR.',
      errorMessage: 'Gagal memuat data IPR, silakan muat ulang halaman.',
    },
  ];

  document.addEventListener('DOMContentLoaded', function () {
    CONFIGS.forEach(function (config) {
      window.SheetTable.init(config);
    });
  });
})();
