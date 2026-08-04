# Dynamic Research Table from Google Sheets

## Purpose

Replace the hardcoded 19-row "Journal & Conference" table in `index.html`
(Research section) with a table populated live from a public Google Sheet.
The owner adds a row in the sheet; the next visitor to load the page sees it
— no rebuild, no redeploy, no backend.

## Context

- Site is a static GitHub Pages site (no server-side runtime).
- Table content is public/open data — no confidentiality requirement.
- Owner wants near-instant reflection of new sheet rows on the live site.
- Source sheet: `https://docs.google.com/spreadsheets/d/17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc/edit`
  (spreadsheet ID `17cIxLbrxB70IMS1DyRHRfuQa2oWel_Z_md48Kc4kbNc`), tab name `research`.
- Sheet columns (row 1 = header): `Article`, `Journal/Conference`, `Year`.
- Sheet currently has some/no rows populated; the 19 existing entries in
  `index.html` need to be migrated into it.

## Chosen approach: Sheets API v4 + restricted read-only API key, client-side fetch

Rejected alternatives (from prior discussion):
- **Service Account + backend**: requires standing up and hosting a server
  GitHub Pages can't provide, for no security benefit since the data is
  already public. Rejected as unnecessary complexity.
- **Publish to Web (CSV) + fetch**: zero credentials, but Google's publish
  cache introduces a multi-minute lag before edits are visible — conflicts
  with the "near-realtime" requirement. Rejected in favor of the API-key
  approach, which reflects edits on the next fetch.

## Architecture

```
Google Sheet (tab "research", shared "Anyone with the link: Viewer")
        |
        |  GET https://sheets.googleapis.com/v4/spreadsheets/{id}/values/research!A2:C?key=API_KEY
        v
Visitor's browser (fetch on DOMContentLoaded)
        |
        |  sort rows by Year desc, HTML-escape each cell, build <tr> elements
        v
<tbody> of the Journal & Conference table in index.html
```

No backend, no build step. The API key is necessarily visible in client-side
requests; restrictions on it (below) limit abuse, not visibility.

## External setup (owner-performed, outside this repo)

1. **Sheet sharing**: Share → General access → "Anyone with the link" →
   Viewer. Required because a bare API key (no OAuth) can only read sheets
   that are publicly viewable.
2. **Google Cloud project**: enable the "Google Sheets API".
3. **API key**: create one, then restrict it:
   - API restrictions: "Google Sheets API" only.
   - Application restrictions: HTTP referrers — `arizal.my.id/*`,
     `www.arizal.my.id/*` (plus `localhost/*` temporarily during testing,
     removed after go-live).

These steps happen in the Google Cloud Console / Google Sheets UI and are
not part of the code changes in this repo.

## Frontend implementation

New file: `assets/js/research-table.js`, loaded after `assets/js/main.js` at
the end of `<body>` in `index.html`.

- Constants: `SPREADSHEET_ID`, `API_KEY`, `RANGE = 'research!A2:C'` (starts
  at row 2 to skip the header row).
- On `DOMContentLoaded`: `fetch()` the Sheets API v4 `values.get` endpoint
  for that range.
- Parse `response.values` (array of `[article, journal, year]` arrays,
  skipping rows with a missing/blank Year to avoid an unsortable entry).
- Sort by `Year` descending (numeric).
- Build `<tr>` rows (and card `<div>`s) as HTML strings, running each cell
  value through a dedicated `escapeHtml` function (escaping `& < > " '`)
  before concatenation, then assign the result via `innerHTML`. This is a
  deliberate deviation from a `document.createElement` + `textContent`
  approach: it keeps the row/card-building logic as pure functions
  (`assets/js/research-utils.js`) testable with Node's built-in test
  runner, with no DOM/jsdom dependency, while still guaranteeing sheet
  content can never be interpreted as HTML/script — the guarantee comes
  from escaping rather than from the DOM API choice.
- Target `<tbody>` in `index.html`'s Journal & Conference table is emptied
  of its 19 hardcoded rows and populated entirely by this script.
- No manual `<br>` line breaks in cell content — text wraps naturally via
  CSS, so plain values from the sheet render correctly without markup.

### Responsive layout: dual markup, CSS-toggled by breakpoint

Approved via visual mockup comparison: below the site's existing `768px`
breakpoint (already used elsewhere in `assets/css/style.css`), the table
is replaced by a stacked card list — one card per publication, article
title as heading, journal/conference as an italic subtitle below it, and
year as a small badge next to the title. At `768px` and above (tablet,
iPad, desktop) it renders as the existing `<table>`.

Rather than fight CSS `display: table-row` transforms to reflow a real
`<table>` into that card shape (badge repositioned next to the title,
not at the row's end), `research-table.js` renders **two parallel DOM
structures from the same sorted data array**:

- The existing `<table>` (desktop/tablet), inside its current
  `.table-responsive` wrapper.
- A new `<div class="research-cards">` sibling, containing one
  `.research-card` per entry (title + year badge on top, journal/
  conference italic below), matching the approved mockup.

CSS (added to `assets/css/style.css`) shows exactly one of the two via
`@media (max-width: 768px)` — `.research-cards { display: none; }` by
default, flipped with `.table-responsive { display: none; } .research-cards { display: block; }` inside the media query. Both structures are built
once per fetch; only visibility toggles, so there's no duplicate
fetching and no JS-driven breakpoint listening (pure CSS).

## Error handling

- While the fetch is in flight: a single placeholder `<tr>` reads "Memuat
  data publikasi...".
- On fetch failure (network error, non-2xx response, malformed payload):
  replace the placeholder row with "Gagal memuat data publikasi, silakan
  muat ulang halaman." No retry logic, no client-side caching — out of
  scope for this iteration.

## Data migration

The 19 entries currently hardcoded in `index.html`'s Journal & Conference
table will be converted to tab-separated rows (Article / Journal-Conference
/ Year, `<br>`-breaks flattened to plain text with spaces) for the owner to
paste directly into the `research` sheet tab starting at cell A2. This is a
one-time manual paste, not part of the code changes.

## Testing

- Serve the repo locally with a static file server, add `localhost/*` to
  the API key's temporary referrer allowlist, then drive a headless
  browser (Playwright, as used in the earlier "check website" session)
  against it to confirm:
  - Table renders rows sourced from the real sheet.
  - Rows are sorted newest-year-first.
  - `console --errors` clean (no JS exceptions).
  - At a mobile viewport (e.g. 375px wide) the card list is visible and
    the table is hidden; at desktop width (e.g. 1400px) the reverse.
- Remove `localhost/*` from the referrer allowlist after confirming it
  works against the live domain.

## Out of scope

- Retry/backoff, response caching, or offline fallback for fetch failures.
- Editable/admin UI — the sheet itself is the only editing surface.
- Any column beyond Article / Journal-Conference / Year.
- Pagination — current row count is small enough for a single fetch/render.
