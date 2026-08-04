const test = require('node:test');
const assert = require('node:assert');
const ResearchUtils = require('../assets/js/research-utils.js');

test('parseSheetRows keeps well-formed rows and drops invalid ones', () => {
  const values = [
    ['SafeUSB: Keystroke Monitoring', 'ICoCICs 2025', '2025'],
    ['', 'Missing article', '2024'],
    ['Missing year', 'Some Journal', ''],
    ['Missing journal', '', '2023'],
    ['Non numeric year', 'Some Journal', 'not-a-year'],
  ];
  const result = ResearchUtils.parseSheetRows(values);
  assert.strictEqual(result.length, 1);
  assert.deepStrictEqual(result[0], {
    article: 'SafeUSB: Keystroke Monitoring',
    journal: 'ICoCICs 2025',
    year: 2025,
  });
});

test('sortByYearDesc orders newest first without mutating input', () => {
  const input = [
    { article: 'A', journal: 'J1', year: 2021 },
    { article: 'B', journal: 'J2', year: 2025 },
    { article: 'C', journal: 'J3', year: 2023 },
  ];
  const sorted = ResearchUtils.sortByYearDesc(input);
  assert.deepStrictEqual(sorted.map((e) => e.year), [2025, 2023, 2021]);
  assert.strictEqual(input[0].year, 2021, 'input array must not be mutated');
});

test('escapeHtml neutralizes markup-significant characters', () => {
  const raw = `<script>alert("x")</script> & 'quote'`;
  const escaped = ResearchUtils.escapeHtml(raw);
  assert.strictEqual(
    escaped,
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quote&#39;'
  );
});

test('buildTableRowsHtml renders one escaped <tr> per entry', () => {
  const entries = [{ article: '<b>Title</b>', journal: 'J & K', year: 2025 }];
  const html = ResearchUtils.buildTableRowsHtml(entries);
  assert.strictEqual(
    html,
    '<tr><td>&lt;b&gt;Title&lt;/b&gt;</td><td>J &amp; K</td><td>2025</td></tr>'
  );
});

test('buildCardsHtml renders one escaped research-card per entry', () => {
  const entries = [{ article: 'Title', journal: 'J & K', year: 2025 }];
  const html = ResearchUtils.buildCardsHtml(entries);
  assert.strictEqual(
    html,
    '<div class="research-card"><div class="research-card-header"><span class="research-card-title">Title</span><span class="research-card-year">2025</span></div><div class="research-card-journal">J &amp; K</div></div>'
  );
});
