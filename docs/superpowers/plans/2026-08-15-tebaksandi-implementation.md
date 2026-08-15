# Tebak Sandi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone, static 3-level cryptography puzzle game at `tebaksandi/` on `arizal.my.id`, playable end-to-end (name entry → solve PEMULA/AHLI/DEWA in any order → closing screen), with no server and no new site capability beyond what a static page can do on its own.

**Architecture:** One `index.html` shell containing every screen as a `<section class="ts-screen">`, shown/hidden by a small vanilla-JS state machine (`js/app.js`). Puzzle content (image, narrative, hint, answer hash, explanation) lives in a data-only config array (`js/questions.js`); answer checking is pure logic in `js/crypto-utils.js` (Caesar shift + SHA-256 hashing), reused from both the browser and Node tests via the same UMD pattern already used by `assets/js/sheet-table-utils.js`.

**Tech Stack:** Vanilla HTML/CSS/JS, no build step, no framework, no new dependencies. Tests run with Node's built-in `node:test` via `node --test tests/` (already the repo's only test tooling).

**Spec:** `docs/superpowers/specs/2026-08-15-tebaksandi-design.md`

## Global Constraints

- No build step; plain HTML/CSS/JS only, matching the rest of `arizal.my.id`.
- Folder name is `tebaksandi/` at the repo root.
- Exactly one question per level (`pemula`, `ahli`, `dewa`) for this ship, held in a config array so more can be appended later without touching engine code.
- Levels are freely selectable from the hub in any order — no lock/gate progression between them.
- Answers are verified by SHA-256-hashing the normalized (trim + lowercase) input and comparing to a stored hash. This is **not** anti-cheat — say so in a code comment where the hash check lives — it only avoids the answer sitting in plaintext in view-source; the Bukti/Fakta screen reveals it anyway once solved.
- Session state (participant name, start time, solved levels) persists to `localStorage` only. No server, no cross-participant data, no leaderboard.
- No link is added from the site's root `index.html` in this pass — the folder is self-contained and reachable only by its own URL for now.
- Out of scope entirely for this ship (do not build): Google-Sheets write path, participant leaderboard/ranking, social-share button, sequential level locking, per-question timer, multiple questions per level.
- New tests follow the existing convention: a UMD module (`module.exports` when `typeof module === 'object'`, else a `window.X` global) tested with Node's built-in `node:test`, flat files under `tests/`, no new dependency or `package.json` needed.

---

## File Structure

```
tebaksandi/
  index.html            # all screens' markup + final copy, script tags
  css/style.css          # dark cyber theme for every screen
  js/crypto-utils.js     # normalizeAnswer, caesarShift, sha256Hex (pure, UMD)
  js/questions.js        # 3-entry question config array (pure data, UMD)
  js/app.js              # state machine: screens, name/timer, puzzle flow
  img/pemula-clue.svg
  img/ahli-clue.svg
  img/dewa-clue.svg
  img/enigma-fakta.svg
tests/
  tebaksandi-crypto-utils.test.js
  tebaksandi-questions.test.js
```

---

### Task 1: Answer-checking primitives (`crypto-utils.js`)

**Files:**
- Create: `tebaksandi/js/crypto-utils.js`
- Test: `tests/tebaksandi-crypto-utils.test.js`

**Interfaces:**
- Produces: `CryptoUtils.normalizeAnswer(str) -> string`, `CryptoUtils.caesarShift(str, shift) -> string`, `CryptoUtils.sha256Hex(str) -> Promise<string>` (64-char lowercase hex). Consumed by `js/questions.js`'s test (Task 3) and by `js/app.js` (Task 6).

- [ ] **Step 1: Write the failing tests**

```js
// tests/tebaksandi-crypto-utils.test.js
const test = require('node:test');
const assert = require('node:assert');
const CryptoUtils = require('../tebaksandi/js/crypto-utils.js');

test('normalizeAnswer trims whitespace and lowercases', () => {
  assert.strictEqual(CryptoUtils.normalizeAnswer('  ENIGMA  '), 'enigma');
});

test('caesarShift shifts letters forward by the given amount, preserving case and non-letters', () => {
  assert.strictEqual(CryptoUtils.caesarShift('Tangguh', 3), 'Wdqjjxk');
  assert.strictEqual(CryptoUtils.caesarShift('Kali Ciliwung', 3), 'Ndol Flolzxqj');
});

test('caesarShift wraps around the end of the alphabet', () => {
  assert.strictEqual(CryptoUtils.caesarShift('xyz', 3), 'abc');
});

test('sha256Hex resolves to the known SHA-256 digest of the input', async () => {
  const hash = await CryptoUtils.sha256Hex('enigma');
  assert.strictEqual(hash, '67a4f45f0d1d9bc606486fc42dc4941668e71d34ee500735fe9b7ea4625c687c');
  assert.strictEqual(hash.length, 64);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/tebaksandi-crypto-utils.test.js`
Expected: FAIL — `Cannot find module '../tebaksandi/js/crypto-utils.js'`

- [ ] **Step 3: Write the implementation**

