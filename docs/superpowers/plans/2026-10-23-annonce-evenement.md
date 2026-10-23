# Annonce d'un événement et story du jour J — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la fenêtre « Publier sur Facebook & Instagram » d'un événement par une fenêtre « Annonce » qui fabrique un carrousel de 5 diapositives 4:5 (publié via Make) et une story du jour J 9:16 (enregistrée sur le téléphone), avec aperçu fidèle et défilable.

**Architecture:** Mêmes briques que le bilan automatique (étape 1, en ligne) : règles pures testées (`annonce-regles.js`), dessin canvas (`annonce.js`, outils de `dessin.js`), composant d'interface (`PublicationAnnonce.jsx`), publication par `publierSurReseaux`. Textes modifiables mémorisés dans `events.annonce` (jsonb).

**Tech Stack:** React 18 + Vite, Supabase, canvas 2D, Make (webhook existant), `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-23-annonce-evenement-design.md` (maquette : `~/Desktop/PERSO/Ludothèque/Maquette bilan soirée jeux/annonce.html`).

## Global Constraints

- Couleurs : bleu `#1a5f7a`, orange `#e38154`, encre `#0f172a`, crème `#fdfaf6` (`COULEURS` de `dessin.js`). Bricolage Grotesque 800 (titres) / Poppins 500–800.
- Carrousel 1080 × 1350, 5 diapositives au plus ; story 1080 × 1920, rien d'écrit dans les 250 px du haut ni les 340 px du bas.
- Pas de `ctx.filter` (Safari) : utiliser `dessinerFlou`/`flou` de `dessin.js` ; libérer les canvases (`liberer`) ; le logo est `/social/logo-feuille.png`.
- Pictogrammes dessinés, jamais d'émoji dans les images.
- Textes types et règles exacts : voir la spec (§ Textes modifiables, § Diapositives, § Story).
- Aperçu = image exacte publiée (même fonction de dessin, JPEG 0,9), défilable (`SocialPostPreview`).
- Story : fichiers préparés pendant l'aperçu ; `navigator.share` est le premier `await` après le toucher ; repli téléchargement + message (comme `PublicationBilan.jsx`).
- Aucune écriture ni publication réelle pendant les essais (interceptions). Code et commentaires en français ; `npm run lint` 0 erreur ; `npm test` vert.
- Commits : fin de message `Co-Authored-By: Claude <modèle> <noreply@anthropic.com>` ; jamais de `git push`.

## File Structure

| Fichier | Rôle |
|---|---|
| `src/services/diapos/regles.js` (modifié) | exporte `lieuCourt` et `jourMois` (déjà internes) |
| `src/services/diapos/annonce-regles.js` (créé) | textes types, formule du jour J, dernier événement semblable, plans annonce / story |
| `src/services/diapos/annonce-regles.test.js` (créé) | tests |
| `supabase/migrations/20261023_annonce_evenement.sql` (créé) | colonne `events.annonce jsonb` |
| `src/services/diapos/annonce.js` (créé) | dessin des 5 diapositives et de la story du jour J |
| `src/components/admin/VueAgrandie.jsx` (créé) | vue agrandie navigable, extraite de `PublicationBilan.jsx` |
| `src/components/admin/annonce/PublicationAnnonce.jsx` (créé) | fenêtre Annonce : textes, aperçus, publication, story |
| `src/components/admin/bilan/PublicationBilan.jsx` (modifié) | importe `VueAgrandie` partagée |
| `src/pages/admin/Evenements.jsx` (modifié) | la fenêtre de l'affiche devient la fenêtre Annonce ; effacement de `annonces/{id}/` à la suppression |
| `CLAUDE.md` (modifié) | briques ajoutées |

---

### Task 1: Règles de l'annonce et tests

**Files:** Modify `src/services/diapos/regles.js` ; Create `src/services/diapos/annonce-regles.js`, `src/services/diapos/annonce-regles.test.js`.

