# Étiquettes code-barres des boîtes — conception

Date : 27 octobre 2026. Validé par Victor partie par partie le 27/10/2026, sur maquettes
(`.superpowers/brainstorm/39679-1793098018/content/` : `style-site-v2.html` pour le style,
`planche-a4-v6.html` pour la planche).

## Objectif

Remplacer la gommette de couleur et l'étiquette de code collées aujourd'hui sur chaque boîte
(les gommettes se décollent, l'ensemble n'est pas esthétique) par **une seule étiquette**,
imprimée sur planche A4 adhésive, qui réunit :

- le **code-barres du commerce** de la boîte (celui que lit déjà le scanner de l'écran Prêts) ;
- le **logo feuille** et « Ludothèque de Coligny » ;
- le **numéro d'inventaire** sur 4 chiffres (n° 0177) ;
- la **couleur de la catégorie** du jeu (classement de la ludothèque, 6 catégories au départ).

L'étiquette se colle **à l'horizontale sur la tranche** de la boîte rangée debout, **toujours en
bas** (à 5 mm du pied). Sa largeur suit l'épaisseur de la boîte (donnée par MyLudo).

## Ce que voit le bénévole

### Paramètres → encadré « Catégories des jeux »

- Liste des catégories : pastille de couleur, nom, nombre de jeux.
- Modifier la couleur (sélecteur de couleur + code hexadécimal), renommer, ajouter une catégorie,
  changer l'ordre.
- Supprimer : fenêtre de confirmation (`ConfirmModal`) qui indique le nombre de jeux concernés ;
  ces jeux redeviennent « sans catégorie ».
- Valeurs de départ, tirées du tableau Google « Liste des jeux catégories » (mise en forme
  conditionnelle de la colonne B) :

| Catégorie | Couleur |
|---|---|
| Jeu pour enfant | `#D99594` |
| Jeu d'enquête | `#FABF8F` |
| Jeu de stratégie / plateau | `#92CDDC` |
| Jeu à deux | `#C2D69B` |
| Jeu de carte | `#548DD4` |
| Jeu d'ambiance | `#FFE76E` |

### Fiche d'un jeu (écran Jeux)

- **Catégorie** : liste déroulante avec la pastille de couleur (catégories des Paramètres).
  Distincte du champ « catégorie » actuel, qui contient les thèmes MyLudo et reste inchangé.
- **Épaisseur de la boîte (mm)** : remplie automatiquement à l'ajout d'un jeu (scan ou recherche
  MyLudo) quand MyLudo la connaît ; modifiable à la main.
- Bouton **« Réimprimer l'étiquette »** (fiche d'un jeu existant) : remet le jeu dans la liste
  des étiquettes à imprimer.
- Le code-barres saisi est enregistré sans espaces (une espace parasite en tête empêchait la
  reconnaissance par le scanner ; un jeu concerné en octobre 2026).

### Écran Jeux → bouton « Étiquettes »

Même bouton qu'aujourd'hui (masqué sur téléphone, comme aujourd'hui). Nouvelle icône dessinée
`ludo-etiquettes.svg` (style des icônes dessinées : contour seul, trait 8 sur 300, bouts ronds,
`width`/`height` présents), à faire valider par Victor. La fenêtre a **deux onglets** :

1. **« Code-barres »** (ouvert par défaut) — le nouvel outil, **même disposition que le
   générateur QR** (en-tête, colonne de gauche, aperçu à droite, pied avec le bouton) :
   - **En-tête** : pastille d'icône + « Générateur d'**étiquettes** » ; sous le titre,
     « N à imprimer · M sélectionnées ».
   - **Colonne de gauche** : les jeux dont l'étiquette n'a pas encore été imprimée, **tous cochés
     au départ** ; champ « Filtrer… » et bouton « Tous / Aucun », comme pour les QR. Chaque ligne :
     case, pastille de la catégorie, nom, n° sur 4 chiffres ; mention « dépasse » pour les boîtes
     très fines (moins de 26 mm). En bas de la colonne, bloc repliable **« Ne peuvent pas encore
     avoir d'étiquette »** : chaque jeu avec sa raison (pas de code-barres, code-barres invalide,
     pas de catégorie, épaisseur inconnue) ; un clic ouvre sa fiche.
   - **Aperçu à droite** (fond crème) : « Aperçu — N étiquettes · K pages · A4 portrait », puis
     **les pages A4 l'une sous l'autre**, chacune titrée « Page x / K », dessinées exactement comme
     elles seront imprimées (étiquettes, noms sous les rangées, repères, réglette). Il se met à
     jour à chaque case cochée ou décochée. Un clic sur une page l'ouvre en grand
     (`VueAgrandie`, avec les flèches pour passer d'une page à l'autre). Sans sélection : icône et
     « Sélectionnez des jeux », comme pour les QR.
   - **Pied** : « A4 portrait · étiquettes 36 mm · noms sous chaque rangée · repères de coupe », et
     les boutons :
     - **« Page d'essai »** : PDF de la première page seulement ; ne marque rien.
     - **« Télécharger le PDF »** (bouton principal) : les pages de la sélection.
     - **« Marquer comme imprimées »** (après le téléchargement, avec confirmation) : enregistre
       la date d'impression des étiquettes sélectionnées, qui sortent de la liste.
