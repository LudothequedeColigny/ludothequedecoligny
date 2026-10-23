# Bilan automatique des soirées — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depuis la fenêtre « Bilan » d'une soirée ou d'un après-midi passé, générer automatiquement un carrousel 4:5 (≤ 10 diapos, publié via Make) et une story 9:16 (4 images, enregistrées sur le téléphone).

**Architecture:** Règles pures (textes, choix des jeux, plan des diapositives) dans `src/services/diapos/regles.js`, testées avec `node --test`. Dessin sur `<canvas>` dans `src/services/diapos/dessin.js` (outils) + `carrousel.js` + `story.js`. Copie des jaquettes MyLudo dans notre stockage (`jaquettes.js`). Un composant `PublicationBilan` remplace la section « Publier sur les réseaux » de la fenêtre Bilan d'`Evenements.jsx`.

**Tech Stack:** React 18 + Vite, Supabase (base + stockage `event-images`), canvas 2D, Make (webhook existant via `publierSurReseaux`), `node --test` (aucune dépendance ajoutée).

**Spec:** `docs/superpowers/specs/2026-10-23-bilan-automatique-design.md` (maquettes de référence : `~/Desktop/PERSO/Ludothèque/Maquette bilan soirée jeux/bilan.html` et `story.html`).

## Global Constraints

