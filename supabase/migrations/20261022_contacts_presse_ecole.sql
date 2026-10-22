-- ════════════════════════════════════════════════════════════════════════════
-- Contacts presse et école dans « Destinataires enregistrés » (22 octobre 2026)
--
-- La liste `collectivites` (contacts qui reçoivent l'annonce des événements)
-- accueille désormais trois catégories : mairie, presse, école. Les contacts
-- existants restent des mairies. À l'envoi, seules les mairies sont cochées
-- par défaut (choix de Victor).
--
-- Aucun droit à ajouter : la colonne hérite de ceux de la table.
--
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.collectivites
  add column if not exists categorie text not null default 'mairie';

alter table public.collectivites
  drop constraint if exists collectivites_categorie_check;
alter table public.collectivites
  add constraint collectivites_categorie_check check (categorie in ('mairie', 'presse', 'ecole'));