**Interfaces — Produces:**
- `regles.js` exporte en plus `lieuCourt(l)` et `jourMois(d)` (fonctions existantes, rendues `export`).
- `TEXTES_TYPES`, `INFOS_TYPES`
- `textesAnnonce(event) → { titre, points: [3 strings], infos: [{ titre, detail }, { titre, detail }] }`
- `formuleJourJ(dateTexte) → "C'est ce soir !" | "C'est cet après-midi !" | "C'est ce matin !"`
- `lignesQuand(event) → { jour: 'Vendredi 6 novembre', heure: 'à partir de 19h' | 'de 14h à 17h' }`
- `dernierEvenementSemblable(event, passes) → passe | null` — `passes` : `[{ id, title, date, participants_count, bilan_photo_ouverture, photos: string[] }]`
- `planAnnonce({ event, passe }) → Diapo[]`, `planStoryJourJ({ event, passe }) → Diapo[]` (1 élément)
- Diapo : `{ type: 'affiche', affiche, fond, titre, quand }` · `{ type: 'attente', photo, floute, titre, points }` · `{ type: 'infos', fond, cartes: [{ icone: 'calendrier'|'lieu'|'de'|'biscuit', titre, detail }] }` · `{ type: 'souvenir', fond, nombre, photos: [≤3], legende }` · `{ type: 'attend', quand }` · story `{ type: 'jourJ', fond, formule, titre, affiche, ligne }`

- [ ] **Step 1:** Dans `regles.js`, ajouter `export` devant `const jourMois` et `const lieuCourt` (aucun autre changement).

- [ ] **Step 2: Tests (échouent)** — `annonce-regles.test.js` :

```js
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
```

- [ ] **Step 3:** `npm test` → échec (module manquant).

- [ ] **Step 4: Écrire `annonce-regles.js`**

```js
/**
 * Règles de l'annonce d'un événement (carrousel 4:5) et de la story du jour J.
 * Fonctions pures, testées par `npm test`. Dessin : annonce.js.
 * Conception : docs/superpowers/specs/2026-10-23-annonce-evenement-design.md
 */
import { typeEvenement, dateLocale, quandRendezVous, lieuCourt, jourMois } from './regles.js'

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const heure = d => `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`
const heureTexte = t => { const [h, m] = String(t).split(':').map(Number); return `${h}h${m ? String(m).padStart(2, '0') : ''}` }

export const TEXTES_TYPES = {
  soiree: {
    titre: 'Une soirée pour jouer entre amis !',
    points: ['Des dizaines de jeux à découvrir', 'Des bénévoles pour vous expliquer les règles', 'Débutants ou joueurs aguerris, chacun trouve son jeu'],
  },
  famille: {
    titre: 'Un après-midi pour jouer en famille !',
    points: ['Des jeux pour petits et grands', 'Des bénévoles pour vous expliquer les règles', 'Venez en famille ou entre amis'],
  },
}
export const INFOS_TYPES = [
  { titre: 'Gratuit et ouvert à tous', detail: 'adhérents ou non, débutants bienvenus' },
  { titre: 'Apportez à grignoter', detail: 'ou à boire, à partager' },
]

/** Textes de l'annonce : ceux mémorisés pour l'événement, sinon les textes types. */
export function textesAnnonce(event) {
  const type = typeEvenement(event.title) === 'famille' ? 'famille' : 'soiree'
  const base = TEXTES_TYPES[type]
  const a = event.annonce || {}
  return {
    titre: a.titre ?? base.titre,
    points: [0, 1, 2].map(i => (a.points?.[i] ?? base.points[i])),
    infos: [0, 1].map(i => ({ titre: a.infos?.[i]?.titre ?? INFOS_TYPES[i].titre, detail: a.infos?.[i]?.detail ?? INFOS_TYPES[i].detail })),
  }
}

export function formuleJourJ(dateTexte) {
  const h = dateLocale(dateTexte).getHours()
  if (h >= 17) return "C'est ce soir !"
  if (h >= 12) return "C'est cet après-midi !"
  return "C'est ce matin !"
}

export function lignesQuand(event) {
  const d = dateLocale(event.date)
  return {
    jour: `${JOURS[d.getDay()]} ${jourMois(d)}`,
    heure: event.end_time ? `de ${heure(d)} à ${heureTexte(event.end_time)}` : `à partir de ${heure(d)}`,
  }
}

/** Dernier événement passé du même genre, avec participants (> 0) et au moins une photo. */
export function dernierEvenementSemblable(event, passes) {
  const type = typeEvenement(event.title)
  const avant = dateLocale(event.date)
  return passes
    .filter(p => typeEvenement(p.title) === type && dateLocale(p.date) < avant
      && Number(p.participants_count) > 0 && (p.photos || []).length > 0)
    .sort((a, b) => dateLocale(b.date) - dateLocale(a.date))[0] || null
}

function photosDuPasse(passe) {
  if (!passe) return { ouverture: null, autre: null, polaroids: [] }
  const ph = passe.photos
  const ouverture = ph.includes(passe.bilan_photo_ouverture) ? passe.bilan_photo_ouverture : ph[0]
  const reste = ph.filter(p => p !== ouverture)
  const autre = reste[0] || ouverture
  const polaroids = [...reste.filter(p => p !== autre), autre, ouverture].filter((p, i, t) => p && t.indexOf(p) === i).slice(0, 3)
  return { ouverture, autre, polaroids }
}

const genre = type => (type === 'famille' ? 'Après-midi en famille' : 'Soirée jeux')

export function planAnnonce({ event, passe }) {
  const type = typeEvenement(event.title)
  if (type === 'permanence') return []
  const textes = textesAnnonce(event)
  const quand = lignesQuand(event)
  const ph = photosDuPasse(passe)
  const affiche = event.image_url || null
  const fondFlou = ph.ouverture || affiche || null
  const plan = [
    { type: 'affiche', affiche, fond: ph.ouverture || null, titre: event.title, quand: quandRendezVous(event) },
    { type: 'attente', photo: ph.ouverture || affiche || null, floute: !ph.ouverture, titre: textes.titre, points: textes.points.filter(p => p && p.trim()) },
    {
      type: 'infos', fond: ph.autre || fondFlou,
      cartes: [
        { icone: 'calendrier', titre: quand.jour, detail: quand.heure },
        { icone: 'lieu', titre: lieuCourt(event.location), detail: '' },
        ...textes.infos.map((x, i) => ({ icone: i === 0 ? 'de' : 'biscuit', titre: x.titre, detail: x.detail })).filter(c => c.titre && c.titre.trim()),
      ],
    },
  ]
  if (passe) {
    plan.push({ type: 'souvenir', fond: ph.ouverture, nombre: Number(passe.participants_count), photos: ph.polaroids, legende: `${genre(type)} du ${jourMois(dateLocale(passe.date))}` })
  }
  plan.push({ type: 'attend', quand: quandRendezVous(event) })
  return plan
}

export function planStoryJourJ({ event, passe }) {
  const d = dateLocale(event.date)
  const lieu = lieuCourt(event.location)
  const debut = event.end_time ? `de ${heure(d)} à ${heureTexte(event.end_time)}` : heure(d)
  const ph = photosDuPasse(passe)
  return [{
    type: 'jourJ',
    fond: event.image_url || ph.ouverture || null,
    formule: formuleJourJ(event.date),
    titre: event.title,
    affiche: event.image_url || null,
    ligne: lieu ? `${debut} · ${lieu}` : debut,
  }]
}
```

