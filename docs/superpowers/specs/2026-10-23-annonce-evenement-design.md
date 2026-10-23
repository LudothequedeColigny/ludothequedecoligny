# Annonce d'un événement et story du jour J — conception

Date : 23 octobre 2026 · Étape 2 du plan d'automatisation de la communication
(étape 1 : bilan automatique, en ligne ; étapes suivantes : bilan de permanence, rappels).

## Objectif

Depuis le bouton « Publier sur Facebook & Instagram » d'un événement (écran Communication),
fabriquer automatiquement :

- un **carrousel d'annonce** de 5 diapositives au plus, 4:5 (1080 × 1350), publié par le
  scénario Make existant (`publierSurReseaux`), à faire ~10 jours avant ;
- une **story du jour J** (1 image 9:16, 1080 × 1920), à enregistrer sur le téléphone
  (même mécanisme que la story du bilan : fichiers préparés à l'aperçu, partage au toucher).

Maquette validée par Victor le 23/10/2026 :
`Bureau/PERSO/Ludothèque/Maquette bilan soirée jeux/annonce.html` (+ `annonce-01..05.png`,
`annonce-story-01.png`). Elle fait référence pour l'aspect (mêmes couleurs, polices, pastille,
étiquettes papier découpé que le bilan). Règle de Victor : **l'aperçu est l'image exacte publiée**,
et il se fait défiler.

## Genres d'événements

`typeEvenement(titre)` (regles.js) : `soiree`, `famille`, `permanence`.
- **Soirée / famille** : carrousel d'annonce + story du jour J.
- **Permanence** : story du jour J seulement (pas de carrousel).

## Diapositives du carrousel

| N° | Contenu |
|---|---|
| 1 | **Avec affiche** : affiche entière (hauteur 1000 px, contour encre, ombre pleine, penchée 1,5°) sur l'affiche floutée + voile encre 45 % ; étiquette orange « Prochain rendez-vous ! » en haut. **Sans affiche** : photo floutée (ou bleu) + « Prochain rendez-vous ! » + nom de l'événement et sa date en grand. |
| 2 | « Ce qui vous attend » : photo plein cadre + dégradé bas + carte crème penchée (ombre orange) : petit libellé orange « CE QUI VOUS ATTEND », titre (Bricolage), 3 points (✦ bleu). |
| 3 | « Les infos pratiques » (titre deux tons) sur photo floutée + voile bleu : 4 cartes au plus avec pictogramme dessiné (pas d'émoji) — date (+ heure), lieu, puis les 2 lignes modifiables (chacune titre + sous-titre). Une ligne vide est retirée. |
| 4 | « La dernière fois, nous étions **N** ! » + 3 photos polaroïd (penchées) du dernier événement du même genre + « {Genre} du {date} ». **Retirée** si aucun événement passé du même genre n'a un nombre de participants > 0 et au moins une photo. |
| 5 | Fond bois : « On vous attend ! » (gros, contour encre, ombre orange), la date (« Vendredi 6 novembre · 19h »), deux pastilles « Enregistrez ce post » et « Identifiez un ami », `ludothequedecoligny.fr`. |

Photos des diapositives 2 et 3 : celles du **dernier événement passé du même genre** (le plus
récent qui a des photos). Diapo 2 = sa photo d'ouverture choisie (`bilan_photo_ouverture`) ou sa
1re photo ; diapo 3 = une autre de ses photos ; polaroïds = 3 photos (autres que celles-là si
possible). Sans photo passée : fond = affiche floutée ; sans affiche non plus : bleu `#1a5f7a`.

## Story du jour J

1080 × 1920 ; zones Instagram libres (250 px en haut, 340 px en bas). Fond : affiche floutée +
voile encre (ou photo floutée, ou bleu) ; pastille ; étiquette orange **« C'est ce soir ! »**
(heure de début ≥ 17 h), **« C'est cet après-midi ! »** (12 h – 17 h) ou **« C'est ce matin ! »**
(< 12 h) ; nom de l'événement ; affiche penchée (hauteur 700) si elle existe ; heure et lieu
(« 19h · Salle des fêtes de Coligny »). Permanence : « C'est ce matin ! » + « Permanence de la
ludothèque » + « de 10h à 12h · 419 Grande Rue à Coligny » (heures de l'événement).

## Textes modifiables (mémorisés pour l'événement)

Colonne `events.annonce jsonb` (null = textes types) :
`{ "titre": string, "points": [string, string, string], "infos": [{ "titre": string, "detail": string }, { … }] }`

Textes types (validés par Victor) :
- Soirée : « Une soirée pour jouer entre amis ! » ; « Des dizaines de jeux à découvrir » ;
  « Des bénévoles pour vous expliquer les règles » ; « Débutants ou joueurs aguerris, chacun
  trouve son jeu ».
- Famille : « Un après-midi pour jouer en famille ! » ; « Des jeux pour petits et grands » ;
  « Des bénévoles pour vous expliquer les règles » ; « Venez en famille ou entre amis ».
- Infos (soirée et famille) : « Gratuit et ouvert à tous » / « adhérents ou non, débutants
  bienvenus » ; « Apportez à grignoter » / « ou à boire, à partager ».

Bouton « Remettre les textes proposés ». Points vides retirés de la diapo 2.

## Fenêtre « Annonce » (remplace la fenêtre actuelle de l'affiche)

- En-tête comme aujourd'hui (titre de l'événement).
- Soirée / famille : champs titre + 3 points + 2 infos (titre/détail) ; texte de la publication
  (proposé comme aujourd'hui, modifiable) ; **aperçu du carrousel** = `SocialPostPreview`
  défilable avec les images exactes ; **aperçu de la story** (vignette + vue agrandie navigable,
  composant partagé avec le bilan) ; boutons « Publier sur Facebook & Instagram (N) » et
  « Enregistrer la story du jour J ».
- Permanence : aperçu de la story + bouton « Enregistrer la story du jour J » seulement.
- Publication : diapositives fabriquées une à une (mémoire des téléphones), envoyées dans
  `event-images/annonces/{id}/`, puis `publierSurReseaux`. L'affiche d'origine n'est pas modifiée.
- Les visuels publiés dans `annonces/{id}/` sont effacés si l'événement est supprimé.

## Technique

- Règles pures : `src/services/diapos/annonce-regles.js` (+ tests `npm test`).
- Dessin : `src/services/diapos/annonce.js` (`dessinerAnnonce(plan, onDiapo)`,
  `dessinerStoryJourJ(plan, onDiapo)`) avec les outils de `dessin.js` ; pictogrammes dessinés
  en `Path2D` (calendrier, repère, dé, biscuit — tracés de la maquette).
- UI : `src/components/admin/annonce/PublicationAnnonce.jsx` ; `VueAgrandie` extraite de
  `PublicationBilan.jsx` vers `src/components/admin/VueAgrandie.jsx` et partagée.
- Vérification : rendu avec la Soirée Halloween du 06/11 (affiche réelle) et l'après-midi famille
  du 24/10, comparé à la maquette ; essais avec écritures et Make interceptés ; lint 0 erreur.

## Hors périmètre

Bilan de permanence (étape 3), rappels push J-10 / jour J (étape 4), publication automatique
des stories, programmation.
