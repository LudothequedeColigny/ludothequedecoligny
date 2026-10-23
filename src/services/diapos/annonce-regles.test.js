import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  textesAnnonce, formuleJourJ, lignesQuand, dernierEvenementSemblable, planAnnonce, planStoryJourJ,
} from './annonce-regles.js'

const halloween = { id: 50, title: 'Soirée jeux de société - Spécial Halloween', date: '2026-11-06 19:00:00', end_time: '', location: 'À la salle des fêtes de Coligny', image_url: 'aff.png', annonce: null }
const famille = { id: 51, title: 'Après-midi jeux en famille', date: '2026-10-24 14:00:00', end_time: '17:00', location: 'À la salle des fêtes de Coligny', image_url: null, annonce: null }
const passeSoiree = { id: 38, title: 'Soirées jeux', date: '2026-10-02 19:00:00', participants_count: 26, bilan_photo_ouverture: 'p2', photos: ['p1', 'p2', 'p3', 'p4', 'p5'] }

test('textes types selon le genre, textes mémorisés prioritaires', () => {
  assert.equal(textesAnnonce(halloween).titre, 'Une soirée pour jouer entre amis !')
  assert.deepEqual(textesAnnonce(famille).points, ['Des jeux pour petits et grands', 'Des bénévoles pour vous expliquer les règles', 'Venez en famille ou entre amis'])
  assert.equal(textesAnnonce(halloween).infos[0].titre, 'Gratuit et ouvert à tous')
  const perso = { ...halloween, annonce: { titre: 'Une soirée pour frissonner !', points: ['A', '', 'C'], infos: [{ titre: 'Entrée 2 €', detail: '' }, { titre: '', detail: '' }] } }
  assert.equal(textesAnnonce(perso).titre, 'Une soirée pour frissonner !')
  assert.deepEqual(textesAnnonce(perso).points, ['A', '', 'C'])
  assert.equal(textesAnnonce(perso).infos[0].titre, 'Entrée 2 €')
})

test('formule du jour J selon l’heure', () => {
  assert.equal(formuleJourJ('2026-11-06 19:00:00'), "C'est ce soir !")
  assert.equal(formuleJourJ('2026-10-24 14:00:00'), "C'est cet après-midi !")
  assert.equal(formuleJourJ('2026-11-07 10:00:00'), "C'est ce matin !")
  assert.equal(formuleJourJ('2026-11-07 17:00:00'), "C'est ce soir !")
  assert.equal(formuleJourJ('2026-11-07 12:00:00'), "C'est cet après-midi !")
})

test('date et heure en deux lignes', () => {
  assert.deepEqual(lignesQuand(halloween), { jour: 'Vendredi 6 novembre', heure: 'à partir de 19h' })
  assert.deepEqual(lignesQuand(famille), { jour: 'Samedi 24 octobre', heure: 'de 14h à 17h' })
})

test('dernier événement passé du même genre, avec participants et photos', () => {
  const passes = [
    passeSoiree,
    { id: 35, title: 'Soirées jeux', date: '2026-09-11 19:00:00', participants_count: 23, photos: ['x'] },
    { id: 40, title: 'Soirée sans photo', date: '2026-10-20 19:00:00', participants_count: 12, photos: [] },
    { id: 41, title: 'Après-midi jeux en famille', date: '2026-10-21 14:00:00', participants_count: 30, photos: ['f'] },
  ]
  assert.equal(dernierEvenementSemblable(halloween, passes).id, 38)
  assert.equal(dernierEvenementSemblable(famille, passes).id, 41)
  assert.equal(dernierEvenementSemblable(halloween, [{ ...passeSoiree, participants_count: 0 }]), null)
})

test('plan complet avec affiche et souvenir : 5 diapositives', () => {
  const plan = planAnnonce({ event: halloween, passe: passeSoiree })
  assert.deepEqual(plan.map(d => d.type), ['affiche', 'attente', 'infos', 'souvenir', 'attend'])
  assert.equal(plan[0].affiche, 'aff.png')
  assert.equal(plan[0].fond, 'p2')
  assert.equal(plan[1].photo, 'p2')
  assert.equal(plan[1].floute, false)
  assert.deepEqual(plan[1].points.length, 3)
  assert.equal(plan[2].cartes[0].icone, 'calendrier')
  assert.equal(plan[2].cartes[0].titre, 'Vendredi 6 novembre')
  assert.equal(plan[2].cartes[1].titre, 'Salle des fêtes de Coligny')
  assert.deepEqual(plan[2].cartes.map(c => c.icone), ['calendrier', 'lieu', 'de', 'biscuit'])
  assert.equal(plan[3].nombre, 26)
  assert.equal(plan[3].photos.length, 3)
  assert.ok(!plan[3].photos.includes('p2'))
  assert.equal(plan[3].legende, 'Soirée jeux du 2 octobre')
  assert.equal(plan[4].quand, 'Vendredi 6 novembre · 19h')
})

test('sans événement passé : pas de souvenir, fonds = affiche floutée', () => {
  const plan = planAnnonce({ event: halloween, passe: null })
  assert.deepEqual(plan.map(d => d.type), ['affiche', 'attente', 'infos', 'attend'])
  assert.equal(plan[1].photo, 'aff.png')
  assert.equal(plan[1].floute, true)
  assert.equal(plan[2].fond, 'aff.png')
})

test('sans affiche ni passé : fonds nuls (bleu au dessin), titre et date sur la diapo 1', () => {
  const plan = planAnnonce({ event: famille, passe: null })
  assert.equal(plan[0].affiche, null)
  assert.equal(plan[0].fond, null)
  assert.equal(plan[0].titre, 'Après-midi jeux en famille')
  assert.equal(plan[0].quand, 'Samedi 24 octobre · 14h')
})

test('points et infos vides retirés', () => {
  const ev = { ...halloween, annonce: { titre: 'T', points: ['A', '', 'C'], infos: [{ titre: '', detail: 'x' }, { titre: 'B', detail: '' }] } }
  const plan = planAnnonce({ event: ev, passe: null })
  assert.deepEqual(plan[1].points, ['A', 'C'])
  assert.deepEqual(plan[2].cartes.map(c => c.titre), ['Vendredi 6 novembre', 'Salle des fêtes de Coligny', 'B'])
})

test('permanence : pas de carrousel, story du matin', () => {
  const perm = { id: 60, title: 'Permanence de la ludothèque', date: '2026-11-07 10:00:00', end_time: '12:00', location: '419 Grande rue à Coligny', image_url: null }
  assert.deepEqual(planAnnonce({ event: perm, passe: null }), [])
  const [s] = planStoryJourJ({ event: perm, passe: null })
  assert.equal(s.formule, "C'est ce matin !")
  assert.equal(s.titre, 'Permanence de la ludothèque')
  assert.equal(s.ligne, 'de 10h à 12h · 419 Grande rue à Coligny')
})

test('story du jour J d’une soirée', () => {
  const [s] = planStoryJourJ({ event: halloween, passe: passeSoiree })
  assert.equal(s.type, 'jourJ')
  assert.equal(s.formule, "C'est ce soir !")
  assert.equal(s.affiche, 'aff.png')
  assert.equal(s.fond, 'aff.png')
  assert.equal(s.ligne, '19h · Salle des fêtes de Coligny')
})
