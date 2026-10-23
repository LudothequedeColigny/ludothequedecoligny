# Ludothèque de Coligny — fiche de travail

Fiche lue automatiquement au début de chaque conversation, pour éviter de refaire
l'analyse du projet à chaque demande.

---

## 1. Comment communiquer avec Victor

**Victor n'est pas développeur.** Le jargon technique lui est incompréhensible.

- Répondre **en français**, en langage courant.
- Décrire un changement par **ce que ça change à l'écran**, jamais par le nom des
  fichiers ou des fonctions modifiés. « Le bouton s'affiche maintenant sur téléphone »,
  pas « refactorisation du composant de navigation ».
- Si un mot technique est inévitable, l'expliquer en une courte parenthèse.
- Les liens vers les fichiers restent utiles, mais toujours accompagnés d'une phrase
  qui dit à quoi sert le fichier.
- Dire franchement ce qui **n'a pas** été vérifié, et ce qui reste incertain.
- Ne pas noyer la réponse : l'essentiel d'abord, les détails ensuite.

---

## 2. Ce qu'est le projet

Application de la ludothèque associative de Coligny (association PACTES), en deux parties :

- **Le site public** — vitrine pour les habitants : présentation, catalogue des jeux,
  modalités d'emprunt, vie de l'association, agenda.
- **L'espace de gestion** (`/admin`) — réservé aux bénévoles connectés : jeux, adhérents,
  prêts, événements, permanences, suivi financier.

Les données sont hébergées chez Supabase (base de données en ligne).
Le site est publié via Vercel.

### Les pages publiques et leur adresse

| Adresse | Page | Fichier |
|---|---|---|
| `/` | Accueil | `src/pages/Home.jsx` |
| `/catalogue` | Catalogue des jeux | `src/pages/Catalogue.jsx` |
| `/comment-emprunter` | Modalités et tarifs | `src/pages/HowToBorrow.jsx` |
| `/vie-association` | Vie de la ludothèque | `src/pages/VieAssociation.jsx` |
| `/adherer` | Pourquoi adhérer + pré-inscription (adresse du QR code des soirées) | `src/pages/Adherer.jsx` |
| `/mentions-legales` | Mentions légales | `src/pages/MentionsLegales.jsx` |
| `/confidentialite` | Confidentialité (RGPD) + bouton « ne pas être compté » | `src/pages/Confidentialite.jsx` |
| `/login` | Connexion bénévoles | `src/pages/Login.jsx` |
| `/inscription-permanence` | Inscription aux permanences | `src/pages/InscriptionPermanence.jsx` |
| `/desabonnement` | Lien « ne plus recevoir nos actualités » des mails | `src/pages/Desabonnement.jsx` |
| toute autre | Page 404 | `src/pages/NotFound.jsx` |

L'ancienne adresse `/evenements` (page inachevée, supprimée en octobre 2026) renvoie vers `/vie-association`.

Les pages sont téléchargées seulement quand on les ouvre (`lazy` dans `src/App.jsx`),
sauf l'accueil. Une nouvelle page s'ajoute de la même façon.

### Les écrans de gestion et leur fichier

Tous suivent la maquette `Admin 1C.dc.html`, **page et fenêtres comprises** (voir §3).

| Adresse | Écran | Fichier |
|---|---|---|
| `/admin` | Tableau de bord | `src/pages/admin/Dashboard.tsx` |
| `/admin/jeux` | Jeux | `src/pages/admin/Jeux.tsx` |
| `/admin/adherents` | Adhérents | `src/pages/admin/Adherents.tsx` |
| `/admin/evenements` | Communication | `src/pages/admin/Evenements.jsx` |
| `/admin/permanences` | Permanences | `src/pages/admin/GestionPermanences.jsx` |
| `/admin/suivi-financier` | Suivi financier | `src/pages/admin/SuiviFinancier.tsx` |
| `/admin/parametres` | Paramètres | `src/pages/admin/Parametres.jsx` |
| `/admin/suggestions` | Suggestions | `src/pages/admin/Suggestions.jsx` |
| `/admin/prets` | Prêts | `src/pages/admin/Prets.tsx` |
| `/admin/historique-prets` | Historique des prêts | `src/pages/admin/HistoriquePrets.jsx` |
| `/admin/installation` | Installer l'application | `src/pages/admin/InstallationApp.jsx` |