- Couleurs : bleu `#1a5f7a`, orange `#e38154`, encre `#0f172a`, crème `#fdfaf6`. Polices : `Bricolage Grotesque` (titres, 800), `Poppins` (texte, 500–800), déjà hébergées dans `public/fonts/`.
- Carrousel 1080 × 1350 ; story 1080 × 1920 ; zones Instagram de la story sans texte : 250 px en haut, 340 px en bas.
- 10 images au plus par carrousel ; 6 jeux au plus.
- Jaquettes MyLudo (300 px) : agrandissement plafonné (×1,35 dans la diapo d'un jeu avec photo, ×1,6 sans photo, ×0,9 dans la grille de story).
- Pas de `ctx.filter` (absent de Safari) : flou par réduction / agrandissement.
- Textes validés : « joueuses et joueurs ! » (soirée), « petits et grands ! » (famille), « plein de jeux ! », « Les voici → », « On a joué à », « ✓ À emprunter à la ludothèque », « Merci ! », « Prochain rendez-vous ».
- Aucune publication réelle pendant les essais : Make et l'envoi au stockage sont interceptés.
- Code et commentaires en français, comme le reste du projet ; `npm run lint` doit rester à 0 erreur (5 avertissements connus).
- Commits : auteur `victor.guyon@hotmail.fr` (déjà configuré dans le dossier), terminer par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

| Fichier | Rôle |
|---|---|
| `src/services/diapos/regles.js` (créé) | Règles pures : type d'événement, formules, choix des jeux, prochain RDV, plan du carrousel et de la story |
| `src/services/diapos/regles.test.js` (créé) | Tests `node --test` des règles |
| `src/services/diapos/dessin.js` (créé) | Outils canvas : images, polices, recouvrement, flou, textes, étiquette, pastille, export |
| `src/services/diapos/carrousel.js` (créé) | Dessin des diapositives 1080 × 1350 |
| `src/services/diapos/story.js` (créé) | Dessin des images de story 1080 × 1920 |
| `src/services/diapos/jaquettes.js` (créé) | Copie des jaquettes MyLudo chez nous, image du catalogue |
| `src/components/admin/bilan/PublicationBilan.jsx` (créé) | Choix des photos, aperçu, publication, story |
| `supabase/migrations/20261023_bilan_automatique.sql` (créé) | Colonnes `photo_url`, `bilan_photo_ouverture`, `bilan_photo_jeux` |
| `src/pages/admin/Evenements.jsx` (modifié) | Remplace la section de publication du bilan par le composant |
| `package.json` (modifié) | Script `test` |
| `CLAUDE.md` (modifié) | Briques ajoutées |

---

### Task 1: Règles pures et tests

**Files:**
- Create: `src/services/diapos/regles.js`
- Create: `src/services/diapos/regles.test.js`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces:
  - `typeEvenement(titre: string): 'soiree' | 'famille' | 'permanence'`
  - `dateLocale(texte: string): Date` — lit « 2026-10-02 19:00:00 » ou « 2026-10-02T19:00 » comme heure locale
  - `formuleOuverture(dateEvenement: string, maintenant: Date): string` — « Vendredi dernier, » ou « Le 2 octobre, »
  - `libelleEtiquette(type): string`, `libelleNombre(type): string`
  - `dateEtLieu(event): string` — « 2 octobre · Salle des fêtes de Coligny »
  - `quandRendezVous(event): string` — « Vendredi 6 novembre · 19h »
  - `choisirJeux(jeux: Jeu[], max = 6): { retenus: Jeu[], ecartes: Jeu[] }`
  - `prochainRendezVous(evenements: Event[], maintenant: Date): Event | null`
  - `planCarrousel(donnees): Diapo[]`, `planStory(donnees): Diapo[]`
  - `donnees = { event, participants: number|null, photos: string[], photoOuverture: string|null, photoJeux: string|null, jeux: Jeu[], prochain: Event|null, maintenant: Date }`
  - `Jeu = { id, name, image: string, in_catalogue: boolean, photo_url: string|null }`
  - `Diapo` = objets `{ type: 'ouverture'|'nombre'|'transition'|'jeu'|'merci'|'grille', ... }` (champs ci-dessous)

- [ ] **Step 1: Ajouter le script de test**

Dans `package.json`, section `scripts`, ajouter :

```json
"test": "TZ=Europe/Paris node --test src/"
```

- [ ] **Step 2: Écrire les tests (ils échouent)**

`src/services/diapos/regles.test.js` :

```js
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
```

- [ ] **Step 3: Lancer les tests pour vérifier l'échec**

Run: `npm test`
Expected: FAIL — `Cannot find module …/regles.js`

- [ ] **Step 4: Écrire les règles**

`src/services/diapos/regles.js` :

```js
/**
 * Règles des visuels de bilan (carrousel et story) : quels textes, quelles photos,
 * quels jeux, dans quel ordre. Fonctions pures, sans canvas ni base de données :
 * testées avec `npm test`. Le dessin est fait par carrousel.js et story.js.
 * Conception : docs/superpowers/specs/2026-10-23-bilan-automatique-design.md
 */

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const MAX_JEUX = 6

const sansAccents = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Même détection que l'écran Communication et la page Vie de l'association. */
export function typeEvenement(titre) {
  const t = sansAccents(titre)
  if (t.includes('soiree')) return 'soiree'
  if (t.includes('famil')) return 'famille'
  return 'permanence'
}

/** Les dates d'événement sont à l'heure de Paris, sans fuseau : lues en heure locale. */
export function dateLocale(texte) {
  const [j, h = '00:00'] = String(texte).replace('T', ' ').split(' ')
  const [a, m, d] = j.split('-').map(Number)
  const [hh, mm] = h.split(':').map(Number)
  return new Date(a, m - 1, d, hh || 0, mm || 0)
}

const jourMois = d => `${d.getDate()} ${MOIS[d.getMonth()]}`
const heure = d => `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`

export function formuleOuverture(dateEvenement, maintenant) {
  const d = dateLocale(dateEvenement)
  const jours = (maintenant - d) / 86400000
  return jours >= 0 && jours < 7 ? `${JOURS[d.getDay()]} dernier,` : `Le ${jourMois(d)},`
}

export function libelleEtiquette(type) {
  return type === 'famille' ? 'Après-midi jeux en famille !' : 'Soirée jeux !'
}

export function libelleNombre(type) {
  return type === 'famille' ? 'petits et grands !' : 'joueuses et joueurs !'
}

// « À la salle des fêtes de Coligny » → « Salle des fêtes de Coligny »
const lieuCourt = l => {
  const t = (l || '').trim().replace(/^(à|a)\s+(la|l')\s*/i, '')
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

export function dateEtLieu(event) {
  const lieu = lieuCourt(event.location)
  return lieu ? `${jourMois(dateLocale(event.date))} · ${lieu}` : jourMois(dateLocale(event.date))
}

export function quandRendezVous(event) {
  const d = dateLocale(event.date)
  return `${JOURS[d.getDay()]} ${jourMois(d)} · ${heure(d)}`
}

/** Six jeux au plus : ceux qui ont une photo d'abord, puis l'ordre de saisie. */
export function choisirJeux(jeux, max = MAX_JEUX) {
  const tries = [...jeux.filter(j => j.photo_url), ...jeux.filter(j => !j.photo_url)]
  return { retenus: tries.slice(0, max), ecartes: tries.slice(max) }
}

/** Premier événement à venir qui n'est pas une permanence, ou null. */
export function prochainRendezVous(evenements, maintenant) {
  return evenements
    .filter(e => typeEvenement(e.title) !== 'permanence' && dateLocale(e.date) > maintenant)
    .sort((a, b) => dateLocale(a.date) - dateLocale(b.date))[0] || null
}

function rendezVous(prochain) {
  if (!prochain) return null
  return {
    titre: prochain.title,
    quand: quandRendezVous(prochain),
    lieu: lieuCourt(prochain.location),
    affiche: prochain.image_url || null,
  }
}

function photosDeBase({ photos, photoOuverture, photoJeux }) {
  const ouverture = photoOuverture && photos.includes(photoOuverture) ? photoOuverture : photos[0]
  const autre = photos.find(p => p !== ouverture)
  const jeux = photoJeux && photos.includes(photoJeux) ? photoJeux : (autre || ouverture)
  return { ouverture, jeux }
}

/** Liste ordonnée des diapositives du carrousel (vide s'il n'y a aucune photo). */
export function planCarrousel(donnees) {
  const { event, participants, photos, jeux, prochain, maintenant } = donnees
  if (!photos.length) return []
  const type = typeEvenement(event.title)
  const base = photosDeBase(donnees)
  const plan = [{
    type: 'ouverture', photo: base.ouverture,
    formule: formuleOuverture(event.date, maintenant),
    etiquette: libelleEtiquette(type), lieu: dateEtLieu(event),
  }]
  if (participants != null && participants !== '') {
    plan.push({ type: 'nombre', photo: base.ouverture, nombre: Number(participants), apres: libelleNombre(type) })
  }
  plan.push({ type: 'transition', photo: base.jeux })
  const { retenus } = choisirJeux(jeux)
  retenus.forEach((j, i) => plan.push({
    type: 'jeu', nom: j.name, jaquette: j.image, dispo: !!j.in_catalogue,
    photo: j.photo_url && photos.includes(j.photo_url) ? j.photo_url : null,
    fond: photos[i % photos.length],
  }))
  plan.push({ type: 'merci', rdv: rendezVous(prochain) })
  return plan
}

/** Les 4 images de la story (3 sans participants). */
export function planStory(donnees) {
  const { event, participants, photos, jeux, prochain, maintenant } = donnees
  if (!photos.length) return []
  const type = typeEvenement(event.title)
  const base = photosDeBase(donnees)
  const plan = [{
    type: 'ouverture', photo: base.ouverture,
    formule: formuleOuverture(event.date, maintenant),
    etiquette: libelleEtiquette(type), lieu: dateEtLieu(event),
  }]
  if (participants != null && participants !== '') {
    plan.push({ type: 'nombre', photo: base.ouverture, nombre: Number(participants), apres: libelleNombre(type) })
  }
  plan.push({
    type: 'grille', photo: base.jeux,
    jeux: choisirJeux(jeux).retenus.map(j => ({ nom: j.name, jaquette: j.image, dispo: !!j.in_catalogue })),
  })
  plan.push({ type: 'merci', rdv: rendezVous(prochain) })
  return plan
}
```

- [ ] **Step 5: Lancer les tests**

Run: `npm test`
Expected: PASS — 12 tests, 0 échec.

- [ ] **Step 6: Commit**

```bash
git add package.json src/services/diapos/regles.js src/services/diapos/regles.test.js
git commit -m "feat: règles des visuels de bilan (textes, jeux retenus, plan des diapositives)"
```

---

### Task 2: Colonnes de la base

**Files:**
- Create: `supabase/migrations/20261023_bilan_automatique.sql`

**Interfaces:**
- Produces: colonnes `event_games_played.photo_url text`, `events.bilan_photo_ouverture text`, `events.bilan_photo_jeux text` (null par défaut ; droits hérités des tables).

- [ ] **Step 1: Écrire la migration**

```sql
-- ════════════════════════════════════════════════════════════════════════════
-- Bilan automatique des soirées (23 octobre 2026)
--
-- Choix faits dans la fenêtre « Bilan » pour fabriquer le carrousel :
--  - photo de la soirée associée à chaque jeu joué (null = sans photo) ;
--  - photos des diapositives d'ouverture et « plein de jeux » (null = par défaut).
-- Aucune table nouvelle : les colonnes héritent des droits existants.
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.event_games_played add column if not exists photo_url text;
alter table public.events add column if not exists bilan_photo_ouverture text;
alter table public.events add column if not exists bilan_photo_jeux text;
```

- [ ] **Step 2: Appliquer et vérifier**

Run:
```bash
supabase db query --linked -f supabase/migrations/20261023_bilan_automatique.sql
supabase db query --linked "select table_name, column_name from information_schema.columns where column_name in ('photo_url','bilan_photo_ouverture','bilan_photo_jeux') and table_schema='public'"
```
Expected: trois lignes (`event_games_played.photo_url`, `events.bilan_photo_ouverture`, `events.bilan_photo_jeux`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261023_bilan_automatique.sql
git commit -m "feat: colonnes du bilan automatique (photo par jeu, photos d'ouverture)"
```

---

### Task 3: Outils de dessin

**Files:**
- Create: `src/services/diapos/dessin.js`

**Interfaces:**
- Produces (toutes exportées) :
  - `COULEURS = { bleu, orange, encre, creme }`
  - `chargerImage(url): Promise<HTMLImageElement|null>` (cache par URL, `crossOrigin='anonymous'`)
  - `chargerPolices(): Promise<void>`
  - `nouveauCanvas(w, h): { canvas, ctx }`
  - `recouvrir(ctx, img, x, y, w, h)` — image en « cover »
  - `flou(img, w, h): HTMLCanvasElement` — version floutée en « cover » de taille w×h
  - `degradeBas(ctx, w, h, debut = 0.38)` ; `voile(ctx, w, h, couleur)`
  - `rectArrondi(ctx, x, y, w, h, r)`
  - `police(ctx, poids, taille, famille = 'Poppins')`
  - `couperLignes(ctx, texte, largeurMax): string[]`
  - `etiquette(ctx, lignes, { x, y, taille, angle, fond }) → { hauteur }` (x,y = coin haut gauche)
  - `pastille(ctx, logo, x, y)`
  - `texteContoure(ctx, texte, x, y, { taille, contour, ombre })` (centre/gauche selon `ctx.textAlign`)
  - `ombrePleine(ctx, img, x, y, w, h, decalage)` — ombre encre qui suit la forme (PNG détouré)
  - `versBlob(canvas): Promise<Blob|null>` (JPEG 0,9)

- [ ] **Step 1: Écrire le module**

```js
/**
 * Outils de dessin communs aux diapositives (carrousel et story), charte
 * « papier découpé » du site. Tout est dessiné sur <canvas> pour être exporté
 * en JPEG. Pas de ctx.filter : il ne fonctionne pas sur Safari.
 */

export const COULEURS = { bleu: '#1a5f7a', orange: '#e38154', encre: '#0f172a', creme: '#fdfaf6' }

const cache = new Map()
export function chargerImage(url) {
  if (!url) return Promise.resolve(null)
  if (!cache.has(url)) {
    cache.set(url, new Promise(resolve => {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = url
    }))
  }
  return cache.get(url)
}

export async function chargerPolices() {
  await Promise.all([
    document.fonts.load('800 100px "Bricolage Grotesque"'),
    ...[500, 600, 700, 800].map(p => document.fonts.load(`${p} 30px "Poppins"`)),
  ]).catch(() => {})
}

export function nouveauCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return { canvas, ctx: canvas.getContext('2d') }
}

export function recouvrir(ctx, img, x, y, w, h) {
  const r = Math.max(w / img.width, h / img.height)
  const sw = w / r
  const sh = h / r
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

/** Flou fort par réductions successives puis agrandissement lissé. */
export function flou(img, w, h) {
  const { canvas: petit, ctx: p } = nouveauCanvas(Math.max(8, Math.round(w / 24)), Math.max(8, Math.round(h / 24)))
  p.imageSmoothingQuality = 'high'
  recouvrir(p, img, 0, 0, petit.width, petit.height)
  const { canvas: moyen, ctx: m } = nouveauCanvas(petit.width * 4, petit.height * 4)
  m.imageSmoothingQuality = 'high'
  m.drawImage(petit, 0, 0, moyen.width, moyen.height)
  const { canvas, ctx } = nouveauCanvas(w, h)
  ctx.imageSmoothingQuality = 'high'
  // Léger débord pour éviter les bords plus clairs
  ctx.drawImage(moyen, -w * 0.06, -h * 0.06, w * 1.12, h * 1.12)
  return canvas
}

export function degradeBas(ctx, w, h, debut = 0.38) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, 'rgba(15,23,42,0)')
  g.addColorStop(debut, 'rgba(15,23,42,0)')
  g.addColorStop(Math.min(0.95, debut + 0.24), 'rgba(15,23,42,0.55)')
  g.addColorStop(1, 'rgba(15,23,42,0.92)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

export function voile(ctx, w, h, couleur) {
  ctx.fillStyle = couleur
  ctx.fillRect(0, 0, w, h)
}

export function rectArrondi(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

export function police(ctx, poids, taille, famille = 'Poppins') {
  ctx.font = `${poids} ${taille}px "${famille}", sans-serif`
}

/** Découpe un texte en lignes qui tiennent dans largeurMax (police déjà réglée). */
export function couperLignes(ctx, texte, largeurMax) {
  const mots = String(texte).split(/\s+/).filter(Boolean)
  const lignes = []
  let ligne = ''
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot
    if (ligne && ctx.measureText(essai).width > largeurMax) {
      lignes.push(ligne)
      ligne = mot
    } else ligne = essai
  }
  if (ligne) lignes.push(ligne)
  return lignes
}

const espacement = (ctx, valeur) => { if ('letterSpacing' in ctx) ctx.letterSpacing = valeur }

/** Étiquette orange contourée, ombre pleine décalée, légèrement penchée. */
export function etiquette(ctx, lignes, { x, y, taille, angle = -3, fond = COULEURS.orange }) {
  police(ctx, 800, taille, 'Bricolage Grotesque')
  espacement(ctx, `${-0.04 * taille}px`)
  const hautLigne = taille * 0.95
  const largeur = Math.max(...lignes.map(l => ctx.measureText(l).width)) + 68
  const hauteur = lignes.length * hautLigne + 26
  ctx.save()
  ctx.translate(x, y + hauteur / 2)
  ctx.rotate((angle * Math.PI) / 180)
  ctx.translate(0, -hauteur / 2)
  ctx.fillStyle = COULEURS.encre
  rectArrondi(ctx, 14, 14, largeur, hauteur, 26); ctx.fill()
  ctx.fillStyle = fond
  rectArrondi(ctx, 0, 0, largeur, hauteur, 26); ctx.fill()
  ctx.lineWidth = 6; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, 0, 0, largeur, hauteur, 26); ctx.stroke()
  ctx.fillStyle = COULEURS.encre
  ctx.textBaseline = 'alphabetic'
  lignes.forEach((l, i) => ctx.fillText(l, 34, 6 + (i + 1) * hautLigne - taille * 0.18))
  ctx.restore()
  espacement(ctx, '0px')
  return { hauteur, largeur }
}

/** Pastille « LUDOTHÈQUE DE COLIGNY » avec la feuille. */
export function pastille(ctx, logo, x, y) {
  police(ctx, 800, 24)
  espacement(ctx, '3.4px')
  const texte = 'LUDOTHÈQUE DE COLIGNY'
  const largeur = 14 + 46 + 14 + ctx.measureText(texte).width + 26
  const hauteur = 78
  ctx.fillStyle = COULEURS.encre
  rectArrondi(ctx, x + 7, y + 7, largeur, hauteur, 39); ctx.fill()
  ctx.fillStyle = COULEURS.creme
  rectArrondi(ctx, x, y, largeur, hauteur, 39); ctx.fill()
  ctx.lineWidth = 4; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, x, y, largeur, hauteur, 39); ctx.stroke()
  if (logo) ctx.drawImage(logo, x + 14, y + 16, 46, 46)
  ctx.fillStyle = COULEURS.encre
  ctx.textBaseline = 'middle'
  ctx.fillText(texte, x + 74, y + hauteur / 2 + 1)
  ctx.textBaseline = 'alphabetic'
  espacement(ctx, '0px')
}