2. **« Vidéo des règles »** — le générateur d'étiquettes QR actuel, inchangé.

## L'étiquette

Style A « bandeau de couleur », habillage « papier découpé » du site.

- **Rectangle à angles droits**, hauteur fixe **36 mm**. Le contour noir sert de trait de coupe ;
  l'ombre pleine décalée (0,9 mm, encre) est dessinée à l'intérieur, en bas et à droite.
- **Largeur** = épaisseur de la boîte − 4 mm, bornée entre **22 mm** et **50 mm**.
- **Bandeau** à la couleur de la catégorie, filet encre dessous ; **médaillon** blanc contourné
  avec la feuille (`public/logo-feuille.svg`) ; **pastille orange** `#e38154` contournée avec
  ombre : « n° 0177 » (numéro d'inventaire complété à 4 chiffres, sur l'étiquette seulement :
  les fiches gardent leur numéro).
- Fond crème `#fdfaf6` ; code-barres dans une **fenêtre blanche** contournée.
- Polices : Bricolage Grotesque (nom, numéro), chiffres du code-barres en chasse fixe.
- **Trois mises en page** selon la largeur W :

| W | Épaisseur de boîte | Disposition |
|---|---|---|
| ≥ 48 mm | ≥ 52 mm | bandeau : médaillon + « Ludothèque / de Coligny » (deux tons : encre / bleu canard) + pastille ; code-barres à plat dessous |
| 30 à 48 mm | 34 à 52 mm | bandeau : médaillon + pastille ; code-barres à plat ; « Ludothèque de Coligny » sur une ligne sous la fenêtre |
| < 30 mm | < 34 mm | bandeau : médaillon + pastille (réduits sous 26 mm) ; code-barres tourné d'un quart de tour ; nom en vertical à côté |

- **Code-barres EAN-13** : module 0,21 mm (≈ 64 % de la taille nominale), marges blanches de
  8 modules, barres de 10 mm (9 mm en mise en page étroite, 8 mm sous 26 mm), chiffres sous les
  barres. Un code à 12 chiffres (UPC-A) est complété d'un 0 en tête ; un code dont la clé de
  contrôle est fausse, ou d'une autre longueur, est refusé (liste « ne peuvent pas »).
  **Taille à confirmer par la page d'essai** (voir Vérifications) : si la lecture échoue, on
  augmente le module avant toute grosse impression.

## La planche A4

- A4 portrait, marges de **10 mm**.
- Étiquettes **accolées** dans une rangée, rangées de 36 mm, remplies de gauche à droite dans
  l'ordre des **numéros d'inventaire** (tri numérique).
- Sous chaque rangée, une **bande de 5 mm** (jetée à la découpe) porte le **nom du jeu** centré
  sous son étiquette : Poppins 600, 2,5 mm, réduit jusqu'à 1,8 mm puis raccourci par « … » si
  le nom ne tient pas dans la largeur.
- **Repères de coupe** (traits encre 0,2 mm) : dans les marges gauche et droite, en face du haut
  et du bas de chaque rangée ; sous chaque rangée, à chaque séparation entre deux étiquettes
  (et au-dessus de la première rangée de la page).
- Pied de page : « Ludothèque de Coligny — étiquettes code-barres — page x / n », et une
  **réglette de 10 cm** légendée « doit mesurer 10 cm » pour vérifier que l'impression n'a pas
  été réduite (« ajuster à la page »).
