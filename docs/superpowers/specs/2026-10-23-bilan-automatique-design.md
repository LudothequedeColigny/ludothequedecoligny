# Bilan automatique des soirées et après-midi jeux — conception

Date : 23 octobre 2026 · Étape 1 du plan d'automatisation de la communication
(étapes suivantes : annonce + story du jour J, bilan de permanence, rappels).

## Objectif

Depuis la fenêtre « Bilan » d'un événement passé (écran Communication), fabriquer
automatiquement, à partir de ce qui est déjà saisi :

- un **carrousel** Facebook + Instagram de 10 diapositives au plus, format portrait
  4:5 (1080 × 1350), publié par le scénario Make existant ;
- une **story** de 4 images 9:16 (1080 × 1920), à enregistrer sur le téléphone puis à
  publier depuis Instagram (Make ne publie pas de story).

Maquettes validées par Victor le 23/10/2026 : `Bureau/PERSO/Ludothèque/Maquette bilan
soirée jeux/` (`bilan.html`, `story.html`). Elles font référence pour l'aspect.

Concerne les événements de type **soirée** et **après-midi en famille** (détection par
le titre, `getEventType` existant). Les permanences sont traitées à l'étape 3.

## Contenu des diapositives (carrousel)

| N° | Contenu | Données |
|---|---|---|
| 1 | Photo d'ouverture plein cadre + « {Jour} dernier, c'était [Soirée jeux !] » (étiquette orange) + « {date} · {lieu} » | `events.date`, `events.location`, photo choisie |
| 2 | Même photo floutée + voile bleu : « Nous étions **N** joueuses et joueurs ! » (famille : « petits et grands ») | `events.participants_count` |
| 3 | Deuxième photo + carte « Et on a joué à… plein de jeux ! » + « Les voici → » | photo choisie |
| 4–9 | Un jeu par diapo : photo associée + jaquette détourée en bas à droite + « On a joué à » + nom ; « ✓ À emprunter à la ludothèque » si `in_catalogue`. **Sans photo** : une photo de la soirée floutée + jaquette au centre | `event_games_played` |
| 10 | Fond bois : « Merci ! » + carte « Prochain rendez-vous » (titre, date, lieu, affiche) | prochain événement |

Règles :

- **Formule d'ouverture** : si la publication a lieu moins de 7 jours après
  l'événement, « Vendredi dernier, » (jour de la semaine de l'événement) ; sinon
  « Le 2 octobre, ».
- **Libellé de l'étiquette** : soirée → « Soirée jeux ! » ; famille → « Après-midi
  jeux en famille ! » (sur deux lignes si besoin).
- **Participants inconnus** : la diapo 2 est retirée.
- **Plus de 6 jeux** : on garde 6 jeux (ceux qui ont une photo d'abord, puis l'ordre
  de saisie) ; l'écran indique lesquels sont écartés. Carrousel : 10 images au plus.
- **Prochain rendez-vous** : premier événement à venir (à la date de publication)
  qui n'est pas une permanence. S'il n'y en a pas : « Toutes nos dates sur
  ludothequedecoligny.fr ».
- **Une seule photo** : elle sert aux diapos 1 et 3. **Aucune photo** : publication
  impossible, l'écran le dit.
- Pastille « Ludothèque de Coligny » + feuille (`public/logo-feuille.svg`) en haut de
  chaque diapo ; polices Bricolage Grotesque / Poppins du site.

## Story (4 images)