### Tables de la base utilisées par le site public

`settings` (horaires, adresse, tarifs, contact), `games`, `members`, `events`,
`event_photos`, `event_games_played`, `shifts`, `page_views` (compteur de visites).

Le visiteur **écrit sans pouvoir lire** dans `preinscriptions` et `abonnes_dates`
(fonctions `preinscrire` et `inscrire_dates`, `supabase/migrations/20261022_preinscriptions.sql`).
La fonction serveur `send-email` envoie alors la confirmation ou le mail de bienvenue,
une seule fois par demande, et alerte les bénévoles (`send-push`).

---

## 3. La charte graphique

Style « papier découpé » : contour noir de 2 px et ombre pleine décalée (sans flou),
qui s'enfonce au survol.

| Couleur | Code | Usage |
|---|---|---|
| Bleu canard | `#1a5f7a` | couleur principale |
| Orange | `#e38154` | couleur d'accent, boutons d'action |
| Encre | `#0f172a` | textes et contours |
| Crème | `#fdfaf6` | fond des pages |

Polices : **Bricolage Grotesque** pour les titres (classe `font-display`),
**Poppins** pour le texte (classe `font-body`).

Les couleurs s'écrivent directement dans les classes (`bg-[#1a5f7a]`), comme partout
ailleurs dans le projet.

### Les icônes dessinées

`public/icons/ludo-*.svg` sont les icônes dessinées à la main pour la ludothèque.
Elles servent dans la barre latérale de l'espace de gestion et dans la pastille
d'en-tête de chaque écran, via la brique `MaskIcon` qui les recolore.

| Fichier | Écran |
|---|---|
| `ludo-dashboard.svg` | Tableau de bord |
| `ludo-collection.svg` | Jeux |
| `ludo-adherents.svg` | Adhérents |
| `ludo-communication.svg` | Communication |
| `ludo-benevoles.svg` | Permanences |
| `ludo-finance.svg` | Suivi financier |
| `ludo-parametres.svg` | Paramètres |
| `ludo-suggestions.svg` | Suggestions |
| `ludo-pret.svg` | Prêts et historique des prêts |
| `ludo-notifications.svg` | bouton des notifications |

Les fichiers `01.svg` à `07.svg` restent utilisés pour les petites vignettes de
compteurs ; ce sont les icônes génériques d'origine.

---

## 4. Briques déjà écrites — à réutiliser, pas à réécrire

Dans `src/components/site/` :

| Brique | À quoi ça sert |
|---|---|
| `PublicLayout` | enveloppe commune : en-tête + pied de page + remontée en haut |
| `SiteHeader` | en-tête ; menu déroulant en dessous de 1280 px, bouton « Adhérer » toujours visible |
| `Reveal` | fait apparaître un bloc quand on arrive dessus en défilant |
| `CountUp` | compteur qui s'incrémente quand le chiffre devient visible |
| `Modal` | fenêtre par-dessus la page (voile bleu, panneau contouré) |
| `SuccessModal` | fenêtre de confirmation (coche verte) |
| `MaskIcon` | icône de `public/icons/` recolorée à la charte |
| `FloatingIcons` | icônes qui dérivent en fond de section |
| `RecevoirDates` | encart « Recevoir les prochaines dates par e-mail » (accueil) |
| `PageLegale` | mise en page des pages Mentions légales et Confidentialité |
| `styles.js` | classes des boutons et champs (`BTN_PRIMARY`, `INPUT`…) |

Également : `src/components/Footer.jsx`, `src/components/ContactModal.jsx`,
`src/components/TitrePactes.jsx` (le mot PACTES en six couleurs).

**Règle importante : une page n'est finie que quand ses fenêtres le sont.**
Refaire un écran, c'est refaire l'écran **et toutes ses fenêtres** (formulaires,
confirmations, scanner, aperçus, écrans de chargement). La maquette Claude Design les
décrit toutes ; en oublier donne une page à moitié refaite. Les ouvrir une par une
dans le navigateur avant de dire que c'est terminé.

Pour l'espace de gestion, dans `src/components/admin/` :

