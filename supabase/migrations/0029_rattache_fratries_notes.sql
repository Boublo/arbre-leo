-- ===========================================================================
-- Rattachements fratries et ascendants depuis notes [ACTE], [TABLE], [INSEE]
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Madeleine Ernestine FADAT → Ernest Louis × Clementine Alphonsine SUIRE
-- ---------------------------------------------------------------------------
insert into arbre.filiations (union_id, enfant_id, nature)
select 'cdc27073-84de-47f0-9ba2-f2f10c01970b', '270648b5-c1bf-4526-bda6-a099496e118e', 'naturelle'
where not exists (
  select 1 from arbre.filiations where enfant_id = '270648b5-c1bf-4526-bda6-a099496e118e'
);

-- ---------------------------------------------------------------------------
-- Henriette Adrienne LUCAS → Aristide François × Elionore Marie GUILLEMET
-- ---------------------------------------------------------------------------
insert into arbre.filiations (union_id, enfant_id, nature)
select '8302a5ea-a876-422c-bc64-98ae9bacf61d', 'ac11dbe8-c09f-47d3-9cb0-6af3e8008422', 'naturelle'
where not exists (
  select 1 from arbre.filiations where enfant_id = 'ac11dbe8-c09f-47d3-9cb0-6af3e8008422'
);

-- ---------------------------------------------------------------------------
-- Joseph Marie Angel CARO → François Pierre Marie × Marie Leonie SERAZIN
-- ---------------------------------------------------------------------------
insert into arbre.filiations (union_id, enfant_id, nature)
select 'edde978a-4a3d-4944-8640-95acf7394a0a', '4999cda3-8c3d-448f-9eb2-35321e6f4ff6', 'naturelle'
where not exists (
  select 1 from arbre.filiations where enfant_id = '4999cda3-8c3d-448f-9eb2-35321e6f4ff6'
);

-- ---------------------------------------------------------------------------
-- Fratrie CHEREAU (1920-1936) → Felix CHEREAU [INSEE, hypothèse]
-- ---------------------------------------------------------------------------
do $$
declare
  v_union uuid;
begin
  select id into v_union from arbre.unions
  where conjoint_a = '829cff4f-de4f-4cd2-a93c-6a72b3a30bfb' and conjoint_b is null;

  if v_union is null then
    v_union := gen_random_uuid();
    insert into arbre.unions (id, conjoint_a, conjoint_b, branches, notes, niveaux_preuve)
    values (v_union, '829cff4f-de4f-4cd2-a93c-6a72b3a30bfb', null, array['chereau'],
      '[INSEE] Père présumé de la fratrie née à Saint-Mars-d''Outille (1920-1929) et de Gilbert Constant (1936). Mère inconnue — actes de naissance à ouvrir (AD 72).',
      array['hypothese']::arbre.niveau_preuve[]);
  end if;

  insert into arbre.filiations (union_id, enfant_id, nature)
  select v_union, enfant_id, 'naturelle'
  from (values
    ('b11509af-1bd0-4168-82b8-3de3404661e8'::uuid),
    ('ab49ff4c-5453-4632-bbfc-60b6bf81e821'::uuid),
    ('a1433983-5251-4c8c-9368-755483d64c0b'::uuid),
    ('c485575d-f696-457b-8eea-8af34bd76d2a'::uuid),
    ('512197d2-c9ae-4850-ac48-806f49889334'::uuid),
    ('380046cd-4727-4a0d-b680-d11c6b9d6f60'::uuid)
  ) as t(enfant_id)
  where not exists (select 1 from arbre.filiations f where f.enfant_id = t.enfant_id);
end $$;

-- ---------------------------------------------------------------------------
-- Joseph BOUSQUIER → feu Sebastien BOUSQUIER × Josefa MARTINEZ [ANOM]
-- ---------------------------------------------------------------------------
do $$
declare
  v_sebastien uuid;
  v_josefa    uuid;
  v_union     uuid;
  v_lieu      uuid := '1f8f7edc-b484-42ab-b90d-abcca8095765';
begin
  select id into v_sebastien from arbre.personnes where nom = 'BOUSQUIER' and prenoms = 'Sebastien';
  if v_sebastien is null then
    v_sebastien := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_sebastien, 'Sebastien', 'BOUSQUIER', 'M', array['chereau'], array['anom']::arbre.niveau_preuve[],
      '[ANOM] Père de Joseph BOUSQUIER. Décédé à La Sénia avant avril 1893 (acte de mariage du fils).');
    insert into arbre.evenements (personne_id, type, precision_date, lieu_id, niveau_preuve, notes)
    values (v_sebastien, 'deces', 'inconnue', v_lieu, 'anom', 'Avant avril 1893, La Sénia');
  end if;

  select id into v_josefa from arbre.personnes where nom = 'MARTINEZ' and prenoms = 'Josefa'
    and notes ilike '%BOUSQUIER%';
  if v_josefa is null then
    select id into v_josefa from arbre.personnes where nom = 'MARTINEZ' and prenoms = 'Josefa' limit 1;
  end if;
  if v_josefa is null then
    v_josefa := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_josefa, 'Josefa', 'MARTINEZ', 'F', array['chereau'], array['anom']::arbre.niveau_preuve[],
      '[ANOM] Mère de Joseph BOUSQUIER. Vivante à La Sénia en avril 1893, assiste au mariage de son fils.');
  end if;

  select id into v_union from arbre.unions
  where conjoint_a = v_sebastien and conjoint_b = v_josefa;

  if v_union is null then
    v_union := gen_random_uuid();
    insert into arbre.unions (id, conjoint_a, conjoint_b, branches, notes, niveaux_preuve)
    values (v_union, v_sebastien, v_josefa, array['chereau'],
      '[ANOM] Parents de Joseph BOUSQUIER, relevés sur l''acte de mariage de ce dernier à La Sénia (avril 1893).',
      array['anom']::arbre.niveau_preuve[]);
  end if;

  insert into arbre.filiations (union_id, enfant_id, nature)
  select v_union, 'efa003d6-ce10-43cb-a3be-86363c96e4c3', 'naturelle'
  where not exists (
    select 1 from arbre.filiations where enfant_id = 'efa003d6-ce10-43cb-a3be-86363c96e4c3'
  );
