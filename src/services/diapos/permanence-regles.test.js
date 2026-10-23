import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  estPermanence, jeuxDistincts, pretsPartis, prochainePermanence, planBilanPermanence, texteBilanPermanence, MAX_CASES,
} from './permanence-regles.js'

const perm = { id: 39, title: 'Permanence de la ludothèque', date: '2026-10-03 10:00:00', end_time: '12:00', location: '419 Grande rue à Coligny' }
const pret = (id, name, image_url = `https://x.supabase.co/${id}.jpg`) => ({ game_id: id, games: { id, name, image_url } })
const prets = [pret(3, 'Dixit'), pret(1, 'Azul'), pret(3, 'Dixit'), pret(2, 'Écosystème', null)]
const horaires = {
  horaire_1_jour: 'Samedi', horaire_1_rang: '1', horaire_1_debut: '10:00', horaire_1_fin: '12:00',
  horaire_2_actif: 'true', horaire_2_jour: 'Samedi', horaire_2_rang: '3', horaire_2_debut: '14:00', horaire_2_fin: '16:00',
  adresse_rue: '419 Grande Rue', adresse_ville: 'Coligny',
}

test('permanence : seulement les titres qui contiennent « permanence »', () => {
  assert.equal(estPermanence('Permanence de la ludothèque'), true)
  assert.equal(estPermanence('PERMANENCE spéciale'), true)
  assert.equal(estPermanence('Fête du jeu'), false)
  assert.equal(estPermanence(null), false)
  assert.equal(estPermanence('Soirée jeux à la place de la permanence'), false)
})

test('jeux distincts, triés par nom, sans jeu supprimé', () => {
  assert.deepEqual(jeuxDistincts([...prets, { game_id: 9, games: null }]), [
    { id: 1, nom: 'Azul', jaquette: 'https://x.supabase.co/1.jpg' },
    { id: 3, nom: 'Dixit', jaquette: 'https://x.supabase.co/3.jpg' },
    { id: 2, nom: 'Écosystème', jaquette: null },
  ])
})

test('prochaine permanence : l’événement saisi, strictement après aujourd’hui', () => {
  const evenements = [
    { title: 'Permanence de la ludothèque', date: '2026-10-24 10:00:00', end_time: '12:00', location: '419 Grande rue à Coligny', archived_at: null },
    { title: 'Permanence de la ludothèque', date: '2026-11-07 10:00:00', end_time: '12:00', location: '419 Grande rue à Coligny', archived_at: null },
    { title: 'Soirée jeux', date: '2026-10-30 19:00:00', end_time: '', location: 'Salle', archived_at: null },
  ]
  // Le 24/10 au soir : la permanence du 24 est passée, la suivante est le 7/11
  const p = prochainePermanence({ evenements, horaires, maintenant: new Date(2026, 9, 24, 18, 0) })
  assert.deepEqual(p, { date: '2026-11-07', jour: 'Samedi 7 novembre', heures: 'de 10h à 12h', lieu: '419 Grande rue à Coligny' })
})

test('prochaine permanence : archivée ignorée, sans heure de fin « à partir de »', () => {
  const evenements = [
    { title: 'Permanence', date: '2026-10-31 10:30:00', end_time: '', location: '', archived_at: '2026-10-01' },
    { title: 'Permanence', date: '2026-11-07 10:30:00', end_time: null, location: '', archived_at: null },
  ]
  const p = prochainePermanence({ evenements, horaires: {}, maintenant: new Date(2026, 9, 24, 9, 0) })
  assert.deepEqual(p, { date: '2026-11-07', jour: 'Samedi 7 novembre', heures: 'à partir de 10h30', lieu: '' })
})

test('prochaine permanence : à défaut, calculée d’après les Paramètres', () => {
  // Vendredi 23/10/2026 : 3e samedi d'octobre (17/10) passé ; 1er samedi de novembre = 7/11
  const p = prochainePermanence({ evenements: [], horaires, maintenant: new Date(2026, 9, 23, 12, 0) })
  assert.deepEqual(p, { date: '2026-11-07', jour: 'Samedi 7 novembre', heures: 'de 10h à 12h', lieu: '419 Grande Rue à Coligny' })
  // Le 8/11 : 3e samedi de novembre (21/11), créneau 2
  const p2 = prochainePermanence({ evenements: [], horaires, maintenant: new Date(2026, 10, 8, 12, 0) })
  assert.deepEqual(p2, { date: '2026-11-21', jour: 'Samedi 21 novembre', heures: 'de 14h à 16h', lieu: '419 Grande Rue à Coligny' })
  // Créneau 2 inactif, rang 5 = dernier samedi du mois
  const p3 = prochainePermanence({ evenements: [], horaires: { ...horaires, horaire_1_rang: '5', horaire_2_actif: 'false' }, maintenant: new Date(2026, 9, 1, 12, 0) })
  assert.equal(p3.date, '2026-10-31')
  assert.equal(p3.jour, 'Samedi 31 octobre')
})

test('prochaine permanence : rien de connu → null', () => {
  assert.equal(prochainePermanence({ evenements: [], horaires: {}, maintenant: new Date(2026, 9, 23) }), null)
})

