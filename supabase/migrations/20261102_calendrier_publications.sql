-- Calendrier des publications (onglet Calendrier de Communication) : ce qui est fait, et les
-- rappels déjà partis, pour chaque action. Table existante : pas de nouveau droit d'accès.
-- Conception : docs/superpowers/specs/2026-11-02-calendrier-publications-design.md
alter table public.events
  add column if not exists mail_collectivites_envoye_le timestamptz,
  add column if not exists mail_adherents_envoye_le timestamptz,
  add column if not exists story_veille_faite_le timestamptz,
  add column if not exists story_jour_faite_le timestamptz,
  add column if not exists notif_mail_collectivites_sent_at timestamptz,
  add column if not exists notif_mail_adherents_sent_at timestamptz,
  add column if not exists notif_story_veille_sent_at timestamptz;

-- Les mails déjà envoyés partaient à tous les publics à la fois
update public.events
  set mail_collectivites_envoye_le = coalesce(mail_collectivites_envoye_le, mail_sent_at),
      mail_adherents_envoye_le = coalesce(mail_adherents_envoye_le, mail_sent_at)
  where mail_sent_at is not null;
