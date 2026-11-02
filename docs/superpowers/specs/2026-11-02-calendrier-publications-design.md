# Calendrier des publications — conception

Validée par Victor le 2 novembre 2026 (quatre parties présentées en conversation).

## But

Savoir, pour chaque événement à venir, **quand** communiquer : mail aux mairies et à la
presse, annonce sur les réseaux, mail aux adhérents, story de la veille, story du jour J,
puis bilan. Les délais se règlent dans les Paramètres, jamais en dur dans le code, et
pilotent **à la fois** le calendrier et les rappels envoyés aux téléphones des bénévoles.

## Les actions

| Action | Clé | Délai par défaut | Heure du rappel | Soirée / famille | Permanence | « Fait » quand |
|---|---|---|---|---|---|---|
| Mail mairies & presse | `mail_collectivites` | J-21 | 18:00 | oui | non | un envoi inclut un destinataire mairie, presse ou école → `events.mail_collectivites_envoye_le` |
| Annonce réseaux | `annonce` | J-10 | 18:00 | oui | oui | `events.annonce_publiee_le` (existe) |
| Mail adhérents | `mail_adherents` | J-7 | 18:00 | oui | non | un envoi inclut un adhérent ou un inscrit aux dates → `events.mail_adherents_envoye_le` |
| Story de la veille | `story_veille` | J-1 | 17:00 | oui | oui | bouton « C'est fait » → `events.story_veille_faite_le` |
| Story du jour J | `story_jour` | J0 | 09:00 | oui | oui | partage de la story depuis la fenêtre Annonce, ou bouton « C'est fait » → `events.story_jour_faite_le` |
| Bilan | — | règles actuelles, non réglables | règles actuelles | oui | oui (s'il y a eu des emprunts) | `events.bilan_publie_le` (existe) |

Le type d'événement vient de `typeEvenement` (titre contenant « soirée » → soirée,
« famil » → famille, sinon permanence). Règle « permanences allégées » fixe (choix de Victor) :
pas de mail aux mairies ni aux adhérents pour une permanence.

Changement assumé : aujourd'hui l'annonce n'est rappelée que pour les soirées et les familles ;
elle le sera aussi pour les permanences (la fenêtre Annonce sait déjà les traiter : une image).

## Réglages (table `settings`, carte « Calendrier des publications » des Paramètres)

Pour chaque action réglable (`mail_collectivites`, `annonce`, `mail_adherents`, `story_veille`,
`story_jour`) :

- `publication_<clé>_jours` : nombre de jours avant l'événement (entier, 0 à 60) ;
- `publication_<clé>_heure` : heure du rappel (« HH:MM ») ;
- `publication_<clé>_rappel` : « true » / « false » (couper le rappel n'enlève pas l'action du calendrier).

Valeur absente ou illisible → valeur par défaut du tableau. La lecture des réglages est une
fonction pure (`reglagesPublication(settings)`), testée.

## La règle de calcul (une seule, testée)

`src/services/calendrierPublications.js`, fonctions pures :

- `reglagesPublication(settings)` → `{ mail_collectivites: { jours, heure, rappel }, … }` ;
- `actionsEvenement(evenement, reglages)` → liste `{ cle, jour, heure, faitLe }` : `jour` =
  jour de l'événement moins le délai (heure de Paris, sans fuseau, comme le reste) ;
- `etatAction(action, aujourdhui)` → `fait` | `a_faire` | `en_retard` (date passée, pas faite).

La fonction serveur ne peut pas importer `src/` : copie à l'identique dans
`supabase/functions/check-events-notify/rappels.js`, et un test d'égalité des deux copies dans
`rappels.test.js` (même méthode que le jeu de la semaine).

## L'onglet « Calendrier » de Communication

Nouvel onglet après « Événements » (`COMM_TABS`), brique `src/components/admin/CalendrierPublications.jsx` :

- grille du mois (réutilise `grilleMois`, `NOMS_MOIS`, `JOURS_COURTS` de `services/calendrier.js`),
  flèches mois précédent / suivant, aujourd'hui entouré, jour de l'événement marqué ;
