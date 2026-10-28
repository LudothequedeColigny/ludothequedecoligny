import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normaliserNom, nomDuFichier, reconnaitreJeu, fileJeuSemaine, prochaineVideo, legendeProposee } from './jeuSemaine.js'

const jeux = [
  { id: 17, name: 'Akropolis', is_available: true, min_players: 1, max_players: 4, duration: 25, min_age: 8, description: 'AKROPOLIS est un jeu de pose de tuiles. Chaque joueur bâtit sa cité.' },
  { id: 93, name: 'Skyjo', is_available: false },
  { id: 199, name: 'Harmonies', is_available: false },
  { id: 269, name: 'Sky Team', is_available: true, min_players: 2, max_players: 2, duration: 30, min_age: 12, description: 'Sky Team est un jeu coopératif à communication limitée.' },
  { id: 300, name: 'Codenames', is_available: true },
  { id: 301, name: 'Codenames', is_available: true },
]
const fichier = (id, name, createdTime) => ({ id, name, createdTime, mimeType: 'video/mp4' })

test('noms : accents, espaces et ponctuation ignorés', () => {
  assert.equal(normaliserNom('Sky Team'), 'skyteam')
  assert.equal(normaliserNom('Élevage : Dés & Cie !'), 'elevagedescie')
  assert.equal(nomDuFichier('SkyTeam_jeu-de-la-semaine.mp4'), 'SkyTeam')
  assert.equal(nomDuFichier('Akropolis_jeu-de-la-semaine-1.mp4'), 'Akropolis')
  assert.equal(nomDuFichier('Akropolis.mp4'), 'Akropolis')
})

test('reconnaissance : égalité exacte seulement, un seul jeu', () => {
  assert.equal(reconnaitreJeu('SkyTeam_jeu-de-la-semaine.mp4', jeux).id, 269)
  assert.equal(reconnaitreJeu('Akropolis_jeu-de-la-semaine-1.mp4', jeux).id, 17)
  assert.equal(reconnaitreJeu('Sky_jeu-de-la-semaine.mp4', jeux), null)        // jamais Skyjo
  assert.equal(reconnaitreJeu('Codenames_jeu.mp4', jeux), null)               // deux jeux : choix manuel
  assert.equal(reconnaitreJeu('Inconnu_jeu.mp4', jeux), null)
  assert.equal(reconnaitreJeu('_jeu.mp4', jeux), null)
})

test('file : plus ancienne d\'abord, choix manuel prioritaire, publiées à part', () => {
  const { attente, publiees } = fileJeuSemaine({
    fichiers: [
      fichier('b', 'SkyTeam_jeu-de-la-semaine.mp4', '2026-10-28T14:30:00.000Z'),
      fichier('a', 'Akropolis_jeu-de-la-semaine-1.mp4', '2026-10-27T09:00:00.000Z'),
      fichier('c', 'Codenames_jeu.mp4', '2026-10-27T10:00:00.000Z'),
      fichier('d', 'Mysterium_jeu.mp4', '2026-10-27T11:00:00.000Z'),
    ],
    lignes: [
      { drive_id: 'c', nom_fichier: 'Codenames_jeu.mp4', game_id: 301, legende: 'Texte retouché', publie_le: null },
      { drive_id: 'd', nom_fichier: 'Mysterium_jeu.mp4', game_id: null, legende: null, publie_le: '2026-10-29T16:00:00+00:00' },
      // Publiée puis supprimée du Drive : reste dans « Déjà publiées »
      { drive_id: 'z', nom_fichier: 'Harmonies_jeu.mp4', game_id: 199, legende: 'x', publie_le: '2026-10-22T16:00:00+00:00' },
    ],
    jeux,
  })
  assert.deepEqual(attente.map(v => v.driveId), ['a', 'c', 'b'])
  assert.equal(attente[1].jeu.id, 301)
  assert.equal(attente[1].legende, 'Texte retouché')
  assert.equal(attente[0].legende, null)
  assert.deepEqual(publiees.map(v => v.driveId), ['d', 'z'])               // la plus récente d'abord
  assert.equal(publiees[1].jeu.id, 199)
  assert.equal(publiees[0].jeu, null)                                       // Mysterium absent du catalogue de test
})

test('prochaine vidéo : jeu en prêt sauté, sinon la plus ancienne, file vide → null', () => {
  const v = (driveId, jeu) => ({ driveId, nomFichier: `${driveId}.mp4`, creeLe: '', jeu, legende: null, publieLe: null })
  const harmonies = jeux[2]; const sky = jeux[3]; const akro = jeux[0]
  assert.deepEqual(prochaineVideo([v('h', harmonies), v('s', sky), v('a', akro)]), { video: v('s', sky), sautee: v('h', harmonies) })
  assert.deepEqual(prochaineVideo([v('a', akro)]), { video: v('a', akro), sautee: null })
  assert.deepEqual(prochaineVideo([v('x', null), v('a', akro)]), { video: v('a', akro), sautee: null }) // non reconnue : à choisir
  assert.deepEqual(prochaineVideo([v('h', harmonies), v('x', null)]), { video: v('h', harmonies), sautee: null })
  assert.equal(prochaineVideo([]), null)
})

test('légende : modèle validé par Victor', () => {
  const prochaine = { date: '2026-11-07', jour: 'Samedi 7 novembre', heures: 'de 10h à 12h', lieu: 'salle des fêtes' }
  assert.equal(legendeProposee(jeux[3], prochaine), [
    '🎲 Le jeu de la semaine : Sky Team',
    '👥 2 joueurs · ⏱ 30 min · dès 12 ans',
    'Sky Team est un jeu coopératif à communication limitée.',
    '',
    '📍 À emprunter à la ludothèque, samedi 7 novembre de 10h à 12h.',
    '👉 Pas encore adhérent ? ludothequedecoligny.fr/adherer',
    '',
    '#ludotheque #coligny #jeudesociete #SkyTeam',
  ].join('\n'))
  const akro = legendeProposee(jeux[0], null)
  assert.match(akro, /👥 1 à 4 joueurs · ⏱ 25 min · dès 8 ans/)
  assert.match(akro, /\nAKROPOLIS est un jeu de pose de tuiles\.\n/)       // première phrase seulement
  assert.match(akro, /📍 À emprunter à la ludothèque\.\n/)
})

test('légende : champs absents omis, description longue coupée', () => {
  const nu = legendeProposee({ name: '7 Wonders : Duel' }, null)
  assert.equal(nu.split('\n')[1], '')                                         // ni infos ni description
  assert.match(nu, /#7WondersDuel$/)
  const long = legendeProposee({ name: 'Long', description: 'mot '.repeat(80) }, null)
  const phrase = long.split('\n')[1]
  assert.ok(phrase.length <= 200, phrase.length)
  assert.ok(phrase.endsWith('…'))
})
