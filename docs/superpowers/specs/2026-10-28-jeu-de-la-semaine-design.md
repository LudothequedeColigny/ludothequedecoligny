# Jeu de la semaine (vidéos Reels) — conception

Date : 28 octobre 2026 · Validé par Victor le 28/10/2026 (« Ça me convient »), partie par partie.

## Objectif

Victor prépare des vidéos de présentation de jeux (« Reels » 9:16, une par jeu) et les dépose
dans un dossier Google Drive partagé. Chaque semaine, une vidéo est publiée **en même temps** sur
la page Facebook et le compte Instagram de la ludothèque, depuis un nouvel onglet de l'écran
Communication. Un rappel part le **jeudi à partir de 17 h** sur les téléphones des bénévoles.

Dossier Drive : `1bdQWQauOTWyaGZwvuAcZh-dvF-G_evWs` (partagé « toute personne disposant du lien »).
État au 28/10/2026 : 4 vidéos (Akropolis, Harmonies, Mysterium, Sky Team), toutes mesurées :
30 s, 1080 × 1920, H.264, ≈ 2,4 Mbit/s, ≈ 9 Mo, `moov` en tête de fichier, **sans piste son**.

## Pourquoi le jeudi 17 h

Rappels existants (heure de Paris) : annonce J-10 dès 18 h (mardi/mercredi pour les soirées du
vendredi et les rendez-vous du samedi), story le jour J (vendredi, samedi), bilan de permanence
le samedi, bilan de soirée le samedi matin, bilan famille le dimanche. **Le lundi et le jeudi
sont toujours libres.** Le jeudi est retenu : deux jours avant la permanence du samedi (on peut
venir emprunter le jeu présenté), et fin de journée = heure où l'on regarde son téléphone.

## Ce que voit le bénévole

### Onglet « Jeu de la semaine » (Communication, 5ᵉ onglet)

- Rangée de 5 onglets (`COMM_TABS`), compteur = vidéos pas encore publiées. Nouvelle icône
  `ludo-jeu-semaine.svg` au style des icônes dessinées (contour seul, trait 8 sur 300, bouts
  ronds, `width`/`height` gardés), à faire valider par Victor.
- **Prochaine vidéo** : lecture de la vidéo (lecteur Drive intégré
  `https://drive.google.com/file/d/{id}/preview`, aucune clé dans le navigateur) dans un cadre de
  téléphone, légende en dessous = exactement ce qui part ; nom du jeu, jaquette du catalogue,
  pastille « Disponible » / « En prêt » (`games.is_available`) ; légende modifiable, enregistrée
  (`jeux_semaine.legende`) ; bouton « Publier sur Facebook & Instagram » → `ConfirmModal` →
  publication → `SuccessModal` « Vidéo envoyée : elle apparaîtra sur les deux pages d'ici
  quelques minutes ».
