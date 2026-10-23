-- ════════════════════════════════════════════════════════════════════════════
-- Annonce d'un événement (23 octobre 2026) : textes modifiables de l'annonce
-- (titre, 3 points « Ce qui vous attend », 2 infos pratiques), mémorisés par
-- événement. Null = textes types. Colonne d'une table existante : droits hérités.
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.events add column if not exists annonce jsonb;
