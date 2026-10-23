# Bilan de permanence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depuis la fenêtre Bilan d'une permanence passée, fabriquer et publier un carrousel de 3 diapositives 4:5 à partir des jeux empruntés ce jour-là.

**Architecture:** Règles pures et testées (`permanence-regles.js`) → dessin canvas (`permanence.js`, même contrat que `carrousel.js`) → composant `PublicationBilanPermanence.jsx` monté dans la fenêtre Bilan de `Evenements.jsx` à la place du message « arrive bientôt ».

**Tech Stack:** React 18 + Vite, Supabase JS, canvas 2D, tests `node --test` (`npm test`), Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-23-bilan-permanence-design.md`

## Global Constraints

- Couleurs : bleu `#1a5f7a`, orange `#e38154`, encre `#0f172a`, crème `#fdfaf6` (`COULEURS` de `dessin.js`). Bricolage Grotesque 800 (titres) / Poppins 500–800.
- Carrousel 1080 × 1350, exactement 3 diapositives ; pas de story.
- Pas de `ctx.filter` (Safari) : flou par `flou`/`dessinerFlou` de `dessin.js` ; libérer les canvases (`liberer`) ; logo `/social/logo-feuille.png`.
- Pictogrammes dessinés, jamais d'émoji dans les images (les émojis restent permis dans le texte de publication).
- Aperçu = image exacte publiée (même fonction de dessin, JPEG 0,9), défilable (`SocialPostPreview` avec `portrait`).
- Jamais de donnée d'adhérent : les requêtes de prêts ne lisent que `game_id` et `games(id, name, image_url)`.
- Toute image envoyée à Make est d'abord déposée dans notre stockage (`uploadSocialBlob`), jamais `data:`/`blob:`.
- Aucune écriture ni publication réelle pendant les essais (interceptions). Code et commentaires en français ; `npm run lint` 0 erreur (5 avertissements connus) ; `npm test` vert.
- Classes Tailwind écrites en toutes lettres (jamais assemblées avec une variable) ; jamais deux réglages contradictoires sur un même élément.
- Commits : auteur `victor.guyon@hotmail.fr` (`git -c user.email=victor.guyon@hotmail.fr commit …`), message terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais de `git push`.

## File Structure

| Fichier | Rôle |
|---|---|
| `src/services/diapos/annonce-regles.js` (modifié) | exporte `heureTexte` (déjà interne) |
| `src/services/diapos/permanence-regles.js` (créé) | permanence ou pas, jeux distincts, prochaine permanence, plan des 3 diapositives, texte de publication |
| `src/services/diapos/permanence-regles.test.js` (créé) | tests |
| `src/services/diapos/permanence.js` (créé) | dessin des 3 diapositives |
| `src/components/admin/bilan/PublicationBilanPermanence.jsx` (créé) | chargement des prêts, texte, aperçu, publication |
| `src/pages/admin/Evenements.jsx` (modifié) | monte le composant pour une permanence ; fermeture bloquée pendant la publication |
| `CLAUDE.md` (modifié) | briques ajoutées |

---

### Task 1: Règles du bilan de permanence

**Files:**
- Modify: `src/services/diapos/annonce-regles.js` (ligne `const heureTexte = …` → `export const heureTexte = …`)
- Create: `src/services/diapos/permanence-regles.js`
- Test: `src/services/diapos/permanence-regles.test.js`

**Interfaces:**
- Consumes: `dateLocale`, `jourMois`, `lieuCourt`, `sansAccents` de `./regles.js` ; `heureTexte` de `./annonce-regles.js`.
- Produces (utilisés par les tâches 2 et 3) :
  - `estPermanence(titre: string): boolean`
  - `jeuxDistincts(prets: {game_id, games: {id, name, image_url}|null}[]): {id, nom, jaquette: string|null}[]` (triés par nom, `localeCompare('fr')`)
  - `prochainePermanence({ evenements, horaires, maintenant }): { date: 'YYYY-MM-DD', jour: string, heures: string, lieu: string } | null`
  - `planBilanPermanence({ event, prets, prochaine }): Diapo[]` (3 diapositives, ou `[]` sans prêt) avec
    - `{ type: 'nombre', mosaique: string[], intro: string, nombre: number, suite: string }`
    - `{ type: 'grille', cases: ({ nom, jaquette } | { autres: number })[] }`
    - `{ type: 'prochaine', mosaique: string[], prochaine: {date, jour, heures, lieu} | null }`
  - `texteBilanPermanence({ event, prets, prochaine }): string`
  - `MAX_CASES = 12`