end $$;

-- ---------------------------------------------------------------------------
-- Branche LEPINE (Loyat) — unions et fratrie depuis notes [ACTE]
-- ---------------------------------------------------------------------------
do $$
declare
  v_union_gp  uuid;
  v_union_jm  uuid;
  v_union_cv  uuid;
begin
  -- Mathurin LEPINE × Marie Madeleine ROUAUD
  select id into v_union_gp from arbre.unions
  where conjoint_a = '646262d0-4f48-4235-916b-fc60dcee060e'
    and conjoint_b = '119f38a2-fc25-4747-bd47-14a6fc01a552';

  if v_union_gp is null then
    v_union_gp := gen_random_uuid();
    insert into arbre.unions (id, conjoint_a, conjoint_b, branches, notes, niveaux_preuve)
    values (v_union_gp, '646262d0-4f48-4235-916b-fc60dcee060e', '119f38a2-fc25-4747-bd47-14a6fc01a552',
      array['chereau'],
      '[ACTE] Grands-parents paternels de la lignée LEPINE de Laura. Laboureurs au hameau de Fouleac, Loyat (Morbihan).',
      array['acte']::arbre.niveau_preuve[]);
  end if;

  insert into arbre.filiations (union_id, enfant_id, nature)
  select v_union_gp, 'ad4abeea-6443-4f70-9cc3-03f6e4530d9d', 'naturelle'
  where not exists (
    select 1 from arbre.filiations where enfant_id = 'ad4abeea-6443-4f70-9cc3-03f6e4530d9d'
  );

  -- Joseph Marie LEPINE × Jeanne Marie CHEVILLARD
  select id into v_union_jm from arbre.unions
  where conjoint_a = 'ad4abeea-6443-4f70-9cc3-03f6e4530d9d'
    and conjoint_b = '946ca337-7a40-4396-a0f0-e894ee90dcf3';

  if v_union_jm is null then
    v_union_jm := gen_random_uuid();
    insert into arbre.unions (id, conjoint_a, conjoint_b, branches, notes, niveaux_preuve)
    values (v_union_jm, 'ad4abeea-6443-4f70-9cc3-03f6e4530d9d', '946ca337-7a40-4396-a0f0-e894ee90dcf3',
      array['chereau'],
      '[ACTE] Fondateurs de la branche LEPINE de Néant-sur-Yvel. Joseph Marie né à Fouleac (Loyat) le 29 mai 1872 ; Jeanne Marie née à La Bouëxière (Ille-et-Vilaine) le 25 juillet 1866.',
      array['acte']::arbre.niveau_preuve[]);
  end if;

  insert into arbre.filiations (union_id, enfant_id, nature)
  select v_union_jm, enfant_id, 'naturelle'
  from (values
    ('fcdab968-666e-4068-bd5f-33b3ce4216e4'::uuid),
    ('49859764-8c8b-4f6c-ae88-64a4b0d42654'::uuid),
    ('0d118c34-597e-4fa3-b83a-6fb05e5f9171'::uuid),
    ('d9f65512-cb00-4151-82f7-14f6e0ebe25f'::uuid)
  ) as t(enfant_id)
  where not exists (select 1 from arbre.filiations f where f.enfant_id = t.enfant_id);

  -- Jeanne Marie CHEVILLARD → Constantin CHEVILLARD (père seul, mère inconnue)
  select id into v_union_cv from arbre.unions
  where conjoint_a = '983ac3ca-5795-494c-9d27-86e385c92bd1' and conjoint_b is null;

  if v_union_cv is null then
    v_union_cv := gen_random_uuid();
    insert into arbre.unions (id, conjoint_a, conjoint_b, branches, notes, niveaux_preuve)
    values (v_union_cv, '983ac3ca-5795-494c-9d27-86e385c92bd1', null, array['chereau'],
      '[ACTE] Grand-père maternel de la lignée LEPINE. Mère de Jeanne Marie inconnue.',
      array['acte']::arbre.niveau_preuve[]);
  end if;

  insert into arbre.filiations (union_id, enfant_id, nature)
  select v_union_cv, '946ca337-7a40-4396-a0f0-e894ee90dcf3', 'naturelle'
  where not exists (
    select 1 from arbre.filiations where enfant_id = '946ca337-7a40-4396-a0f0-e894ee90dcf3'
  );
end $$;
