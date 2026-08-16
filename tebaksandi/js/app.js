// tebaksandi/js/app.js
(function () {
  'use strict';

  var STORAGE_KEY = 'tebaksandi-state';

  // Google Apps Script Web App URL for recording session start/finish to the
  // "tebaksandi" Google Sheet tab (Nama / sesi_mulai / sesi_selesai). Empty
  // until deployed — logSessionEvent() no-ops when this is blank, so the
  // game works normally before the Sheet logging is wired up.
  var SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxDHgsSyb8oUTYgUN4KaHA-L6SN819AIj7ua3PvhFlfHl-NU-dWsJNhj9UKyT6mlahU/exec';

  var state = {
    participantName: null,
    startTime: null,
    startTimeIso: null,
    solvedLevels: {},
    currentLevel: null,
    currentQuestion: null,
  };

  // Fire-and-forget POST to the Apps Script Web App. Uses mode:'no-cors' so
  // the browser never needs to read the response (Apps Script's response
  // goes through a redirect that's awkward to read cross-origin) — this is
  // informational logging only, not a source of truth the game depends on,
  // so failures here are silently ignored.
  function logSessionEvent(payload) {
    if (!SHEET_WEBHOOK_URL) return;
    try {
      fetch(SHEET_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      }).catch(function () {
        // Network/CORS failure: logging is best-effort, never blocks play.
      });
    } catch (e) {
      // fetch not available or threw synchronously: ignore, same reason.
    }
  }

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
      startTimeIso: state.startTimeIso,
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
      state.startTimeIso = saved.startTimeIso || null;
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
    state.startTimeIso = new Date(state.startTime).toISOString();
    persistState();
    logSessionEvent({
      action: 'start',
      nama: state.participantName,
      sesi_mulai: state.startTimeIso,
    });
    showScreen('screen-hub');
  }

  function handleLevelSelect(level) {
    state.currentLevel = level;
    renderPuzzle(level);
    showScreen('screen-puzzle');
  }

  // Sets img.src to `primary`; if that fails to load and a `fallback` path
  // is given, swaps to it once. If there's no fallback (or it also fails),
  // hides the element instead of leaving a broken-image icon visible.
  function setImageWithFallback(img, primary, fallback) {
    img.onerror = function () {
      img.onerror = null;
      if (fallback) {
        img.hidden = false;
        img.src = fallback;
        img.onerror = function () {
          img.onerror = null;
          img.hidden = true;
        };
      } else {
        img.hidden = true;
      }
    };
    img.hidden = false;
    img.src = primary;
  }

  function renderPuzzle(level) {
    var question = Questions.filter(function (item) {
      return item.level === level;
    })[0];
    state.currentQuestion = question;

    document.getElementById('puzzle-level-badge').textContent = level.toUpperCase();
    setImageWithFallback(document.getElementById('puzzle-image'), question.image, question.imageFallback);
    document.getElementById('puzzle-image').alt = question.title;
    document.getElementById('puzzle-narrative').innerHTML = question.narrativeHtml;

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
    }).catch(function () {
      var falseStamp = document.getElementById('puzzle-stamp-false');
      var dosStamp = document.getElementById('puzzle-stamp-dos');
      dosStamp.hidden = true;
      falseStamp.hidden = false;
    });
  }

  function renderExplain(level) {
    var question = state.currentQuestion;
    document.getElementById('explain-level-badge').textContent = level.toUpperCase();
    document.getElementById('explain-bukti').innerHTML = question.explanation.bukti;

    var faktaImage = document.getElementById('explain-fakta-image');
    if (question.explanation.fakta.image) {
      faktaImage.alt = question.title || 'Ilustrasi penjelasan';
      setImageWithFallback(faktaImage, question.explanation.fakta.image, question.explanation.fakta.imageFallback);
    } else {
      faktaImage.hidden = true;
    }
    document.getElementById('explain-fakta-text').textContent = question.explanation.fakta.text;
  }

  var MAX_SANE_ELAPSED_SECONDS = 10800; // 3 hours

  function renderClosing() {
    var elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    var summary;
    if (elapsedSeconds >= 0 && elapsedSeconds <= MAX_SANE_ELAPSED_SECONDS) {
      var minutes = Math.floor(elapsedSeconds / 60);
      var seconds = elapsedSeconds % 60;
      summary = state.participantName + ', kamu menyelesaikan semua level dalam ' +
        minutes + ' menit ' + seconds + ' detik.';
    } else {
      summary = state.participantName + ', kamu menyelesaikan semua level!';
    }
    document.getElementById('closing-summary').textContent = summary;

    logSessionEvent({
      action: 'finish',
      nama: state.participantName,
      sesi_mulai: state.startTimeIso,
      sesi_selesai: new Date().toISOString(),
    });
  }

  function resetToLanding() {
    state.participantName = null;
    state.startTime = null;
    state.startTimeIso = null;
    state.solvedLevels = {};
    localStorage.removeItem(STORAGE_KEY);
    showScreen('screen-landing');
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

  function wireNav() {
    document.getElementById('btn-start').addEventListener('click', handleStart);
    document.getElementById('btn-name-submit').addEventListener('click', handleNameSubmit);
    document.getElementById('input-name').addEventListener('keydown', function (event) {
      if (event.key === 'Enter') handleNameSubmit();
    });

    var infoScreens = ['screen-tentang', 'screen-petunjuk', 'screen-materi', 'screen-pengembang'];

    document.querySelectorAll('[data-nav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var active = document.querySelector('.ts-screen--active');
        if (active && infoScreens.indexOf(active.id) === -1) lastScreenBeforeInfo = active.id;
        showScreen('screen-' + btn.getAttribute('data-nav'));
      });
    });

    document.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showScreen(lastScreenBeforeInfo);
      });
    });

    document.querySelectorAll('.ts-level-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleLevelSelect(btn.getAttribute('data-level'));
      });
    });

    document.getElementById('puzzle-submit-btn').addEventListener('click', handlePuzzleSubmit);
    document.getElementById('puzzle-answer-input').addEventListener('keydown', function (event) {
      if (event.key === 'Enter') handlePuzzleSubmit();
    });
    document.getElementById('puzzle-back-btn').addEventListener('click', function () {
      showScreen('screen-hub');
    });

    document.getElementById('puzzle-next-btn').addEventListener('click', function () {
      renderExplain(state.currentLevel);
      showScreen('screen-explain');
    });

    document.getElementById('explain-hub-btn').addEventListener('click', handleExplainNext);

    document.getElementById('btn-exit').addEventListener('click', resetToLanding);

    document.getElementById('btn-restart').addEventListener('click', resetToLanding);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFromStorage();
    wireNav();
    if (state.participantName) {
      showScreen('screen-hub');
    }
  });
})();
