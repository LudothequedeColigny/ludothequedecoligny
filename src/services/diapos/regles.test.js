import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  typeEvenement, formuleOuverture, libelleEtiquette, libelleNombre, dateEtLieu,
  quandRendezVous, choisirJeux, prochainRendezVous, planCarrousel, planStory,
} from './regles.js'

const soiree = { id: 38, title: 'Soirées jeux', date: '2026-10-02 19:00:00', location: 'À la salle des fêtes de Coligny' }
const jeu = (id, photo = null, cat = false) => ({ id, name: `Jeu ${id}`, image: `j${id}.png`, in_catalogue: cat, photo_url: photo })

test('type d’événement d’après le titre', () => {
  assert.equal(typeEvenement('Soirées jeux'), 'soiree')
  assert.equal(typeEvenement('Après-midi jeux en famille'), 'famille')
  assert.equal(typeEvenement('Permanence de la ludothèque'), 'permanence')
})

test('formule d’ouverture : « Vendredi dernier » dans la semaine, sinon la date', () => {
  assert.equal(formuleOuverture('2026-10-02 19:00:00', new Date('2026-10-05T10:00:00')), 'Vendredi dernier,')
  assert.equal(formuleOuverture('2026-10-02 19:00:00', new Date('2026-10-09T18:00:00')), 'Vendredi dernier,')
  assert.equal(formuleOuverture('2026-10-02 19:00:00', new Date('2026-10-10T10:00:00')), 'Le 2 octobre,')
  assert.equal(formuleOuverture('2026-10-24 14:00:00', new Date('2026-10-26T10:00:00')), 'Samedi dernier,')
})

test('libellés selon le type', () => {
  assert.equal(libelleEtiquette('soiree'), 'Soirée jeux !')
  assert.equal(libelleEtiquette('famille'), 'Après-midi jeux en famille !')
  assert.equal(libelleNombre('soiree'), 'joueuses et joueurs !')
  assert.equal(libelleNombre('famille'), 'petits et grands !')
})

test('date et lieu, sans le « À la » du début', () => {
  assert.equal(dateEtLieu(soiree), '2 octobre · Salle des fêtes de Coligny')
  assert.equal(dateEtLieu({ ...soiree, location: '' }), '2 octobre')
})

test('quand : jour, date et heure', () => {
  assert.equal(quandRendezVous({ date: '2026-11-06 19:00:00' }), 'Vendredi 6 novembre · 19h')
  assert.equal(quandRendezVous({ date: '2026-11-07 10:30:00' }), 'Samedi 7 novembre · 10h30')
})

test('six jeux au plus, ceux qui ont une photo d’abord', () => {
  const jeux = [jeu(1), jeu(2, 'p.jpg'), jeu(3), jeu(4), jeu(5, 'q.jpg'), jeu(6), jeu(7), jeu(8)]
  const { retenus, ecartes } = choisirJeux(jeux)
  assert.deepEqual(retenus.map(j => j.id), [2, 5, 1, 3, 4, 6])
  assert.deepEqual(ecartes.map(j => j.id), [7, 8])
})

test('prochain rendez-vous : premier événement à venir hors permanence', () => {
  const evts = [
    { title: 'Permanence de la ludothèque', date: '2026-10-24 10:00:00' },
    { title: 'Soirée Halloween', date: '2026-11-06 19:00:00' },
    { title: 'Après-midi jeux en famille', date: '2026-10-24 14:00:00' },
    { title: 'Soirée passée', date: '2026-10-01 19:00:00' },
  ]
  assert.equal(prochainRendezVous(evts, new Date('2026-10-23T10:00:00')).title, 'Après-midi jeux en famille')
  assert.equal(prochainRendezVous([evts[0]], new Date('2026-10-23T10:00:00')), null)
})

test('plan du carrousel complet : 10 diapos', () => {
  const plan = planCarrousel({
    event: soiree, participants: 26, photos: ['a', 'b', 'c'], photoOuverture: null, photoJeux: null,
    jeux: [jeu(1, 'c', true), jeu(2), jeu(3), jeu(4), jeu(5), jeu(6)], prochain: null,
    maintenant: new Date('2026-10-05T10:00:00'),
  })
  assert.deepEqual(plan.map(d => d.type), ['ouverture', 'nombre', 'transition', 'jeu', 'jeu', 'jeu', 'jeu', 'jeu', 'jeu', 'merci'])
  assert.equal(plan[0].photo, 'a')
  assert.equal(plan[0].formule, 'Vendredi dernier,')
  assert.equal(plan[0].etiquette, 'Soirée jeux !')
  assert.equal(plan[1].photo, 'a')
  assert.equal(plan[1].nombre, 26)
  assert.equal(plan[2].photo, 'b')
  assert.equal(plan[3].photo, 'c')
  assert.equal(plan[3].dispo, true)
  assert.equal(plan[4].photo, null)
  assert.ok(['a', 'b', 'c'].includes(plan[4].fond))
})

test('sans participants : pas de diapo « nombre » ; une seule photo sert deux fois', () => {
  const plan = planCarrousel({
    event: soiree, participants: null, photos: ['a'], photoOuverture: null, photoJeux: null,
    jeux: [jeu(1)], prochain: null, maintenant: new Date('2026-10-05T10:00:00'),
  })
  assert.deepEqual(plan.map(d => d.type), ['ouverture', 'transition', 'jeu', 'merci'])
  assert.equal(plan[1].photo, 'a')
})

test('aucune photo : plan vide', () => {
  assert.deepEqual(planCarrousel({
    event: soiree, participants: 3, photos: [], photoOuverture: null, photoJeux: null,
    jeux: [], prochain: null, maintenant: new Date(),
  }), [])
})

test('photos choisies prioritaires sur l’ordre de l’album', () => {
  const plan = planCarrousel({
    event: soiree, participants: 5, photos: ['a', 'b', 'c'], photoOuverture: 'c', photoJeux: 'a',
    jeux: [], prochain: null, maintenant: new Date('2026-10-05T10:00:00'),
  })
  assert.equal(plan[0].photo, 'c')
  assert.equal(plan[2].photo, 'a')
})

test('plan de la story : ouverture, nombre, grille, merci', () => {
  const plan = planStory({
    event: soiree, participants: 26, photos: ['a', 'b'], photoOuverture: null, photoJeux: null,
    jeux: [jeu(1), jeu(2)], prochain: { title: 'Soirée Halloween', date: '2026-11-06 19:00:00', location: 'Salle des fêtes', image_url: 'aff.png' },
    maintenant: new Date('2026-10-05T10:00:00'),
  })
  assert.deepEqual(plan.map(d => d.type), ['ouverture', 'nombre', 'grille', 'merci'])
  assert.equal(plan[2].jeux.length, 2)
  assert.equal(plan[3].rdv.quand, 'Vendredi 6 novembre · 19h')
  assert.equal(plan[3].rdv.affiche, 'aff.png')
})
