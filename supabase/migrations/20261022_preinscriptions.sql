-- ════════════════════════════════════════════════════════════════════════════
-- Pré-inscription en ligne et liste « Recevoir les prochaines dates »
-- (22 octobre 2026, stratégie de communication — levier n°4)
--
-- 1. preinscriptions : demande d'adhésion faite sur la page /adherer. Le
--    bénévole la retrouve dans l'écran Adhérents (« à valider »), encaisse à
--    la permanence et la transforme en fiche adhérent. Effacée seule au bout
--    de 3 mois si personne n'est venu (promesse de la page Confidentialité).
--
-- 2. abonnes_dates : adresses e-mail de personnes non adhérentes qui veulent
--    recevoir les dates (encart de l'accueil, case du formulaire). Chacune a
--    son jeton de désinscription, comme les adhérents.
--
-- Un visiteur ne lit jamais ces tables : il passe par deux fonctions qui
-- vérifient ce qu'il envoie et n'ajoutent qu'une ligne. Droits posés
-- explicitement (règle Supabase du 30/10/2026).
--
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Tables ────────────────────────────────────────────────────────────────
create table if not exists public.preinscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null default 'Particulier' check (type in ('Particulier', 'Association')),
  prenom text check (char_length(prenom) <= 100),
  nom text not null check (char_length(nom) between 1 and 150),
  email text not null check (char_length(email) <= 200 and email ~ '^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$'),
  telephone text check (char_length(telephone) <= 40),
  commune text check (char_length(commune) <= 100),
  foyer text check (char_length(foyer) <= 300),
  origine text check (char_length(origine) <= 60),
  recevoir_dates boolean not null default false,
  confirmation_envoyee boolean not null default false
);

create table if not exists public.abonnes_dates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null check (char_length(email) <= 200 and email ~ '^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$'),
  source text not null default 'accueil' check (source in ('accueil', 'preinscription')),
  jeton_desabonnement uuid not null default gen_random_uuid(),
  bienvenue_envoyee boolean not null default false
);
create unique index if not exists abonnes_dates_email_key on public.abonnes_dates (lower(email));
create unique index if not exists abonnes_dates_jeton_key on public.abonnes_dates (jeton_desabonnement);

-- ── 2. Droits : bénévoles connectés seulement, en lecture et suppression ─────
alter table public.preinscriptions enable row level security;
alter table public.abonnes_dates enable row level security;

revoke all on table public.preinscriptions from public, anon, authenticated;
revoke all on table public.abonnes_dates from public, anon, authenticated;
grant select, delete on table public.preinscriptions to authenticated;
grant select, delete on table public.abonnes_dates to authenticated;

drop policy if exists "Pré-inscriptions lues par les bénévoles" on public.preinscriptions;
create policy "Pré-inscriptions lues par les bénévoles" on public.preinscriptions
  for select to authenticated using (true);
drop policy if exists "Pré-inscriptions effacées par les bénévoles" on public.preinscriptions;
create policy "Pré-inscriptions effacées par les bénévoles" on public.preinscriptions
  for delete to authenticated using (true);

drop policy if exists "Abonnés lus par les bénévoles" on public.abonnes_dates;
create policy "Abonnés lus par les bénévoles" on public.abonnes_dates
  for select to authenticated using (true);
drop policy if exists "Abonnés effacés par les bénévoles" on public.abonnes_dates;
create policy "Abonnés effacés par les bénévoles" on public.abonnes_dates
  for delete to authenticated using (true);

-- ── 3. Fonctions appelées par le site public ────────────────────────────────

-- Inscription aux dates. Répond toujours « oui » : impossible de savoir si une
-- adresse était déjà inscrite. Renvoie vrai seulement si l'adresse est nouvelle
-- (le mail de bienvenue n'est alors envoyé qu'une fois).
create or replace function public.inscrire_dates(adresse text, origine text default 'accueil')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ajoutees integer;
begin
  adresse := lower(trim(coalesce(adresse, '')));
  if adresse !~ '^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$' or char_length(adresse) > 200 then
    raise exception 'Adresse e-mail invalide';
  end if;
  -- Garde-fou contre les robots : 30 inscriptions par heure au plus
  if (select count(*) from abonnes_dates where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Trop de demandes, réessayez plus tard';
  end if;
  insert into abonnes_dates (email, source)
  values (adresse, case when origine = 'preinscription' then 'preinscription' else 'accueil' end)
  on conflict ((lower(email))) do nothing;
  get diagnostics ajoutees = row_count;
  return ajoutees > 0;
end;
$$;

-- Pré-inscription depuis la page /adherer. Renvoie le numéro de la demande,
-- qui sert ensuite à envoyer la confirmation (une seule fois, côté serveur).
create or replace function public.preinscrire(demande jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nouvel_id uuid;
  courriel text := lower(trim(coalesce(demande->>'email', '')));
begin
  if (select count(*) from preinscriptions where created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Trop de demandes, réessayez plus tard';
  end if;

  insert into preinscriptions (type, prenom, nom, email, telephone, commune, foyer, origine, recevoir_dates)
  values (
    case when demande->>'type' = 'Association' then 'Association' else 'Particulier' end,
    nullif(trim(demande->>'prenom'), ''),
    trim(coalesce(demande->>'nom', '')),
    courriel,
    nullif(trim(demande->>'telephone'), ''),
    nullif(trim(demande->>'commune'), ''),
    nullif(trim(demande->>'foyer'), ''),
    nullif(trim(demande->>'origine'), ''),
    coalesce((demande->>'recevoir_dates')::boolean, false)
  )
  returning id into nouvel_id;

  if coalesce((demande->>'recevoir_dates')::boolean, false) then
    perform inscrire_dates(courriel, 'preinscription');
  end if;

  return nouvel_id;
end;
$$;

revoke all on function public.inscrire_dates(text, text) from public;
revoke all on function public.preinscrire(jsonb) from public;
grant execute on function public.inscrire_dates(text, text) to anon, authenticated;
grant execute on function public.preinscrire(jsonb) to anon, authenticated;

-- Le lien « Ne plus recevoir nos actualités » sert aussi aux abonnés :
-- leur adresse est alors effacée (elle ne sert qu'à ça).
create or replace function public.desabonner_actualites(jeton uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.members
     set refuse_actualites = true
   where jeton_desabonnement = jeton;
  if found then
    return true;
  end if;
  delete from public.abonnes_dates
   where jeton_desabonnement = jeton;
  return found;
end;
$$;

revoke all on function public.desabonner_actualites(uuid) from public;
grant execute on function public.desabonner_actualites(uuid) to anon, authenticated;

commit;

-- ── 4. Effacement automatique, chaque nuit à 4 h ───────────────────────────
select cron.schedule(
  'effacer-preinscriptions-anciennes',
  '0 4 * * *',
  $$delete from public.preinscriptions where created_at < now() - interval '3 months'$$
);