Attention : les tests attendent `plan[0].fond === 'p2'` (photo d'ouverture du passé, pour le fond flouté derrière l'affiche quand il n'y a pas d'affiche — avec affiche, la diapo 1 floute l'affiche elle-même) et, pour la permanence, la ligne `de 10h à 12h · 419 Grande rue à Coligny` (`lieuCourt` ne retire que « à la / à l' »). Ajuster le code (pas les valeurs attendues) si un test échoue, et le signaler.

- [ ] **Step 5:** `npm test` → tous verts (anciens + nouveaux). `npm run lint` → 0 erreur.
- [ ] **Step 6:** Commit `feat: règles de l'annonce d'un événement et de la story du jour J`.

---

### Task 2: Colonne `events.annonce`

**Files:** Create `supabase/migrations/20261023_annonce_evenement.sql`.

```sql
-- ════════════════════════════════════════════════════════════════════════════
-- Annonce d'un événement (23 octobre 2026) : textes modifiables de l'annonce
-- (titre, 3 points « Ce qui vous attend », 2 infos pratiques), mémorisés par
-- événement. Null = textes types. Colonne d'une table existante : droits hérités.
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.events add column if not exists annonce jsonb;
```

- [ ] Appliquer : `supabase db query --linked -f supabase/migrations/20261023_annonce_evenement.sql` ; vérifier `select column_name, data_type from information_schema.columns where table_name='events' and column_name='annonce'` → `annonce | jsonb`. Commit.

---

### Task 3: Dessin de l'annonce et de la story du jour J

**Files:** Create `src/services/diapos/annonce.js`.

**Interfaces:** Consumes the Diapo shapes of Task 1 and `dessin.js` (`COULEURS, chargerImage, chargerPolices, nouveauCanvas, recouvrir, dessinerFlou (ou flou + liberer), degradeBas, voile, rectArrondi, police, couperLignes, etiquette, pastille, texteContoure, ombrePleine, liberer`). Produces `dessinerAnnonce(plan, onDiapo?)` and `dessinerStoryJourJ(plan, onDiapo?)` with **exactly the same contract as `dessinerCarrousel` / `dessinerStory`** (read `carrousel.js` and `story.js` first and mirror their structure: `chargerPolices`, logo `/social/logo-feuille.png`, fond encre puis dessin, callback `onDiapo(canvas, i)` puis libération, `ABANDON` si présent).