/** Gros texte crème, contour encre et ombre pleine orange (« 26 », « Merci ! »). */
export function texteContoure(ctx, texte, x, y, { taille, contour = 10, ombre = 22, couleurOmbre = COULEURS.orange }) {
  police(ctx, 800, taille, 'Bricolage Grotesque')
  espacement(ctx, `${-0.04 * taille}px`)
  ctx.lineJoin = 'round'
  ctx.fillStyle = couleurOmbre
  ctx.fillText(texte, x + ombre, y + ombre)
  ctx.lineWidth = contour * 2
  ctx.strokeStyle = COULEURS.encre
  ctx.strokeText(texte, x, y)
  ctx.fillStyle = COULEURS.creme
  ctx.fillText(texte, x, y)
  espacement(ctx, '0px')
}

/** Ombre pleine encre qui suit la forme d'une image détourée, puis l'image. */
export function ombrePleine(ctx, img, x, y, w, h, decalage) {
  const { canvas: o, ctx: c } = nouveauCanvas(Math.ceil(w), Math.ceil(h))
  c.drawImage(img, 0, 0, w, h)
  c.globalCompositeOperation = 'source-in'
  c.fillStyle = COULEURS.encre
  c.fillRect(0, 0, w, h)
  ctx.drawImage(o, x + decalage, y + decalage)
  ctx.drawImage(img, x, y, w, h)
}

export function versBlob(canvas) {
  return new Promise(resolve => {
    try { canvas.toBlob(b => resolve(b), 'image/jpeg', 0.9) } catch { resolve(null) }
  })
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add src/services/diapos/dessin.js
git commit -m "feat: outils de dessin des diapositives (charte papier découpé)"
```

---

### Task 4: Diapositives du carrousel

**Files:**
- Create: `src/services/diapos/carrousel.js`

**Interfaces:**
- Consumes: `planCarrousel` (Task 1, objets `Diapo`), tous les outils de `dessin.js` (Task 3).
- Produces: `dessinerCarrousel(plan: Diapo[]): Promise<HTMLCanvasElement[]>` (1080 × 1350 chacun).

- [ ] **Step 1: Écrire le module**

```js
import {
  COULEURS, chargerImage, chargerPolices, nouveauCanvas, recouvrir, flou, degradeBas, voile,
  rectArrondi, police, couperLignes, etiquette, pastille, texteContoure, ombrePleine,
} from './dessin.js'

/**
 * Diapositives du carrousel de bilan (1080 × 1350), d'après la maquette validée
 * par Victor (« Maquette bilan soirée jeux/bilan.html »).
 */
const L = 1080
const H = 1350
const LOGO = '/logo-feuille.svg'
const FOND_BOIS = '/social/fond-bois.jpg'

async function ouverture(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) recouvrir(ctx, photo, 0, 0, L, H)
  degradeBas(ctx, L, H)
  pastille(ctx, logo, 56, 56)
  // Placement de bas en haut : lieu, étiquette, « c'était », formule
  police(ctx, 800, 132, 'Bricolage Grotesque')
  let taille = 132
  let lignes = couperLignes(ctx, d.etiquette, 860)
  if (lignes.length > 1) { taille = 112; police(ctx, 800, 112, 'Bricolage Grotesque'); lignes = couperLignes(ctx, d.etiquette, 860) }
  const hEtiquette = lignes.length * taille * 0.95 + 26
  const baseLieu = H - 96
  const hautEtiquette = baseLieu - 30 - 58 - hEtiquette
  ctx.fillStyle = 'rgba(253,250,246,0.85)'
  police(ctx, 600, 30)
  ctx.fillText(d.lieu, 70, baseLieu)
  etiquette(ctx, lignes, { x: 70, y: hautEtiquette, taille })
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 118, 'Bricolage Grotesque')
  const baseCetait = hautEtiquette - 30
  ctx.fillText("c'était", 70, baseCetait)
  police(ctx, 700, 52)
  ctx.fillText(d.formule, 70, baseCetait - 118 * 0.92 - 10)
}

