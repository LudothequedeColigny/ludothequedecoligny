# Nouveaux jeux — visuels au style des annonces et bilans (conception + plan)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Remplacer les images de l'onglet « Nouveaux jeux » (couverture carrée + jaquettes carrées sur fond bois) par un carrousel 4:5 au style des annonces et bilans, validé par Victor le 23/10/2026.

**Référence visuelle (validée) :** `Bureau/PERSO/Ludothèque/Maquette bilan soirée jeux/nouveaux-jeux-maquette/` (`nj-01..10.jpg`, `planche-nouveaux-jeux.jpg`), produite par le code jetable `.superpowers/maquette-nj/maquette.js` (à reprendre et nettoyer, pas à copier tel quel). Règle de Victor : **l'aperçu est l'image exacte publiée**, défilable.

## Contenu (validé)

Carrousel 1080 × 1350, 10 images au plus :
1. **Couverture** : fond = mosaïque floutée des jaquettes + voile bleu `rgba(26,95,122,0.72)` ; pastille ; étiquette orange « Du nouveau à la ludothèque ! » ; éventail des 5 premières jaquettes **détourées en autocollant** (liseré blanc, contour encre, ombre pleine bleue/orange en alternance, penchées −12°…12°) ; le nombre de jeux cochés en grand (contour encre, ombre orange) ; « nouveaux jeux à emprunter ! » (« nouveau jeu à emprunter ! » pour 1).
2. **Une image par jeu, 8 au plus** : fond = la boîte détourée et recadrée, floutée (sans son fond blanc) + voile encre 0,5 ; pastille ; étiquette « Nouveau ! » ; la boîte en autocollant (liseré blanc 16, contour encre 5, ombre orange 18, penchée ±2° en alternance) ; nom (Bricolage 800, 2 lignes au plus) ; pastilles crème « 2 à 4 joueurs », « Dès 8 ans » (seulement les valeurs cohérentes : min et max > 0 et max ≥ min ; âge > 0 ; pas de durée).
3. **Dernière image** : exactement la diapositive « À votre tour ! Prochaine permanence » du bilan de permanence (même dessin, mosaïque des jaquettes).

Détourage : retirer le blanc (r, g, b > 228, écart < 18) **relié aux bords** (remplissage depuis les bords), puis recadrer sur les pixels restants ; **sécurité** : si plus de 85 % de l'image serait retirée (boîte blanche sur fond blanc), garder l'image d'origine non détourée. Image limitée à 900 px de côté pour le calcul. Jaquette absente ou illisible : fond bleu, pas d'autocollant.

Au-delà de 8 jeux cochés : 8 images de jeux (les 8 premiers), tous les jeux restent dans le texte ; le nombre de la couverture = tous les jeux cochés ; message d'information dans l'onglet.

Texte proposé : inchangé dans sa forme, mais la prochaine permanence vient de `prochainePermanence` de `permanence-regles.js` (événement saisi, sinon Paramètres) pour concorder avec la dernière image.

## Global Constraints

- Couleurs `COULEURS` de `dessin.js` ; Bricolage Grotesque 800 / Poppins ; pas de `ctx.filter` (flou par réduction par moitiés puis `dessinerFlou`) ; libérer tous les canvases ; une image pleine taille à la fois (téléphones).
- Images publiées déposées dans notre stockage (`uploadSocialBlob`, dossier `nouveaux-jeux/`) avant `publierSurReseaux` ; jamais `data:`/`blob:`.
- Statuts `annonces_jeux` (annonce / écarté) : comportement inchangé.
- Aucune écriture réelle ni publication pendant les essais (interceptions). Code et commentaires en français ; `npm run lint` 0 erreur (5 avertissements connus) ; `npm test` vert.
- Commits `git -c user.email=victor.guyon@hotmail.fr commit`, message terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais de push.

## File Structure