| Brique | À quoi ça sert |
|---|---|
| `AdminPageHeader` | en-tête d'écran : pastille d'icône + titre en deux tons |
| `ConfirmModal` | fenêtre de confirmation (supprimer, quitter, valider un retour) |
| `BarcodeCamera` | caméra + lecture des codes-barres (lampe, choix d'objectif, ligne grise de diagnostic), pour les deux scanners |
| `InscritsActualites` | bloc repliable de l'écran Adhérents : adresses inscrites aux actualités (non adhérents), avec retrait |
| `PreinscriptionsAValider` | bloc de l'écran Adhérents : demandes faites sur `/adherer`, bouton « Valider l'adhésion » qui pré-remplit la fiche |
| `FicheWikiludo` | fenêtre « Fiche pour Wikiludo » : chaque champ de la grille Wikiludo avec un bouton Copier (catalogue + MyLudo), ordinateur seulement |
| `NouveauxJeux` | onglet « Nouveaux jeux » de Communication : jeux ajoutés depuis le 01/09/2026, carrousel 4:5 (couverture, une image par jeu — 8 au plus, boîte détourée en autocollant —, prochaine permanence) dessiné par `diapos/nouveaux-jeux-regles.js` / `nouveaux-jeux.js` ; cochés → « annonce », décochés → « ecarte » (table `annonces_jeux`, bénévoles seulement) |
| `ModelesMessages` | fenêtre « Modèles de messages » : textes presse et école à copier, lus dans les Paramètres |
| `SocialPostPreview` | aperçu d'une publication Facebook/Instagram |
| `bilan/PublicationBilan` | fenêtre Bilan : choix des photos (ouverture, « plein de jeux », une par jeu), aperçu et publication du carrousel 4:5, story 9:16 à enregistrer |
| `annonce/PublicationAnnonce` | fenêtre Annonce (bouton « Publier sur Facebook & Instagram » d'un événement) : textes modifiables, aperçu et publication du carrousel d'annonce 4:5, story du jour J ; permanence et autres événements = une image (affiche sur son fond flouté + phrase modifiable, « Plus de N jeux… » calculé sur la collection) + story |
| `bilan/PublicationBilanPermanence` | fenêtre Bilan d'une permanence : 3 images 4:5 tirées des prêts du jour (jeux distincts, un prêt rendu le jour même ne compte pas), jamais l'emprunteur ; prochaine permanence = événement saisi, sinon Paramètres |
| `VueAgrandie` | vue agrandie d'une image (flèches, glisser, clavier), partagée par les fenêtres Bilan et Annonce |

Toute publication vers Facebook/Instagram passe par `src/services/reseauxSociaux.js`
(adresse du webhook Make, mise au carré des images, `publierSurReseaux`). Le scénario
Make aiguille sur `photo_count` : 2 images ou plus → carrousel ; 1 image **hébergée chez nous**
(adresse contenant `supabase.co`) → photo seule ; texte sans image → Facebook seulement ;
envoi vide → rien. Toute image doit donc être déposée dans notre stockage avant l'envoi
(jamais de données brutes `data:` ni de lien extérieur). Le 23/10/2026, deux envois vides
(robot ayant visité l'adresse du webhook, lisible dans le code du site) avaient fait
**désactiver** le scénario : s'il s'arrête de nouveau, lire l'historique Make
(scénario 5585035) avant toute chose.
Les images non carrées sont posées sur le fond bois bleu canard `public/social/fond-bois.jpg`
(déjà flouté dans le fichier : le flou du navigateur ne marche pas sur Safari) — pour les
affiches et photos des posts. Choix de Victor, octobre 2026, à la place du fond blanc.
Les « Nouveaux jeux » n'utilisent plus ce fond : boîtes détourées en autocollant
(`diapos/nouveaux-jeux.js`, fond blanc relié aux bords retiré, sécurité à 85 %).

Les visuels de bilan sont dessinés par `src/services/diapos/` : `regles.js` (textes,
jeux retenus, plan — testé par `npm test`), `dessin.js` (outils canvas), `carrousel.js`,
`story.js`, `jaquettes.js` (copie des jaquettes MyLudo chez nous : MyLudo interdit leur
réutilisation dans un canvas). Maquettes validées : `Bureau/PERSO/Ludothèque/Maquette
bilan soirée jeux/`.
L'annonce d'un événement (carrousel 5 diapositives + story du jour J) est dessinée par
`annonce-regles.js` / `annonce.js` ; textes modifiables mémorisés dans `events.annonce`.
Le bilan d'une permanence est dessiné par `permanence-regles.js` / `permanence.js` (prêts de
`loans` + `loan_history` à la date de la permanence : les prêts n'ont pas d'heure).
Le partage des stories depuis le téléphone passe par `partage.js` : `navigator.share` doit
rester la première attente après le toucher, sinon l'iPhone refuse le partage.

Le texte de publication et le choix des photos se font dans la fenêtre Bilan ; la story se publie depuis le téléphone (Make ne sait pas publier de story).

`Reveal`, `CountUp`, `Modal`, `MaskIcon` de `components/site/` servent aussi côté
gestion : malgré son nom, ce dossier contient les briques communes aux deux parties.
`Modal` accepte `backdrop="ink"` pour le voile sombre de l'administration.

Les animations et effets sont définis dans `src/index.css`.

---

## 5. Pièges déjà rencontrés — à ne pas refaire

- **`dist/` n'est plus suivi par Git** (décision de Victor, août 2026). C'est le dossier
  fabriqué automatiquement à la publication : Vercel le reconstruit à chaque
  déploiement, la copie enregistrée dans le dépôt était périmée de cinq mois et ne
  servait à rien. Ne pas le remettre dans l'historique.
  Pour vérifier que le site se construit, utiliser un dossier temporaire :
  `npx vite build --outDir /tmp/verif --emptyOutDir`
- **`npm run lint`** relit le code (réparé en octobre 2026, réglages dans `.eslintrc.cjs`) :
  il doit afficher 0 erreur. Les 5 avertissements restants sont connus et volontairement
  laissés (les corriger changerait le comportement de pages qui marchent).
- **Les fichiers SVG doivent garder leurs attributs `width` et `height`.** Sans eux,
  les icônes disparaissent complètement sur Safari (elles servent de pochoir de couleur).
- **Ne jamais empiler deux réglages d'espacement contradictoires** sur un même élément
  (par exemple `py-4` puis `py-5`) : le résultat est imprévisible.
- **Ne jamais assembler un nom de classe avec une variable** (`` `shadow-[4px_4px_0_${couleur}]` ``).
  Tailwind lit le texte des fichiers : il ne verrait pas la classe et produirait en
  plus une règle invalide. Écrire chaque variante en toutes lettres, ou passer par
  `style={{ boxShadow: … }}`.
- **Scanner de codes-barres : laisser la caméra faire sa mise au point seule.**
  En septembre 2026, un zoom ×2 imposé, un objectif mémorisé et une mise au point
  au toucher ont empêché toute mise au point, sur Android comme sur iPhone.
  Retirés en octobre 2026 : Android et iPhone lisent de nouveau parfaitement (testés
  par Victor). Ne pas les remettre. En cas d'échec, demander une capture de la ligne
  grise sous l'image (objectif, définition, lecteur).
  Changer de lecteur ne sert à rien : mesuré, aucun ne lit une image floue.
- **Toute nouvelle table doit recevoir ses droits d'accès explicitement.** Depuis le
  30 octobre 2026, Supabase ne donne plus automatiquement l'accès à l'API aux tables
  créées dans `public` (mail Supabase du 20/10/2026). Dans la migration qui crée la
  table : `enable row level security`, ses règles (policies), puis les `grant`
  nécessaires — au strict minimum pour `anon` (le visiteur), comme les verrous
  posés en septembre 2026. Sans grant, l'application reçoit « permission denied ».
  Les tables existantes ne sont pas concernées.
- **Un visiteur ne peut pas lire la table `members`** (données personnelles, verrouillée
  en septembre 2026). Le compteur « Joueurs passionnés » de l'accueil passe par la
  fonction `nombre_joueurs()` (`supabase/migrations/20261016_compteur_joueurs.sql`),
  qui ne renvoie que le nombre ; si elle manque, la case est masquée.
- **Les polices sont hébergées sur le site** (`public/fonts/`, règles en tête de
  `src/index.css`) depuis octobre 2026 : plus aucun appel à Google Fonts, qui voyait
  l'adresse IP de chaque visiteur. Ne pas remettre le lien Google dans `index.html`.
- **La page Confidentialité décrit ce que le site enregistre vraiment.** Tout nouveau
  formulaire, toute nouvelle donnée gardée ou tout nouveau service extérieur doit y
  être ajouté. Les pré-inscriptions sont effacées seules après 3 mois (tâche de nuit
  `effacer-preinscriptions-anciennes`) : c'est une promesse faite sur cette page.
  Pour le tableau de bord, `preinscriptions_journal` garde seulement les dates
  « reçue le / validée le » de chaque demande (rempli par un déclencheur, validation
  notée par l'écran Adhérents) : aucune donnée personnelle, donc pas d'effacement.
- **Inscrits aux dates** (`abonnes_dates`) : ils reçoivent le message « adhérents » de
  l'écran Communication, avec leur propre lien de désinscription, qui efface leur
  adresse. Une adresse déjà connue comme adhérent n'est pas reprise.
- **Pas de Google Analytics ni de cookie de mesure** (retirés en octobre 2026, RGPD) :
  les visites sont comptées par `src/services/visites.js` (numéro de visiteur au hasard,
  13 mois au plus, refus possible). C'est ce qui dispense le site de bandeau cookies :
  n'ajouter aucun outil de mesure, publicité ou vidéo intégrée sans en reparler.
- **Mails d'actualités aux adhérents** : chacun porte un lien personnel de
  désabonnement (`[LIEN_DESABONNEMENT]`, colonne `jeton_desabonnement`) ; les adhérents
  avec `refuse_actualites` sont exclus des envois. Ne pas retirer ce lien.
- **Référencement Google** (`src/services/seo.js`) : chaque page publique appelle
  `usePageMeta` (titre, description ; `noindex` pour les pages privées). L'accueil
  transmet la fiche d'identité de la ludothèque et les événements à venir
  (`useJsonLd`). Une nouvelle page publique doit appeler `usePageMeta`.
- **Google Search Console** validée le 16 octobre 2026 (propriété « Domaine ») grâce à
  une entrée TXT `google-site-verification=…` dans la zone DNS chez OVH : ne pas la
  supprimer. La même valeur est aussi dans `index.html` (balise meta), en secours.
- **Fiches de jeux : Wikiludo d'abord, MyLudo en complément** (« Ajouter par scan »).
  Wikiludo = base de l'ALF, fonction serveur `supabase/functions/wikiludo`, identifiants
  dans les secrets `WIKILUDO_IDENTIFIANT` / `WIKILUDO_MOT_DE_PASSE`. Le serveur SRU
  exige les en-têtes `username`, `password` **et** `Content-Type: application/xml`
  (sans ce dernier : refus 401), et la requête exacte `bib.ean all <code>`.
  Il remplace l'apostrophe ’ par « ? » : la fonction la rétablit.
  Wikiludo ne donne la durée qu'en « court/moyen/long » : les minutes viennent de MyLudo.
  Wikiludo ne sait chercher **que par code-barres** (titre, auteur… ignorés) : la
  recherche par nom passe par MyLudo, puis le code-barres trouvé interroge Wikiludo.
- **Tarifs affichés : toujours lus dans les Paramètres**, y compris l'adhésion à PACTES
  (`cotisation_pactes`, Paramètres → Finance, 10 € en octobre 2026). Ne jamais écrire un
  montant en dur dans une page.
- **Horaires des permanences : une seule source, les Paramètres.** Ne jamais les écrire
  en dur dans une page (la page « Comment emprunter » a longtemps affiché 10h-12h
  pendant que les Paramètres disaient 10h-14h).
- **Ne pas renommer la couleur `teal`** dans `tailwind.config.js` : l'espace
  d'administration s'en sert.
- **`src/.DS_Store` apparaît toujours comme modifié** : fichier système macOS, à ignorer.
- **Notifications des bénévoles** : la tâche planifiée `check-events-notify` (toutes les
  15 min) appelle la fonction du même nom par `net.http_post` — il faut le module
  **pg_net** (absent du 20/07 au 23/10/2026 : 9 116 échecs, aucune notification partie).
  En cas de doute, lire `cron.job_run_details` puis `net._http_response`.
  Pour tester toute la chaîne jusqu'aux téléphones : relancer la commande de la tâche
  avec le corps `{"essai": true}` (mode essai de la fonction, protégé par le même mot
  de passe) ; la réponse indique combien d'appareils ont été joints. Ne pas appeler
  `send-push` directement avec une clé lue ailleurs : Supabase a renouvelé la clé de
  service des fonctions le 22/10/2026, une autre clé est refusée (« Non autorisé »).
  Les dates des événements sont à l'**heure de Paris, sans fuseau** : toute comparaison
  côté serveur doit se faire à l'heure de Paris, pas en heure universelle.
  **Rappels** (octobre 2026) : annonce à J-10 dès 18h (soirée, famille), story le jour J dès
  9h (tout événement), bilan de permanence 1 h après la fin s'il y a eu des emprunts, bilan
  de soirée le lendemain dès 9h. Règles dans `check-events-notify/rappels.js` (testées par
  `npm test`) ; `typeEvenement`, `estPermanence` et la règle « rendu le jour même » y sont
  **recopiées** du site (la fonction ne peut pas importer `src/`) : les changer aux deux
  endroits. Un rappel part une fois (`notif_annonce_sent_at`, `notif_jour_sent_at`,
  `notif_bilan_sent_at`) et plus du tout après publication (`annonce_publiee_le`,
  `bilan_publie_le`, écrites par les fenêtres Annonce et Bilan). Vérifier sans rien envoyer :
  relancer la commande de la tâche avec `{"simulation": true, "maintenant": "2026-11-06T09:05:00"}`
  (réponse dans `net._http_response` ; prévoir `timeout_milliseconds := 30000`, 5 s ne suffisent pas).
  Un rappel ouvre `/admin/evenements?annonce={id}` ou `?bilan={id}` : l'écran Communication
  ouvre la fenêtre puis retire le paramètre ; déconnecté, la connexion y ramène.
- **Le site utilise le défilement « doux »** : tout script qui fait défiler la page
  doit préciser `behavior: 'instant'`, sinon il n'atteint jamais le bas.
- `index.html` interdit volontairement le zoom sur mobile (`user-scalable=no`).
  Victor a tranché en août 2026 : c'est voulu, ne pas y revenir.

---

## 6. D'où vient la maquette

Les pages publiques suivent une maquette Claude Design :

- Projet : `3dc18446-7ce0-480b-a4ac-358c1bd7b46f` (« Refonte accueil ludothèque »)
- Fichier : `Site public 1C.dc.html`
- À relire avec l'outil `DesignSync` avant toute reprise du design.

La maquette est une démonstration figée : ses textes et ses chiffres sont fictifs.
Le vrai contenu vient de la base de données.

---

## 7. Vérifier le rendu dans un navigateur

Un navigateur est installé **hors du projet**, dans `~/.claude/tools/browser`
(il réutilise le Google Chrome de la machine).

```bash
# 1. lancer le site
npx vite --port 5199 --strictPort --no-open

# 2. photographier une page
node ~/.claude/tools/browser/shot.js http://localhost:5199/ /tmp/accueil.png 390 --full --scroll
```

- 3ᵉ paramètre : largeur en pixels (390 = téléphone, 1280 = ordinateur)
- `--full` : toute la hauteur de la page
- `--scroll` : fait défiler avant la photo — **indispensable**, sinon les sections qui
  apparaissent au défilement restent invisibles et la photo semble à moitié vide
- `--click=sélecteur` : cliquer avant la photo (ex. ouvrir le menu mobile).
  Peut être répété : chaque clic s'enchaîne, ce qui permet d'ouvrir une fenêtre
  puis une seconde depuis la première.

Pour l'espace de gestion, `admin-shot.js` se connecte d'abord avec un vrai compte :

```bash
ADMIN_EMAIL=… ADMIN_PASSWORD=… \
  node ~/.claude/tools/browser/admin-shot.js http://localhost:5199/admin/prets /tmp/prets.png 1280
```

Les identifiants passent **uniquement** par ces deux variables : ils ne doivent jamais
être écrits dans un fichier.

L'outil signale seul les **débordements horizontaux** (élément qui dépasse de l'écran),
les erreurs, et les images ou données qui ne se chargent pas.

**Toujours regarder les photos avant d'affirmer que quelque chose fonctionne.**
Plusieurs défauts d'affichage n'ont été trouvés que comme ça.