- sur chaque jour, une étiquette par action, une couleur par action ; état lisible : pleine (à faire),
  barrée avec coche (fait), rouge (en retard) ;
- en touchant un jour : la liste de ses actions sous la grille, chacune avec son bouton :
  - Mail mairies & presse → fenêtre d'envoi existante, seuls mairies, presse et écoles cochés ;
  - Mail adhérents → fenêtre d'envoi, seuls adhérents et inscrits cochés, onglet Adhérents ouvert ;
  - Annonce → fenêtre Annonce de l'événement ;
  - Story du jour J → fenêtre Annonce (partie story), plus « C'est fait » ;
  - Story de la veille → « C'est fait » (pas d'image dédiée) ;
  - Bilan → fenêtre Bilan ;
  - « C'est fait » se défait d'un second toucher (stories seulement).
- téléphone : pastilles de couleur dans la grille, liste des actions du mois sous la grille ;
- événements archivés ignorés ; mois sans action : message simple.

## La fenêtre d'envoi des mails

`openComposeModal(event, publics)` accepte un choix de publics (`collectivites` | `adherents` | tous).
À l'envoi, en plus de `mail_sent_at` (gardé, affiché « Diffusé le »), on note
`mail_collectivites_envoye_le` si un destinataire du groupe mairie / presse / école a reçu le mail,
`mail_adherents_envoye_le` si un adhérent ou inscrit l'a reçu.

## Les rappels sur téléphone (`check-events-notify`)

- lit les réglages dans `settings` à chaque passage (toutes les 15 min) ;
- pour chaque événement non archivé, chaque action réglable dont le rappel est actif : rappel si
  le jour de l'action est atteint, l'heure atteinte, l'action pas faite, le rappel pas déjà parti,
  et l'événement pas encore passé (la story du jour J : le jour même) — y compris quand le jour
  de l'action est déjà dépassé (événement créé tard) : le rappel part alors une fois, au passage suivant ;
- une colonne « rappel parti » par action : `notif_annonce_sent_at` et `notif_jour_sent_at`
  (existent) ; nouvelles : `notif_mail_collectivites_sent_at`, `notif_mail_adherents_sent_at`,
  `notif_story_veille_sent_at` ;
- la fenêtre de lecture des événements s'étend au plus grand délai réglé (+1 jour) ;
- un rappel ouvre `/admin/evenements?calendrier=<jour>` (l'onglet Calendrier sur ce jour),
  sauf annonce et story du jour J (fenêtre Annonce, qui contient la story : `?annonce=`) et bilan (`?bilan=`) ;
- bilans, début d'événement, jeu de la semaine : inchangés ;
- le mode simulation (`{"simulation": true, "maintenant": …}`) couvre les nouveaux rappels.

## Base de données

Migration `supabase/migrations/20261102_calendrier_publications.sql` (table existante, pas de
nouveau droit d'accès) : colonnes `mail_collectivites_envoye_le`, `mail_adherents_envoye_le`,
`story_veille_faite_le`, `story_jour_faite_le`, `notif_mail_collectivites_sent_at`,
`notif_mail_adherents_sent_at`, `notif_story_veille_sent_at` (timestamptz) ; les événements déjà
envoyés reçoivent `mail_sent_at` dans les deux colonnes de mail. Aucun réglage n'est inséré :
les valeurs par défaut s'appliquent tant qu'on n'a rien enregistré.

## Vérifications

- tests `npm test` : lecture des réglages (défauts, valeurs illisibles), dates des actions
  (délais, changement de mois), permanences allégées, états, rappels (heure, déjà parti, fait,
  événement passé, rappel coupé), égalité des deux copies de la règle ;
- aperçu avant mise en ligne : photos de l'onglet Calendrier et de la carte des Paramètres
  (compte bénévole de test), comme pour l'accueil ;
- après mise en ligne : simulation des rappels à plusieurs dates.

Ordre de mise en ligne : migration, puis fonction `check-events-notify`, puis site
(chaque étape avec l'accord de Victor).

## Hors champ

Image dédiée à la story de la veille ; délais réglables par type d'événement ; réglage des bilans.
