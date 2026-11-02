import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ACTIONS_PUBLICATION, reglagesPublication, decalerJour, actionsEvenement, etatAction, actionsParJour } from './calendrierPublications.js'

const defauts = reglagesPublication({})
const soiree = { id: 1, title: 'Soirée jeux', date: '2026-11-21 19:00:00' }
const perm = { id: 2, title: 'Permanence de la ludothèque', date: '2026-11-07 10:00:00' }
const fete = { id: 3, title: 'Fête du jeu', date: '2026-12-05 14:00:00' }

test('réglages : valeurs par défaut', () => {
  assert.deepEqual(defauts, {
    mail_collectivites: { jours: 21, heure: '18:00', rappel: true },
    annonce: { jours: 10, heure: '18:00', rappel: true },
    mail_adherents: { jours: 7, heure: '18:00', rappel: true },
    story_veille: { jours: 1, heure: '17:00', rappel: true },
    story_jour: { jours: 0, heure: '09:00', rappel: true },
  })
})

test('réglages : lus dans settings, valeurs illisibles ignorées', () => {
  const r = reglagesPublication({
    publication_annonce_jours: '14', publication_annonce_heure: '19:30', publication_annonce_rappel: 'false',
    publication_mail_adherents_jours: '', publication_story_veille_jours: '-2', publication_story_jour_jours: '3.5',
    publication_mail_collectivites_heure: '25:00', publication_story_jour_heure: '08:15:00',
  })
  assert.deepEqual(r.annonce, { jours: 14, heure: '19:30', rappel: false })
  assert.equal(r.mail_adherents.jours, 7)
  assert.equal(r.story_veille.jours, 1)
  assert.equal(r.story_jour.jours, 0)
  assert.equal(r.mail_collectivites.heure, '18:00')
  assert.equal(r.story_jour.heure, '08:15')
  assert.equal(reglagesPublication({ publication_annonce_jours: '61' }).annonce.jours, 10)
})

test('décaler un jour : changement de mois et d’année', () => {
  assert.equal(decalerJour('2026-11-07', -10), '2026-10-28')
  assert.equal(decalerJour('2026-12-31', 1), '2027-01-01')
  assert.equal(decalerJour('2026-03-01', -1), '2026-02-28')
})

test('soirée : toutes les actions, aux bons jours, bilan le lendemain', () => {
  assert.deepEqual(actionsEvenement(soiree, defauts).map(a => [a.cle, a.jour, a.heure]), [
    ['mail_collectivites', '2026-10-31', '18:00'],
    ['annonce', '2026-11-11', '18:00'],
    ['mail_adherents', '2026-11-14', '18:00'],
    ['story_veille', '2026-11-20', '17:00'],
    ['story_jour', '2026-11-21', '09:00'],
    ['bilan', '2026-11-22', null],
  ])
})

test('permanence allégée : annonce, stories, bilan le jour même', () => {
  assert.deepEqual(actionsEvenement(perm, defauts).map(a => [a.cle, a.jour]), [
    ['annonce', '2026-10-28'], ['story_veille', '2026-11-06'], ['story_jour', '2026-11-07'], ['bilan', '2026-11-07'],
  ])
})

test('autre événement (ni soirée, ni famille, ni permanence) : allégé, sans bilan', () => {
  assert.deepEqual(actionsEvenement(fete, defauts).map(a => a.cle), ['annonce', 'story_veille', 'story_jour'])
})

test('fait : lu dans les colonnes de l’événement ; archivé ou sans date : rien', () => {
  const fait = actionsEvenement({ ...soiree, annonce_publiee_le: '2026-11-10T10:00:00Z', mail_collectivites_envoye_le: 'x' }, defauts)
  assert.equal(fait.find(a => a.cle === 'annonce').faitLe, '2026-11-10T10:00:00Z')
  assert.equal(fait.find(a => a.cle === 'mail_collectivites').faitLe, 'x')
  assert.equal(fait.find(a => a.cle === 'story_jour').faitLe, null)
  assert.deepEqual(actionsEvenement({ ...soiree, archived_at: '2026-11-01' }, defauts), [])
  assert.deepEqual(actionsEvenement({ id: 9, title: 'Soirée' }, defauts), [])
})

test('état : fait, à faire, en retard, passé', () => {
  const annonce = { cle: 'annonce', jour: '2026-11-11', jourEvenement: '2026-11-21', faitLe: null }
  assert.equal(etatAction({ ...annonce, faitLe: 'x' }, '2026-11-20'), 'fait')
  assert.equal(etatAction(annonce, '2026-11-11'), 'a_faire')
  assert.equal(etatAction(annonce, '2026-11-12'), 'en_retard')
  assert.equal(etatAction(annonce, '2026-11-21'), 'en_retard')
  assert.equal(etatAction(annonce, '2026-11-22'), 'passe')
  const bilan = { cle: 'bilan', jour: '2026-11-22', jourEvenement: '2026-11-21', faitLe: null }
  assert.equal(etatAction(bilan, '2026-11-29'), 'en_retard')
  assert.equal(etatAction(bilan, '2026-11-30'), 'passe')
})

test('par jour : actions rangées par date, dans l’ordre des actions', () => {
  const jours = actionsParJour([soiree, perm], defauts)
  assert.deepEqual(jours['2026-11-07'].map(a => [a.cle, a.evenement.id]), [['story_jour', 2], ['bilan', 2]])
  assert.equal(Object.values(jours).flat().length, 10)
})

test('les clés des actions sont celles attendues par les Paramètres', () => {
  assert.deepEqual(ACTIONS_PUBLICATION.map(a => a.cle), ['mail_collectivites', 'annonce', 'mail_adherents', 'story_veille', 'story_jour'])
})
