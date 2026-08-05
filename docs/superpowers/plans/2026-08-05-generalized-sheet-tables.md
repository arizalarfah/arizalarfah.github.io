# Generalized Sheet-Driven Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the existing single-purpose Google-Sheets-driven "Journal & Conference" table into a reusable, config-driven engine, migrate that table onto it, and use it to make four more tables (Training, Teaching Experience, Books, IPR) live-driven from the same spreadsheet — each with the same responsive table/card behavior, text-wrap, loading/empty/error states, and escaping guarantee already shipped.

**Architecture:** Two generic files replace the two single-purpose ones: `assets/js/sheet-table-utils.js` (pure parse/sort/escape/render-string functions, parameterized by field names instead of hardcoded `article`/`journal`/`year`) and `assets/js/sheet-table.js` (one `SheetTable.init(config)` function doing fetch → loading/error/empty/render, parameterized by DOM ids, Sheets API range, and card layout). A new `assets/js/sheet-table-configs.js` declares five config objects (one per table, including the migrated Journal & Conference) and calls `init` once per config on `DOMContentLoaded`. CSS class names `.research-card*` are renamed to the generic `.sheet-card*` family (same visual values) and the responsive breakpoint/text-wrap rules are extended to cover all five tables' wrapper ids.

**Tech Stack:** Same as the existing feature — vanilla JS (no framework/bundler), Node's built-in `node:test` runner, Sheets API v4 via `fetch()`. No new dependencies.

## Global Constraints

- Static site only — no backend, no build step.
- All five tables read from the **same spreadsheet** already live in production (id `17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc`), each from its own tab: `research`, `training`, `teaching`, `books`, `ipr`. The four new tabs already exist (created by the site owner) but are currently empty — they get populated after this plan ships, via the TSV files this plan produces.
- The same live, already-restricted API key (`AIzaSyBlPwbtiYu7G0Na3hwK_vBTxAWnxTd98Pw`) is reused for all five tables — it is not scoped per-tab, so no Google Cloud changes are needed. This key is real and already in production; it is not a placeholder.
- Every value pulled from any sheet must be HTML-escaped before DOM insertion — the shared `escapeHtml` function must be the only path any sheet-sourced text takes into the DOM (via `innerHTML` on strings it has already escaped).
- No manual `<br>` in data content — line wrapping is CSS's job (`white-space: normal` on each table's cells), not the data's.
- Responsive breakpoint stays `768px`, shared across all five tables' toggle.
- Journal & Conference's already-shipped behavior (loading/empty/error copy, sort order, escaping, responsive toggle) must be unchanged after migrating it onto the generic engine — this is a refactor, not a behavior change, for that table.
- Teaching Experience has no year-like field; its config's `sortField` must be omitted/`null` so sheet row order is preserved as-is (no sorting).
- Training has two subtitle fields (Organizer, Place) rendered as two stacked `.sheet-card-subtitle` lines, not combined into one line.
- Out of scope: retry/backoff, response caching, offline fallback, admin/editing UI, columns beyond what each table already has, pagination, fixing pre-existing content typos ("Lavel", "Fundamental Keamana Jaringan") — preserve them verbatim, they are not part of this task.

---

### Task 1: Generic parse/sort/render helpers (`sheet-table-utils.js`)

**Files:**
- Create: `assets/js/sheet-table-utils.js`
- Create: `tests/sheet-table-utils.test.js`
- Delete: `assets/js/research-utils.js`
- Delete: `tests/research-utils.test.js`

**Interfaces:**
- Consumes: nothing (pure functions, no DOM, no network).
- Produces (used by Task 2's `sheet-table.js`):
  - `SheetTableUtils.parseSheetRows(values: any[][], fields: string[], sortField?: string) => object[]` — builds one object per row keyed by `fields` (in column order), trimmed to strings. Drops a row if any field is empty. If `sortField` is given, additionally drops the row if that field doesn't parse as an integer (this preserves the original feature's "non-numeric year is dropped" behavior; when `sortField` is omitted, no such check applies).
  - `SheetTableUtils.sortByFieldDesc(entries: object[], field: string) => object[]` — new array, sorted descending by `parseInt(entry[field], 10)`.
  - `SheetTableUtils.escapeHtml(value: string) => string` — unchanged from the current `escapeHtml`.
  - `SheetTableUtils.buildTableRowsHtml(entries: object[], columnOrder: string[]) => string` — one `<tr>` per entry, one `<td>` per field in `columnOrder`, all escaped.
  - `SheetTableUtils.buildCardsHtml(entries: object[], cardConfig: {titleField: string, badgeField?: string, subtitleFields: string[]}) => string` — one `.sheet-card` div per entry: title span, optional badge span, one `.sheet-card-subtitle` div per field in `subtitleFields` (in order), all escaped.
  - Dual-exported: `module.exports` when `require()`d (Node tests), `window.SheetTableUtils` when loaded via `<script>`.

- [ ] **Step 1: Write the failing tests**

Create `tests/sheet-table-utils.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/sheet-table-utils.test.js`
Expected: fails immediately with `Cannot find module '../assets/js/sheet-table-utils.js'`.

- [ ] **Step 3: Write the implementation**

Create `assets/js/sheet-table-utils.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/sheet-table-utils.test.js`
Expected: `# pass 8`, `# fail 0`.

- [ ] **Step 5: Delete the old single-purpose files**

```bash
git rm assets/js/research-utils.js tests/research-utils.test.js
```

- [ ] **Step 6: Confirm the only remaining reference is the one Task 5 will fix**

