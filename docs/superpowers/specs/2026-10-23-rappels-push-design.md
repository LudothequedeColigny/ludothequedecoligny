# Rappels sur les téléphones des bénévoles — conception

Date : 23 octobre 2026 · Étape 4 (dernière) du plan d'automatisation de la communication
(étapes 1–3 en ligne : bilan des soirées, annonce + story du jour J, bilan de permanence).
Validé par Victor le 23/10/2026 (« ça me va ! »).

## Objectif

La tâche planifiée `check-events-notify` (toutes les 15 min, `cron.job`) envoie, par
`send-push`, des rappels à **tous** les téléphones abonnés (pas de préférences par personne) :

| Rappel | Pour | Quand (heure de Paris) | Si | Ouvre |
|---|---|---|---|---|
| Annonce | soirée, après-midi famille | à partir de 18h, dès qu'il reste ≤ 10 jours (le soir même si l'événement est créé plus tard), tant que l'événement est à venir | annonce pas encore publiée | fenêtre Annonce |
| Story du jour J | tout événement | jour J à partir de 9h | — | fenêtre Annonce (story) |
| Bilan de permanence | permanence (titre contenant « permanence ») | 1 h après la fin (`end_time`, sinon début + 2 h), pendant 24 h | bilan pas encore publié **et** au moins un jeu emprunté | fenêtre Bilan |
| Bilan de soirée / famille (remplace le rappel de minuit) | soirée, après-midi famille | lendemain à partir de 9h | bilan pas encore publié | fenêtre Bilan |

Chaque rappel part **une seule fois** par événement (date d'envoi mémorisée). L'alerte
« … commence ! » au début de chaque événement est inchangée.

Textes :
- Annonce : « 📣 {titre} dans {n} jours » (« demain », « aujourd'hui ») — « Publiez l'annonce sur Facebook et Instagram. »
- Story : « 📸 C'est aujourd'hui : {titre} » — « Enregistrez la story du jour J, puis publiez-la sur Instagram ou Facebook. »
- Bilan de permanence : « 📦 {n} jeux empruntés ce matin » (« 1 jeu emprunté » ; « cet après-midi » si la fin est entre 13h et 18h, « ce soir » après) — « Publiez le bilan de la permanence sur Facebook et Instagram. » ; n = jeux distincts, un prêt rendu le jour même ne compte pas (même règle que le bilan).
- Bilan de soirée / famille : « 📋 Bilan de {titre} » — « Renseignez les participants, les photos et les jeux joués, puis publiez le bilan. »

## Données (table `events`, colonnes ajoutées — droits hérités)

- `annonce_publiee_le`, `bilan_publie_le` (timestamptz) : écrites par les fenêtres Annonce,
  Bilan et Bilan de permanence après une publication réussie.
- `notif_annonce_sent_at`, `notif_jour_sent_at` (timestamptz) : rappels envoyés
  (`notif_bilan_sent_at` existe déjà et sert aux deux rappels de bilan).
Aucune donnée personnelle (la page Confidentialité n'est pas concernée).

## Ouverture de la bonne fenêtre

L'adresse du rappel est `/admin/evenements?annonce={id}` ou `/admin/evenements?bilan={id}`.
L'écran Communication lit ce paramètre une fois les événements chargés, ouvre la fenêtre de
l'événement (lu en base s'il n'est pas dans la liste), puis retire le paramètre de l'adresse.
Événement introuvable : message « Cet événement n'existe plus. »

## Technique

- Règles pures : `supabase/functions/check-events-notify/rappels.js` (JavaScript lisible par
  Deno et Node) : `typeEvenement`, `estPermanence` (recopiées du site, la fonction serveur ne
  peut pas importer `src/`), `jeuxEmpruntes(prets)`, `rappelsAEnvoyer({ maintenant, evenements,
  pretsParJour })`. Tests `rappels.test.js` lancés par `npm test` (motif élargi à
  `supabase/functions/**/*.test.js`).
- `check-events-notify/index.ts` : lit les événements non archivés d'hier à J+11 et les prêts des
  jours de permanence concernés, envoie les rappels, puis mémorise l'envoi **seulement si
  `send-push` a répondu 2xx** (sinon nouvel essai 15 min plus tard).
- **Mode simulation** (même mot de passe que la tâche) : corps `{"simulation": true,
  "maintenant": "2026-11-06T09:05:00"}` → renvoie la liste des rappels qui partiraient à cet
  instant, **sans rien envoyer ni écrire**. Sert aux vérifications avant et après la mise en ligne.
- Migration `supabase/migrations/20261023_rappels_push.sql`.

## Mise en ligne (ordre)

Migration → déploiement de la fonction → simulations sur les vrais événements → publication du
site. Tant que le site n'est pas publié, `annonce_publiee_le` / `bilan_publie_le` restent vides :
seul effet, un rappel possible pour une publication déjà faite.

## Hors périmètre

Préférences de notification par bénévole, historique des notifications dans l'application,
publication automatique sans clic.
