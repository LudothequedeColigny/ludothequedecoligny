import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detailsJeu, planNouveauxJeux, MAX_IMAGES_JEUX } from './nouveaux-jeux-regles.js'

const jeu = (id, extra = {}) => ({
  id, name: `Jeu ${id}`, image_url: `https://x.supabase.co/${id}.jpg`, min_players: 2, max_players: 4, min_age: 8, ...extra,
})
const prochaine = { date: '2026-11-07', jour: 'Samedi 7 novembre', heures: 'de 10h à 12h', lieu: '419 Grande rue à Coligny' }

test('détails : nombre de joueurs et âge, seulement les valeurs cohérentes', () => {
  assert.deepEqual(detailsJeu({ min_players: 2, max_players: 4, min_age: 8 }), ['2 à 4 joueurs', 'Dès 8 ans'])
  assert.deepEqual(detailsJeu({ min_players: 2, max_players: 2, min_age: null }), ['2 joueurs'])
  assert.deepEqual(detailsJeu({ min_players: 1, max_players: 1 }), ['1 joueur'])
  // Maximum plus petit que le minimum : saisie incohérente, rien sur les joueurs
  assert.deepEqual(detailsJeu({ min_players: 2, max_players: 1, min_age: 10 }), ['Dès 10 ans'])
  // Une seule borne connue : rien non plus
  assert.deepEqual(detailsJeu({ min_players: 3, max_players: 0, min_age: 0 }), [])
  assert.deepEqual(detailsJeu({ min_players: '2', max_players: '5', min_age: '6' }), ['2 à 5 joueurs', 'Dès 6 ans'])
  assert.deepEqual(detailsJeu({}), [])
})

test('plan : aucun jeu → aucune image', () => {
  assert.deepEqual(planNouveauxJeux({ jeux: [], prochaine }), [])
  assert.deepEqual(planNouveauxJeux({ jeux: undefined, prochaine }), [])
})

test('plan : 3 jeux → couverture, 3 images de jeu, prochaine permanence', () => {
  const plan = planNouveauxJeux({ jeux: [jeu(1), jeu(2, { min_age: 0 }), jeu(3, { image_url: null })], prochaine })
  assert.deepEqual(plan.map(d => d.type), ['couverture', 'jeu', 'jeu', 'jeu', 'prochaine'])
  assert.deepEqual(plan[0], {
    type: 'couverture',
    jaquettes: ['https://x.supabase.co/1.jpg', 'https://x.supabase.co/2.jpg'],
    mosaique: Array.from({ length: 8 }, (_, i) => `https://x.supabase.co/${(i % 2) + 1}.jpg`),
    nombre: 3,
    phrase: 'nouveaux jeux à emprunter !',
  })
  assert.deepEqual(plan[1], { type: 'jeu', nom: 'Jeu 1', jaquette: 'https://x.supabase.co/1.jpg', infos: ['2 à 4 joueurs', 'Dès 8 ans'], index: 0 })
  assert.deepEqual(plan[2].infos, ['2 à 4 joueurs'])
  assert.equal(plan[3].jaquette, null)
  assert.equal(plan[3].index, 2)
  assert.deepEqual(plan[4], { type: 'prochaine', mosaique: plan[0].mosaique, prochaine })
})

test('plan : au-delà de 8 jeux, 8 images de jeu mais le nombre compte tout', () => {
  const jeux = Array.from({ length: 12 }, (_, i) => jeu(i + 1))
  const plan = planNouveauxJeux({ jeux, prochaine })
  assert.equal(MAX_IMAGES_JEUX, 8)
  assert.equal(plan.length, 10)
  assert.equal(plan[0].nombre, 12)
  assert.equal(plan.filter(d => d.type === 'jeu').length, 8)
  assert.deepEqual(plan.filter(d => d.type === 'jeu').map(d => d.nom), jeux.slice(0, 8).map(j => j.name))
  // Couverture : 5 jaquettes au plus ; mosaïque : 8 cases
  assert.deepEqual(plan[0].jaquettes, jeux.slice(0, 5).map(j => j.image_url))
  assert.deepEqual(plan[0].mosaique, jeux.slice(0, 8).map(j => j.image_url))
  assert.equal(plan[9].type, 'prochaine')
})

test('plan : jeux sans jaquette ignorés sur la couverture, mosaïque répétée', () => {
  const jeux = [jeu(1, { image_url: null }), jeu(2), jeu(3, { image_url: '' }), jeu(4), jeu(5), jeu(6), jeu(7), jeu(8)]
  const plan = planNouveauxJeux({ jeux, prochaine })
  const avecJaquette = [2, 4, 5, 6, 7, 8].map(i => `https://x.supabase.co/${i}.jpg`)
  assert.deepEqual(plan[0].jaquettes, avecJaquette.slice(0, 5))
  assert.deepEqual(plan[0].mosaique, Array.from({ length: 8 }, (_, i) => avecJaquette[i % avecJaquette.length]))
})

test('plan : aucune jaquette → couverture et mosaïque vides (fond bleu)', () => {
  const plan = planNouveauxJeux({ jeux: [jeu(1, { image_url: null })], prochaine: null })
  assert.deepEqual(plan[0].jaquettes, [])
  assert.deepEqual(plan[0].mosaique, [])
  assert.deepEqual(plan[2], { type: 'prochaine', mosaique: [], prochaine: null })
})

test('plan : un seul jeu, phrase au singulier ; nom nettoyé', () => {
  const plan = planNouveauxJeux({ jeux: [jeu(1, { name: '  Azul  ' })], prochaine })
  assert.equal(plan[0].nombre, 1)
  assert.equal(plan[0].phrase, 'nouveau jeu à emprunter !')
  assert.equal(plan[1].nom, 'Azul')
  assert.equal(plan.length, 3)
})
