-- ════════════════════════════════════════════════════════════════════════════
-- Bilan automatique des soirées (23 octobre 2026)
--
-- Choix faits dans la fenêtre « Bilan » pour fabriquer le carrousel :
--  - photo de la soirée associée à chaque jeu joué (null = sans photo) ;
--  - photos des diapositives d'ouverture et « plein de jeux » (null = par défaut).
-- Aucune table nouvelle : les colonnes héritent des droits existants.
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.event_games_played add column if not exists photo_url text;
alter table public.events add column if not exists bilan_photo_ouverture text;
alter table public.events add column if not exists bilan_photo_jeux text;
