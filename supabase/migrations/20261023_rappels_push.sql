-- Rappels sur les téléphones des bénévoles (étape 4 de la communication) :
-- dates de publication de l'annonce et du bilan, dates d'envoi des rappels.
-- Colonnes d'une table existante : droits hérités (lecture publique, modification par les
-- bénévoles connectés, fonction serveur avec la clé de service). Aucune donnée personnelle.
-- Conception : docs/superpowers/specs/2026-10-23-rappels-push-design.md
alter table public.events
  add column if not exists annonce_publiee_le timestamptz,
  add column if not exists bilan_publie_le timestamptz,
  add column if not exists notif_annonce_sent_at timestamptz,
  add column if not exists notif_jour_sent_at timestamptz;
