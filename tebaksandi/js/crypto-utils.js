(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CryptoUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var cryptoObj = (typeof globalThis !== 'undefined' && globalThis.crypto) || (typeof global !== 'undefined' && global.crypto);
  if (!cryptoObj) {
    try {
      cryptoObj = require('crypto');
    } catch (e) {
      // In browser or if crypto not available
    }
  }

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
    return cryptoObj.subtle.digest('SHA-256', bytes).then(function (buffer) {
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
