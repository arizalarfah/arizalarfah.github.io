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
    assert.strictEqual(typeof q.answerHash, 'string');
    assert.strictEqual(q.answerHash.length, 64);
    assert.strictEqual(typeof q.explanation.bukti, 'string');
    assert.strictEqual(typeof q.explanation.fakta.text, 'string');
  }
});

test('answerHash for each level matches the SHA-256 of its known correct answer', async () => {
  const known = { pemula: 'bukhari', ahli: 'Wdqjjxk', dewa: 'brantas' };
  for (const q of Questions) {
    const expected = await CryptoUtils.sha256Hex(CryptoUtils.normalizeAnswer(known[q.level]));
    assert.strictEqual(q.answerHash, expected);
  }
});
