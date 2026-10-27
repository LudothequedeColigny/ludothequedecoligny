-- ════════════════════════════════════════════════════════════════════════════
-- Étiquettes code-barres des boîtes (27 octobre 2026)
--
-- Catégories de rangement de la ludothèque (une couleur chacune, modifiables
-- dans les Paramètres) et, pour chaque jeu : sa catégorie, l'épaisseur de sa
-- boîte (largeur de l'étiquette) et la date d'impression de son étiquette
-- (vide = à imprimer). Couleurs de départ : tableau Google « Liste des jeux
-- catégories ». Bénévoles connectés seulement pour la nouvelle table ; droits
-- posés explicitement (règle Supabase du 30/10/2026).
--
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.categories_jeux (
  id bigint generated always as identity primary key,
  nom text not null unique,
  couleur text not null check (couleur ~ '^#[0-9A-Fa-f]{6}$'),
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories_jeux enable row level security;

revoke all on table public.categories_jeux from public, anon, authenticated;
grant select, insert, update, delete on table public.categories_jeux to authenticated;

drop policy if exists "Catégories gérées par les bénévoles" on public.categories_jeux;
create policy "Catégories gérées par les bénévoles" on public.categories_jeux
  for all to authenticated using (true) with check (true);

insert into public.categories_jeux (nom, couleur, ordre) values
  ('Jeu pour enfant', '#D99594', 1),
  ('Jeu d''enquête', '#FABF8F', 2),
  ('Jeu de stratégie / plateau', '#92CDDC', 3),
  ('Jeu à deux', '#C2D69B', 4),
  ('Jeu de carte', '#548DD4', 5),
  ('Jeu d''ambiance', '#FFE76E', 6)
on conflict (nom) do nothing;

alter table public.games
  add column if not exists categorie_id bigint references public.categories_jeux (id) on delete set null,
  add column if not exists epaisseur_mm integer check (epaisseur_mm between 1 and 300),
  add column if not exists etiquette_imprimee_le timestamptz;

commit;