Mise en page : **reproduire la maquette** `~/Desktop/PERSO/Ludothèque/Maquette bilan soirée jeux/annonce.html` (CSS = valeurs exactes en pixels, 1080 × 1350 et story 1080 × 1920) ; images de référence `annonce-01..05.png`, `annonce-story-01.png`.
- `affiche` : fond = affiche floutée (`dessinerFlou`) + voile `rgba(15,23,42,.45)` ; étiquette « Prochain rendez-vous ! » (taille 64, centrée en haut, y≈150, angle -2) ; affiche hauteur 1000, centrée, y≈270, contour encre 6, ombre pleine encre 18, angle 1,5°. **Sans affiche** : fond = `fond` flouté ou bleu ; pastille ; étiquette « Prochain rendez-vous ! » ; `titre` en Bricolage 800 crème (≤ 3 lignes, 110→84 px) ; `quand` en Poppins 700 52 px.
- `attente` : `photo` plein cadre (floutée si `floute`) + `degradeBas` ; pastille ; carte crème (bas 90, côtés 70, angle -1°, contour 6, ombre orange 16, rayon 34, marges 46/52) : « CE QUI VOUS ATTEND » (Poppins 800 26, orange, interlettrage 0.18em), `titre` Bricolage 84 (≤ 3 lignes), puis chaque point Poppins 600 34 précédé d'un « ✦ » bleu (dessiné en texte : c'est un glyphe, pas un émoji couleur). Hauteur de carte calculée d'après le contenu.
- `infos` : fond flouté + voile bleu `.62` ; pastille ; titre « Les infos » crème + « pratiques » orange, Bricolage 120 à y≈180 ; cartes réparties entre y=420 et H−110 (crème, contour 5, ombre encre 12, rayon 30, marges 36/40) avec pastille d'icône 110 × 110 (contour 4, rayon 22, teintes `#fdf1ea`, `#f0f7f9`, `#ecfdf5`, `#fffbeb`) et pictogramme `Path2D` trait 2.2 (échelle 62/24) — tracés : calendrier `M3 4h18v18H3z` + `M16 2v4M8 2v4M3 10h18` (orange) ; repère `M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z` + cercle (12,10,r3) (bleu) ; dé `rect 3,3,18,18,r3` + 3 points pleins (vert `#10b981`) ; biscuit `M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5` + petits points (`#d97706`). Titre de carte Bricolage 56, détail Poppins 600 30 `#475569`.
- `souvenir` : fond flouté + voile bleu ; pastille ; « La dernière fois, » Poppins 700 52 centré ; « nous étions » crème + « N ! » orange, Bricolage 128 ; 3 polaroïds (fond crème, marges 18/18/64, contour 5, ombre encre 14) aux positions/angles de la maquette (`.p1/.p2/.p3`), photos en recouvrement ; `legende` Poppins 700 36 centré en bas (bas 64). Avec 1 ou 2 photos : n'afficher que celles-là (p1, p2).
- `attend` : fond bois (`/social/fond-bois.jpg`) ; pastille ; « On vous attend ! » texteContoure 176 centré (2 lignes si besoin) ; `quand` Bricolage 64 ; deux pastilles crème « Enregistrez ce post » / « Identifiez un ami » (Poppins 800 30, contour 5, ombre encre 9) ; `ludothequedecoligny.fr` en bas.
- `jourJ` (story) : fond = `fond` flouté + voile encre (ou bleu) ; pastille à y=270 ; étiquette `formule` (taille 150, x=70, y≈400, angle -3) ; `titre` Bricolage 74 crème (≤ 2 lignes, y≈640) ; affiche (si présente) hauteur 700, centrée, y≈790, angle 3°, contour + ombre ; `ligne` Poppins 700 38 centré à y≈1520 (au-dessus de 1580). Sans affiche : `titre` plus grand (110) centré verticalement et `ligne` sous le titre.

