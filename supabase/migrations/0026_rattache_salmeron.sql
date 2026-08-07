-- ===========================================================================
-- SALMERÓN × GARDÓN : enfants documentés ANOM (Mers-el-Kébir, 1901-1904)
-- ---------------------------------------------------------------------------
-- Gracia (déjà en base) + Juan Pascual et Marcella à créer depuis les notes
-- d'union et le chantier SAL-04 (abouti).
-- ===========================================================================

-- Gracia SALMERÓN → Gabriel × María Dolores (hypothèse)
insert into arbre.filiations (union_id, enfant_id, nature)
select 'ec69c9e6-245a-439f-8363-2c46b2d353bc', '49a3fc51-d3e4-497b-a616-057f1bf796a0', 'naturelle'
where not exists (
  select 1 from arbre.filiations where enfant_id = '49a3fc51-d3e4-497b-a616-057f1bf796a0'
);

update arbre.personnes
set niveaux_preuve = (
  select coalesce(array_agg(distinct v), '{}')
  from unnest(niveaux_preuve || array['hypothese']::arbre.niveau_preuve[]) as v
),
notes = coalesce(notes, '') || E'\n\n[RATTACHEMENT 2026] Fille présumée de Gabriel Antonio SALMERÓN × María Dolores GARDÓN GONZÁLEZ (Mers-el-Kébir, 1901-1904). L''acte de mariage de Tiaret (1930) et la naissance de Gracia restent à confirmer (chantiers SAL-02, SAL-03).'
where id = '49a3fc51-d3e4-497b-a616-057f1bf796a0';

do $$
declare
  v_union uuid := 'ec69c9e6-245a-439f-8363-2c46b2d353bc';
  v_lieu  uuid := 'ac8e49b8-9c7e-40ce-a139-ed7764e26839'; -- Saint-André, Mers el-Kebir
  v_id    uuid;
begin
  -- Juan Pascual, né le 12 avril 1903, mort en 1904
  if not exists (
    select 1 from arbre.personnes p
    where p.nom = 'SALMERON' and p.prenoms = 'Juan Pascual'
  ) then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Juan Pascual', 'SALMERON', 'M', array['chereau'], array['anom']::arbre.niveau_preuve[],
      '[ANOM] Fils de Gabriel Antonio SALMERÓN × María Dolores GARDÓN GONZÁLEZ. Né le 12 avril 1903 à Saint-André, Mers-el-Kébir ; mort en 1904 (chantier SAL-04 abouti).');
    insert into arbre.evenements (personne_id, type, annee, mois, jour, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1903, 4, 12, 'jour', v_lieu, 'anom');
    insert into arbre.evenements (personne_id, type, annee, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'deces', 1904, 'annee', v_lieu, 'anom');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;

  -- Marcella, morte en 1904
  if not exists (
    select 1 from arbre.personnes p
    where p.nom = 'SALMERON' and p.prenoms = 'Marcella'
  ) then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Marcella', 'SALMERON', 'F', array['chereau'], array['anom']::arbre.niveau_preuve[],
      '[ANOM] Fille présumée de Gabriel Antonio SALMERÓN × María Dolores GARDÓN GONZÁLEZ. Morte en 1904 à Mers-el-Kébir ; date de naissance non relevée dans les registres consultés.');
    insert into arbre.evenements (personne_id, type, annee, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'deces', 1904, 'annee', v_lieu, 'anom');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;
end $$;

update arbre.unions
set notes = notes || E'\n\n[RATTACHEMENT 2026] Gracia SALMERÓN rattachée en hypothèse ; Juan Pascual (12/04/1903-1904) et Marcella (morte 1904) créés depuis les registres ANOM. Enfant sans vie (1901) non saisi faute de nom.',
    modifie_le = now()
where id = 'ec69c9e6-245a-439f-8363-2c46b2d353bc';