```js
// tebaksandi/js/crypto-utils.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CryptoUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function normalizeAnswer(str) {
    return String(str || '').trim().toLowerCase();
  }

  function caesarShift(str, shift) {
    var input = String(str || '');
    var amount = ((shift % 26) + 26) % 26;
    var result = '';
    for (var i = 0; i < input.length; i++) {
      var code = input.charCodeAt(i);
      if (code >= 65 && code <= 90) {
        result += String.fromCharCode(((code - 65 + amount) % 26) + 65);
      } else if (code >= 97 && code <= 122) {
        result += String.fromCharCode(((code - 97 + amount) % 26) + 97);
      } else {
        result += input[i];
      }
    }
    return result;
  }

  // NOTE: this hash check is a casual deterrent against `Ctrl+F`-ing the
  // answer in view-source, not real anti-cheat — the algorithm and the
  // normalized plaintext are both visible in this file, and the Bukti/
  // Fakta screen reveals the answer anyway once a level is solved.
  function sha256Hex(str) {
    var bytes = new TextEncoder().encode(String(str || ''));
    return crypto.subtle.digest('SHA-256', bytes).then(function (buffer) {
      return Array.from(new Uint8Array(buffer))
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    });
  }

  return {
    normalizeAnswer: normalizeAnswer,
    caesarShift: caesarShift,
    sha256Hex: sha256Hex,
  };
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/tebaksandi-crypto-utils.test.js`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add tebaksandi/js/crypto-utils.js tests/tebaksandi-crypto-utils.test.js
git commit -m "Add crypto-utils.js: normalize/caesar/sha256 helpers for Tebak Sandi"
```

---

### Task 2: Puzzle image assets (SVG)

No source photos are available at usable resolution/license (see spec). Each clue and the one confirmed explanation image are recreated as small, self-contained flat SVG illustrations — no external download, no licensing risk.

**Files:**
- Create: `tebaksandi/img/pemula-clue.svg`
- Create: `tebaksandi/img/ahli-clue.svg`
- Create: `tebaksandi/img/dewa-clue.svg`
- Create: `tebaksandi/img/enigma-fakta.svg`

**Interfaces:**
- Produces: 4 image files referenced by path from `js/questions.js` (Task 3).

- [ ] **Step 1: Create the PEMULA clue image (breakfast bowls)**

```svg
<!-- tebaksandi/img/pemula-clue.svg -->
<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustrasi semangkuk sarapan pagi">
  <rect width="400" height="260" fill="#0b1120"/>
  <rect x="20" y="190" width="360" height="14" rx="7" fill="#132132"/>
  <ellipse cx="120" cy="150" rx="80" ry="50" fill="#173042"/>
  <ellipse cx="120" cy="140" rx="70" ry="40" fill="#1fb6c9" opacity="0.85"/>
  <ellipse cx="95" cy="130" rx="14" ry="9" fill="#f2c14e"/>
  <ellipse cx="140" cy="135" rx="10" ry="7" fill="#e8622c"/>
  <ellipse cx="260" cy="160" rx="70" ry="44" fill="#173042"/>
  <ellipse cx="260" cy="150" rx="60" ry="34" fill="#2fd3c7" opacity="0.85"/>
  <ellipse cx="240" cy="145" rx="12" ry="8" fill="#f2c14e"/>
  <ellipse cx="280" cy="148" rx="9" ry="6" fill="#6bbf59"/>
  <path d="M100 90 q6 -18 0 -30" stroke="#8fe3df" stroke-width="3" fill="none" opacity="0.6"/>
  <path d="M130 90 q6 -18 0 -30" stroke="#8fe3df" stroke-width="3" fill="none" opacity="0.6"/>
  <path d="M250 100 q6 -16 0 -28" stroke="#8fe3df" stroke-width="3" fill="none" opacity="0.6"/>
</svg>
```

- [ ] **Step 2: Create the AHLI clue image (goalkeeper before goal)**

```svg
<!-- tebaksandi/img/ahli-clue.svg -->
<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustrasi kiper menghadang bola di depan gawang">
  <rect width="400" height="260" fill="#0b1120"/>
  <rect x="60" y="40" width="280" height="140" fill="none" stroke="#2fd3c7" stroke-width="6"/>
  <g stroke="#173042" stroke-width="2">
    <line x1="60" y1="40" x2="340" y2="40"/>
    <line x1="60" y1="70" x2="340" y2="70"/>
    <line x1="60" y1="100" x2="340" y2="100"/>
    <line x1="60" y1="130" x2="340" y2="130"/>
    <line x1="60" y1="160" x2="340" y2="160"/>
    <line x1="100" y1="40" x2="100" y2="180"/>
    <line x1="150" y1="40" x2="150" y2="180"/>
    <line x1="200" y1="40" x2="200" y2="180"/>
    <line x1="250" y1="40" x2="250" y2="180"/>
    <line x1="300" y1="40" x2="300" y2="180"/>
  </g>
  <rect x="20" y="180" width="360" height="16" fill="#173042"/>
  <g transform="translate(200 150) rotate(-20)">
    <circle cx="0" cy="-30" r="14" fill="#f2c14e"/>
    <rect x="-10" y="-16" width="20" height="34" rx="8" fill="#1fb6c9"/>
    <line x1="-10" y1="-8" x2="-40" y2="-20" stroke="#1fb6c9" stroke-width="8" stroke-linecap="round"/>
    <line x1="10" y1="-8" x2="40" y2="-20" stroke="#1fb6c9" stroke-width="8" stroke-linecap="round"/>
    <line x1="-6" y1="18" x2="-20" y2="46" stroke="#0f2a3a" stroke-width="9" stroke-linecap="round"/>
    <line x1="6" y1="18" x2="20" y2="46" stroke="#0f2a3a" stroke-width="9" stroke-linecap="round"/>
  </g>
  <circle cx="130" cy="120" r="10" fill="#e8622c"/>
</svg>
```

- [ ] **Step 3: Create the DEWA clue image (decoy news clipping)**

```svg
<!-- tebaksandi/img/dewa-clue.svg -->
<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustrasi kliping berita banjir di bantaran sungai">
  <rect width="400" height="260" fill="#0b1120"/>
  <rect x="30" y="20" width="340" height="220" rx="6" fill="#0f1b2a" stroke="#2fd3c7" stroke-width="2"/>
  <rect x="50" y="40" width="140" height="90" fill="#173042"/>
  <path d="M50 110 q35 -30 70 0 t70 0 v20 h-140 z" fill="#1fb6c9" opacity="0.8"/>
  <rect x="200" y="45" width="150" height="10" fill="#26445a"/>
  <rect x="200" y="62" width="150" height="8" fill="#1c3a4d"/>
  <rect x="200" y="76" width="150" height="8" fill="#1c3a4d"/>
  <rect x="200" y="90" width="110" height="8" fill="#1c3a4d"/>
  <rect x="50" y="150" width="300" height="8" fill="#1c3a4d"/>
  <rect x="50" y="165" width="300" height="8" fill="#1c3a4d"/>
  <rect x="50" y="180" width="260" height="8" fill="#1c3a4d"/>
  <rect x="50" y="195" width="280" height="8" fill="#1c3a4d"/>
  <circle cx="340" cy="55" r="12" fill="#e8622c" opacity="0.9"/>