async function nombre(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) ctx.drawImage(flou(photo, L, H), 0, 0)
  voile(ctx, L, H, 'rgba(26,95,122,0.62)')
  pastille(ctx, logo, 56, 56)
  ctx.textAlign = 'center'
  police(ctx, 800, 92, 'Bricolage Grotesque')
  const apres = couperLignes(ctx, d.apres, 940)
  const hTotal = 66 + 40 + 480 + 50 + apres.length * 88
  let y = (H - hTotal) / 2 + 60
  ctx.fillStyle = COULEURS.creme
  police(ctx, 700, 66)
  ctx.fillText('Nous étions', L / 2, y)
  y += 40 + 470
  texteContoure(ctx, String(d.nombre), L / 2 - 11, y, { taille: String(d.nombre).length > 2 ? 420 : 560 })
  y += 50 + 80
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 92, 'Bricolage Grotesque')
  apres.forEach((l, i) => ctx.fillText(l, L / 2, y + i * 88))
  ctx.textAlign = 'left'
}

async function transition(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) recouvrir(ctx, photo, 0, 0, L, H)
  // Carte crème penchée
  ctx.save()
  ctx.translate(70, 170)
  ctx.rotate((-1.5 * Math.PI) / 180)
  const w = 870
  const h = 300
  ctx.fillStyle = COULEURS.bleu
  rectArrondi(ctx, 16, 16, w, h, 34); ctx.fill()
  ctx.fillStyle = COULEURS.creme
  rectArrondi(ctx, 0, 0, w, h, 34); ctx.fill()
  ctx.lineWidth = 6; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, 0, 0, w, h, 34); ctx.stroke()
  ctx.fillStyle = COULEURS.bleu
  police(ctx, 700, 50)
  ctx.fillText('Et on a joué à…', 48, 96)
  police(ctx, 800, 124, 'Bricolage Grotesque')
  ctx.fillStyle = COULEURS.encre
  const debut = 'plein de '
  ctx.fillText(debut, 48, 236)
  ctx.fillStyle = COULEURS.orange
  ctx.fillText('jeux !', 48 + ctx.measureText(debut).width, 236)
  ctx.restore()
  pastille(ctx, logo, 56, H - 70 - 78)
  // « Les voici → »
  police(ctx, 800, 32)
  const texte = 'LES VOICI →'
  const lw = ctx.measureText(texte).width + 72
  const x = L - 56 - lw
  const y = H - 70 - 80
  ctx.fillStyle = COULEURS.encre
  rectArrondi(ctx, x + 9, y + 9, lw, 80, 40); ctx.fill()
  ctx.fillStyle = COULEURS.bleu
  rectArrondi(ctx, x, y, lw, 80, 40); ctx.fill()
  ctx.lineWidth = 5; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, x, y, lw, 80, 40); ctx.stroke()
  ctx.fillStyle = COULEURS.creme
  ctx.textBaseline = 'middle'
  ctx.fillText(texte, x + 36, y + 41)
  ctx.textBaseline = 'alphabetic'
}

function blocNom(ctx, d) {
  police(ctx, 800, 104, 'Bricolage Grotesque')
  let taille = 104
  let lignes = couperLignes(ctx, d.nom, 560)
  if (lignes.length > 2) { taille = 84; police(ctx, 800, 84, 'Bricolage Grotesque'); lignes = couperLignes(ctx, d.nom, 560) }
  const hNom = lignes.length * taille * 0.92
  const bas = H - 92
  const baseDispo = bas
  const baseNom = d.dispo ? baseDispo - 36 - 26 : bas
  // Nom
  ctx.fillStyle = COULEURS.creme
  lignes.forEach((l, i) => ctx.fillText(l, 70, baseNom - (lignes.length - 1 - i) * taille * 0.92))
  // « On a joué à »
  police(ctx, 800, 24)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '3.8px'
  const texte = 'ON A JOUÉ À'
  const pw = ctx.measureText(texte).width + 44
  const py = baseNom - hNom - 22 - 50
  ctx.fillStyle = COULEURS.encre
  rectArrondi(ctx, 70 + 6, py + 6, pw, 50, 25); ctx.fill()
  ctx.fillStyle = COULEURS.bleu
  rectArrondi(ctx, 70, py, pw, 50, 25); ctx.fill()
  ctx.lineWidth = 4; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, 70, py, pw, 50, 25); ctx.stroke()
  ctx.fillStyle = COULEURS.creme
  ctx.textBaseline = 'middle'
  ctx.fillText(texte, 92, py + 26)
  ctx.textBaseline = 'alphabetic'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  // « ✓ À emprunter à la ludothèque »
  if (d.dispo) {
    ctx.fillStyle = COULEURS.creme
    ctx.beginPath(); ctx.arc(88, baseDispo - 9, 18, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = COULEURS.bleu; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(79, baseDispo - 9); ctx.lineTo(86, baseDispo - 2); ctx.lineTo(98, baseDispo - 17); ctx.stroke()
    ctx.fillStyle = 'rgba(253,250,246,0.9)'
    police(ctx, 600, 26)
    ctx.fillText('À emprunter à la ludothèque', 118, baseDispo)
  }
}

async function jeu(ctx, d, logo) {
  const jaquette = await chargerImage(d.jaquette)
  if (d.photo) {
    const photo = await chargerImage(d.photo)
    if (photo) recouvrir(ctx, photo, 0, 0, L, H)
    degradeBas(ctx, L, H)
  } else {
    const fond = await chargerImage(d.fond)
    if (fond) ctx.drawImage(flou(fond, L, H), 0, 0)
    voile(ctx, L, H, 'rgba(26,95,122,0.62)')
    // Halo crème derrière la jaquette
    const g = ctx.createRadialGradient(L / 2, H * 0.45, 0, L / 2, H * 0.45, 320)
    g.addColorStop(0, 'rgba(253,250,246,0.55)')
    g.addColorStop(1, 'rgba(253,250,246,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L, H)
    const g2 = ctx.createLinearGradient(0, 0, 0, H)
    g2.addColorStop(0.6, 'rgba(15,23,42,0)')
    g2.addColorStop(1, 'rgba(15,23,42,0.75)')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, L, H)
  }
  pastille(ctx, logo, 56, 56)
  if (jaquette) {
    const echelleMax = d.photo ? 1.35 : 1.6
    const hMax = d.photo ? 400 : 470
    const wMax = d.photo ? 360 : 460
    const r = Math.min(hMax / jaquette.height, wMax / jaquette.width, echelleMax)
    const w = jaquette.width * r
    const h = jaquette.height * r
    ctx.save()
    if (d.photo) {
      ctx.translate(L - 60 - w / 2, H - 80 - h / 2)
      ctx.rotate((5 * Math.PI) / 180)
    } else {
      ctx.translate(L / 2, H * 0.45)
      ctx.rotate((-4 * Math.PI) / 180)
    }
    ombrePleine(ctx, jaquette, -w / 2, -h / 2, w, h, d.photo ? 14 : 18)
    ctx.restore()
  }
  blocNom(ctx, d)
}

async function merci(ctx, d, logo) {
  const bois = await chargerImage(FOND_BOIS)
  if (bois) recouvrir(ctx, bois, 0, 0, L, H)
  else voile(ctx, L, H, COULEURS.bleu)
  pastille(ctx, logo, 56, 56)
  texteContoure(ctx, 'Merci !', 70, 190 + 190, { taille: 210, contour: 6, ombre: 16 })
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 74, 'Bricolage Grotesque')
  couperLignes(ctx, "à toutes et à tous d'être venus jouer avec nous", 940)
    .forEach((l, i) => ctx.fillText(l, 70, 470 + i * 72))
  await carteRendezVous(ctx, d.rdv, { x: 70, bas: H - 150, largeur: L - 140, affiche: 250 })
  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.creme
  police(ctx, 700, 30)
  ctx.fillText('ludothequedecoligny.fr', L / 2, H - 56)
  ctx.textAlign = 'left'
}