- [ ] Écrire le module ; vérifier visuellement (script jetable dans le dossier de travail git-ignoré, site lancé, connexion par variables d'environnement, données réelles : Soirée Halloween — `events` titre ilike '%halloween%' — et l'après-midi famille du 24/10 sans affiche ; dernier passé du même genre construit comme `dernierEvenementSemblable` l'attend, photos par `event_photos` triées par date) ; comparer à `annonce-01..05.png` / `annonce-story-01.png` ; `npm run lint` ; commit.

---

### Task 4: Fenêtre « Annonce »

**Files:** Create `src/components/admin/VueAgrandie.jsx`, `src/components/admin/annonce/PublicationAnnonce.jsx` ; Modify `src/components/admin/bilan/PublicationBilan.jsx`, `src/pages/admin/Evenements.jsx`.

1. **`VueAgrandie`** : déplacer tel quel le composant `VueAgrandie` de `PublicationBilan.jsx` dans `src/components/admin/VueAgrandie.jsx` (export par défaut, mêmes props `images, index, onIndex, onFermer`) ; `PublicationBilan` l'importe. Aucun changement de comportement.
2. **`PublicationAnnonce`** (props : `event`, `texte`, `onTexteChange`, `onEventChange(patch)`) — calquée sur `PublicationBilan.jsx` (lire ce fichier et reprendre ses mécanismes : numéro d'aperçu, `try/catch/finally`, `liberer`, fichiers de story préparés, `navigator.share` premier `await`, repli téléchargement, messages d'erreur, rollback des écritures).
   - Au montage : charger les événements passés (`events` dont `date` < aujourd'hui, `archived_at` indifférent) avec leurs photos (`event_photos` par `event_id`, ordre de création) ; `passe = dernierEvenementSemblable(event, passes)`.
   - Champs (soirée / famille seulement) : titre ; 3 points ; 2 infos (titre + détail) — valeurs de `textesAnnonce(event)` ; enregistrement dans `events.annonce` (debounce ~600 ms, erreur → message + retour à l'ancienne valeur) et `onEventChange({ annonce })` ; bouton « Remettre les textes proposés » (`annonce: null`).
   - Aperçu carrousel : `dessinerAnnonce(planAnnonce(...), onDiapo)` → data URLs JPEG 0,9 → `<SocialPostPreview text={texte} imageUrls={…} />`. Aperçu story : `dessinerStoryJourJ` → data URL + `File` préparé ; vignette cliquable → `VueAgrandie`.
   - Texte de la publication : textarea (props `texte` / `onTexteChange`).
   - Boutons : « Publier sur Facebook & Instagram (N) » (soirée/famille) — redessin diapo par diapo, envoi `uploadSocialBlob(blob, 'annonces/{id}/annonce-{horodatage}-NN.jpg')`, puis `publierSurReseaux({ message: texte, imageUrls })` ; « Enregistrer la story du jour J ».
   - Permanence : seulement l'aperçu de la story et son bouton.
3. **`Evenements.jsx`** : dans la fenêtre ouverte par `openFbModal` (rendu `{fbModal.show && …}`), remplacer le contenu (aperçu de l'affiche, textarea, bouton « Publier », « affiche » à importer) par `<PublicationAnnonce key={fbModal.event.id} event={fbModal.event} texte={fbText} onTexteChange={setFbText} onEventChange={…} />` (mise à jour de `fbModal.event` et des listes d'événements, comme `majBilanEvent` pour le bilan). Garder l'en-tête et la fermeture. Retirer ce qui ne sert plus (`handlePublishFb`, `publishingFb`, `fbSuccess`, `apercuAffiche`… — vérifier chaque symbole avec grep avant suppression ; `openFbModal` reste pour le texte proposé). Renommer le titre de la fenêtre en « Annonce » (le bouton garde « Publier sur Facebook & Instagram »).
4. Suppression d'un événement (`confirmDelete`) : effacer aussi `annonces/{id}/` dans `event-images` (même fonction que `effacerDiapositivesBilan`, généralisée par préfixe).

- [ ] Vérification navigateur (écritures, stockage et Make interceptés) : Halloween → 5 diapositives fidèles à la maquette, défilables ; modifier un point → aperçu mis à jour, PATCH `annonce` intercepté ; publier → 5 envois `annonces/{id}/` + Make `photo_count` 5 ; story : bouton → `navigator.share` simulé appelé avec 1 fichier ; permanence (07/11) → story seule ; après-midi famille (24/10, sans affiche) → diapo 1 titre ; ordinateur 1280 et téléphone 390 ; console propre. `npm run lint`, `npm test`, build. Commit.

---

### Task 5: Documentation

**Files:** Modify `CLAUDE.md` : ligne `annonce/PublicationAnnonce` dans le tableau des briques de l'espace de gestion, `VueAgrandie` aussi ; une phrase après le paragraphe sur `src/services/diapos/` : « L'annonce d'un événement (carrousel 5 diapositives + story du jour J) est dessinée par `annonce-regles.js` / `annonce.js` ; textes modifiables mémorisés dans `events.annonce`. » Commit. Pas de push.
