-- Verrouillage des accès à la base — 2 septembre 2026
--
-- Constat avant correction : six tables n'avaient aucun verrou (RLS désactivé)
-- alors que le rôle « anon » — celui de n'importe quel visiteur, la clé étant
-- publique par nature — disposait des droits SELECT, INSERT, UPDATE, DELETE et
-- TRUNCATE dessus. Concrètement, un inconnu pouvait lire les emails des
-- bénévoles et effacer l'intégralité du catalogue.
--
-- Plus grave encore : la fonction create_volunteer_manually, qui insère
-- directement un compte dans auth.users avec l'email déjà confirmé, était
-- appelable sans être connecté. N'importe qui pouvait se créer un accès à
-- l'espace de gestion.
--
-- Principe retenu : le site public garde ce dont il a besoin (lire le
-- catalogue, l'agenda, les permanences, et s'inscrire à une permanence), tout
-- le reste passe derrière la connexion.

-- ═══ 1. La création de compte n'est plus accessible sans connexion ═══
revoke all on function public.create_volunteer_manually(text, text) from public, anon;
revoke all on function public.create_volunteer_manually(text, text, text, text) from public, anon;
grant execute on function public.create_volunteer_manually(text, text) to authenticated;
grant execute on function public.create_volunteer_manually(text, text, text, text) to authenticated;

-- ═══ 2. profiles — emails et noms des bénévoles ═══
revoke all on table public.profiles from anon;
drop policy if exists "Les profils sont visibles par l'équipe" on public.profiles;
create policy "Profils réservés aux bénévoles connectés"
  on public.profiles for all to authenticated using (true) with check (true);
alter table public.profiles enable row level security;

-- ═══ 3. loans — les prêts en cours ═══
revoke all on table public.loans from anon;
drop policy if exists "Prêts réservés aux bénévoles connectés" on public.loans;
create policy "Prêts réservés aux bénévoles connectés"
  on public.loans for all to authenticated using (true) with check (true);
alter table public.loans enable row level security;

-- ═══ 4. loan_history — l'historique des prêts ═══
revoke all on table public.loan_history from anon;
drop policy if exists "Tout le monde peut voir l'historique" on public.loan_history;
drop policy if exists "Tout le monde peut ajouter à l'historique" on public.loan_history;
drop policy if exists "Historique réservé aux bénévoles connectés" on public.loan_history;
create policy "Historique réservé aux bénévoles connectés"
  on public.loan_history for all to authenticated using (true) with check (true);
alter table public.loan_history enable row level security;

-- ═══ 5. games — catalogue : lecture publique, modification réservée ═══
revoke insert, update, delete, truncate, references, trigger on table public.games from anon;
drop policy if exists "Catalogue visible par tous" on public.games;
drop policy if exists "Catalogue modifiable par les bénévoles" on public.games;
create policy "Catalogue visible par tous"
  on public.games for select to anon, authenticated using (true);
create policy "Catalogue modifiable par les bénévoles"
  on public.games for all to authenticated using (true) with check (true);
alter table public.games enable row level security;

-- ═══ 6. events — agenda : lecture publique, modification réservée ═══
revoke insert, update, delete, truncate, references, trigger on table public.events from anon;
drop policy if exists "Événements visibles par tous" on public.events;
drop policy if exists "Événements modifiables par les bénévoles" on public.events;
create policy "Événements visibles par tous"
  on public.events for select to anon, authenticated using (true);
create policy "Événements modifiables par les bénévoles"
  on public.events for all to authenticated using (true) with check (true);
alter table public.events enable row level security;

-- ═══ 7. shifts — permanences ═══
-- La page publique d'inscription doit pouvoir inscrire un bénévole sans
-- connexion : on lui laisse la modification de la seule colonne « volunteers »,
-- pas de la date ni du reste.
revoke insert, update, delete, truncate, references, trigger on table public.shifts from anon;
grant update (volunteers) on table public.shifts to anon;
drop policy if exists "Permanences visibles par tous" on public.shifts;
drop policy if exists "Inscription publique aux permanences" on public.shifts;
drop policy if exists "Permanences modifiables par les bénévoles" on public.shifts;
create policy "Permanences visibles par tous"
  on public.shifts for select to anon, authenticated using (true);
create policy "Inscription publique aux permanences"
  on public.shifts for update to anon using (true) with check (true);
create policy "Permanences modifiables par les bénévoles"
  on public.shifts for all to authenticated using (true) with check (true);
alter table public.shifts enable row level security;
