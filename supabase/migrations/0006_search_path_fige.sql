-- ===========================================================================
-- L'arbre de Leo — 0006 search path fige
-- ---------------------------------------------------------------------------
-- durcissement : search_path fige sur la fonction d horodatage
-- ===========================================================================

-- Un search_path mutable laisserait un appelant detourner la fonction vers
-- ses propres objets. On le fige, comme pour les autres fonctions du schema.
create or replace function arbre.touch_modifie_le()
returns trigger
language plpgsql
set search_path = arbre, pg_temp
as $$
begin
  new.modifie_le := now();
  return new;
end;
$$;
