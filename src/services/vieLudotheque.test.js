import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cartesEvenements, chiffresCles, serieFrequentation, filtrer, compteurs, parMois,
} from './vieLudotheque.js'

// Modelé sur les vraies données (octobre 2026)
const evenements = [
  { id: 31, title: 'Soirée jeux', date: '2026-07-03 19:00:00', location: 'Salle des fêtes de Coligny', participants_count: 21, archived_at: '2026-07-10' },
  { id: 32, title: 'Permanence de la ludothèque', date: '2026-07-04 10:00:00', location: '419 Grande Rue à Coligny', participants_count: null, archived_at: '2026-07-10' },
  { id: 33, title: 'Permanence de la ludothèque', date: '2026-07-18 14:00:00', location: '419 Grande Rue à Coligny', participants_count: 6, archived_at: '2026-07-20' },
  { id: 35, title: 'Soirées jeux', date: '2026-09-11 19:00:00', location: 'à la salle des fêtes de Coligny', participants_count: 23 },
  { id: 38, title: 'Soirées jeux', date: '2026-10-02T19:00:00', location: 'à la salle des fêtes de Coligny', participants_count: 26, bilan_photo_ouverture: 'p38-3.jpg' },
  { id: 39, title: 'Permanence de la ludothèque', date: '2026-10-03 10:00:00', location: '419 Grande Rue, 01270 Coligny', participants_count: null },
  { id: 41, title: 'Permanence de la ludothèque', date: '2026-10-17 14:00:00', location: '419 Grande rue à Coligny', participants_count: null },
  {
    id: 40, title: 'Après-midi jeux en famille', date: '2026-10-24 14:00:00', location: 'À la salle des fêtes de Coligny', participants_count: 5,
    bilan_expression: { texte: '  Peu de participants pour cette édition mais une belle ambiance !  ', photo: null },
  },
  // À venir : jamais affiché
  { id: 42, title: 'Soirée jeux Halloween', date: '2026-11-06 19:00:00', location: 'Salle des fêtes', participants_count: null },
]
const photos = [
  ...[5, 4, 3, 2, 1].map(n => ({ id: 380 + n, event_id: 38, url: `p38-${n}.jpg` })),
  ...[1, 2].map(n => ({ id: 350 + n, event_id: 35, url: `p35-${n}.jpg` })),
  { id: 401, event_id: 40, url: 'p40-1.jpg' },
]
const jeu = (id, event_id, name, in_catalogue = false) => ({ id, event_id, name, image_url: `${name}.png`, in_catalogue })
const jeux = [
  jeu(1, 31, 'Dixit', true), jeu(2, 31, 'Azul'), jeu(3, 31, 'Skyjo', true), jeu(4, 31, 'Codenames'),
  jeu(10, 38, 'Azul'), jeu(11, 38, 'Just One', true), jeu(12, 38, 'Dobble'), jeu(13, 38, 'Kingdomino'), jeu(14, 38, 'Hanabi'), jeu(15, 38, 'Splendor'),
  jeu(20, 40, 'Dobble'), jeu(21, 40, 'Écosystème'),
]
// Lignes de la fonction jeux_empruntes_permanences() (prêt rendu le jour même déjà exclu)
const ligne = (event_id, jour, game_id, nom) => ({ event_id, jour, game_id, nom, image_url: `${nom}.jpg` })
const emprunts = [
  ligne(32, '2026-07-04', 7, 'Splendor'), ligne(32, '2026-07-04', 5, 'Azul'),
  ligne(33, '2026-07-18', 8, 'Dixit'),
  ligne(39, '2026-10-03', 9, 'Zombie Kidz'), ligne(39, '2026-10-03', 5, 'Azul'), ligne(39, '2026-10-03', 6, 'Écosystème'),
  ligne(39, '2026-10-03', 5, 'Azul'),
  // 17/10 : aucune ligne → permanence masquée
]
const maintenant = new Date(2026, 9, 26, 12, 0)
const donnees = { evenements, photos, jeux, emprunts, maintenant }

