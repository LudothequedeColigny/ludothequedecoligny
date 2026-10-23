# Bilan d'une permanence — conception

Date : 23 octobre 2026 · Étape 3 du plan d'automatisation de la communication
(étape 1 : bilan des soirées, étape 2 : annonce + story du jour J, en ligne ;
étape 4 : rappels push).

## Objectif

Depuis la fenêtre « Bilan » d'une **permanence passée** (écran Communication), fabriquer
automatiquement un **carrousel de 3 diapositives 4:5** (1080 × 1350) à partir des jeux
empruntés ce jour-là, et le publier par le scénario Make existant (`publierSurReseaux`).
**Pas de story** (choix de Victor, 23/10/2026).

Maquette validée par Victor le 23/10/2026 :
`Bureau/PERSO/Ludothèque/Maquette bilan soirée jeux/permanence.html`
(+ `permanence-01..03.png`). Elle fait référence pour l'aspect. Règle de Victor :
**l'aperçu est l'image exacte publiée**, et il se fait défiler. Jamais qui a emprunté quoi.

## Quels événements

Une permanence = titre contenant « permanence » (sans accents, insensible à la casse).
`typeEvenement` renvoie `'permanence'` pour tout titre qui n'est ni soirée ni famille :
le bilan de permanence ne s'applique qu'aux titres contenant vraiment « permanence ».
Pour les autres événements « ni soirée ni famille », la fenêtre garde le message actuel
(« Le bilan de cet événement n'est pas encore proposé. »).

## Données

- **Prêts du jour** : lignes de `loans` (en cours) **et** `loan_history` (rendus) dont
  `loan_date` (date sans heure, `YYYY-MM-DD`) = jour de la permanence (`events.date`,
  10 premiers caractères). Jointure `games(id, name, image_url)` seulement — aucune
  donnée d'adhérent n'est lue.
- **Un prêt rendu le jour même** (`loan_history.return_date` = `loan_date` : correction ou
  échange sur place) **n'est pas compté**. **Nombre** (diapo 1, texte, ligne d'aide) = nombre
  de **jeux distincts** restants (par `game_id`) ; **grille** (diapo 2) = ces mêmes jeux, triés
  par nom (ordre alphabétique français, `localeCompare('fr')`) : nombre, grille et texte concordent.
- **Jaquettes** : `games.image_url`. Toutes sont aujourd'hui chez nous (Supabase) ;
  une jaquette absente ou hébergée ailleurs (`!estChezNous`) n'est pas dessinée
  (case avec le nom seul).
