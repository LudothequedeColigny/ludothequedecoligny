import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { creerEnregistrementDiffere } from './enregistrementDiffere.js'

function installer() {
  mock.timers.enable({ apis: ['setTimeout'] })
  const ecrit = []
  const d = creerEnregistrementDiffere({ delai: 400, ecrire: (c, v) => ecrit.push([c, v]) })
  return { d, ecrit }
}

test('glissement : une seule écriture, la dernière valeur, après 400 ms', () => {
  const { d, ecrit } = installer()
  d.planifier(1, '#111111'); mock.timers.tick(200)
  d.planifier(1, '#222222'); mock.timers.tick(399)
  assert.deepEqual(ecrit, [])
  mock.timers.tick(1)
  assert.deepEqual(ecrit, [[1, '#222222']])
  mock.timers.tick(2000)
  assert.equal(ecrit.length, 1)
  mock.timers.reset()
})

test('un minuteur par catégorie', () => {
  const { d, ecrit } = installer()
  d.planifier(1, '#AAAAAA'); d.planifier(2, '#BBBBBB')
  mock.timers.tick(400)
  assert.deepEqual(ecrit, [[1, '#AAAAAA'], [2, '#BBBBBB']])
  mock.timers.reset()
})

test('vider écrit tout de suite, une seule fois, et annule le minuteur', () => {
  const { d, ecrit } = installer()
  d.planifier(1, '#AAAAAA')
  d.vider(1); d.vider(1)
  mock.timers.tick(1000)
  assert.deepEqual(ecrit, [[1, '#AAAAAA']])
  mock.timers.reset()
})

test('viderTout écrit toutes les attentes (fermeture, démontage)', () => {
  const { d, ecrit } = installer()
  d.planifier(1, '#AAAAAA'); d.planifier(2, '#BBBBBB')
  d.viderTout()
  mock.timers.tick(1000)
  assert.deepEqual(ecrit, [[1, '#AAAAAA'], [2, '#BBBBBB']])
  mock.timers.reset()
})

test('annuler abandonne l’attente : le code tapé gagne', () => {
  const { d, ecrit } = installer()
  d.planifier(1, '#AAAAAA')
  d.annuler(1)
  d.viderTout(); mock.timers.tick(1000)
  assert.deepEqual(ecrit, [])
  assert.equal(d.enAttente(1), false)
  mock.timers.reset()
})