/** Carte « Prochain rendez-vous » (crème, ombre orange), affiche à droite. Exportée pour la story. */
export async function carteRendezVous(ctx, rdv, { x, bas, haut, largeur, affiche: lAffiche }) {
  const affiche = rdv?.affiche ? await chargerImage(rdv.affiche) : null
  const hAffiche = affiche ? lAffiche * (affiche.height / affiche.width) : 0
  const lTexte = largeur - 80 - (affiche ? lAffiche + 36 : 0)
  police(ctx, 800, 66, 'Bricolage Grotesque')
  const titre = rdv ? couperLignes(ctx, rdv.titre, lTexte) : ['Toutes nos dates']
  const hTexte = 36 + titre.length * 64 + 24 + 44 + (rdv?.lieu ? 40 : 0)
  const h = Math.max(hTexte, hAffiche * 0.8) + 80
  const y = haut ?? bas - h
  ctx.fillStyle = COULEURS.orange
  rectArrondi(ctx, x + 16, y + 16, largeur, h, 34); ctx.fill()
  ctx.fillStyle = COULEURS.creme
  rectArrondi(ctx, x, y, largeur, h, 34); ctx.fill()
  ctx.lineWidth = 6; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, x, y, largeur, h, 34); ctx.stroke()
  let ty = y + (h - hTexte) / 2 + 24
  ctx.fillStyle = COULEURS.orange
  police(ctx, 800, 24)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4.3px'
  ctx.fillText('PROCHAIN RENDEZ-VOUS', x + 40, ty)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  ty += 12
  ctx.fillStyle = COULEURS.encre
  police(ctx, 800, 66, 'Bricolage Grotesque')
  titre.forEach(l => { ty += 64; ctx.fillText(l, x + 40, ty) })
  ty += 24 + 38
  ctx.fillStyle = COULEURS.bleu
  police(ctx, 700, 38)
  ctx.fillText(rdv ? rdv.quand : 'ludothequedecoligny.fr', x + 40, ty)
  if (rdv?.lieu) {
    ty += 40
    ctx.fillStyle = '#475569'
    police(ctx, 500, 29)
    ctx.fillText(rdv.lieu, x + 40, ty)
  }
  if (affiche) {
    const ax = x + largeur - 40 - lAffiche
    const ay = y + (h - hAffiche) / 2
    ctx.save()
    ctx.translate(ax + lAffiche / 2, ay + hAffiche / 2)
    ctx.rotate((4 * Math.PI) / 180)
    ctx.fillStyle = COULEURS.bleu
    rectArrondi(ctx, -lAffiche / 2 + 10, -hAffiche / 2 + 10, lAffiche, hAffiche, 12); ctx.fill()
    ctx.drawImage(affiche, -lAffiche / 2, -hAffiche / 2, lAffiche, hAffiche)
    ctx.lineWidth = 5; ctx.strokeStyle = COULEURS.encre
    rectArrondi(ctx, -lAffiche / 2, -hAffiche / 2, lAffiche, hAffiche, 12); ctx.stroke()
    ctx.restore()
  }
  return { y, h }
}

const DESSINS = { ouverture, nombre, transition, jeu, merci }

export async function dessinerCarrousel(plan) {
  await chargerPolices()
  const logo = await chargerImage(LOGO)
  const canvases = []
  for (const d of plan) {
    const { canvas, ctx } = nouveauCanvas(L, H)
    ctx.fillStyle = COULEURS.encre
    ctx.fillRect(0, 0, L, H)
    await DESSINS[d.type](ctx, d, logo)
    canvases.push(canvas)
  }
  return canvases
}
```

- [ ] **Step 2: Vérifier visuellement avec la soirée du 2 octobre**

Écrire un script jetable dans le dossier de travail (hors projet), `rendu-carrousel.js` : site lancé (`npx vite --port 5199 --strictPort --no-open`), connexion avec le compte de test, puis dans la page `page.evaluate(async (donnees) => { const r = await import('/src/services/diapos/regles.js'); const c = await import('/src/services/diapos/carrousel.js'); const cv = await c.dessinerCarrousel(r.planCarrousel({ ...donnees, maintenant: new Date('2026-10-05T10:00:00') })); return cv.map(x => x.toDataURL('image/jpeg', 0.85)) }, donnees)`. `donnees` : l'événement 38 (`events`), ses photos (`event_photos`, ordre de création), ses jeux (`event_games_played`) avec pour `image` l'image du catalogue (`games.image_url`, même nom) ou, à défaut, l'image MyLudo — celle-ci ne se dessine pas tant que la Task 6 n'est pas faite : c'est attendu. Enregistrer les 10 images et une planche.
Expected: diapositives conformes à `planche.jpg` de la maquette (mise en page, textes, couleurs) ; aucune erreur dans la console.

- [ ] **Step 3: Lint + commit**

```bash
npm run lint
git add src/services/diapos/carrousel.js
git commit -m "feat: dessin des diapositives du carrousel de bilan"
```

---

### Task 5: Images de la story

**Files:**
- Create: `src/services/diapos/story.js`

**Interfaces:**
- Consumes: `planStory` (Task 1), outils `dessin.js` (Task 3), `carteRendezVous` exporté par `carrousel.js` (Task 4).
- Produces: `dessinerStory(plan: Diapo[]): Promise<HTMLCanvasElement[]>` (1080 × 1920 chacun).

- [ ] **Step 1: Écrire le module**

```js
import {
  COULEURS, chargerImage, chargerPolices, nouveauCanvas, recouvrir, flou, degradeBas, voile,
  police, couperLignes, etiquette, pastille, texteContoure, ombrePleine,
} from './dessin.js'
import { carteRendezVous } from './carrousel.js'

/**
 * Images de la story de bilan (1080 × 1920). Instagram recouvre ~250 px en haut
 * et ~340 px en bas : aucun texte dans ces zones. Maquette : « story.html ».
 */
const L = 1080
const H = 1920
const LOGO = '/logo-feuille.svg'
const FOND_BOIS = '/social/fond-bois.jpg'
const HAUT = 270 // sous la zone d'Instagram

async function ouverture(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) recouvrir(ctx, photo, 0, 0, L, H)
  degradeBas(ctx, L, H, 0.42)
  pastille(ctx, logo, 70, HAUT)
  police(ctx, 800, 140, 'Bricolage Grotesque')
  let taille = 140
  let lignes = couperLignes(ctx, d.etiquette, 860)
  if (lignes.length > 1) { taille = 118; police(ctx, 800, 118, 'Bricolage Grotesque'); lignes = couperLignes(ctx, d.etiquette, 860) }
  const hEtiquette = lignes.length * taille * 0.95 + 26
  const baseLieu = H - 400
  const hautEtiquette = baseLieu - 34 - 60 - hEtiquette
  ctx.fillStyle = 'rgba(253,250,246,0.85)'
  police(ctx, 600, 34)
  ctx.fillText(d.lieu, 70, baseLieu)
  etiquette(ctx, lignes, { x: 70, y: hautEtiquette, taille })
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 130, 'Bricolage Grotesque')
  const baseCetait = hautEtiquette - 32
  ctx.fillText("c'était", 70, baseCetait)
  police(ctx, 700, 58)
  ctx.fillText(d.formule, 70, baseCetait - 130 * 0.92 - 10)
}

async function nombre(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) ctx.drawImage(flou(photo, L, H), 0, 0)
  voile(ctx, L, H, 'rgba(26,95,122,0.62)')
  pastille(ctx, logo, 70, HAUT)
  ctx.textAlign = 'center'
  police(ctx, 800, 100, 'Bricolage Grotesque')
  const apres = couperLignes(ctx, d.apres, 900)
  const hTotal = 74 + 50 + 560 + 60 + apres.length * 96
  let y = 380 + (H - 380 - 380 - hTotal) / 2 + 70
  ctx.fillStyle = COULEURS.creme
  police(ctx, 700, 74)
  ctx.fillText('Nous étions', L / 2, y)
  y += 50 + 550
  texteContoure(ctx, String(d.nombre), L / 2 - 12, y, { taille: String(d.nombre).length > 2 ? 480 : 640, contour: 11, ombre: 24 })
  y += 60 + 90
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 100, 'Bricolage Grotesque')
  apres.forEach((l, i) => ctx.fillText(l, L / 2, y + i * 96))
  ctx.textAlign = 'left'
}

