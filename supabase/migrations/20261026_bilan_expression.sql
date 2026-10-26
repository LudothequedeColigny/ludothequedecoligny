-- ════════════════════════════════════════════════════════════════════════════
-- Expression libre dans les bilans (26 octobre 2026)
--
-- Phrase libre saisie dans la fenêtre « Bilan » (soirée, après-midi famille,
-- permanence), dessinée en une image juste avant « Merci » / « Prochaine permanence » :
--   { "texte": "Peu de participants mais une super ambiance !", "photo": "https://…" }
--   photo = une des photos du bilan, null = fond flouté ; colonne null = pas d'image.
-- Aucune table nouvelle : la colonne hérite des droits existants de `events`.
-- Se rejoue sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.events add column if not exists bilan_expression jsonb;
