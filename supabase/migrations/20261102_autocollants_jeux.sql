-- Autocollants des boîtes préparés à l'avance (bandeau « Tout juste arrivés » de l'accueil).
-- L'image est fabriquée une fois par l'écran Jeux (services/autocollantsJeux.js), rangée dans
-- le stockage game-images (dossier autocollants/), et son adresse notée ici. Vide = à fabriquer.
-- Colonne d'une table existante : le droit de lecture du visiteur sur games la couvre déjà.
alter table public.games add column if not exists autocollant_url text;

-- Si l'image du jeu change, l'ancien autocollant ne lui correspond plus : on l'oublie,
-- l'écran Jeux en refera un. (Une mise à jour qui ne touche que l'autocollant passe telle quelle.)
create or replace function public.games_oublier_autocollant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.image_url is distinct from old.image_url
     and new.autocollant_url is not distinct from old.autocollant_url then
    new.autocollant_url := null;
  end if;
  return new;
end;
$$;

drop trigger if exists games_oublier_autocollant on public.games;
create trigger games_oublier_autocollant
  before update of image_url on public.games
  for each row execute function public.games_oublier_autocollant();