</svg>
```

- [ ] **Step 4: Create the PEMULA explanation image (Enigma machine)**

```svg
<!-- tebaksandi/img/enigma-fakta.svg -->
<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustrasi mesin sandi Enigma">
  <rect width="400" height="260" fill="#0b1120"/>
  <rect x="70" y="120" width="260" height="100" rx="8" fill="#173042"/>
  <g fill="#2fd3c7">
    <circle cx="140" cy="90" r="26"/>
    <circle cx="200" cy="90" r="26"/>
    <circle cx="260" cy="90" r="26"/>
  </g>
  <g fill="#0b1120">
    <circle cx="140" cy="90" r="10"/>
    <circle cx="200" cy="90" r="10"/>
    <circle cx="260" cy="90" r="10"/>
  </g>
  <g fill="#1fb6c9">
    <circle cx="100" cy="160" r="10"/><circle cx="125" cy="160" r="10"/><circle cx="150" cy="160" r="10"/>
    <circle cx="175" cy="160" r="10"/><circle cx="200" cy="160" r="10"/><circle cx="225" cy="160" r="10"/>
    <circle cx="250" cy="160" r="10"/><circle cx="275" cy="160" r="10"/><circle cx="300" cy="160" r="10"/>
    <circle cx="112" cy="190" r="10"/><circle cx="137" cy="190" r="10"/><circle cx="162" cy="190" r="10"/>
    <circle cx="187" cy="190" r="10"/><circle cx="212" cy="190" r="10"/><circle cx="237" cy="190" r="10"/>
    <circle cx="262" cy="190" r="10"/><circle cx="287" cy="190" r="10"/>
  </g>
</svg>
```

- [ ] **Step 5: Verify the files open correctly**

Open each of the 4 files directly in a browser (double-click, or `file://` path). Expected: each renders a dark-background flat illustration matching its description above, no console/parse errors.

- [ ] **Step 6: Commit**

```bash
git add tebaksandi/img/
git commit -m "Add SVG clue and explanation illustrations for Tebak Sandi"
```

---

### Task 3: Question content (`questions.js`)

**Files:**
- Create: `tebaksandi/js/questions.js`
- Test: `tests/tebaksandi-questions.test.js`

**Interfaces:**
- Consumes: `CryptoUtils.normalizeAnswer`, `CryptoUtils.sha256Hex` (Task 1, test-only) and the 4 SVG paths from Task 2.
- Produces: `Questions` — an array of 3 objects, each `{ level, title, image, narrativeHtml, hint, answerHash, explanation: { bukti, fakta: { image, text } } }`. Consumed by `js/app.js` (Tasks 6–7).

- [ ] **Step 1: Write the failing tests**

```js
// tests/tebaksandi-questions.test.js
const test = require('node:test');
const assert = require('node:assert');
const Questions = require('../tebaksandi/js/questions.js');
const CryptoUtils = require('../tebaksandi/js/crypto-utils.js');

test('questions.js defines exactly one entry for each of the three levels', () => {
  const levels = Questions.map((q) => q.level).sort();
  assert.deepStrictEqual(levels, ['ahli', 'dewa', 'pemula']);
});

test('every question has the fields the app depends on', () => {
  for (const q of Questions) {
    assert.strictEqual(typeof q.title, 'string');
    assert.strictEqual(typeof q.image, 'string');
    assert.strictEqual(typeof q.narrativeHtml, 'string');
    assert.strictEqual(typeof q.hint, 'string');
    assert.strictEqual(typeof q.answerHash, 'string');
    assert.strictEqual(q.answerHash.length, 64);
    assert.strictEqual(typeof q.explanation.bukti, 'string');
    assert.strictEqual(typeof q.explanation.fakta.text, 'string');
  }
});

test('answerHash for each level matches the SHA-256 of its known correct answer', async () => {
  const known = { pemula: 'enigma', ahli: 'Wdqjjxk', dewa: 'brantas' };
  for (const q of Questions) {
    const expected = await CryptoUtils.sha256Hex(CryptoUtils.normalizeAnswer(known[q.level]));
    assert.strictEqual(q.answerHash, expected);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/tebaksandi-questions.test.js`
Expected: FAIL — `Cannot find module '../tebaksandi/js/questions.js'`

- [ ] **Step 3: Write the implementation**

