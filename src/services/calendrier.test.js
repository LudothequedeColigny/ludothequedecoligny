import test from 'node:test'
import assert from 'node:assert/strict'
import {
  categorie, vignettesAccueil, grilleMois, evenementsDuMois, parJour,
  moisDisponibles, horaire, jourLong, nomFichierMois,
} from './calendrier.js'

const ev = (id, date, title = 'Permanence de la ludothèque', end_time = null) => ({ id, date, title, end_time })

test('catégorie selon le titre', () => {
  assert.equal(categorie(ev(1, '2026-11-06T19:00:00', 'Soirée jeux - Spécial Halloween')), 'soiree')
  assert.equal(categorie(ev(1, '2026-11-06T14:00:00', 'Après-midi jeux en famille')), 'famille')
  assert.equal(categorie(ev(1, '2026-11-07T10:00:00', 'Permanence de la ludothèque')), 'permanence')
  assert.equal(categorie(ev(1, '2026-11-07T10:00:00', 'Fête du jeu')), 'autre')
})

test('vignettes : seulement le mois et demi à venir', () => {
  const maintenant = new Date(2026, 9, 26, 12) // 26 octobre : limite au 11 décembre
  const aVenir = [ev(1, '2026-11-07T10:00:00'), ev(2, '2026-12-10T14:00:00'), ev(3, '2026-12-12T10:00:00'), ev(4, '2027-02-06T10:00:00')]
  assert.deepEqual(vignettesAccueil(aVenir, maintenant).map(e => e.id), [1, 2])
  // le réglage en mois entiers marche toujours
  assert.deepEqual(vignettesAccueil(aVenir, maintenant, 2).map(e => e.id), [1, 2, 3])
})

test('vignettes : rien dans le mois et demi → le prochain quand même', () => {
  const maintenant = new Date(2026, 9, 26, 12)
  assert.deepEqual(vignettesAccueil([ev(4, '2027-02-06T10:00:00'), ev(5, '2027-03-06T10:00:00')], maintenant).map(e => e.id), [4])
  assert.deepEqual(vignettesAccueil([], maintenant), [])
})

test('grille : lundi en premier, semaines complètes', () => {
  const nov = grilleMois(2026, 10) // novembre 2026 : commence un dimanche
  assert.equal(nov[0][0].cle, '2026-10-26')
  assert.equal(nov[0][6].cle, '2026-11-01')
  assert.equal(nov[0][6].dansLeMois, true)
  assert.equal(nov.length, 6)
  assert.equal(nov.at(-1)[6].cle, '2026-12-06')
  const fev = grilleMois(2027, 1) // février 2027 : commence un lundi, 4 semaines pile
  assert.equal(fev[0][0].cle, '2027-02-01')
  assert.equal(fev.length, 4)
})

test('événements du mois et par jour', () => {
  const liste = [ev(2, '2026-11-21T14:00:00'), ev(1, '2026-11-07T10:00:00'), ev(3, '2026-12-05T10:00:00'), ev(4, '2026-11-07T19:00:00', 'Soirée jeux')]
  const nov = evenementsDuMois(liste, 2026, 10)
  assert.deepEqual(nov.map(e => e.id), [1, 4, 2])
  assert.deepEqual(parJour(nov)['2026-11-07'].map(e => e.id), [1, 4])
})

test('mois disponibles : du mois en cours au dernier rendez-vous', () => {
  const maintenant = new Date(2026, 9, 26)
  assert.deepEqual(moisDisponibles([ev(1, '2027-01-09T10:00:00')], maintenant),
    [{ annee: 2026, mois: 9 }, { annee: 2026, mois: 10 }, { annee: 2026, mois: 11 }, { annee: 2027, mois: 0 }])
  assert.deepEqual(moisDisponibles([], maintenant), [{ annee: 2026, mois: 9 }])
})

test('horaire et jour', () => {
  assert.equal(horaire(ev(1, '2026-11-06T19:00:00')), '19h')
  assert.equal(horaire(ev(1, '2026-11-07T10:00:00', 'P', '12:00')), '10h – 12h')
  assert.equal(horaire(ev(1, '2026-11-07T14:30:00', 'P', '16:00:00')), '14h30 – 16h')
  assert.equal(jourLong(ev(1, '2026-11-06T19:00:00')), 'Vendredi 6 novembre')
  assert.equal(jourLong(ev(1, '2026-12-01T19:00:00')), 'Mardi 1er décembre')
  assert.equal(nomFichierMois(2026, 10, 'jpg'), 'calendrier-ludotheque-2026-11.jpg')
})
