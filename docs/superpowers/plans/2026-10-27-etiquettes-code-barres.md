# Étiquettes code-barres des boîtes — plan de fabrication

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer, depuis le bouton « Étiquettes » de l'écran Jeux, des planches A4 d'étiquettes (code-barres du commerce, feuille, n° sur 4 chiffres, couleur de la catégorie), à la largeur de la tranche de chaque boîte, téléchargeables en PDF vectoriel.

**Architecture:** Des règles pures (`ean13.js`, `regles.js`, testées par `npm test`) calculent largeurs, mises en page et pagination ; `dessin.js` traduit une page en **primitives** (rectangles, cercles, traits, textes, image) en millimètres ; deux rendus lisent ces mêmes primitives : `rendu-svg.js` pour l'aperçu, `pdf.js` (jsPDF, chargé à la demande) pour le PDF — l'aperçu est donc exactement ce qui est imprimé. Données : table `categories_jeux` et trois colonnes de `games`.

**Tech Stack:** React 18 + Vite, Tailwind, Supabase (Postgres, fonction Deno `bgg-proxy`), `node:test`, jsPDF 4.2.1 (nouvelle dépendance), fontTools (conversion ponctuelle des polices, hors projet).

**Spec:** `docs/superpowers/specs/2026-10-27-etiquettes-code-barres-design.md`

## Global Constraints

