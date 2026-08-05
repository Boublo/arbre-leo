-- ===========================================================================
-- L'arbre de Leo — 0008 faits titre unique
-- ---------------------------------------------------------------------------
-- unicite du couple titre + annee de debut sur les faits historiques
-- ===========================================================================

-- Les faits historiques sont rattaches aux personnes en les retrouvant par leur
-- titre. Sans unicite, deux faits homonymes font que les rattachements de l un
-- se deversent dans l autre — le cas s est produit lors du premier versement,
-- deux redacteurs ayant cree « La grippe espagnole » a quatre minutes d ecart.
--
-- L unicite porte sur le couple titre + annee de debut : deux evenements
-- distincts peuvent legitimement porter le meme nom a deux siecles d ecart
-- (une disette, une epidemie, une crue), mais pas la meme annee.
create unique index faits_historiques_titre_annee_unique
  on arbre.faits_historiques (lower(titre), annee_debut);

comment on index arbre.faits_historiques_titre_annee_unique is
  'Empeche deux redacteurs de creer le meme fait en parallele et d y rattacher chacun la moitie des personnes.';
