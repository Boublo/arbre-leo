-- ===========================================================================
-- L'arbre de Léo — 0024 : droits sur demandes_portrait_carte
-- ---------------------------------------------------------------------------
-- La table 0020 a été créée après le GRANT global de 0004 : sans ces droits,
-- PostgREST renvoie « permission denied » même avec des politiques RLS valides.
-- ===========================================================================

grant select, insert, update, delete on table arbre.demandes_portrait_carte to authenticated;