- Réponses et textes à l'écran en français ; commentaires du code en français, densité comme le reste du projet.
- Couleurs écrites en toutes lettres dans les classes (`bg-[#1a5f7a]`) ; **jamais** de classe Tailwind assemblée avec une variable (passer par `style={{ … }}`).
- Toute nouvelle table : `enable row level security`, règles, `grant` explicites ; rien pour `anon` ici.
- Base de la ludothèque : uniquement la commande `supabase` avec `--linked` (projet `epzfnymfksxnhprcodec`), jamais le connecteur MCP. Toute écriture dans la base : accord de Victor (donné pour ce chantier le 27/10/2026, sauf le remplissage initial qui lui est montré avant écriture — tâche 12).
- Étiquette : hauteur 36 mm ; largeur = épaisseur − 4 mm bornée [22 ; 50] ; seuils de mise en page 48 / 30 / 26 mm ; module EAN 0,21 mm, marges blanches 8 modules ; angles droits ; ombre 0,9 mm intérieure ; n° sur 4 chiffres (étiquette seulement).
- Planche : A4 portrait, marges 10 mm, étiquettes accolées, bande de noms de 5 mm sous chaque rangée, repères de coupe 0,2 mm, réglette 10 cm, tri par numéro.
- Couleurs de la charte : bleu canard `#1a5f7a`, orange `#e38154`, encre `#0f172a`, crème `#fdfaf6`.
- Vérifier : `npm test`, `npm run lint` (0 erreur, 5 avertissements connus), `npx vite build --outDir /tmp/verif --emptyOutDir`. Ne jamais remettre `dist/` dans Git. `src/.DS_Store` : ignorer.
- Commits : auteur `AppJGA` (vérifier `git log -1 --format=%an` avant de pousser — Vercel refuse l'adresse pro) ; messages se terminant par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de `git push` sans demande de Victor.

## Fichiers

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20261027_etiquettes_code_barres.sql` (créé) | table `categories_jeux`, colonnes `games.categorie_id`, `epaisseur_mm`, `etiquette_imprimee_le` |
| `supabase/functions/bgg-proxy/index.ts` (modifié) | `thicknessMm` dans les détails MyLudo |
| `src/services/etiquettes/ean13.js` (+ `.test.js`) | normalisation, clé, motif des barres |
| `src/services/etiquettes/regles.js` (+ `.test.js`) | largeur, mise en page, numéro, raisons, nom raccourci, pagination |
| `src/services/etiquettes/dessin.js` (+ `.test.js`) | primitives d'une étiquette et d'une page |
| `src/services/etiquettes/rendu-svg.js` (+ `.test.js`) | primitives → SVG (aperçu) |
| `src/services/etiquettes/pdf.js` | primitives → PDF (jsPDF, polices, logo) |
| `public/fonts/pdf/BricolageGrotesque-ExtraBold.ttf`, `Poppins-SemiBold.ttf` (créés) | polices intégrées au PDF |
| `public/icons/ludo-etiquettes.svg` (créé) | icône du bouton |
| `src/components/admin/etiquettes/FenetreEtiquettes.jsx` | fenêtre à deux onglets |
| `src/components/admin/etiquettes/OngletCodeBarres.jsx` | liste, aperçu, boutons |
| `src/components/admin/etiquettes/OngletQr.jsx` | générateur QR, déplacé de `Jeux.tsx` sans changement de comportement |
| `src/components/admin/CategoriesJeux.jsx` | fenêtre « Catégories des jeux » des Paramètres |
| `src/components/admin/VueAgrandie.jsx` (modifié) | prop `rendre` pour afficher autre chose qu'une image |
| `src/pages/admin/Jeux.tsx` (modifié) | catégories, épaisseur, réimpression, nouvelle fenêtre |
| `src/pages/admin/Parametres.jsx` (modifié) | carte « Catégories », table dans la sauvegarde |
| `CLAUDE.md` (modifié) | briques et pièges de l'outil |

---

### Task 1: Données — migration et MyLudo

**Files:**
- Create: `supabase/migrations/20261027_etiquettes_code_barres.sql`
- Modify: `supabase/functions/bgg-proxy/index.ts:254-284` (bloc `return` de `getGameDetails`)

**Interfaces:**
- Produces: table `public.categories_jeux (id bigint identity, nom text unique, couleur text '#RRGGBB', ordre int, created_at)` ; colonnes `games.categorie_id bigint null`, `games.epaisseur_mm integer null (1..300)`, `games.etiquette_imprimee_le timestamptz null` ; champ `thicknessMm: number | null` dans la réponse des points `thing` et `search-by-barcode` de `bgg-proxy`.

- [ ] **Step 1: Écrire la migration**

```sql
-- ════════════════════════════════════════════════════════════════════════════
-- Étiquettes code-barres des boîtes (27 octobre 2026)
--
-- Catégories de rangement de la ludothèque (une couleur chacune, modifiables
-- dans les Paramètres) et, pour chaque jeu : sa catégorie, l'épaisseur de sa
-- boîte (largeur de l'étiquette) et la date d'impression de son étiquette
-- (vide = à imprimer). Couleurs de départ : tableau Google « Liste des jeux
-- catégories ». Bénévoles connectés seulement pour la nouvelle table ; droits
-- posés explicitement (règle Supabase du 30/10/2026).
--
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.categories_jeux (
  id bigint generated always as identity primary key,
  nom text not null unique,
  couleur text not null check (couleur ~ '^#[0-9A-Fa-f]{6}$'),
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories_jeux enable row level security;

revoke all on table public.categories_jeux from public, anon, authenticated;
grant select, insert, update, delete on table public.categories_jeux to authenticated;

drop policy if exists "Catégories gérées par les bénévoles" on public.categories_jeux;
create policy "Catégories gérées par les bénévoles" on public.categories_jeux
  for all to authenticated using (true) with check (true);

insert into public.categories_jeux (nom, couleur, ordre) values
  ('Jeu pour enfant', '#D99594', 1),
  ('Jeu d''enquête', '#FABF8F', 2),
  ('Jeu de stratégie / plateau', '#92CDDC', 3),
  ('Jeu à deux', '#C2D69B', 4),
  ('Jeu de carte', '#548DD4', 5),
  ('Jeu d''ambiance', '#FFE76E', 6)
on conflict (nom) do nothing;

alter table public.games
  add column if not exists categorie_id bigint references public.categories_jeux (id) on delete set null,
  add column if not exists epaisseur_mm integer check (epaisseur_mm between 1 and 300),
  add column if not exists etiquette_imprimee_le timestamptz;

commit;
```

- [ ] **Step 2: Appliquer et vérifier**

Run: `supabase db query --linked -f supabase/migrations/20261027_etiquettes_code_barres.sql`
Puis : `supabase db query --linked "select nom, couleur from categories_jeux order by ordre"` → 6 lignes ;
`supabase db query --linked "select column_name from information_schema.columns where table_name='games' and column_name in ('categorie_id','epaisseur_mm','etiquette_imprimee_le')"` → 3 lignes.

- [ ] **Step 3: Ajouter l'épaisseur aux détails MyLudo**

Dans `getGameDetails` (`supabase/functions/bgg-proxy/index.ts`), juste après `const format = …` :

```ts
  // Épaisseur de la boîte (hauteur MyLudo, en cm) : largeur de l'étiquette code-barres
  const thicknessMm = parseFloat(m.height) > 0 ? Math.round(parseFloat(m.height) * 10) : null
```

et dans l'objet renvoyé, après `format,` :

```ts
    thicknessMm,
```

- [ ] **Step 4: Déployer et vérifier**

Run: `supabase functions list --project-ref epzfnymfksxnhprcodec` (noter si `bgg-proxy` a « verify jwt » ; garder le même réglage).
Run: `supabase functions deploy bgg-proxy --project-ref epzfnymfksxnhprcodec` (ajouter `--no-verify-jwt` seulement si la liste l'indiquait).
Expected: « Deployed Functions … bgg-proxy ». La vérification réelle (réponse avec `thicknessMm`) se fait en tâche 9 via la fiche d'un jeu.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261027_etiquettes_code_barres.sql supabase/functions/bgg-proxy/index.ts
git commit -m "feat: étiquettes — catégories de la ludothèque, épaisseur des boîtes (données)"
```

---

### Task 2: EAN-13

**Files:**
- Create: `src/services/etiquettes/ean13.js`
- Test: `src/services/etiquettes/ean13.test.js`

**Interfaces:**
- Produces: `codeEan13(brut: string|null) → string|null` (13 chiffres valides, ou null) ; `motifEan13(code13: string) → string` (95 caractères '0'/'1').

- [ ] **Step 1: Écrire les tests**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { codeEan13, motifEan13 } from './ean13.js'

test('code valide, espaces et tirets retirés', () => {
  assert.equal(codeEan13('3770000282771'), '3770000282771')
  assert.equal(codeEan13(' 3770019647691'), '3770019647691')
  assert.equal(codeEan13('3 770000 282771'), '3770000282771')
})

test('UPC-A à 12 chiffres : complété par un 0', () => {
  // 0688623905027 (Catane) saisi sans le 0 de tête
  assert.equal(codeEan13('688623905027'), '0688623905027')
})

test('clé fausse, longueur fausse ou vide : refusé', () => {
  assert.equal(codeEan13('3770000282772'), null)
  assert.equal(codeEan13('12345678'), null)
  assert.equal(codeEan13(''), null)
  assert.equal(codeEan13(null), null)
})

test('motif : 95 modules, gardes aux bons endroits', () => {
  const m = motifEan13('3770000282771')
  assert.equal(m.length, 95)
  assert.equal(m.slice(0, 3), '101')
  assert.equal(m.slice(45, 50), '01010')
  assert.equal(m.slice(92), '101')
})

test('motif : premier chiffre 3 → parité LGGGLL, premier caractère après la garde', () => {
  // 3 770000 282771 : chiffre 7 en L = 0111011
  assert.equal(motifEan13('3770000282771').slice(3, 10), '0111011')
  // chiffre 7 en G = 0010001 (deuxième position, parité G)
  assert.equal(motifEan13('3770000282771').slice(10, 17), '0010001')
})
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm test 2>&1 | tail -20`
Expected: FAIL (module `./ean13.js` introuvable).

- [ ] **Step 3: Écrire le module**

```js
/**
 * Codes-barres EAN-13 des boîtes (code du commerce, le même que lit le scanner
 * de l'écran Prêts). Testé par `npm test`.
 */

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']
// Parité des 6 premiers chiffres selon le chiffre de tête
const PARITE = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

const cleValide = code => {
  const d = code.split('').map(Number)
  const somme = d.slice(0, 12).reduce((s, c, i) => s + c * (i % 2 ? 3 : 1), 0)
  return (10 - (somme % 10)) % 10 === d[12]
}

/** Code saisi → 13 chiffres valides (UPC-A complété d'un 0), sinon null. */
export function codeEan13(brut) {
  let code = String(brut ?? '').replace(/\D/g, '')
  if (code.length === 12) code = '0' + code
  return code.length === 13 && cleValide(code) ? code : null
}

/** Les 95 modules (1 = barre noire) d'un code de 13 chiffres valide. */
export function motifEan13(code) {
  const d = code.split('').map(Number)
  let s = '101'
  for (let i = 1; i <= 6; i++) s += (PARITE[d[0]][i - 1] === 'L' ? L : G)[d[i]]
  s += '01010'
  for (let i = 7; i <= 12; i++) s += R[d[i]]
  return s + '101'
}
```

- [ ] **Step 4: Lancer, vérifier la réussite**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/services/etiquettes/ean13.js src/services/etiquettes/ean13.test.js
git commit -m "feat: étiquettes — codes EAN-13 (clé, motif des barres)"
```

---

### Task 3: Règles des étiquettes et des planches

**Files:**
- Create: `src/services/etiquettes/regles.js`
- Test: `src/services/etiquettes/regles.test.js`

**Interfaces:**
- Consumes: `codeEan13` (tâche 2).
- Produces :
  - constantes `HAUTEUR = 36`, `BANDE_NOM = 5`, `MARGE = 10`, `PAGE = { l: 210, h: 297 }`, `MODULE = 0.21`, `CALME = 8` ;
  - `largeurEtiquette(epaisseurMm: number) → number` (mm) ;
  - `miseEnPage(largeur: number) → 'large' | 'moyenne' | 'etroite'` ; `estMini(largeur) → boolean` ; `depasse(epaisseurMm) → boolean` (< 26) ;
  - `numeroEtiquette(num: string|number) → string` (« n° 0177 ») ;
  - `raisons(jeu, categoriesParId: Map<number, {couleur}>) → string[]` ;
  - `nomSousEtiquette(nom: string, largeur: number) → { texte: string, taille: number }` ;
  - `preparer(jeux, categoriesParId) → Etiquette[]` où `Etiquette = { id, nom, numero, code, couleur, largeur, epaisseur }`, triées par numéro, seulement les jeux sans raison bloquante ;
  - `repartir(etiquettes: Etiquette[]) → Page[]` où `Page = { rangees: { y: number, items: (Etiquette & { x: number })[] }[] }`.

- [ ] **Step 1: Écrire les tests**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  HAUTEUR, BANDE_NOM, MARGE, PAGE, largeurEtiquette, miseEnPage, estMini, depasse,
  numeroEtiquette, raisons, nomSousEtiquette, preparer, repartir,
} from './regles.js'

const cats = new Map([[1, { couleur: '#548DD4' }]])
const jeu = (o = {}) => ({ id: 1, name: 'Skull King', registration_number: '177', barcode: '3770000282771', categorie_id: 1, epaisseur_mm: 30, ...o })

test('largeur : épaisseur − 4 mm, bornée entre 22 et 50', () => {
  assert.equal(largeurEtiquette(30), 26)
  assert.equal(largeurEtiquette(10), 22)
  assert.equal(largeurEtiquette(74), 50)
})

test('mise en page selon la largeur', () => {
  assert.equal(miseEnPage(50), 'large')
  assert.equal(miseEnPage(48), 'large')
  assert.equal(miseEnPage(47), 'moyenne')
  assert.equal(miseEnPage(30), 'moyenne')
  assert.equal(miseEnPage(29), 'etroite')
  assert.equal(estMini(25), true)
  assert.equal(estMini(26), false)
  assert.equal(depasse(25), true)
  assert.equal(depasse(26), false)
})

test('numéro sur 4 chiffres', () => {
  assert.equal(numeroEtiquette('177'), 'n° 0177')
  assert.equal(numeroEtiquette('031'), 'n° 0031')
  assert.equal(numeroEtiquette(1024), 'n° 1024')
})

test('raisons bloquantes', () => {
  assert.deepEqual(raisons(jeu(), cats), [])
  assert.deepEqual(raisons(jeu({ barcode: '' }), cats), ['pas de code-barres'])
  assert.deepEqual(raisons(jeu({ barcode: '3770000282772' }), cats), ['code-barres invalide'])
  assert.deepEqual(raisons(jeu({ categorie_id: null, epaisseur_mm: null }), cats), ['pas de catégorie', 'épaisseur inconnue'])
  assert.deepEqual(raisons(jeu({ categorie_id: 9 }), cats), ['pas de catégorie'])
})

test('nom sous l’étiquette : réduit puis raccourci', () => {
  assert.deepEqual(nomSousEtiquette('Catane', 50), { texte: 'Catane', taille: 2.5 })
  const moyen = nomSousEtiquette('Fiesta de los Muertos', 26)
  assert.ok(moyen.taille < 2.5 && moyen.taille >= 1.8)
  const long = nomSousEtiquette('Cartaventura - Resistance et autres histoires', 22)
  assert.equal(long.taille, 1.8)
  assert.ok(long.texte.endsWith('…'))
  assert.ok(long.texte.length * 0.52 * 1.8 <= 22 - 1.5)
})

test('préparer : tri numérique, jeux complets seulement', () => {
  const liste = preparer([jeu({ id: 2, registration_number: '1000' }), jeu({ id: 3, registration_number: '031' }), jeu({ id: 4, barcode: '' })], cats)
  assert.deepEqual(liste.map(e => e.id), [3, 2])
  assert.deepEqual(liste[0], { id: 3, nom: 'Skull King', numero: 'n° 0031', code: '3770000282771', couleur: '#548DD4', largeur: 26, epaisseur: 30 })
})

test('répartir : rangées accolées dans la marge, nouvelle page quand c’est plein', () => {
  const e = l => ({ id: l, largeur: 50 })
  const pages = repartir(Array.from({ length: 30 }, (_, i) => e(i)))
  // 190 mm utiles : 3 étiquettes de 50 par rangée ; (297 − 20 − 6) / 41 → 6 rangées
  assert.equal(pages[0].rangees.length, 6)
  assert.equal(pages[0].rangees[0].items.length, 3)
  assert.deepEqual(pages[0].rangees[0].items.map(i => i.x), [MARGE, MARGE + 50, MARGE + 100])
  assert.equal(pages[0].rangees[1].y, MARGE + HAUTEUR + BANDE_NOM)
  assert.equal(pages.length, 2)
  assert.equal(pages[1].rangees[0].items[0].id, 18)
  const derniere = pages[0].rangees.at(-1)
  assert.ok(derniere.y + HAUTEUR + BANDE_NOM <= PAGE.h - MARGE - 6)
})
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm test 2>&1 | tail -5` — Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire le module**

```js
/**
 * Règles des étiquettes code-barres (largeur selon l'épaisseur de la boîte, mise en
 * page, numéro sur 4 chiffres, jeux qui ne peuvent pas encore en avoir) et des
 * planches A4 (rangées accolées, bande des noms, pages). Testé par `npm test`.
 * Mesures en millimètres.
 */
import { codeEan13 } from './ean13.js'

export const HAUTEUR = 36
export const BANDE_NOM = 5
export const MARGE = 10
export const PAGE = { l: 210, h: 297 }
export const MODULE = 0.21
export const CALME = 8
// Place gardée en pied de page (numéro de page, réglette de 10 cm)
const PIED = 6

export const largeurEtiquette = epaisseur => Math.min(50, Math.max(22, Math.round(epaisseur) - 4))
export const miseEnPage = l => (l >= 48 ? 'large' : l >= 30 ? 'moyenne' : 'etroite')
export const estMini = l => l < 26
export const depasse = epaisseur => epaisseur < 26
export const numeroEtiquette = num => 'n° ' + String(num).trim().padStart(4, '0')

export function raisons(jeu, categoriesParId) {
  const r = []
  if (!String(jeu.barcode ?? '').trim()) r.push('pas de code-barres')
  else if (!codeEan13(jeu.barcode)) r.push('code-barres invalide')
  if (!categoriesParId.has(jeu.categorie_id)) r.push('pas de catégorie')
  if (!(jeu.epaisseur_mm > 0)) r.push('épaisseur inconnue')
  return r
}

// Largeur moyenne d'un caractère (Poppins) : 0,52 × la taille
const LARGEUR_CAR = 0.52
export function nomSousEtiquette(nom, largeur) {
  const place = largeur - 1.5
  const taille = Math.max(1.8, Math.min(2.5, place / (nom.length * LARGEUR_CAR)))
  let texte = nom
  while (texte.length * LARGEUR_CAR * taille > place && texte.length > 2) texte = texte.slice(0, -2).trimEnd() + '…'
  return { texte, taille: Math.round(taille * 100) / 100 }
}

const numeroTri = j => parseInt(String(j.registration_number).replace(/\D/g, ''), 10) || 0

export function preparer(jeux, categoriesParId) {
  return jeux
    .filter(j => raisons(j, categoriesParId).length === 0)
    .sort((a, b) => numeroTri(a) - numeroTri(b))
    .map(j => ({
      id: j.id,
      nom: j.name,
      numero: numeroEtiquette(j.registration_number),
      code: codeEan13(j.barcode),
      couleur: categoriesParId.get(j.categorie_id).couleur,
      largeur: largeurEtiquette(j.epaisseur_mm),
      epaisseur: j.epaisseur_mm,
    }))
}

export function repartir(etiquettes) {
  const pas = HAUTEUR + BANDE_NOM
  const basUtile = PAGE.h - MARGE - PIED
  const pages = []
  let page = null, rangee = null, x = 0
  for (const e of etiquettes) {
    if (!rangee || x + e.largeur > PAGE.l - MARGE) {
      const y = rangee ? rangee.y + pas : MARGE
      if (!page || y + pas > basUtile) {
        page = { rangees: [] }
        pages.push(page)
        rangee = { y: MARGE, items: [] }
      } else rangee = { y, items: [] }
      page.rangees.push(rangee)
      x = MARGE
    }
    rangee.items.push({ ...e, x })
    x += e.largeur
  }
  return pages
}
```

- [ ] **Step 4: Lancer, vérifier la réussite** — Run: `npm test 2>&1 | grep -E "^# (pass|fail)"` — Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/services/etiquettes/regles.js src/services/etiquettes/regles.test.js
git commit -m "feat: étiquettes — règles (largeur, mise en page, numéro, pages)"
```

---

### Task 4: Dessin en primitives

**Files:**
- Create: `src/services/etiquettes/dessin.js`
- Test: `src/services/etiquettes/dessin.test.js`

**Interfaces:**
- Consumes: `motifEan13` (tâche 2) ; `HAUTEUR, BANDE_NOM, MARGE, PAGE, MODULE, CALME, miseEnPage, estMini, nomSousEtiquette` (tâche 3) ; `Page`, `Etiquette` (tâche 3).
- Produces: `dessinerEtiquette(e: Etiquette, x = 0, y = 0) → Primitive[]` ; `dessinerPage(page: Page, numero: number, total: number) → Primitive[]`, avec

```
Primitive =
  | { t: 'rect', x, y, l, h, fond?: string, trait?: string, ep?: number, rayon?: number }
  | { t: 'ligne', x1, y1, x2, y2, trait: string, ep: number }
  | { t: 'cercle', cx, cy, r, fond?: string, trait?: string, ep?: number }
  | { t: 'texte', x, y, morceaux: { texte: string, couleur: string }[], taille: number,
      police: 'titre' | 'texte' | 'chiffres', ancre: 'start' | 'middle' | 'end', rotation?: 0 | 90 | -90 }
  | { t: 'image', x, y, l, h, src: 'feuille' }
```
(mm ; `y` d'un texte = ligne de base ; `rotation` en degrés, sens des aiguilles d'une montre, autour de (x, y), comme `rotate()` en SVG.)

- [ ] **Step 1: Écrire les tests**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dessinerEtiquette, dessinerPage } from './dessin.js'
import { repartir, HAUTEUR } from './regles.js'

const etiquette = (largeur, o = {}) => ({ id: 1, nom: 'Catane', numero: 'n° 0126', code: '0688623905027', couleur: '#92CDDC', largeur, epaisseur: largeur + 4, ...o })
const textes = p => p.filter(x => x.t === 'texte').map(x => x.morceaux.map(m => m.texte).join(''))
const dansLeCadre = (p, l, h) => p.filter(x => x.t === 'rect').every(r => r.x >= -0.01 && r.y >= -0.01 && r.x + r.l <= l + 0.01 && r.y + r.h <= h + 0.01)

test('large : nom en deux lignes dans le bandeau, numéro, 30 barres, tout dans le cadre', () => {
  const p = dessinerEtiquette(etiquette(50))
  assert.ok(textes(p).includes('Ludothèque'))
  assert.ok(textes(p).includes('de Coligny'))
  assert.ok(textes(p).includes('n° 0126'))
  // 0688623905027 : 30 barres noires (gardes comprises)
  assert.equal(p.filter(x => x.t === 'rect' && x.fond === '#0f172a' && x.h === 10).length, 30)
  assert.ok(dansLeCadre(p, 50, HAUTEUR))
  assert.ok(p.some(x => x.t === 'rect' && x.fond === '#92CDDC'))
  assert.equal(p.filter(x => x.t === 'image').length, 1)
})

test('moyenne : nom sur une ligne, en deux couleurs, sous le code-barres', () => {
  const p = dessinerEtiquette(etiquette(36))
  const nom = p.find(x => x.t === 'texte' && x.morceaux.length === 2)
  assert.deepEqual(nom.morceaux.map(m => m.texte), ['Ludothèque ', 'de Coligny'])
  assert.ok(dansLeCadre(p, 36, HAUTEUR))
})

test('étroite : barres couchées (plus larges que hautes), chiffres et nom tournés', () => {
  const p = dessinerEtiquette(etiquette(26))
  const barres = p.filter(x => x.t === 'rect' && x.fond === '#0f172a' && x.l > x.h && x.h < 1)
  assert.equal(barres.length, 30)
  assert.ok(p.filter(x => x.t === 'texte' && x.rotation).length >= 3)
  assert.ok(dansLeCadre(p, 26, HAUTEUR))
})

test('mini (22 mm) : tout tient dans le cadre', () => {
  assert.ok(dansLeCadre(dessinerEtiquette(etiquette(22)), 22, HAUTEUR))
})

test('page : étiquettes placées, noms dessous, repères, pied et réglette', () => {
  const pages = repartir([etiquette(50), etiquette(26, { id: 2, nom: 'Skull King' })])
  const p = dessinerPage(pages[0], 1, 3)
  assert.ok(textes(p).includes('Catane'))
  assert.ok(textes(p).includes('Skull King'))
  assert.ok(textes(p).some(t => t.includes('page 1 / 3')))
  assert.ok(textes(p).includes('doit mesurer 10 cm'))
  const reglette = p.find(x => x.t === 'ligne' && Math.abs(x.x2 - x.x1 - 100) < 0.001)
  assert.ok(reglette)
  assert.ok(p.filter(x => x.t === 'ligne' && x.ep === 0.2).length >= 7)
})
```

- [ ] **Step 2: Lancer, vérifier l'échec** — Run: `npm test 2>&1 | tail -5` — Expected: FAIL.

- [ ] **Step 3: Écrire le module**

```js
/**
 * Dessin d'une étiquette code-barres et d'une planche A4, sous forme de primitives
 * (mm) lues à l'identique par l'aperçu (rendu-svg.js) et par le PDF (pdf.js) :
 * l'aperçu est l'image exacte de ce qui est imprimé. Maquette validée par Victor
 * le 27/10/2026 (style « bandeau de couleur », papier découpé du site).
 */
import { motifEan13 } from './ean13.js'
import { HAUTEUR, BANDE_NOM, MARGE, PAGE, MODULE, CALME, miseEnPage, estMini, nomSousEtiquette } from './regles.js'

const ENCRE = '#0f172a', CANARD = '#1a5f7a', ORANGE = '#e38154', CREME = '#fdfaf6', BLANC = '#ffffff'
const OMBRE = 0.9, TRAIT = 0.45

const texte = (x, y, morceaux, taille, police, ancre = 'start', rotation = 0) =>
  ({ t: 'texte', x, y, morceaux: typeof morceaux === 'string' ? [{ texte: morceaux, couleur: ENCRE }] : morceaux, taille, police, ancre, rotation })

// Code-barres : barres + chiffres, à plat (origine en haut à gauche, marges blanches comprises)
function codeBarres(code, x, y, barres) {
  const q = CALME * MODULE, p = []
  motifEan13(code).split('').forEach((b, i) => {
    if (b === '1') p.push({ t: 'rect', x: x + q + i * MODULE, y, l: MODULE, h: barres, fond: ENCRE })
  })
  const yc = y + barres + 2.2
  p.push(texte(x + q * 0.45, yc, code[0], 2.2, 'chiffres', 'middle'))
  p.push(texte(x + q + 24 * MODULE, yc, code.slice(1, 7), 2.2, 'chiffres', 'middle'))
  p.push(texte(x + q + 71 * MODULE, yc, code.slice(7), 2.2, 'chiffres', 'middle'))
  return p
}
const longueurCode = () => 2 * CALME * MODULE + 95 * MODULE
const hauteurCode = barres => barres + 2.5

// Même code-barres tourné d'un quart de tour (sens horaire) : il se lit de haut en bas
function codeBarresTourne(code, x, y, barres) {
  const q = CALME * MODULE, p = [], h = hauteurCode(barres)
  // à plat, un point (u, v) devient (x + h − v, y + u) une fois tourné
  motifEan13(code).split('').forEach((b, i) => {
    if (b === '1') p.push({ t: 'rect', x: x + h - barres, y: y + q + i * MODULE, l: barres, h: MODULE, fond: ENCRE })
  })
  const xc = x + h - barres - 2.2
  const chiffres = (u, s) => texte(xc, y + u, s, 2.2, 'chiffres', 'middle', 90)
  p.push(chiffres(q * 0.45, code[0]), chiffres(q + 24 * MODULE, code.slice(1, 7)), chiffres(q + 71 * MODULE, code.slice(7)))
  return p
}

const fenetre = (x, y, l, h) => ({ t: 'rect', x, y, l, h, fond: BLANC, trait: ENCRE, ep: 0.3, rayon: 1.1 })

export function dessinerEtiquette(e, ox = 0, oy = 0) {
  const W = e.largeur, H = HAUTEUR, cw = W - OMBRE, ch = H - OMBRE
  const forme = miseEnPage(W), mini = estMini(W)
  const hh = forme === 'etroite' ? 9 : 11
  const p = [
    { t: 'rect', x: 0, y: 0, l: W, h: H, fond: BLANC },
    // ombre pleine décalée, à l'intérieur du rectangle de coupe
    { t: 'rect', x: OMBRE, y: OMBRE, l: W - OMBRE, h: H - OMBRE, fond: ENCRE },
    { t: 'rect', x: 0, y: 0, l: cw, h: ch, fond: CREME },
    { t: 'rect', x: 0, y: 0, l: cw, h: hh, fond: e.couleur },
    { t: 'ligne', x1: 0, y1: hh, x2: cw, y2: hh, trait: ENCRE, ep: 0.35 },
    { t: 'rect', x: TRAIT / 2, y: TRAIT / 2, l: cw - TRAIT / 2, h: ch - TRAIT / 2, trait: ENCRE, ep: TRAIT },
    // contour de coupe
    { t: 'rect', x: 0.1, y: 0.1, l: W - 0.2, h: H - 0.2, trait: ENCRE, ep: 0.2 },
  ]
  // médaillon de la feuille
  const r = mini ? 2.8 : forme === 'etroite' ? 3.3 : 4.1, cy = hh / 2 + 0.2, cx = 1.7 + r
  p.push({ t: 'cercle', cx: cx + 0.5, cy: cy + 0.5, r, fond: ENCRE })
  p.push({ t: 'cercle', cx, cy, r, fond: BLANC, trait: ENCRE, ep: 0.35 })
  p.push({ t: 'image', x: cx - r * 0.775, y: cy - r * 0.775, l: r * 1.55, h: r * 1.55, src: 'feuille' })
  // pastille du numéro
  const tn = mini ? 2.3 : forme === 'etroite' ? 2.6 : 3
  const pl = e.numero.length * 0.56 * tn + 0.9 * tn, ph = 1.55 * tn, px = cw - 1.1 - pl
  p.push({ t: 'rect', x: px + 0.45, y: cy - ph / 2 + 0.45, l: pl, h: ph, fond: ENCRE, rayon: ph / 2 })
  p.push({ t: 'rect', x: px, y: cy - ph / 2, l: pl, h: ph, fond: ORANGE, trait: ENCRE, ep: 0.3, rayon: ph / 2 })
  p.push(texte(px + pl / 2, cy + tn * 0.35, e.numero, tn, 'titre', 'middle'))

  if (forme === 'large') {
    p.push(texte(cx + r + 2, cy - 0.5, 'Ludothèque', 2.9, 'titre'))
    p.push(texte(cx + r + 2, cy + 2.9, [{ texte: 'de Coligny', couleur: CANARD }], 2.9, 'titre'))
    const fx = 1.7, fy = hh + 1.1, fl = cw - 2.9, fh = ch - hh - 2.1, barres = Math.min(10, fh - 4.2)
    p.push(fenetre(fx, fy, fl, fh))
    p.push(...codeBarres(e.code, fx + (fl - longueurCode()) / 2, fy + (fh - hauteurCode(barres)) / 2, barres))
  } else if (forme === 'moyenne') {
    const fx = 1.7, fy = hh + 1.1, fl = cw - 2.9, fh = ch - hh - 6.4, barres = Math.min(10, fh - 4)
    p.push(fenetre(fx, fy, fl, fh))
    p.push(...codeBarres(e.code, fx + (fl - longueurCode()) / 2, fy + (fh - hauteurCode(barres)) / 2, barres))
    p.push(texte(cw / 2, ch - 1.5, [{ texte: 'Ludothèque ', couleur: ENCRE }, { texte: 'de Coligny', couleur: CANARD }], 2.5, 'titre', 'middle'))
  } else {
    const barres = mini ? 8 : 9, fx = 1.4, fy = hh + 0.9, fh = ch - hh - 1.9, fl = hauteurCode(barres) + 2
    p.push(fenetre(fx, fy, fl, fh))
    p.push(...codeBarresTourne(e.code, fx + 1, fy + (fh - longueurCode()) / 2, barres))
    // nom en vertical (se lit de bas en haut), dans la colonne restante
    const tx = fx + fl + (cw - fx - fl) / 2 - 0.8, my = fy + fh / 2, tt = mini ? 2.1 : 2.5
    p.push(texte(tx, my, 'Ludothèque', tt, 'titre', 'middle', -90))
    p.push(texte(tx + (mini ? 2.7 : 3.2), my, [{ texte: 'de Coligny', couleur: CANARD }], tt, 'titre', 'middle', -90))
  }
  return p.map(x => decaler(x, ox, oy))
}

function decaler(x, dx, dy) {
  if (x.t === 'ligne') return { ...x, x1: x.x1 + dx, y1: x.y1 + dy, x2: x.x2 + dx, y2: x.y2 + dy }
  if (x.t === 'cercle') return { ...x, cx: x.cx + dx, cy: x.cy + dy }
  return { ...x, x: x.x + dx, y: x.y + dy }
}

const REP = 3.5
export function dessinerPage(page, numero, total) {
  const p = [], reperes = []
  const repere = (x1, y1, x2, y2) => reperes.push({ t: 'ligne', x1, y1, x2, y2, trait: ENCRE, ep: 0.2 })
  page.rangees.forEach((rangee, iRangee) => {
    const y = rangee.y, fin = rangee.items.at(-1).x + rangee.items.at(-1).largeur
    // repères horizontaux dans les marges, en haut et en bas de la rangée
    for (const yy of [y, y + HAUTEUR]) { repere(MARGE - 1 - REP, yy, MARGE - 1, yy); repere(fin + 1, yy, fin + 1 + REP, yy) }
    // repères verticaux à chaque bord d'étiquette, sous la rangée (et au-dessus de la première)
    for (const xx of [...rangee.items.map(e => e.x), fin]) {
      if (iRangee === 0) repere(xx, y - 0.8, xx, y - 0.8 - REP)
      repere(xx, y + HAUTEUR + 0.5, xx, y + HAUTEUR + 1.7)
    }
    for (const e of rangee.items) {
      p.push(...dessinerEtiquette(e, e.x, y))
      const n = nomSousEtiquette(e.nom, e.largeur)
      p.push({ ...texte(e.x + e.largeur / 2, y + HAUTEUR + BANDE_NOM - 1.2, [{ texte: n.texte, couleur: '#334155' }], n.taille, 'texte', 'middle') })
    }
  })
  // pied : numéro de page et réglette de 10 cm (vérifie que l'impression n'a pas été réduite)
  const yp = PAGE.h - MARGE + 2
  p.push(texte(MARGE, yp, [{ texte: `Ludothèque de Coligny — étiquettes code-barres — page ${numero} / ${total}`, couleur: '#64748b' }], 2.4, 'texte'))
  const xr = PAGE.l - MARGE - 100
  p.push({ t: 'ligne', x1: xr, y1: yp - 3, x2: xr + 100, y2: yp - 3, trait: ENCRE, ep: 0.25 })
  for (const xx of [xr, xr + 100]) p.push({ t: 'ligne', x1: xx, y1: yp - 4.2, x2: xx, y2: yp - 1.8, trait: ENCRE, ep: 0.25 })
  p.push(texte(xr + 50, yp, [{ texte: 'doit mesurer 10 cm', couleur: '#64748b' }], 2.4, 'texte', 'middle'))
  return [{ t: 'rect', x: 0, y: 0, l: PAGE.l, h: PAGE.h, fond: BLANC }, ...reperes, ...p]
}
```

- [ ] **Step 4: Lancer, vérifier la réussite** — Run: `npm test 2>&1 | grep -E "^# (pass|fail)"` — Expected: `# fail 0`. Si « dans le cadre » échoue pour 22 mm : réduire `tt`/`r` de la variante `mini` jusqu'à réussite, sans toucher aux autres variantes.

- [ ] **Step 5: Commit**

```bash
git add src/services/etiquettes/dessin.js src/services/etiquettes/dessin.test.js
git commit -m "feat: étiquettes — dessin d'une étiquette et d'une planche"
```

---

### Task 5: Rendu SVG (aperçu)

**Files:**
- Create: `src/services/etiquettes/rendu-svg.js`
- Test: `src/services/etiquettes/rendu-svg.test.js`

**Interfaces:**
- Consumes: `Primitive[]` (tâche 4).
- Produces: `versSvg(primitives: Primitive[], largeur: number, hauteur: number) → string` (élément `<svg>` complet, `viewBox` en mm, sans taille : la taille vient du CSS).

- [ ] **Step 1: Écrire les tests**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { versSvg } from './rendu-svg.js'

test('rectangle, texte en deux couleurs, rotation, image, échappement', () => {
  const s = versSvg([
    { t: 'rect', x: 0, y: 0, l: 10, h: 5, fond: '#fff', trait: '#000', ep: 0.3, rayon: 1 },
    { t: 'texte', x: 5, y: 4, morceaux: [{ texte: 'A & B', couleur: '#000' }, { texte: '<C>', couleur: '#1a5f7a' }], taille: 2, police: 'titre', ancre: 'middle', rotation: -90 },
    { t: 'image', x: 1, y: 1, l: 3, h: 3, src: 'feuille' },
  ], 210, 297)
  assert.ok(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297"'))
  assert.ok(s.includes('rx="1"'))
  assert.ok(s.includes('A &amp; B'))
  assert.ok(s.includes('&lt;C&gt;'))
  assert.ok(s.includes('transform="rotate(-90 5 4)"'))
  assert.ok(s.includes('href="/logo-feuille.svg"'))
  assert.ok(s.includes('text-anchor="middle"'))
})
```

- [ ] **Step 2: Lancer, vérifier l'échec** — Expected: FAIL.

- [ ] **Step 3: Écrire le module**

```js
/**
 * Primitives d'étiquettes (dessin.js) → SVG, pour l'aperçu à l'écran.
 * Mêmes primitives que le PDF : l'aperçu est l'image exacte de ce qui est imprimé.
 */
const POLICES = {
  titre: `font-family="'Bricolage Grotesque', system-ui, sans-serif" font-weight="800"`,
  texte: `font-family="Poppins, system-ui, sans-serif" font-weight="600"`,
  chiffres: `font-family="'Courier New', Courier, monospace" font-weight="400"`,
}
const IMAGES = { feuille: '/logo-feuille.svg' }
const n = v => Math.round(v * 1000) / 1000
const echapper = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function element(p) {
  if (p.t === 'rect') {
    return `<rect x="${n(p.x)}" y="${n(p.y)}" width="${n(p.l)}" height="${n(p.h)}"${p.rayon ? ` rx="${n(p.rayon)}"` : ''}`
      + ` fill="${p.fond || 'none'}"${p.trait ? ` stroke="${p.trait}" stroke-width="${p.ep}"` : ''}/>`
  }
  if (p.t === 'ligne') return `<line x1="${n(p.x1)}" y1="${n(p.y1)}" x2="${n(p.x2)}" y2="${n(p.y2)}" stroke="${p.trait}" stroke-width="${p.ep}"/>`
  if (p.t === 'cercle') return `<circle cx="${n(p.cx)}" cy="${n(p.cy)}" r="${n(p.r)}" fill="${p.fond || 'none'}"${p.trait ? ` stroke="${p.trait}" stroke-width="${p.ep}"` : ''}/>`
  if (p.t === 'image') return `<image href="${IMAGES[p.src]}" x="${n(p.x)}" y="${n(p.y)}" width="${n(p.l)}" height="${n(p.h)}"/>`
  const rot = p.rotation ? ` transform="rotate(${p.rotation} ${n(p.x)} ${n(p.y)})"` : ''
  const morceaux = p.morceaux.map(m => `<tspan fill="${m.couleur}">${echapper(m.texte)}</tspan>`).join('')
  return `<text x="${n(p.x)}" y="${n(p.y)}" font-size="${n(p.taille)}" text-anchor="${p.ancre}" ${POLICES[p.police]} xml:space="preserve"${rot}>${morceaux}</text>`
}

export function versSvg(primitives, largeur, hauteur) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} ${hauteur}">${primitives.map(element).join('')}</svg>`
}
```

- [ ] **Step 4: Lancer, vérifier la réussite** — Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/services/etiquettes/rendu-svg.js src/services/etiquettes/rendu-svg.test.js
git commit -m "feat: étiquettes — rendu SVG de l'aperçu"
```

