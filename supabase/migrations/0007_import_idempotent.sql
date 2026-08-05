-- ===========================================================================
-- L'arbre de Leo — 0007 import idempotent
-- ---------------------------------------------------------------------------
-- index d unicite rendant l import GEDCOM rejouable
-- ===========================================================================

-- Un import GEDCOM doit pouvoir etre rejoue sans rien effacer au prealable.
-- Ces index d unicite le permettent : la reinsertion d un evenement deja
-- present ne cree plus de doublon, elle ne fait rien.
--
-- NULLS NOT DISTINCT est indispensable ici (Postgres 15+) : la plupart de ces
-- colonnes sont nulles pour un evenement donne, et sans cette clause deux
-- lignes portant NULL seraient considerees comme differentes.

create unique index evenements_import_unique
  on arbre.evenements (personne_id, union_id, type, date_texte, lieu_id, detail)
  nulls not distinct;

create unique index sources_import_unique
  on arbre.sources (personne_id, union_id, evenement_id, texte, page)
  nulls not distinct;

comment on index arbre.evenements_import_unique is
  'Rend l import GEDCOM rejouable : voir scripts/generate-import-sql.mjs, clause on conflict.';