```js
// tebaksandi/js/questions.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Questions = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return [
    {
      level: 'pemula',
      title: 'Sarapan yang Menggugah',
      image: 'img/pemula-clue.svg',
      narrativeHtml:
        'T<b>e</b>rlihat sarapa<b>n</b> pagi in<b>i</b> yang sederhana namun ' +
        'meng<b>g</b>ugah, karena racikan bu<b>m</b>bu rahasi<b>a</b> membuat ' +
        'semua orang ketagihan setiap pagi.',
      hint: 'Petunjuk: baca huruf-huruf yang dicetak tebal secara berurutan.',
      answerHash: '67a4f45f0d1d9bc606486fc42dc4941668e71d34ee500735fe9b7ea4625c687c',
      explanation: {
        bukti:
          'T<b>e</b>rlihat sarapa<b>n</b> pagi in<b>i</b> yang sederhana namun ' +
          'meng<b>g</b>ugah, karena racikan bu<b>m</b>bu rahasi<b>a</b> membuat ' +
          'semua orang ketagihan setiap pagi. Huruf tebal membentuk kata ' +
          '<strong>enigma</strong>.',
        fakta: {
          image: 'img/enigma-fakta.svg',
          text:
            'Mesin Enigma adalah mesin enkripsi elektromekanis yang digunakan ' +
            'militer Jerman pada Perang Dunia II. Sekutu berhasil memecahkan ' +
            'sandinya berkat kerja Alan Turing dan tim di Bletchley Park, salah ' +
            'satu tonggak sejarah kriptografi modern.',
        },
      },
    },
    {
      level: 'ahli',
      title: 'Kiper yang Tangguh',
      image: 'img/ahli-clue.svg',
      narrativeHtml:
        'Seorang kiper legendaris dikenal sebagai sosok yang <b>Tangguh</b> ' +
        'saat menghadapi adu penalti. Julius Caesar, panglima Romawi yang ' +
        'menginspirasi salah satu sandi klasik tertua, dikenal selalu ' +
        'memerintahkan pasukannya maju 3 langkah sebelum menyerang untuk ' +
        'mengacaukan hitungan lawan. Gunakan kebiasaan itu untuk menyandikan ' +
        'kata kunci di atas.',
      hint:
        'Petunjuk: geser tiap huruf pada kata yang dicetak tebal maju 3 posisi ' +
        'pada alfabet (Caesar Cipher), lalu ketik hasilnya.',
      answerHash: '9933f8a5a1373636535db6364fb71cf63f773f6a3b396e5cd1e77b897755e39b',
      explanation: {
        bukti:
          'Kata kunci <strong>Tangguh</strong> digeser maju 3 huruf menjadi ' +
          '<strong>Wdqjjxk</strong> — itulah kata sandinya.',
        fakta: {
          image: null,
          text:
            'Caesar Cipher adalah salah satu teknik penyandian substitusi ' +
            'tertua, dinamai dari Julius Caesar yang konon memakainya untuk ' +
            'mengirim pesan rahasia ke jenderalnya. Setiap huruf digeser ' +
            'sejumlah posisi tetap pada alfabet — mudah dipecahkan, namun ' +
            'menjadi fondasi banyak sandi klasik sesudahnya.',
        },
      },
    },
    {
      level: 'dewa',
      title: 'Sungai yang Tersembunyi',
      image: 'img/dewa-clue.svg',
      narrativeHtml:
        'Sebuah kliping berita lama menyebut banjir di Kali Ciliwung — tapi ' +
        'itu jebakan. Kode <b>7Kt10KBptnprVJt1m</b> ditemukan bersama daftar ' +
        'wilayah yang dilalui satu sungai besar di Jawa Timur: Kota Batu, ' +
        'Blitar, Kediri, Jombang, Mojokerto, Sidoarjo, hingga Surabaya, ' +
        'membentang sekitar 320 km dari hulu ke hilir.',
      hint:
        'Petunjuk: abaikan foto beritanya — cocokkan daftar kota di atas ' +
        'dengan satu nama sungai besar di Jawa Timur.',
      answerHash: '42c9097a71ac7d8055ec281afd73ddc919915b7c071836d34399ccfc43d40fc9',
      explanation: {
        bukti:
          'Kota Batu, Blitar, Kediri, Jombang, Mojokerto, Sidoarjo, dan ' +
          'Surabaya semuanya dilalui satu sungai yang sama sepanjang ' +
          'sekitar 320 km: <strong>Brantas</strong>. Kode acak dan foto ' +
          'berita Ciliwung hanyalah jebakan.',
        fakta: {
          image: null,
          text:
            'Sungai Brantas adalah sungai terpanjang kedua di Pulau Jawa, ' +
            'mengalir sekitar 320 km dari Kota Batu hingga bermuara di ' +
            'Selat Madura, melintasi banyak kota dan kabupaten di Jawa ' +
            'Timur. Dalam kriptanalisis dunia nyata, memecahkan sandi ' +
            'sering kali butuh pengetahuan di luar teks itu sendiri — ' +
            'persis seperti wawasan geografi yang dipakai di sini.',
        },
      },
    },
  ];
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/tebaksandi-questions.test.js`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add tebaksandi/js/questions.js tests/tebaksandi-questions.test.js
git commit -m "Add questions.js: PEMULA/AHLI/DEWA puzzle content for Tebak Sandi"
```

---

### Task 4: Page shell and dark theme (`index.html`, `css/style.css`)

**Files:**
- Create: `tebaksandi/index.html`
- Create: `tebaksandi/css/style.css`

**Interfaces:**
- Produces: every DOM id/class that `js/app.js` (Tasks 5–7) reads or toggles: screen ids (`screen-landing`, `screen-name`, `screen-hub`, `screen-tentang`, `screen-petunjuk`, `screen-materi`, `screen-pengembang`, `screen-puzzle`, `screen-explain`, `screen-closing`), the `.ts-screen` / `.ts-screen--active` toggle classes, and element ids `btn-start`, `input-name`, `btn-name-submit`, `.ts-level-card[data-level]`, `[data-nav]`, `[data-back]`, `puzzle-level-badge`, `puzzle-image`, `puzzle-narrative`, `puzzle-hint`, `puzzle-answer-input`, `puzzle-submit-btn`, `puzzle-stamp-false`, `puzzle-stamp-dos`, `puzzle-next-btn`, `puzzle-back-btn`, `explain-level-badge`, `explain-bukti`, `explain-fakta-image`, `explain-fakta-text`, `explain-hub-btn`, `closing-summary`, `btn-exit`.

- [ ] **Step 1: Write `index.html`**

```html
<!-- tebaksandi/index.html -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Tebak Sandi — game edukasi kriptografi 3 level: Pemula, Ahli, dan Dewa.">
  <title>Tebak Sandi</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="ts-nav">
    <div class="ts-logo">
      <svg class="ts-logo-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="5" y="11" width="14" height="9" rx="2"></rect>
        <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
      </svg>
      <span class="ts-logo-text">TEBAK<br>SANDI</span>
    </div>
    <nav class="ts-menu">
      <button type="button" data-nav="tentang">TENTANG</button>
      <button type="button" data-nav="petunjuk">PETUNJUK</button>
      <button type="button" data-nav="materi">MATERI</button>
      <button type="button" data-nav="pengembang">PENGEMBANG</button>
    </nav>
  </header>

  <main id="ts-app">

    <section id="screen-landing" class="ts-screen ts-screen--active">
      <div class="ts-hero">
        <h1 class="ts-hero-title">TEBAK<br>SANDI</h1>
        <p class="ts-hero-tagline">Beranikah menguji seberapa tinggi kemampuan <em>hacking</em> kamu?</p>
        <button type="button" id="btn-start" class="ts-btn-primary">Coba sekarang!</button>
      </div>
    </section>

    <section id="screen-name" class="ts-screen">
      <h2>Siapa namamu?</h2>
      <div class="ts-name-row">
        <input type="text" id="input-name" placeholder="Who?" autocomplete="off">
        <button type="button" id="btn-name-submit" class="ts-btn-primary">&rarr;</button>
      </div>
    </section>

    <section id="screen-hub" class="ts-screen">
      <h1 class="ts-section-title">TENTUKAN PILIHANMU!</h1>
      <div class="ts-level-cards">
        <button type="button" class="ts-level-card" data-level="pemula">
          <h3>PEMULA</h3>
          <p>Maksimalkan kemampuan logika dan visualisasimu dalam memecahkan petunjuk yang ditampilkan.</p>
        </button>
        <button type="button" class="ts-level-card" data-level="ahli">
          <h3>AHLI</h3>
          <p>Pemahaman tentang dasar-dasar persandian dibutuhkan di tahap ini.</p>
        </button>
        <button type="button" class="ts-level-card" data-level="dewa">
          <h3>DEWA</h3>
          <p>Maksimalkan semua kemampuan yang kamu miliki, termasuk insting <em>hacker</em>-mu.</p>
        </button>
      </div>
    </section>

    <section id="screen-tentang" class="ts-screen">
      <h2>TENTANG</h2>
      <p>TEBAK SANDI adalah game edukasi singkat seputar dasar-dasar kriptografi: sandi klasik, teknik penyandian, dan cara berpikir seorang pemecah kode. Uji kemampuan logika, ketelitian, dan nalarmu dalam membongkar petunjuk menjadi kata sandi yang tepat.</p>
      <p class="ts-credit">Diadaptasi dari konsep game Tebak Sandi oleh Sifa Septiano Nugroho, Badan Siber dan Sandi Negara (BSSN).</p>
      <button type="button" class="ts-arrow-back" data-back>&larr;</button>
    </section>

    <section id="screen-petunjuk" class="ts-screen">
      <h2>PETUNJUK</h2>
      <ul class="ts-petunjuk-list">
        <li>Gambar &amp; narasi di setiap level menyimpan petunjuk tersembunyi.</li>
        <li>Ketik jawabanmu pada kolom "apa kata sandinya?".</li>
        <li>Tekan tombol LOG IN untuk memeriksa jawaban.</li>
        <li>Stempel merah <strong>FALSE</strong> muncul jika jawabanmu masih keliru — coba lagi.</li>
        <li>Stempel hijau <strong>DO'S</strong> muncul jika jawabanmu benar, lalu tekan panah untuk melihat penjelasannya.</li>
      </ul>
      <button type="button" class="ts-arrow-back" data-back>&larr;</button>
    </section>

    <section id="screen-materi" class="ts-screen">
      <h2>MATERI</h2>
      <p>Tiga level di game ini mewakili tiga cara berpikir dasar dalam kriptografi:</p>
      <ul>
        <li><strong>PEMULA</strong> melatih ketelitian membaca pola tersembunyi (akrostik).</li>
        <li><strong>AHLI</strong> mengenalkan sandi substitusi klasik seperti Caesar Cipher.</li>
        <li><strong>DEWA</strong> melatih kriptanalisis: menggabungkan beberapa petunjuk dan pengetahuan di luar teks untuk memecahkan kode.</li>
      </ul>
      <button type="button" class="ts-arrow-back" data-back>&larr;</button>
    </section>

    <section id="screen-pengembang" class="ts-screen">
      <h2>PENGEMBANG</h2>
      <div class="ts-dev-card">
        <img src="../assets/img/me.jpg" alt="Foto Arizal" class="ts-dev-photo">
        <div>
          <h3>Arizal</h3>
          <p>Dosen Keamanan Siber, Politeknik Siber dan Sandi Negara (Badan Siber dan Sandi Negara)</p>
        </div>
      </div>
      <button type="button" class="ts-arrow-back" data-back>&larr;</button>
    </section>

    <section id="screen-puzzle" class="ts-screen">
      <div class="ts-level-badge" id="puzzle-level-badge"></div>
      <img id="puzzle-image" class="ts-puzzle-image" src="" alt="">
      <p id="puzzle-narrative" class="ts-puzzle-narrative"></p>
      <p id="puzzle-hint" class="ts-puzzle-hint"></p>
      <div class="ts-puzzle-input-row">
        <input type="text" id="puzzle-answer-input" placeholder="apa kata sandinya?" autocomplete="off">
        <button type="button" id="puzzle-submit-btn">LOG IN</button>
      </div>
      <div class="ts-stamp ts-stamp--false" id="puzzle-stamp-false" hidden>FALSE</div>
      <div class="ts-stamp ts-stamp--dos" id="puzzle-stamp-dos" hidden>DO'S</div>
      <div class="ts-puzzle-nav">
        <button type="button" class="ts-arrow-back" id="puzzle-back-btn">&larr;</button>
        <button type="button" class="ts-arrow-next" id="puzzle-next-btn" hidden>&rarr;</button>
      </div>
    </section>

    <section id="screen-explain" class="ts-screen">
      <div class="ts-level-badge" id="explain-level-badge"></div>
      <h2>Bukti:</h2>
      <p id="explain-bukti"></p>
      <h2>Fakta:</h2>
      <img id="explain-fakta-image" class="ts-fakta-image" src="" alt="" hidden>
      <p id="explain-fakta-text"></p>
      <button type="button" class="ts-arrow-next" id="explain-hub-btn">&rarr;</button>
    </section>

    <section id="screen-closing" class="ts-screen">
      <h1 class="ts-section-title">FIX KAMU JAGO KEREN MY "SUHU"</h1>
      <p id="closing-summary"></p>
      <button type="button" id="btn-exit" class="ts-btn-primary">Selesai</button>
    </section>

  </main>

  <script src="js/crypto-utils.js"></script>
  <script src="js/questions.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `css/style.css`**

