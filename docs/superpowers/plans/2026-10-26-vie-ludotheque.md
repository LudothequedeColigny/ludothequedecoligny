# Page « La vie de la ludothèque » — refonte (conception + plan)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refaire la page publique `/vie-association` dans le style des bilans publiés sur les réseaux, d'après la maquette validée par Victor le 26/10/2026.

**Maquette validée (référence visuelle obligatoire) :** captures `Bureau/PERSO/Ludothèque/Maquette bilan soirée jeux/vie-ludotheque-maquette/` (`vie-ordinateur.png`, `vie-telephone.png`, `vie-galerie.png`, `zoom-1..4`), page jetable `public/maquette-vie.html` (non suivie par Git, copiée dans le dossier de travail SDD sous `maquette-reference.html` ; **à supprimer de `public/` à la fin**).

## Contenu (validé)

1. **En-tête** : titre « La vie de / la ludothèque » (inchangé) + 4 chiffres clés en cartes penchées papier découpé (`CountUp`) : événements organisés (soirées + après-midi famille), participants au total, jeux différents joués, jeux empruntés en permanence.
2. **« Combien étions-nous ? »** : graphique pleine largeur, une barre par soirée (bleu `#1a5f7a`) / après-midi famille (orange `#e38154`), chiffre au-dessus, date + genre dessous, légende ; note « Les permanences n'y figurent pas : on y compte les jeux empruntés, pas les visiteurs. » Défilement horizontal sur téléphone si beaucoup de barres.
3. **« Nos derniers rendez-vous »** : filtres « Tout / Soirées / Après-midi famille / Permanences » (avec compteurs), événements regroupés par mois (« Octobre 2026 »), 6 cartes affichées puis bouton « Voir les événements plus anciens » (+6).
4. **Carte soirée / après-midi famille** : grande photo (photo d'ouverture choisie dans le bilan `events.bilan_photo_ouverture` si elle fait partie des photos, sinon la 1re) avec « Le 2 octobre, c'était » + étiquette orange « Soirée jeux ! » / « Après-midi en famille ! » + « Vendredi 2 octobre · 19h · Salle des fêtes de Coligny » ; bouton « Agrandir » ; à droite « NOUS ÉTIONS » + nombre en grand (contour encre, ombre orange) + « joueuses et joueurs ! » / « petits et grands ! » ; expression libre (`events.bilan_expression.texte`) en carte crème penchée « « … » — LE MOT DES BÉNÉVOLES » ; polaroïds des photos (3 + tuile « +N photos ») et « Voir les N photos » → galerie (`MediaLightbox` existant) ; bande « Et on a joué à… N jeux » de boîtes en **autocollant** (même effet que les publications, `src/services/diapos/autocollant.js`), « À emprunter » (bleu) pour `in_catalogue`, chaque boîte mène au catalogue filtré sur son nom (`/catalogue?q=Nom`) ; bande défilante sur téléphone. Sans photo : fond = mosaïque floutée des jaquettes + 3 boîtes en éventail, et « Pas de photo cette fois-ci… mais N jeux sont sortis des étagères ce soir-là ! ». Sans participants : pas de bloc « nous étions ». Affichée si participants > 0, ou photos, ou jeux.
5. **Carte permanence** (compacte) : étiquette bleue « Permanence », date, « N jeux ont été empruntés ! » (N = jeux distincts, un prêt rendu le jour même ne compte pas), grille de jaquettes en autocollant (12 au plus, puis « … et N autres »), « Au local, 419 Grande Rue. » (adresse lue dans les Paramètres `adresse_rue` si présente). Jamais d'emprunteur. Affichée seulement si N > 0. Deux permanences consécutives d'un même mois côte à côte sur ordinateur.
6. **Fin de page** : « Prochain rendez-vous » (prochain événement à venir non archivé : affiche penchée, titre, date, lieu, bouton « Toutes nos dates » → `/#agenda` ou la section agenda de l'accueil) puis l'encart existant `RecevoirDates`.
7. Conserver : `usePageMeta` (titre/description), `compterVisite('vie-association')`, `PublicLayout`, `Reveal`.

## Données

- Lecture publique existante : `events` (`select('*')`), `event_photos`, `event_games_played` ; `settings` pour l'adresse.
- **Nouveau** : fonction `public.jeux_empruntes_permanences()` (le visiteur ne peut pas lire les prêts) — migration `supabase/migrations/20261026_jeux_empruntes_permanences.sql` :

```sql
-- Jeux empruntés à chaque permanence passée, pour la page publique « La vie de la ludothèque ».
-- Le visiteur ne peut pas lire loans / loan_history (données personnelles) : cette fonction ne
-- renvoie que des jeux (jamais l'emprunteur), un prêt rendu le jour même n'est pas compté.
create or replace function public.jeux_empruntes_permanences()
returns table (event_id bigint, jour date, game_id bigint, nom text, image_url text)
language sql stable security definer set search_path = public as $$
  with permanences as (
    select e.id, e.date::date as jour
    from events e
    where e.date < now()
      and lower(e.title) like '%permanence%'
      and lower(translate(e.title, 'éÉèÈ', 'eeee')) not like '%soiree%'
      and lower(e.title) not like '%famil%'
  ),
  prets as (
    select l.game_id, l.loan_date from loans l
    union all
    select h.game_id, h.loan_date from loan_history h
    where h.return_date is null or h.return_date <> h.loan_date
  )
  select distinct p.id, p.jour, g.id, g.name, g.image_url
  from permanences p
  join prets on prets.loan_date = p.jour
  join games g on g.id = prets.game_id
$$;
revoke all on function public.jeux_empruntes_permanences() from public;
grant execute on function public.jeux_empruntes_permanences() to anon, authenticated;
```
  Appliquée à la mise en ligne (accord de Victor), **avant** la publication du site ; sans elle (erreur de lecture), les cartes de permanence ne s'affichent pas et le chiffre « jeux empruntés » est masqué — jamais d'erreur visible.

## Global Constraints

- Charte : papier découpé (contour encre 2 px, ombre pleine décalée sans flou, s'enfonce au survol), couleurs `#1a5f7a` / `#e38154` / `#0f172a` / `#fdfaf6`, Bricolage Grotesque (titres, `font-display`) / Poppins (`font-body`). Classes Tailwind écrites en toutes lettres (jamais assemblées avec une variable) ; jamais deux réglages contradictoires sur un même élément.
- Pas de `ctx.filter` dans les canvas ; détourage des jaquettes **paresseux** (seulement les boîtes visibles, `IntersectionObserver`), mis en cache par adresse, avec repli immédiat sur l'image simple encadrée tant que l'autocollant n'est pas prêt ; jamais plus d'un détourage à la fois (mémoire des téléphones).
- Aucune donnée personnelle affichée ; aucun nouvel outil extérieur (pas de Google Fonts, pas de mesure d'audience).
- Pas de débordement horizontal à 390 px ; défilements `behavior: 'instant'` si un script fait défiler la page.
- Code et commentaires en français ; `npm run lint` 0 erreur (5 avertissements connus) ; `npm test` vert.
- Commits `git -c user.email=victor.guyon@hotmail.fr commit`, message terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais de push ; ne pas appliquer la migration.

## File Structure

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20261026_jeux_empruntes_permanences.sql` (créé) | fonction ci-dessus |
| `src/services/vieLudotheque.js` (créé) + `.test.js` | règles pures : cartes, chiffres clés, série de fréquentation, regroupement par mois, filtres |
| `src/hooks/useAutocollant.js` (créé) | jaquette → image autocollant (PNG) paresseuse et en cache |
| `src/components/site/vie/` (créé) | `ChiffresCles`, `GraphiqueFrequentation`, `FiltresEvenements`, `CarteEvenement`, `CartePermanence`, `BandeJeux`, `BoiteAutocollant`, `ProchainRendezVous` |
| `src/pages/VieAssociation.jsx` (réécrit) | assemble la page |
| `src/pages/Catalogue.jsx` (modifié) | `?q=Nom` pré-remplit la recherche |
| `CLAUDE.md` (modifié) | page et fonction décrites |

## Règles pures (Task 1) — interface

- `cartesEvenements({ evenements, photos, jeux, emprunts, maintenant })` → cartes triées du plus récent au plus ancien :
  - soirée/famille/autre : `{ id, type: 'soiree'|'famille'|'autre', date, titre, etiquette, quand, photo, photos: string[], nombre: number|null, libelleNombre, expression: string|null, jeux: [{ nom, image, dispo }] }` ; `etiquette` : « Soirée jeux ! » / « Après-midi en famille ! » / titre de l'événement ; `quand` : « Vendredi 2 octobre · 19h · Salle des fêtes de Coligny » (`lieuCourt`, `jourMois` de `regles.js`) ; affichée si `nombre` ou photos ou jeux ;
  - permanence (`estPermanence`) : `{ id, type: 'permanence', date, quand: 'Samedi 3 octobre', nombre, jeux: [{ nom, image }] }` (jeux distincts par `game_id`, triés par nom, venant de `emprunts` = lignes de la fonction) ; affichée si `nombre > 0` ;
  - seulement les événements passés (`dateLocale(date) < maintenant`), archivés compris.
- `chiffresCles({ cartes })` → `{ organises, participants, jeuxJoues, jeuxEmpruntes }` (jeux joués : noms distincts sans accents/casse ; `jeuxEmpruntes` : somme des `nombre` des permanences, `null` si aucune donnée d'emprunt).
- `serieFrequentation(cartes)` → `[{ id, type, nombre, jour: '3 juil.', genre: 'Soirée'|'Famille' }]` du plus ancien au plus récent (soirée/famille avec `nombre`).
- `filtrer(cartes, filtre)` (`'tout'|'soiree'|'famille'|'permanence'`) et `compteurs(cartes)`.
- `parMois(cartes)` → `[{ cle: '2026-10', titre: 'Octobre 2026', cartes }]`.
Tests : cas des données réelles (soirées 03/07, 11/09, 02/10 ; famille 24/10 avec expression ; permanences 04/07, 18/07, 03/10, 17/10), photo d'ouverture choisie / absente / supprimée, événement sans photo, sans participants, permanence sans emprunt (masquée), prêt rendu le jour même déjà exclu par la fonction, regroupement par mois, filtres et compteurs, chiffres clés.

---

### Task 1: Migration et règles pures
- [ ] Migration (SQL ci-dessus, verbatim), non appliquée.
- [ ] `vieLudotheque.js` + tests (TDD), réutilise `typeEvenement`, `dateLocale`, `jourMois`, `lieuCourt`, `sansAccents` (`regles.js`), `estPermanence` (`permanence-regles.js`).
- [ ] lint, test ; commit « feat: page vie de la ludothèque — fonction des emprunts et règles ».

### Task 2: Composants et page
- [ ] `useAutocollant(url)` : renvoie l'URL d'une image autocollant (canvas : `detourer` + `autocollant` de `autocollant.js`, fond transparent, exporté en PNG via `toBlob` → object URL) quand la boîte devient visible ; file d'attente d'un détourage à la fois ; cache par adresse (module) ; `null` tant que pas prêt.
- [ ] `BoiteAutocollant` : affiche l'autocollant si prêt, sinon la jaquette dans un cadre blanc contouré avec ombre pleine (même encombrement : pas de saut de mise en page).
- [ ] Composants listés, page réécrite d'après la maquette ; `MediaLightbox` pour la galerie et l'agrandissement ; `RecevoirDates` en fin de page ; `Catalogue.jsx` lit `?q=`.
- [ ] Chargement : `events`, `event_photos`, `event_games_played`, `settings` (adresse), `rpc('jeux_empruntes_permanences')` en parallèle ; une erreur de la fonction → pas de permanences ni de chiffre d'emprunts, sans message.
- [ ] Vérification : photos de la page à 1280 et 390 (`shot.js --full --scroll`), galerie ouverte, filtres, « Voir les événements plus anciens » ; comparer à la maquette ; aucun débordement ; console propre. La fonction n'étant pas encore en base, vérifier aussi les permanences en interceptant l'appel `rpc/jeux_empruntes_permanences` avec des lignes réelles (lues par `supabase db query --linked` en lecture seule).
- [ ] lint, test, build ; commit « feat: page vie de la ludothèque au style des bilans ».

### Task 3: Documentation (contrôleur)
`CLAUDE.md` : table des pages (« Vie de la ludothèque » : bilans façon publications), fonction `jeux_empruntes_permanences()` dans la liste des accès du visiteur, `useAutocollant`. Supprimer `public/maquette-vie.html`.