Run: `grep -rn "research-utils" index.html assets/ tests/ 2>/dev/null`
Expected: exactly one match, `index.html`'s `<script src="assets/js/research-utils.js">` tag — Task 5 updates that line separately. No matches should appear anywhere under `assets/` or `tests/` (the files themselves are already deleted by Step 5 above).

- [ ] **Step 7: Commit**

```bash
git add assets/js/sheet-table-utils.js tests/sheet-table-utils.test.js
git commit -m "Generalize research-utils.js into reusable sheet-table-utils.js"
```

---

### Task 2: Generic fetch/render engine (`sheet-table.js`)

**Files:**
- Create: `assets/js/sheet-table.js`
- Delete: `assets/js/research-table.js`

**Interfaces:**
- Consumes: `SheetTableUtils.parseSheetRows`, `.sortByFieldDesc`, `.buildTableRowsHtml`, `.buildCardsHtml` (Task 1, must be loaded first at runtime).
- Produces (used by Task 3's `sheet-table-configs.js`): `window.SheetTable.init(config)`, where `config` is:
  ```
  {
    spreadsheetId, apiKey, range,              // Sheets API fetch target
    fields,                                    // ordered field names matching the range's columns
    sortField,                                 // field name to sort desc by, or falsy for sheet order
    tableBodyId, cardsContainerId,             // DOM mount ids (elements must already exist)
    tableColumnOrder,                          // ordered field names for <td> rendering
    card: { titleField, badgeField, subtitleFields },
    loadingMessage, emptyMessage, errorMessage, // per-table Indonesian copy
    key,                                        // short identifier used only in console.error logging
  }
  ```
  `init` does nothing (silently returns) if the config's `tableBodyId`/`cardsContainerId` don't resolve to real elements — same defensive behavior as the current `research-table.js`.

- [ ] **Step 1: Write the implementation**

Create `assets/js/sheet-table.js`:

```js
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
```

- [ ] **Step 2: Delete the old single-purpose file**

```bash
git rm assets/js/research-table.js
```

- [ ] **Step 3: Syntax check**

Run: `node --check assets/js/sheet-table.js`
Expected: no output (valid syntax). Behavioral verification happens in Task 10's end-to-end check.

- [ ] **Step 4: Commit**

```bash
git add assets/js/sheet-table.js
git commit -m "Generalize research-table.js into config-driven sheet-table.js engine"
```

---

### Task 3: Table configurations (`sheet-table-configs.js`)

**Files:**
- Create: `assets/js/sheet-table-configs.js`

**Interfaces:**
- Consumes: `window.SheetTable.init` (Task 2).
- Produces: nothing further downstream — this is the final wiring layer, calling `init` once per table on `DOMContentLoaded`.

- [ ] **Step 1: Write the implementation**

Create `assets/js/sheet-table-configs.js`:

```js
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
```

- [ ] **Step 2: Syntax check**

Run: `node --check assets/js/sheet-table-configs.js`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add assets/js/sheet-table-configs.js
git commit -m "Add sheet-table configs for research, training, teaching, books, IPR"
```

---

### Task 4: Rename and extend responsive/CSS rules

**Files:**
- Modify: `assets/css/style.css:1268-1338` (the `# Research Table Responsive` block, generalize it)

**Interfaces:**
- Consumes: nothing.
- Produces (used by Task 5-9's HTML): CSS selectors `.sheet-cards`, `.sheet-card`, `.sheet-card-header`, `.sheet-card-title`, `.sheet-card-badge`, `.sheet-card-subtitle`, `.sheet-card-status`, plus the text-wrap override and the `@media (max-width: 768px)` toggle for wrapper ids `#research-table-wrapper`, `#training-table-wrapper`, `#teaching-table-wrapper`, `#books-table-wrapper`, `#ipr-table-wrapper`.

- [ ] **Step 1: Replace the block**

In `assets/css/style.css`, find the entire block from the `# Research Table Responsive` comment header through its closing `}` (currently lines 1268-1338):

```css
/*--------------------------------------------------------------
# Research Table Responsive
--------------------------------------------------------------*/
.research-cards {
  display: none;
  padding: 8px;
}

#research-table-wrapper table td,
#research-table-wrapper table th {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

.research-card {
  background: #262626;
  border-left: 3px solid #18d26e;
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 10px;
}

.research-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.research-card-title {
  color: #eee;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.research-card-year {
  background: #18d26e;
  color: #111;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}

.research-card-journal {
  color: #aaa;
  font-size: 13px;
  font-style: italic;
  margin-top: 6px;
  line-height: 1.4;
}

.research-card-status {
  color: #ccc;
  font-style: italic;
  border-left-color: #666;
}

@media (max-width: 768px) {
  #research-table-wrapper {
    display: none;
  }

  .research-cards {
    display: block;
  }
}
```

Replace it entirely with:

```css
/*--------------------------------------------------------------
# Sheet-Driven Table Responsive
--------------------------------------------------------------*/
.sheet-cards {
  display: none;
  padding: 8px;
}

#research-table-wrapper table td,
#research-table-wrapper table th,
#training-table-wrapper table td,
#training-table-wrapper table th,
#teaching-table-wrapper table td,
#teaching-table-wrapper table th,
#books-table-wrapper table td,
#books-table-wrapper table th,
#ipr-table-wrapper table td,
#ipr-table-wrapper table th {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

.sheet-card {
  background: #262626;
  border-left: 3px solid #18d26e;
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 10px;
}

.sheet-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.sheet-card-title {
  color: #eee;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.sheet-card-badge {
  background: #18d26e;
  color: #111;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}

.sheet-card-subtitle {
  color: #aaa;
  font-size: 13px;
  font-style: italic;
  margin-top: 6px;
  line-height: 1.4;
}

.sheet-card-status {
  color: #ccc;
  font-style: italic;
  border-left-color: #666;
}

@media (max-width: 768px) {
  #research-table-wrapper,
  #training-table-wrapper,
  #teaching-table-wrapper,
  #books-table-wrapper,
  #ipr-table-wrapper {
    display: none;
  }

  .sheet-cards {
    display: block;
  }
}
```

- [ ] **Step 2: Verify no stray old class names remain**

Run: `grep -n "\.research-card\|\.research-cards" assets/css/style.css`
Expected: no output (all renamed).

Run: `grep -n "training-table-wrapper\|teaching-table-wrapper\|books-table-wrapper\|ipr-table-wrapper" assets/css/style.css`
Expected: each of the four ids appears exactly three times (`grep -c` counts matching lines: two lines in the text-wrap selector list — one for `table td`, one for `table th` — plus one line in the media query selector list).

- [ ] **Step 3: Commit**

```bash
git add assets/css/style.css
git commit -m "Rename research-card* CSS to generic sheet-card* and extend to 4 more tables"
```

---

### Task 5: Wire new scripts into `index.html` and rename Journal & Conference's inline classes

**Files:**
- Modify: `index.html` (script tags near end of `<body>`; the Journal & Conference loading-placeholder markup)

**Interfaces:**
- Consumes: `assets/js/sheet-table-utils.js` (Task 1), `assets/js/sheet-table.js` (Task 2), `assets/js/sheet-table-configs.js` (Task 3).
- Produces: nothing further downstream (this task only rewires what already exists for the already-shipped table; Tasks 6-9 add the new tables' HTML).

- [ ] **Step 1: Replace the script tags**

Find:

```html
  <script src="assets/js/main.js"></script>

  <script src="assets/js/research-utils.js"></script>
  <script src="assets/js/research-table.js"></script>
```

Replace with:

```html
  <script src="assets/js/main.js"></script>

  <script src="assets/js/sheet-table-utils.js"></script>
  <script src="assets/js/sheet-table.js"></script>
  <script src="assets/js/sheet-table-configs.js"></script>
```

- [ ] **Step 2: Rename the Journal & Conference loading-placeholder's inline classes**

Find:

```html
                <div class="research-cards" id="research-cards">
                  <div class="research-card research-card-status">Memuat data publikasi...</div>
                </div>
```

Replace with:

```html
                <div class="sheet-cards" id="research-cards">
                  <div class="sheet-card sheet-card-status">Memuat data publikasi...</div>
                </div>
```

(The `id="research-cards"` and `id="research-table-body"`/`id="research-table-wrapper"` elsewhere are unchanged — only the CSS *class* names on this element are renamed, matching Task 4's CSS rename. The `<tbody>`'s loading-placeholder `<tr>` has no class references, so it needs no change.)

- [ ] **Step 3: Verify**

Run: `grep -n "research-utils.js\|research-table.js\|sheet-table-utils.js\|sheet-table.js\|sheet-table-configs.js" index.html`
Expected: only the three new `sheet-table-*.js` script tags appear, in that order (utils, then engine, then configs) — no `research-utils.js`/`research-table.js` remain.

Run: `grep -n "class=\"research-card" index.html`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Wire sheet-table scripts and rename Journal & Conference placeholder classes"
```

---

### Task 6: Training table dynamic mount points

**Files:**
- Modify: `index.html` (the Training table inside the Resume section, currently around lines 390-495)

**Interfaces:**
- Consumes: none.
- Produces (used by Task 3's `training` config, already written, and Task 10's verification): DOM nodes `#training-table-wrapper`, `#training-table-body`, `#training-cards`.

- [ ] **Step 1: Replace the table wrapper and clear its rows**

In `index.html`, the Training table currently looks like (starting after the `<h2 class="resume-title">Training</h2>` section-title):

```html
                <div class="table-responsive table-scroll" data-mdb-perfect-scrollbar="true" style="position: relative; height: 500">
                  <table class="table table-dark mb-0">
                    <thead style="background-color: #393939;">
                      <tr class="text-uppercase text-success">
                        <th scope="col">Year</th>
                        <th scope="col">Training</th>
                        <th scope="col">Organizer</th>
                        <th scope="col">Place</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>2026</td>
                        <td>Capacity Development Project for Nurturing Cybersecurity Professionals <br>in Indonesia</td>
                        ...
```

followed by 11 more hardcoded `<tr>` blocks (12 rows total, newest 2026 down to 2019), then:

```html
                    </tbody>
                  </table>
                </div>
```

Replace the entire span from the `<div class="table-responsive...` opening tag through that matching closing `</div>` with:

```html
                <div class="table-responsive table-scroll" id="training-table-wrapper" data-mdb-perfect-scrollbar="true" style="position: relative; height: 500">
                  <table class="table table-dark mb-0">
                    <thead style="background-color: #393939;">
                      <tr class="text-uppercase text-success">
                        <th scope="col">Year</th>
                        <th scope="col">Training</th>
                        <th scope="col">Organizer</th>
                        <th scope="col">Place</th>
                      </tr>
                    </thead>
                    <tbody id="training-table-body">
                      <tr><td colspan="4">Memuat data training...</td></tr>
                    </tbody>
                  </table>
                </div>
                <div class="sheet-cards" id="training-cards">
                  <div class="sheet-card sheet-card-status">Memuat data training...</div>
                </div>
                <noscript>
                  <p class="text-center" style="padding: 12px; color: #888;">JavaScript diperlukan untuk menampilkan tabel training ini. Lihat data lengkap di <a href="https://docs.google.com/spreadsheets/d/17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc/edit" target="_blank" rel="noopener">Google Sheet</a>.</p>
                </noscript>
```

This removes all 12 hardcoded `<tr>` rows, adds `id="training-table-wrapper"` and `id="training-table-body"`, and adds the `#training-cards` mount point with a `<noscript>` fallback.

- [ ] **Step 2: Verify**

Run: `grep -n "training-table-wrapper\|training-table-body\|training-cards" index.html`
Expected: each id appears exactly once.

Run: `grep -c "<tr" index.html` and `grep -c "</tr>" index.html`
Expected: both counts equal — `40` and `40` (down from the pre-task baseline of `51`/`51`: 12 hardcoded rows removed, 1 loading row added, net `51 - 12 + 1 = 40`).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Replace hardcoded Training table rows with dynamic mount points"
```

---

### Task 7: Teaching Experience table dynamic mount points

**Files:**
- Modify: `index.html` (the Teaching Experience table inside the Resume section, currently around lines 499-641)

**Interfaces:**
- Consumes: none.
- Produces: DOM nodes `#teaching-table-wrapper`, `#teaching-table-body`, `#teaching-cards`.

- [ ] **Step 1: Replace the table wrapper and clear its rows**

The Teaching Experience table currently looks like (starting after `<h2 class="resume-title">Teaching Experience</h2>`):

```html
                <div class="table-responsive table-scroll" data-mdb-perfect-scrollbar="true" style="position: relative; height: 500">
                  <table class="table table-dark mb-0">
                    <thead style="background-color: #393939;">
                      <tr class="text-uppercase text-success">
                        <th scope="col">Course</th>
                        <th scope="col">Lavel</th>
                        <th scope="col">School</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Kokurikuler</td>
                        <td>S1</td>
                        <td>Universitas Fajar</td>        
                      </tr>
                      ...
```

followed by 21 more hardcoded `<tr>` blocks (22 rows total), then:

```html
                    </tbody>
                  </table>
                </div>
```

Replace the entire span from the `<div class="table-responsive...` opening tag through that matching closing `</div>` with (note: `Lavel` in the header is a pre-existing typo — keep it exactly as-is, do not correct it):

```html
                <div class="table-responsive table-scroll" id="teaching-table-wrapper" data-mdb-perfect-scrollbar="true" style="position: relative; height: 500">
                  <table class="table table-dark mb-0">
                    <thead style="background-color: #393939;">
                      <tr class="text-uppercase text-success">
                        <th scope="col">Course</th>
                        <th scope="col">Lavel</th>
                        <th scope="col">School</th>
                      </tr>
                    </thead>
                    <tbody id="teaching-table-body">
                      <tr><td colspan="3">Memuat data teaching experience...</td></tr>
                    </tbody>
                  </table>
                </div>
                <div class="sheet-cards" id="teaching-cards">
                  <div class="sheet-card sheet-card-status">Memuat data teaching experience...</div>
                </div>
                <noscript>
                  <p class="text-center" style="padding: 12px; color: #888;">JavaScript diperlukan untuk menampilkan tabel teaching experience ini. Lihat data lengkap di <a href="https://docs.google.com/spreadsheets/d/17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc/edit" target="_blank" rel="noopener">Google Sheet</a>.</p>
                </noscript>
```

- [ ] **Step 2: Verify**

Run: `grep -n "teaching-table-wrapper\|teaching-table-body\|teaching-cards" index.html`
Expected: each id appears exactly once.

Run: `grep -c "<tr" index.html` and `grep -c "</tr>" index.html`
Expected: both counts equal — `19` and `19` (down from `40`/`40`: 22 hardcoded rows removed, 1 loading row added, net `40 - 22 + 1 = 19`).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Replace hardcoded Teaching Experience table rows with dynamic mount points"
```

---

### Task 8: Books table dynamic mount points

**Files:**
- Modify: `index.html` (the Books table inside the Research section, currently around lines 693-749)

**Interfaces:**
- Consumes: none.
- Produces: DOM nodes `#books-table-wrapper`, `#books-table-body`, `#books-cards`.

- [ ] **Step 1: Replace the table wrapper and clear its rows**

The Books table currently looks like (starting after `<p>Books </p>` section-title):

```html
                <div class="table-responsive table-scroll" data-mdb-perfect-scrollbar="true" style="position: relative; height: 250px">
                  <table class="table table-dark mb-0">
                    <thead style="background-color: #393939;">
                      <tr class="text-uppercase text-success">
                        <th scope="col">Titles</th>
                        <th scope="col">Publisher</th>
                        <th scope="col">Years</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Kriptografi: Teknik Keamanan Data</td>
                        <td>Yayasan Kita Menulis</td>
                        <td>2022</td>                        
                      </tr>
                      ...
```

followed by 4 more hardcoded `<tr>` blocks (5 rows total), then:

```html
                    </tbody>
                  </table>
                </div>
```

Replace the entire span from the `<div class="table-responsive...` opening tag through that matching closing `</div>` with:

```html
                <div class="table-responsive table-scroll" id="books-table-wrapper" data-mdb-perfect-scrollbar="true" style="position: relative; height: 250px">
                  <table class="table table-dark mb-0">
                    <thead style="background-color: #393939;">
                      <tr class="text-uppercase text-success">
                        <th scope="col">Titles</th>
                        <th scope="col">Publisher</th>
                        <th scope="col">Years</th>
                      </tr>
                    </thead>
                    <tbody id="books-table-body">
                      <tr><td colspan="3">Memuat data buku...</td></tr>
                    </tbody>
                  </table>
                </div>
                <div class="sheet-cards" id="books-cards">
                  <div class="sheet-card sheet-card-status">Memuat data buku...</div>
                </div>
                <noscript>
                  <p class="text-center" style="padding: 12px; color: #888;">JavaScript diperlukan untuk menampilkan tabel buku ini. Lihat data lengkap di <a href="https://docs.google.com/spreadsheets/d/17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc/edit" target="_blank" rel="noopener">Google Sheet</a>.</p>
                </noscript>
```

- [ ] **Step 2: Verify**

Run: `grep -n "books-table-wrapper\|books-table-body\|books-cards" index.html`
Expected: each id appears exactly once.

Run: `grep -c "<tr" index.html` and `grep -c "</tr>" index.html`
Expected: both counts equal — `15` and `15` (down from `19`/`19`: 5 hardcoded rows removed, 1 loading row added, net `19 - 5 + 1 = 15`).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Replace hardcoded Books table rows with dynamic mount points"
```

---

### Task 9: IPR table dynamic mount points

**Files:**
- Modify: `index.html` (the IPR table inside the Research section, currently around lines 750-812)

**Interfaces:**
- Consumes: none.
- Produces: DOM nodes `#ipr-table-wrapper`, `#ipr-table-body`, `#ipr-cards`.

- [ ] **Step 1: Replace the table wrapper and clear its rows**

The IPR table currently looks like (starting after `<p>Intellectual Property Right (IPR)</p>` section-title):

```html
                <div class="table-responsive table-scroll" data-mdb-perfect-scrollbar="true" style="position: relative; height: 210px">
                  <table class="table table-dark mb-0">
                    <thead style="background-color: #393939;">
                      <tr class="text-uppercase text-success">
                        <th scope="col">Titles</th>
                        <th scope="col">Publisher</th>
                        <th scope="col">Years</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                      <td>Implementasi Protokol MQTT Dan Skema Protokol<br> Otentikasi Berbasis Elliptic Curve Cryptography Lingkungan Rumah Pintar</td>
                        <td>KEMENKUMHAM RI</td>
                        <td>2024</td>                        
                      </tr>
                      ...
```

followed by 5 more hardcoded `<tr>` blocks (6 rows total), then:

```html
                    </tbody>
                  </table>
                </div>
```

Replace the entire span from the `<div class="table-responsive...` opening tag through that matching closing `</div>` with:

```html
                <div class="table-responsive table-scroll" id="ipr-table-wrapper" data-mdb-perfect-scrollbar="true" style="position: relative; height: 210px">
                  <table class="table table-dark mb-0">
                    <thead style="background-color: #393939;">
                      <tr class="text-uppercase text-success">
                        <th scope="col">Titles</th>
                        <th scope="col">Publisher</th>
                        <th scope="col">Years</th>
                      </tr>
                    </thead>
                    <tbody id="ipr-table-body">
                      <tr><td colspan="3">Memuat data IPR...</td></tr>
                    </tbody>
                  </table>
                </div>
                <div class="sheet-cards" id="ipr-cards">
                  <div class="sheet-card sheet-card-status">Memuat data IPR...</div>
                </div>
                <noscript>
                  <p class="text-center" style="padding: 12px; color: #888;">JavaScript diperlukan untuk menampilkan tabel IPR ini. Lihat data lengkap di <a href="https://docs.google.com/spreadsheets/d/17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc/edit" target="_blank" rel="noopener">Google Sheet</a>.</p>
                </noscript>
```

- [ ] **Step 2: Verify**

Run: `grep -n "ipr-table-wrapper\|ipr-table-body\|ipr-cards" index.html`
Expected: each id appears exactly once.

Run: `grep -c "<tr" index.html` and `grep -c "</tr>" index.html`
Expected: both counts equal — `10` and `10` (down from `15`/`15`: 6 hardcoded rows removed, 1 loading row added, net `15 - 6 + 1 = 10`).

Run: `grep -rn "research-utils\|research-table\.js" index.html assets/ tests/ 2>/dev/null`
Expected: no output — this is the final confirmation (deferred from Task 1 Step 6) that every reference to the old single-purpose files is gone repo-wide.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Replace hardcoded IPR table rows with dynamic mount points"
```

---

### Task 10: End-to-end verification for all five tables

This task requires no real API key — it intercepts the network call for every table, so it's runnable immediately after Task 9 regardless of whether the site owner has populated the four new sheet tabs yet.

**Files:**
- Create (scratch, not committed): a temporary verification script, e.g. `/tmp/sheet-table-check/verify.js` — throwaway tooling, not part of the codebase (matches how the original feature's Task 6 worked).

**Interfaces:**
- Consumes: the fully wired page from Tasks 1-9 (`index.html` + `assets/js/sheet-table-utils.js` + `assets/js/sheet-table.js` + `assets/js/sheet-table-configs.js` + `assets/css/style.css`).
- Produces: pass/fail console output — no repo artifacts.

- [ ] **Step 1: Start a local static server**

```bash
cd /mnt/d/2026/arizal.my.id
(python3 -m http.server 8125 &)
timeout 15 bash -c 'until curl -sf http://localhost:8125/index.html >/dev/null; do sleep 0.5; done'
```
Expected: `until` loop exits within 15s.

- [ ] **Step 2: Get a working headless Chromium + matching playwright-core**

```bash
mkdir -p /tmp/sheet-table-check && cd /tmp/sheet-table-check
npm init -y >/dev/null 2>&1
npm install playwright-core@1.47.0 --no-save
CHROME_BIN=$(find "$HOME/.cache/ms-playwright" -maxdepth 2 -type d -iname 'chromium-*' 2>/dev/null | sort -V | tail -1)/chrome-linux64/chrome
echo "$CHROME_BIN"
```
Expected: prints a path ending in `/chrome-linux64/chrome` that exists. If none is cached, run `npx playwright install chromium` first.

- [ ] **Step 3: Write the mocked-fetch verification script**

Create `/tmp/sheet-table-check/verify.js`:

```js
const { chromium } = require('playwright-core');
const assert = require('node:assert');

// One mock dataset per sheet tab, keyed by the tab name that appears in
// the request URL's `range` query parameter.
const MOCK_DATA = {
  'research!A2%3AC': [
    ['Older Paper', 'Old Journal', '2020'],
    ['Newest Paper', 'New Conference 2025', '2025'],
    ['Middle Paper', 'Mid Journal', '2023'],
  ],
  'training!A2%3AD': [
    ['2021', 'Older Training', 'Org A', 'City A'],
    ['2026', 'Newest Training', 'Org B', 'City B'],
  ],
  'teaching!A2%3AC': [
    ['Course Z', 'D4', 'School Z'],
    ['Course A', 'S1', 'School A'],
  ],
  'books!A2%3AC': [
    ['Old Book', 'Publisher X', '2019'],
    ['New Book', 'Publisher Y', '2023'],
  ],
  'ipr!A2%3AC': [
    ['Old IPR', 'KEMENKUMHAM RI', '2021'],
    ['New IPR', 'KEMENKUMHAM RI', '2024'],
  ],
};

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    args: ['--no-sandbox'],
  });

  async function mockRoute(route) {
    const url = route.request().url();
    const match = Object.keys(MOCK_DATA).find((key) => url.includes(key));
    if (!match) {
      return route.fulfill({ status: 404, body: '{}' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ values: MOCK_DATA[match] }),
    });
  }

  // --- Desktop: all five tables visible, all five card lists hidden ---
  {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.route('**/sheets.googleapis.com/**', mockRoute);
    await page.goto('http://localhost:8125/index.html', { waitUntil: 'networkidle' });

    await page.waitForFunction(() => document.querySelectorAll('#research-table-body tr').length === 3);
    await page.waitForFunction(() => document.querySelectorAll('#training-table-body tr').length === 2);
    await page.waitForFunction(() => document.querySelectorAll('#teaching-table-body tr').length === 2);
    await page.waitForFunction(() => document.querySelectorAll('#books-table-body tr').length === 2);
    await page.waitForFunction(() => document.querySelectorAll('#ipr-table-body tr').length === 2);

    const researchYears = await page.$$eval('#research-table-body tr', (rows) => rows.map((r) => r.children[2].textContent.trim()));
    assert.deepStrictEqual(researchYears, ['2025', '2023', '2020'], 'research must sort newest-first');

    const trainingYears = await page.$$eval('#training-table-body tr', (rows) => rows.map((r) => r.children[0].textContent.trim()));
    assert.deepStrictEqual(trainingYears, ['2026', '2021'], 'training must sort newest-first, 4-column row intact');
    const trainingCols = await page.$eval('#training-table-body tr', (r) => r.children.length);
    assert.strictEqual(trainingCols, 4, 'training rows must have 4 columns');

    const teachingCourses = await page.$$eval('#teaching-table-body tr', (rows) => rows.map((r) => r.children[0].textContent.trim()));
    assert.deepStrictEqual(teachingCourses, ['Course Z', 'Course A'], 'teaching must preserve sheet order, no sorting');

    const booksYears = await page.$$eval('#books-table-body tr', (rows) => rows.map((r) => r.children[2].textContent.trim()));
    assert.deepStrictEqual(booksYears, ['2023', '2019'], 'books must sort newest-first');

    const iprYears = await page.$$eval('#ipr-table-body tr', (rows) => rows.map((r) => r.children[2].textContent.trim()));
    assert.deepStrictEqual(iprYears, ['2024', '2021'], 'ipr must sort newest-first');

    for (const wrapperId of ['research-table-wrapper', 'training-table-wrapper', 'teaching-table-wrapper', 'books-table-wrapper', 'ipr-table-wrapper']) {
      assert.ok(await page.isVisible('#' + wrapperId), wrapperId + ' must be visible at desktop width');
    }
    for (const cardsId of ['research-cards', 'training-cards', 'teaching-cards', 'books-cards', 'ipr-cards']) {
      assert.ok(!(await page.isVisible('#' + cardsId)), cardsId + ' must be hidden at desktop width');
    }

    assert.deepStrictEqual(errors, [], 'no JS exceptions on desktop');
    console.log('PASS: desktop — all five tables render, sorted correctly, wrappers visible/cards hidden');
    await page.close();
  }

  // --- Mobile: all five card lists visible, all five tables hidden ---
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
    await page.route('**/sheets.googleapis.com/**', mockRoute);
    await page.goto('http://localhost:8125/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelectorAll('#training-cards .sheet-card:not(.sheet-card-status)').length === 2);

    // Training cards must show two stacked subtitle lines (organizer, place)
    const firstTrainingCardSubtitles = await page.$$eval(
      '#training-cards .sheet-card:first-child .sheet-card-subtitle',
      (els) => els.map((e) => e.textContent.trim())
    );
    assert.strictEqual(firstTrainingCardSubtitles.length, 2, 'training cards must have two subtitle lines');

    // Teaching cards' badge must show Level, not a year
    const teachingBadges = await page.$$eval('#teaching-cards .sheet-card-badge', (els) => els.map((e) => e.textContent.trim()));
    assert.deepStrictEqual(teachingBadges, ['D4', 'S1'], 'teaching badges must show level, in sheet order');

    for (const wrapperId of ['research-table-wrapper', 'training-table-wrapper', 'teaching-table-wrapper', 'books-table-wrapper', 'ipr-table-wrapper']) {
      assert.ok(!(await page.isVisible('#' + wrapperId)), wrapperId + ' must be hidden at mobile width');
    }
    for (const cardsId of ['research-cards', 'training-cards', 'teaching-cards', 'books-cards', 'ipr-cards']) {
      assert.ok(await page.isVisible('#' + cardsId), cardsId + ' must be visible at mobile width');
    }

    console.log('PASS: mobile — all five card lists render, training has 2 subtitle lines, teaching badge is level');
    await page.close();
  }

  // --- Error path: all five Sheets API calls return 500 ---
  {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.route('**/sheets.googleapis.com/**', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.goto('http://localhost:8125/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.getElementById('training-table-body').textContent.includes('Gagal memuat'));
    await page.waitForFunction(() => document.getElementById('teaching-table-body').textContent.includes('Gagal memuat'));
    console.log('PASS: error state renders per-table error message on API failure');
    await page.close();
  }

  await browser.close();
  console.log('ALL CHECKS PASSED');
})().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
```

- [ ] **Step 4: Run it**

```bash
cd /tmp/sheet-table-check
CHROME_BIN="$CHROME_BIN" node verify.js
```
Expected output ends with:
```
PASS: desktop — all five tables render, sorted correctly, wrappers visible/cards hidden
PASS: mobile — all five card lists render, training has 2 subtitle lines, teaching badge is level
PASS: error state renders per-table error message on API failure
ALL CHECKS PASSED
```
If any `assert` fails, fix the corresponding file from Tasks 1-9 and rerun.

- [ ] **Step 5: Regression-check Journal & Conference against its pre-refactor behavior**

Since Journal & Conference is unit-tested and covered by Step 4's mocked run above (its config is identical in shape to before — same field names, same sort, same single subtitle), no separate regression script is needed; Step 4's `research-table-wrapper`/`research-cards` assertions already cover it. Confirm by re-reading Step 4's output: the `research` assertions (`researchYears` sorted `['2025','2023','2020']`, wrapper visible at desktop, cards visible at mobile) passing is the regression check.

- [ ] **Step 6: Stop the local server**

```bash
lsof -ti:8125 -sTCP:LISTEN | xargs -r kill
```

No commit for this task — it changes no repo files, only verifies Tasks 1-9.

---

### Task 11: Migration data for Training, Teaching Experience, Books, IPR

**Files:**
- Create: `docs/superpowers/plans/2026-08-05-training-legacy-data.tsv`
- Create: `docs/superpowers/plans/2026-08-05-teaching-legacy-data.tsv`
- Create: `docs/superpowers/plans/2026-08-05-books-legacy-data.tsv`
- Create: `docs/superpowers/plans/2026-08-05-ipr-legacy-data.tsv`

**Interfaces:**
- Consumes: the hardcoded rows that were in `index.html` before Tasks 6-9 removed them (the full row content is enumerated below — this task does not depend on Tasks 6-9 having run, since the data is given here verbatim).
- Produces: four tab-separated files the site owner pastes directly into cell A2 of each respective already-created sheet tab (`training`, `teaching`, `books`, `ipr`).

- [ ] **Step 1: Write `docs/superpowers/plans/2026-08-05-training-legacy-data.tsv`**

12 lines, fields in order Year / Training / Organizer / Place, `<br>` flattened to spaces:

```
2026	Capacity Development Project for Nurturing Cybersecurity Professionals in Indonesia	KOICA	Suwon-South Korea
2025	TRAINING MLOps Fundamentals	BrainMatics	Cibubur
2025	TRAINING Penilaian Kerentanan Keamanan SPBE	KOMDIGI	Jakarta
2024	TRAINING Sistem Manajemen Organisasi Pendidikan (SNI ISO 21001:2018)	Pusbang SDM BSSNa	Sawangan - Depok
2024	TRAINING CYBERSECURITY & AI (READY4AI&SECURITY)	Yayasan Infra Digital Nusantara	Jakarta
2023	Training Cybersecurity Operations for Corporate	Hacktrace-Spentera	Depok
2023	Training Manajemen Resiko SPBE	KOMINFO	Jakarta
2022	Training Sistem Manajemen Keamanan Informasi SNI ISO IEC 27001:2013	KOMINFO	Jakarta
2022	Training of Facilitator (ToF) Pelatihan Simulasi Keamanan Siber Smart City dan Lab Cyber Security Online Simulation Platform (CSOSP)	Pusbang SDM BSSN	Sentul - Bogor
2022	Pelatihan Pendamping Peningkatan Budaya Mutu Perguruan Tinggi (Auditor AMI PT)	IPB	Bogor
2022	Pelatihan Keamanan Aplikasi Web Berbasis OWASP TOP 10 (Pemanfaatan Cyber Security Online Simulator Platform)	Pusbang SDM BSSN	Sawangan - Depok
2019	Pelatihan Dasar Pembinaan Mental dan Pengamanan	Satinduk BAIS TNI	Bogor
```

- [ ] **Step 2: Write `docs/superpowers/plans/2026-08-05-teaching-legacy-data.tsv`**

22 lines, fields in order Course / Level / School (typos in the original content, e.g. "Fundamental Keamana Jaringan", are preserved verbatim):

```
Kokurikuler	S1	Universitas Fajar
Pengolahan Sinyal Digital	S1	Universitas Fajar
Arsitektur Sistem Komputer	S1	Universitas Fajar
Pemograman Berbasis Web	S1	Universitas Fajar
Basis Data	S1	Universitas Fajar
Pengenalan Teknologi Informasi	S1	Universitas Fajar
Teknologi Informasi dan Komputer	S1	Universitas Fajar
Praktikum Elektronika Telekomunikasi	S1	Universitas Fajar
Praktikum Pengantar Komputer dan Teknologi Informasi	S1	Universitas Fajar
Praktikum Dasar Pemograman (C++)	S1	Universitas Fajar
Praktikum Pemograman Komouter	S1	Universitas Fajar
Arsitektur dan Organisasi Komputer	D4	Sekolah Tinggi Sandi Negara
Teknologi Multimedia	D4	Politeknik Siber dan Sandi Negara
Pengantar Teknologi Perangkat Keras Kriptografi	D4	Politeknik Siber dan Sandi Negara
Aplikasi Elektronika Optik	D4	Politeknik Siber dan Sandi Negara
Keamanan Aplikasi	D4	Politeknik Siber dan Sandi Negara
Struktur Data, Algoritma dan Pemograman	D4	Politeknik Siber dan Sandi Negara
Sistem Terdistribusi	D4	Politeknik Siber dan Sandi Negara
Keamanan Sistem Basis Data	D4	Politeknik Siber dan Sandi Negara
Elektronika Dasar	D4	Politeknik Siber dan Sandi Negara
Fundamental Keamana Jaringan	D4	Politeknik Siber dan Sandi Negara
Rancang Bangun Modul Kriptografi	D4	Politeknik Siber dan Sandi Negara
```

- [ ] **Step 3: Write `docs/superpowers/plans/2026-08-05-books-legacy-data.tsv`**

5 lines, fields in order Titles / Publisher / Years:

```
Kriptografi: Teknik Keamanan Data	Yayasan Kita Menulis	2022
Komunikasi Data	Yayasan Kita Menulis	2022
Teknologi Multimedia	Politeknik Siber dan Sandi Negara	2020
Perangkat Akses Kontrol	Politeknik Siber dan Sandi Negara	2020
Komunikasi Nirkabel	Politeknik Siber dan Sandi Negara	2020
```

- [ ] **Step 4: Write `docs/superpowers/plans/2026-08-05-ipr-legacy-data.tsv`**

6 lines, fields in order Titles / Publisher / Years, `<br>` flattened to spaces:

```
Implementasi Protokol MQTT Dan Skema Protokol Otentikasi Berbasis Elliptic Curve Cryptography Lingkungan Rumah Pintar	KEMENKUMHAM RI	2024
Kendali Akses Dengan Smartcard Dan Time-Based One-Time Password Pada Warehouse Inventory Management System Berbasis IoT	KEMENKUMHAM RI	2023
Program Komputer : Sistem Informasi Tugas Akhir Berbasis Website	KEMENKUMHAM RI	2022
Program Komputer : Indonesian Clickbait Headline Detector Berbasis Chrome Extention	KEMENKUMHAM RI	2022
Buku : Kriptografi : Teknik Keamanan Data	KEMENKUMHAM RI	2022
Buku : Komunikasi Data	KEMENKUMHAM RI	2022
```

- [ ] **Step 5: Verify row counts**

```bash
wc -l docs/superpowers/plans/2026-08-05-training-legacy-data.tsv    # expect 12 (or 13 with trailing newline)
wc -l docs/superpowers/plans/2026-08-05-teaching-legacy-data.tsv    # expect 22 (or 23)
wc -l docs/superpowers/plans/2026-08-05-books-legacy-data.tsv       # expect 5 (or 6)
wc -l docs/superpowers/plans/2026-08-05-ipr-legacy-data.tsv         # expect 6 (or 7)
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-08-05-training-legacy-data.tsv \
        docs/superpowers/plans/2026-08-05-teaching-legacy-data.tsv \
        docs/superpowers/plans/2026-08-05-books-legacy-data.tsv \
        docs/superpowers/plans/2026-08-05-ipr-legacy-data.tsv
git commit -m "Add legacy data for Training, Teaching, Books, IPR sheet tabs"
```

- [ ] **Step 7: Hand off to the site owner (manual, outside this plan)**

Tell the site owner: open each already-created tab (`training`, `teaching`, `books`, `ipr`) in the spreadsheet, click cell A2 in each, and paste the matching TSV file's contents (Google Sheets splits tab-separated text into columns automatically on paste).

---

## Post-implementation: manual steps for the site owner (not part of this plan's tasks)

1. Paste the four TSV files from Task 11 into their matching sheet tabs (already created), starting at cell A2.
2. Load the live site, open DevTools console, and confirm all five tables/card lists render with no errors — same verification habit established for the original Journal & Conference feature.
3. No Google Cloud changes needed — the existing API key already covers these tabs (not scoped per-tab).
