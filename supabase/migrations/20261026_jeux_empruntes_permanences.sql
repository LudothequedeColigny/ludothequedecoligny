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
