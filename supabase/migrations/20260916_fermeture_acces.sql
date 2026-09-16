-- ════════════════════════════════════════════════════════════════════════════
-- Fermeture des accès restés ouverts (audit du 16 septembre 2026)
--
-- Complète 20260902_verrouillage_acces.sql. En parallèle :
--   - la création de compte libre a été désactivée dans Supabase (Authentication)
--   - les fonctions send-email, send-push, bgg-proxy et check-events-notify
--     vérifient désormais qui les appelle
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Images des jeux : plus de dépôt ni de suppression par un inconnu ─────
-- Les images restent visibles de tous (dossier public) ; seules les écritures
-- sont réservées aux bénévoles connectés.
drop policy if exists "Autoriser l'upload 16wos6r_0" on storage.objects;
drop policy if exists "Autoriser l'upload 16wos6r_1" on storage.objects;
drop policy if exists "Autoriser l'upload 16wos6r_2" on storage.objects;
drop policy if exists "Autoriser l'upload 16wos6r_3" on storage.objects;

create policy "game-images lecture bénévoles" on storage.objects
  for select to authenticated using (bucket_id = 'game-images');
create policy "game-images dépôt bénévoles" on storage.objects
  for insert to authenticated with check (bucket_id = 'game-images');
create policy "game-images remplacement bénévoles" on storage.objects
  for update to authenticated using (bucket_id = 'game-images');
create policy "game-images suppression bénévoles" on storage.objects
  for delete to authenticated using (bucket_id = 'game-images');

-- ── 2. Images des événements : droits qui manquaient aux bénévoles ──────────
-- Sans eux, remplacer une version carrée déjà publiée et supprimer une photo
-- de bilan échouaient sans message.
create policy "event-images lecture bénévoles" on storage.objects
  for select to authenticated using (bucket_id = 'event-images');
create policy "event-images remplacement bénévoles" on storage.objects
  for update to authenticated using (bucket_id = 'event-images');
create policy "event-images suppression bénévoles" on storage.objects
  for delete to authenticated using (bucket_id = 'event-images');

-- ── 3. Collectivités : liste réservée aux bénévoles ─────────────────────────
drop policy if exists "Lecture collectivites" on public.collectivites;
drop policy if exists "Gestion collectivites" on public.collectivites;
create policy "Gestion collectivites" on public.collectivites
  for all to authenticated using (true) with check (true);

-- ── 4. Paramètres : coordonnées bancaires réservées aux bénévoles ───────────
-- Le site public lit horaires, tarifs et contact ; il n'affiche jamais l'IBAN.
drop policy if exists "Lecture publique des paramètres" on public.settings;
create policy "Lecture publique des paramètres" on public.settings
  for select to anon using (id not in ('iban', 'bic', 'nom_compte'));
create policy "Lecture bénévoles des paramètres" on public.settings
  for select to authenticated using (true);

-- ── 5. Anciens droits d'écriture inutiles pour un visiteur ──────────────────
-- Les verrous bloquaient déjà ces écritures ; on retire aussi les droits
-- eux-mêmes (dont TRUNCATE, que les verrous ne couvrent pas). La lecture est
-- conservée : les verrous décident ligne par ligne de ce qui est visible.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon;

-- Ce qu'un visiteur doit pouvoir écrire :
grant insert on public.page_views to anon;              -- compteur de visites
grant update (volunteers) on public.shifts to anon;     -- inscription aux permanences

commit;
