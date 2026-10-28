# Posts à trois modèles — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** L'onglet « Posts » de Communication publie une image 4:5 dessinée selon trois modèles (photo + carte, photo encadrée, message), photo floutée au besoin, en photo seule sur Facebook et Instagram.

**Architecture:** Règles pures `post-regles.js` (testées) → dessin `post.js` avec les primitives existantes de `diapos/` → onglet `PostSimple.jsx` (sorti d'`Evenements.jsx`) qui utilise une fenêtre `EditeurFloutagePhoto.jsx` ; le calcul de floutage est sorti dans `services/floutage.js` et partagé avec la fenêtre Bilan sans changer son comportement. Publication par les fonctions existantes (`uploadSocialBlob`, `publierSurReseaux`), voie Make « une seule photo » inchangée.

**Tech Stack:** React 18 + Vite + Tailwind 3, canvas 2D, Supabase Storage (`event-images`), Make (inchangé), `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-28-posts-modeles-design.md`

## Global Constraints

- Victor n'est pas développeur : textes d'écran en français courant.
- Image : 1080 × 1350, JPEG (`versBlob`), primitives de `src/services/diapos/dessin.js` et `annonce.js` uniquement ; pas de `ctx.filter` (Safari).
- Floutage : l'image utilisée est **toujours** la photo floutée ; un rectangle tracé est flouté même sans clic sur « Appliquer ». Photo réduite à 2400 px au plus. Bloc de floutage : `blocDeFloutage(largeur)` actuel, inchangé.
- La fenêtre Bilan doit garder exactement son comportement.
- Jamais de nom de classe Tailwind assemblé avec une variable ; jamais deux réglages d'espacement contradictoires sur un élément.
- Limites : sur-titre 30, titre A 50, texte A 160, intro 40, titre B 30, fin orange 20, légende 40, titre C 40, phrases C 140.
- Boutons du modèle C : « Enregistrez ce post », « Partagez-le », « Identifiez un ami », « Plus d'infos sur le site » ; 0 à 2.
- `npm test`, `npm run lint` (0 erreur, 5 avertissements connus), `npx vite build --outDir /tmp/verif --emptyOutDir` doivent passer. Ne jamais pousser sans l'accord de Victor.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/services/diapos/post-regles.js` (créé) + `.test.js` | modèles, limites, défauts, `postPret`, `planPost` |
| `src/services/diapos/post.js` (créé) | `dessinerPost(plan, { photo })` → canvas |
| `src/services/floutage.js` (créé) | `BLUR_BLOCK_SIZE`, `blocDeFloutage`, `pixelateRegion` (sortis d'Evenements.jsx) |
| `src/components/admin/EditeurFloutagePhoto.jsx` (créé) | fenêtre de floutage d'une photo → Blob WebP |
| `src/components/admin/PostSimple.jsx` (créé) | l'onglet Posts |
| `src/pages/admin/Evenements.jsx` (modifié) | import du floutage, onglet Posts remplacé par `<PostSimple>` |
| `src/pages/Confidentialite.jsx` (modifié) | ligne « Photos d'événements et des publications » |
| `CLAUDE.md` (modifié) | briques |

---

### Task 1: Règles des posts

**Files:** Create `src/services/diapos/post-regles.js`, Test `src/services/diapos/post-regles.test.js`

**Interfaces — Produces:**
- `MODELES: [{ id, nom, description }]` (ids `photo-carte`, `photo-encadree`, `message`)
- `LIMITES: { surTitre:30, titre:50, texte:160, intro:40, titreBlanc:30, titreOrange:20, legende:40, titreMessage:40, phrases:140 }`
- `BOUTONS: string[]` (4 libellés)
- `champsVides() → Champs` ; `Champs = { modele, surTitre, titre, texte, intro, titreBlanc, titreOrange, legende, titreMessage, phrases, boutons: string[] }`
- `avecPhoto(modele) → boolean`
- `postPret(champs, aPhoto) → string | null` (ce qui manque, en français ; null si prêt)
- `planPost(champs) → Plan` : `{ modele: 'photo-carte', surTitre, titre, texte } | { modele: 'photo-encadree', intro, titreBlanc, titreOrange, legende } | { modele: 'message', titre, phrases, boutons }` — textes sans espaces superflus, coupés aux limites.

- [ ] **Step 1: Tests**

```js
// src/services/diapos/post-regles.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MODELES, LIMITES, BOUTONS, champsVides, avecPhoto, postPret, planPost } from './post-regles.js'

test('modèles, limites et boutons validés', () => {
  assert.deepEqual(MODELES.map(m => m.id), ['photo-carte', 'photo-encadree', 'message'])
  assert.deepEqual(LIMITES, { surTitre: 30, titre: 50, texte: 160, intro: 40, titreBlanc: 30, titreOrange: 20, legende: 40, titreMessage: 40, phrases: 140 })
  assert.deepEqual(BOUTONS, ['Enregistrez ce post', 'Partagez-le', 'Identifiez un ami', "Plus d'infos sur le site"])
  const v = champsVides()
  assert.equal(v.modele, 'photo-carte')
  assert.equal(v.surTitre, 'À la ludothèque')
  assert.deepEqual(v.boutons, ['Enregistrez ce post', 'Partagez-le'])
  assert.notEqual(champsVides().boutons, v.boutons) // copie neuve à chaque appel
})

test('photo demandée pour A et B seulement', () => {
  assert.equal(avecPhoto('photo-carte'), true)
  assert.equal(avecPhoto('photo-encadree'), true)
  assert.equal(avecPhoto('message'), false)
})

test('ce qui manque avant de publier', () => {
  const v = champsVides()
  assert.equal(postPret(v, false), 'Ajoutez une photo.')
  assert.equal(postPret(v, true), 'Écrivez un titre.')
  assert.equal(postPret({ ...v, titre: '  Merci !  ' }, true), null)
  const b = { ...v, modele: 'photo-encadree' }
  assert.equal(postPret(b, true), 'Écrivez un titre.')
  assert.equal(postPret({ ...b, titreOrange: 'pleine !' }, true), null)
  const c = { ...v, modele: 'message' }
  assert.equal(postPret(c, false), 'Écrivez un titre.')
  assert.equal(postPret({ ...c, titreMessage: 'Fermé pour Noël !' }, false), null)
})

test('plan : textes nettoyés, coupés, boutons filtrés', () => {
  const v = champsVides()
  assert.deepEqual(planPost({ ...v, titre: '  Merci   à  tous ! ', texte: 'x'.repeat(200) }), {
    modele: 'photo-carte', surTitre: 'À la ludothèque', titre: 'Merci à tous !', texte: 'x'.repeat(160),
  })
  assert.deepEqual(planPost({ ...v, modele: 'photo-encadree', intro: 'Samedi dernier,', titreBlanc: 'la ludo était', titreOrange: 'pleine !', legende: '32 prêts' }), {
    modele: 'photo-encadree', intro: 'Samedi dernier,', titreBlanc: 'la ludo était', titreOrange: 'pleine !', legende: '32 prêts',
  })
  assert.deepEqual(planPost({ ...v, modele: 'message', titreMessage: 'Fermé', phrases: 'Ligne 1\nLigne 2', boutons: ['Partagez-le', 'Inconnu', 'Partagez-le', 'Identifiez un ami', 'Enregistrez ce post'] }), {
    modele: 'message', titre: 'Fermé', phrases: 'Ligne 1\nLigne 2', boutons: ['Partagez-le', 'Identifiez un ami'],
  })
})
```

- [ ] **Step 2: Lancer, voir échouer** — `npm test 2>&1 | tail -20` → « Cannot find module …/post-regles.js ».

- [ ] **Step 3: Écrire les règles**

```js
// src/services/diapos/post-regles.js
/**
 * Règles de l'onglet « Posts » de Communication : trois modèles d'image 4:5 (maquettes validées
 * par Victor le 28/10/2026, « Maquette bilan soirée jeux/post-simple-maquette »). Fonctions pures,
 * testées par `npm test`. Dessin : post.js.
 * Conception : docs/superpowers/specs/2026-10-28-posts-modeles-design.md
 */

export const MODELES = [
  { id: 'photo-carte', nom: 'Photo + carte', description: 'Raconter un moment' },
  { id: 'photo-encadree', nom: 'Photo encadrée', description: 'Un chiffre, une ambiance' },
  { id: 'message', nom: 'Message', description: 'Une info pratique, sans photo' },
]

export const LIMITES = { surTitre: 30, titre: 50, texte: 160, intro: 40, titreBlanc: 30, titreOrange: 20, legende: 40, titreMessage: 40, phrases: 140 }

export const BOUTONS = ['Enregistrez ce post', 'Partagez-le', 'Identifiez un ami', "Plus d'infos sur le site"]

export const champsVides = () => ({
  modele: 'photo-carte',
  surTitre: 'À la ludothèque', titre: '', texte: '',
  intro: '', titreBlanc: '', titreOrange: '', legende: '',
  titreMessage: '', phrases: '', boutons: ['Enregistrez ce post', 'Partagez-le'],
})

export const avecPhoto = modele => modele === 'photo-carte' || modele === 'photo-encadree'

// Espaces superflus retirés (les retours à la ligne des phrases du message sont gardés), coupé à la limite
const net = (texte, limite) => String(texte || '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n').slice(0, limite)

/** Ce qui manque pour publier (phrase à afficher), ou null. */
export function postPret(champs, aPhoto) {
  if (avecPhoto(champs.modele) && !aPhoto) return 'Ajoutez une photo.'
  const titre = champs.modele === 'photo-carte' ? champs.titre
    : champs.modele === 'photo-encadree' ? `${champs.titreBlanc || ''}${champs.titreOrange || ''}`
      : champs.titreMessage
  return net(titre, 999) ? null : 'Écrivez un titre.'
}

/** Textes prêts à dessiner pour le modèle choisi. */
export function planPost(champs) {
  const L = LIMITES
  if (champs.modele === 'photo-encadree') {
    return { modele: 'photo-encadree', intro: net(champs.intro, L.intro), titreBlanc: net(champs.titreBlanc, L.titreBlanc), titreOrange: net(champs.titreOrange, L.titreOrange), legende: net(champs.legende, L.legende) }
  }
  if (champs.modele === 'message') {
    const boutons = [...new Set((champs.boutons || []).filter(b => BOUTONS.includes(b)))].slice(0, 2)
    return { modele: 'message', titre: net(champs.titreMessage, L.titreMessage), phrases: net(champs.phrases, L.phrases), boutons }
  }
  return { modele: 'photo-carte', surTitre: net(champs.surTitre, L.surTitre), titre: net(champs.titre, L.titre), texte: net(champs.texte, L.texte) }
}
```

- [ ] **Step 4: Lancer, voir passer** — `npm test 2>&1 | tail -5` → tout passe.
- [ ] **Step 5: Commit** — `git add src/services/diapos/post-regles.js src/services/diapos/post-regles.test.js && git commit -m "feat: posts — règles des trois modèles" ` (+ trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`).

---

### Task 2: Dessin des trois modèles

**Files:** Create `src/services/diapos/post.js`

**Interfaces:**
- Consumes: `Plan` (Task 1) ; `dessin.js` : `COULEURS, chargerImage, chargerPolices, nouveauCanvas, recouvrir, dessinerFlou, degradeBas, voile, police, couperLignes, pastille, texteContoure, rectArrondi` ; `annonce.js` : `espacer, largeur, baseLigne, carte, limiterLignes`.
- Produces: `dessinerPost(plan, { photo }) → Promise<HTMLCanvasElement>` (1080 × 1350 ; `photo` = adresse d'image, p. ex. `URL.createObjectURL(blob)`, ou null). L'appelant libère le canvas (`liberer`).

- [ ] **Step 1: Écrire le dessin** (reprend la maquette validée ; mesures en px sur 1080 × 1350)

```js
// src/services/diapos/post.js
import {
  COULEURS, chargerImage, chargerPolices, nouveauCanvas, recouvrir, dessinerFlou, degradeBas, voile,
  police, couperLignes, pastille, texteContoure, rectArrondi,
} from './dessin.js'
import { espacer, largeur, baseLigne, carte, limiterLignes } from './annonce.js'

/**
 * Image d'un post de l'onglet « Posts » (1080 × 1350), d'après les maquettes validées par Victor le
 * 28/10/2026 (« Maquette bilan soirée jeux/post-simple-maquette »). Plan : post-regles.js.
 * A « photo-carte » : photo plein cadre, carte crème en bas. B « photo-encadree » : fond flouté,
 * titre deux tons, photo dans un cadre blanc. C « message » : fond bois, gros titre contouré.
 */
const L = 1080
const H = 1350
const TITRE = 'Bricolage Grotesque'
const SITE = 'ludothequedecoligny.fr'

// Plus grande taille (de max à min, pas de 2) où le texte tient en nbLignes de `large` px ; puis « … »
function ajuster(ctx, texte, { max, min, nbLignes, large, poids = 800, famille = TITRE, serre = true }) {
  let t = max
  let lignes = []
  for (; ; t -= 2) {
    police(ctx, poids, t, famille)
    espacer(ctx, serre ? -0.04 * t : 0)
    lignes = String(texte).split('\n').flatMap(p => couperLignes(ctx, p, large))
    if ((lignes.length <= nbLignes && lignes.every(l => largeur(ctx, l) <= large)) || t - 2 < min) break
  }
  return { lignes: limiterLignes(ctx, lignes, nbLignes, large), taille: t }
}

function adresse(ctx) {
  ctx.textAlign = 'center'
  police(ctx, 700, 30)
  espacer(ctx, 0)
  ctx.fillStyle = COULEURS.creme
  ctx.fillText(SITE, L / 2, H - 60)
  ctx.textAlign = 'left'
}

function photoCarte(ctx, p, logo, photo) {
  if (photo) recouvrir(ctx, photo, 0, 0, L, H)
  else voile(ctx, L, H, COULEURS.bleu)
  degradeBas(ctx, L, H, 0.25)
  pastille(ctx, logo, 56, 56)
  const W = 940
  const M = 52
  const titre = ajuster(ctx, p.titre, { max: 76, min: 52, nbLignes: 2, large: W - 2 * M })
  const corps = p.texte ? ajuster(ctx, p.texte, { max: 34, min: 28, nbLignes: 4, large: W - 2 * M, poids: 500, famille: 'Poppins', serre: false }) : { lignes: [], taille: 34 }
  const hT = titre.taille * 1.03
  const hC = corps.taille * 1.42
  const h = 44 + (p.surTitre ? 54 : 0) + titre.lignes.length * hT + (corps.lignes.length ? 18 + corps.lignes.length * hC : 0) + 44
  ctx.save()
  ctx.translate(L / 2, H - 90 - h / 2)
  ctx.rotate((-1.5 * Math.PI) / 180)
  const x = -W / 2
  let y = -h / 2
  carte(ctx, x, y, W, h, { rayon: 34, bord: 6, decal: 16, ombre: COULEURS.orange })
  y += 44
  if (p.surTitre) {
    police(ctx, 800, 24)
    espacer(ctx, 4)
    ctx.fillStyle = COULEURS.orange
    ctx.fillText(p.surTitre.toUpperCase(), x + M, y + 24)
    y += 54
  }
  police(ctx, 800, titre.taille, TITRE)
  espacer(ctx, -0.04 * titre.taille)
  ctx.fillStyle = COULEURS.encre
  titre.lignes.forEach(l => { ctx.fillText(l, x + M, baseLigne(ctx, y, hT)); y += hT })
  if (corps.lignes.length) {
    y += 18
    police(ctx, 500, corps.taille)
    espacer(ctx, 0)
    ctx.fillStyle = '#334155'
    corps.lignes.forEach(l => { ctx.fillText(l, x + M, baseLigne(ctx, y, hC)); y += hC })
  }
  ctx.restore()
  espacer(ctx, 0)
}

function photoEncadree(ctx, p, logo, photo) {
  if (photo) dessinerFlou(ctx, photo, L, H)
  voile(ctx, L, H, photo ? 'rgba(26,95,122,0.62)' : COULEURS.bleu)
  pastille(ctx, logo, 56, 56)
  ctx.textAlign = 'center'
  let y = 230
  if (p.intro) {
    police(ctx, 600, 46)
    espacer(ctx, 0)
    ctx.fillStyle = COULEURS.creme
    ctx.fillText(p.intro, L / 2, y)
  }
  ctx.textAlign = 'left'
  // Titre deux tons : sur une ligne si possible (100 → 64 px), sinon blanc puis orange sur deux lignes
  const a = p.titreBlanc ? `${p.titreBlanc} ` : ''
  const b = p.titreOrange
  let t = 100
  for (; t > 64; t -= 2) {
    police(ctx, 800, t, TITRE); espacer(ctx, -0.04 * t)
    if (largeur(ctx, a + b) <= 960) break
  }
  police(ctx, 800, t, TITRE); espacer(ctx, -0.04 * t)
  const uneLigne = largeur(ctx, a + b) <= 960
  const ecrire = (texte, couleur, cx, cy) => { ctx.fillStyle = couleur; ctx.fillText(texte, cx, cy) }
  let basTitre
  if (uneLigne) {
    const x0 = L / 2 - largeur(ctx, a + b) / 2
    ecrire(a, COULEURS.creme, x0, 340)
    ecrire(b, COULEURS.orange, x0 + largeur(ctx, a), 340)
    basTitre = 340
  } else {
    ecrire(a.trim(), COULEURS.creme, L / 2 - largeur(ctx, a.trim()) / 2, 320)
    ecrire(b, COULEURS.orange, L / 2 - largeur(ctx, b) / 2, 320 + t)
    basTitre = 320 + t
  }
  espacer(ctx, 0)
  // Photo dans un cadre blanc penché, légende dans le bas du cadre
  const pw = 760
  const ph = Math.min(620, H - 150 - (basTitre + 70) - 90)
  const cy = basTitre + 70 + (ph + 90) / 2
  ctx.save()
  ctx.translate(L / 2, cy)
  ctx.rotate((2 * Math.PI) / 180)
  const fx = -pw / 2
  const fy = -(ph + 90) / 2
  ctx.fillStyle = COULEURS.encre; rectArrondi(ctx, fx + 18, fy + 18, pw, ph + 90, 10); ctx.fill()
  ctx.fillStyle = '#ffffff'; rectArrondi(ctx, fx, fy, pw, ph + 90, 10); ctx.fill()
  ctx.lineWidth = 5; ctx.strokeStyle = COULEURS.encre; ctx.stroke()
  if (photo) {
    ctx.save()
    rectArrondi(ctx, fx + 28, fy + 28, pw - 56, ph - 40, 4); ctx.clip()
    recouvrir(ctx, photo, fx + 28, fy + 28, pw - 56, ph - 40)
    ctx.restore()
  }
  if (p.legende) {
    ctx.textAlign = 'center'
    police(ctx, 700, 34)
    let tl = 34
    while (tl > 24 && largeur(ctx, p.legende) > pw - 60) { tl -= 2; police(ctx, 700, tl) }
    ctx.fillStyle = COULEURS.encre
    ctx.fillText(p.legende, 0, fy + ph + 40)
    ctx.textAlign = 'left'
  }
  ctx.restore()
  adresse(ctx)
}

function message(ctx, p, logo, bois) {
  if (bois) recouvrir(ctx, bois, 0, 0, L, H)
  else voile(ctx, L, H, COULEURS.bleu)
  pastille(ctx, logo, 56, 56)
  const titre = ajuster(ctx, p.titre, { max: 150, min: 90, nbLignes: 2, large: 900 })
  const hT = titre.taille * 1.07
  const phrases = p.phrases ? ajuster(ctx, p.phrases, { max: 44, min: 32, nbLignes: 3, large: 960, poids: 600, famille: 'Poppins', serre: false }) : { lignes: [], taille: 44 }
  const hP = phrases.taille * 1.4
  const hBoutons = p.boutons.length ? 76 + 70 : 0
  const total = titre.lignes.length * hT + (phrases.lignes.length ? 60 + phrases.lignes.length * hP : 0) + hBoutons
  let y = Math.max(220, (H - total) / 2)
  titre.lignes.forEach(l => {
    police(ctx, 800, titre.taille, TITRE); espacer(ctx, -0.04 * titre.taille)
    const w = largeur(ctx, l)
    texteContoure(ctx, l, L / 2 - w / 2, y + titre.taille * 0.85, { taille: titre.taille })
    y += hT
  })
  espacer(ctx, 0)
  ctx.textAlign = 'center'
  if (phrases.lignes.length) {
    y += 60
    police(ctx, 600, phrases.taille)
    ctx.fillStyle = COULEURS.creme
    phrases.lignes.forEach(l => { ctx.fillText(l, L / 2, baseLigne(ctx, y, hP)); y += hP })
  }
  if (p.boutons.length) {
    y += 70
    police(ctx, 700, 30)
    const ws = p.boutons.map(t => largeur(ctx, t) + 64)
    let bx = L / 2 - (ws.reduce((s, w) => s + w, 0) + 30 * (ws.length - 1)) / 2
    p.boutons.forEach((t, i) => {
      ctx.fillStyle = COULEURS.encre; rectArrondi(ctx, bx + 6, y + 6, ws[i], 76, 38); ctx.fill()
      ctx.fillStyle = COULEURS.creme; rectArrondi(ctx, bx, y, ws[i], 76, 38); ctx.fill()
      ctx.lineWidth = 4; ctx.strokeStyle = COULEURS.encre; ctx.stroke()
      ctx.fillStyle = COULEURS.encre; ctx.textBaseline = 'middle'
      ctx.fillText(t, bx + ws[i] / 2, y + 39)
      ctx.textBaseline = 'alphabetic'
      bx += ws[i] + 30
    })
  }
  ctx.textAlign = 'left'
  adresse(ctx)
}

/** Dessine le post ; renvoie le canvas 1080 × 1350 (à libérer par l'appelant). */
export async function dessinerPost(plan, { photo = null } = {}) {
  await chargerPolices()
  const [logo, image, bois] = await Promise.all([
    chargerImage('/social/logo-feuille.png'),
    photo ? chargerImage(photo) : null,
    plan.modele === 'message' ? chargerImage('/social/fond-bois.jpg') : null,
  ])
  const { canvas, ctx } = nouveauCanvas(L, H)
  if (plan.modele === 'photo-encadree') photoEncadree(ctx, plan, logo, image)
  else if (plan.modele === 'message') message(ctx, plan, logo, bois)
  else photoCarte(ctx, plan, logo, image)
  return canvas
}
```

- [ ] **Step 2: Vérifier** — `npm run lint` (0 erreur) et `npx vite build --outDir /tmp/verif --emptyOutDir`. Le rendu est vérifié à l'écran par le contrôleur (page de maquette jetable) avant la tâche suivante.
- [ ] **Step 3: Commit** — `git add src/services/diapos/post.js && git commit -m "feat: posts — dessin des trois modèles"` (+ trailer).

---

### Task 3: Floutage partagé et fenêtre « une photo »

**Files:** Create `src/services/floutage.js`, `src/components/admin/EditeurFloutagePhoto.jsx` ; Modify `src/pages/admin/Evenements.jsx` (supprimer les définitions locales `BLUR_BLOCK_SIZE`, `blocDeFloutage`, `pixelateRegion` vers l. 151-174 et les importer).

**Interfaces — Produces:**
- `floutage.js` : `BLUR_BLOCK_SIZE`, `blocDeFloutage(largeurPhoto)`, `pixelateRegion(ctx, x, y, w, h, bloc)` — **corps copiés à l'identique** (avec leur commentaire), et `COTE_MAX_PHOTO = 2400`.
- `<EditeurFloutagePhoto fichier={File|null} onTermine={(blob) => …} onAnnuler={() => …} />` : fenêtre ouverte quand `fichier` est non nul ; sortie Blob WebP 0.82 floutée.

- [ ] **Step 1: `floutage.js`** — déplacer les trois définitions telles quelles (ne rien changer à leur code) ; ajouter `export const COTE_MAX_PHOTO = 2400` ; dans `Evenements.jsx`, `import { blocDeFloutage, pixelateRegion } from '../../services/floutage'` (et `BLUR_BLOCK_SIZE` seulement s'il est encore utilisé ailleurs dans le fichier — vérifier par recherche) ; remplacer la constante locale `COTE_MAX = 2400` de `loadPhotoIntoEditor` par `COTE_MAX_PHOTO` importée (même valeur). Rien d'autre ne change dans Evenements.jsx.

- [ ] **Step 2: `EditeurFloutagePhoto.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '../site/Modal'
import { blocDeFloutage, pixelateRegion, COTE_MAX_PHOTO } from '../../services/floutage'

/**
 * Fenêtre de floutage d'une seule photo (onglet « Posts »), mêmes règles que la fenêtre Bilan :
 * l'image rendue est TOUJOURS la photo floutée, jamais l'affichage de l'éditeur ; un rectangle
 * tracé est flouté même sans clic sur « Appliquer le flou » (incident du 25-26/10/2026).
 */
export default function EditeurFloutagePhoto({ fichier, onTermine, onAnnuler }) {
  const canvasRef = useRef(null)
  const base = useRef(null)          // pixels floutés validés
  const rects = useRef([])           // rectangles tracés, pas encore floutés
  const depart = useRef(null)
  const [enAttente, setEnAttente] = useState(false)
  const [pret, setPret] = useState(false)
  const [export_, setExport] = useState(false)

  const charger = () => {
    const canvas = canvasRef.current
    if (!canvas || !fichier) return
    setPret(false)
    const img = new Image()
    const url = URL.createObjectURL(fichier)
    img.onload = () => {
      const k = Math.min(1, COTE_MAX_PHOTO / Math.max(img.naturalWidth, img.naturalHeight))
      canvas.width = Math.round(img.naturalWidth * k)
      canvas.height = Math.round(img.naturalHeight * k)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      base.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
      rects.current = []
      setEnAttente(false)
      setPret(true)
      URL.revokeObjectURL(url)
    }
    img.onerror = () => { URL.revokeObjectURL(url); onAnnuler() }
    img.src = url
  }
  // La fenêtre (et son canvas) n'existe qu'une fois ouverte : chargement au tour suivant
  useEffect(() => { if (fichier) requestAnimationFrame(charger) }, [fichier]) // eslint-disable-line react-hooks/exhaustive-deps

  const point = (cx, cy) => {
    const c = canvasRef.current
    const r = c.getBoundingClientRect()
    return { x: (cx - r.left) * (c.width / r.width), y: (cy - r.top) * (c.height / r.height) }
  }
  const redessiner = (vivant) => {
    const c = canvasRef.current
    if (!c || !base.current) return
    const ctx = c.getContext('2d')
    ctx.putImageData(base.current, 0, 0)
    ;[...rects.current, ...(vivant ? [vivant] : [])].forEach(r => {
      ctx.fillStyle = 'rgba(227,129,84,0.35)'; ctx.fillRect(r.x, r.y, r.w, r.h)
      ctx.strokeStyle = '#e38154'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.setLineDash([])
    })
  }
  const rectDe = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) })
  const bas = (cx, cy) => { depart.current = point(cx, cy) }
  const bouge = (cx, cy) => { if (depart.current) redessiner(rectDe(depart.current, point(cx, cy))) }
  const haut = (cx, cy) => {
    if (!depart.current) return
    const r = rectDe(depart.current, point(cx, cy))
    depart.current = null
    if (r.w > 4 && r.h > 4) { rects.current = [...rects.current, r]; setEnAttente(true) }
    redessiner(null)
  }

  const appliquer = () => {
    const c = canvasRef.current
    if (!c || !base.current || rects.current.length === 0) return
    const ctx = c.getContext('2d')
    ctx.putImageData(base.current, 0, 0)
    rects.current.forEach(r => {
      const x = Math.max(0, Math.floor(r.x))
      const y = Math.max(0, Math.floor(r.y))
      const w = Math.min(c.width - x, Math.ceil(r.w))
      const h = Math.min(c.height - y, Math.ceil(r.h))
      if (w > 0 && h > 0) pixelateRegion(ctx, x, y, w, h, blocDeFloutage(c.width))
    })
    base.current = ctx.getImageData(0, 0, c.width, c.height)
    rects.current = []
    setEnAttente(false)
  }

  // Image rendue : toujours les pixels floutés, sans aucun repère dessiné par-dessus
  const terminer = () => {
    const c = canvasRef.current
    if (!c || !base.current) return
    setExport(true)
    if (rects.current.length > 0) appliquer()
    depart.current = null
    c.getContext('2d').putImageData(base.current, 0, 0)
    c.toBlob(blob => { setExport(false); if (blob) onTermine(blob) }, 'image/webp', 0.82)
  }

  const BTN = 'flex-1 rounded-[14px] border-2 border-[#0f172a] py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-colors disabled:opacity-40'
  return (
    <Modal open={!!fichier} onClose={() => { if (!export_) onAnnuler() }} title="Flouter les visages" maxWidth={720} backdrop="ink" panelClassName="p-6 md:p-8">
      <h2 className="mb-1 font-display text-[22px] font-extrabold uppercase tracking-[-0.03em]">Flouter les visages</h2>
      <p className="mb-4 text-[12px] font-medium text-slate-500">Tracez un rectangle sur chaque visage à cacher (enfants notamment). C'est la photo floutée qui sera utilisée.</p>
      <canvas
        ref={canvasRef}
        className="max-h-[60vh] w-full cursor-crosshair touch-none rounded-2xl border-2 border-dashed border-slate-200 object-contain"
        onMouseDown={e => bas(e.clientX, e.clientY)}
        onMouseMove={e => bouge(e.clientX, e.clientY)}
        onMouseUp={e => haut(e.clientX, e.clientY)}
        onMouseLeave={() => { depart.current = null; redessiner(null) }}
        onTouchStart={e => { e.preventDefault(); const t = e.touches[0]; bas(t.clientX, t.clientY) }}
        onTouchMove={e => { e.preventDefault(); const t = e.touches[0]; bouge(t.clientX, t.clientY) }}
        onTouchEnd={e => { e.preventDefault(); const t = e.changedTouches[0]; haut(t.clientX, t.clientY) }}
      />
      <div className="mt-4 flex flex-wrap gap-2.5">
        <button type="button" onClick={appliquer} disabled={!enAttente || export_} className={`${BTN} bg-[#e38154] text-white`}>Appliquer le flou</button>
        <button type="button" onClick={charger} disabled={!pret || export_} className={`${BTN} bg-white text-slate-500`}>Recommencer</button>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2.5">
        <button type="button" onClick={onAnnuler} disabled={export_} className={`${BTN} bg-[#fdfaf6] text-slate-500`}>Annuler</button>
        <button type="button" onClick={terminer} disabled={!pret || export_} className={`${BTN} bg-[#1a5f7a] text-white`}>
          {export_ ? <Loader2 size={13} className="mx-auto animate-spin" /> : (enAttente ? 'Terminer' : 'Pas de visage à flouter')}
        </button>
      </div>
    </Modal>
  )
}
```

Avant d'écrire : lire `src/components/site/Modal.jsx` pour confirmer les props (`open, onClose, title, maxWidth, backdrop, panelClassName`, et si `title` est déjà affiché par Modal — dans ce cas ne pas répéter le `<h2>`). « Pas de visage à flouter » devient « Terminer » dès qu'un rectangle est tracé et reste « Terminer » après « Appliquer » si un flou a été appliqué : utiliser un état `floute` (vrai après un `appliquer` réussi) et afficher « Terminer » si `enAttente || floute`.

- [ ] **Step 3: Vérifier** — `npm test`, `npm run lint`, build. Commit « refactor: floutage partagé + fenêtre de floutage d'une photo » (+ trailer).

---

### Task 4: Onglet « Posts » à trois modèles

**Files:** Create `src/components/admin/PostSimple.jsx` ; Modify `src/pages/admin/Evenements.jsx`, `src/pages/Confidentialite.jsx`, `CLAUDE.md`.

**Interfaces — Consumes:** Task 1 (`MODELES, LIMITES, BOUTONS, champsVides, avecPhoto, postPret, planPost`), Task 2 (`dessinerPost`), Task 3 (`EditeurFloutagePhoto`), `dessin.js` (`versBlob, liberer`), `reseauxSociaux.js` (`uploadSocialBlob, publierSurReseaux`), `SocialPostPreview` (`text, imageUrls, portrait`), `ConfirmModal`, `SuccessModal`, `DataCard`, `MaskIcon`, `supabase`.
**Produces:** `<PostSimple onPublie={() => …} />`.

- [ ] **Step 1: `PostSimple.jsx`** — structure (calquée sur `NouveauxJeux.jsx` et `JeuSemaine.jsx`) :
  - En-tête `DataCard shadow="#10b981"` identique à l'actuel (icône `ludo-post.svg`, titre « Nouveau post », sous-titre « Une image aux couleurs de la ludothèque, publiée sur Facebook & Instagram »).
  - Grille `lg:grid-cols-2` : colonne gauche = choix du modèle (3 boutons-vignettes `MODELES`, actif = contour vert `#10b981` et fond `#ecfdf5`, chacun avec nom + description), photo (si `avecPhoto`) : bouton « Ajouter une photo » (`<input type="file" accept="image/*">`) → `EditeurFloutagePhoto` ; après, miniature + « Changer de photo » ; puis les cases du modèle (input / textarea `phrases` et `texte`), chacune avec `maxLength={LIMITES.x}` et compteur `n/limite` ; pour `message`, deux listes déroulantes « Bouton 1 » / « Bouton 2 » (options `BOUTONS` + « Aucun ») ; puis « Texte de publication » (textarea obligatoire, placeholder « Le texte qui accompagne l'image sur Facebook et Instagram »).
  - Colonne droite : `<SocialPostPreview text={message} imageUrls={apercu ? [apercu] : []} portrait />`, mention « Mise à jour de l'aperçu… » pendant le dessin, phrase de `postPret` en ambre si quelque chose manque, bouton « Publier sur Facebook & Instagram » (désactivé tant que `postPret` ≠ null ou texte de publication vide ou dessin en cours).
  - Photo : stocker le Blob floutée ; `photoUrl = URL.createObjectURL(blob)` (révoquer l'ancienne à chaque changement et au démontage).
  - Aperçu : `useEffect` sur `[champs, photoUrl]`, délai 350 ms, numéro d'aperçu pour abandonner les anciens ; `const c = await dessinerPost(planPost(champs), { photo: avecPhoto(champs.modele) ? photoUrl : null })`, `setApercu(c.toDataURL('image/jpeg', 0.9))`, `liberer(c)`. Pas d'aperçu tant qu'il manque la photo (A/B).
  - Publier : `ConfirmModal` (« Publier ce post ? » / « L'image et son texte vont être publiés sur la page Facebook et le compte Instagram de la ludothèque. ») → redessiner depuis le même plan → `versBlob` → `uploadSocialBlob(blob, \`posts/post-${Date.now()}.jpg\`)` (null → erreur « L'image n'a pas pu être enregistrée. Réessayez. ») → `publierSurReseaux({ message, imageUrls: [url], extra: { modele: champs.modele } })` → `supabase.from('posts').insert({ message, image_url: url, has_image: true })` (erreur seulement journalisée, comme avant) → `onPublie?.()` → `SuccessModal` (« Post envoyé ! » / « Il apparaîtra sur la page Facebook et le compte Instagram d'ici quelques instants. ») → `setChamps(champsVides())`, photo et texte vidés. Erreur → message français dans la case d'erreur (« La publication a échoué. Vérifiez la connexion puis réessayez. »), rien n'est vidé. Bouton désactivé pendant l'envoi (pas de double envoi).
- [ ] **Step 2: `Evenements.jsx`** — supprimer les états `postText, postImageUrl, postUploading, publishingPost, postSuccess`, `apercuPost`, `handlePostFileUpload`, `handlePublishPost`, l'import `useApercusCarres` et `uploadSquareVersion` s'ils ne servent plus (vérifier par recherche) ; remplacer tout le bloc `{activeTab === 'posts' && (…)}` par `{activeTab === 'posts' && <PostSimple onPublie={() => setPostsCount(c => c + 1)} />}` ; importer `PostSimple`. Mettre à jour la description du tutoriel `evt-tabs` si elle parle des posts (« les posts libres » → « les posts aux couleurs de la ludothèque (trois modèles) »). Retirer les imports d'icônes devenus inutilisés si le lint le signale.
- [ ] **Step 3: `Confidentialite.jsx`** — « Photos d'événements » → « Photos d'événements et des publications ».
- [ ] **Step 4: `CLAUDE.md`** — §4 tableau des briques d'administration : ajouter `PostSimple` (onglet Posts, trois modèles A/B/C, règles `diapos/post-regles.js`, dessin `diapos/post.js`, maquettes `post-simple-maquette/`, publication en photo seule) et `EditeurFloutagePhoto` (fenêtre de floutage d'une photo, calcul partagé `services/floutage.js` avec la fenêtre Bilan).
- [ ] **Step 5: Vérifier et commit** — `npm test`, `npm run lint`, build ; commit « feat: onglet Posts — trois modèles aux couleurs de la ludothèque » (+ trailer).

---

### Task 5: Vérification à l'écran et mise en ligne (contrôleur)

- [ ] Photos à 390 et 1280 px (compte de test) : onglet Posts avec chaque modèle rempli (A et B avec une vraie photo passée par la fenêtre de floutage, un rectangle tracé), fenêtre de floutage, confirmation (sans publier). Fenêtre Bilan rouverte : floutage toujours appliqué.
- [ ] Relecture finale de la branche, corrections, puis accord de Victor avant de pousser sur `main`.