```css
/* tebaksandi/css/style.css */
:root {
  --ts-bg: #0b1120;
  --ts-bg-alt: #0f1b2a;
  --ts-border: #1c3346;
  --ts-accent: #1fb6c9;
  --ts-accent-2: #2fd3c7;
  --ts-text: #e8f1f5;
  --ts-text-dim: #9fb4c0;
  --ts-danger: #e04b3f;
  --ts-success: #34c976;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background-color: var(--ts-bg);
  background-image:
    linear-gradient(rgba(31, 182, 201, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(31, 182, 201, 0.08) 1px, transparent 1px);
  background-size: 32px 32px;
  color: var(--ts-text);
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
}

button {
  font-family: inherit;
}

.ts-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.ts-logo {
  display: flex;
  align-items: center;
  gap: .5rem;
  color: var(--ts-accent);
}

.ts-logo-text {
  font-weight: 800;
  letter-spacing: .08em;
  line-height: 1.1;
  font-size: .85rem;
}

.ts-menu {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.ts-menu button {
  background: none;
  border: none;
  color: var(--ts-text-dim);
  text-transform: uppercase;
  letter-spacing: .08em;
  font-size: .85rem;
  cursor: pointer;
}

.ts-menu button:hover {
  color: var(--ts-accent);
}

.ts-screen {
  display: none;
  max-width: 900px;
  margin: 0 auto;
  padding: 3rem 2rem 4rem;
}

.ts-screen--active {
  display: block;
}

.ts-hero {
  text-align: center;
  padding-top: 4rem;
}

.ts-hero-title {
  font-size: 4rem;
  font-weight: 900;
  letter-spacing: .05em;
  margin: 0 0 1.5rem;
}

.ts-hero-tagline {
  color: var(--ts-text-dim);
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.ts-btn-primary {
  background: linear-gradient(90deg, var(--ts-accent), var(--ts-accent-2));
  border: none;
  color: #04202a;
  font-weight: 700;
  font-size: 1rem;
  padding: .75rem 2rem;
  border-radius: 30px;
  cursor: pointer;
}

.ts-name-row {
  display: flex;
  gap: .75rem;
  max-width: 480px;
  margin: 2rem auto 0;
}

.ts-name-row input {
  flex: 1;
  background: var(--ts-bg-alt);
  border: 1px solid var(--ts-accent);
  color: var(--ts-text);
  padding: .75rem 1.25rem;
  border-radius: 30px;
  font-size: 1rem;
}

.ts-section-title {
  font-size: 2.25rem;
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
  margin-bottom: 2.5rem;
}

.ts-level-cards {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.ts-level-card {
  flex: 1 1 220px;
  background: var(--ts-bg-alt);
  border: 1px solid var(--ts-border);
  color: var(--ts-text);
  border-radius: 10px;
  padding: 2rem 1.5rem;
  text-align: left;
  cursor: pointer;
}

.ts-level-card:hover {
  border-color: var(--ts-accent);
}

.ts-level-card h3 {
  margin: 0 0 .75rem;
  letter-spacing: .05em;
}

.ts-level-card p {
  margin: 0;
  color: var(--ts-text-dim);
  font-size: .9rem;
}

.ts-credit {
  color: var(--ts-text-dim);
  font-size: .85rem;
  font-style: italic;
}

.ts-petunjuk-list {
  line-height: 1.9;
}

.ts-dev-card {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  background: var(--ts-bg-alt);
  border: 1px solid var(--ts-border);
  border-radius: 10px;
  padding: 1.5rem;
}

.ts-dev-photo {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid var(--ts-accent);
}

.ts-level-badge {
  display: inline-block;
  background: var(--ts-accent);
  color: #04202a;
  font-weight: 700;
  letter-spacing: .1em;
  padding: .35rem 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.ts-puzzle-image,
.ts-fakta-image {
  max-width: 100%;
  border-radius: 8px;
  margin-bottom: 1.25rem;
  display: block;
}

.ts-puzzle-narrative {
  line-height: 1.7;
  font-size: 1.05rem;
}

.ts-puzzle-hint {
  color: var(--ts-text-dim);
  font-size: .9rem;
  font-style: italic;
}

.ts-puzzle-input-row {
  display: flex;
  gap: .75rem;
  margin: 1.5rem 0;
  max-width: 480px;
}

.ts-puzzle-input-row input {
  flex: 1;
  background: var(--ts-bg-alt);
  border: 1px solid var(--ts-accent);
  color: var(--ts-text);
  padding: .65rem 1.1rem;
  border-radius: 30px;
}

.ts-puzzle-input-row button {
  background: linear-gradient(90deg, var(--ts-accent), var(--ts-accent-2));
  border: none;
  color: #04202a;
  font-weight: 700;
  padding: .65rem 1.5rem;
  border-radius: 30px;
  cursor: pointer;
}

.ts-stamp {
  display: inline-block;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: .1em;
  border: 4px solid;
  padding: .25rem 1.25rem;
  transform: rotate(-6deg);
  margin-bottom: 1.5rem;
}

.ts-stamp--false {
  color: var(--ts-danger);
  border-color: var(--ts-danger);
}

.ts-stamp--dos {
  color: var(--ts-success);
  border-color: var(--ts-success);
}

.ts-puzzle-nav {
  display: flex;
  gap: 1rem;
}

.ts-arrow-back,
.ts-arrow-next {
  background: linear-gradient(90deg, var(--ts-accent), var(--ts-accent-2));
  border: none;
  color: #04202a;
  font-weight: 700;
  font-size: 1.1rem;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  cursor: pointer;
}

@media (max-width: 640px) {
  .ts-nav {
    flex-direction: column;
    align-items: flex-start;
  }

  .ts-hero-title {
    font-size: 2.5rem;
  }

  .ts-level-cards {
    flex-direction: column;
  }
}
```