- **Prochaine permanence** (diapo 3), la plus proche dont la date est **après aujourd'hui** :
  1. l'événement `events` non archivé dont le titre contient « permanence » : jour
     (`dateLocale`), heure de début (`date`), heure de fin (`end_time` si présente),
     lieu (`lieuCourt(location)`) ;
  2. à défaut, calculée à partir des Paramètres (`settings`) : créneaux
     `horaire_1_*` (toujours actif) et `horaire_2_*` (si `horaire_2_actif = 'true'`),
     chacun = `jour` (« Samedi »), `rang` (1–4, 5 = dernier du mois), `debut`, `fin` ;
     adresse = `adresse_rue` + « à » + `adresse_ville` ;
  3. sans aucune des deux : la carte affiche seulement « Bientôt : surveillez nos
     publications » (pas d'erreur).
- **Sans prêt** ce jour-là (ou seulement des prêts rendus le jour même) : pas de carrousel ; message « Aucun prêt enregistré à la
  date de cette permanence : pas de bilan à publier. »

Limite connue (à dire à Victor) : les prêts n'ont qu'une date ; un prêt saisi avec la
date du jour d'une permanence est compté dans son bilan.

## Diapositives

| N° | Contenu |
|---|---|
| 1 | Fond : **mosaïque** des jaquettes des jeux empruntés (grille 4 colonnes, 8 cases, jaquettes répétées s'il y en a moins de 8 ; aplat bleu si aucune), floutée (`dessinerFlou`, jamais `ctx.filter`) + voile bleu `rgba(26,95,122,.72)`. Pastille « Ludothèque de Coligny » en haut à gauche. Centré : « {Jour}, à la permanence… » (Poppins 700, 60 px ; Jour = jour de la semaine de la permanence, majuscule initiale) ; le **nombre** (Bricolage 800, ~540 px, contour encre 10 px, ombre pleine orange 22 px) ; « jeux sont partis jouer dans les familles ! » (Bricolage 800, 92 px ; 1 prêt : « jeu est parti jouer dans les familles ! »). |
| 2 | Fond crème. Pastille. Titre « Ils sont partis **jouer :** » (Bricolage 800, 110 px, « jouer : » en orange). Grille 4 colonnes de cases blanches (contour encre 5 px, rayon 26, ombre pleine 11 px bleue, orange une case sur deux), jaquette entière dedans (`contain`), nom dessous (Bricolage 800, 28 px, centré, 2 lignes au plus avec « … »). 12 cases au plus (3 lignes) : au-delà de 12 jeux, 11 jaquettes + une 12ᵉ case « … et N autres » (N = total − 11). La grille tient entre y = 340 et y = 1260 : hauteur des cases réduite si 3 lignes. Jeu sans jaquette : son nom centré dans la case. |
| 3 | Fond : même mosaïque floutée + voile bleu. Pastille. « À votre tour ! » (Poppins 700, 56 px, crème) ; « Prochaine permanence » (Bricolage 800, ~140 px, crème, contour encre 5 px, ombre orange 14 px). Carte crème (contour 6 px, rayon 34, ombre pleine orange 16 px) : « Samedi 7 novembre » (Bricolage 800, 74 px), « de 10h à 12h » (Poppins 700, 40 px, bleu), adresse (Poppins 600, 32 px, `#475569`). En bas : « Pas encore adhérent ? **L'adhésion se fait sur place**, pour tout le foyer. » puis « Toutes les infos : **ludothequedecoligny.fr/adherer** » (Poppins 600/800, 32 px, crème). |

Heures au format « 10h », « 10h30 » ; « de 10h à 12h » si fin connue, sinon « à partir de 10h ».
Jour au format « Samedi 7 novembre » (« 1er » pour le premier du mois, `jourMois`).

## Texte de la publication (proposé, modifiable, non mémorisé)

```
🎲 Retour sur la permanence du samedi 3 octobre !

📦 10 jeux sont partis jouer dans les familles : Azul, Dixit, Kingdomino…

📅 Prochaine permanence : samedi 7 novembre, de 10h à 12h, 419 Grande Rue à Coligny.

Pas encore adhérent ? L'adhésion se fait sur place, pour tout le foyer.
Toutes les infos : www.ludothequedecoligny.fr/adherer

Ludothèque de Coligny
www.ludothequedecoligny.fr
```
(1 prêt : « 1 jeu est parti jouer… » ; liste des noms distincts, tous ; ligne
« Prochaine permanence » retirée si inconnue.)

## Fenêtre

Dans la fenêtre « Bilan » d'une permanence (Evenements.jsx, section « Publier sur les
réseaux »), à la place de « Le bilan des permanences arrive bientôt. » :
nouveau composant `src/components/admin/bilan/PublicationBilanPermanence.jsx` :
- chargement des prêts du jour et de la prochaine permanence ;
- texte de la publication (proposé, modifiable, bouton « Remettre le texte proposé ») ;
- aperçu `SocialPostPreview` **portrait** défilable avec les 3 images exactes (JPEG 0,9) ;
- bouton « Publier sur Facebook & Instagram (3) » : images dessinées une à une, déposées
  dans `event-images/bilans/{id}/permanence-{horodatage}-NN.jpg`, puis `publierSurReseaux`
  (photo_count 3) ; fermeture de la fenêtre bloquée pendant la publication ;
- états : chargement, aucun prêt, erreur (message en français), publié.
Les visuels déposés dans `bilans/{id}/` sont déjà effacés à la suppression de l'événement.

## Technique

- Règles pures : `src/services/diapos/permanence-regles.js` (+ tests `npm test`) :
  `estPermanence(titre)`, `jeuxDistincts(prets)`, `prochainePermanence({ evenements,
  horaires, maintenant })`, `planBilanPermanence({ event, prets, prochaine })`,
  `texteBilanPermanence({ event, prets, prochaine })`.
- Dessin : `src/services/diapos/permanence.js` : `dessinerBilanPermanence(plan, onDiapo)`,
  même contrat que `dessinerCarrousel` (une image à la fois, `liberer`), outils de `dessin.js`.
- Données : chargées dans le composant (`loans`, `loan_history` avec `games(...)`,
  `events`, `settings`) ; lectures seules, droits existants (bénévoles connectés).
- Vérification : rendu de la permanence du 03/10/2026 (10 prêts) et du 04/07/2026
  (12 prêts), cas « plus de 12 jeux » et « 1 prêt » simulés, comparés à la maquette ;
  essais avec écritures, stockage et Make interceptés ; lint 0 erreur.

## Hors périmètre

Story de permanence, rappels push (étape 4), mémorisation du texte, publication
automatique sans clic.