- **File d'attente** : vidéos non publiées, de la plus ancienne (`createdTime` Drive) à la plus
  récente ; bouton « Choisir celle-ci » (choix d'affichage, non mémorisé). Jeu non reconnu ou
  ambigu : « Jeu non trouvé dans le catalogue » + liste déroulante des jeux ; le choix est
  mémorisé (`jeux_semaine.game_id`).
- **Déjà publiées** : nom du jeu et date.
- Bouton « Ouvrir le dossier Drive ». Retirer une vidéo de la file = la supprimer du Drive.
- Téléphone : même onglet, en colonne (on y arrive depuis le rappel).
- Une étape du tutoriel de l'écran (`data-tutorial`) présente l'onglet.
- Ouverture directe : `/admin/evenements?onglet=jeu-semaine` ouvre l'onglet puis retire le
  paramètre (même mécanisme que `?annonce=` / `?bilan=`).

### Choix de la prochaine vidéo (règle)

Parmi les vidéos non publiées, triées de la plus ancienne à la plus récente : la première dont le
jeu est reconnu **et disponible**. Le jeu prévu est en prêt → on passe à la suivante, avec la
mention « {jeu} est en prêt : vidéo suivante proposée ». Aucune disponible → la plus ancienne,
avec la pastille « En prêt ». File vide → « Plus de vidéo en réserve : ajoutez-en une dans le
dossier Drive ».

### Reconnaissance du jeu d'après le nom du fichier

Partie avant le premier `_` (« SkyTeam_jeu-de-la-semaine.mp4 » → « SkyTeam »), sans accents, en
minuscules, sans caractères autres que lettres et chiffres → comparée **à l'identique** au nom du
jeu normalisé de la même façon (« Sky Team » → « skyteam »). Exactement un jeu → reconnu ; zéro
ou plusieurs → choix manuel. Jamais de correspondance partielle (« Sky » ne doit pas donner
« Skyjo »).

### Légende préremplie (modèle validé par Victor)

```
🎲 Le jeu de la semaine : {nom}
👥 {joueurs} · ⏱ {durée} min · dès {âge} ans
{première phrase de la description du catalogue, 200 caractères au plus}

📍 À emprunter à la ludothèque, {jour date} de {début} à {fin}.
👉 Pas encore adhérent ? ludothequedecoligny.fr/adherer

#ludotheque #coligny #jeudesociete #{NomSansEspaces}
```

- Chiffres lus dans le catalogue (`min_players`, `max_players`, `duration`, `min_age`) : « 2 joueurs »
  si min = max, sinon « 2 à 4 joueurs ». Champ absent → morceau omis.
- Prochaine permanence : même règle que le bilan de permanence (événement saisi, sinon Paramètres).
  Aucune connue → ligne « 📍 À emprunter à la ludothèque. »
- Mot-clic du jeu : nom sans accents, espaces ni ponctuation, majuscule à chaque mot (`#SkyTeam`).
- Légende modifiée → enregistrée et reprise à la réouverture.

Écarts relevés le 28/10 entre vidéos et catalogue (à vérifier sur les boîtes par Victor) :
Sky Team 20 / 30 min, Mysterium 42 / 40 min, Akropolis 2-4 / 1-4 joueurs.

## Rappel du jeudi

Ajouté aux règles de `check-events-notify/rappels.js` (fonction pure, testée par `npm test`) :

- Part le **jeudi**, à partir de **17 h** (heure de Paris), **une fois par semaine** (semaine =
  lundi → dimanche), à tous les téléphones abonnés.
- Ne part pas si une vidéo a été publiée depuis le lundi 0 h de la semaine, ni s'il est déjà parti
  cette semaine. Pas de relance le vendredi.
- Vidéo en attente : « 🎬 Jeu de la semaine : {jeu} » — « Publiez la vidéo sur Facebook et
  Instagram. » ({jeu} = la prochaine vidéo selon la règle ci-dessus, évaluée au moment de l'envoi ;
  jeu non reconnu → nom tiré du fichier.)
- File vide : « 🎬 Plus de vidéo en réserve » — « Ajoutez une nouvelle vidéo dans le dossier Drive. »
- Ouvre `/admin/evenements?onglet=jeu-semaine`.
- La liste du Drive n'est lue que lorsque le rappel peut partir (jeudi ≥ 17 h, pas encore envoyé),
  pas toutes les 15 min.
- Mode simulation existant (`{"simulation": true, "maintenant": "2026-11-05T17:05:00"}`) : renvoie
  aussi ce rappel, sans rien envoyer ni écrire.
- Envoi mémorisé seulement si `send-push` a accepté (même règle que les autres rappels).

## Technique

### Données (migration `supabase/migrations/20261028_jeu_de_la_semaine.sql`)

- `jeux_semaine` : `drive_id text primary key`, `nom_fichier text`, `game_id bigint references
  games(id) on delete set null` (choix manuel), `legende text`, `publie_le timestamptz`,
  `copie_chemin text`, `copie_effacee_le timestamptz`. Une ligne n'existe que pour une vidéo
  touchée (jeu choisi, légende modifiée, publiée) ; les autres viennent de la liste Drive.
- `rappels_jeu_semaine` : `semaine date primary key` (le lundi), `envoye_le timestamptz`.
- Les deux : `enable row level security`, bénévoles connectés seulement (`authenticated`), aucun
  droit pour `anon`, `grant` explicites (règle Supabase du 30/10/2026). Aucune donnée personnelle.
- Espace de fichiers `reels` : public en lecture (Instagram doit télécharger la vidéo), 100 Mo au
  plus par fichier, `video/mp4` et `video/quicktime` seulement ; écriture par la fonction serveur
  uniquement (clé de service). Nom de fichier `{drive_id}-{aléatoire}.mp4`.

### Fonction serveur `jeu-semaine` (nouvelle)

Appel réservé aux bénévoles connectés (jeton de session vérifié). Secret `GOOGLE_DRIVE_CLE`
(clé d'API Google limitée à l'API Drive), jamais dans le code du site.

- `liste` : Drive API v3 `files.list` (`'{dossier}' in parents and mimeType contains 'video/' and
  trashed = false`, champs `id, name, createdTime, size`) → liste brute ; le site la croise avec
  `jeux_semaine` et `games`.
- `preparer` (`drive_id`) : télécharge `files/{id}?alt=media&key=…`, refuse au-delà de 100 Mo,
  dépose dans `reels`, note `copie_chemin`, renvoie l'adresse publique.
- Erreurs claires : clé absente ou refusée, dossier plus partagé, fichier trop lourd ou pas une vidéo.

Le dossier Drive est une constante partagée (fonction et bouton « Ouvrir le dossier Drive »).

### Publication

Le site appelle `preparer`, puis `publierSurReseaux` (`src/services/reseauxSociaux.js`, étendu)
avec `{ message, video_url }` (pas d'`image_url`, pas de `photo_count`). Webhook accepté →
`publie_le` écrit. Échec → message d'erreur, rien n'est marqué, nouvel essai possible (la copie
déjà faite est réutilisée).

### Make (scénario 5585035) — modification à faire avec l'accord de Victor

- Nouvelle voie « Vidéo (Reel) » : filtre `video_url` contient `supabase.co` →
  `instagram-business:CreateAReelPost` (`video_url`, `caption` = message, `share_to_feed` = oui)
  et `facebook-pages:uploadAReel` (méthode URL, `description` = message).
- **La voie « Texte seul » doit recevoir la condition `video_url` n'existe pas** : sinon un envoi
  vidéo (message présent, pas d'`image_url`) y passerait aussi et publierait un texte seul sur
  Facebook (le routeur Make envoie à toutes les voies dont le filtre est vrai).
- Voies carrousel et photo seule inchangées (elles exigent `photo_count` > 1 ou une `image_url`).
- Limites vérifiées : Instagram (MP4/MOV, H.264, ≤ 5 Mbit/s, 3 s à 15 min, ≤ 1 Go, adresse
  publique, **jamais Google Drive**), Facebook (9:16, 3 à 90 s).

### Ménage des copies

À chaque passage de `check-events-notify` : copies dont `publie_le` date de plus de 7 jours et
`copie_effacee_le` vide → supprimées de `reels` (API de stockage, pas de `delete` SQL sur
`storage.objects`), puis `copie_effacee_le` écrit.

### Règles partagées

Normalisation des noms, choix de la prochaine vidéo, légende : `src/services/jeuSemaine.js`
(testé par `npm test`). La normalisation et le choix de la prochaine vidéo sont **recopiés** dans
`check-events-notify/rappels.js` (la fonction ne peut pas importer `src/`) : les changer aux deux
endroits, comme `typeEvenement`.

## Vérifications

- `npm test` : reconnaissance des noms (dont « Sky Team » ≠ « Skyjo », « Akropolis_…-1.mp4 »),
  prochaine vidéo (jeu en prêt, aucun disponible, file vide), légende (min = max, champ absent,
  pas de permanence), rappel (jeudi 16 h 59 / 17 h, déjà envoyé, publié lundi, vendredi).
- `npm run lint` : 0 erreur.
- Photos de l'onglet et de ses fenêtres (confirmation, succès, erreur, file vide, jeu non reconnu)
  à 390 et 1280 px, avec le compte bénévole de test.
- Simulation du rappel sur la vraie file.
- Première vraie publication = essai, suivie dans l'historique Make avec Victor.

## Ce que Victor doit faire

1. Créer la clé Google (guidé pas à pas) ; elle est rangée dans les secrets Supabase.
2. Donner son accord avant la modification du scénario Make.
3. Redonner le mot de passe du compte bénévole de test pour les photos.
4. Valider la nouvelle icône.

## Page Confidentialité

Aucune donnée de visiteur n'est concernée (Drive et vidéos : usage des bénévoles seulement).
Relire la page à la mise en ligne pour le confirmer.

## Mise en ligne (ordre)

Migration → clé Google en secret → fonction `jeu-semaine` → `check-events-notify` → simulation →
site → modification Make (accord de Victor) → première publication.
