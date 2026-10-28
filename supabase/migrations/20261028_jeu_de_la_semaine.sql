-- ════════════════════════════════════════════════════════════════════════════
-- Jeu de la semaine (28 octobre 2026)
--
-- Onglet « Jeu de la semaine » de l'écran Communication : les vidéos (Reels) sont
-- dans un dossier Google Drive ; la base ne garde que du texte (jeu choisi,
-- légende, date de publication, chemin de la copie temporaire).
-- Conception : docs/superpowers/specs/2026-10-28-jeu-de-la-semaine-design.md
--
-- jeux_semaine : bénévoles connectés (écran) et fonctions serveur (clé de service).
-- rappels_jeu_semaine : fonction check-events-notify seulement (un rappel par semaine).
-- Aucune donnée personnelle. Droits posés explicitement (règle Supabase du 30/10/2026).
--
-- Espace « reels » : public en lecture, car Instagram et Facebook téléchargent la
-- vidéo à son adresse ; écrit par la fonction jeu-semaine (clé de service) ; copies
-- effacées 7 jours après la publication par check-events-notify.
--
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.jeux_semaine (
  drive_id text primary key,
  nom_fichier text not null,
  game_id bigint references public.games (id) on delete set null,
  legende text,
  publie_le timestamptz,
  copie_chemin text,
  copie_effacee_le timestamptz,
  modifie_le timestamptz not null default now()
);

alter table public.jeux_semaine enable row level security;
revoke all on table public.jeux_semaine from public, anon, authenticated;
grant select, insert, update on table public.jeux_semaine to authenticated;
grant select, insert, update, delete on table public.jeux_semaine to service_role;

drop policy if exists "Jeu de la semaine géré par les bénévoles" on public.jeux_semaine;
create policy "Jeu de la semaine géré par les bénévoles" on public.jeux_semaine
  for all to authenticated using (true) with check (true);

create table if not exists public.rappels_jeu_semaine (
  semaine date primary key,
  envoye_le timestamptz not null default now()
);

alter table public.rappels_jeu_semaine enable row level security;
revoke all on table public.rappels_jeu_semaine from public, anon, authenticated;
grant select, insert, update, delete on table public.rappels_jeu_semaine to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reels', 'reels', true, 104857600, array['video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

commit;