| Fichier | Rôle |
|---|---|
| `src/services/diapos/dessin.js` (modifié) | `flouDoux(ctx, source, w, h)` : réduction par moitiés puis `dessinerFlou` (déjà écrit en local dans `permanence.js` : le remplacer par l'outil partagé) |
| `src/services/diapos/permanence.js` (modifié) | utilise `flouDoux` ; exporte le dessin de la diapositive `prochaine` (et le fond mosaïque) pour réutilisation |
| `src/services/diapos/nouveaux-jeux-regles.js` (créé) + `.test.js` | `detailsJeu(jeu): string[]`, `planNouveauxJeux({ jeux, prochaine }): Diapo[]`, `MAX_IMAGES_JEUX = 8` |
| `src/services/diapos/nouveaux-jeux.js` (créé) | `detourer`, `autocollant`, dessins `couverture` / `jeu`, `dessinerNouveauxJeux(plan, onDiapo)` (contrat de `dessinerPlan`) |
| `src/components/admin/NouveauxJeux.jsx` (modifié) | aperçu exact défilable (portrait), publication image par image, texte avec la prochaine permanence partagée |
| `CLAUDE.md` (modifié) | ligne `NouveauxJeux` mise à jour |

Formes des diapositives : `{ type: 'couverture', jaquettes: string[] (≤ 5), mosaique: string[] (8), nombre, phrase }`, `{ type: 'jeu', nom, jaquette: string|null, infos: string[], index }`, `{ type: 'prochaine', mosaique, prochaine }`.

---

### Task 1: Règles et dessin

- [ ] Tests d'abord (`nouveaux-jeux-regles.test.js`) : `detailsJeu` (2–4 → « 2 à 4 joueurs » ; 2–2 → « 2 joueurs » ; 1–1 → « 1 joueur » ; min 2 / max 1 → pas de joueurs ; âge 0 → pas d'âge ; « Dès 8 ans ») ; `planNouveauxJeux` : 3 jeux → couverture + 3 jeux + prochaine ; 12 jeux → couverture (nombre 12) + 8 jeux + prochaine = 10 ; couverture : 5 jaquettes au plus, jeux sans jaquette ignorés ; mosaïque 8 cases répétées ; phrase au singulier pour 1 ; `[]` sans jeu.
- [ ] `flouDoux` dans `dessin.js`, `permanence.js` adapté (rendu du bilan de permanence inchangé : le vérifier par une image avant/après).
- [ ] `nouveaux-jeux.js` d'après la maquette, avec la sécurité de détourage.
- [ ] Rendu réel (lecture seule, script Playwright jetable dans le dossier SDD, connexion `ADMIN_EMAIL`/`ADMIN_PASSWORD` sur la ligne de commande uniquement) des 8 jeux actuels + cas : 1 jeu, 12 jeux simulés (répétés), jeu sans jaquette, boîte blanche simulée (image toute blanche avec un petit carré coloré au centre → pas de détourage abusif). Comparer à la maquette, regarder chaque image.
- [ ] lint, test, build ; commit « feat: nouveaux jeux — règles et dessin au style des annonces ».

### Task 2: Onglet « Nouveaux jeux »

- [ ] Retirer la couverture carrée, `useApercusCarres`, `uploadSquareVersion` et le fond bois de cet onglet (seulement ici).
- [ ] Aperçu : `planNouveauxJeux` dessiné par `dessinerNouveauxJeux` (JPEG 0,9, une image à la fois, aperçu numéroté qui s'abandonne si la sélection change, comme `PublicationAnnonce`) ; `SocialPostPreview … portrait` ; « Mise à jour de l'aperçu… » pendant le dessin ; publication désactivée pendant le dessin.
- [ ] Publication : redessine **le plan affiché**, image par image → `uploadSocialBlob(blob, 'nouveaux-jeux/nouveaux-jeux-{horodatage}-NN.jpg')` → `publierSurReseaux({ message, imageUrls, extra: { jeux } })` → statuts `annonces_jeux` comme aujourd'hui. Libellé « Publier (N images) ».
- [ ] Texte : `prochainePermanence` partagée (lire `events` permanences non archivées + `settings` déjà chargés) ; format conservé.
- [ ] Message au-delà de 8 jeux : « N jeux cochés : la couverture les compte tous, mais seuls les 8 premiers ont leur image (Instagram limite un carrousel à 10 images). Tous sont cités dans le texte. »
- [ ] Vérification navigateur (écritures, stockage, Make interceptés) à 1280 et 390 : aperçu défilable identique au rendu de la tâche 1 ; décocher un jeu → aperçu mis à jour ; publier → N dépôts `nouveaux-jeux/…`, Make `photo_count` N, adresses `supabase.co`, puis l'upsert `annonces_jeux` intercepté. Regarder les photos.
- [ ] lint, test, build ; commit « feat: onglet Nouveaux jeux — carrousel 4:5 au style des annonces ».

### Task 3: Documentation (contrôleur)

`CLAUDE.md` : ligne `NouveauxJeux` (« carrousel 4:5 : couverture, une image par jeu (8 au plus, boîte détourée en autocollant), prochaine permanence ») et mention de `nouveaux-jeux-regles.js` / `nouveaux-jeux.js` après le paragraphe des diapos ; retirer « couverture dessinée + jaquettes en carrousel » et la mention fond bois pour les jaquettes si elle ne concerne plus que d'autres écrans (vérifier : le fond bois reste utilisé par les posts libres et les affiches).
