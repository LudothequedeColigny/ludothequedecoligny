import { test } from 'node:test'
import assert from 'node:assert/strict'
import { codeEan13, motifEan13 } from './ean13.js'

test('code valide, espaces et tirets retirés', () => {
  assert.equal(codeEan13('3770000282771'), '3770000282771')
  assert.equal(codeEan13(' 3770019647691'), '3770019647691')
  assert.equal(codeEan13('3 770000 282771'), '3770000282771')
})

test('UPC-A à 12 chiffres : complété par un 0', () => {
  // 0688623905027 (Catane) saisi sans le 0 de tête
  assert.equal(codeEan13('688623905027'), '0688623905027')
})

test('clé fausse, longueur fausse ou vide : refusé', () => {
  assert.equal(codeEan13('3770000282772'), null)
  assert.equal(codeEan13('12345678'), null)
  assert.equal(codeEan13(''), null)
  assert.equal(codeEan13(null), null)
})

test('motif : 95 modules, gardes aux bons endroits', () => {
  const m = motifEan13('3770000282771')
  assert.equal(m.length, 95)
  assert.equal(m.slice(0, 3), '101')
  assert.equal(m.slice(45, 50), '01010')
  assert.equal(m.slice(92), '101')
})

test('motif : premier chiffre 3 → parité LLGGGL', () => {
  const m = motifEan13('3770000282771')
  // 3 770000 282771 : chiffre n°1 (7) en L = 0111011
  assert.equal(m.slice(3, 10), '0111011')
  // chiffre n°2 (7) en L, parité LLGGGL = 0111011
  assert.equal(m.slice(10, 17), '0111011')
  // chiffre n°3 (0) en G, parité LLGGGL = 0100111
  assert.equal(m.slice(17, 24), '0100111')
})
