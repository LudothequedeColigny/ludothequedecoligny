# Onglet « Posts » : trois modèles graphiques — conception

Date : 28 octobre 2026 · Validé par Victor le 28/10/2026, partie par partie.
Maquettes : `Bureau/PERSO/Ludothèque/Maquette bilan soirée jeux/post-simple-maquette/`
(`post-A-photo-carte.jpg`, `post-B-photo-encadree.jpg`, `post-C-message.jpg`, `planche-post-simple.jpg`).

## Objectif

L'onglet « Posts » de Communication publiait un texte avec une photo mise au carré sur le fond bois (ou un
texte seul, Facebook uniquement). Il propose désormais **trois modèles** d'image 4:5 (1080 × 1350, JPEG) dans la
charte des bilans et annonces (pastille « Ludothèque de Coligny », cartes crème à ombre pleine, Bricolage
Grotesque / Poppins, fond bois bleu canard), publiés en **photo seule** sur Facebook et Instagram.

## Modèles et cases (validés)

| Modèle | Rendu | Cases |
|---|---|---|
| A « Photo + carte » (`photo-carte`) | photo plein cadre + dégradé bas ; carte crème penchée −1,5° en bas (ombre orange) : sur-titre orange en capitales, titre, texte | photo · sur-titre (défaut « À la ludothèque ») · titre · texte |
| B « Photo encadrée » (`photo-encadree`) | photo floutée en fond + voile bleu ; en haut phrase d'intro crème, titre crème + fin orange ; photo dans un cadre blanc penché +2° (ombre encre) avec légende ; adresse du site en bas | photo · intro · titre (blanc) · fin du titre (orange) · légende |
| C « Message » (`message`) | fond bois bleu canard ; gros titre contouré (crème, contour encre, ombre orange) ; 1–2 phrases crème ; 0 à 2 boutons crème ; adresse du site en bas | titre · phrases · boutons (liste : « Enregistrez ce post », « Partagez-le », « Identifiez un ami », « Plus d'infos sur le site », ou aucun) |

Longueurs maximales (compteur affiché) : sur-titre 30, titre A 50, texte A 160, intro 40, titre B 30, fin orange
20, légende 40, titre C 40, phrases C 140. Taille des lettres ajustée pour tenir ; « … » en dernier recours.
Le **texte de publication** (légende Facebook/Instagram) reste une case à part, obligatoire.

Remplace le « post texte seul » (Facebook uniquement) : un message sans photo passe par le modèle C et part aussi
sur Instagram.

## Écran

1. Trois vignettes de choix du modèle ; les cases changent selon le modèle.
2. Modèles A et B : « Ajouter une photo » → fenêtre de **floutage** (rectangles sur les visages, « Pas de visage à
   flouter », « Terminer », « Annuler »). L'image utilisée est **toujours la photo floutée** ; un rectangle tracé est
   flouté même sans action supplémentaire (règle de l'incident du 25-26/10/2026). Bouton « Changer de photo ».
3. Aperçu = l'image exacte publiée, redessinée à la saisie (court délai), à côté (ordinateur) ou dessous (téléphone).
4. « Publier sur Facebook & Instagram » → `ConfirmModal` → publication → `SuccessModal`. Cases vidées après succès.
   Onglet quitté avant publication : saisie perdue (comme avant).

## Technique

- `src/services/diapos/post-regles.js` (pur, testé) : modèles, limites, boutons, valeurs par défaut,
  `postPret(champs)` (ce qui manque), `planPost(champs)` (textes nettoyés et coupés aux limites).
- `src/services/diapos/post.js` : `dessinerPost(plan, { photo })` → canvas 1080 × 1350, avec les primitives de
  `dessin.js` et `annonce.js` (carte, espacer, largeur, baseLigne, limiterLignes) — jamais d'autres outils.
- `src/services/floutage.js` : `blocDeFloutage`, `pixelateRegion` sortis tels quels de `Evenements.jsx`, importés
  par la fenêtre Bilan (comportement inchangé) et par `components/admin/EditeurFloutagePhoto.jsx` (une photo,
  sortie : Blob WebP floutée, 2400 px au plus).
- `components/admin/PostSimple.jsx` : l'onglet, sorti de `Evenements.jsx`. Publication : `versBlob` →
  `uploadSocialBlob(blob, 'posts/post-<horodatage>.jpg')` (espace `event-images`) → `publierSurReseaux({ message,
  imageUrls: [url] })` (voie Make « une seule photo », inchangée) → trace dans `posts` (`message`, `image_url`,
  `has_image: true`) comme avant. La photo floutée n'est pas conservée à part.
- Page Confidentialité : « Photos d'événements » → « Photos d'événements et des publications ».

## Vérifications

`npm test` (règles), `npm run lint`, construction ; photos des trois modèles remplis, de la fenêtre de floutage
et de la confirmation à 390 et 1280 px ; fenêtre Bilan rouverte (floutage toujours appliqué) ; première vraie
publication = essai final avec Victor.