- [ ] **Step 1: Exporter `heureTexte`**

Dans `src/services/diapos/annonce-regles.js`, remplacer
`const heureTexte = t => {` par `export const heureTexte = t => {` (rien d'autre).

- [ ] **Step 2: Écrire les tests**

`src/services/diapos/permanence-regles.test.js` :

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  estPermanence, jeuxDistincts, prochainePermanence, planBilanPermanence, texteBilanPermanence, MAX_CASES,
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

test('plan : 3 diapositives, nombre = prêts, grille = jeux distincts', () => {
  const prochaine = { date: '2026-11-07', jour: 'Samedi 7 novembre', heures: 'de 10h à 12h', lieu: '419 Grande rue à Coligny' }
  const plan = planBilanPermanence({ event: perm, prets, prochaine })
  assert.deepEqual(plan.map(d => d.type), ['nombre', 'grille', 'prochaine'])
  assert.equal(plan[0].intro, 'Samedi, à la permanence…')
  assert.equal(plan[0].nombre, 4)
  assert.equal(plan[0].suite, 'jeux sont partis jouer dans les familles !')
  // Mosaïque : 8 jaquettes, répétées dans l'ordre, jamais de case vide
  assert.deepEqual(plan[0].mosaique, ['https://x.supabase.co/1.jpg', 'https://x.supabase.co/3.jpg', 'https://x.supabase.co/1.jpg', 'https://x.supabase.co/3.jpg', 'https://x.supabase.co/1.jpg', 'https://x.supabase.co/3.jpg', 'https://x.supabase.co/1.jpg', 'https://x.supabase.co/3.jpg'])
  assert.deepEqual(plan[1].cases, [{ nom: 'Azul', jaquette: 'https://x.supabase.co/1.jpg' }, { nom: 'Dixit', jaquette: 'https://x.supabase.co/3.jpg' }, { nom: 'Écosystème', jaquette: null }])
  assert.deepEqual(plan[2], { type: 'prochaine', mosaique: plan[0].mosaique, prochaine })
})

test('plan : un seul prêt au singulier ; aucun prêt → pas de plan', () => {
  const plan = planBilanPermanence({ event: perm, prets: [pret(1, 'Azul')], prochaine: null })
  assert.equal(plan[0].suite, 'jeu est parti jouer dans les familles !')
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
    '📦 4 jeux sont partis jouer dans les familles : Azul, Dixit, Écosystème.',
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
  assert.match(seul, /📦 1 jeu est parti jouer dans les familles : Azul\./)
  assert.doesNotMatch(seul, /Prochaine permanence/)
})
```

- [ ] **Step 3: Lancer les tests — ils échouent**

Run: `npm test`
Expected: FAIL (module `./permanence-regles.js` introuvable).

- [ ] **Step 4: Écrire `src/services/diapos/permanence-regles.js`**

```js
/**
 * Règles du bilan d'une permanence (carrousel 3 diapositives 4:5, pas de story).
 * Fonctions pures, testées par `npm test`. Dessin : permanence.js.
 * Conception : docs/superpowers/specs/2026-10-23-bilan-permanence-design.md
 * Jamais qui a emprunté quoi : seuls les jeux sont utilisés.
 */
import { dateLocale, jourMois, lieuCourt, sansAccents } from './regles.js'
import { heureTexte } from './annonce-regles.js'

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const NUMERO_JOUR = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 }
export const MAX_CASES = 12
const CASES_MOSAIQUE = 8

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const jourComplet = d => `${JOURS[d.getDay()]} ${jourMois(d)}`
const minuscule = t => t.charAt(0).toLowerCase() + t.slice(1)
const plageHoraire = (debut, fin) => (fin ? `de ${heureTexte(debut)} à ${heureTexte(fin)}` : `à partir de ${heureTexte(debut)}`)

export const estPermanence = titre => sansAccents(titre || '').includes('permanence')

