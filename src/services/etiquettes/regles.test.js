import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  HAUTEUR, BANDE_NOM, MARGE, PAGE, largeurEtiquette, miseEnPage, estMini, depasse,
  numeroEtiquette, raisons, nomSousEtiquette, preparer, repartir,
} from './regles.js'

const cats = new Map([[1, { couleur: '#548DD4' }]])
const jeu = (o = {}) => ({ id: 1, name: 'Skull King', registration_number: '177', barcode: '3770000282771', categorie_id: 1, epaisseur_mm: 30, ...o })

test('largeur : épaisseur − 4 mm, bornée entre 22 et 50', () => {
  assert.equal(largeurEtiquette(30), 26)
  assert.equal(largeurEtiquette(10), 22)
  assert.equal(largeurEtiquette(74), 50)
})

test('mise en page selon la largeur', () => {
  assert.equal(miseEnPage(50), 'large')
  assert.equal(miseEnPage(48), 'large')
  assert.equal(miseEnPage(47), 'moyenne')
  assert.equal(miseEnPage(30), 'moyenne')
  assert.equal(miseEnPage(29), 'etroite')
  assert.equal(estMini(25), true)
  assert.equal(estMini(26), false)
  assert.equal(depasse(25), true)
  assert.equal(depasse(26), false)
})

test('numéro sur 4 chiffres', () => {
  assert.equal(numeroEtiquette('177'), 'n° 0177')
  assert.equal(numeroEtiquette('031'), 'n° 0031')
  assert.equal(numeroEtiquette(1024), 'n° 1024')
})

test('raisons bloquantes', () => {
  assert.deepEqual(raisons(jeu(), cats), [])
  assert.deepEqual(raisons(jeu({ barcode: '' }), cats), ['pas de code-barres'])
  assert.deepEqual(raisons(jeu({ barcode: '3770000282772' }), cats), ['code-barres invalide'])
  assert.deepEqual(raisons(jeu({ categorie_id: null, epaisseur_mm: null }), cats), ['pas de catégorie', 'épaisseur inconnue'])
  assert.deepEqual(raisons(jeu({ categorie_id: 9 }), cats), ['pas de catégorie'])
})

test('nom sous l’étiquette : réduit puis raccourci', () => {
  assert.deepEqual(nomSousEtiquette('Catane', 50), { texte: 'Catane', taille: 2.5 })
  const moyen = nomSousEtiquette('Fiesta de los Muertos', 26)
  assert.ok(moyen.taille < 2.5 && moyen.taille >= 1.8)
  const long = nomSousEtiquette('Cartaventura - Resistance et autres histoires', 22)
  assert.equal(long.taille, 1.8)
  assert.ok(long.texte.endsWith('…'))
  assert.ok(long.texte.length * 0.52 * 1.8 <= 22 - 1.5)
})

test('préparer : tri numérique, jeux complets seulement', () => {
  const liste = preparer([jeu({ id: 2, registration_number: '1000' }), jeu({ id: 3, registration_number: '031' }), jeu({ id: 4, barcode: '' })], cats)
  assert.deepEqual(liste.map(e => e.id), [3, 2])
  assert.deepEqual(liste[0], { id: 3, nom: 'Skull King', numero: 'n° 0031', code: '3770000282771', couleur: '#548DD4', largeur: 26, epaisseur: 30 })
})

test('répartir : rangées accolées dans la marge, nouvelle page quand c’est plein', () => {
  const e = l => ({ id: l, largeur: 50 })
  const pages = repartir(Array.from({ length: 30 }, (_, i) => e(i)))
  // 190 mm utiles : 3 étiquettes de 50 par rangée ; (297 − 20 − 6) / 41 → 6 rangées
  assert.equal(pages[0].rangees.length, 6)
  assert.equal(pages[0].rangees[0].items.length, 3)
  assert.deepEqual(pages[0].rangees[0].items.map(i => i.x), [MARGE, MARGE + 50, MARGE + 100])
  assert.equal(pages[0].rangees[1].y, MARGE + HAUTEUR + BANDE_NOM)
  assert.equal(pages.length, 2)
  assert.equal(pages[1].rangees[0].items[0].id, 18)
  const derniere = pages[0].rangees.at(-1)
  assert.ok(derniere.y + HAUTEUR + BANDE_NOM <= PAGE.h - MARGE - 6)
})
