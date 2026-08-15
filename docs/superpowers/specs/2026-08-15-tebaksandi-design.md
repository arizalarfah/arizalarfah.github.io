# Tebak Sandi — Cryptography Puzzle Game

## Purpose

Add a new, self-contained mini-game at `arizal.my.id/tebaksandi/`: a
3-level cryptography puzzle ("Tebak Sandi" — guess the cipher) modeled on
the reference site `tebaksandi.netlify.app` and on a detailed screen-by-
screen walkthrough the site owner supplied in `tebaksandi.docx`. Players
enter a name, pick one of three difficulty levels (PEMULA / AHLI / DEWA),
solve an image+narrative clue by deriving a hidden word, and see an
educational explanation after each correct answer.

This is new, standalone functionality — no existing flow in the repo to
extend — and it introduces one capability the site has never had before
(participant-name persistence with a completion-time leaderboard, deferred
to Phase 2 below, would require **writing** to Google Sheets; everything
else in the site today only **reads** Sheets via a referrer-restricted
public API key). Scoping this spec to the parts that need no new
capability keeps the initial ship self-contained and static.

## Context

- Site is a static, no-build, vanilla HTML/CSS/JS GitHub Pages site
  (`arizal.my.id`, repo `arizalarfah/arizalarfah.github.io`). Precedent for
  a self-contained subfolder tool already exists (`praktik/`, `page/`).
