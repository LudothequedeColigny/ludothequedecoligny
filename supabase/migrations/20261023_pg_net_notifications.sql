-- ════════════════════════════════════════════════════════════════════════════
-- Notifications des bénévoles : module pg_net (23 octobre 2026)
--
-- La tâche planifiée « check-events-notify » (toutes les 15 min) appelle la
-- fonction serveur du même nom avec net.http_post. Le module pg_net n'avait
-- jamais été installé : la tâche échouait à chaque passage depuis le
-- 20 juillet 2026 (« schema "net" does not exist ») et aucune notification
-- n'est jamais partie.
--
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_net;
