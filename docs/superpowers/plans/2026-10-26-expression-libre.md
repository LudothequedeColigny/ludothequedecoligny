# Image « expression libre » dans les bilans (conception + plan)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dans la fenêtre Bilan (soirée / après-midi famille et permanence), pouvoir ajouter une image avec une phrase libre (« Peu de participants mais une super ambiance ! »), sur une photo du bilan ou un fond flouté. Validé par Victor le 26/10/2026.

**Maquette validée :** `Bureau/PERSO/Ludothèque/Maquette bilan soirée jeux/expression-libre-maquette/` (`expression-libre-01..04.jpg`), produite par le code jetable `.superpowers/maquette-libre/maquette.js` (à reprendre et nettoyer). Règle de Victor : l'aperçu est l'image exacte publiée.

## Règles (validées)

- Champ « Expression libre (facultatif) » dans la fenêtre Bilan ; vide = pas d'image. Texte sur 3 lignes au plus dans l'image (taille réduite de 96 à 60 px pour tenir, puis « … »). Saisie limitée à 120 caractères.
- Fond : « Fond flouté » (défaut) ou une des photos du bilan (`event_photos`, déjà passées par le floutage des visages).
  - Photo choisie : photo plein cadre + `degradeBas` ; carte en bas (carrousel : centre à `H − 90 − hCarte/2` ; story : au-dessus de la zone Instagram du bas, centre à `1580 − 60 − hCarte/2`).
  - Fond flouté, soirée : photo d'ouverture du bilan floutée + voile `rgba(26,95,122,0.62)` ; carte au centre.
  - Fond flouté, permanence : la mosaïque floutée des jaquettes (`fondMosaique` de `permanence.js`) ; carte au centre.
- Carte : crème, contour encre 6, rayon 34, ombre pleine orange 16, penchée −1,5°, 940 px de large, texte Bricolage 800 encre centré. Pastille en haut à gauche (story : sous la zone des 250 px).
- Place : **soirée/famille** juste avant « Merci » (carrousel et story) ; **permanence** juste avant « Prochaine permanence ».
- Carrousel des soirées : 10 images au plus ; avec l'expression libre, le nombre de jeux retenus baisse d'autant (le dernier jeu laisse sa place). Story : pas de limite (la grille garde ses jeux). Texte de publication : inchangé (il cite déjà tous les jeux).
- Mémorisé par événement : colonne `events.bilan_expression jsonb` = `{ "texte": string, "photo": string|null }` (null = fond flouté) ; `null` en base = pas d'expression. Enregistré après un court délai de saisie, avec retour en arrière si l'écriture échoue (même mécanisme que les textes de la fenêtre Annonce, `PublicationAnnonce.jsx`). Photo choisie supprimée du bilan → retour au fond flouté.

## Global Constraints

- Pas de `ctx.filter` ; `flouDoux`/`dessinerFlou` ; libérer les canvases ; une image à la fois.
- Images publiées déposées dans notre stockage avant Make (circuits existants inchangés).
- Aucune écriture réelle ni publication pendant les essais (interceptions) ; la migration n'est **pas** appliquée pendant les tâches.
- Code et commentaires en français ; `npm run lint` 0 erreur (5 avertissements connus) ; `npm test` vert.
- Commits `git -c user.email=victor.guyon@hotmail.fr commit`, message terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais de push.

