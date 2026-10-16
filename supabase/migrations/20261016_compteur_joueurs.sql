-- ════════════════════════════════════════════════════════════════════════════
-- Compteur « Joueurs passionnés » de l'accueil (16 octobre 2026)
--
-- Depuis 20260902_verrouillage_acces.sql, un visiteur ne peut plus lire la
-- table des adhérents (c'est voulu : elle contient des données personnelles).
-- L'accueil, qui comptait les adhérents en lisant cette table, affichait donc 0.
--
-- Cette fonction renvoie seulement le nombre de joueurs (adhérents + membres
-- de leur famille), sans aucun nom ni aucune autre donnée.
-- ════════════════════════════════════════════════════════════════════════════

begin;

create or replace function public.nombre_joueurs()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    1 + case
          when jsonb_typeof(to_jsonb(m.family_members)) = 'array'
            then jsonb_array_length(to_jsonb(m.family_members))
          else 0
        end
  ), 0)::integer
  from public.members m;
$$;

revoke all on function public.nombre_joueurs() from public;
grant execute on function public.nombre_joueurs() to anon, authenticated;

commit;