- [ ] **Step 3: Manually verify the shell**

Open `tebaksandi/index.html` directly in a browser. Expected: dark background with a faint grid pattern, "TEBAK SANDI" hero title, tagline, and a "Coba sekarang!" button — this is the only visible screen (all other `<section>` elements are present in the DOM but hidden by `.ts-screen` having no `.ts-screen--active`). No interactivity yet — clicking the button does nothing until Task 5. No console errors (the three `<script>` tags will 404 on nothing since Tasks 1–3 already created those files; `app.js` doesn't exist yet, so expect one 404 for `js/app.js` at this point — that's expected and resolved in Task 5).

- [ ] **Step 4: Commit**

```bash
git add tebaksandi/index.html tebaksandi/css/style.css
git commit -m "Add Tebak Sandi page shell: all screens' markup and dark theme CSS"
```

---

### Task 5: Screen navigation, name entry, session persistence (`app.js` part 1)

**Files:**
- Create: `tebaksandi/js/app.js`

**Interfaces:**
- Consumes: DOM ids from Task 4.
- Produces (module-scope, extended by Tasks 6–7): `state` object (`participantName`, `startTime`, `solvedLevels`, `currentLevel`, `currentQuestion`), `showScreen(id)`, `persistState()`, `initFromStorage()`, `wireNav()`. These names are load-bearing — Tasks 6 and 7 insert code that calls them by these exact names.

