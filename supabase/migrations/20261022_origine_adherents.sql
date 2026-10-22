-- ════════════════════════════════════════════════════════════════════════════
-- « Comment nous avez-vous connus ? » sur la fiche adhérent (22 octobre 2026)
--
-- Indicateur de la stratégie de communication : savoir quel canal amène les
-- nouveaux adhérents (soirées, PanneauPocket, bouche-à-oreille…). La réponse
-- est choisie dans une liste fixe de l'écran Adhérents, pour pouvoir compter.
-- Vide pour les adhérents enregistrés avant cette date.
--
-- Aucun droit à ajouter : la colonne hérite de ceux de la table members
-- (bénévoles connectés seulement ; les visiteurs restent bloqués).
--
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.members
  add column if not exists origine text;