---

### Task 6: PDF vectoriel (jsPDF, polices du site, feuille)

**Files:**
- Create: `src/services/etiquettes/pdf.js`, `public/fonts/pdf/BricolageGrotesque-ExtraBold.ttf`, `public/fonts/pdf/Poppins-SemiBold.ttf`
- Modify: `package.json`, `package-lock.json` (dépendance `jspdf`)

**Interfaces:**
- Consumes: `dessinerPage` (tâche 4), `PAGE` (tâche 3), `Page[]`.
- Produces: `async fabriquerPdf(pages: Page[]) → Blob` (application/pdf, une page A4 par `Page`).

- [ ] **Step 1: Polices TTF pour le PDF** (jsPDF n'accepte que du TTF ; le site n'a que du WOFF2). Hors du projet, dans le dossier de travail temporaire :

```bash
python3 -m venv /tmp/polices && /tmp/polices/bin/pip -q install fonttools brotli
mkdir -p public/fonts/pdf
/tmp/polices/bin/python -c "
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
f = TTFont('public/fonts/bricolage-latin.woff2'); f.flavor = None
if 'fvar' in f: f = instancer.instantiateVariableFont(f, {a.axisTag: (800 if a.axisTag == 'wght' else a.defaultValue) for a in f['fvar'].axes})
f.save('public/fonts/pdf/BricolageGrotesque-ExtraBold.ttf')
p = TTFont('public/fonts/poppins-latin-600.woff2'); p.flavor = None
p.save('public/fonts/pdf/Poppins-SemiBold.ttf')
"
ls -la public/fonts/pdf
```
Expected: deux fichiers `.ttf` de quelques dizaines de Ko. (Bricolage est-elle variable ? `instantiateVariableFont` ne s'applique que si `fvar` existe.)

- [ ] **Step 2: Installer jsPDF**

Run: `npm install jspdf@4.2.1 --save-exact`
Expected: `"jspdf": "4.2.1"` dans `dependencies`.

- [ ] **Step 3: Écrire le module**

```js
/**
 * Planches d'étiquettes → PDF vectoriel (traits nets à toute résolution : le
 * code-barres en dépend), polices du site intégrées. jsPDF n'est chargé qu'ici,
 * à la demande, pour ne pas alourdir le reste du site.
 * Mêmes primitives que l'aperçu (dessin.js).
 */
import { dessinerPage } from './dessin.js'

const MM_EN_PT = 72 / 25.4

async function base64(url) {
  const octets = new Uint8Array(await (await fetch(url)).arrayBuffer())
  let s = ''
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode(...octets.subarray(i, i + 0x8000))
  return btoa(s)
}

// La feuille (SVG) passe en PNG pour jsPDF, à 512 px
async function feuillePng() {
  const img = new Image()
  img.src = '/logo-feuille.svg'
  await img.decode()
  const c = document.createElement('canvas')
  c.width = c.height = 512
  c.getContext('2d').drawImage(img, 0, 0, 512, 512)
  return c.toDataURL('image/png')
}

function dessiner(doc, p, feuille) {
  if (p.t === 'rect') {
    if (p.fond) doc.setFillColor(p.fond)
    if (p.trait) { doc.setDrawColor(p.trait); doc.setLineWidth(p.ep) }
    const style = p.fond && p.trait ? 'FD' : p.fond ? 'F' : 'S'
    if (p.rayon) doc.roundedRect(p.x, p.y, p.l, p.h, p.rayon, p.rayon, style)
    else doc.rect(p.x, p.y, p.l, p.h, style)
  } else if (p.t === 'ligne') {
    doc.setDrawColor(p.trait); doc.setLineWidth(p.ep)
    doc.line(p.x1, p.y1, p.x2, p.y2)
  } else if (p.t === 'cercle') {
    if (p.fond) doc.setFillColor(p.fond)
    if (p.trait) { doc.setDrawColor(p.trait); doc.setLineWidth(p.ep) }
    doc.circle(p.cx, p.cy, p.r, p.fond && p.trait ? 'FD' : p.fond ? 'F' : 'S')
  } else if (p.t === 'image') {
    doc.addImage(feuille, 'PNG', p.x, p.y, p.l, p.h)
  } else {
    const [famille, style] = { titre: ['Bricolage', 'bold'], texte: ['Poppins', 'normal'], chiffres: ['courier', 'normal'] }[p.police]
    doc.setFont(famille, style)
    doc.setFontSize(p.taille * MM_EN_PT)
    const largeurs = p.morceaux.map(m => doc.getTextWidth(m.texte))
    const total = largeurs.reduce((a, b) => a + b, 0)
    const recul = p.ancre === 'middle' ? total / 2 : p.ancre === 'end' ? total : 0
    // direction du texte (rotation SVG, sens horaire, y vers le bas)
    const a = ((p.rotation || 0) * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a)
    let d = -recul
    p.morceaux.forEach((m, i) => {
      doc.setTextColor(m.couleur)
      doc.text(m.texte, p.x + d * dx, p.y + d * dy, { angle: -(p.rotation || 0), baseline: 'alphabetic' })
      d += largeurs[i]
    })
  }
}

export async function fabriquerPdf(pages) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  doc.addFileToVFS('BricolageGrotesque-ExtraBold.ttf', await base64('/fonts/pdf/BricolageGrotesque-ExtraBold.ttf'))
  doc.addFont('BricolageGrotesque-ExtraBold.ttf', 'Bricolage', 'bold')
  doc.addFileToVFS('Poppins-SemiBold.ttf', await base64('/fonts/pdf/Poppins-SemiBold.ttf'))
  doc.addFont('Poppins-SemiBold.ttf', 'Poppins', 'normal')
  const feuille = await feuillePng()
  pages.forEach((page, i) => {
    if (i > 0) doc.addPage('a4', 'portrait')
    for (const p of dessinerPage(page, i + 1, pages.length)) dessiner(doc, p, feuille)
  })
  return doc.output('blob')
}
```

- [ ] **Step 4: Vérifier dans le navigateur** (la fabrication du PDF utilise `fetch`, `Image`, `canvas` : pas de test `node:test`). Lancer `npx vite --port 5199 --strictPort --no-open`, puis un script Playwright (hors projet, dans le dossier temporaire de session) qui ouvre `http://localhost:5199/`, exécute
`const { fabriquerPdf } = await import('/src/services/etiquettes/pdf.js'); const { repartir } = await import('/src/services/etiquettes/regles.js');` avec 29 étiquettes d'exemple (celles de `planche-a4-v6.html`), récupère le Blob en base64 et l'écrit dans `…/scratchpad/essai.pdf`. Lire le PDF (outil Read) et le comparer à la maquette : mêmes rangées, noms, repères, réglette ; textes non tournés à l'envers ; nom vertical se lisant de bas en haut ; chiffres verticaux le long des barres.
Expected: rendu conforme. Si les textes tournés sont à l'envers, inverser le signe de `angle` (jsPDF compte dans le sens inverse des aiguilles) et recommencer.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json public/fonts/pdf src/services/etiquettes/pdf.js
git commit -m "feat: étiquettes — PDF vectoriel des planches (jsPDF, polices du site)"
```

---

### Task 7: Fenêtre « Catégories des jeux » (Paramètres)

**Files:**
- Create: `src/components/admin/CategoriesJeux.jsx`
- Modify: `src/pages/admin/Parametres.jsx:548-557` (carte), `:463` (sauvegarde)

**Interfaces:**
- Produces: `<CategoriesJeux onClose={fn} />` — lit et écrit `categories_jeux`, compte les jeux par catégorie (`games.categorie_id`).

- [ ] **Step 1: Écrire le composant**

```jsx
import { useEffect, useState } from 'react'
import { Plus, Trash2, X, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useToast } from '../ToastContext'
import ConfirmModal from './ConfirmModal'
import MaskIcon from '../site/MaskIcon'

/**
 * Paramètres → « Catégories des jeux » : catégories de rangement de la ludothèque
 * et leur couleur (bandeau des étiquettes code-barres). Valeurs de départ : tableau
 * Google « Liste des jeux catégories » (octobre 2026).
 */
export default function CategoriesJeux({ onClose }) {
  const { addToast } = useToast()
  const [categories, setCategories] = useState([])
  const [nombres, setNombres] = useState({})
  const [chargement, setChargement] = useState(true)
  const [aSupprimer, setASupprimer] = useState(null)

  async function charger() {
    const [{ data: cats }, { data: jeux }] = await Promise.all([
      supabase.from('categories_jeux').select('*').order('ordre'),
      supabase.from('games').select('categorie_id'),
    ])
    setCategories(cats || [])
    const n = {}
    for (const j of jeux || []) if (j.categorie_id) n[j.categorie_id] = (n[j.categorie_id] || 0) + 1
    setNombres(n)
    setChargement(false)
  }
  useEffect(() => { charger() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function enregistrer(id, champs) {
    setCategories(cs => cs.map(c => (c.id === id ? { ...c, ...champs } : c)))
    const { error } = await supabase.from('categories_jeux').update(champs).eq('id', id)
    if (error) { addToast("Enregistrement impossible : " + error.message, 'error'); charger() }
  }

  async function ajouter() {
    const ordre = Math.max(0, ...categories.map(c => c.ordre)) + 1
    const { error } = await supabase.from('categories_jeux').insert({ nom: `Nouvelle catégorie ${ordre}`, couleur: '#1a5f7a', ordre })
    if (error) addToast("Ajout impossible : " + error.message, 'error')
    charger()
  }

  async function deplacer(i, sens) {
    const a = categories[i], b = categories[i + sens]
    if (!b) return
    await Promise.all([
      supabase.from('categories_jeux').update({ ordre: b.ordre }).eq('id', a.id),
      supabase.from('categories_jeux').update({ ordre: a.ordre }).eq('id', b.id),
    ])
    charger()
  }

  async function supprimer() {
    const { error } = await supabase.from('categories_jeux').delete().eq('id', aSupprimer.id)
    if (error) addToast("Suppression impossible : " + error.message, 'error')
    else addToast('Catégorie supprimée.', 'success')
    setASupprimer(null)
    charger()
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-[22px]">
      <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={onClose} />
      <div className="anim-modal-in relative flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-7 py-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#1a5f7a]">
              <MaskIcon file="ludo-etiquettes.svg" size={30} color="#ffffff" />
            </div>
            <div>
              <h3 className="font-display text-[21px] font-extrabold uppercase tracking-[-0.04em]">Catégories des <span className="text-[#1a5f7a]">jeux</span></h3>
              <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Couleur du bandeau des étiquettes</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {chargement && <Loader2 className="mx-auto animate-spin text-[#1a5f7a]" />}
          {categories.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-3">
              <label className="relative h-10 w-10 shrink-0 cursor-pointer rounded-[12px] border-2 border-[#0f172a]" style={{ background: c.couleur }} title="Changer la couleur">
                <input type="color" value={c.couleur} onChange={e => enregistrer(c.id, { couleur: e.target.value.toUpperCase() })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </label>
              <input defaultValue={c.nom} onBlur={e => e.target.value.trim() && e.target.value.trim() !== c.nom && enregistrer(c.id, { nom: e.target.value.trim() })}
                className="min-w-0 flex-1 rounded-[12px] border-2 border-transparent bg-transparent px-2 py-1.5 text-[13.5px] font-bold outline-none focus:border-[#0f172a] focus:bg-white" />
              <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">{nombres[c.id] || 0} jeu{(nombres[c.id] || 0) > 1 ? 'x' : ''}</span>
              <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label="Monter" className="text-slate-400 hover:text-[#1a5f7a] disabled:opacity-30"><ArrowUp size={16} /></button>
              <button type="button" onClick={() => deplacer(i, 1)} disabled={i === categories.length - 1} aria-label="Descendre" className="text-slate-400 hover:text-[#1a5f7a] disabled:opacity-30"><ArrowDown size={16} /></button>
              <button type="button" onClick={() => setASupprimer(c)} aria-label="Supprimer" className="text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t-2 border-[#0f172a] p-6">
          <button onClick={ajouter} className="flex w-full items-center justify-center gap-2 rounded-[18px] border-2 border-[#0f172a] bg-[#1a5f7a] py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white shadow-[4px_4px_0_#0f172a] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]">
            <Plus size={16} strokeWidth={3} /> Ajouter une catégorie
          </button>
        </div>
      </div>

      <ConfirmModal
        open={!!aSupprimer}
        onClose={() => setASupprimer(null)}
        onConfirm={supprimer}
        tone="danger"
        title="Supprimer la catégorie ?"
        message={aSupprimer ? `« ${aSupprimer.nom} » sera supprimée. ${nombres[aSupprimer.id] || 0} jeu(x) redeviendront « sans catégorie » et n'auront plus d'étiquette tant qu'on ne leur en donne pas une autre.` : ''}
        confirmLabel="Supprimer"
      />
    </div>
  )
}
```

- [ ] **Step 2: Brancher dans les Paramètres**

`Parametres.jsx` : `import CategoriesJeux from '../../components/admin/CategoriesJeux'` ; état `const [showCategoriesModal, setShowCategoriesModal] = useState(false)` ; dans la liste des cartes (après « Affiches ») :

```jsx
          { onClick: () => setShowCategoriesModal(true), icon: <MaskIcon file="ludo-etiquettes.svg" size={30} color="currentColor" />, color: '#1a5f7a', tint: '#f0f7f9', title: 'Catégories', desc: 'Couleurs des étiquettes',     cta: 'Gérer' },
```

et, à côté des autres fenêtres : `{showCategoriesModal && <CategoriesJeux onClose={() => setShowCategoriesModal(false)} />}`.
Dans la liste des tables de la sauvegarde (ligne ~463), après `games` : `{ name: 'Catégories des jeux', table: 'categories_jeux', key: 'categories_jeux' },` et ajouter `categories_jeux: true` à l'état initial de `exportSelection` (ligne ~74, même forme que les autres clés). Note : la spec dit « encadré » ; l'écran Paramètres est fait de cartes qui ouvrent des fenêtres, on suit ce modèle.

- [ ] **Step 3: Vérifier** — `npm run lint` (0 erreur). L'icône `ludo-etiquettes.svg` n'existe qu'après la tâche 8 : faire la photo après la tâche 8.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/CategoriesJeux.jsx src/pages/admin/Parametres.jsx
git commit -m "feat: Paramètres — catégories des jeux et leurs couleurs"
```

---

### Task 8: Icône du bouton « Étiquettes »

**Files:**
- Create: `public/icons/ludo-etiquettes.svg`

- [ ] **Step 1: Dessiner** dans le style des icônes dessinées (lire `public/icons/ludo-etiquette-qr.svg` et `ludo-scan.svg` comme modèles : `viewBox="0 0 300 300"`, `width="300" height="300"`, `fill="none"`, `stroke="#000"`, `stroke-width="8"`, `stroke-linecap="round"`, `stroke-linejoin="round"`). Idée : une étiquette rectangulaire avec un bandeau en haut (trait horizontal), un petit rond (médaillon) dans le bandeau, et 6 à 8 barres verticales de longueurs inégales dessous.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
  <rect x="62" y="44" width="176" height="212" rx="10"/>
  <line x1="62" y1="104" x2="238" y2="104"/>
  <circle cx="96" cy="74" r="16"/>
  <line x1="138" y1="74" x2="206" y2="74"/>
  <line x1="96" y1="136" x2="96" y2="206"/>
  <line x1="118" y1="136" x2="118" y2="206"/>
  <line x1="136" y1="136" x2="136" y2="206"/>
  <line x1="160" y1="136" x2="160" y2="206"/>
  <line x1="182" y1="136" x2="182" y2="206"/>
  <line x1="204" y1="136" x2="204" y2="206"/>
  <line x1="96" y1="228" x2="204" y2="228"/>
</svg>
```

- [ ] **Step 2: Montrer à Victor** (photo agrandie à côté de `ludo-etiquette-qr.svg`) et ajuster selon sa réponse avant de continuer. Vérifier que `width`/`height` sont présents (Safari).

- [ ] **Step 3: Commit**

```bash
git add public/icons/ludo-etiquettes.svg
git commit -m "feat: icône dessinée — étiquettes code-barres"
```

---

### Task 9: Fiche d'un jeu — catégorie, épaisseur, réimpression, code nettoyé

**Files:**
- Modify: `src/pages/admin/Jeux.tsx` (états `:337-369`, `bggGetDetails :43-57`, `remplirFiche :406-425`, `fetchJeux :495-513`, `handleSubmit :624-631`, formulaire après `:850`)

**Interfaces:**
- Consumes: table `categories_jeux`, colonnes de la tâche 1, `thicknessMm` de `bgg-proxy`.
- Produces: état `categories` (liste `{ id, nom, couleur, ordre }` triée par `ordre`) dans `Jeux`, transmis à la fenêtre de la tâche 11.

- [ ] **Step 1: Charger les catégories**

Ajouter l'état `const [categories, setCategories] = useState([])` et, dans `fetchJeux` (branche en ligne, après `setJeux`) :

```ts
          const { data: cats } = await supabase.from('categories_jeux').select('*').order('ordre')
          setCategories(cats || [])
          localStorage.setItem('cache_categories_jeux', JSON.stringify(cats || []))
```
et dans la branche hors ligne : `setCategories(JSON.parse(localStorage.getItem('cache_categories_jeux') || '[]'))`.

- [ ] **Step 2: Champs de la fiche**

`initialGameState` : ajouter `categorie_id: null, epaisseur_mm: '', etiquette_imprimee_le: null`.
`bggGetDetails` : ajouter `thicknessMm: item.thicknessMm || null`.
`remplirFiche` : ajouter `epaisseur_mm: m?.thicknessMm || prev.epaisseur_mm,`.
`handleSubmit`, objet `gameData` : remplacer `barcode: newGame.barcode || ''` par `barcode: (newGame.barcode || '').replace(/\s+/g, '')` et ajouter

```ts
        categorie_id: newGame.categorie_id || null,
        epaisseur_mm: parseInt(newGame.epaisseur_mm as any) || null,
```

Dans le formulaire, juste après le bloc « Joueurs min / max » (avant « Catégories ») :

```tsx
                    <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px]">
                      <div>
                        <label className={F_LABEL}>Catégorie de la ludothèque</label>
                        <div className="flex items-center gap-2">
                          <span className="h-[46px] w-3 shrink-0 rounded-full border-2 border-[#0f172a]" style={{ background: categories.find(c => c.id === newGame.categorie_id)?.couleur || '#ffffff' }} />
                          <select className={F_INPUT} value={newGame.categorie_id ?? ''} onChange={e => setNewGame({ ...newGame, categorie_id: e.target.value ? Number(e.target.value) : null })}>
                            <option value="">— à choisir —</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={F_LABEL}>Épaisseur boîte (mm)</label>
                        <input type="number" min="1" max="300" placeholder="ex. 45" className={F_INPUT} value={newGame.epaisseur_mm ?? ''} onChange={e => setNewGame({ ...newGame, epaisseur_mm: e.target.value })} />
                      </div>
                    </div>
                    {editingId && newGame.etiquette_imprimee_le && (
                      <button type="button" onClick={reimprimerEtiquette} className="mb-3.5 flex items-center gap-2 rounded-[12px] border-2 border-[#0f172a] bg-white px-4 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a] transition-colors hover:bg-[#1a5f7a] hover:text-white">
                        <Printer size={13} /> Réimprimer l'étiquette
                      </button>
                    )}
```

avec, près de `startEdit` :

```ts
  // Étiquette abîmée : le jeu revient dans la liste « à imprimer » de la fenêtre Étiquettes
  const reimprimerEtiquette = async () => {
    const { error } = await supabase.from('games').update({ etiquette_imprimee_le: null }).eq('id', editingId)
    if (error) { addToast('Impossible : ' + error.message, 'error'); return }
    setNewGame(g => ({ ...g, etiquette_imprimee_le: null }))
    fetchJeux()
    addToast("L'étiquette sera proposée à la prochaine impression.", 'success')
  }
```

- [ ] **Step 3: Vérifier** — `npm run lint`, construction ; `admin-shot.js` sur `/admin/jeux` après ouverture d'une fiche (`--click` sur le crayon du premier jeu) : la catégorie et l'épaisseur s'affichent ; ajouter puis supprimer un jeu d'essai par recherche MyLudo (« Skull King ») et constater que l'épaisseur (30) se remplit seule.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/Jeux.tsx
git commit -m "feat: fiche d'un jeu — catégorie de la ludothèque, épaisseur de la boîte, réimpression de l'étiquette"
```

---

### Task 10: VueAgrandie — afficher une page SVG

**Files:**
- Modify: `src/components/admin/VueAgrandie.jsx`

**Interfaces:**
- Produces: prop facultative `rendre(index) → ReactNode` ; sans elle, comportement inchangé (images).

- [ ] **Step 1: Ajouter la prop**

Signature : `export default function VueAgrandie({ images, index, onIndex, onFermer, rendre })`. Remplacer l'`<img …/>` par :

```jsx
      {rendre
        ? <div onClick={e => e.stopPropagation()} className="max-h-[86vh] overflow-hidden rounded-xl border-2 border-white bg-white">{rendre(index)}</div>
        : <img src={images[index]} alt={`Image ${index + 1} sur ${n}`} onClick={e => e.stopPropagation()}
            className="max-h-[86vh] max-w-full rounded-xl border-2 border-white" />}
```

Mettre à jour le commentaire d'en-tête : « … Partagée par les fenêtres Bilan et Annonce, et par l'aperçu des étiquettes (`rendre`). »

- [ ] **Step 2: Vérifier** — `npm run lint` ; ouvrir une fenêtre Bilan existante (écran Communication) et agrandir une image : inchangé.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/VueAgrandie.jsx
git commit -m "feat: vue agrandie — affichage d'autre chose qu'une image"
```

---

### Task 11: Fenêtre Étiquettes à deux onglets

**Files:**
- Create: `src/components/admin/etiquettes/FenetreEtiquettes.jsx`, `OngletCodeBarres.jsx`, `OngletQr.jsx`
- Modify: `src/pages/admin/Jeux.tsx` (retirer `fetchQrAsBase64` et `GenerateurEtiquettes` `:106-331` ; bouton `:694-710` ; modale `:1049-1050` ; étape de tutoriel `:91`)

**Interfaces:**
- Consumes: `preparer`, `repartir`, `raisons`, `depasse`, `numeroEtiquette`, `PAGE` (tâche 3) ; `dessinerPage` (tâche 4) ; `versSvg` (tâche 5) ; `fabriquerPdf` (tâche 6) ; `VueAgrandie` + `rendre` (tâche 10) ; `categories` (tâche 9).
- Produces: `<FenetreEtiquettes jeux categories onClose onOuvrirJeu={jeu => …} onChange={() => fetchJeux()} />`.

- [ ] **Step 1: `OngletQr.jsx`** — déplacer le contenu de `GenerateurEtiquettes` (`Jeux.tsx:137-331`) et `fetchQrAsBase64` (`:112-123`) **sans changer le comportement**, en retirant les annotations TypeScript (`useState<Set<string>>` → `useState`, `(url: string)` → `(url)`, `as const` supprimé, `Record<…>` supprimé). Le composant devient `export default function OngletQr({ jeux })` et ne rend que le corps (colonne gauche + aperçu, le `<div className="flex flex-1 overflow-hidden">…</div>`) et le pied (`<div className="flex shrink-0 … border-t-2 …">…</div>`), enveloppés dans `<>…</>` ; l'en-tête et le voile sont fournis par `FenetreEtiquettes`. La ligne « N jeux avec vidéo · M sélectionnés » passe en tête de la colonne de gauche :

```jsx
            <p className="px-4 pt-4 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              {jeuxAvecVideo.length} jeu{jeuxAvecVideo.length > 1 ? 'x' : ''} avec vidéo · <span className="text-[#1a5f7a]">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
            </p>
```

- [ ] **Step 2: `FenetreEtiquettes.jsx`**

```jsx
import { useState } from 'react'
import MaskIcon from '../../site/MaskIcon'
import OngletCodeBarres from './OngletCodeBarres'
import OngletQr from './OngletQr'

/**
 * Bouton « Étiquettes » de l'écran Jeux : étiquettes code-barres des boîtes (onglet
 * par défaut) et étiquettes QR de la vidéo des règles. Ordinateur seulement.
 */
export default function FenetreEtiquettes({ jeux, categories, onClose, onOuvrirJeu, onChange }) {
  const [onglet, setOnglet] = useState('code')
  const ONGLETS = [{ id: 'code', label: 'Code-barres' }, { id: 'qr', label: 'Vidéo des règles' }]
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-[22px]">
      <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={onClose} />
      <div className="anim-modal-in relative flex max-h-[92vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#e38154]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b-2 border-[#0f172a] px-7 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#e38154]">
              <MaskIcon file={onglet === 'code' ? 'ludo-etiquettes.svg' : 'ludo-etiquette-qr.svg'} size={30} color="#ffffff" />
            </div>
            <h2 className="font-display text-[21px] font-extrabold tracking-[-0.04em]">Générateur d'<span className="text-[#e38154]">étiquettes</span></h2>
          </div>
          <div className="flex items-center gap-2">
            {ONGLETS.map(o => (
              <button key={o.id} onClick={() => setOnglet(o.id)}
                className={`rounded-[14px] border-2 border-[#0f172a] px-4 py-2.5 text-[9px] font-extrabold uppercase tracking-[0.14em] transition-colors ${onglet === o.id ? 'bg-[#1a5f7a] text-white' : 'bg-white text-slate-600 hover:bg-[#f0f7f9]'}`}>
                {o.label}
              </button>
            ))}
            <button onClick={onClose} aria-label="Fermer" className="ml-2 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white">✕</button>
          </div>
        </div>
        {onglet === 'code'
          ? <OngletCodeBarres jeux={jeux} categories={categories} onOuvrirJeu={onOuvrirJeu} onChange={onChange} />
          : <OngletQr jeux={jeux} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `OngletCodeBarres.jsx`**

```jsx
import { useMemo, useState } from 'react'
import { Search, Loader2, Download, FileCheck, ChevronDown, AlertCircle } from 'lucide-react'
import MaskIcon from '../../site/MaskIcon'
import ConfirmModal from '../ConfirmModal'
import VueAgrandie from '../VueAgrandie'
import { supabase } from '../../../services/supabaseClient'
import { useToast } from '../../ToastContext'
import { preparer, repartir, raisons, depasse, numeroEtiquette, PAGE } from '../../../services/etiquettes/regles.js'
import { dessinerPage } from '../../../services/etiquettes/dessin.js'
import { versSvg } from '../../../services/etiquettes/rendu-svg.js'

/**
 * Onglet « Code-barres » de la fenêtre Étiquettes : jeux dont l'étiquette n'est pas
 * encore imprimée (tous cochés au départ), aperçu exact des planches A4, PDF.
 * Même disposition que l'onglet QR.
 */
export default function OngletCodeBarres({ jeux, categories, onOuvrirJeu, onChange }) {
  const { addToast } = useToast()
  const categoriesParId = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])
  const aImprimer = useMemo(() => preparer(jeux.filter(j => !j.etiquette_imprimee_le), categoriesParId), [jeux, categoriesParId])
  const bloques = useMemo(() => jeux
    .map(j => ({ jeu: j, r: raisons(j, categoriesParId) }))
    .filter(x => x.r.length > 0 && !x.jeu.etiquette_imprimee_le), [jeux, categoriesParId])

  const [selection, setSelection] = useState(() => new Set(aImprimer.map(e => e.id)))
  const [filtre, setFiltre] = useState('')
  const [voirBloques, setVoirBloques] = useState(false)
  const [occupe, setOccupe] = useState(false)
  const [telecharge, setTelecharge] = useState(false)
  const [confirmer, setConfirmer] = useState(false)
  const [agrandie, setAgrandie] = useState(null)

  // Recalculé seulement quand la sélection change (pas à chaque lettre du filtre)
  const choisies = useMemo(() => aImprimer.filter(e => selection.has(e.id)), [aImprimer, selection])
  const pages = useMemo(() => repartir(choisies), [choisies])
  const svgs = useMemo(() => pages.map((p, i) => versSvg(dessinerPage(p, i + 1, pages.length), PAGE.l, PAGE.h)), [pages])
  const visibles = aImprimer.filter(e => e.nom.toLowerCase().includes(filtre.toLowerCase()) || e.numero.includes(filtre))

  const basculer = id => setSelection(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const tout = () => setSelection(selection.size === aImprimer.length ? new Set() : new Set(aImprimer.map(e => e.id)))

  async function telecharger(seulementPremiere) {
    setOccupe(true)
    try {
      const { fabriquerPdf } = await import('../../../services/etiquettes/pdf.js')
      const blob = await fabriquerPdf(seulementPremiere ? pages.slice(0, 1) : pages)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = seulementPremiere ? 'etiquettes-page-essai.pdf' : `etiquettes-code-barres-${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10000)
      if (!seulementPremiere) setTelecharge(true)
    } catch (e) {
      addToast('Le PDF n’a pas pu être fabriqué : ' + e.message, 'error')
    } finally { setOccupe(false) }
  }

  async function marquer() {
    const ids = choisies.map(e => e.id)
    const { error } = await supabase.from('games').update({ etiquette_imprimee_le: new Date().toISOString() }).in('id', ids)
    setConfirmer(false)
    if (error) { addToast('Impossible : ' + error.message, 'error'); return }
    addToast(`${ids.length} étiquette${ids.length > 1 ? 's' : ''} marquée${ids.length > 1 ? 's' : ''} comme imprimée${ids.length > 1 ? 's' : ''}.`, 'success')
    setTelecharge(false)
    onChange()
  }

  const BTN = 'flex items-center gap-2 rounded-[18px] border-2 border-[#0f172a] px-5 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-[transform,box-shadow] duration-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none'

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-80 shrink-0 flex-col overflow-hidden border-r-2 border-[#0f172a]">
          <p className="px-4 pt-4 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            {aImprimer.length} à imprimer · <span className="text-[#1a5f7a]">{choisies.length} sélectionnée{choisies.length > 1 ? 's' : ''}</span>
          </p>
          <div className="flex shrink-0 items-center gap-2 p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={13} />
              <input placeholder="Filtrer..." value={filtre} onChange={e => setFiltre(e.target.value)}
                className="w-full rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] py-2.5 pl-8 pr-3 text-xs font-bold outline-none focus:bg-white" />
            </div>
            <button onClick={tout} className="whitespace-nowrap rounded-[14px] border-2 border-[#0f172a] bg-white px-3 py-2.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-600 transition-colors hover:bg-[#1a5f7a] hover:text-white">
              {selection.size === aImprimer.length ? 'Aucun' : 'Tous'}
            </button>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto px-4 pb-4">
            {visibles.map(e => (
              <label key={e.id} className="flex cursor-pointer items-center gap-3 rounded-[14px] p-2.5 transition-colors hover:bg-slate-50">
                <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 border-[#0f172a] ${selection.has(e.id) ? 'bg-[#1a5f7a]' : 'bg-white'}`}>
                  {selection.has(e.id) && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                <input type="checkbox" className="hidden" checked={selection.has(e.id)} onChange={() => basculer(e.id)} />
                <span className="h-3 w-3 shrink-0 rounded-full border-2 border-[#0f172a]" style={{ background: e.couleur }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-800">{e.nom}</span>
                  <span className="text-[9px] text-slate-400">{e.numero}{depasse(e.epaisseur) ? ' · dépasse de la tranche' : ''}</span>
                </span>
              </label>
            ))}
          </div>
          {bloques.length > 0 && (
            <div className="shrink-0 border-t-2 border-[#0f172a]">
              <button onClick={() => setVoirBloques(v => !v)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#e38154]">
                <span className="flex items-center gap-1.5"><AlertCircle size={12} /> {bloques.length} ne peuvent pas encore avoir d'étiquette</span>
                <ChevronDown size={14} className={voirBloques ? 'rotate-180' : ''} />
              </button>
              {voirBloques && (
                <div className="max-h-56 space-y-0.5 overflow-y-auto px-4 pb-4">
                  {bloques.map(({ jeu, r }) => (
                    <button key={jeu.id} onClick={() => onOuvrirJeu(jeu)} className="block w-full rounded-[12px] p-2 text-left hover:bg-[#fdf1ea]">
                      <span className="block truncate text-xs font-bold text-slate-800">{jeu.name}</span>
                      <span className="text-[9px] text-slate-400">{numeroEtiquette(jeu.registration_number)} · {r.join(', ')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-[#fdfaf6] p-6">
          {choisies.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
              <MaskIcon file="ludo-etiquettes.svg" size={56} color="currentColor" />
              <p className="text-xs font-black uppercase tracking-wide">Sélectionnez des jeux</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-[10px] font-black uppercase tracking-wide text-slate-400">
                Aperçu — {choisies.length} étiquette{choisies.length > 1 ? 's' : ''} · {pages.length} page{pages.length > 1 ? 's' : ''} · A4 portrait
              </p>
              <div className="space-y-6">
                {svgs.map((svg, i) => (
                  <figure key={i}>
                    <figcaption className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Page {i + 1} / {pages.length}</figcaption>
                    <button type="button" onClick={() => setAgrandie(i)} title="Agrandir"
                      className="block w-full max-w-[560px] border border-slate-300 bg-white shadow-[0_2px_10px_rgba(15,23,42,.12)] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: svg }} />
                  </figure>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t-2 border-[#0f172a] p-6">
        <p className="text-[10px] font-semibold text-slate-400">A4 portrait · étiquettes 36 mm · noms sous chaque rangée · repères de coupe</p>
        <div className="flex flex-wrap gap-2.5">
          <button onClick={() => telecharger(true)} disabled={!choisies.length || occupe} className={`${BTN} bg-white text-[#1a5f7a]`}>Page d'essai</button>
          <button onClick={() => telecharger(false)} disabled={!choisies.length || occupe}
            className={`${BTN} bg-[#1a5f7a] text-white shadow-[4px_4px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]`}>
            {occupe ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Télécharger le PDF
          </button>
          <button onClick={() => setConfirmer(true)} disabled={!telecharge || occupe} className={`${BTN} bg-[#e38154] text-white`}>
            <FileCheck size={16} /> Marquer comme imprimées
          </button>
        </div>
      </div>

      {agrandie !== null && (
        <VueAgrandie images={svgs} index={agrandie} onIndex={setAgrandie} onFermer={() => setAgrandie(null)}
          rendre={i => <div className="h-[86vh] [&>svg]:h-full [&>svg]:w-auto" dangerouslySetInnerHTML={{ __html: svgs[i] }} />} />
      )}

      <ConfirmModal
        open={confirmer}
        onClose={() => setConfirmer(false)}
        onConfirm={marquer}
        tone="success"
        title="Étiquettes imprimées ?"
        message={`Les ${choisies.length} étiquettes du PDF sortiront de la liste. Une étiquette abîmée pourra être remise dans la liste depuis la fiche du jeu (« Réimprimer l'étiquette »).`}
        confirmLabel="Marquer comme imprimées"
      />
    </>
  )
}
```

Note : `useState(() => new Set(aImprimer…))` n'est calculé qu'à l'ouverture ; après « Marquer comme imprimées », `onChange` recharge les jeux, `aImprimer` se vide de ces jeux et `choisies` (filtré sur `aImprimer`) aussi — la sélection résiduelle est sans effet.

- [ ] **Step 4: Brancher dans `Jeux.tsx`**

Retirer `fetchQrAsBase64` et `GenerateurEtiquettes` (et les imports devenus inutiles : `Printer` reste utilisé par la tâche 9, `QrCode` reste utilisé dans la liste). Ajouter `import FenetreEtiquettes from '../../components/admin/etiquettes/FenetreEtiquettes'`. Bouton : `<MaskIcon file="ludo-etiquettes.svg" …/>`, `title="Étiquettes des boîtes (code-barres) et des vidéos de règles (QR)"`, pastille = nombre d'étiquettes code-barres à imprimer :

```ts
  const nbEtiquettesAImprimer = jeux.filter(j => !j.etiquette_imprimee_le && j.categorie_id && j.epaisseur_mm > 0 && (j.barcode || '').trim()).length
```
(remplace `nbJeuxAvecVideo` dans le bouton ; la pastille ne s'affiche que si > 0.)
Modale :

```tsx
      {showEtiquettes && (
        <FenetreEtiquettes
          jeux={jeux}
          categories={categories}
          onClose={() => setShowEtiquettes(false)}
          onOuvrirJeu={jeu => { setShowEtiquettes(false); startEdit(jeu) }}
          onChange={fetchJeux}
        />
      )}
```

Tutoriel (`:91`) : titre « Étiquettes des boîtes », description « Ce bouton ouvre le générateur d'étiquettes : l'onglet Code-barres prépare les planches A4 d'étiquettes à coller sur la tranche des boîtes (code-barres, numéro, couleur de la catégorie) ; l'onglet Vidéo des règles fabrique les étiquettes QR des jeux qui ont une vidéo. »

- [ ] **Step 5: Vérifier** — `npm test`, `npm run lint`, construction. Photos `admin-shot.js` (1280 px) : fenêtre ouverte (onglet Code-barres, tout coché), après « Aucun » (« Sélectionnez des jeux »), bloc « ne peuvent pas » déplié, page agrandie, onglet Vidéo des règles (identique à l'ancien générateur). Télécharger la page d'essai et le PDF complet via Playwright, lire le PDF (outil Read) et vérifier qu'il correspond à l'aperçu page pour page. **Regarder chaque photo** avant de conclure.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/etiquettes src/pages/admin/Jeux.tsx
git commit -m "feat: Jeux — fenêtre Étiquettes à deux onglets (code-barres des boîtes, QR des règles)"
```

---

### Task 12: Remplissage initial (catégories, épaisseurs, codes)

**Files:** aucun fichier du projet (script dans le dossier temporaire de session) ; écritures dans la base après accord de Victor.

- [ ] **Step 1: Préparer sans écrire.** Script Python (`-I`, environnement virtuel avec `openpyxl`) dans le dossier temporaire : télécharger le tableau (`https://docs.google.com/spreadsheets/d/1TVO9u1ScV8pef1DVbXIyf66PzQpFmAmw30q_wI_FizY/export?format=xlsx`), lire la feuille « Liste des jeux  catégories » (A = nom, B = catégorie) ; exporter les jeux (`supabase db query --linked "select id, name, registration_number, barcode from games" -o json`) ; comparer les noms normalisés (sans accents, ponctuation, casse ; guillemets du tableau retirés : `Cartaventura "Lhassa"` → `cartaventura lhassa`, et le tiret de la base aussi). Classer : **sûr** (égalité exacte normalisée, un seul jeu du tableau, catégorie non vide) / **douteux** (inclusion d'un nom dans l'autre, ou ratio `difflib` ≥ 0,85) / **absent**. Pour les épaisseurs : chaque jeu avec code-barres → MyLudo en visiteur (session anonyme de la page d'accueil + jeton `csrf-token`, comme le 27/10/2026), `search/datas.php?type=search&tab=games&words=<code>`, premier résultat, `game/datas.php?type=info&id=…` → `metrics.height` (cm) ; pause de 0,4 s entre requêtes.

- [ ] **Step 2: Montrer à Victor** (artefact ou liste dans la conversation) : nombre de sûrs, liste des douteux avec la correspondance proposée, absents, jeux sans épaisseur. Attendre son accord et ses corrections.

- [ ] **Step 3: Écrire** (une requête `update … from (values …)` par lot, `returning id`), uniquement sur les jeux dont la colonne est vide :
  - `update games g set categorie_id = v.cat from (values …) v(id, cat) where g.id = v.id and g.categorie_id is null`
  - `update games g set epaisseur_mm = v.mm from (values …) v(id, mm) where g.id = v.id and g.epaisseur_mm is null`
  - `update games set barcode = regexp_replace(barcode, '\s', '', 'g') where barcode ~ '\s'`

- [ ] **Step 4: Vérifier** : `select count(*) filter (where categorie_id is not null), count(*) filter (where epaisseur_mm is not null), count(*) filter (where barcode ~ '\s') from games` ; ouvrir la fenêtre Étiquettes : le nombre « à imprimer » correspond.

---

### Task 13: Fiche de travail et essai réel

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Mettre à jour `CLAUDE.md`** : dans §4 (briques de gestion), ajouter `CategoriesJeux` et `etiquettes/FenetreEtiquettes` (onglets Code-barres / Vidéo des règles ; règles `services/etiquettes/regles.js` testées par `npm test`, dessin en primitives `dessin.js` partagé par l'aperçu `rendu-svg.js` et le PDF `pdf.js` — ne jamais dessiner l'aperçu autrement) ; dans §3, ajouter `ludo-etiquettes.svg` au tableau des icônes ; dans §2, les tables `categories_jeux` (bénévoles seulement) et les colonnes `games.categorie_id`, `epaisseur_mm`, `etiquette_imprimee_le` ; dans §5, un piège : « Étiquettes code-barres : module 0,21 mm validé par la page d'essai du JJ/MM (Android, iPhone) — ne pas réduire ; vérifier la réglette de 10 cm (impression à 100 %) ». Laisser la date vide tant que l'essai n'est pas fait.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "doc: fiche de travail — étiquettes code-barres"
```

- [ ] **Step 3: Essai réel avec Victor** : il télécharge la page d'essai, l'imprime sur papier ordinaire à 100 %, mesure la réglette, scanne au moins 5 étiquettes (les trois mises en page) avec l'écran Prêts sur Android et sur iPhone. Si un scan échoue : demander une capture de la ligne grise du scanner, passer `MODULE` à 0,25 (`regles.js`, et ajuster les tests de dimensions), refaire l'essai. Quand c'est validé : compléter la date dans `CLAUDE.md` et commiter.