- Environ 25 étiquettes par page (6 rangées) : une quinzaine de pages pour la collection.
- **PDF vectoriel** (traits nets à toute résolution, indispensable au code-barres), polices du
  site intégrées, téléchargé directement.

## Données

Migration `supabase/migrations/20261027_etiquettes_code_barres.sql` :

- Table **`categories_jeux`** : `id`, `nom` (unique), `couleur` (`#RRGGBB`), `ordre`,
  `created_at`. `enable row level security` ; règles et `grant` pour `authenticated` seulement
  (lecture et écriture) ; aucun accès pour `anon` (le site public n'en a pas besoin). Remplie
  avec les 6 catégories ci-dessus.
- Table **`games`**, colonnes ajoutées (droits hérités de la table) :
  - `categorie_id` → `categories_jeux(id)`, `on delete set null` ;
  - `epaisseur_mm` (entier, entre 1 et 300) ;
  - `etiquette_imprimee_le` (timestamptz, vide = à imprimer).
- Fonction serveur `bgg-proxy` (MyLudo) : `getGameDetails` renvoie aussi `thicknessMm`
  (`metrics.height` en cm × 10, arrondi ; vide si absent).

## Remplissage initial (une seule fois, avec l'accord de Victor au moment de l'écriture)

1. **Catégories** : chaque ligne du tableau Google est associée à un jeu par son nom
   (comparaison sans accents, ponctuation ni casse, plus les variantes repérées : « Les Colons de
   Catane » → « Catane », « Pina Pirata » → « Piña Pirata »…). Correspondances sûres enregistrées ;
   douteuses et jeux absents du tableau listés pour Victor (à compléter dans les fiches).
2. **Épaisseurs** : pour chaque jeu avec code-barres, recherche MyLudo par code-barres, lecture
   de `metrics.height`. Sans dimension : épaisseur vide (le jeu apparaît dans « ne peuvent pas »
   jusqu'à ce qu'on mesure la boîte). Sur un échantillon de 45 jeux, MyLudo en connaissait 32.
3. **Code-barres** : retrait des espaces parasites.
4. Aucune étiquette marquée comme imprimée au départ.

## Découpage du code

- `src/services/etiquettes/ean13.js` — clé de contrôle, conversion UPC-A, motif des barres.
- `src/services/etiquettes/regles.js` — largeur, mise en page, numéro sur 4 chiffres, nom
  raccourci, raisons « ne peut pas », tri, répartition en rangées et en pages.
- `src/services/etiquettes/dessin.js` — dessin d'une étiquette et d'une page (SVG), partagé par
  l'aperçu et le PDF (l'aperçu est l'image exacte publiée, règle de Victor du 23/10/2026).
- `src/services/etiquettes/pdf.js` — fabrication du PDF vectoriel (bibliothèque chargée seulement
  à l'ouverture de l'onglet, pour ne pas alourdir le reste du site).
- `src/components/admin/etiquettes/` — fenêtre à onglets ; le générateur QR actuel est sorti de
  `Jeux.tsx` tel quel dans son propre fichier.
- Paramètres : encadré « Catégories des jeux » ; Jeux : champs de la fiche.

## Vérifications

- `npm test` : `ean13` (codes réels de la collection, clés fausses, UPC-A) et `regles`
  (bornes de largeur, seuils 26/30/48 mm, 4 chiffres, raccourci des noms, pagination).
- `npm run lint` (0 erreur), construction dans un dossier temporaire.
- Photos (`admin-shot.js`) : onglet Code-barres (sélection complète, partielle, vide), page
  ouverte en grand, onglet Vidéo des règles, encadré Paramètres, fiche d'un jeu, fenêtres de
  confirmation ; comparaison de l'aperçu avec le PDF téléchargé (mêmes pages).
- **Page d'essai réelle** (Victor) : imprimer sur papier, vérifier la réglette (10 cm), scanner
  au moins 5 étiquettes des trois mises en page avec l'écran Prêts, sur Android et sur iPhone.
  Tant que ce n'est pas fait, la taille du code-barres n'est pas validée.

## Hors périmètre

- Code-barres « maison » à partir du numéro d'inventaire (écarté par Victor : on garde le code
  du commerce ; les jeux sans code n'ont pas d'étiquette).
- Catégories affichées sur le site public (catalogue) : possible plus tard, la table le permet.
- Planches prédécoupées du commerce (cases de taille fixe, incompatibles avec la largeur variable).
- Étiquettes QR « vidéo des règles » : inchangées.
