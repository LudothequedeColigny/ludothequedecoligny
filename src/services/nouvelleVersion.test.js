import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estFichierPerime, rechargerPourNouvelleVersion } from './nouvelleVersion.js'

test('reconnaît un morceau de code introuvable après une mise en ligne', () => {
  assert.equal(estFichierPerime(new TypeError('Failed to fetch dynamically imported module: https://www.ludothequedecoligny.fr/assets/pdf-Q6qec4bn.js')), true)
  assert.equal(estFichierPerime(new TypeError('Importing a module script failed.')), true)
  assert.equal(estFichierPerime(new Error('error loading dynamically imported module')), true)
  assert.equal(estFichierPerime(new Error('Police introuvable : /fonts/pdf/Poppins-SemiBold.ttf')), false)
  assert.equal(estFichierPerime(null), false)
})

test('un seul rechargement automatique toutes les 30 secondes', () => {
  const stock = new Map()
  globalThis.sessionStorage = { getItem: k => stock.get(k) ?? null, setItem: (k, v) => stock.set(k, v) }
  let rechargements = 0
  globalThis.window = { location: { reload: () => { rechargements++ } } }
  try {
    assert.equal(rechargerPourNouvelleVersion(1_000_000), true)
    assert.equal(rechargerPourNouvelleVersion(1_010_000), false)
    assert.equal(rechargerPourNouvelleVersion(1_031_000), true)
    assert.equal(rechargements, 2)
  } finally {
    delete globalThis.sessionStorage
    delete globalThis.window
  }
})