- Source material: `tebaksandi.docx` (17 screenshots + flow notes),
  reverse-engineered screen by screen. Key findings:
  - Landing page → name-entry screen ("Who?" style input) → 3-level hub
    (PEMULA / AHLI / DEWA cards) with a top nav: TENTANG, PETUNJUK, MATERI,
    PENGEMBANG.
  - Each level shows one puzzle screen: an image, a narrative paragraph,
    an input ("apa kata sandinya?"), and a LOG IN button. Wrong answer →
    red "FALSE" stamp, stays on the same screen. Correct answer → green
    "DO'S" stamp, then a bottom arrow advances to a "Bukti" (evidence —
    the narrative with the answer's letters highlighted) + "Fakta"
    (educational fact about the underlying crypto concept) screen, then
    back to the hub.
  - Three distinct puzzle mechanics were decoded from the screenshots:
    - **PEMULA**: an acrostic. Specific letters inside the narrative are
      bolded; read in order they spell the answer. Example decoded from
      the docx: bolded letters `e,n,i,g,m,a` → answer `enigma`.
    - **AHLI**: a Caesar-cipher exercise. The narrative names "Julio
      Ceasar" and hints at a shift ("maju 3 langkah kedepan"). A keyword
      in the text is bolded (`Tangguh`); the player must **encrypt** it
      with the hinted shift and submit the ciphertext. Decoded from the
      docx: `Tangguh` shifted +3 → `Wdqjjxk`, which the screenshot shows
      accepted as correct.
    - **DEWA**: multi-clue deduction, no direct cipher arithmetic. A
      pseudo-ciphertext and several narrative/visual clues (a river photo,
      a list of East Java regency names, a distance figure) must be
      combined; the answer is the river connecting all the named
      regencies (`brantas`), explained afterward via a "Pemecahan kode" +
      "Tarik kesimpulan" breakdown.
  - Closing screen: "FIX KAMU JAGO KEREN MY 'SUHU'" + exit icon. The
    docx's flow notes additionally ask for participant name, completion
    time, an all-participants ranking sourced from a Google Sheet, and a
    social-share button on this screen — this is the Phase 2 capability
    called out above and scoped out of this spec (see Phase 2 section).
  - TENTANG describes the game as educational multimedia adapted from
    "Pengantar Persandian" course material, credited in the docx to Sifa
    Septiano Nugroho (BSSN). PENGEMBANG in the source doc credits that
    same person; the site owner asked for it to carry his own profile
    instead.
  - Screenshots are cropped, e-learning-tool-rendered images (some carry a
    Google Lens watermark) at moderate resolution — not usable directly as
    site assets. Decorative backgrounds (hexagon/circuit dark pattern) are
    recreated with CSS/SVG rather than sourced as photos. Per-question
    photos (food spread, goalkeeper, Enigma machine, flood news clipping)
    are replaced with topically-equivalent royalty-free images.
- Decisions confirmed with the site owner:
  - One question per level for the initial ship, structured as a config
    array so more can be appended later without touching engine code.
  - Levels are freely selectable from the hub in any order (no lock/gate
    progression).
  - Folder name: `tebaksandi` (matches the reference domain).
  - No link from `index.html` is added in this pass — the owner will wire
    that up separately once the game is live.
  - Leaderboard / Sheets-write / social-share deferred to Phase 2.

## Chosen approach: single-page vanilla state machine

Rejected alternative: one HTML file per screen (landing.html,
hub.html, level-pemula.html, …) with browser navigation between them.
Rejected because participant name and session timer need to survive
across every screen, and a full page reload per screen adds no benefit
here (no need for shareable/bookmarkable per-screen URLs) while
complicating state handoff.

Instead: one `index.html` shell with a JS state machine
(`js/app.js`) that swaps which `<section>` is visible in response to user
actions, keeping name/timer/progress in in-memory state (and mirrored to
`localStorage` so a reload mid-session doesn't lose progress). This
matches the reference site's own single-page-with-slides structure and
keeps the implementation in the same no-build, vanilla-JS style as the
rest of `arizal.my.id`.

## File changes

New folder, nothing existing is touched:

```
tebaksandi/
  index.html            # shell: nav + all <section> screens, hidden/shown via JS
  css/style.css          # dark cyber theme: layout, screen transitions, stamps
  js/app.js              # state machine: current screen, participant, timer, progress
  js/questions.js        # config array: one entry per level (see Data model)
  js/crypto-utils.js     # caesarShift(), sha256Hex() answer-check helper
  img/                   # per-question images + favicon-style logo asset
```

## Data model (`js/questions.js`)

```js
[
  {
    level: "pemula",           // "pemula" | "ahli" | "dewa"
    title: "...",                // card/heading label shown during the puzzle
    image: "img/pemula-1.jpg",
    narrativeHtml: "...",       // answer-bearing letters wrapped in <b>
    hint: "...",                 // optional short hint line
    answerHash: "...",           // sha256 of normalize(answer)
    explanation: {
      bukti: "...",              // reuses narrativeHtml, highlighted
      fakta: { image: "...", text: "..." }
    }
  },
  // one entry each for "ahli", "dewa" at ship time
]
```

`normalize(input)` = trim + lowercase before hashing/comparing, so casing
and stray whitespace don't cause false negatives.

## Answer verification

Input is normalized and hashed with `crypto.subtle.digest("SHA-256", …)`,
compared against the stored `answerHash`. This is **not** real
anti-cheat — the hash algorithm and normalization are visible in the
shipped JS, and the Bukti/Fakta screen reveals the plaintext answer the
moment a player gets it right, so anyone motivated can still recover
answers from page source or from a friend who's already solved it. The
only thing this stops is a casual `Ctrl+F` for the answer string in view-
source. That tradeoff is intentional and stated here so it isn't
mistaken for a security control later.

## Screen flow

```
Landing (hero + CTA)
  → Name entry ("Who?" input; name saved to localStorage; session timer starts)
  → Hub (PEMULA / AHLI / DEWA cards, always all unlocked; top nav)
       ├─ TENTANG / PETUNJUK / MATERI / PENGEMBANG (static info screens, back-arrow to hub)
       └─ per level: Puzzle screen
            wrong answer → inline "FALSE" stamp, input stays editable
            correct answer → inline "DO'S" stamp → (bottom arrow) → Bukti+Fakta screen → back to hub
  → once all 3 levels solved: Closing screen (celebratory copy + participant
    name + this session's total elapsed time, computed client-side from the
    timer start; no cross-participant ranking in this ship — see Phase 2)
```

## Content for the four info screens

- **TENTANG**: adapted from the docx description, framed as an
  educational cryptography game; includes a one-line credit, "diadaptasi
  dari konsep game Tebak Sandi oleh Sifa Septiano Nugroho, BSSN."
- **PETUNJUK**: adapted legend explaining the image/text clue, the answer
  input, the LOG IN button, and the FALSE/DO'S stamps — same content the
  docx shows, reworded to this game's own copy.
- **MATERI**: short, level-agnostic primer covering the three mechanics
  actually used (Caesar cipher, acrostic/hidden-letter ciphers, and
  deductive cryptanalysis) rather than the original doc's course-specific
  "TARSAN" framing, since this ship isn't tied to that course.
  Prev/next-arrow carousel matching the docx's MATERI screen layout is
  YAGNI for one static passage — a single scrollable panel is used
  instead.
- **PENGEMBANG**: site owner's own profile (name, title "Dosen —
  Politeknik Siber dan Sandi Negara (BSSN)", short bio), sourced from the
  existing About section in `index.html`, photo `assets/img/me.jpg`.

## Visual design

Dark theme matching the reference screenshots: near-black background,
teal/cyan (`#1fb6c9`-ish) accent for buttons and active states, bold
condensed uppercase headings, hexagon/circuit-pattern background
rendered with CSS/SVG (no external background photography needed).
Green "DO'S" / red "FALSE" stamps as rotated, bordered text badges,
matching the docx screenshots' look without needing the original stamp
graphics.

## Phase 2 (explicitly out of scope for this ship)

- Persisting participant name + completion time to a Google Sheet and
  reading back an all-participants ranking for the closing screen.
  Requires a **write** path the site doesn't have today — the existing
  Sheets integration is read-only via a referrer-restricted public API
  key. The no-backend option on GitHub Pages is a Google Apps Script Web
  App (`doPost`), which the site owner would need to create and deploy
  from their own Google account; this spec does not assume that script
  exists yet. If/when built: POST as `text/plain` with
  `JSON.parse(e.postData.contents)` server-side (Apps Script doesn't
  answer CORS preflights for `application/json`), and read the
  leaderboard back through the *existing* read-only `values.get` path
  rather than through Apps Script's GET handler (its redirect to
  `script.googleusercontent.com` breaks CORS reads).
- Social-share button on the closing screen (depends on the above —
  there's no "result" worth sharing without a saved score).
- Sequential level locking (currently: freely selectable).
- Per-question timer / scoring pressure (currently: one whole-session
  elapsed-time readout, client-side and therefore informational only —
  this is a classroom/portfolio demo, not a proctored exam).
- Multiple questions per level (currently: one each, in an array shaped
  to make adding more a content-only change).

## Testing

No test framework exists in this repo for static-site JS beyond the
Sheets-table engine's own tests (`tests/`). For this feature: manual
verification of each screen transition and both puzzle answer paths
(wrong → FALSE stays editable; correct → DO'S → Bukti/Fakta → hub) for
all three levels, plus a quick check that `crypto-utils.js`'s
`caesarShift`/`sha256Hex` helpers produce the exact values decoded above
(`Tangguh` → `Wdqjjxk` at shift 3; `sha256("enigma")` matches the stored
hash) — cheap enough to assert inline during implementation rather than
standing up a test runner for one small feature.
