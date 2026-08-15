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