1. Ouverture (comme diapo 1) ; 2. le nombre (comme diapo 2, retirée si inconnu) ;
3. « Et on a joué à… plein de jeux ! » + grille de toutes les jaquettes (6 au plus,
noms, « ✓ À emprunter ») sur photo floutée ; 4. « Merci ! » + prochain rendez-vous +
« Toutes nos dates ↓ » (place pour l'autocollant lien). Zones réservées à Instagram :
250 px en haut, 340 px en bas, sans texte.

Remise au téléphone : bouton « Enregistrer la story » → `navigator.share({ files })`
quand le navigateur le permet (menu Partager : « Enregistrer les images » ou
Instagram) ; sinon téléchargement des 4 fichiers.

## Fenêtre « Bilan » : ce qui change

La partie « Publication sur les réseaux » est remplacée par :

1. **Photo d'ouverture** et **photo « plein de jeux »** : choix parmi les photos de
   l'album (par défaut : 1re et 2e photo).
2. **Une photo par jeu joué** : sous chaque jeu, choix d'une photo de l'album ou
   « sans photo ». Mémorisé.
3. **Aperçu** : vignettes des diapositives du carrousel et de la story, recalculées
   à chaque changement ; clic = agrandir.
4. **Texte de la publication** : inchangé (texte proposé modifiable existant).
5. **Publier sur Facebook & Instagram** (carrousel) et **Enregistrer la story**.

L'ancienne sélection manuelle de photos à publier (`bilanSelectedPhotoUrls`)
disparaît : le carrousel est désormais composé des diapositives.

## Données

Migration (droits hérités des tables existantes, aucune table nouvelle) :

- `event_games_played.photo_url text` — photo de la soirée associée au jeu (null = sans
  photo).
- `events.bilan_photo_ouverture text`, `events.bilan_photo_jeux text` — choix des
  photos des diapos 1 et 3 (null = choix par défaut).

Une photo supprimée de l'album est retirée de ces champs.

## Jaquettes

- Jeu présent au catalogue : on utilise de préférence l'image du catalogue
  (`games.image_url`, stockée chez nous, meilleure définition), retrouvée par le nom.
- Sinon, image MyLudo : MyLudo n'autorise pas sa réutilisation dans un canvas (pas
  d'en-tête CORS). À l'ajout d'un jeu joué, l'image est copiée chez nous via
  `bgg-proxy?endpoint=upload-image` (déjà utilisé par l'écran Jeux) et l'adresse
  copiée est enregistrée. Pour les jeux déjà saisis, la copie est faite à la première
  génération du bilan, puis enregistrée.
- Jaquettes MyLudo : 300 px au plus — jamais agrandies au-delà (taille d'affichage
  plafonnée).

## Technique

- **Moteur de diapositives** : nouveau module `src/services/diapos/` qui dessine chaque
  diapositive sur un `<canvas>` (même approche que la couverture « Nouveaux jeux »).
  Fonctions pures par diapositive, outils communs (photo en recouvrement, retour à la
  ligne, étiquette papier découpé, pastille, chargement des polices).
- **Flou** : `ctx.filter` ne fonctionne pas sur Safari → flou par réduction puis
  agrandissement successifs de l'image (sans dépendance).
- **Export** : JPEG 0,9 ; envoi dans `event-images/bilans/{eventId}/` ; publication par
  `publierSurReseaux` (`src/services/reseauxSociaux.js`). Une diapositive à la fois
  (mémoire des téléphones).
- **Composant** : la partie publication du bilan sort d'`Evenements.jsx` dans un
  composant dédié (`src/components/admin/bilan/`), pour ne pas alourdir ce fichier de
  2 700 lignes.

## Vérifications

- Fonctions de calcul (formule d'ouverture, choix des 6 jeux, prochain rendez-vous,
  libellés) vérifiées sur des cas précis avant écriture de l'interface.
- Diapositives générées par l'outil comparées visuellement aux maquettes, avec les
  données de la soirée du 02/10/2026 (événement 38), sur ordinateur et téléphone.
- Essais de publication : Make et l'envoi au stockage interceptés, aucune publication
  réelle ; le premier vrai envoi est fait par Victor.
- `npm run lint` (0 erreur), construction du site.

## Hors périmètre

Annonce et story du jour J (étape 2), bilan de permanence (étape 3), rappels (étape 4),
publication automatique des stories, programmation des publications.