- [ ] **Step 1: Write `app.js`**

```js
// tebaksandi/js/app.js
(function () {
  'use strict';

  var STORAGE_KEY = 'tebaksandi-state';

  var state = {
    participantName: null,
    startTime: null,
    solvedLevels: {},
    currentLevel: null,
    currentQuestion: null,
  };

  var lastScreenBeforeInfo = 'screen-hub';

  function showScreen(id) {
    document.querySelectorAll('.ts-screen').forEach(function (el) {
      el.classList.remove('ts-screen--active');
    });
    document.getElementById(id).classList.add('ts-screen--active');
  }

  function persistState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      participantName: state.participantName,
      startTime: state.startTime,
      solvedLevels: state.solvedLevels,
    }));
  }

  function initFromStorage() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      var saved = JSON.parse(raw);
      state.participantName = saved.participantName || null;
      state.startTime = saved.startTime || null;
      state.solvedLevels = saved.solvedLevels || {};
    } catch (e) {
      // Corrupt localStorage value: ignore and start fresh.
    }
  }

  function handleStart() {
    showScreen('screen-name');
  }

  function handleNameSubmit() {
    var input = document.getElementById('input-name');
    var name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    state.participantName = name;
    state.startTime = Date.now();
    persistState();
    showScreen('screen-hub');
  }

  function wireNav() {
    document.getElementById('btn-start').addEventListener('click', handleStart);
    document.getElementById('btn-name-submit').addEventListener('click', handleNameSubmit);

    document.querySelectorAll('[data-nav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var active = document.querySelector('.ts-screen--active');
        if (active) lastScreenBeforeInfo = active.id;
        showScreen('screen-' + btn.getAttribute('data-nav'));
      });
    });

    document.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showScreen(lastScreenBeforeInfo);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFromStorage();
    wireNav();
    if (state.participantName) {
      showScreen('screen-hub');
    }
  });
})();
```

- [ ] **Step 2: Manually verify**

Open `tebaksandi/index.html` in a browser (via a local static server if `crypto.subtle` warnings appear under `file://` — e.g. `python3 -m http.server` from the `tebaksandi/` folder, then visit `http://localhost:8000/`). Click "Coba sekarang!" → name screen appears. Type a name, click the arrow → hub screen appears with 3 level cards (not yet clickable — that's Task 6) and a top nav. Click "TENTANG" → info screen appears; click its back arrow → hub reappears. Reload the page → hub appears immediately (name was persisted to `localStorage`).

- [ ] **Step 3: Commit**

```bash
git add tebaksandi/js/app.js
git commit -m "Add Tebak Sandi app.js: screen navigation, name entry, session persistence"
```

---

### Task 6: Puzzle answer flow (`app.js` part 2)

**Files:**
- Modify: `tebaksandi/js/app.js`

**Interfaces:**
- Consumes: `Questions` (Task 3), `CryptoUtils.normalizeAnswer`/`sha256Hex` (Task 1), `state`/`showScreen`/`persistState`/`wireNav` (Task 5).
- Produces: `handleLevelSelect(level)`, `renderPuzzle(level)`, `handlePuzzleSubmit()` — `renderPuzzle` is called by Task 7's explain-screen flow indirectly via `state.currentQuestion`, which this task sets.

- [ ] **Step 1: Insert the puzzle functions**

In `tebaksandi/js/app.js`, insert the following three functions immediately after the closing `}` of `handleNameSubmit` and before `function wireNav() {`:

```js
  function handleLevelSelect(level) {
    state.currentLevel = level;
    renderPuzzle(level);
    showScreen('screen-puzzle');
  }

  function renderPuzzle(level) {
    var question = Questions.filter(function (item) {
      return item.level === level;
    })[0];
    state.currentQuestion = question;

    document.getElementById('puzzle-level-badge').textContent = level.toUpperCase();
    document.getElementById('puzzle-image').src = question.image;
    document.getElementById('puzzle-image').alt = question.title;
    document.getElementById('puzzle-narrative').innerHTML = question.narrativeHtml;
    document.getElementById('puzzle-hint').textContent = question.hint;

    var input = document.getElementById('puzzle-answer-input');
    input.value = '';
    input.disabled = false;
    document.getElementById('puzzle-submit-btn').disabled = false;
    document.getElementById('puzzle-stamp-false').hidden = true;
    document.getElementById('puzzle-stamp-dos').hidden = true;
    document.getElementById('puzzle-next-btn').hidden = true;
  }

  function handlePuzzleSubmit() {
    var input = document.getElementById('puzzle-answer-input');
    var normalized = CryptoUtils.normalizeAnswer(input.value);
    CryptoUtils.sha256Hex(normalized).then(function (hash) {
      var falseStamp = document.getElementById('puzzle-stamp-false');
      var dosStamp = document.getElementById('puzzle-stamp-dos');
      if (hash === state.currentQuestion.answerHash) {
        falseStamp.hidden = true;
        dosStamp.hidden = false;
        document.getElementById('puzzle-next-btn').hidden = false;
        input.disabled = true;
        document.getElementById('puzzle-submit-btn').disabled = true;
        state.solvedLevels[state.currentLevel] = true;
        persistState();
      } else {
        dosStamp.hidden = true;
        falseStamp.hidden = false;
      }
    });
  }
```

- [ ] **Step 2: Wire the new listeners**

In `tebaksandi/js/app.js`, inside `wireNav()`, immediately before its final closing `}`, insert:

```js
    document.querySelectorAll('.ts-level-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleLevelSelect(btn.getAttribute('data-level'));
      });
    });

    document.getElementById('puzzle-submit-btn').addEventListener('click', handlePuzzleSubmit);
    document.getElementById('puzzle-back-btn').addEventListener('click', function () {
      showScreen('screen-hub');
    });
```

- [ ] **Step 3: Manually verify**

Reload the page (clear `localStorage` first via devtools if you want to restart from the landing screen: `localStorage.removeItem('tebaksandi-state')`). Go through name entry to the hub, click the **PEMULA** card → puzzle screen shows the breakfast-bowls image and narrative. Type `salah` and click LOG IN → red **FALSE** stamp appears. Clear the input, type `enigma`, click LOG IN → green **DO'S** stamp appears, the input and button become disabled, and the next-arrow becomes visible (clicking it does nothing yet — that's Task 7). Click the back arrow → hub. Repeat for **AHLI** with the answer `Wdqjjxk` (case-insensitive) and for **DEWA** with `brantas`.

