# Dynamic Research Table (Google Sheets) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 19 hardcoded rows of the "Journal & Conference" table in `index.html` with a table populated live from a public Google Sheet (Sheets API v4 + restricted read-only API key), rendered as a normal table on tablet/desktop and as stacked cards on mobile.

**Architecture:** A vanilla-JS script (`assets/js/research-table.js`) fetches `values.get` from the Sheets API v4 on `DOMContentLoaded`, hands the raw rows to pure functions in `assets/js/research-utils.js` (parse → filter invalid → sort by year descending → build two escaped HTML strings), and injects one string into the existing `<table>`'s `<tbody>` and the other into a new sibling `<div class="research-cards">`. Pure CSS (`@media (max-width: 768px)`, the breakpoint already used elsewhere in `assets/css/style.css`) shows exactly one of the two at a time. No backend, no build step — matches the project's existing plain-`<script>`, no-bundler setup.

**Tech Stack:** Vanilla JS (no framework, no bundler — matches existing `assets/js/main.js` pattern), Node's built-in `node:test` runner for unit tests (zero new dependencies — the repo has no `package.json`/test framework today), Sheets API v4 REST endpoint called via `fetch()`.

## Global Constraints

- Static site only — no backend, no build step (GitHub Pages constraint).
- Sheet must be shared "Anyone with the link: Viewer" (required for a bare API-key-only Sheets API call).
- API key must be restricted in Google Cloud Console to the Sheets API only, with HTTP referrer restrictions `arizal.my.id/*` and `www.arizal.my.id/*` (`localhost/*` added temporarily for the owner's own testing, removed after go-live) — this repo cannot enforce that restriction, it's an external step the owner performs.
- Every value pulled from the sheet must be HTML-escaped before insertion into the DOM — never trust sheet content as markup.
- No manual `<br>` (or any markup) in data content — line wrapping is CSS's job, not the data's.
- Responsive breakpoint is `768px`, matching the breakpoint already used throughout `assets/css/style.css` (e.g. line 362).
- Out of scope (per spec): retry/backoff, response caching, offline fallback, admin/editing UI, columns beyond Article/Journal-Conference/Year, pagination.
- Spreadsheet ID is public and safe to hardcode: `17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc` (tab name `research`). The API key is **not yet created** — Task 4 hardcodes a clearly-marked placeholder that the site owner must replace once they've completed the external Google Cloud setup (spec section "External setup").

---

### Task 1: Pure data/render helpers (`research-utils.js`)

**Files:**
- Create: `assets/js/research-utils.js`
- Test: `tests/research-utils.test.js`

**Interfaces:**
- Consumes: nothing (pure functions, no DOM, no network).
- Produces (used by Task 4's `research-table.js`):
  - `ResearchUtils.parseSheetRows(values: any[][]) => {article: string, journal: string, year: number}[]` — drops rows missing article/journal or with a non-numeric year.
  - `ResearchUtils.sortByYearDesc(entries: {article, journal, year}[]) => {article, journal, year}[]` — new array, sorted descending by `year`.
  - `ResearchUtils.escapeHtml(value: string) => string` — escapes `& < > " '`.
  - `ResearchUtils.buildTableRowsHtml(entries) => string` — concatenated `<tr><td>...</td>...</tr>` markup, all text escaped.
  - `ResearchUtils.buildCardsHtml(entries) => string` — concatenated `.research-card` div markup, all text escaped.
  - Module is dual-exported: `module.exports` when `require()`d (Node tests), `window.ResearchUtils` when loaded via `<script>` in the browser.

- [ ] **Step 1: Write the failing tests**

Create `tests/research-utils.test.js`:

```js
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
  assert.ok(html.includes('class="research-card"'));
  assert.ok(html.includes('research-card-title">Title<'));
  assert.ok(html.includes('research-card-year">2025<'));
  assert.ok(html.includes('research-card-journal">J &amp; K<'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/research-utils.test.js`
Expected: fails immediately with `Cannot find module '../assets/js/research-utils.js'`.

- [ ] **Step 3: Write the implementation**

Create `assets/js/research-utils.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/research-utils.test.js`
Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add assets/js/research-utils.js tests/research-utils.test.js
git commit -m "Add pure parse/sort/render helpers for research table"
```

---

### Task 2: Responsive CSS for the table/card toggle

**Files:**
- Modify: `assets/css/style.css` (append new section at end of file)

**Interfaces:**
- Consumes: nothing.
- Produces (used by Task 3's HTML and Task 4's JS): CSS selectors `#research-table-wrapper`, `.research-cards`, `.research-card`, `.research-card-header`, `.research-card-title`, `.research-card-year`, `.research-card-journal`, `.research-card-status`.

- [ ] **Step 1: Append the CSS block**

Append to the end of `assets/css/style.css` (follows the file's existing section-comment convention, e.g. the `# Credits` block already at the end):

```css
/*--------------------------------------------------------------
# Research Table Responsive
--------------------------------------------------------------*/
.research-cards {
  display: none;
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

- [ ] **Step 2: Verify no existing selector is shadowed**

Run: `grep -n "research-card\|research-table-wrapper" assets/css/style.css`
Expected: only the block just added — confirms no naming collision with pre-existing rules.

- [ ] **Step 3: Commit**

```bash
git add assets/css/style.css
git commit -m "Add responsive card/table toggle styles for research table"
```

---

### Task 3: Replace hardcoded rows in `index.html` with dynamic containers

**Files:**
- Modify: `index.html:659-781` (the "Research" `<section id="resume1">` block containing the Journal & Conference table)

**Interfaces:**
- Consumes: none.
- Produces (used by Task 5's JS): DOM nodes `#research-table-wrapper` (the existing `.table-responsive` div), `#research-table-body` (the `<tbody>`), and a new sibling `#research-cards` div — all three are the mount points `research-table.js` writes into.

- [ ] **Step 1: Replace the table wrapper's opening tag and clear its rows**

In `index.html`, the table currently looks like (starting at line 666):

```html
                <div class="table-responsive table-scroll" data-mdb-perfect-scrollbar="true" style="position: relative; height: 770px">
                  <table class="table table-dark mb-0">
                    <thead style="background-color: #393939;">
                      <tr class="text-uppercase text-success">
                        <th scope="col">Article</th>
                        <th scope="col">Journal / Conference</th>
                        <th scope="col">Years</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>SafeUSB: Implementation of Keystroke Monitoring System <br>to Prevent BadUSB HID Injection Attack</td>
                        ...
```
followed by 18 more hardcoded `<tr>` blocks (19 rows total) down to `2017`, then:
```html
                    </tbody>
                  </table>
                </div>
```

Replace the entire span from the `<div class="table-responsive...` opening tag through the matching `</div>` (i.e. everything shown above through the closing three lines) with:

```html
                <div class="table-responsive table-scroll" id="research-table-wrapper" data-mdb-perfect-scrollbar="true" style="position: relative; height: 770px">
                  <table class="table table-dark mb-0">
                    <thead style="background-color: #393939;">
                      <tr class="text-uppercase text-success">
                        <th scope="col">Article</th>
                        <th scope="col">Journal / Conference</th>
                        <th scope="col">Years</th>
                      </tr>
                    </thead>
                    <tbody id="research-table-body">
                      <tr><td colspan="3">Memuat data publikasi...</td></tr>
                    </tbody>
                  </table>
                </div>
                <div class="research-cards" id="research-cards">
                  <div class="research-card research-card-status">Memuat data publikasi...</div>
                </div>
```

This removes all 19 hardcoded `<tr>` rows (including the pre-existing malformed `</tr` — missing `>` — on the "Investigasi Insiden Kebocoran Data" row), adds `id="research-table-wrapper"` and `id="research-table-body"`, and adds the new `#research-cards` mount point with matching loading text as a no-JS-visible fallback.

- [ ] **Step 2: Verify the section parses as valid HTML structure**

Run: `grep -n '</tr[^>]' index.html`
Expected: no output — confirms the pre-existing malformed `</tr` (missing its closing `>`, previously on the "Investigasi Insiden Kebocoran Data" row) is gone and no new one was introduced.

Run: `grep -c "<tr" index.html` and `grep -c "</tr>" index.html` (note: `<tr` not `<tr>`, since several opening tags carry attributes like `<tr class="...">` and a literal `<tr>` match would miss those)
Expected: both counts equal — `51` and `51` (down from the pre-Task-3 baseline of `69` opening / `68` closing: the 19 removed `<tr>` rows — only 18 of which had a well-formed closing tag — are replaced by a single well-formed loading-placeholder row, i.e. `69 - 19 + 1 = 51` opens and `68 - 18 + 1 = 51` closes).

Also run: `grep -n "research-table-body\|research-cards\|research-table-wrapper" index.html` — expected: each id appears exactly once.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Replace hardcoded research table rows with dynamic mount points"
```

---

### Task 4: Fetch + render orchestration (`research-table.js`)

**Files:**
- Create: `assets/js/research-table.js`

**Interfaces:**
- Consumes: `ResearchUtils.parseSheetRows`, `ResearchUtils.sortByYearDesc`, `ResearchUtils.buildTableRowsHtml`, `ResearchUtils.buildCardsHtml` (Task 1, must be loaded first), DOM elements `#research-table-body` and `#research-cards` (Task 3).
- Produces: no exports — this is a page-entry script, runs on `DOMContentLoaded`.

- [ ] **Step 1: Write the implementation**

Create `assets/js/research-table.js`:

```js
(function () {
  var SPREADSHEET_ID = '17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc';
  // TODO(owner): replace with the real key after completing the Google
  // Cloud setup in docs/superpowers/specs/2026-08-04-dynamic-research-table-google-sheets-design.md
  var API_KEY = 'REPLACE_WITH_GOOGLE_SHEETS_API_KEY';
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
      .catch(function () {
        renderError(tbody, cardsEl);
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
```

- [ ] **Step 2: Static sanity check (no test framework covers DOM/fetch orchestration — Task 6 does that end-to-end)**

Run: `node --check assets/js/research-table.js`
Expected: no output (syntax is valid). This only checks parseability; behavioral verification happens in Task 6.

- [ ] **Step 3: Commit**

```bash
git add assets/js/research-table.js
git commit -m "Add Sheets API fetch/render orchestration for research table"
```

---

### Task 5: Wire the new scripts into `index.html`

**Files:**
- Modify: `index.html` (script includes near the end of `<body>`)

**Interfaces:**
- Consumes: `assets/js/research-utils.js` (Task 1), `assets/js/research-table.js` (Task 4).
- Produces: nothing further downstream.

- [ ] **Step 1: Add the script tags**

In `index.html`, find:

```html
  <script src="assets/js/main.js"></script>
```

Add two new lines immediately after it:

```html
  <script src="assets/js/main.js"></script>

  <script src="assets/js/research-utils.js"></script>
  <script src="assets/js/research-table.js"></script>
```

(`research-utils.js` must load before `research-table.js` since the latter calls `window.ResearchUtils`.)

- [ ] **Step 2: Verify script order**

Run: `grep -n "research-utils.js\|research-table.js\|main.js\"" index.html`
Expected: `main.js` line number is lowest, `research-utils.js` next, `research-table.js` last.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Load research table scripts in index.html"
```

---

### Task 6: End-to-end verification with a mocked Sheets API response

This task requires no real API key — it intercepts the network call, so it's runnable immediately after Task 5 regardless of whether the site owner has finished the external Google Cloud setup yet.

**Files:**
- Create (scratch, not committed): a temporary verification script, e.g. `/tmp/research-table-check/verify.js` — this repo has no Playwright dependency and none is being added; the script is throwaway tooling, not part of the codebase.

**Interfaces:**
- Consumes: the fully wired page from Tasks 1-5 (`index.html` + `assets/js/research-utils.js` + `assets/js/research-table.js` + `assets/css/style.css`).
- Produces: pass/fail console output — no repo artifacts.

- [ ] **Step 1: Start a local static server**

```bash
cd /mnt/d/2026/arizal.my.id
(python3 -m http.server 8123 &)
timeout 15 bash -c 'until curl -sf http://localhost:8123/index.html >/dev/null; do sleep 0.5; done'
```
Expected: `until` loop exits within 15s (server is serving).

- [ ] **Step 2: Get a working headless Chromium + matching playwright-core**

```bash
mkdir -p /tmp/research-table-check && cd /tmp/research-table-check
npm init -y >/dev/null 2>&1
npm install playwright-core@1.47.0 --no-save
CHROME_BIN=$(find "$HOME/.cache/ms-playwright" -maxdepth 2 -type d -iname 'chromium-*' 2>/dev/null | sort -V | tail -1)/chrome-linux64/chrome
echo "$CHROME_BIN"
```
Expected: prints a path ending in `/chrome-linux64/chrome` that exists. If `$HOME/.cache/ms-playwright` has no `chromium-*` directory, run `npx playwright install chromium` first (this downloads a browser — confirm with whoever runs this task before doing so if network/disk usage matters).

- [ ] **Step 3: Write the mocked-fetch verification script**

Create `/tmp/research-table-check/verify.js`:

```js
const { chromium } = require('playwright-core');
const assert = require('node:assert');

const MOCK_ROWS = [
  ['Older Paper', 'Old Journal', '2020'],
  ['Newest Paper', 'New Conference 2025', '2025'],
  ['Middle Paper', 'Mid Journal', '2023'],
];

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    args: ['--no-sandbox'],
  });

  // --- Desktop: table visible, cards hidden, sorted desc, escaped safely ---
  {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.route('**/sheets.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ values: MOCK_ROWS }) })
    );
    await page.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => document.querySelectorAll('#research-table-body tr').length === 3
    );

    const rowYears = await page.$$eval('#research-table-body tr', (rows) =>
      rows.map((r) => r.children[2].textContent.trim())
    );
    assert.deepStrictEqual(rowYears, ['2025', '2023', '2020'], 'desktop rows must be sorted newest-first');

    const tableVisible = await page.isVisible('#research-table-wrapper');
    const cardsVisible = await page.isVisible('#research-cards');
    assert.ok(tableVisible, 'table must be visible at desktop width');
    assert.ok(!cardsVisible, 'cards must be hidden at desktop width');

    assert.deepStrictEqual(errors, [], 'no JS exceptions on desktop');
    console.log('PASS: desktop table view');
    await page.close();
  }

  // --- Mobile: cards visible, table hidden, same sort/content ---
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
    await page.route('**/sheets.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ values: MOCK_ROWS }) })
    );
    await page.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => document.querySelectorAll('.research-card:not(.research-card-status)').length === 3
    );

    const cardYears = await page.$$eval('.research-card-year', (els) => els.map((e) => e.textContent.trim()));
    assert.deepStrictEqual(cardYears, ['2025', '2023', '2020'], 'mobile cards must be sorted newest-first');

    const tableVisible = await page.isVisible('#research-table-wrapper');
    const cardsVisible = await page.isVisible('#research-cards');
    assert.ok(!tableVisible, 'table must be hidden at mobile width');
    assert.ok(cardsVisible, 'cards must be visible at mobile width');
    console.log('PASS: mobile card view');
    await page.close();
  }

  // --- Error path: Sheets API returns 500 ---
  {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.route('**/sheets.googleapis.com/**', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => document.getElementById('research-table-body').textContent.includes('Gagal memuat')
    );
    console.log('PASS: error state renders on API failure');
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
cd /tmp/research-table-check
CHROME_BIN="$CHROME_BIN" node verify.js
```
Expected output ends with:
```
PASS: desktop table view
PASS: mobile card view
PASS: error state renders on API failure
ALL CHECKS PASSED
```
If any `assert` fails, the script exits non-zero with `FAIL: <message>` — fix the corresponding file from Tasks 1-5 and rerun.

- [ ] **Step 5: Stop the local server**

```bash
lsof -ti:8123 -sTCP:LISTEN | xargs -r kill
```

No commit for this task — it changes no repo files, only verifies Tasks 1-5.

---

### Task 7: Migration data for the 19 legacy entries

**Files:**
- Create: `docs/superpowers/plans/2026-08-04-research-legacy-data.tsv`

**Interfaces:**
- Consumes: the 19 hardcoded entries that were in `index.html` before Task 3 removed them (source: `git show <commit>^:index.html` using the commit made in Task 3, or the full list already enumerated below).
- Produces: a tab-separated file the site owner pastes directly into cell A2 of the `research` tab in the Google Sheet (columns: Article, Journal/Conference, Year — no header row, since it's meant to be pasted starting at A2).

- [ ] **Step 1: Write the file**

Create `docs/superpowers/plans/2026-08-04-research-legacy-data.tsv` with one line per publication, fields separated by a literal tab character, in this exact order (newest first, matching the site's original order, `<br>` tags already flattened to single spaces):

```
SafeUSB: Implementation of Keystroke Monitoring System to Prevent BadUSB HID Injection Attack	2025 IEEE 2nd International Conference on Cryptography, Informatics and Cybersecurity (ICoCICs 2025)	2025
Comparative Analysis of eBPF-Based Runtime Security Monitoring Tools in Monitoring and Threat Detection on Kubernetes	The 1st International Conference on Research and Innovation in Information and Engineering Technology 2025 (RITECH 2025)	2025
Implementation of WireGuard and L2TP/IPSec with DNS Sinkhole Using Raspberry Pi	The 1st International Conference on Research and Innovation in Information and Engineering Technology 2025 (RITECH 2025)	2025
IoT System Design and Implementation Based on OWASP IoT Security Verification Standard	ICITISEE 2024: International Conference on Information Technology, Information Systems and Electrical Engineering	2024
Sistem Informasi E-Katalog Terintegrasi QRCode Berbasis Website untuk Pemasaran Produk Furniture	Jurnal Minfo Polgan (JMP): Jurnal & Penelitian Manajemen Informatika	2024
SIGNIN: The Digital Signature and File Verification Management Application Using Secure Rapid Application Development Approach	ICITCOM 2023: International Conference on Information Technology and Computing	2023
Comparative Analysis of Forensic Results of File Deletion Tools on Windows	IWAIIP 2023: International Workshop on Artificial Intelligence and Image Processing	2023
Investigasi Insiden Kebocoran Data Menggunakan Integrasi Melalui Pendekatan Open Source Intelligence dan Detection Maturity Level Model	Info Kripto: Jurnal Keamanan Siber dan Kriptologi	2023
Zoea Crab Larva Counter (CLARCO) Based On Image Processing With Adaptive Gaussian Filter Algorithm And Blob Detection Technique	Inspiration: Jurnal Teknologi Informasi dan Komunikasi	2023
Implementation Cryptography and Access Control on IoT-Based Warehouse Inventory Management System	MATRIK: Jurnal Manajemen, Teknik Informatika dan Rekayasa Komputer	2022
Impact Analysis of Crypto Miner Malware Attacks Using Android Debug Bridge (ADB) Vulnerabilities via TCP/IP on Android-Based Raspberry Pi 4 IoT Device	2022 International Conference on Informatics, Multimedia, Cyber and Information System (ICIMCIS)	2022
Multilayers Physical Authentication and NoSQL PRESENT algorithm for Data Center	2022 FORTEI-International Conference on Electrical Engineering (FORTEI-ICEE)	2022
Implementasi Deteksi Judul Berita Clickbait Berbahasa Indonesia dengan pre-trained model Multilingual BERT Pada Aplikasi Berbasis Chrome Extension	Jurnal Ilmiah SINUS	2022
Metode Prototype pada Sistem Informasi Manajemen Tugas Akhir Mahasiswa Berbasis Website	Jurnal Teknologi Informasi dan Komunikasi (TIKomSiN)	2022
PRESENT Algorithm and Authentication Protocol for a Secure Patient Monitoring System	6th International Workshop on Big Data and Information Security (IWBIS)	2021
Feature Selection Correlation-Based pada Prediksi Nasabah Bank Telemarketing untuk Deposito	MATRIK: Jurnal Manajemen, Teknik Informatika dan Rekayasa Komputer	2021
Sistem Informasi Manajemen Wisuda Berbasis Website Menggunakan Metode Waterfall	Jurnal Sistem dan Informatika (JSI) - Bali	2020
Backpropagation Performance Against Support Vector Machine in Detecting Tuberculosis Based on Lung X-Ray Image	1st International Conference on Materials Engineering and Management - Engineering Section (ICMEMe)	2019
Detection of Tubercolosis Disease Based on X-Ray Images Of Lung Using Artificial Neural Netrwork With Backpropagation Method	International Conference on Science (ICOS)	2017
```

19 lines total — use this exact list, not a recount from the (now-removed) HTML.

- [ ] **Step 2: Verify row count**

Run: `wc -l docs/superpowers/plans/2026-08-04-research-legacy-data.tsv`
Expected: `19` (or `19` plus 1 if the file ends with a trailing newline after the last row — either is fine, just confirm no row was dropped or duplicated).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-08-04-research-legacy-data.tsv
git commit -m "Add legacy publication data for pasting into the research sheet"
```

- [ ] **Step 4: Hand off to the site owner (manual, outside this plan)**

Tell the site owner: open the `research` tab of the Google Sheet, click cell A2, paste the contents of this TSV file directly (Google Sheets splits tab-separated text into columns automatically on paste).

---

## Post-implementation: manual steps for the site owner (not part of this plan's tasks)

These cannot be performed by whoever executes this plan — they require the owner's own Google account:

1. Complete the external setup from `docs/superpowers/specs/2026-08-04-dynamic-research-table-google-sheets-design.md` (share the sheet as Viewer-anyone-with-link, create and restrict the Sheets API key).
2. Replace `REPLACE_WITH_GOOGLE_SHEETS_API_KEY` in `assets/js/research-table.js` with the real key, commit, and push.
3. Paste the Task 7 TSV into the `research` sheet tab.
4. Load the live site once and visually confirm the real data appears (Task 6 already proved the rendering logic works against mocked data — this step just confirms the real key/sheet combination works).
