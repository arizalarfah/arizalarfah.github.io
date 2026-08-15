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

    document.querySelectorAll('.ts-level-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleLevelSelect(btn.getAttribute('data-level'));
      });
    });

    document.getElementById('puzzle-submit-btn').addEventListener('click', handlePuzzleSubmit);
    document.getElementById('puzzle-back-btn').addEventListener('click', function () {
      showScreen('screen-hub');
    });

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
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFromStorage();
    wireNav();
    if (state.participantName) {
      showScreen('screen-hub');
    }
  });
})();