async function grille(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) ctx.drawImage(flou(photo, L, H), 0, 0)
  voile(ctx, L, H, 'rgba(26,95,122,0.62)')
  pastille(ctx, logo, 70, HAUT)
  ctx.fillStyle = COULEURS.creme
  police(ctx, 700, 58)
  ctx.fillText('Et on a joué à…', 70, 470)
  police(ctx, 800, 120, 'Bricolage Grotesque')
  const debut = 'plein de '
  ctx.fillText(debut, 70, 590)
  ctx.fillStyle = COULEURS.orange
  ctx.fillText('jeux !', 70 + ctx.measureText(debut).width, 590)
  const colonnes = 3
  const lCase = (L - 140 - 2 * 34) / colonnes
  const jaquettes = await Promise.all(d.jeux.map(j => chargerImage(j.jaquette)))
  d.jeux.forEach((j, i) => {
    const cx = 70 + (i % colonnes) * (lCase + 34) + lCase / 2
    const yBoite = 700 + Math.floor(i / colonnes) * 440
    const img = jaquettes[i]
    if (img) {
      const r = Math.min(270 / img.height, 250 / img.width, 0.9)
      const w = img.width * r
      const h = img.height * r
      ombrePleine(ctx, img, cx - w / 2, yBoite + 300 - h, w, h, 10)
    }
    ctx.textAlign = 'center'
    ctx.fillStyle = COULEURS.creme
    police(ctx, 800, 38, 'Bricolage Grotesque')
    const lignes = couperLignes(ctx, j.nom, lCase).slice(0, 2)
    lignes.forEach((l, k) => ctx.fillText(l, cx, yBoite + 356 + k * 39))
    if (j.dispo) {
      police(ctx, 600, 22)
      ctx.fillStyle = 'rgba(253,250,246,0.85)'
      ctx.fillText('✓ À emprunter', cx, yBoite + 356 + lignes.length * 39 + 8)
    }
    ctx.textAlign = 'left'
  })
}

async function merci(ctx, d, logo) {
  const bois = await chargerImage(FOND_BOIS)
  if (bois) recouvrir(ctx, bois, 0, 0, L, H)
  else voile(ctx, L, H, COULEURS.bleu)
  pastille(ctx, logo, 70, HAUT)
  texteContoure(ctx, 'Merci !', 70, 380 + 200, { taille: 220, contour: 6, ombre: 16 })
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 72, 'Bricolage Grotesque')
  couperLignes(ctx, "à toutes et à tous d'être venus jouer avec nous", 940)
    .forEach((l, i) => ctx.fillText(l, 70, 690 + i * 72))
  const { y, h } = await carteRendezVous(ctx, d.rdv, { x: 70, haut: 880, largeur: L - 140, affiche: 280 })
  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.creme
  police(ctx, 700, 34)
  ctx.fillText('Toutes nos dates ↓', L / 2, Math.max(y + h + 110, 1400))
  ctx.textAlign = 'left'
}

const DESSINS = { ouverture, nombre, grille, merci }

export async function dessinerStory(plan) {
  await chargerPolices()
  const logo = await chargerImage(LOGO)
  const canvases = []
  for (const d of plan) {
    const { canvas, ctx } = nouveauCanvas(L, H)
    ctx.fillStyle = COULEURS.encre
    ctx.fillRect(0, 0, L, H)
    await DESSINS[d.type](ctx, d, logo)
    canvases.push(canvas)
  }
  return canvases
}

```

- [ ] **Step 2: Vérifier visuellement** (même script que Task 4, avec `planStory` + `dessinerStory`)

Expected: 4 images conformes à `planche-story.jpg` ; rien d'écrit dans les 250 px du haut ni les 340 px du bas (hors photo).

- [ ] **Step 3: Lint + commit**

```bash
npm run lint
git add src/services/diapos/story.js
git commit -m "feat: images de la story de bilan"
```

---

### Task 6: Jaquettes chez nous

**Files:**
- Create: `src/services/diapos/jaquettes.js`
- Modify: `src/pages/admin/Evenements.jsx` — fonction `addGameToBilan` (≈ ligne 1252)

**Interfaces:**
- Consumes: `volunteerHeaders` (`src/services/functionHeaders.js`), `supabase`.
- Produces:
  - `estChezNous(url): boolean`
  - `copierJaquette(url): Promise<string>` — renvoie l'adresse chez nous (ou l'adresse d'origine en cas d'échec)
  - `jaquettesDuBilan(jeux): Promise<Map<id, string>>` — pour chaque jeu joué : image du catalogue si le jeu y est (même nom), sinon copie locale (enregistrée dans `event_games_played.image_url`)

- [ ] **Step 1: Écrire le module**

```js
import { supabase } from '../supabaseClient'
import { volunteerHeaders } from '../functionHeaders'

/**
 * MyLudo n'autorise pas la réutilisation de ses images dans un canvas (pas
 * d'en-tête CORS) : les jaquettes des jeux joués sont copiées dans notre
 * stockage par la fonction bgg-proxy (même mécanisme que l'écran Jeux).
 */
const PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy`

export const estChezNous = url => !!url && url.startsWith(import.meta.env.VITE_SUPABASE_URL)

export async function copierJaquette(url) {
  if (!url || estChezNous(url)) return url
  try {
    const qs = new URLSearchParams({ endpoint: 'upload-image', imageUrl: url }).toString()
    const res = await fetch(`${PROXY}?${qs}`, { headers: await volunteerHeaders(), signal: AbortSignal.timeout(20000) })
    if (!res.ok) return url
    const { url: copie } = await res.json()
    return copie || url
  } catch {
    return url
  }
}

const normaliser = s => (s || '').trim().toLowerCase()

/** Jaquette à dessiner pour chaque jeu joué (catalogue d'abord, sinon copie locale). */
export async function jaquettesDuBilan(jeux) {
  const resultat = new Map()
  const auCatalogue = jeux.filter(j => j.in_catalogue)
  if (auCatalogue.length) {
    const { data } = await supabase.from('games').select('name, image_url')
      .in('name', auCatalogue.map(j => j.name))
    const parNom = new Map((data || []).filter(g => g.image_url).map(g => [normaliser(g.name), g.image_url]))
    auCatalogue.forEach(j => { if (parNom.has(normaliser(j.name))) resultat.set(j.id, parNom.get(normaliser(j.name))) })
  }
  for (const j of jeux) {
    if (resultat.has(j.id)) continue
    if (estChezNous(j.image_url)) { resultat.set(j.id, j.image_url); continue }
    const copie = await copierJaquette(j.image_url)
    if (copie !== j.image_url && estChezNous(copie)) {
      await supabase.from('event_games_played').update({ image_url: copie }).eq('id', j.id)
    }
    resultat.set(j.id, copie)
  }
  return resultat
}
```

- [ ] **Step 2: Copier dès l'ajout d'un jeu joué**

Dans `Evenements.jsx`, ajouter l'import en tête :

```js
import { copierJaquette } from '../../services/diapos/jaquettes'
```

et dans `addGameToBilan`, remplacer :

```js
        image_url: result.image || '',
```

par :

```js
        // Copie chez nous : MyLudo interdit la réutilisation dans les visuels
        image_url: await copierJaquette(result.image || ''),
```

- [ ] **Step 3: Vérifier**

Run: `npm run lint` → 0 erreur. Puis, connecté avec le compte de test dans le navigateur de contrôle, appeler `jaquettesDuBilan` sur les jeux de l'événement 38 (via `page.evaluate` + `import('/src/services/diapos/jaquettes.js')`) en interceptant les `PATCH`/`POST` vers `/rest/v1/event_games_played` (aucune écriture pendant l'essai) ; Expected : Harmonies et Captain Flip → images `game-images` du catalogue ; les 4 autres → adresses `game-images/myludo-…` renvoyées par le proxy.

- [ ] **Step 4: Commit**

```bash
git add src/services/diapos/jaquettes.js src/pages/admin/Evenements.jsx
git commit -m "feat: jaquettes des jeux joués copiées chez nous (visuels de bilan)"
```

---

### Task 7: Composant de publication et intégration à la fenêtre Bilan

**Files:**
- Create: `src/components/admin/bilan/PublicationBilan.jsx`
- Modify: `src/pages/admin/Evenements.jsx` (états du bilan ≈ l.255-261, `openBilanModal`, `closeBilanModal`, `toggleBilanPhoto`, `deleteBilanPhoto`, `uploadBilanPhotos`, `publishBilanToSocial`, section « PUBLIER SUR LES RÉSEAUX » ≈ l.2604-2687, `getEventType`)

**Interfaces:**
- Consumes: `planCarrousel`, `planStory`, `prochainRendezVous`, `choisirJeux`, `typeEvenement` (Task 1) ; `dessinerCarrousel` (Task 4) ; `dessinerStory` (Task 5) ; `jaquettesDuBilan` (Task 6) ; `versBlob` (Task 3) ; `publierSurReseaux`, `uploadSocialBlob` (`src/services/reseauxSociaux.js`).
- Produces: `<PublicationBilan event photos jeux participants texte onTexteChange texteModifie onTexteReset onJeuxChange />`
  - `photos`: lignes `event_photos` (`{ id, url, created_at }`)
  - `jeux`: lignes `event_games_played`
  - `onJeuxChange(jeux)`: renvoie la liste mise à jour (photo associée)

