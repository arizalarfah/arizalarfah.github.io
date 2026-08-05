const test = require('node:test');
const assert = require('node:assert');
const SheetTableUtils = require('../assets/js/sheet-table-utils.js');

test('parseSheetRows keeps well-formed rows and drops invalid ones when a sortField is given', () => {
  const values = [
    ['SafeUSB: Keystroke Monitoring', 'ICoCICs 2025', '2025'],
    ['', 'Missing article', '2024'],
    ['Missing year', 'Some Journal', ''],
    ['Missing journal', '', '2023'],
    ['Non numeric year', 'Some Journal', 'not-a-year'],
  ];
  const result = SheetTableUtils.parseSheetRows(values, ['article', 'journal', 'year'], 'year');
  assert.strictEqual(result.length, 1);
  assert.deepStrictEqual(result[0], {
    article: 'SafeUSB: Keystroke Monitoring',
    journal: 'ICoCICs 2025',
    year: '2025',
  });
});

test('parseSheetRows keeps any non-empty row when no sortField is given', () => {
  const values = [
    ['Kokurikuler', 'S1', 'Universitas Fajar'],
    ['', 'S1', 'Missing course'],
    ['Struktur Data', '', 'Missing level'],
    ['Sistem Terdistribusi', 'D4', ''],
  ];
  const result = SheetTableUtils.parseSheetRows(values, ['course', 'level', 'school']);
  assert.strictEqual(result.length, 1);
  assert.deepStrictEqual(result[0], {
    course: 'Kokurikuler',
    level: 'S1',
    school: 'Universitas Fajar',
  });
});

test('sortByFieldDesc orders newest first without mutating input', () => {
  const input = [
    { article: 'A', journal: 'J1', year: '2021' },
    { article: 'B', journal: 'J2', year: '2025' },
    { article: 'C', journal: 'J3', year: '2023' },
  ];
  const sorted = SheetTableUtils.sortByFieldDesc(input, 'year');
  assert.deepStrictEqual(sorted.map((e) => e.year), ['2025', '2023', '2021']);
  assert.strictEqual(input[0].year, '2021', 'input array must not be mutated');
});

test('escapeHtml neutralizes markup-significant characters', () => {
  const raw = `<script>alert("x")</script> & 'quote'`;
  const escaped = SheetTableUtils.escapeHtml(raw);
  assert.strictEqual(
    escaped,
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quote&#39;'
  );
});

test('buildTableRowsHtml renders one escaped <tr> per entry for a 3-column table', () => {
  const entries = [{ article: '<b>Title</b>', journal: 'J & K', year: '2025' }];
  const html = SheetTableUtils.buildTableRowsHtml(entries, ['article', 'journal', 'year']);
  assert.strictEqual(
    html,
    '<tr><td>&lt;b&gt;Title&lt;/b&gt;</td><td>J &amp; K</td><td>2025</td></tr>'
  );
});

test('buildTableRowsHtml renders one escaped <tr> per entry for a 4-column table', () => {
  const entries = [{ year: '2026', training: 'A & B Training', organizer: 'KOICA', place: 'Seoul' }];
  const html = SheetTableUtils.buildTableRowsHtml(entries, ['year', 'training', 'organizer', 'place']);
  assert.strictEqual(
    html,
    '<tr><td>2026</td><td>A &amp; B Training</td><td>KOICA</td><td>Seoul</td></tr>'
  );
});

test('buildCardsHtml renders title, badge, and one subtitle line', () => {
  const entries = [{ article: 'Title', journal: 'J & K', year: '2025' }];
  const html = SheetTableUtils.buildCardsHtml(entries, {
    titleField: 'article',
    badgeField: 'year',
    subtitleFields: ['journal'],
  });
  assert.strictEqual(
    html,
    '<div class="sheet-card"><div class="sheet-card-header"><span class="sheet-card-title">Title</span><span class="sheet-card-badge">2025</span></div><div class="sheet-card-subtitle">J &amp; K</div></div>'
  );
});

test('buildCardsHtml renders two stacked subtitle lines when configured', () => {
  const entries = [{ year: '2026', training: 'Training Name', organizer: 'KOICA', place: 'Seoul' }];
  const html = SheetTableUtils.buildCardsHtml(entries, {
    titleField: 'training',
    badgeField: 'year',
    subtitleFields: ['organizer', 'place'],
  });
  assert.strictEqual(
    html,
    '<div class="sheet-card"><div class="sheet-card-header"><span class="sheet-card-title">Training Name</span><span class="sheet-card-badge">2026</span></div><div class="sheet-card-subtitle">KOICA</div><div class="sheet-card-subtitle">Seoul</div></div>'
  );
});
