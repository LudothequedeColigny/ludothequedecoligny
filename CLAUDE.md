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
| `/login` | Connexion bénévoles | `src/pages/Login.jsx` |
| `/inscription-permanence` | Inscription aux permanences | `src/pages/InscriptionPermanence.jsx` |
| toute autre | Page 404 | `src/pages/NotFound.jsx` |

`src/pages/Evenements.jsx` (`/evenements`) est une page inachevée, non reliée au site.

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
| `SiteHeader` | en-tête ; menu déroulant en dessous de 1024 px |
| `Reveal` | fait apparaître un bloc quand on arrive dessus en défilant |
| `CountUp` | compteur qui s'incrémente quand le chiffre devient visible |
| `Modal` | fenêtre par-dessus la page (voile bleu, panneau contouré) |
| `SuccessModal` | fenêtre de confirmation (coche verte) |
| `MaskIcon` | icône de `public/icons/` recolorée à la charte |
| `FloatingIcons` | icônes qui dérivent en fond de section |
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
- **`npm run lint` est cassé** (fichier de configuration absent) — inutile de l'exécuter.
- **Les fichiers SVG doivent garder leurs attributs `width` et `height`.** Sans eux,
  les icônes disparaissent complètement sur Safari (elles servent de pochoir de couleur).
- **Ne jamais empiler deux réglages d'espacement contradictoires** sur un même élément
  (par exemple `py-4` puis `py-5`) : le résultat est imprévisible.
- **Ne jamais assembler un nom de classe avec une variable** (`` `shadow-[4px_4px_0_${couleur}]` ``).
  Tailwind lit le texte des fichiers : il ne verrait pas la classe et produirait en
  plus une règle invalide. Écrire chaque variante en toutes lettres, ou passer par
  `style={{ boxShadow: … }}`.
- **Ne pas renommer la couleur `teal`** dans `tailwind.config.js` : l'espace
  d'administration s'en sert.
- **`src/.DS_Store` apparaît toujours comme modifié** : fichier système macOS, à ignorer.
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
