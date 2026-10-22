-- ════════════════════════════════════════════════════════════════════════════
-- Registre des pré-inscriptions (22 octobre 2026, indicateurs du tableau de bord)
--
-- Une pré-inscription est effacée quand un bénévole la valide, et de toute façon
-- au bout de 3 mois. Pour compter après coup les demandes reçues et validées,
-- ce registre garde seulement deux dates par demande : reçue le, validée le.
-- Aucun nom ni aucune adresse : il peut rester sans limite de durée sans
-- contredire la page Confidentialité.
--
-- Rempli tout seul à chaque nouvelle demande (déclencheur) ; l'écran Adhérents
-- note la date de validation. Droits posés explicitement (règle Supabase du
-- 30/10/2026) : bénévoles connectés seulement, visiteurs exclus.
--
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.preinscriptions_journal (
  -- Pas de lien vers preinscriptions : la demande elle-même finit effacée
  preinscription_id uuid primary key,
  recue_le timestamptz not null default now(),
  validee_le timestamptz
);

alter table public.preinscriptions_journal enable row level security;

revoke all on table public.preinscriptions_journal from public, anon, authenticated;
grant select on table public.preinscriptions_journal to authenticated;
grant update (validee_le) on table public.preinscriptions_journal to authenticated;

drop policy if exists "Registre lu par les bénévoles" on public.preinscriptions_journal;
create policy "Registre lu par les bénévoles" on public.preinscriptions_journal
  for select to authenticated using (true);
drop policy if exists "Validation notée par les bénévoles" on public.preinscriptions_journal;
create policy "Validation notée par les bénévoles" on public.preinscriptions_journal
  for update to authenticated using (true) with check (true);

create or replace function public.noter_preinscription_recue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into preinscriptions_journal (preinscription_id, recue_le)
  values (new.id, new.created_at)
  on conflict (preinscription_id) do nothing;
  return new;
end;
$$;

revoke all on function public.noter_preinscription_recue() from public, anon, authenticated;

drop trigger if exists noter_preinscription_recue on public.preinscriptions;
create trigger noter_preinscription_recue
  after insert on public.preinscriptions
  for each row execute function public.noter_preinscription_recue();

commit;
