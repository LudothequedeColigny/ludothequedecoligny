-- ════════════════════════════════════════════════════════════════════════════
-- Annonce des nouveaux jeux sur les réseaux (22 octobre 2026)
--
-- Onglet « Nouveaux jeux » de l'écran Communication : chaque jeu ajouté au
-- catalogue (depuis le 1er septembre 2026) y est proposé une fois. À la
-- publication, les jeux cochés sont notés « annonce », les décochés « ecarte »
-- (jeux peu intéressants dont on ne veut pas parler) : ni les uns ni les
-- autres ne reviennent ensuite.
--
-- Rangé à part de la table games, lisible par le public (catalogue) : un
-- visiteur ne doit pas pouvoir voir qu'un jeu a été écarté. Bénévoles
-- connectés seulement. Droits posés explicitement (règle Supabase du 30/10/2026).
--
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.annonces_jeux (
  game_id bigint primary key references public.games (id) on delete cascade,
  statut text not null check (statut in ('annonce', 'ecarte')),
  le timestamptz not null default now()
);

alter table public.annonces_jeux enable row level security;

revoke all on table public.annonces_jeux from public, anon, authenticated;
grant select, insert, update, delete on table public.annonces_jeux to authenticated;

drop policy if exists "Annonces gérées par les bénévoles" on public.annonces_jeux;
create policy "Annonces gérées par les bénévoles" on public.annonces_jeux
  for all to authenticated using (true) with check (true);

commit;