test('cartes : seulement le passé, du plus récent au plus ancien, permanence vide masquée', () => {
  const cartes = cartesEvenements(donnees)
  assert.deepEqual(cartes.map(c => c.id), [40, 39, 38, 35, 33, 32, 31])
  assert.deepEqual(cartes.map(c => c.type), ['famille', 'permanence', 'soiree', 'soiree', 'permanence', 'permanence', 'soiree'])
})

test('carte soirée : étiquette, quand, nombre, photos, jeux', () => {
  const c = cartesEvenements(donnees).find(x => x.id === 38)
  assert.equal(c.titre, 'Soirées jeux')
  assert.equal(c.etiquette, 'Soirée jeux !')
  assert.equal(c.quand, 'Vendredi 2 octobre · 19h · Salle des fêtes de Coligny')
  assert.equal(c.date.getTime(), new Date(2026, 9, 2, 19, 0).getTime())
  assert.equal(c.nombre, 26)
  assert.equal(c.libelleNombre, 'joueuses et joueurs !')
  assert.equal(c.expression, null)
  // Photos dans l'ordre d'ajout ; photo d'ouverture choisie dans le bilan
  assert.deepEqual(c.photos, ['p38-1.jpg', 'p38-2.jpg', 'p38-3.jpg', 'p38-4.jpg', 'p38-5.jpg'])
  assert.equal(c.photo, 'p38-3.jpg')
  assert.equal(c.jeux.length, 6)
  assert.deepEqual(c.jeux[1], { nom: 'Just One', image: 'Just One.png', dispo: true })
  assert.deepEqual(c.jeux[0], { nom: 'Azul', image: 'Azul.png', dispo: false })
})

test('photo d’ouverture absente ou supprimée → la première photo', () => {
  const sans = cartesEvenements(donnees).find(x => x.id === 35)
  assert.equal(sans.photo, 'p35-1.jpg')
  const supprimee = cartesEvenements({
    ...donnees,
    evenements: evenements.map(e => (e.id === 38 ? { ...e, bilan_photo_ouverture: 'effacee.jpg' } : e)),
  }).find(x => x.id === 38)
  assert.equal(supprimee.photo, 'p38-1.jpg')
})

test('soirée sans photo : photo null, jeux gardés', () => {
  const c = cartesEvenements(donnees).find(x => x.id === 31)
  assert.equal(c.photo, null)
  assert.deepEqual(c.photos, [])
  assert.equal(c.jeux.length, 4)
  assert.equal(c.nombre, 21)
  assert.equal(c.quand, 'Vendredi 3 juillet · 19h · Salle des fêtes de Coligny')
})

test('après-midi famille : étiquette, libellé et mot des bénévoles', () => {
  const c = cartesEvenements(donnees).find(x => x.id === 40)
  assert.equal(c.etiquette, 'Après-midi en famille !')
  assert.equal(c.libelleNombre, 'petits et grands !')
  assert.equal(c.expression, 'Peu de participants pour cette édition mais une belle ambiance !')
  assert.equal(c.quand, 'Samedi 24 octobre · 14h · Salle des fêtes de Coligny')
  assert.equal(c.photo, 'p40-1.jpg')
})

test('sans participants : nombre null ; rien du tout : carte masquée', () => {
  const evts = [
    { id: 1, title: 'Soirée jeux', date: '2026-10-09 19:00:00', location: '', participants_count: null },
    { id: 2, title: 'Soirée jeux', date: '2026-10-10 19:00:00', location: 'Salle', participants_count: 0 },
    { id: 3, title: 'Soirée jeux', date: '2026-10-11 19:00:00', location: 'Salle', participants_count: '' },
  ]
  const cartes = cartesEvenements({ evenements: evts, photos: [], jeux: [jeu(1, 1, 'Azul')], emprunts: [], maintenant })
  assert.deepEqual(cartes.map(c => c.id), [1])
  assert.equal(cartes[0].nombre, null)
  assert.equal(cartes[0].quand, 'Vendredi 9 octobre · 19h')
})

