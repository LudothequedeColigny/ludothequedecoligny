-- ════════════════════════════════════════════════════════════════════════════
-- Désabonnement des actualités par mail (16 octobre 2026)
--
-- Les mails d'actualités envoyés aux adhérents (écran Communication) indiquent
-- désormais comment ne plus les recevoir : répondre au mail. Le bénévole coche
-- alors « Ne plus recevoir les actualités » sur la fiche de l'adhérent, qui
-- disparaît des envois suivants. Les autres mails (adhésion, relances) restent
-- envoyés : ils concernent l'adhésion elle-même.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.members
  add column if not exists refuse_actualites boolean not null default false;