- [ ] **Step 4: Commit**

```bash
git add tebaksandi/js/app.js
git commit -m "Wire Tebak Sandi puzzle answer checking (FALSE/DO'S) into app.js"
```

---

### Task 7: Explanation screen, progress tracking, closing screen (`app.js` part 3)

**Files:**
- Modify: `tebaksandi/js/app.js`

**Interfaces:**
- Consumes: `state.currentQuestion`/`state.currentLevel`/`state.solvedLevels`/`state.participantName`/`state.startTime` (Tasks 5–6), `showScreen` (Task 5).
- Produces: `renderExplain(level)`, `renderClosing()`, `handleExplainNext()`.

- [ ] **Step 1: Insert the explanation/closing functions**

In `tebaksandi/js/app.js`, insert the following three functions immediately after the closing `}` of `handlePuzzleSubmit` and before `function wireNav() {`:

```js
  function renderExplain(level) {
    var question = state.currentQuestion;
    document.getElementById('explain-level-badge').textContent = level.toUpperCase();
    document.getElementById('explain-bukti').innerHTML = question.explanation.bukti;

    var faktaImage = document.getElementById('explain-fakta-image');
    if (question.explanation.fakta.image) {
      faktaImage.src = question.explanation.fakta.image;
      faktaImage.hidden = false;
    } else {
      faktaImage.hidden = true;
    }
    document.getElementById('explain-fakta-text').textContent = question.explanation.fakta.text;
  }

  function renderClosing() {
    var elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    var minutes = Math.floor(elapsedSeconds / 60);
    var seconds = elapsedSeconds % 60;
    document.getElementById('closing-summary').textContent =
      state.participantName + ', kamu menyelesaikan semua level dalam ' +
      minutes + ' menit ' + seconds + ' detik.';
  }

  function handleExplainNext() {
    var allSolved = ['pemula', 'ahli', 'dewa'].every(function (level) {
      return !!state.solvedLevels[level];
    });
    if (allSolved) {
      renderClosing();
      showScreen('screen-closing');
    } else {
      showScreen('screen-hub');
    }
  }
```

- [ ] **Step 2: Wire the new listeners**

In `tebaksandi/js/app.js`, inside `wireNav()`, immediately before its final closing `}` (after the listeners added in Task 6), insert:

```js
    document.getElementById('puzzle-next-btn').addEventListener('click', function () {
      renderExplain(state.currentLevel);
      showScreen('screen-explain');
    });

    document.getElementById('explain-hub-btn').addEventListener('click', handleExplainNext);

    document.getElementById('btn-exit').addEventListener('click', function () {
      state.participantName = null;
      state.startTime = null;
      state.solvedLevels = {};
      localStorage.removeItem(STORAGE_KEY);
      showScreen('screen-landing');
    });
```

- [ ] **Step 3: Manually verify — full playthrough**

Clear `localStorage` (`localStorage.removeItem('tebaksandi-state')`) and reload. Enter a name. From the hub, solve **PEMULA** (`enigma`) → DO'S → click next-arrow → Bukti/Fakta screen shows the breakfast narrative with "enigma" bolded and the Enigma-machine illustration + fact text → click its arrow → back at the hub. Solve **AHLI** (`Wdqjjxk`) → DO'S → next-arrow → Bukti/Fakta screen shows the Caesar-cipher explanation (no image, text-only fakta) → arrow → back at the hub. Solve **DEWA** (`brantas`) → DO'S → next-arrow → Bukti/Fakta screen shows the Brantas explanation → click its arrow → this time the **closing screen** appears directly ("FIX KAMU JAGO KEREN MY 'SUHU'" plus a line with the entered name and an elapsed-time readout in minutes/seconds). Click "Selesai" → back at the landing screen, and `localStorage.getItem('tebaksandi-state')` is now `null`.

- [ ] **Step 4: Commit**

```bash
git add tebaksandi/js/app.js
git commit -m "Add Tebak Sandi explanation screen, progress tracking, and closing screen"
```

---

### Task 8: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full Node test suite**

Run: `node --test tests/`
Expected: PASS — all pre-existing `sheet-table-utils.test.js` tests plus the new `tebaksandi-crypto-utils.test.js` (4 tests) and `tebaksandi-questions.test.js` (3 tests), 0 failures.

- [ ] **Step 2: Repeat the Task 7 full playthrough once more, plus edge cases**

- Wrong-then-right on the same level: on any puzzle screen, submit a wrong answer (FALSE), then submit the correct one (DO'S) — confirms the stamp swap works both directions before disabling.
- Reload mid-session (after solving 1 of 3 levels, refresh the browser): hub appears (not landing), and re-entering that already-solved level's puzzle screen and answering correctly again still leads to its Bukti/Fakta screen without errors (progress isn't blocked by having already solved it — there's no "already solved" lock in this ship, which is consistent with the spec's freely-selectable-levels decision).
- Empty name submission: on the name screen, click the arrow with an empty input — nothing happens, focus returns to the input (per `handleNameSubmit`'s early return).

- [ ] **Step 3: Final commit**

```bash
git add -A
git status
```

Expected: `nothing to commit, working tree clean` (everything was already committed in Tasks 1–7). If anything is unstaged from manual testing (e.g. no code changes expected at this step), review with `git diff` before deciding whether to commit — this step should normally be a no-op verification, not a new commit.