test('autre événement : type « autre », étiquette = titre', () => {
  const evts = [{ id: 5, title: 'Fête du jeu', date: '2026-05-30 14:30:00', location: 'Place du village', participants_count: 40 }]
  const [c] = cartesEvenements({ evenements: evts, photos: [], jeux: [], emprunts: [], maintenant })
  assert.equal(c.type, 'autre')
  assert.equal(c.etiquette, 'Fête du jeu')
  assert.equal(c.quand, 'Samedi 30 mai · 14h30 · Place du village')
})

test('carte permanence : jeux distincts triés par nom, jamais d’emprunteur', () => {
  const c = cartesEvenements(donnees).find(x => x.id === 39)
  assert.deepEqual(c, {
    id: 39, type: 'permanence', date: new Date(2026, 9, 3, 10, 0), quand: 'Samedi 3 octobre', nombre: 3,
    jeux: [{ nom: 'Azul', image: 'Azul.jpg' }, { nom: 'Écosystème', image: 'Écosystème.jpg' }, { nom: 'Zombie Kidz', image: 'Zombie Kidz.jpg' }],
  })
})

test('emprunts illisibles (fonction absente) : aucune permanence', () => {
  const cartes = cartesEvenements({ ...donnees, emprunts: null })
  assert.equal(cartes.filter(c => c.type === 'permanence').length, 0)
  assert.equal(chiffresCles({ cartes }).jeuxEmpruntes, null)
})

test('chiffres clés', () => {
  const cartes = cartesEvenements(donnees)
  assert.deepEqual(chiffresCles({ cartes }), {
    organises: 4,
    participants: 21 + 23 + 26 + 5,
    // Azul, Dixit, Skyjo, Codenames, Just One, Dobble, Kingdomino, Hanabi, Splendor, Écosystème
    jeuxJoues: 10,
    jeuxEmpruntes: 2 + 1 + 3,
  })
})

test('jeux joués : noms comparés sans accents ni majuscules', () => {
  const evts = [{ id: 1, title: 'Soirée jeux', date: '2026-10-09 19:00:00', participants_count: 3 }]
  const js = [jeu(1, 1, 'Écosystème'), jeu(2, 1, 'ecosysteme '), jeu(3, 1, 'Azul')]
  const cartes = cartesEvenements({ evenements: evts, photos: [], jeux: js, emprunts: [], maintenant })
  assert.equal(chiffresCles({ cartes }).jeuxJoues, 2)
})

test('série de fréquentation : du plus ancien au plus récent, sans permanence', () => {
  assert.deepEqual(serieFrequentation(cartesEvenements(donnees)), [
    { id: 31, type: 'soiree', nombre: 21, jour: '3 juil.', genre: 'Soirée' },
    { id: 35, type: 'soiree', nombre: 23, jour: '11 sept.', genre: 'Soirée' },
    { id: 38, type: 'soiree', nombre: 26, jour: '2 oct.', genre: 'Soirée' },
    { id: 40, type: 'famille', nombre: 5, jour: '24 oct.', genre: 'Famille' },
  ])
})

test('filtres et compteurs', () => {
  const cartes = cartesEvenements(donnees)
  assert.deepEqual(compteurs(cartes), { tout: 7, soiree: 3, famille: 1, permanence: 3 })
  assert.deepEqual(filtrer(cartes, 'tout').map(c => c.id), [40, 39, 38, 35, 33, 32, 31])
  assert.deepEqual(filtrer(cartes, 'soiree').map(c => c.id), [38, 35, 31])
  assert.deepEqual(filtrer(cartes, 'famille').map(c => c.id), [40])
  assert.deepEqual(filtrer(cartes, 'permanence').map(c => c.id), [39, 33, 32])
})

test('regroupement par mois, dans l’ordre des cartes', () => {
  const groupes = parMois(cartesEvenements(donnees))
  assert.deepEqual(groupes.map(g => [g.cle, g.titre, g.cartes.map(c => c.id)]), [
    ['2026-10', 'Octobre 2026', [40, 39, 38]],
    ['2026-09', 'Septembre 2026', [35]],
    ['2026-07', 'Juillet 2026', [33, 32, 31]],
  ])
  assert.deepEqual(parMois([]), [])
})
