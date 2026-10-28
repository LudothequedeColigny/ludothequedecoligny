# Jeu de la semaine — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Onglet « Jeu de la semaine » dans Communication qui lit les vidéos du dossier Drive, publie chaque semaine une vidéo en Reel sur Instagram et Facebook (via Make), et rappel du jeudi 17 h sur les téléphones des bénévoles.

**Architecture:** Règles pures dans `src/services/jeuSemaine.js` (recopiées dans `check-events-notify/rappels.js`, un test vérifie que les deux copies donnent les mêmes résultats). Nouvelle fonction serveur `jeu-semaine` (liste du Drive, copie temporaire de la vidéo dans l'espace public `reels`) avec la clé Google en secret ; `check-events-notify` ajoute le rappel du jeudi et efface les copies de plus de 7 jours. Le site envoie `{ message, video_url }` au webhook Make, où une 4ᵉ voie publie les Reels.

**Tech Stack:** React 18 + Vite + Tailwind, Supabase (Postgres, Storage, Edge Functions Deno), Google Drive API v3 (clé d'API), Make (scénario 5585035), `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-28-jeu-de-la-semaine-design.md`

## Global Constraints

- Victor n'est pas développeur : messages à l'écran en français courant, sans jargon.
- Dossier Drive : `1bdQWQauOTWyaGZwvuAcZh-dvF-G_evWs`. Secret : `GOOGLE_DRIVE_CLE` (jamais dans le code du site, jamais écrit dans un fichier).
- Rappel : jeudi, à partir de 17 h heure de Paris, une fois par semaine (lundi → dimanche), pas de relance. Textes exacts : « 🎬 Jeu de la semaine : {jeu} » / « Publiez la vidéo sur Facebook et Instagram. » ; « 🎬 Plus de vidéo en réserve » / « Ajoutez une nouvelle vidéo dans le dossier Drive. » ; adresse `/admin/evenements?onglet=jeu-semaine`.
- Copies effacées 7 jours après publication. Espace `reels` : public, 100 Mo au plus, `video/mp4` et `video/quicktime`.
- Toute nouvelle table : `enable row level security`, policies, `grant` explicites ; rien pour `anon`.
- Ne jamais assembler un nom de classe Tailwind avec une variable ; couleurs écrites en toutes lettres (`bg-[#1a5f7a]`) ou par `style`.
- Icône de l'onglet : `ludo-video.svg` (existe déjà, validée — remplace la nouvelle icône prévue dans la conception : rien à dessiner ni à faire valider).
- Base de la ludothèque : commande `supabase` avec `--linked` / `--project-ref epzfnymfksxnhprcodec`, **jamais** le connecteur MCP Supabase (autre base).
- Make : ne modifier le scénario 5585035 qu'après un « oui » explicite de Victor au moment de le faire.
- `npm test`, `npm run lint` (0 erreur), `npx vite build --outDir /tmp/verif --emptyOutDir` doivent passer. Ne pas pousser sur `main` sans l'accord de Victor.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/services/jeuSemaine.js` (créé) | règles pures : noms, reconnaissance du jeu, file d'attente, prochaine vidéo, légende |
| `src/services/jeuSemaine.test.js` (créé) | tests des règles |
| `supabase/migrations/20261028_jeu_de_la_semaine.sql` (créé) | tables `jeux_semaine`, `rappels_jeu_semaine`, espace `reels` |
| `supabase/functions/_shared/drive.ts` (créé) | lecture du dossier Drive et téléchargement d'une vidéo |
| `supabase/functions/jeu-semaine/index.ts` (créé) | fonction serveur : `liste`, `preparer` |
| `supabase/functions/check-events-notify/rappels.js` (modifié) | copie des règles + `semaineDuRappel`, `rappelJeuSemaine` |
| `supabase/functions/check-events-notify/rappels.test.js` (modifié) | tests du rappel + égalité des deux copies |
| `supabase/functions/check-events-notify/index.ts` (modifié) | envoi du rappel du jeudi, ménage des copies |
| `src/services/reseauxSociaux.js` (modifié) | `publierVideoSurReseaux` |
| `src/services/jeuSemaineFile.js` (créé) | chargement de la file, enregistrement d'une ligne, préparation de la vidéo |
| `src/components/admin/JeuSemaine.jsx` (créé) | l'onglet et ses fenêtres |
| `src/pages/admin/Evenements.jsx` (modifié) | 5ᵉ onglet, compteur, `?onglet=jeu-semaine`, tutoriel |
| `CLAUDE.md` (modifié) | briques, rappels, pièges |

---

### Task 1: Règles pures du jeu de la semaine

**Files:**
- Create: `src/services/jeuSemaine.js`
- Test: `src/services/jeuSemaine.test.js`

**Interfaces:**
- Consumes: rien (fichier autonome, sans import : il est aussi importé par le test de `rappels.js` sous Node).
- Produces :
  - `DOSSIER_DRIVE: string`, `LIEN_DOSSIER_DRIVE: string`
  - `normaliserNom(texte) → string` (sans accents, minuscules, lettres et chiffres seulement)
  - `nomDuFichier(nomFichier) → string` (« SkyTeam_jeu-de-la-semaine.mp4 » → « SkyTeam »)
  - `reconnaitreJeu(nomFichier, jeux) → jeu | null`
  - `fileJeuSemaine({ fichiers, lignes, jeux }) → { attente: Video[], publiees: Video[] }` avec `Video = { driveId, nomFichier, creeLe, jeu, legende, publieLe }`
  - `prochaineVideo(attente) → { video, sautee } | null`
  - `legendeProposee(jeu, prochaine) → string` (`prochaine` = résultat de `prochainePermanence`, ou null)

- [ ] **Step 1: Écrire les tests**

```js
// src/services/jeuSemaine.test.js
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
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npm test 2>&1 | tail -20`
Expected: FAIL — « Cannot find module …/jeuSemaine.js ».

- [ ] **Step 3: Écrire les règles**

```js
// src/services/jeuSemaine.js
/**
 * Règles de l'onglet « Jeu de la semaine » (écran Communication) : vidéos Reels
 * déposées par Victor dans un dossier Google Drive, publiées une par semaine sur
 * Facebook et Instagram. Fonctions pures, testées par `npm test`.
 * Conception : docs/superpowers/specs/2026-10-28-jeu-de-la-semaine-design.md
 *
 * `normaliserNom`, `nomDuFichier`, `reconnaitreJeu`, `fileJeuSemaine` et `prochaineVideo`
 * sont recopiées dans supabase/functions/check-events-notify/rappels.js (la fonction
 * serveur ne peut pas importer `src/`) : les changer aux deux endroits. Un test vérifie
 * que les deux copies donnent les mêmes résultats. Ce fichier n'importe rien pour cela.
 */

export const DOSSIER_DRIVE = '1bdQWQauOTWyaGZwvuAcZh-dvF-G_evWs'
export const LIEN_DOSSIER_DRIVE = `https://drive.google.com/drive/folders/${DOSSIER_DRIVE}`

/** « Sky Team » → « skyteam » : sans accents, minuscules, lettres et chiffres seulement. */
export const normaliserNom = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** « SkyTeam_jeu-de-la-semaine.mp4 » → « SkyTeam » : ce qui précède le premier « _ ». */
export const nomDuFichier = nom => String(nom || '').replace(/\.[a-z0-9]+$/i, '').split('_')[0]

/**
 * Jeu du catalogue dont le nom correspond exactement au nom du fichier, ou null
 * (aucun ou plusieurs : le bénévole choisit). Jamais de correspondance partielle :
 * « Sky » ne doit pas donner « Skyjo ».
 */
export function reconnaitreJeu(nomFichier, jeux) {
  const cle = normaliserNom(nomDuFichier(nomFichier))
  if (!cle) return null
  const trouves = (jeux || []).filter(j => normaliserNom(j.name) === cle)
  return trouves.length === 1 ? trouves[0] : null
}

/**
 * File d'attente et vidéos déjà publiées. `fichiers` = liste du Drive ({ id, name,
 * createdTime }), `lignes` = table jeux_semaine, `jeux` = table games.
 * Un jeu choisi à la main (`game_id`) l'emporte sur la reconnaissance par le nom.
 * Une vidéo publiée puis supprimée du Drive reste dans les publiées.
 */
export function fileJeuSemaine({ fichiers = [], lignes = [], jeux = [] }) {
  const parId = new Map(lignes.map(l => [l.drive_id, l]))
  const jeuDe = (ligne, nomFichier) => {
    if (ligne?.game_id != null) return jeux.find(j => String(j.id) === String(ligne.game_id)) ?? null
    return reconnaitreJeu(nomFichier, jeux)
  }
  const video = (driveId, nomFichier, creeLe, ligne) => ({
    driveId, nomFichier, creeLe, jeu: jeuDe(ligne, nomFichier), legende: ligne?.legende ?? null, publieLe: ligne?.publie_le ?? null,
  })
  const attente = fichiers
    .map(f => video(f.id, f.name, f.createdTime, parId.get(f.id)))
    .filter(v => !v.publieLe)
    .sort((a, b) => String(a.creeLe).localeCompare(String(b.creeLe)))
  const surDrive = new Map(fichiers.map(f => [f.id, f]))
  const publiees = lignes
    .filter(l => l.publie_le)
    .map(l => video(l.drive_id, l.nom_fichier, surDrive.get(l.drive_id)?.createdTime ?? null, l))
    .sort((a, b) => String(b.publieLe).localeCompare(String(a.publieLe)))
  return { attente, publiees }
}

/**
 * Vidéo proposée : la première dont le jeu est reconnu et disponible. `sautee` = la
 * première vidéo passée parce que son jeu est en prêt (pour le dire à l'écran).
 * Aucune disponible : la plus ancienne. File vide : null.
 */
export function prochaineVideo(attente = []) {
  if (attente.length === 0) return null
  const i = attente.findIndex(v => v.jeu && v.jeu.is_available !== false)
  if (i === -1) return { video: attente[0], sautee: null }
  const sautee = attente.slice(0, i).find(v => v.jeu && v.jeu.is_available === false) ?? null
  return { video: attente[i], sautee }
}

const minuscule = t => t.charAt(0).toLowerCase() + t.slice(1)

// Première phrase de la description du catalogue, 200 caractères au plus
function premierePhrase(description) {
  const texte = String(description || '').replace(/\s+/g, ' ').trim()
  if (!texte) return ''
  const phrase = (texte.match(/^.*?[.!?…](?=\s|$)/) || [texte])[0]
  if (phrase.length <= 200) return phrase
  const coupe = phrase.slice(0, 199)
  return `${coupe.slice(0, coupe.lastIndexOf(' ') > 0 ? coupe.lastIndexOf(' ') : 199)}…`
}

// « Sky Team » → « #SkyTeam », « 7 Wonders : Duel » → « #7WondersDuel »
function motClic(nom) {
  const mots = String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean)
  return mots.length ? `#${mots.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join('')}` : ''
}

/** Légende proposée (modèle validé par Victor le 28/10/2026). Chiffres lus dans le catalogue. */
export function legendeProposee(jeu, prochaine) {
  const min = Number(jeu?.min_players) || 0
  const max = Number(jeu?.max_players) || 0
  const duree = Number(jeu?.duration) || 0
  const age = Number(jeu?.min_age) || 0
  const infos = [
    min > 0 && max >= min ? `👥 ${min === max ? `${min} joueur${min > 1 ? 's' : ''}` : `${min} à ${max} joueurs`}` : '',
    duree > 0 ? `⏱ ${duree} min` : '',
    age > 0 ? `dès ${age} ans` : '',
  ].filter(Boolean).join(' · ')
  const permanence = prochaine
    ? `📍 À emprunter à la ludothèque, ${[minuscule(prochaine.jour), prochaine.heures].filter(Boolean).join(' ')}.`
    : '📍 À emprunter à la ludothèque.'
  return [
    `🎲 Le jeu de la semaine : ${String(jeu?.name || '').trim()}`,
    ...[infos, premierePhrase(jeu?.description)].filter(Boolean),
    '',
    permanence,
    '👉 Pas encore adhérent ? ludothequedecoligny.fr/adherer',
    '',
    ['#ludotheque #coligny #jeudesociete', motClic(jeu?.name)].filter(Boolean).join(' '),
  ].join('\n')
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npm test 2>&1 | tail -20`
Expected: tous les tests passent (les anciens compris). Si `nu.split('\n')[1]` n'est pas vide, relire l'assemblage : sans infos ni description, la 2ᵉ ligne est la ligne vide.

- [ ] **Step 5: Commit**

```bash
git add src/services/jeuSemaine.js src/services/jeuSemaine.test.js
git commit -m "feat: jeu de la semaine — règles (reconnaissance du jeu, file d'attente, légende)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Rappel du jeudi (règles côté serveur)

**Files:**
- Modify: `supabase/functions/check-events-notify/rappels.js` (ajout en fin de fichier)
- Test: `supabase/functions/check-events-notify/rappels.test.js` (ajout en fin de fichier)

**Interfaces:**
- Consumes: les règles de la tâche 1 (recopiées à l'identique ; le test importe `../../../src/services/jeuSemaine.js` pour comparer).
- Produces :
  - copies : `nomDuFichier`, `reconnaitreJeu`, `fileJeuSemaine`, `prochaineVideo` (mêmes signatures que la tâche 1 ; `normaliserNom` recopiée sous le nom `normaliserNomJeu` pour ne pas heurter `sansAccents` du fichier)
  - `semaineDuRappel(maintenant) → 'AAAA-MM-JJ' (lundi) | null` — non nul seulement le jeudi à partir de 17 h
  - `rappelJeuSemaine({ semaine, attente, publications }) → { semaine, title, body, url } | null` — `publications` = dates de publication à l'heure de Paris (« 2026-11-03T18:12:00 »)

- [ ] **Step 1: Écrire les tests**

Ajouter en tête de `rappels.test.js` les imports, puis les tests en fin de fichier :

```js
import * as serveur from './rappels.js'
import * as site from '../../../src/services/jeuSemaine.js'
```

```js
// ── Jeu de la semaine ──────────────────────────────────────────────────────
const { semaineDuRappel, rappelJeuSemaine } = serveur
const jeuxSemaine = [
  { id: 1, name: 'Sky Team', is_available: true },
  { id: 2, name: 'Harmonies', is_available: false },
  { id: 3, name: 'Skyjo', is_available: true },
]
const fichiersSemaine = [
  { id: 'h', name: 'Harmonies_jeu-de-la-semaine.mp4', createdTime: '2026-10-27T09:00:00.000Z' },
  { id: 's', name: 'SkyTeam_jeu-de-la-semaine.mp4', createdTime: '2026-10-28T14:30:00.000Z' },
  { id: 'x', name: 'Sky_jeu.mp4', createdTime: '2026-10-26T09:00:00.000Z' },
]

test('jeu de la semaine : les deux copies des règles donnent les mêmes résultats', () => {
  const lignes = [{ drive_id: 'x', nom_fichier: 'Sky_jeu.mp4', game_id: 3, legende: null, publie_le: null }]
  const entree = { fichiers: fichiersSemaine, lignes, jeux: jeuxSemaine }
  assert.deepEqual(serveur.fileJeuSemaine(entree), site.fileJeuSemaine(entree))
  const { attente } = site.fileJeuSemaine(entree)
  assert.deepEqual(serveur.prochaineVideo(attente), site.prochaineVideo(attente))
  for (const nom of ['Sky_jeu.mp4', 'SkyTeam_x.mp4', 'Élan_1.mov', '_.mp4']) {
    assert.deepEqual(serveur.reconnaitreJeu(nom, jeuxSemaine), site.reconnaitreJeu(nom, jeuxSemaine))
    assert.equal(serveur.nomDuFichier(nom), site.nomDuFichier(nom))
  }
})

test('jeu de la semaine : seulement le jeudi à partir de 17h', () => {
  assert.equal(semaineDuRappel('2026-11-05T16:59:00'), null)        // jeudi 16h59
  assert.equal(semaineDuRappel('2026-11-05T17:00:00'), '2026-11-02') // jeudi 17h → lundi 2
  assert.equal(semaineDuRappel('2026-11-05T23:45:00'), '2026-11-02')
  assert.equal(semaineDuRappel('2026-11-06T17:05:00'), null)        // vendredi : pas de relance
  assert.equal(semaineDuRappel('2026-11-02T17:05:00'), null)        // lundi
  assert.equal(semaineDuRappel('2026-12-31T17:05:00'), '2026-12-28') // semaine à cheval sur l'année
})

test('jeu de la semaine : texte du rappel, jeu en prêt sauté, réserve vide', () => {
  const { attente } = serveur.fileJeuSemaine({ fichiers: fichiersSemaine, lignes: [], jeux: jeuxSemaine })
  assert.deepEqual(rappelJeuSemaine({ semaine: '2026-11-02', attente, publications: [] }), {
    semaine: '2026-11-02',
    title: '🎬 Jeu de la semaine : Sky Team',
    body: 'Publiez la vidéo sur Facebook et Instagram.',
    url: '/admin/evenements?onglet=jeu-semaine',
  })
  // Aucun jeu reconnu : nom tiré du fichier
  const inconnue = serveur.fileJeuSemaine({ fichiers: [fichiersSemaine[2]], lignes: [], jeux: jeuxSemaine }).attente
  assert.equal(rappelJeuSemaine({ semaine: '2026-11-02', attente: inconnue, publications: [] }).title, '🎬 Jeu de la semaine : Sky')
  assert.deepEqual(rappelJeuSemaine({ semaine: '2026-11-02', attente: [], publications: [] }), {
    semaine: '2026-11-02',
    title: '🎬 Plus de vidéo en réserve',
    body: 'Ajoutez une nouvelle vidéo dans le dossier Drive.',
    url: '/admin/evenements?onglet=jeu-semaine',
  })
})

test('jeu de la semaine : pas de rappel si une vidéo est déjà publiée cette semaine', () => {
  const { attente } = serveur.fileJeuSemaine({ fichiers: fichiersSemaine, lignes: [], jeux: jeuxSemaine })
  assert.equal(rappelJeuSemaine({ semaine: '2026-11-02', attente, publications: ['2026-11-02T00:00:00'] }), null)
  assert.equal(rappelJeuSemaine({ semaine: '2026-11-02', attente, publications: ['2026-11-04T10:00:00'] }), null)
  assert.notEqual(rappelJeuSemaine({ semaine: '2026-11-02', attente, publications: ['2026-11-01T23:59:00'] }), null) // dimanche précédent
})
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npm test 2>&1 | tail -20`
Expected: FAIL — `serveur.fileJeuSemaine is not a function` / `semaineDuRappel is not a function`.

- [ ] **Step 3: Ajouter les règles en fin de `rappels.js`**

```js
// ── Jeu de la semaine (vidéos du dossier Drive, rappel du jeudi 17 h) ─────────────
// Conception : docs/superpowers/specs/2026-10-28-jeu-de-la-semaine-design.md
// Copie à l'identique de src/services/jeuSemaine.js (la fonction ne peut pas importer
// le site) : les changer aux deux endroits. rappels.test.js compare les deux copies.

const normaliserNomJeu = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

export const nomDuFichier = nom => String(nom || '').replace(/\.[a-z0-9]+$/i, '').split('_')[0]

export function reconnaitreJeu(nomFichier, jeux) {
  const cle = normaliserNomJeu(nomDuFichier(nomFichier))
  if (!cle) return null
  const trouves = (jeux || []).filter(j => normaliserNomJeu(j.name) === cle)
  return trouves.length === 1 ? trouves[0] : null
}

export function fileJeuSemaine({ fichiers = [], lignes = [], jeux = [] }) {
  const parId = new Map(lignes.map(l => [l.drive_id, l]))
  const jeuDe = (ligne, nomFichier) => {
    if (ligne?.game_id != null) return jeux.find(j => String(j.id) === String(ligne.game_id)) ?? null
    return reconnaitreJeu(nomFichier, jeux)
  }
  const video = (driveId, nomFichier, creeLe, ligne) => ({
    driveId, nomFichier, creeLe, jeu: jeuDe(ligne, nomFichier), legende: ligne?.legende ?? null, publieLe: ligne?.publie_le ?? null,
  })
  const attente = fichiers
    .map(f => video(f.id, f.name, f.createdTime, parId.get(f.id)))
    .filter(v => !v.publieLe)
    .sort((a, b) => String(a.creeLe).localeCompare(String(b.creeLe)))
  const surDrive = new Map(fichiers.map(f => [f.id, f]))
  const publiees = lignes
    .filter(l => l.publie_le)
    .map(l => video(l.drive_id, l.nom_fichier, surDrive.get(l.drive_id)?.createdTime ?? null, l))
    .sort((a, b) => String(b.publieLe).localeCompare(String(a.publieLe)))
  return { attente, publiees }
}

export function prochaineVideo(attente = []) {
  if (attente.length === 0) return null
  const i = attente.findIndex(v => v.jeu && v.jeu.is_available !== false)
  if (i === -1) return { video: attente[0], sautee: null }
  const sautee = attente.slice(0, i).find(v => v.jeu && v.jeu.is_available === false) ?? null
  return { video: attente[i], sautee }
}

const JEUDI = 4
const URL_JEU_SEMAINE = '/admin/evenements?onglet=jeu-semaine'

/** Lundi de la semaine (« AAAA-MM-JJ ») si `maintenant` est un jeudi à partir de 17 h, sinon null. */
export function semaineDuRappel(maintenant) {
  const n = lire(maintenant)
  const numero = numeroJour(n.jour)
  const jourSemaine = new Date(numero * 86400000).getUTCDay()
  if (jourSemaine !== JEUDI || n.minutes < 17 * 60) return null
  return new Date((numero - 3) * 86400000).toISOString().slice(0, 10)
}

/**
 * Rappel du jeudi pour la semaine `semaine` (son lundi), ou null si une vidéo a été
 * publiée depuis ce lundi 0 h. `publications` : dates à l'heure de Paris.
 * L'appelant vérifie qu'il n'est pas déjà parti (table rappels_jeu_semaine).
 */
export function rappelJeuSemaine({ semaine, attente = [], publications = [] }) {
  if (publications.some(p => String(p).slice(0, 10) >= semaine)) return null
  const proposition = prochaineVideo(attente)
  if (!proposition) {
    return { semaine, title: '🎬 Plus de vidéo en réserve', body: 'Ajoutez une nouvelle vidéo dans le dossier Drive.', url: URL_JEU_SEMAINE }
  }
  const { video } = proposition
  const nom = video.jeu?.name || nomDuFichier(video.nomFichier)
  return { semaine, title: `🎬 Jeu de la semaine : ${nom}`, body: 'Publiez la vidéo sur Facebook et Instagram.', url: URL_JEU_SEMAINE }
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npm test 2>&1 | tail -20`
Expected: tous passent. Le 05/11/2026 est bien un jeudi (le 06/11 est le vendredi de la soirée Halloween).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/check-events-notify/rappels.js supabase/functions/check-events-notify/rappels.test.js
git commit -m "feat: jeu de la semaine — règles du rappel du jeudi 17 h

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Données — tables et espace de fichiers

**Files:**
- Create: `supabase/migrations/20261028_jeu_de_la_semaine.sql`

**Interfaces:**
- Produces : tables `jeux_semaine (drive_id, nom_fichier, game_id, legende, publie_le, copie_chemin, copie_effacee_le, modifie_le)` et `rappels_jeu_semaine (semaine, envoye_le)` ; espace public `reels`.

- [ ] **Step 1: Écrire la migration**

```sql
-- ════════════════════════════════════════════════════════════════════════════
-- Jeu de la semaine (28 octobre 2026)
--
-- Onglet « Jeu de la semaine » de l'écran Communication : les vidéos (Reels) sont
-- dans un dossier Google Drive ; la base ne garde que du texte (jeu choisi,
-- légende, date de publication, chemin de la copie temporaire).
-- Conception : docs/superpowers/specs/2026-10-28-jeu-de-la-semaine-design.md
--
-- jeux_semaine : bénévoles connectés (écran) et fonctions serveur (clé de service).
-- rappels_jeu_semaine : fonction check-events-notify seulement (un rappel par semaine).
-- Aucune donnée personnelle. Droits posés explicitement (règle Supabase du 30/10/2026).
--
-- Espace « reels » : public en lecture, car Instagram et Facebook téléchargent la
-- vidéo à son adresse ; écrit par la fonction jeu-semaine (clé de service) ; copies
-- effacées 7 jours après la publication par check-events-notify.
--
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.jeux_semaine (
  drive_id text primary key,
  nom_fichier text not null,
  game_id bigint references public.games (id) on delete set null,
  legende text,
  publie_le timestamptz,
  copie_chemin text,
  copie_effacee_le timestamptz,
  modifie_le timestamptz not null default now()
);

alter table public.jeux_semaine enable row level security;
revoke all on table public.jeux_semaine from public, anon, authenticated;
grant select, insert, update on table public.jeux_semaine to authenticated;
grant select, insert, update, delete on table public.jeux_semaine to service_role;

drop policy if exists "Jeu de la semaine géré par les bénévoles" on public.jeux_semaine;
create policy "Jeu de la semaine géré par les bénévoles" on public.jeux_semaine
  for all to authenticated using (true) with check (true);

create table if not exists public.rappels_jeu_semaine (
  semaine date primary key,
  envoye_le timestamptz not null default now()
);

alter table public.rappels_jeu_semaine enable row level security;
revoke all on table public.rappels_jeu_semaine from public, anon, authenticated;
grant select, insert, update, delete on table public.rappels_jeu_semaine to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reels', 'reels', true, 104857600, array['video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

commit;
```

- [ ] **Step 2: Appliquer sur la base de la ludothèque** (accord de Victor donné par la validation du plan du 28/10 ; le lui rappeler en une phrase avant de lancer)

Run: `supabase db query --linked -f supabase/migrations/20261028_jeu_de_la_semaine.sql`
Puis :
- `supabase db query --linked "select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'reels'"` → 1 ligne, `public = true`, `104857600`.
- `supabase db query --linked "select grantee, string_agg(privilege_type, ',') from information_schema.role_table_grants where table_name in ('jeux_semaine','rappels_jeu_semaine') group by table_name, grantee order by 1"` → `authenticated` (SELECT, INSERT, UPDATE) sur `jeux_semaine` seulement, `service_role` sur les deux, **aucune** ligne `anon`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261028_jeu_de_la_semaine.sql
git commit -m "feat: jeu de la semaine — tables et espace de fichiers « reels »

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Clé Google (avec Victor) et fonction serveur `jeu-semaine`

**Files:**
- Create: `supabase/functions/_shared/drive.ts`
- Create: `supabase/functions/jeu-semaine/index.ts`

**Interfaces:**
- Consumes: table `jeux_semaine`, espace `reels` (tâche 3), constante du dossier (même valeur que `DOSSIER_DRIVE` de la tâche 1).
- Produces :
  - `_shared/drive.ts` : `DOSSIER_DRIVE`, `type FichierDrive = { id, name, createdTime, size?, mimeType }`, `listerVideosDrive(cle) → Promise<FichierDrive[]>`, `telechargerVideoDrive(cle, id) → Promise<Uint8Array>`, `class ErreurDrive extends Error`.
  - fonction `jeu-semaine` (POST, bénévole connecté) : `{ action: 'liste' }` → `{ fichiers: FichierDrive[] }` ; `{ action: 'preparer', drive_id, nom_fichier }` → `{ url }` ; erreur → `{ error: message lisible }` avec statut 4xx/5xx.

- [ ] **Step 1: Guider Victor pour la clé Google** (en français courant, une étape à la fois, attendre sa réponse)

1. Aller sur https://console.cloud.google.com avec le compte Google propriétaire du dossier ; accepter les conditions si demandé.
2. En haut, « Sélectionner un projet » → « Nouveau projet » → nom « Ludothèque » → Créer.
3. Menu ☰ → « API et services » → « Bibliothèque » → chercher « Google Drive API » → « Activer ».
4. « API et services » → « Identifiants » → « Créer des identifiants » → « Clé API ».
5. Sur la clé créée : « Modifier la clé » → « Restrictions relatives aux API » → « Restreindre la clé » → cocher seulement « Google Drive API » → Enregistrer.
6. Copier la clé et la coller **lui-même** dans Supabase : tableau de bord du projet ludothèque → « Edge Functions » → « Secrets » → « Add new secret » → nom `GOOGLE_DRIVE_CLE`, valeur = la clé → Save. La clé ne doit pas être collée dans la conversation.

Vérifier : `supabase secrets list --project-ref epzfnymfksxnhprcodec | grep GOOGLE_DRIVE_CLE` → une ligne (valeur masquée).

- [ ] **Step 2: Écrire `_shared/drive.ts`**

```ts
// supabase/functions/_shared/drive.ts
// ─────────────────────────────────────────────────────────────────
// Dossier Google Drive des vidéos « Jeu de la semaine », lu avec une clé d'API
// Google (secret GOOGLE_DRIVE_CLE, limitée à l'API Drive). Le dossier doit rester
// partagé « toute personne disposant du lien ». Utilisé par les fonctions
// jeu-semaine (écran Communication) et check-events-notify (rappel du jeudi).
// Même dossier que DOSSIER_DRIVE dans src/services/jeuSemaine.js.
// ─────────────────────────────────────────────────────────────────

export const DOSSIER_DRIVE = '1bdQWQauOTWyaGZwvuAcZh-dvF-G_evWs'
const API = 'https://www.googleapis.com/drive/v3/files'

export type FichierDrive = { id: string; name: string; createdTime: string; size?: string; mimeType: string }

/** Erreur dont le message peut être montré tel quel au bénévole. */
export class ErreurDrive extends Error {
  constructor(message: string, readonly status = 502) { super(message) }
}

async function erreurDe(res: Response): Promise<ErreurDrive> {
  const texte = await res.text()
  console.error('Google Drive :', res.status, texte.slice(0, 500))
  if (res.status === 400 || res.status === 403) {
    return new ErreurDrive('La clé Google est absente ou refusée : vérifiez le secret GOOGLE_DRIVE_CLE.')
  }
  if (res.status === 404) return new ErreurDrive("Le dossier Drive est introuvable ou n'est plus partagé.")
  return new ErreurDrive("Le dossier Drive n'a pas pu être lu. Réessayez dans un instant.")
}

export async function listerVideosDrive(cle: string): Promise<FichierDrive[]> {
  if (!cle) throw new ErreurDrive('La clé Google est absente ou refusée : vérifiez le secret GOOGLE_DRIVE_CLE.', 500)
  const fichiers: FichierDrive[] = []
  let page = ''
  do {
    const url = new URL(API)
    url.searchParams.set('q', `'${DOSSIER_DRIVE}' in parents and mimeType contains 'video/' and trashed = false`)
    url.searchParams.set('fields', 'nextPageToken, files(id, name, createdTime, size, mimeType)')
    url.searchParams.set('orderBy', 'createdTime')
    url.searchParams.set('pageSize', '200')
    url.searchParams.set('key', cle)
    if (page) url.searchParams.set('pageToken', page)
    const res = await fetch(url)
    if (!res.ok) throw await erreurDe(res)
    const corps = await res.json()
    fichiers.push(...(corps.files ?? []))
    page = corps.nextPageToken ?? ''
  } while (page)
  return fichiers
}

export async function telechargerVideoDrive(cle: string, id: string): Promise<Uint8Array> {
  const res = await fetch(`${API}/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(cle)}`)
  if (!res.ok) throw await erreurDe(res)
  return new Uint8Array(await res.arrayBuffer())
}
```

- [ ] **Step 3: Écrire la fonction `jeu-semaine`**

```ts
// supabase/functions/jeu-semaine/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function — onglet « Jeu de la semaine » de l'écran Communication.
//   { action: 'liste' }                              → vidéos du dossier Drive
//   { action: 'preparer', drive_id, nom_fichier }    → copie de la vidéo dans l'espace
//     public « reels » (Instagram ne sait pas lire Google Drive) et son adresse
// Réservé aux bénévoles connectés. La copie est effacée 7 jours après la
// publication par check-events-notify.
// Conception : docs/superpowers/specs/2026-10-28-jeu-de-la-semaine-design.md
// ─────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { listerVideosDrive, telechargerVideoDrive, ErreurDrive } from '../_shared/drive.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const CLE_DRIVE = Deno.env.get('GOOGLE_DRIVE_CLE') || ''
const TAILLE_MAX = 100 * 1024 * 1024   // limite de l'espace « reels »

const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

// Réservé aux bénévoles connectés, comme la recherche Wikiludo.
async function isVolunteer(req: Request): Promise<boolean> {
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token || token === anonKey) return false
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return false
  const user = await res.json()
  return !!user?.id && user?.role === 'authenticated'
}

async function preparer(driveId: string, nomFichier: string) {
  // Seulement une vidéo du dossier : la fonction ne copie pas n'importe quel fichier Drive public
  const fichier = (await listerVideosDrive(CLE_DRIVE)).find(f => f.id === driveId)
  if (!fichier) return json({ error: "Cette vidéo n'est plus dans le dossier Drive." }, 404)
  if (Number(fichier.size || 0) > TAILLE_MAX) {
    return json({ error: 'Cette vidéo pèse plus de 100 Mo : réduisez-la avant de la publier.' }, 413)
  }

  // Copie déjà faite (essai précédent qui a échoué chez Make) : réutilisée
  const { data: ligne, error: lectureErr } = await supabase.from('jeux_semaine')
    .select('copie_chemin, copie_effacee_le').eq('drive_id', driveId).maybeSingle()
  if (lectureErr) throw lectureErr
  let chemin = ligne?.copie_chemin && !ligne.copie_effacee_le ? ligne.copie_chemin : ''

  if (!chemin) {
    const octets = await telechargerVideoDrive(CLE_DRIVE, driveId)
    const type = fichier.mimeType === 'video/quicktime' ? 'video/quicktime' : 'video/mp4'
    chemin = `${driveId}-${crypto.randomUUID().slice(0, 8)}.${type === 'video/quicktime' ? 'mov' : 'mp4'}`
    const { error: envoiErr } = await supabase.storage.from('reels').upload(chemin, octets, { contentType: type })
    if (envoiErr) throw envoiErr
    // Seules ces colonnes sont écrites : le jeu choisi et la légende sont gardés
    const { error: ecritureErr } = await supabase.from('jeux_semaine').upsert({
      drive_id: driveId, nom_fichier: nomFichier || fichier.name, copie_chemin: chemin, copie_effacee_le: null, modifie_le: new Date().toISOString(),
    }, { onConflict: 'drive_id' })
    if (ecritureErr) throw ecritureErr
  }
  const { data } = supabase.storage.from('reels').getPublicUrl(chemin)
  return json({ url: data.publicUrl })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!(await isVolunteer(req))) return json({ error: 'Non autorisé' }, 401)

  try {
    const corps = await req.json().catch(() => ({}))
    if (corps?.action === 'liste') return json({ fichiers: await listerVideosDrive(CLE_DRIVE) })
    if (corps?.action === 'preparer') {
      const driveId = String(corps.drive_id || '')
      if (!/^[A-Za-z0-9_-]{10,}$/.test(driveId)) return json({ error: 'Vidéo inconnue.' }, 400)
      return await preparer(driveId, String(corps.nom_fichier || ''))
    }
    return json({ error: 'Action inconnue.' }, 400)
  } catch (error) {
    if (error instanceof ErreurDrive) return json({ error: error.message }, error.status)
    console.error('jeu-semaine :', error)
    return json({ error: "La vidéo n'a pas pu être préparée. Réessayez dans un instant." }, 500)
  }
})
```

- [ ] **Step 4: Déployer**

Run: `supabase functions deploy jeu-semaine --project-ref epzfnymfksxnhprcodec`
Expected: « Deployed Functions … jeu-semaine ». Puis `supabase functions list --project-ref epzfnymfksxnhprcodec` → `jeu-semaine` avec `verify_jwt: true` (comme `wikiludo`).

Vérifier le refus sans connexion (la vraie lecture du Drive se vérifie à la tâche 7 depuis l'écran) :
`curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/jeu-semaine" -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" -d '{"action":"liste"}'` (variables lues dans `.env` par `set -a; . ./.env; set +a`) → `{"error":"Non autorisé"}`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/drive.ts supabase/functions/jeu-semaine/index.ts
git commit -m "feat: jeu de la semaine — fonction serveur (liste du Drive, copie de la vidéo)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Envoi du rappel du jeudi et ménage des copies

**Files:**
- Modify: `supabase/functions/check-events-notify/index.ts`

**Interfaces:**
- Consumes: `semaineDuRappel`, `rappelJeuSemaine`, `fileJeuSemaine` (tâche 2), `listerVideosDrive` (tâche 4), tables de la tâche 3.
- Produces : réponse de simulation enrichie `{ simulation, maintenant, rappels, jeu_semaine: rappel | null }` ; réponse normale enrichie de `jeu_semaine_envoye: boolean`, `copies_effacees: number`.

- [ ] **Step 1: Imports et fonctions utilitaires**

Remplacer la ligne d'import des règles par :

```ts
import { rappelsAEnvoyer, estPermanence, semaineDuRappel, rappelJeuSemaine, fileJeuSemaine } from './rappels.js'
import { listerVideosDrive } from '../_shared/drive.ts'
```

Après `const CRON_SECRET = …`, ajouter :

```ts
// send-push a accepté et joint au moins un téléphone (ou aucun n'est abonné) :
// sinon nouvel essai 15 min plus tard
function accepte({ status, reponse }: { status: number; reponse: string }) {
  if (status < 200 || status >= 300) return false
  let resultat: { total?: number; sent?: number } = {}
  try { resultat = JSON.parse(reponse) } catch { /* réponse illisible : considérée comme acceptée */ }
  return !(resultat.total && !resultat.sent)
}

// Rappel du jeudi (jeu de la semaine) : lu seulement le jeudi à partir de 17 h, tant
// qu'il n'est pas parti cette semaine. Le dossier Drive n'est donc pas interrogé
// toutes les 15 min. Une erreur (clé Google, dossier) n'envoie rien : surtout pas
// « Plus de vidéo en réserve » à tort.
async function rappelDuJeudi(maintenant: string) {
  const semaine = semaineDuRappel(maintenant)
  if (!semaine) return null
  const { data: deja, error } = await supabase.from('rappels_jeu_semaine').select('semaine').eq('semaine', semaine).maybeSingle()
  if (error) { console.error('Rappel jeu de la semaine (déjà envoyé ?) :', error.message); return null }
  if (deja) return null
  try {
    const [fichiers, lignes, jeux] = await Promise.all([
      listerVideosDrive(Deno.env.get('GOOGLE_DRIVE_CLE') || ''),
      supabase.from('jeux_semaine').select('drive_id, nom_fichier, game_id, legende, publie_le'),
      supabase.from('games').select('id, name, is_available'),
    ])
    if (lignes.error) throw lignes.error
    if (jeux.error) throw jeux.error
    const { attente } = fileJeuSemaine({ fichiers, lignes: lignes.data ?? [], jeux: jeux.data ?? [] })
    const publications = (lignes.data ?? []).filter(l => l.publie_le).map(l => heureDeParis(new Date(l.publie_le)))
    return rappelJeuSemaine({ semaine, attente, publications })
  } catch (e) {
    console.error('Rappel jeu de la semaine :', (e as { message?: string })?.message ?? String(e))
    return null
  }
}

// Copies des vidéos publiées depuis plus de 7 jours : effacées de l'espace « reels »
async function effacerCopiesAnciennes() {
  const limite = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const { data, error } = await supabase.from('jeux_semaine')
    .select('drive_id, copie_chemin')
    .not('copie_chemin', 'is', null).is('copie_effacee_le', null).lt('publie_le', limite)
  if (error) { console.error('Ménage des vidéos :', error.message); return 0 }
  if (!data?.length) return 0
  const { error: supprErr } = await supabase.storage.from('reels').remove(data.map(l => l.copie_chemin))
  if (supprErr) { console.error('Ménage des vidéos (stockage) :', supprErr.message); return 0 }
  const { error: majErr } = await supabase.from('jeux_semaine')
    .update({ copie_effacee_le: new Date().toISOString() }).in('drive_id', data.map(l => l.drive_id))
  if (majErr) console.error('Ménage des vidéos (base) :', majErr.message)
  return data.length
}
```

- [ ] **Step 2: Brancher dans le passage**

Remplacer :

```ts
    const rappels = rappelsAEnvoyer({ maintenant, evenements: evenements ?? [], pretsParJour })
    if (simulation) return json({ simulation: true, maintenant, rappels })
```

par :

```ts
    const rappels = rappelsAEnvoyer({ maintenant, evenements: evenements ?? [], pretsParJour })
    // 3. Jeu de la semaine : rappel du jeudi 17 h
    const jeuSemaine = await rappelDuJeudi(maintenant)
    if (simulation) return json({ simulation: true, maintenant, rappels, jeu_semaine: jeuSemaine })
```

Dans la boucle d'envoi, remplacer le bloc de contrôle (de `if (status < 200 …` à `if (resultat.total && !resultat.sent) continue`) par :

```ts
      const envoi = await sendPush({ title: r.title, body: r.body, url: r.url })
      if (!accepte(envoi)) continue
```

(et retirer la ligne `const { status, reponse } = await sendPush(…)` devenue inutile).

Après la boucle, avant le `return json({ success: true, … })` :

```ts
    let jeuSemaineEnvoye = false
    if (jeuSemaine && accepte(await sendPush({ title: jeuSemaine.title, body: jeuSemaine.body, url: jeuSemaine.url }))) {
      jeuSemaineEnvoye = true
      const { error } = await supabase.from('rappels_jeu_semaine').insert({ semaine: jeuSemaine.semaine })
      if (error) console.error('Rappel jeu de la semaine (mémorisation) :', error.message)
    }
    const copiesEffacees = await effacerCopiesAnciennes()
```

et compléter la réponse : `return json({ success: true, starting_notified: startingCount, rappels: rappels.length, envoyes, jeu_semaine_envoye: jeuSemaineEnvoye, copies_effacees: copiesEffacees })`.

- [ ] **Step 3: Vérifier les tests et déployer**

Run: `npm test 2>&1 | tail -5` → tous passent.
Run: `supabase functions deploy check-events-notify --project-ref epzfnymfksxnhprcodec --no-verify-jwt`
Expected: « Deployed Functions … check-events-notify ».

- [ ] **Step 4: Simuler sans rien envoyer**

Lire la commande de la tâche (en-têtes avec le mot de passe : ne pas les recopier dans un fichier) :
`supabase db query --linked "select command from cron.job where jobname = 'check-events-notify'"`
Relancer cette commande en remplaçant le corps par `'{"simulation": true, "maintenant": "2026-11-05T17:05:00"}'::jsonb` et en ajoutant `timeout_milliseconds := 30000`, puis lire la réponse :
`supabase db query --linked "select status_code, content from net._http_response order by created desc limit 1"`
Expected: `jeu_semaine` = `{"semaine":"2026-11-02","title":"🎬 Jeu de la semaine : …","body":"Publiez la vidéo sur Facebook et Instagram.","url":"/admin/evenements?onglet=jeu-semaine"}` — le jeu nommé **n'est pas Harmonies** (en prêt le 28/10). Refaire avec `2026-11-05T16:59:00` puis `2026-11-06T17:05:00` → `jeu_semaine: null`. Vérifier aussi qu'aucune ligne n'a été écrite : `select count(*) from rappels_jeu_semaine` → 0.

Si `jeu_semaine` est null le jeudi 17 h 05 : lire les journaux (`supabase functions logs check-events-notify` ou tableau de bord) — message « Rappel jeu de la semaine : … » (clé, dossier).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/check-events-notify/index.ts
git commit -m "feat: jeu de la semaine — rappel du jeudi 17 h et ménage des copies

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Services du site (file, enregistrement, publication vidéo)

**Files:**
- Modify: `src/services/reseauxSociaux.js` (ajout après `publierSurReseaux`)
- Create: `src/services/jeuSemaineFile.js`

**Interfaces:**
- Consumes: fonction `jeu-semaine` (tâche 4), `fileJeuSemaine` (tâche 1).
- Produces :
  - `publierVideoSurReseaux({ message, videoUrl, extra? }) → Promise<void>`
  - `chargerFileJeuSemaine() → Promise<{ attente, publiees, jeux }>` (erreur avec message lisible)
  - `enregistrerVideo(video, champs) → Promise<void>` (upsert d'une ligne `jeux_semaine`)
  - `preparerVideo(video) → Promise<string>` (adresse publique de la copie)

- [ ] **Step 1: `publierVideoSurReseaux`**

```js
/**
 * Envoie une vidéo (Reel) à Make : publiée en Reel sur Instagram et sur Facebook
 * (voie « Vidéo » du scénario). La vidéo doit être hébergée chez nous (espace
 * « reels ») : Instagram ne lit pas Google Drive, et la voie vidéo n'accepte qu'une
 * adresse contenant « supabase.co ». Ni `image_url` ni `photo_count` : les voies
 * carrousel et photo seule ne doivent pas réagir.
 */
export async function publierVideoSurReseaux({ message, videoUrl, extra = {} }) {
  if (!String(videoUrl || '').includes('supabase.co')) throw new Error('Vidéo non hébergée chez nous')
  const res = await fetch(MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, video_url: videoUrl, ...extra }),
  })
  if (!res.ok) throw new Error('Erreur Make: ' + res.status)
}
```

- [ ] **Step 2: `jeuSemaineFile.js`**

```js
import { supabase } from './supabaseClient'
import { fileJeuSemaine } from './jeuSemaine'

/**
 * Données de l'onglet « Jeu de la semaine » (écran Communication) : liste du
 * dossier Drive (fonction serveur jeu-semaine), table jeux_semaine et catalogue.
 */

const COLONNES_JEU = 'id, name, image_url, description, min_players, max_players, duration, min_age, is_available'
const ERREUR_DRIVE = "Le dossier Drive n'a pas pu être lu. Réessayez dans un instant."

// Message renvoyé par la fonction serveur (« La clé Google est absente… »), sinon message général
async function messageDe(error, defaut) {
  try {
    const corps = await error?.context?.json()
    if (corps?.error) return corps.error
  } catch { /* réponse illisible */ }
  return defaut
}

/** File d'attente (plus ancienne d'abord), vidéos publiées, et jeux du catalogue (pour le choix manuel). */
export async function chargerFileJeuSemaine() {
  const [liste, lignes, jeux] = await Promise.all([
    supabase.functions.invoke('jeu-semaine', { body: { action: 'liste' } }),
    supabase.from('jeux_semaine').select('drive_id, nom_fichier, game_id, legende, publie_le'),
    supabase.from('games').select(COLONNES_JEU).order('name'),
  ])
  if (liste.error) throw new Error(await messageDe(liste.error, ERREUR_DRIVE))
  if (lignes.error) throw lignes.error
  if (jeux.error) throw jeux.error
  return {
    ...fileJeuSemaine({ fichiers: liste.data?.fichiers ?? [], lignes: lignes.data ?? [], jeux: jeux.data ?? [] }),
    jeux: jeux.data ?? [],
  }
}

/** Jeu choisi, légende retouchée ou publication d'une vidéo : seules les colonnes données sont écrites. */
export async function enregistrerVideo(video, champs) {
  const { error } = await supabase.from('jeux_semaine').upsert({
    drive_id: video.driveId, nom_fichier: video.nomFichier, ...champs, modifie_le: new Date().toISOString(),
  }, { onConflict: 'drive_id' })
  if (error) throw error
}

/** Copie la vidéo du Drive dans notre stockage (le temps de la publication) et renvoie son adresse. */
export async function preparerVideo(video) {
  const { data, error } = await supabase.functions.invoke('jeu-semaine', {
    body: { action: 'preparer', drive_id: video.driveId, nom_fichier: video.nomFichier },
  })
  if (error) throw new Error(await messageDe(error, "La vidéo n'a pas pu être préparée. Réessayez dans un instant."))
  if (!data?.url) throw new Error("La vidéo n'a pas pu être préparée. Réessayez dans un instant.")
  return data.url
}
```

- [ ] **Step 3: Vérifier**

Run: `npm run lint 2>&1 | tail -5` → 0 erreur (5 avertissements connus).

- [ ] **Step 4: Commit**

```bash
git add src/services/reseauxSociaux.js src/services/jeuSemaineFile.js
git commit -m "feat: jeu de la semaine — chargement de la file et envoi de la vidéo à Make

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: L'onglet « Jeu de la semaine » et son branchement

**Files:**
- Create: `src/components/admin/JeuSemaine.jsx`
- Modify: `src/pages/admin/Evenements.jsx` (`COMM_TABS` l. 22-28, état l. 179-184, compteurs l. 291-311, effet d'adresse après l. 1043, onglets l. 1545-1549, rendu l. 1580, tutoriel l. 1364-1367)

**Interfaces:**
- Consumes: `chargerFileJeuSemaine`, `enregistrerVideo`, `preparerVideo` (tâche 6), `publierVideoSurReseaux` (tâche 6), `prochaineVideo`, `legendeProposee`, `nomDuFichier`, `LIEN_DOSSIER_DRIVE` (tâche 1), `prochainePermanence` (`services/diapos/permanence-regles.js`), `ConfirmModal`, `SuccessModal`, `DataCard`, `MaskIcon`.
- Produces : `<JeuSemaine onCountChange={n => …} />` (export par défaut).

- [ ] **Step 1: Écrire `JeuSemaine.jsx`**

```jsx
import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw, Share2 } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { DataCard } from './DataCard'
import ConfirmModal from './ConfirmModal'
import SuccessModal from '../site/SuccessModal'
import MaskIcon from '../site/MaskIcon'
import { chargerFileJeuSemaine, enregistrerVideo, preparerVideo } from '../../services/jeuSemaineFile'
import { publierVideoSurReseaux } from '../../services/reseauxSociaux'
import { prochaineVideo, legendeProposee, nomDuFichier, LIEN_DOSSIER_DRIVE } from '../../services/jeuSemaine'
import { prochainePermanence } from '../../services/diapos/permanence-regles'

/**
 * Onglet « Jeu de la semaine » de l'écran Communication : les vidéos (Reels) que
 * Victor dépose dans le dossier Drive, publiées une par semaine en Reel sur
 * Instagram et Facebook (rappel le jeudi à 17 h).
 *
 * Proposée : la plus ancienne vidéo pas encore publiée dont le jeu est disponible
 * (règles : services/jeuSemaine.js). La vidéo est copiée le temps de la publication
 * dans notre stockage (Instagram ne lit pas Google Drive), effacée 7 jours après.
 * Conception : docs/superpowers/specs/2026-10-28-jeu-de-la-semaine-design.md
 */

const VIOLET = '#8b5cf6'
const dateCourte = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

function Pastille({ jeu }) {
  if (!jeu) return <span className="rounded-full border-2 border-[#f59e0b] bg-[#fffbeb] px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#b45309]">Jeu à choisir</span>
  return jeu.is_available === false
    ? <span className="rounded-full border-2 border-rose-400 bg-rose-50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-rose-600">En prêt</span>
    : <span className="rounded-full border-2 border-[#10b981] bg-[#ecfdf5] px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#047857]">Disponible</span>
}

function Jaquette({ jeu, taille = 'h-12 w-12' }) {
  return (
    <div className={`flex ${taille} shrink-0 items-center justify-center overflow-hidden rounded-[12px] border-2 border-[#0f172a] bg-white`}>
      {jeu?.image_url
        ? <img src={jeu.image_url} alt="" className="h-full w-full object-contain" />
        : <MaskIcon file="ludo-video.svg" size={22} color="#94a3b8" />}
    </div>
  )
}

export default function JeuSemaine({ onCountChange }) {
  const [chargement, setChargement] = useState(true)
  const [erreurChargement, setErreurChargement] = useState('')
  const [file, setFile] = useState({ attente: [], publiees: [], jeux: [] })
  const [permanence, setPermanence] = useState(null)
  const [choixId, setChoixId] = useState(null)        // « Choisir celle-ci » (non mémorisé)
  const [legende, setLegende] = useState('')
  const [legendeModifiee, setLegendeModifiee] = useState(false)
  const [confirmation, setConfirmation] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    setChargement(true)
    setErreurChargement('')
    try {
      const [donnees, reglages, evs] = await Promise.all([
        chargerFileJeuSemaine(),
        supabase.from('settings').select('id, value').or('id.like.horaire_%,id.like.adresse_%'),
        supabase.from('events').select('title, date, end_time, location, archived_at')
          .ilike('title', '%permanence%').is('archived_at', null).order('date'),
      ])
      let suivante = null
      try {
        suivante = prochainePermanence({
          evenements: evs.error ? [] : evs.data || [],
          horaires: Object.fromEntries((reglages.error ? [] : reglages.data || []).map(r => [r.id, r.value])),
          maintenant: new Date(),
        })
      } catch (err) {
        console.warn('Prochaine permanence :', err)
      }
      setPermanence(suivante)
      setFile(donnees)
      onCountChange?.(donnees.attente.length)
    } catch (err) {
      console.error('Jeu de la semaine :', err)
      setErreurChargement(err?.message || "Le dossier Drive n'a pas pu être lu. Réessayez dans un instant.")
    } finally {
      setChargement(false)
    }
  }, [onCountChange])

  useEffect(() => { charger() }, [charger])

  const proposition = prochaineVideo(file.attente)
  const video = file.attente.find(v => v.driveId === choixId) ?? proposition?.video ?? null
  const jeu = video?.jeu ?? null
  const sautee = video && video === proposition?.video ? proposition.sautee : null

  // Légende : celle enregistrée pour cette vidéo, sinon le modèle
  useEffect(() => {
    setLegende(video?.legende ?? (jeu ? legendeProposee(jeu, permanence) : ''))
    setLegendeModifiee(!!video?.legende)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.driveId, jeu?.id, permanence])

  // Met à jour une vidéo de la file sans relire le Drive
  const majLocale = (driveId, champs) => setFile(f => ({ ...f, attente: f.attente.map(v => (v.driveId === driveId ? { ...v, ...champs } : v)) }))

  const enregistrerLegende = async () => {
    if (!video || !legendeModifiee || legende === video.legende) return
    try {
      await enregistrerVideo(video, { legende })
      majLocale(video.driveId, { legende })
    } catch (err) {
      console.error('Légende non enregistrée :', err)
      setErreur("La légende n'a pas pu être enregistrée. Vérifiez la connexion.")
    }
  }

  const revenirAuModele = async () => {
    try {
      await enregistrerVideo(video, { legende: null })
      majLocale(video.driveId, { legende: null })
      setLegende(legendeProposee(jeu, permanence))
      setLegendeModifiee(false)
    } catch (err) {
      console.error('Légende non remise :', err)
      setErreur("La légende n'a pas pu être remise. Vérifiez la connexion.")
    }
  }

  const choisirJeu = async (gameId) => {
    const choisi = file.jeux.find(j => String(j.id) === String(gameId))
    if (!choisi || !video) return
    try {
      await enregistrerVideo(video, { game_id: choisi.id })
      majLocale(video.driveId, { jeu: choisi })
    } catch (err) {
      console.error('Jeu non enregistré :', err)
      setErreur("Le jeu n'a pas pu être enregistré. Vérifiez la connexion.")
    }
  }

  const publier = async () => {
    if (!video || !jeu || !legende.trim()) return
    setEnvoi(true)
    setErreur('')
    try {
      const url = await preparerVideo(video)
      await publierVideoSurReseaux({ message: legende, videoUrl: url, extra: { jeu: jeu.name } })
      await enregistrerVideo(video, { game_id: jeu.id, legende, publie_le: new Date().toISOString() })
      setConfirmation(false)
      setSucces(true)
      setChoixId(null)
      await charger()
    } catch (err) {
      console.error('Publication jeu de la semaine :', err)
      setConfirmation(false)
      setErreur(err?.message?.startsWith('Erreur Make') ? 'La publication a échoué. Réessayez dans un instant.' : (err?.message || 'La publication a échoué. Réessayez dans un instant.'))
    } finally {
      setEnvoi(false)
    }
  }

  const peutPublier = !!video && !!jeu && !!legende.trim() && !envoi

  return (
    <DataCard shadow={VIOLET}>
      <div className="flex flex-wrap items-center gap-3.5 border-b-2 border-[#0f172a] px-6 py-5">
        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#f5f3ff]">
          <MaskIcon file="ludo-video.svg" size={30} color={VIOLET} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[19px] font-extrabold uppercase tracking-[-0.03em]">Jeu de la semaine</h2>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">Une vidéo par semaine en Reel sur Facebook &amp; Instagram — rappel le jeudi à 17 h</p>
        </div>
        <a href={LIEN_DOSSIER_DRIVE} target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 rounded-[14px] border-2 border-[#0f172a] bg-white px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0f172a] shadow-[3px_3px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#0f172a]">
          <ExternalLink size={13} /> Ouvrir le dossier Drive
        </a>
      </div>

      {chargement ? (
        <div className="flex items-center justify-center py-20 text-[#1a5f7a]"><Loader2 className="animate-spin" size={28} /></div>
      ) : erreurChargement ? (
        <div className="p-8 text-center">
          <p className="mx-auto mb-4 max-w-md rounded-[14px] border-2 border-rose-400 bg-rose-50 px-4 py-3 text-[12px] font-semibold text-rose-600">{erreurChargement}</p>
          <button type="button" onClick={charger} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1a5f7a] underline underline-offset-2">
            <RefreshCw size={12} /> Réessayer
          </button>
        </div>
      ) : (
        <div className="p-6 md:p-8">
          {!video ? (
            <p className="rounded-[24px] border-2 border-dashed border-slate-300 bg-[#fdfaf6] p-8 text-center text-[12px] font-medium text-slate-500">
              Plus de vidéo en réserve : ajoutez-en une dans le dossier Drive, elle apparaîtra ici.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Prochaine vidéo */}
              <div>
                <div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">Prochaine vidéo</div>
                <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[28px] border-2 border-[#0f172a] bg-[#0f172a] shadow-[5px_5px_0_#8b5cf6]">
                  <iframe
                    key={video.driveId}
                    title={`Vidéo ${jeu?.name || nomDuFichier(video.nomFichier)}`}
                    src={`https://drive.google.com/file/d/${video.driveId}/preview`}
                    className="aspect-[9/16] w-full"
                    allow="autoplay"
                  />
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-[18px] border-2 border-[#0f172a] bg-white p-2.5 pr-4">
                  <Jaquette jeu={jeu} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-extrabold text-[#0f172a]">{jeu?.name || nomDuFichier(video.nomFichier)}</p>
                    <p className="truncate text-[10px] font-semibold text-slate-400">{video.nomFichier}</p>
                  </div>
                  <Pastille jeu={jeu} />
                </div>
                {sautee && (
                  <p className="mt-3 rounded-[14px] border-2 border-[#f59e0b] bg-[#fffbeb] px-4 py-3 text-[11px] font-semibold text-[#b45309]">
                    {sautee.jeu.name} est en prêt : vidéo suivante proposée.
                  </p>
                )}
                {!jeu && (
                  <label className="mt-3 block rounded-[14px] border-2 border-[#f59e0b] bg-[#fffbeb] px-4 py-3 text-[11px] font-semibold text-[#b45309]">
                    Jeu non trouvé dans le catalogue : choisissez-le.
                    <select defaultValue="" onChange={e => choisirJeu(e.target.value)}
                      className="mt-2 block w-full rounded-[12px] border-2 border-[#0f172a] bg-white px-3 py-2 text-[12px] font-bold text-[#0f172a]">
                      <option value="" disabled>Choisir un jeu…</option>
                      {file.jeux.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                    </select>
                  </label>
                )}
              </div>

              {/* Légende et publication */}
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">Légende</div>
                  {legendeModifiee && jeu && (
                    <button type="button" onClick={revenirAuModele}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-[#1a5f7a]">
                      <RefreshCw size={11} /> Revenir au texte proposé
                    </button>
                  )}
                </div>
                <textarea
                  rows={12}
                  placeholder="Choisissez le jeu pour obtenir une légende."
                  className="w-full resize-y rounded-[24px] border-2 border-[#0f172a] bg-[#fdfaf6] p-5 text-[13px] font-medium leading-relaxed text-[#0f172a] outline-none placeholder:text-slate-300 focus:bg-white"
                  value={legende}
                  readOnly={envoi}
                  onChange={e => { setLegende(e.target.value); setLegendeModifiee(true) }}
                  onBlur={enregistrerLegende}
                />
                <p className="mt-2 text-[10px] font-semibold text-slate-400">
                  Publiée telle quelle sous la vidéo, sur Instagram et sur Facebook. La vidéo n'a pas de son.
                </p>
                {erreur && (
                  <p className="mt-4 rounded-[14px] border-2 border-rose-400 bg-rose-50 px-4 py-3 text-[11px] font-semibold text-rose-600">{erreur}</p>
                )}
                <button
                  type="button"
                  data-action="publier-jeu-semaine"
                  onClick={() => setConfirmation(true)}
                  disabled={!peutPublier}
                  className={`mt-5 flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-[transform,box-shadow] duration-200 ${
                    peutPublier
                      ? 'bg-[#e38154] text-white shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]'
                      : 'cursor-not-allowed bg-slate-100 text-slate-300'
                  }`}
                >
                  <Share2 size={16} /> Publier sur Facebook &amp; Instagram
                </button>
              </div>
            </div>
          )}

          {/* File d'attente */}
          {file.attente.length > 0 && (
            <div className="mt-10">
              <div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">File d'attente ({file.attente.length})</div>
              <div className="space-y-2">
                {file.attente.map(v => (
                  <div key={v.driveId} className={`flex flex-wrap items-center gap-3 rounded-[18px] border-2 p-2.5 pr-4 ${v === video ? 'border-[#8b5cf6] bg-[#f5f3ff]' : 'border-[#0f172a] bg-white'}`}>
                    <Jaquette jeu={v.jeu} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-extrabold text-[#0f172a]">{v.jeu?.name || nomDuFichier(v.nomFichier)}</p>
                      <p className="text-[10px] font-semibold text-slate-400">{v.creeLe ? `Ajoutée le ${dateCourte(v.creeLe)}` : v.nomFichier}</p>
                    </div>
                    <Pastille jeu={v.jeu} />
                    {v === video
                      ? <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8b5cf6]">Proposée</span>
                      : <button type="button" onClick={() => { setChoixId(v.driveId); setErreur('') }}
                          className="text-[10px] font-bold text-[#1a5f7a] underline underline-offset-2">Choisir celle-ci</button>}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] font-semibold text-slate-400">Pour retirer une vidéo de la file, supprimez-la du dossier Drive.</p>
            </div>
          )}

          {/* Déjà publiées */}
          {file.publiees.length > 0 && (
            <div className="mt-10">
              <div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Déjà publiées ({file.publiees.length})</div>
              <div className="space-y-2">
                {file.publiees.map(v => (
                  <div key={v.driveId} className="flex items-center gap-3 rounded-[18px] border-2 border-slate-200 bg-[#fdfaf6] p-2.5 pr-4">
                    <Jaquette jeu={v.jeu} />
                    <p className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold text-slate-500">{v.jeu?.name || nomDuFichier(v.nomFichier)}</p>
                    <p className="text-[10px] font-semibold text-slate-400">Publiée le {dateCourte(v.publieLe)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmation}
        onClose={() => { if (!envoi) setConfirmation(false) }}
        onConfirm={publier}
        busy={envoi}
        icon={envoi ? <Loader2 className="animate-spin" size={30} /> : <Share2 size={30} />}
        title="Publier la vidéo ?"
        message={jeu ? `La vidéo de ${jeu.name} va être publiée en Reel sur la page Facebook et le compte Instagram de la ludothèque.` : ''}
        confirmLabel={envoi ? 'Envoi en cours…' : 'Publier'}
      />
      <SuccessModal
        open={succes}
        onClose={() => setSucces(false)}
        title="Vidéo envoyée !"
        message="Elle apparaîtra sur la page Facebook et le compte Instagram d'ici quelques minutes, le temps que les deux réseaux la traitent."
      />
    </DataCard>
  )
}
```

Avant d'écrire, vérifier que `DataCard` est bien un export nommé (`import { DataCard } from './DataCard'` comme dans `NouveauxJeux.jsx`) et que `ConfirmModal` accepte `icon` (oui, l. 27).

- [ ] **Step 2: Brancher dans `Evenements.jsx`**

1. Import : `import JeuSemaine from '../../components/admin/JeuSemaine'` et `import { chargerFileJeuSemaine } from '../../services/jeuSemaineFile'` (à côté de `NouveauxJeux`).
2. `COMM_TABS` : commentaire « Les cinq onglets de l'écran Communication » et ajouter `{ id: 'semaine', label: 'Jeu de la semaine', shadow: '#8b5cf6' },` en dernier.
3. Commentaire de `activeTab` : `// 'events' | 'affiche' | 'posts' | 'jeux' | 'semaine'` ; ajouter `const [jeuSemaineCount, setJeuSemaineCount] = useState(0)` sous `jeuxAAnnoncerCount`.
4. Dans `fetchCounters`, après le bloc `chargerJeuxAAnnoncer()` :

```js
      chargerFileJeuSemaine()
        .then(({ attente }) => setJeuSemaineCount(attente.length))
        .catch(() => {})   // badge simplement absent
```

5. Après l'effet du rappel (l. 1043), ajouter :

```js
  // Rappel du jeudi (jeu de la semaine) : ouvre l'onglet, puis retire le paramètre
  useEffect(() => {
    if (searchParams.get('onglet') !== 'jeu-semaine') return
    setActiveTab('semaine')
    const sansOnglet = new URLSearchParams(searchParams)
    sansOnglet.delete('onglet')
    setSearchParams(sansOnglet, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
```

6. Onglets : `grid-cols-2 … sm:grid-cols-4` → `grid-cols-3 … sm:grid-cols-5` ; `count` : ajouter `semaine: jeuSemaineCount` ; `icone` : ajouter `semaine: 'ludo-video.svg'`.
7. Rendu, après la ligne `NouveauxJeux` : `{activeTab === 'semaine' && <JeuSemaine onCountChange={setJeuSemaineCount} />}`.
8. Tutoriel `evt-tabs` : titre `Onglets de Communication` ; ajouter à la description : ` "Jeu de la semaine" publie chaque semaine une des vidéos du dossier Drive en Reel sur Facebook & Instagram ; un rappel arrive le jeudi à 17 h.`

- [ ] **Step 3: Vérifier le code**

Run: `npm test 2>&1 | tail -3 && npm run lint 2>&1 | tail -5 && npx vite build --outDir /tmp/verif --emptyOutDir 2>&1 | tail -3`
Expected: tests verts, 0 erreur de relecture, construction réussie.

- [ ] **Step 4: Photographier l'onglet et ses fenêtres** (compte bénévole de test ; demander le mot de passe à Victor ; identifiants seulement dans les variables `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

```bash
npx vite --port 5199 --strictPort --no-open   # en arrière-plan
ADMIN_EMAIL=… ADMIN_PASSWORD=… node ~/.claude/tools/browser/admin-shot.js "http://localhost:5199/admin/evenements?onglet=jeu-semaine" /tmp/js-1280.png 1280 --full --scroll
ADMIN_EMAIL=… ADMIN_PASSWORD=… node ~/.claude/tools/browser/admin-shot.js "http://localhost:5199/admin/evenements?onglet=jeu-semaine" /tmp/js-390.png 390 --full --scroll
ADMIN_EMAIL=… ADMIN_PASSWORD=… node ~/.claude/tools/browser/admin-shot.js "http://localhost:5199/admin/evenements?onglet=jeu-semaine" /tmp/js-confirm.png 390 --click='[data-action=publier-jeu-semaine]'
```

Regarder chaque photo (Read) : 5 onglets lisibles sur une rangée (ordinateur) et sur 3 colonnes (téléphone) ; vidéo du Drive dans le cadre ; jeu reconnu avec sa pastille ; Harmonies marqué « En prêt » et sauté ; file d'attente dans l'ordre ; fenêtre de confirmation ouverte. **Ne jamais cliquer « Publier » dans la confirmation** (publierait pour de bon). Aucun débordement signalé par l'outil.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/JeuSemaine.jsx src/pages/admin/Evenements.jsx
git commit -m "feat: onglet « Jeu de la semaine » dans Communication

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Voie « Vidéo » dans Make (avec l'accord de Victor)

**Files:** aucun (scénario Make 5585035, équipe 1549376, organisation 7413362).

**Interfaces:**
- Consumes: envoi `{ message, video_url, jeu }` de `publierVideoSurReseaux` (tâche 6).

- [ ] **Step 1: Demander l'accord de Victor**, en une phrase : « J'ajoute la voie vidéo à ton scénario Make et je protège la voie "texte seul" ; les publications actuelles ne changent pas. D'accord ? » Attendre « oui ».

- [ ] **Step 2: Préparer le nouveau plan du scénario**

Relire le scénario (`scenarios_get` 5585035) et partir de son `blueprint` actuel, sans rien changer d'autre que :

1. Voie « Texte seul (Facebook uniquement) » (module 9) : ajouter dans le même groupe de conditions `{ "a": "{{1.video_url}}", "o": "notexist" }`.
2. Ajouter une 4ᵉ voie au routeur (module 6) :

```json
{
  "flow": [
    {
      "id": 10,
      "filter": {
        "name": "Vidéo (Reel), hébergée chez nous",
        "conditions": [[{ "a": "{{1.video_url}}", "b": "supabase.co", "o": "text:contain" }]]
      },
      "module": "instagram-business:CreateAReelPost",
      "version": 1,
      "parameters": { "__IMTCONN__": 6912894 },
      "mapper": {
        "accountId": "17841430975775929",
        "video_url": "{{1.video_url}}",
        "caption": "{{1.message}}",
        "share_to_feed": true
      },
      "metadata": { "designer": { "x": 600, "y": 600 } }
    },
    {
      "id": 11,
      "module": "facebook-pages:uploadAReel",
      "version": 6,
      "parameters": { "__IMTCONN__": 6912894 },
      "mapper": {
        "page_id": "1080537475144262",
        "uploadMethod": "url",
        "url": "{{1.video_url}}",
        "description": "{{1.message}}"
      },
      "metadata": { "designer": { "x": 900, "y": 600 } }
    }
  ]
}
```

- [ ] **Step 3: Valider puis enregistrer**

`validate_blueprint_schema` (puis `validate_module_configuration` pour les modules 10 et 11) → aucune erreur. Puis `scenarios_update` (5585035) avec le blueprint complet. Relire avec `scenarios_get` : `isActive: true`, `isinvalid: false`, 4 voies, condition `video_url notexist` présente sur la voie texte. Ne pas lancer le scénario.

---

### Task 9: Mise en ligne, première publication, fiche de travail

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Mettre à jour `CLAUDE.md`**

- §4, tableau des briques d'administration, ajouter après `NouveauxJeux` :
  `| \`JeuSemaine\` | onglet « Jeu de la semaine » de Communication : vidéos (Reels) du dossier Drive \`1bdQ…Hh\`… (règles \`services/jeuSemaine.js\`, données \`services/jeuSemaineFile.js\`), la plus ancienne non publiée dont le jeu est disponible ; copie temporaire dans l'espace public \`reels\` (fonction \`jeu-semaine\`, clé \`GOOGLE_DRIVE_CLE\`), effacée 7 jours après ; publiée en Reel par la voie « Vidéo » de Make (\`video_url\`) |` (écrire l'identifiant complet du dossier).
- §4, paragraphe Make : ajouter « `video_url` hébergée chez nous → Reel Instagram + Reel Facebook (la voie « texte seul » exige l'absence de `video_url`) ».
- §5, **Rappels** : ajouter « jeu de la semaine le jeudi dès 17h (une fois par semaine, table `rappels_jeu_semaine` ; rien si une vidéo est déjà publiée depuis le lundi ; « Plus de vidéo en réserve » si la file est vide) ; les règles du jeu de la semaine sont aussi **recopiées** dans `rappels.js` (test d'égalité dans `rappels.test.js`) ».
- §5, nouveau piège : « **Vidéos du jeu de la semaine** : Instagram ne lit jamais une adresse Google Drive (même partagée) : toujours passer par la copie dans `reels`. Le dossier Drive doit rester partagé « toute personne disposant du lien ». Facebook refuse les Reels de plus de 90 s. »

- [ ] **Step 2: Vérifications finales**

Run: `npm test 2>&1 | tail -3 && npm run lint 2>&1 | tail -5 && npx vite build --outDir /tmp/verif --emptyOutDir 2>&1 | tail -3`
Relire la page Confidentialité (`src/pages/Confidentialite.jsx`) : aucune donnée de visiteur concernée → rien à ajouter (le noter dans le compte rendu).

- [ ] **Step 3: Commit, puis publier le site avec l'accord de Victor**

```bash
git add CLAUDE.md
git commit -m "docs: fiche de travail — jeu de la semaine

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log -1 --format='%an <%ae>'   # doit être victor.guyon@hotmail.fr (sinon Vercel refuse)
```

Demander à Victor : « Je mets en ligne ? » ; sur « oui » : `git push origin main`, puis vérifier le déploiement Vercel.

- [ ] **Step 4: Première vraie publication (avec Victor)**

Victor publie la vidéo proposée depuis l'onglet. Suivre l'exécution dans Make (`executions_list` du scénario 5585035, puis `executions_get-detail`) : voie « Vidéo » seule exécutée, modules 10 et 11 réussis, voie « Texte seul » **non** exécutée. Demander à Victor de regarder Instagram et Facebook. Si Facebook refuse (format) : lire le message d'erreur Make avant toute modification.

- [ ] **Step 5: Mémoire**

Mettre à jour `strategie-communication-2026.md` (ou créer `jeu-de-la-semaine.md` + ligne dans `MEMORY.md`) : en ligne le …, premier rappel attendu le jeudi 5/11/2026 à 17 h, chiffres vidéo/catalogue à vérifier par Victor (Sky Team 20/30 min, Mysterium 42/40 min, Akropolis 2-4/1-4 joueurs), vidéos sans son.