test('plan : 3 diapositives, nombre = jeux distincts, grille = jeux distincts', () => {
  const prochaine = { date: '2026-11-07', jour: 'Samedi 7 novembre', heures: 'de 10h à 12h', lieu: '419 Grande rue à Coligny' }
  const plan = planBilanPermanence({ event: perm, prets, prochaine })
  assert.deepEqual(plan.map(d => d.type), ['nombre', 'grille', 'prochaine'])
  assert.equal(plan[0].intro, 'Samedi, à la permanence…')
  assert.equal(plan[0].nombre, 3)
  assert.equal(plan[0].suite, 'jeux ont été empruntés !')
  // Mosaïque : 8 jaquettes, répétées dans l'ordre, jamais de case vide
  assert.deepEqual(plan[0].mosaique, ['https://x.supabase.co/1.jpg', 'https://x.supabase.co/3.jpg', 'https://x.supabase.co/1.jpg', 'https://x.supabase.co/3.jpg', 'https://x.supabase.co/1.jpg', 'https://x.supabase.co/3.jpg', 'https://x.supabase.co/1.jpg', 'https://x.supabase.co/3.jpg'])
  assert.deepEqual(plan[1].cases, [{ nom: 'Azul', jaquette: 'https://x.supabase.co/1.jpg' }, { nom: 'Dixit', jaquette: 'https://x.supabase.co/3.jpg' }, { nom: 'Écosystème', jaquette: null }])
  assert.deepEqual(plan[2], { type: 'prochaine', mosaique: plan[0].mosaique, prochaine })
})

test('prêts empruntés : un prêt rendu le jour même n’est pas compté', () => {
  const rendu = { ...pret(1, 'Azul'), loan_date: '2026-10-03', return_date: '2026-10-03' }
  const rendePlusTard = { ...pret(2, 'Dixit'), loan_date: '2026-10-03', return_date: '2026-10-17' }
  const enCours = { ...pret(3, 'Kezao'), loan_date: '2026-10-03' }
  assert.deepEqual(pretsPartis([rendu, rendePlusTard, enCours]), [rendePlusTard, enCours])
})

test('plan : un prêt rendu le jour même fait baisser le nombre', () => {
  const lignes = [
    { ...pret(1, 'Azul'), loan_date: '2026-10-03', return_date: '2026-10-03 11:00:00' },
    { ...pret(1, 'Azul'), loan_date: '2026-10-03' },
    { ...pret(2, 'Dixit'), loan_date: '2026-10-03', return_date: '2026-10-03' },
    { ...pret(3, 'Kezao'), loan_date: '2026-10-03', return_date: '2026-10-31' },
  ]
  const plan = planBilanPermanence({ event: perm, prets: lignes, prochaine: null })
  assert.equal(plan[0].nombre, 2)
  assert.deepEqual(plan[1].cases.map(c => c.nom), ['Azul', 'Kezao'])
  // Seulement des prêts rendus le jour même : pas de bilan
  assert.deepEqual(planBilanPermanence({ event: perm, prets: [lignes[2]], prochaine: null }), [])
})

test('plan : un seul prêt au singulier ; aucun prêt → pas de plan', () => {
  const plan = planBilanPermanence({ event: perm, prets: [pret(1, 'Azul')], prochaine: null })
  assert.equal(plan[0].suite, 'jeu a été emprunté !')
  assert.equal(plan[2].prochaine, null)
  assert.deepEqual(planBilanPermanence({ event: perm, prets: [], prochaine: null }), [])
})

test('plan : au-delà de 12 jeux, 11 cases + « … et N autres »', () => {
  const beaucoup = Array.from({ length: 15 }, (_, i) => pret(i + 1, `Jeu ${String(i + 1).padStart(2, '0')}`))
  const [, grille] = planBilanPermanence({ event: perm, prets: beaucoup, prochaine: null })
  assert.equal(grille.cases.length, MAX_CASES)
  assert.equal(grille.cases[10].nom, 'Jeu 11')
  assert.deepEqual(grille.cases[11], { autres: 4 })
  const douze = Array.from({ length: 12 }, (_, i) => pret(i + 1, `Jeu ${String(i + 1).padStart(2, '0')}`))
  assert.equal(planBilanPermanence({ event: perm, prets: douze, prochaine: null })[1].cases.every(c => c.nom), true)
})

test('plan : sans aucune jaquette, mosaïque vide (aplat bleu au dessin)', () => {
  const plan = planBilanPermanence({ event: perm, prets: [pret(2, 'Écosystème', null)], prochaine: null })
  assert.deepEqual(plan[0].mosaique, [])
})

test('texte de publication', () => {
  const prochaine = { date: '2026-11-07', jour: 'Samedi 7 novembre', heures: 'de 10h à 12h', lieu: '419 Grande rue à Coligny' }
  assert.equal(texteBilanPermanence({ event: perm, prets, prochaine }), [
    '🎲 Retour sur la permanence du samedi 3 octobre !',
    '',
    '📦 3 jeux ont été empruntés : Azul, Dixit, Écosystème.',
    '',
    '📅 Prochaine permanence : samedi 7 novembre, de 10h à 12h, 419 Grande rue à Coligny.',
    '',
    "Pas encore adhérent ? L'adhésion se fait sur place, pour tout le foyer.",
    'Toutes les infos : www.ludothequedecoligny.fr/adherer',
    '',
    'Ludothèque de Coligny',
    'www.ludothequedecoligny.fr',
  ].join('\n'))
  const seul = texteBilanPermanence({ event: perm, prets: [pret(1, 'Azul')], prochaine: null })
  assert.match(seul, /📦 1 jeu a été emprunté : Azul\./)
  assert.doesNotMatch(seul, /Prochaine permanence/)
})