## File Structure

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20261026_bilan_expression.sql` (créé) | `alter table public.events add column if not exists bilan_expression jsonb;` (colonne d'une table existante : droits hérités) |
| `src/services/diapos/regles.js` (modifié) | `planCarrousel` / `planStory` : diapositive `{ type: 'libre', texte, photo, fond }` avant `merci` si `donnees.expression?.texte?.trim()` ; jeux du carrousel limités pour rester à 10 images |
| `src/services/diapos/permanence-regles.js` (modifié) | `planBilanPermanence({ …, expression })` : `{ type: 'libre', texte, photo, mosaique }` avant `prochaine` |
| tests `regles.test.js`, `permanence-regles.test.js` (modifiés) | cas ci-dessous |
| `src/services/diapos/libre.js` (créé) | `dessinerLibre(ctx, d, logo, { hauteur, story })` partagé |
| `carrousel.js`, `story.js`, `permanence.js` (modifiés) | type `libre` ajouté à leurs dessins |
| `src/components/admin/bilan/PublicationBilan.jsx`, `PublicationBilanPermanence.jsx` (modifiés) | champ texte + choix du fond, enregistrement, aperçu |
| `src/pages/admin/Evenements.jsx` (modifié) | passe les photos du bilan et `onEventChange` à `PublicationBilanPermanence` si besoin |
| `CLAUDE.md` (modifié) | mention de l'expression libre |

Forme : `{ type: 'libre', texte: string, photo: string|null, fond: string|null }` (soirée : `fond` = photo d'ouverture à flouter si `photo` est null) ; permanence : `{ type: 'libre', texte, photo, mosaique }`.

---

### Task 1: Règles, dessin, migration

- [ ] Tests d'abord :
  - soirée, 6 jeux + participants, sans expression → 10 images (inchangé) ; avec expression → 10 images, 5 jeux, `libre` juste avant `merci` ; sans participants + 6 jeux + expression → 10 images (6 jeux) ; texte vide ou espaces → pas de `libre` ; `photo` absente des photos du bilan → `photo: null` ;
  - story : `libre` avant `merci`, grille inchangée ;
  - permanence : `libre` entre `grille` et `prochaine` ; sans expression → 3 images (inchangé).
- [ ] `libre.js` d'après la maquette (texte ajusté sur 3 lignes, « … » au-delà) ; brancher le type `libre` dans `carrousel.js`, `story.js` (zones Instagram : rien dans les 250 px du haut ni les 340 px du bas), `permanence.js`.
- [ ] Migration créée, non appliquée.
- [ ] Rendus réels (lecture seule) : soirée du 02/10 (événement 38) avec photo et en fond flouté, story, permanence du 03/10 (39) ; texte long (3 lignes et coupé). Comparer à la maquette.
- [ ] lint, test, build ; commit « feat: image expression libre — règles et dessin ».

### Task 2: Fenêtres Bilan

- [ ] Dans les deux fenêtres, section « Expression libre (facultatif) » : champ texte (120 caractères, compteur), choix du fond (« Fond flouté » + vignettes des photos du bilan, même composant de choix que les photos d'ouverture si possible), aide « S'ajoute juste avant le Merci » / « … avant Prochaine permanence » et, pour les soirées, « Avec 10 images, le dernier jeu laisse sa place ».
- [ ] Enregistrement dans `events.bilan_expression` (délai de saisie, retour arrière en cas d'échec, mise à jour de l'événement à l'écran par `onEventChange`, sans redessiner tout le carrousel à chaque lettre au-delà du nécessaire : l'aperçu suit le texte avec le délai existant).
- [ ] Aperçu et publication : les plans reçoivent `expression` ; rien d'autre ne change dans les circuits de publication.
- [ ] Vérification navigateur (écritures, stockage, Make interceptés ; colonne absente en base : écritures interceptées) à 1280 et 390, `/admin/evenements?bilan=38` et `?bilan=39` : taper une phrase → l'image apparaît avant « Merci » / « Prochaine permanence » ; choisir une photo → fond photo ; vider → l'image disparaît ; soirée à 10 images → un jeu de moins ; publier → nombre d'images et `photo_count` cohérents. Regarder les photos.
- [ ] lint, test, build ; commit « feat: fenêtres Bilan — expression libre ».

### Task 3: Documentation (contrôleur)

`CLAUDE.md` : ligne `bilan/PublicationBilan` et `bilan/PublicationBilanPermanence` (expression libre, `events.bilan_expression`).
