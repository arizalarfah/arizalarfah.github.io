# Generalized Sheet-Driven Tables (Training, Teaching, Books, IPR)

## Purpose

Extend the Google-Sheets-driven table pattern already shipped for "Journal &
Conference" to four more tables on the site: Training, Teaching Experience,
Books, and Intellectual Property Right (IPR). Rather than duplicating the
existing single-table implementation four more times, refactor it into a
generic, config-driven engine that all five tables share — including
migrating Journal & Conference onto the same engine.

## Context

- Existing shipped feature: `assets/js/research-utils.js` (pure parse/sort/
  escape/render-string helpers) + `assets/js/research-table.js` (fetch +
  DOM orchestration for exactly one table: Journal & Conference), driven by
  a single hardcoded config (spreadsheet id, range `research!A2:C`, 3
  columns: Article/Journal/Year).
- All four new tables currently hold hardcoded `<tr>` rows in `index.html`,
  same pattern the Journal & Conference table had before that feature:
  `.table-responsive.table-scroll` wrapper with a fixed pixel height,
  `table.table.table-dark`, dark `<thead>`.
- Table shapes differ:
  - **Training** — `Year, Training, Organizer, Place` (4 columns), 12 rows.
  - **Teaching Experience** — `Course, Level, School` (3 columns, **no
    year field**), 22 rows.
  - **Books** — `Titles, Publisher, Years` (3 columns), 5 rows.
  - **IPR** — `Titles, Publisher, Years` (3 columns), 6 rows.
- All four new tables will live as additional tabs (`training`, `teaching`,
  `books`, `ipr`) in the **same spreadsheet** already used for `research`
  (id `17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc`) — already shared
  publicly and already has a working, referrer-restricted API key that
  needs no changes (the key isn't scoped to a specific tab).
- The site owner has already created the four new sheet tabs; data
  migration (TSV export → paste) happens after this feature ships, same
  workflow as the original Journal & Conference migration.

## Chosen approach: generalize into one config-driven engine

Rejected alternative: duplicate `research-utils.js`/`research-table.js`
into four more near-identical file pairs. Rejected because it produces five
copies of the same fetch/loading/error/escape/render logic that would need
to be kept in sync by hand on every future change, and five separate test
suites covering the same behavior — a DRY violation with no compensating
benefit, since the tables differ only in *data shape*, not in *behavior*.

Instead:
- Refactor the existing pure-function module into a generic one that
  accepts a column/field configuration instead of hardcoding
  Article/Journal/Year.
- Refactor the existing fetch/render module into a generic engine that
  takes a per-table config object (spreadsheet range, DOM mount ids,
  column mapping, sort behavior, card layout) and can be instantiated once
  per table.
- Migrate Journal & Conference itself onto this engine (it becomes just
  another config entry), so there is exactly one implementation of the
  fetch/parse/sort/render/error pipeline for all five tables.

## File changes

- **Rename + generalize** `assets/js/research-utils.js` →
  `assets/js/sheet-table-utils.js`:
  - `parseSheetRows(values, fields)` — `fields` is an ordered array of
    field-name strings matching the sheet's column order (e.g.
    `['article', 'journal', 'year']` or `['year', 'training', 'organizer',
    'place']`). Returns objects keyed by those names. A row is kept only if
    every field is non-empty after trimming.
  - `sortByFieldDesc(entries, field)` — numeric-descending sort by the
    named field (used for `year`-shaped fields); when a table config has no
    sortable field, this function is simply not called and sheet order is
    preserved as-is.
  - `escapeHtml(value)` — unchanged.
  - `buildTableRowsHtml(entries, columnOrder)` — `columnOrder` is the
    ordered array of field names to render as `<td>`s, in order.
  - `buildCardsHtml(entries, cardConfig)` — `cardConfig = { titleField,
    badgeField, subtitleFields }`. `subtitleFields` is an array (usually
    one field, two for Training) — each rendered as its own
    `.sheet-card-subtitle` line under the title/badge row. `badgeField` is
    optional (omit for a card with no badge — not needed here since every
    table has a badge, either year or level, but the function should not
    assume a badge always exists).
  - Same dual CommonJS/browser-global export pattern as before, now
    exporting as `window.SheetTableUtils`.

- **Rename + generalize** `assets/js/research-table.js` →
  `assets/js/sheet-table.js`:
  - Exposes one function, `SheetTable.init(config)`, where `config` is:
    ```
    {
      spreadsheetId, apiKey, range,       // fetch target
      fields,                             // ordered field names matching the range's columns
      sortField,                          // field name to sort desc by, or null for sheet order
      tableBodyId, cardsContainerId,      // DOM mount ids
      tableColumnOrder,                   // ordered field names for <td> rendering (usually same as `fields`)
      card: { titleField, badgeField, subtitleFields },
      emptyMessage, errorMessage, loadingMessage, // per-table copy (Indonesian, matching existing tone)
    }
    ```
  - `init` performs exactly the same fetch → loading/error/empty/render
    sequence the current `research-table.js` does, generalized to use the
    config's field names instead of hardcoded `article`/`journal`/`year`,
    and calling `SheetTableUtils` functions with the config's field lists.
  - No behavior change versus the current implementation for a config that
    matches Journal & Conference's shape — same escaping guarantee (every
    value routed through `escapeHtml` before insertion), same
    loading/error/empty states, same `console.error` logging on fetch
    failure.

- **New file** `assets/js/sheet-table-configs.js` — declarative only, no
  logic: five calls to `SheetTable.init({...})`, one per table, each with
  its own `range`, `fields`, `sortField`, mount ids, and `card` mapping.
  The real, shared `apiKey` (already live in production) is defined once
  in this file and passed to each `init` call. Bound to
  `document.addEventListener('DOMContentLoaded', ...)` the same way the
  current `research-table.js` self-initializes.

