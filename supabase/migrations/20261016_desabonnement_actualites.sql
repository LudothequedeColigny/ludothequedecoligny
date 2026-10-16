-- ════════════════════════════════════════════════════════════════════════════
-- Désabonnement des actualités et comptage des visiteurs (16 octobre 2026)
--
-- 1. Les mails d'actualités envoyés aux adhérents (écran Communication) se
--    terminent par un lien personnel « Se désabonner ». Il mène à la page
--    /desabonnement, où un bouton confirme. La fiche adhérent garde aussi une
--    case « Ne plus recevoir les actualités ». Les autres mails (adhésion,
--    relances) restent envoyés : ils concernent l'adhésion elle-même.
--
-- 2. Le compteur de visites du site reconnaît désormais un navigateur qui
--    revient, grâce à un numéro tiré au hasard (sans nom ni adresse IP), gardé
--    13 mois au plus. Google Analytics est retiré : plus besoin de bandeau
--    cookies (dispense de la CNIL pour la mesure d'audience).
--
-- Se rejoue sans risque : chaque instruction vérifie ce qui existe déjà.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Désabonnement ─────────────────────────────────────────────────────────
alter table public.members
  add column if not exists refuse_actualites boolean not null default false;

-- Jeton personnel du lien de désabonnement : impossible à deviner, il ne
-- permet rien d'autre que se désabonner.
alter table public.members
  add column if not exists jeton_desabonnement uuid not null default gen_random_uuid();
create unique index if not exists members_jeton_desabonnement_key
  on public.members (jeton_desabonnement);

-- Appelée par la page publique /desabonnement. Ne renvoie aucune donnée sur
-- l'adhérent : seulement « fait » ou « lien inconnu ».
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
  return found;
end;
$$;

revoke all on function public.desabonner_actualites(uuid) from public;
grant execute on function public.desabonner_actualites(uuid) to anon, authenticated;

-- ── 2. Comptage des visiteurs ────────────────────────────────────────────────
alter table public.page_views
  add column if not exists visitor_id text;

commit;
