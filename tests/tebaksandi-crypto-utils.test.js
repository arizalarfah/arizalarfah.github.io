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