- **`index.html`**: `assets/js/research-utils.js` / `research-table.js`
  script tags replaced with `sheet-table-utils.js`, `sheet-table.js`,
  `sheet-table-configs.js`, in that load order. `sheet-table-configs.js`
  calls `SheetTable.init(...)` once per table at module-load time, but
  each `init` call only *registers* a `DOMContentLoaded` listener rather
  than fetching immediately — so the ordering requirement is simply that
  `window.SheetTableUtils` and `window.SheetTable` exist by the time
  `sheet-table-configs.js` runs, which utils-then-engine-then-configs load
  order guarantees.
  - Journal & Conference's existing mount ids (`#research-table-wrapper`,
    `#research-table-body`, `#research-cards`) are unchanged — only its JS
    implementation moves to the generic engine, the HTML/CSS stay as they
    are today.
  - Training/Teaching/Books/IPR: each hardcoded `<tbody>` is emptied to a
    loading placeholder, each `.table-responsive` wrapper gets an `id`
    (`#training-table-wrapper`, `#teaching-table-wrapper`,
    `#books-table-wrapper`, `#ipr-table-wrapper`), each gets a sibling
    `.sheet-cards` div with a matching `id`
    (`#training-cards`/`#teaching-cards`/`#books-cards`/`#ipr-cards`) and a
    `<noscript>` fallback, same pattern as Journal & Conference.

- **`assets/css/style.css`**:
  - Rename the `.research-card*` class family to `.sheet-card*`
    (`.sheet-cards`, `.sheet-card`, `.sheet-card-header`,
    `.sheet-card-title`, `.sheet-card-badge` — renamed from
    `research-card-year` since the badge is not always a year now — plus a
    new `.sheet-card-subtitle` class, generalized from
    `.research-card-journal`, usable for one or more stacked lines per
    card). Visual values (colors, padding, border) stay byte-identical —
    this is a rename, not a redesign.
  - The `@media (max-width: 768px)` toggle block is generalized to list
    all five wrapper ids (`#research-table-wrapper`,
    `#training-table-wrapper`, `#teaching-table-wrapper`,
    `#books-table-wrapper`, `#ipr-table-wrapper`) alongside `.sheet-cards`.
  - The scoped text-wrap override added for Journal & Conference
    (`#research-table-wrapper table td, table th { white-space: normal;
    ... }`) is extended with the same rule for the four new wrapper ids,
    so long text wraps instead of truncating in every sheet-driven table.

## Card layout per table

| Table | Sheet fields (in column order) | Sort | Card title | Card badge | Card subtitle line(s) |
|---|---|---|---|---|---|
| Journal & Conference (migrated) | article, journal, year | year desc | article | year | journal |
| Training | year, training, organizer, place | year desc | training | year | organizer, place (two lines) |
| Teaching Experience | course, level, school | none (sheet order) | course | level | school |
| Books | title, publisher, year | year desc | title | year | publisher |
| IPR | title, publisher, year | year desc | title | year | publisher |

Multiple subtitle lines (Training only) render as two separate
`.sheet-card-subtitle` elements stacked vertically, each using the same
existing subtitle styling — no new CSS needed for the two-line case beyond
what one line already has.

## Error handling

Identical per-table behavior to the current Journal & Conference
implementation: a loading placeholder while the fetch is in flight, an
empty-state message if the sheet range returns zero valid rows, an error
message (with the underlying error logged via `console.error`) on fetch
failure — each table's copy uses the same three Indonesian strings already
in production (`Memuat data publikasi...` / `Belum ada data publikasi.` /
`Gagal memuat data publikasi, silakan muat ulang halaman.`), generalized to
not say "publikasi" for non-publication tables (e.g. Training's copy reads
"Memuat data training..." etc. — each config supplies its own three
strings).

## Testing

- `tests/sheet-table-utils.test.js` (renamed/expanded from
  `tests/research-utils.test.js`): existing five test cases carried over
  unchanged in spirit but updated to the generic function signatures, plus
  new cases for: a config with `sortField: null` (Teaching Experience,
  order preserved), a config with two subtitle fields (Training), and a
  4-column table config (Training) rendering four `<td>`s per row.
- End-to-end mocked-fetch verification (extended from the existing Task 6
  script): drives the real page with all five tables' network calls
  intercepted and fed canned per-table data, asserting each table renders
  correctly (row count, sort order or lack thereof, badge/subtitle
  content) at both desktop and mobile viewport widths, and that Journal &
  Conference's rendered output is unchanged after the migration to the
  generic engine (regression check against the already-shipped behavior).

## Data migration

Four TSV files, one per table (Training/Teaching/Books/IPR), generated
from the current hardcoded `index.html` rows, same format as the existing
`docs/superpowers/plans/2026-08-04-research-legacy-data.tsv` — tab-
separated, no header row, ready to paste starting at cell A2 of each
table's already-created sheet tab (`training`, `teaching`, `books`, `ipr`
— these tabs already exist, created by the site owner ahead of this
feature). This is a one-time manual paste by the site owner, not part of
the code changes.

## External setup

None needed beyond what's already live: same spreadsheet, same publicly
shared sharing setting, same restricted API key (not scoped per-tab, so it
already covers the four new tabs with no changes in Google Cloud Console).

## Out of scope

- Retry/backoff, response caching, offline fallback — same as the original
  feature.
- Any UI for editing data — the sheet remains the only editing surface.
- Columns beyond what's listed per table above.
- Pagination.
- Changing the Education/Work Experience lists in the Resume section
  (those aren't tables, they're `.resume-item` divs — out of scope, not
  requested).