/** Un jeu par `game_id` (un jeu prêté deux fois n'apparaît qu'une fois), trié par nom. */
export function jeuxDistincts(prets) {
  const vus = new Map()
  for (const p of prets) {
    if (p.games && !vus.has(p.game_id)) vus.set(p.game_id, { id: p.game_id, nom: p.games.name || '', jaquette: p.games.image_url || null })
  }
  return [...vus.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

/** n-ième `jourSemaine` du mois (rang 5 = dernier), ou null. */
function nIemeJour(annee, mois, jourSemaine, rang) {
  const dates = []
  for (let d = new Date(annee, mois, 1); d.getMonth() === new Date(annee, mois, 1).getMonth(); d.setDate(d.getDate() + 1)) {
    if (d.getDay() === jourSemaine) dates.push(new Date(d))
  }
  return (rang === 5 ? dates[dates.length - 1] : dates[rang - 1]) || null
}

/**
 * Prochaine permanence strictement après le jour de `maintenant` : l'événement saisi
 * (non archivé) d'abord, sinon d'après les créneaux des Paramètres ; null si rien.
 */
export function prochainePermanence({ evenements = [], horaires = {}, maintenant }) {
  const aujourdhui = iso(maintenant)
  const ev = evenements
    .filter(e => estPermanence(e.title) && !e.archived_at && String(e.date).slice(0, 10) > aujourdhui)
    .sort((a, b) => dateLocale(a.date) - dateLocale(b.date))[0]
  if (ev) {
    const d = dateLocale(ev.date)
    const debut = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    return { date: iso(d), jour: jourComplet(d), heures: plageHoraire(debut, ev.end_time || null), lieu: lieuCourt(ev.location) }
  }
  const creneaux = [1, 2]
    .filter(n => n === 1 || horaires.horaire_2_actif === 'true')
    .map(n => ({ jour: horaires[`horaire_${n}_jour`], rang: Number(horaires[`horaire_${n}_rang`]), debut: horaires[`horaire_${n}_debut`], fin: horaires[`horaire_${n}_fin`] }))
    .filter(c => c.jour && c.rang && c.debut && NUMERO_JOUR[sansAccents(c.jour)] !== undefined)
  const candidats = []
  for (let m = 0; m < 3; m++) {
    for (const c of creneaux) {
      const d = nIemeJour(maintenant.getFullYear(), maintenant.getMonth() + m, NUMERO_JOUR[sansAccents(c.jour)], c.rang)
      if (d && iso(d) > aujourdhui) candidats.push({ d, c })
    }
  }
  const premier = candidats.sort((a, b) => a.d - b.d)[0]
  if (!premier) return null
  const lieu = horaires.adresse_rue ? `${horaires.adresse_rue}${horaires.adresse_ville ? ` à ${horaires.adresse_ville}` : ''}` : ''
  return { date: iso(premier.d), jour: jourComplet(premier.d), heures: plageHoraire(premier.c.debut, premier.c.fin || null), lieu }
}

export function planBilanPermanence({ event, prets, prochaine }) {
  if (!prets.length) return []
  const jeux = jeuxDistincts(prets)
  const jaquettes = jeux.map(j => j.jaquette).filter(Boolean)
  const mosaique = jaquettes.length ? Array.from({ length: CASES_MOSAIQUE }, (_, i) => jaquettes[i % jaquettes.length]) : []
  const cases = jeux.length > MAX_CASES
    ? [...jeux.slice(0, MAX_CASES - 1).map(j => ({ nom: j.nom, jaquette: j.jaquette })), { autres: jeux.length - (MAX_CASES - 1) }]
    : jeux.map(j => ({ nom: j.nom, jaquette: j.jaquette }))
  const n = prets.length
  return [
    {
      type: 'nombre', mosaique,
      intro: `${JOURS[dateLocale(event.date).getDay()]}, à la permanence…`,
      nombre: n,
      suite: n === 1 ? 'jeu est parti jouer dans les familles !' : 'jeux sont partis jouer dans les familles !',
    },
    { type: 'grille', cases },
    { type: 'prochaine', mosaique, prochaine },
  ]
}

export function texteBilanPermanence({ event, prets, prochaine }) {
  const n = prets.length
  const noms = jeuxDistincts(prets).map(j => j.nom)
  const lignes = [
    `🎲 Retour sur la permanence du ${minuscule(jourComplet(dateLocale(event.date)))} !`,
    '',
    `📦 ${n} ${n === 1 ? 'jeu est parti' : 'jeux sont partis'} jouer dans les familles${noms.length ? ` : ${noms.join(', ')}.` : ' !'}`,
  ]
  if (prochaine) {
    lignes.push('', `📅 Prochaine permanence : ${[minuscule(prochaine.jour), prochaine.heures, prochaine.lieu].filter(Boolean).join(', ')}.`)
  }
  lignes.push(
    '',
    "Pas encore adhérent ? L'adhésion se fait sur place, pour tout le foyer.",
    'Toutes les infos : www.ludothequedecoligny.fr/adherer',
    '',
    'Ludothèque de Coligny',
    'www.ludothequedecoligny.fr',
  )
  return lignes.join('\n')
}
```

- [ ] **Step 5: Lancer les tests — ils passent**

Run: `npm test` puis `npm run lint`
Expected: tous les tests passent (29 anciens + 11 nouveaux) ; lint 0 erreur.
Si un test échoue, corriger le code (pas le test) sauf erreur évidente du test : la signaler dans le rapport.

- [ ] **Step 6: Commit**

```bash
git add src/services/diapos/annonce-regles.js src/services/diapos/permanence-regles.js src/services/diapos/permanence-regles.test.js
git -c user.email=victor.guyon@hotmail.fr commit -m "feat: règles du bilan de permanence

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Dessin des 3 diapositives

**Files:**
- Create: `src/services/diapos/permanence.js`

**Interfaces:**
- Consumes: diapositives de `planBilanPermanence` (Task 1) — `nombre {mosaique, intro, nombre, suite}`, `grille {cases: ({nom, jaquette}|{autres})[]}`, `prochaine {mosaique, prochaine: {jour, heures, lieu}|null}` ; outils de `./dessin.js` (`COULEURS, chargerImage, chargerPolices, nouveauCanvas, recouvrir, dessinerFlou, voile, rectArrondi, police, couperLignes, pastille, texteContoure, ombrePleine, liberer`).
- Produces: `export async function dessinerBilanPermanence(plan, onDiapo)` — même contrat exact que `dessinerCarrousel` de `src/services/diapos/carrousel.js:283` (polices chargées, logo `/social/logo-feuille.png`, une image 1080 × 1350 à la fois confiée à `onDiapo(canvas, index)` puis libérée ; sans `onDiapo`, canvases rendus ; en cas d'erreur tout est libéré puis l'erreur relancée).

Référence visuelle **obligatoire** : la maquette validée
`/Users/VictorGuyon/Desktop/PERSO/Ludothèque/Maquette bilan soirée jeux/permanence.html`
et ses rendus `permanence-01.png`, `permanence-02.png`, `permanence-03.png` (même dossier).
Lire le HTML/CSS de la maquette et reproduire positions, tailles, couleurs, contours et ombres.
Reprendre le style de code de `src/services/diapos/carrousel.js` et `src/services/diapos/annonce.js`
(fonctions `(ctx, d, logo)`, `DESSINS = { nombre, grille, prochaine }`, outils locaux comme
`tailleQuiTient`/`limiterLignes`/`baseLigne` d'`annonce.js` : les recopier serait une duplication —
les **exporter depuis `annonce.js`** et les importer).

- [ ] **Step 1: Fond « mosaïque »** (diapos 1 et 3)

Dessiner sur un canvas hors écran 1080 × 1350 une grille 4 colonnes × 2 lignes des 8 jaquettes
de `d.mosaique` (`recouvrir` dans chaque case, comme la maquette `inset: -60px` : la grille déborde
de 60 px de chaque côté), puis `dessinerFlou(ctx, mosaique, 1080, 1350)`, libérer le canvas hors
écran, puis `voile(ctx, 1080, 1350, 'rgba(26,95,122,0.72)')`. Jaquette qui ne se charge pas :
case laissée bleue. `mosaique` vide : aplat `COULEURS.bleu` puis le même voile.

- [ ] **Step 2: Diapo 1 `nombre`**

Pastille en (56, 56) (`pastille(ctx, logo, 56, 56)` comme carrousel.js). Bloc centré
verticalement, padding horizontal 70 : `d.intro` Poppins 700 60 px crème ; `d.nombre` Bricolage 800
540 px (réduire si plus de 2 chiffres pour tenir dans 940 px), contour encre 10 px et ombre pleine
orange 22 px (`texteContoure`) ; `d.suite` Bricolage 800 92 px crème, coupé sur 2 lignes au plus
dans 940 px (`couperLignes`), interlettrage −0,04 em comme la classe `.titre` de la maquette.

- [ ] **Step 3: Diapo 2 `grille`**

Fond `COULEURS.creme`, pastille. Titre « Ils sont partis » + « jouer : » en orange, Bricolage 800
110 px, à y = 170, x = 70 (sur 1 ou 2 lignes comme la maquette). Grille 4 colonnes entre x = 70 et
x = 1080 − 86, entre y = 340 et y = 1260, contenu centré verticalement, écart 30 px horizontal et
56 px vertical (réduit à 36 px si 3 lignes). Case : carte blanche, contour encre 5 px, rayon 26,
ombre pleine 11 px bleue (orange pour les cases d'indice impair), padding 18, jaquette entière
(« contain », centrée). Hauteur de case 214 px pour 1–2 lignes ; pour 3 lignes, la plus grande
hauteur qui fait tenir la grille dans la zone. Nom dessous : Bricolage 800 28 px encre, centré,
2 lignes au plus (`limiterLignes`), 20 px sous la case. Case sans jaquette (ou jaquette qui ne
se charge pas) : le nom écrit au centre de la case (Bricolage 800, 30 px, 3 lignes au plus) et pas
de nom dessous. Case `{ autres: N }` : même carte, fond `COULEURS.orange`, texte centré
« … et N autres » (Bricolage 800, 40 px, encre), pas de nom dessous.

- [ ] **Step 4: Diapo 3 `prochaine`**

Fond mosaïque. Pastille. À y = 230, x = 70 : « À votre tour ! » Poppins 700 56 px crème ; dessous
« Prochaine permanence » Bricolage 800 140 px crème, contour encre 5 px, ombre pleine orange 14 px
(2 lignes si besoin, réduire pour tenir dans 940 px). Carte à y = 640, x = 70 → 1010 : fond crème,
contour 6 px, rayon 34, ombre pleine orange 16 px, padding 44 × 48 : `prochaine.jour` Bricolage 800
74 px encre ; `prochaine.heures` Poppins 700 40 px bleu ; `prochaine.lieu` Poppins 600 32 px
`#475569` (lignes vides retirées, hauteur de carte ajustée). `prochaine` null : carte avec seulement
« Bientôt : surveillez nos publications » (Poppins 700 40 px bleu). En bas (base de la dernière
ligne à y = 1350 − 110) : « Pas encore adhérent ? » + « L'adhésion se fait sur place » (800) +
« , pour tout le foyer. » puis ligne « Toutes les infos : » + « ludothequedecoligny.fr/adherer »
(800) — Poppins 600/800 32 px crème, interligne 1,4, x = 70, coupé dans 940 px.

- [ ] **Step 5: Assembler et vérifier le rendu**

`DESSINS = { nombre, grille, prochaine }` et `dessinerBilanPermanence(plan, onDiapo)` sur le
modèle de `dessinerCarrousel`. Puis rendu réel dans le navigateur (aucune écriture) :
lancer `npx vite --port 5199 --strictPort --no-open` (en arrière-plan) et un script Playwright
jetable (dans le dossier de travail SDD qu'on vous indique, jamais dans le dépôt) inspiré de
`~/.claude/tools/browser/admin-shot.js` qui se connecte avec
`ADMIN_EMAIL=test@ludothequedecoligny.fr ADMIN_PASSWORD=testludotheque` (variables passées sur la
ligne de commande, jamais écrites dans un fichier), importe dans la page
`/src/services/supabaseClient.js`, `/src/services/diapos/permanence-regles.js` et
`/src/services/diapos/permanence.js`, lit (GET seulement) les prêts des 03/10/2026 et 04/07/2026
(`loans` et `loan_history`, `select('game_id, games(id, name, image_url)').eq('loan_date', jour)`),
les événements et les Paramètres, puis dessine et enregistre en JPEG :
- permanence du 03/10/2026 (10 prêts) ;
- permanence du 04/07/2026 (12 prêts) ;
- simulé : 15 jeux distincts (prêts du 03/10 + 04/07 réunis) → case « … et N autres » ;
- simulé : 1 seul prêt, `prochaine: null` ;
- simulé : un jeu sans jaquette.
Regarder chaque image et la comparer aux PNG de la maquette ; corriger jusqu'à ce que ce soit fidèle
et que rien ne déborde. Faire une planche (images côte à côte) pour le rapport.

- [ ] **Step 6: Lint et commit**

Run: `npm run lint` (0 erreur), `npm test` (vert), `npx vite build --outDir /tmp/verif --emptyOutDir` (OK).

```bash
git add src/services/diapos/permanence.js src/services/diapos/annonce.js
git -c user.email=victor.guyon@hotmail.fr commit -m "feat: dessin du bilan de permanence (3 images 4:5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Fenêtre — publication du bilan de permanence

**Files:**
- Create: `src/components/admin/bilan/PublicationBilanPermanence.jsx`
- Modify: `src/pages/admin/Evenements.jsx` (section « Publier sur les réseaux » de la fenêtre Bilan, vers la ligne 2506 ; fermeture de la fenêtre Bilan `closeBilanModal` et son voile/bouton ✕/bouton Fermer)

**Interfaces:**
- Consumes: `estPermanence`, `prochainePermanence`, `planBilanPermanence`, `texteBilanPermanence` (Task 1) ; `dessinerBilanPermanence(plan, onDiapo)` (Task 2) ; `versBlob`, `liberer`, `viderCache` de `dessin.js` ; `estChezNous` de `jaquettes.js` ; `publierSurReseaux`, `uploadSocialBlob` de `reseauxSociaux.js` ; `SocialPostPreview` (`portrait`).
- Produces: `<PublicationBilanPermanence event onPublication />` — `onPublication(true|false)` prévient l'écran qu'une publication est en cours.

Modèles à suivre (lire avant d'écrire) : `src/components/admin/annonce/PublicationAnnonce.jsx`
(aperçu numéroté qui s'abandonne, file `aLaSuite` d'une fabrication d'images à la fois, publication
image par image, blocage de fermeture via `onPublication`, messages d'erreur en français) et la
façon dont `Evenements.jsx` héberge la fenêtre Annonce (`annonceEnPublication`, `fermerAnnonce`).

- [ ] **Step 1: Chargement des données (lecture seule)**

Au montage (et si `event.id` change), en parallèle :
```js
const jour = String(event.date).slice(0, 10)
const champs = 'game_id, games(id, name, image_url)' // jamais de donnée d'adhérent
supabase.from('loans').select(champs).eq('loan_date', jour)
supabase.from('loan_history').select(champs).eq('loan_date', jour)
supabase.from('events').select('title, date, end_time, location, archived_at').ilike('title', '%permanence%').is('archived_at', null).order('date')
supabase.from('settings').select('id, value').or('id.like.horaire_%,id.like.adresse_%')
```
Prêts = les deux listes réunies ; une jaquette qui n'est pas chez nous (`!estChezNous(url)`) est
remplacée par `null` avant le plan (MyLudo interdit le canvas). Erreur sur l'une des deux requêtes
de prêts → message « Les prêts n'ont pas pu être lus. Réessayez ou rechargez la page. » et rien
d'autre. Erreur sur events ou settings → `prochainePermanence` avec ce qui a été lu (liste vide /
objet vide), sans message. `horaires` = objet `{ [id]: value }` des Paramètres.
`prochaine = prochainePermanence({ evenements, horaires, maintenant: new Date() })`.

- [ ] **Step 2: États de la fenêtre**

- Chargement : « Lecture des prêts… » avec `Loader2`.
- Aucun prêt : « Aucun prêt enregistré à la date de cette permanence : pas de bilan à publier. »
- Sinon, grille `md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]` comme PublicationAnnonce :
  à gauche le texte de publication (`textarea`, proposé par `texteBilanPermanence`, modifiable,
  lien « Remettre le texte proposé » visible seulement s'il a été modifié) et une ligne d'aide
  « Les prêts sont retrouvés par leur date : N prêts le samedi 3 octobre. » ; à droite
  l'aperçu `SocialPostPreview text={texte} imageUrls={apercu} portrait` + « Mise à jour de
  l'aperçu… » pendant le dessin.
- Bouton « Publier sur Facebook & Instagram (3) » (désactivé pendant le dessin, la publication, ou
  si le texte est vide) ; après succès, bandeau vert « Publié avec succès ! ».

- [ ] **Step 3: Aperçu exact**

Une fois les données lues : `plan = planBilanPermanence({ event, prets, prochaine })`, dessiné par
`dessinerBilanPermanence(plan, async canvas => apercu.push(canvas.toDataURL('image/jpeg', 0.9)))`
(une image à la fois). Garder `plan` en état : la publication redessine **ce plan-là**. Fenêtre
fermée pendant le dessin : abandon (numéro d'aperçu comme PublicationAnnonce) et `viderCache()` au
démontage. Erreur de dessin : « L'aperçu n'a pas pu être fabriqué. Réessayez ou rechargez la page. »

- [ ] **Step 4: Publication**

```js
const horodatage = Date.now()
const adresses = []
await dessinerBilanPermanence(plan, async (canvas, i) => {
  const blob = await versBlob(canvas)
  liberer(canvas)
  const url = blob && await uploadSocialBlob(blob, `bilans/${event.id}/permanence-${horodatage}-${String(i + 1).padStart(2, '0')}.jpg`)
  if (!url) throw new Error('Image non enregistrée')
  adresses.push(url)
})
await publierSurReseaux({ message: texte, imageUrls: adresses, extra: { event_title: event.title || '', event_date: event.date || '', event_location: event.location || '' } })
```
`onPublication(true)` avant, `onPublication(false)` dans un `finally`. Échec : « La publication a
échoué. Réessayez dans un instant. »

- [ ] **Step 5: Intégration dans Evenements.jsx**

Dans la section « Publier sur les réseaux » de la fenêtre Bilan :
- `estPermanence(bilanModal.event.title)` → `<PublicationBilanPermanence key={bilanModal.event.id} event={bilanModal.event} onPublication={setBilanEnPublication} />` ;
- sinon `getEventType(...) === 'permanence'` (fête du jeu, tournoi…) → garder un message, reformulé :
  « Le bilan de cet événement n'est pas encore proposé. » ;
- sinon `PublicationBilan` inchangé.
Ajouter l'état `bilanEnPublication` : tant qu'il est vrai, la fenêtre Bilan ne se ferme pas (voile,
✕, bouton Fermer désactivés ; Fermer affiche « Publication en cours… »), exactement comme la
fenêtre Annonce. Remis à `false` à l'ouverture de la fenêtre Bilan.

- [ ] **Step 6: Vérifier dans le navigateur (tout envoi intercepté)**

Script Playwright jetable (dossier de travail SDD) connecté avec les variables
`ADMIN_EMAIL`/`ADMIN_PASSWORD` passées sur la ligne de commande ; intercepter **toute** requête
non-GET vers `/rest/v1/` (répondre 204), tout POST/PUT vers `/storage/v1/object` (répondre
`{"Key":"x"}`) et `hook.eu1.make.com` (répondre 200), et les journaliser. Sur `/admin/evenements`,
ouvrir le Bilan de la permanence du 03/10/2026 (bouton « Bilan de l'événement » de sa carte —
attention, `innerText` des cartes est en MAJUSCULES : comparer sans tenir compte de la casse, et
remonter au premier parent dont le texte dépasse 40 caractères pour lire la carte) :
- photos à 1280 et 390 px de large ; regarder les photos ;
- l'aperçu a 3 images défilables, identiques au rendu de la tâche 2 ;
- publier : 3 dépôts `bilans/{id}/permanence-…-01..03.jpg`, Make reçoit `photo_count: 3` et des
  adresses `supabase.co` ; pendant la publication (Make retardé de 2 s), la fenêtre ne se ferme pas ;
- la permanence du 07/11/2026 (aucun prêt, à venir) n'a pas de bouton Bilan : simuler une
  permanence sans prêt en ouvrant le Bilan de celle du 17/10/2026 avec les requêtes `loans` et
  `loan_history` interceptées pour répondre `[]` → message « Aucun prêt… » ;
- la fenêtre Bilan d'une soirée passée (02/10) est inchangée ;
- console sans erreur.
Puis `npm run lint` (0 erreur), `npm test`, `npx vite build --outDir /tmp/verif --emptyOutDir`.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/bilan/PublicationBilanPermanence.jsx src/pages/admin/Evenements.jsx
git -c user.email=victor.guyon@hotmail.fr commit -m "feat: fenêtre Bilan d'une permanence — carrousel de 3 images

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Documentation

**Files:** Modify `CLAUDE.md` : ligne `bilan/PublicationBilanPermanence` dans le tableau des briques
de l'espace de gestion (« fenêtre Bilan d'une permanence : 3 images 4:5 tirées des prêts du jour,
jamais l'emprunteur ; prochaine permanence = événement saisi, sinon Paramètres ») ; une phrase après
le paragraphe sur `src/services/diapos/` : « Le bilan d'une permanence est dessiné par
`permanence-regles.js` / `permanence.js` (prêts de `loans` + `loan_history` à la date de la
permanence). » Commit. Pas de push.