- [ ] **Step 1: Écrire le composant**

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Download, Image as ImageIcon, Loader2, Share2 } from 'lucide-react'
import { supabase } from '../../../services/supabaseClient'
import { planCarrousel, planStory, prochainRendezVous, choisirJeux } from '../../../services/diapos/regles'
import { dessinerCarrousel } from '../../../services/diapos/carrousel'
import { dessinerStory } from '../../../services/diapos/story'
import { jaquettesDuBilan } from '../../../services/diapos/jaquettes'
import { versBlob } from '../../../services/diapos/dessin'
import { publierSurReseaux, uploadSocialBlob } from '../../../services/reseauxSociaux'

/**
 * Publication du bilan d'une soirée ou d'un après-midi : choix des photos,
 * aperçu du carrousel (≤ 10 diapositives 4:5) et de la story (4 images 9:16),
 * publication du carrousel via Make, story à enregistrer sur le téléphone.
 * Conception : docs/superpowers/specs/2026-10-23-bilan-automatique-design.md
 */
const SECTION = 'text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1'

function ChoixPhoto({ photos, valeur, onChoix, avecSans }) {
  return (
    <div className="flex flex-wrap gap-2">
      {avecSans && (
        <button type="button" onClick={() => onChoix(null)}
          className={'flex h-14 w-14 items-center justify-center rounded-xl border-2 text-[8px] font-black uppercase text-slate-400 ' +
            (valeur == null ? 'border-[#1a5f7a] ring-2 ring-[#1a5f7a]/30' : 'border-slate-200')}>
          Sans
        </button>
      )}
      {photos.map(p => (
        <button key={p.id} type="button" onClick={() => onChoix(p.url)} aria-pressed={valeur === p.url}
          className={'h-14 w-14 overflow-hidden rounded-xl border-2 ' +
            (valeur === p.url ? 'border-[#1a5f7a] ring-2 ring-[#1a5f7a]/30' : 'border-transparent opacity-60 hover:opacity-100')}>
          <img src={p.url} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  )
}

export default function PublicationBilan({ event, photos, jeux, participants, texte, onTexteChange, texteModifie, onTexteReset, onJeuxChange }) {
  const album = useMemo(() => [...photos].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [photos])
  const urls = album.map(p => p.url)
  const [photoOuverture, setPhotoOuverture] = useState(event.bilan_photo_ouverture || null)
  const [photoJeux, setPhotoJeux] = useState(event.bilan_photo_jeux || null)
  const [prochain, setProchain] = useState(null)
  const [jaquettes, setJaquettes] = useState(new Map())
  const [apercuCarrousel, setApercuCarrousel] = useState([])
  const [apercuStory, setApercuStory] = useState([])
  const [canvases, setCanvases] = useState({ carrousel: [], story: [] })
  const [calcul, setCalcul] = useState(false)
  const [agrandie, setAgrandie] = useState(null)
  const [etat, setEtat] = useState('') // '' | 'publication' | 'publie' | 'story'
  const [erreur, setErreur] = useState('')
  const numero = useRef(0)

  // Prochain rendez-vous (hors permanences) et jaquettes chez nous
  useEffect(() => {
    let annule = false
    supabase.from('events').select('title, date, location, image_url').gte('date', new Date().toISOString().slice(0, 10))
      .order('date').then(({ data }) => { if (!annule) setProchain(prochainRendezVous(data || [], new Date())) })
    return () => { annule = true }
  }, [])
  const cleJeux = jeux.map(j => `${j.id}:${j.image_url}`).join(',')
  useEffect(() => {
    let annule = false
    jaquettesDuBilan(jeux).then(m => { if (!annule) setJaquettes(m) })
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleJeux])

  const donnees = useMemo(() => ({
    event,
    participants: participants === '' ? null : Number(participants),
    photos: urls,
    photoOuverture,
    photoJeux,
    jeux: jeux.map(j => ({ ...j, image: jaquettes.get(j.id) || j.image_url })),
    prochain,
    maintenant: new Date(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [event, participants, urls.join(','), photoOuverture, photoJeux, jeux, jaquettes, prochain])

  const { ecartes } = choisirJeux(jeux)

  // Aperçu recalculé (avec un court délai) à chaque changement
  useEffect(() => {
    if (!urls.length) { setApercuCarrousel([]); setApercuStory([]); return }
    const n = ++numero.current
    setCalcul(true)
    const minuterie = setTimeout(async () => {
      const [c, s] = await Promise.all([dessinerCarrousel(planCarrousel(donnees)), dessinerStory(planStory(donnees))])
      if (n !== numero.current) return
      setCanvases({ carrousel: c, story: s })
      setApercuCarrousel(c.map(x => x.toDataURL('image/jpeg', 0.6)))
      setApercuStory(s.map(x => x.toDataURL('image/jpeg', 0.6)))
      setCalcul(false)
    }, 400)
    return () => clearTimeout(minuterie)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donnees])

  const choisirOuverture = async url => {
    setPhotoOuverture(url)
    await supabase.from('events').update({ bilan_photo_ouverture: url }).eq('id', event.id)
  }
  const choisirPhotoJeux = async url => {
    setPhotoJeux(url)
    await supabase.from('events').update({ bilan_photo_jeux: url }).eq('id', event.id)
  }
  const choisirPhotoDuJeu = async (jeu, url) => {
    onJeuxChange(jeux.map(j => (j.id === jeu.id ? { ...j, photo_url: url } : j)))
    await supabase.from('event_games_played').update({ photo_url: url }).eq('id', jeu.id)
  }

  const publier = async () => {
    setEtat('publication')
    setErreur('')
    try {
      const horodatage = Date.now()
      const adresses = []
      // Une à la fois : mémoire des téléphones
      for (let i = 0; i < canvases.carrousel.length; i++) {
        const blob = await versBlob(canvases.carrousel[i])
        const url = blob && await uploadSocialBlob(blob, `bilans/${event.id}/carrousel-${horodatage}-${String(i + 1).padStart(2, '0')}.jpg`)
        if (!url) throw new Error('Diapositive non enregistrée')
        adresses.push(url)
      }
      await publierSurReseaux({ message: texte, imageUrls: adresses, extra: { games: jeux.map(j => j.name) } })
      setEtat('publie')
    } catch (e) {
      console.error('Publication du bilan :', e)
      setErreur('La publication a échoué. Réessayez dans un instant.')
      setEtat('')
    }
  }

  const enregistrerStory = async () => {
    setEtat('story')
    try {
      const fichiers = []
      for (let i = 0; i < canvases.story.length; i++) {
        const blob = await versBlob(canvases.story[i])
        if (blob) fichiers.push(new File([blob], `story-${event.id}-${i + 1}.jpg`, { type: 'image/jpeg' }))
      }
      if (navigator.canShare?.({ files: fichiers })) {
        await navigator.share({ files: fichiers, title: 'Story du bilan' })
      } else {
        for (const f of fichiers) {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(f)
          a.download = f.name
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 2000)
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') console.error('Story :', e)
    } finally {
      setEtat(actuel => (actuel === 'story' ? '' : actuel))
    }
  }

  if (!album.length) {
    return <p className="text-[11px] italic text-slate-400 px-1">Ajoutez au moins une photo de l'événement pour fabriquer le carrousel et la story.</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className={SECTION}>Photo d'ouverture</p>
          <ChoixPhoto photos={album} valeur={photoOuverture || urls[0]} onChoix={choisirOuverture} />
        </div>
        <div className="space-y-2">
          <p className={SECTION}>Photo « plein de jeux »</p>
          <ChoixPhoto photos={album} valeur={photoJeux || urls.find(u => u !== (photoOuverture || urls[0])) || urls[0]} onChoix={choisirPhotoJeux} />
        </div>
      </div>

      {jeux.length > 0 && (
        <div className="space-y-3">
          <p className={SECTION}>Une photo pour chaque jeu (ou « sans » : jaquette sur photo floutée)</p>
          {jeux.map(j => (
            <div key={j.id} className="flex flex-wrap items-center gap-3 rounded-[16px] border-2 border-slate-100 p-2.5">
              <div className="flex w-36 shrink-0 items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white">
                  {j.image_url ? <img src={j.image_url} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon size={16} className="text-slate-300" />}
                </div>
                <span className="text-[11px] font-bold leading-tight text-slate-700">{j.name}</span>
              </div>
              <ChoixPhoto photos={album} valeur={j.photo_url} onChoix={url => choisirPhotoDuJeu(j, url)} avecSans />
            </div>
          ))}
          {ecartes.length > 0 && (
            <p className="rounded-[12px] border-2 border-[#f59e0b] bg-[#fffbeb] px-3 py-2 text-[10.5px] font-semibold text-[#b45309]">
              Le carrousel est limité à 6 jeux : {ecartes.map(j => j.name).join(', ')} n'y figure{ecartes.length > 1 ? 'nt' : ''} pas.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className={SECTION}>Aperçu du carrousel {calcul && <Loader2 size={11} className="ml-1 inline animate-spin" />}</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {apercuCarrousel.map((src, i) => (
            <button key={i} type="button" onClick={() => setAgrandie(src)} className="shrink-0">
              <img src={src} alt={`Diapositive ${i + 1}`} className="h-36 rounded-lg border-2 border-[#0f172a]" />
            </button>
          ))}
        </div>
        <p className={SECTION}>Aperçu de la story</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {apercuStory.map((src, i) => (
            <button key={i} type="button" onClick={() => setAgrandie(src)} className="shrink-0">
              <img src={src} alt={`Story ${i + 1}`} className="h-44 rounded-lg border-2 border-[#0f172a]" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className={SECTION}>Texte de la publication</p>
        <textarea rows={7} value={texte} onChange={e => onTexteChange(e.target.value)}
          className="w-full resize-y rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-sm font-medium outline-none focus:bg-white" />
        {texteModifie && (
          <button type="button" onClick={onTexteReset}
            className="ml-1 text-[9px] font-black uppercase tracking-widest text-[#1a5f7a] underline underline-offset-2 hover:text-[#e38154]">
            Remettre le texte proposé
          </button>
        )}
      </div>

      {erreur && <p className="text-center text-[10px] font-bold text-rose-500">{erreur}</p>}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {etat === 'publie' ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[10px] font-black uppercase tracking-widest text-white">
            <CheckCircle2 size={14} /> Publié avec succès !
          </div>
        ) : (
          <button type="button" onClick={publier} disabled={etat === 'publication' || calcul || !texte.trim() || !canvases.carrousel.length}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300">
            {etat === 'publication' ? <><Loader2 size={14} className="animate-spin" /> Publication…</> : <><Share2 size={14} /> Publier le carrousel ({canvases.carrousel.length})</>}
          </button>
        )}
        <button type="button" onClick={enregistrerStory} disabled={etat === 'story' || calcul || !canvases.story.length}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#0f172a] bg-white py-4 text-[10px] font-black uppercase tracking-widest text-[#1a5f7a] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          {etat === 'story' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Enregistrer la story
        </button>
      </div>

      {agrandie && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f172a]/80 p-4" onClick={() => setAgrandie(null)}>
          <img src={agrandie} alt="" className="max-h-[90vh] max-w-full rounded-xl border-2 border-white" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Intégrer dans `Evenements.jsx`**

1. Import : `import PublicationBilan from '../../components/admin/bilan/PublicationBilan'` ; remplacer la fonction locale `getEventType` (et `normalizeTitle`, `DIACRITICS_REGEX`) par `import { typeEvenement as getEventType } from '../../services/diapos/regles'`.
2. Supprimer les états `bilanSelectedPhotoUrls`, `publishingBilanFb`, `bilanFbSuccess`, `bilanFbError` et toutes leurs utilisations (`openBilanModal`, `closeBilanModal`, `toggleBilanPhoto` entière, `deleteBilanPhoto`, `uploadBilanPhotos`, `publishBilanToSocial` entière).
3. Dans `deleteBilanPhoto`, après la suppression, effacer les références à la photo :

```js
      await supabase.from('event_games_played').update({ photo_url: null }).eq('photo_url', photo.url)
      await supabase.from('events').update({ bilan_photo_ouverture: null }).eq('id', bilanModal.event.id).eq('bilan_photo_ouverture', photo.url)
      await supabase.from('events').update({ bilan_photo_jeux: null }).eq('id', bilanModal.event.id).eq('bilan_photo_jeux', photo.url)
      setBilanGames(prev => prev.map(g => (g.photo_url === photo.url ? { ...g, photo_url: null } : g)))
```

4. Remplacer tout le bloc `{/* SECTION PUBLIER SUR LES RÉSEAUX */}` (du `<div className="space-y-3">` jusqu'à sa fermeture avant `</div>` de la zone défilante) par :

```jsx
              {/* SECTION PUBLIER SUR LES RÉSEAUX */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                  <Share2 size={14} /> Publier sur les réseaux
                </h4>
                {getEventType(bilanModal.event.title) === 'permanence' ? (
                  <p className="text-[11px] italic text-slate-400 px-1">Le bilan des permanences arrive bientôt.</p>
                ) : (
                  <PublicationBilan
                    key={bilanModal.event.id}
                    event={bilanModal.event}
                    photos={bilanPhotos}
                    jeux={bilanGames}
                    participants={bilanParticipants}
                    texte={bilanFbText}
                    onTexteChange={t => { setBilanFbText(t); setBilanFbTextEdited(true) }}
                    texteModifie={bilanFbTextEdited}
                    onTexteReset={resetBilanFbText}
                    onJeuxChange={setBilanGames}
                  />
                )}
              </div>
```

5. Retirer les imports devenus inutiles (`MAX_SOCIAL_PHOTOS`, `uploadSquareVersion`, `socialFileNameFrom`, `publierSurReseaux`, `SocialPostPreview` — **seulement** s'ils ne servent plus ailleurs dans le fichier ; vérifier avec `grep`).

- [ ] **Step 3: Lint, tests, construction**

Run: `npm run lint && npm test && npx vite build --outDir /tmp/verif --emptyOutDir`
Expected: 0 erreur de lint, tests verts, construction réussie.

- [ ] **Step 4: Vérification dans le navigateur (compte de test)**

Script jetable (dossier de travail) : se connecter, ouvrir `/admin/evenements`, archives → bilan de « Soirées jeux » du 2 octobre (ou bouton Bilan de l'événement 38), intercepter **toute** écriture (`PATCH`/`POST`/`DELETE` vers `/rest/v1/`, envois vers `/storage/v1/object/event-images/` et `hook.eu1.make.com`) ; photographier la fenêtre sur ordinateur (1280) et téléphone (390), choisir une photo pour un jeu, attendre l'aperçu, cliquer « Publier le carrousel » et vérifier que l'appel Make intercepté contient `photo_count` = nombre de diapositives et des adresses `bilans/38/…`.
Expected: aperçu = 10 diapositives + 4 images de story conformes aux maquettes ; aucune écriture réelle ; pas d'erreur console.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/bilan/PublicationBilan.jsx src/pages/admin/Evenements.jsx
git commit -m "feat: bilan automatique — carrousel et story fabriqués depuis la fenêtre Bilan"
```

---

### Task 8: Documentation et publication

**Files:**
- Modify: `CLAUDE.md` (§4 briques admin, §5 pièges)

- [ ] **Step 1: Documenter**

Ajouter au tableau des briques de l'espace de gestion :

```markdown
| `bilan/PublicationBilan` | fenêtre Bilan : choix des photos (ouverture, « plein de jeux », une par jeu), aperçu et publication du carrousel 4:5, story 9:16 à enregistrer |
```

et après le paragraphe sur `reseauxSociaux.js` :

```markdown
Les visuels de bilan sont dessinés par `src/services/diapos/` : `regles.js` (textes,
jeux retenus, plan — testé par `npm test`), `dessin.js` (outils canvas), `carrousel.js`,
`story.js`, `jaquettes.js` (copie des jaquettes MyLudo chez nous : MyLudo interdit leur
réutilisation dans un canvas). Maquettes validées : `Bureau/PERSO/Ludothèque/Maquette
bilan soirée jeux/`.
```

- [ ] **Step 2: Commit, puis publication après accord de Victor**

```bash
git add CLAUDE.md
git commit -m "doc: briques du bilan automatique"
```

Publication (`git push`) **uniquement après l'accord explicite de Victor** ; vérifier ensuite sur le site en ligne que le module `PublicationBilan` est présent.
