-- ===========================================================================
-- Rattachements issus des recherches internet (aout 2026)
-- ---------------------------------------------------------------------------
-- 1. France SUIRE → René Paul SUIRE × Gabrielle LUCAS (hypothèse ; Claude reste
--    chez Narcisse × Léone, confirmé par l'acte de mariage de 1956).
-- 2. Cinq enfants BOUSQUIER × SEGURA (ANOM / recensements La Sénia).
-- 3. Bernard BONDURAND → André BONDURAND (fratrie Solange et Jacques, INSEE).
-- ===========================================================================

-- France SUIRE : déplacer vers René Paul × Gabrielle
update arbre.filiations
set union_id = 'ce3eb60c-8792-4555-9d16-570caa300219'
where enfant_id = 'f1df0dc0-b9c6-4db2-ad67-5632b144d662'
  and union_id = 'c4b99c3f-e651-48a6-b36a-4bc81d4a4603';

update arbre.personnes
set niveaux_preuve = (
  select coalesce(array_agg(distinct v), '{}')
  from unnest(niveaux_preuve || array['hypothese']::arbre.niveau_preuve[]) as v
),
notes = coalesce(notes, '') || E'\n\n[HYPOTHESE] Rattachée à René Paul SUIRE × Gabrielle LUCAS (mariage 25 sept. 1920, Usseau). L''acte de naissance à Priaires (4 avr. 1922) reste à confirmer. Claude François, cousin germain, est bien fils de Narcisse × Léone (acte mariage 8 déc. 1956).'
where id = 'f1df0dc0-b9c6-4db2-ad67-5632b144d662';

update arbre.unions
set notes = notes || E'\n\n[RATTACHEMENT 2026] France Victorine Alina SUIRE (1922, Priaires) rattachée ici en hypothèse — cousine germaine de Claude, dont l''acte de mariage (1956) établit Narcisse × Léone comme parents. Acte de naissance de France à retrouver aux AD 79.',
    modifie_le = now()
where id = 'ce3eb60c-8792-4555-9d16-570caa300219';

-- Bernard BONDURAND : troisième enfant présumé d'André BONDURAND
insert into arbre.filiations (union_id, enfant_id, nature)
select 'd102de86-7bae-4eb9-b834-fd4cf2c2a53e', '236517df-16f4-4a89-9b86-264d08c4e2aa', 'naturelle'
where not exists (
  select 1 from arbre.filiations
  where enfant_id = '236517df-16f4-4a89-9b86-264d08c4e2aa'
);

update arbre.personnes
set notes = coalesce(notes, '') || E'\n\n[INSEE] Enfant présumé d''André BONDURAND, frère de Solange (1939) et Jacques (1942). Naissance à Vouillers (Marne), 25 fév. 1954 ; décès à Bar-le-Duc, 2021. Acte de naissance à demander (chantier BON-04).'
where id = '236517df-16f4-4a89-9b86-264d08c4e2aa'
  and notes not like '%Enfant présumé d''André BONDURAND%';

-- Enfants BOUSQUIER × SEGURA (ANOM, registres La Sénia)
do $$
declare
  v_union uuid := 'dc3686df-06ed-4816-bc9c-d900ef41b244';
  v_lieu  uuid := '1f8f7edc-b484-42ab-b90d-abcca8095765';
  v_id    uuid;
begin
  -- Antoine, vers 1894 (classe 1901 à La Sénia)
  if not exists (
    select 1 from arbre.personnes p
    join arbre.evenements e on e.personne_id = p.id and e.type = 'naissance'
    where p.nom = 'BOUSQUIER' and p.prenoms = 'Antoine' and e.annee = 1894
  ) then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Antoine', 'BOUSQUIER', 'M', array['chereau'], array['anom']::arbre.niveau_preuve[],
      '[ANOM] Fils présumé de Joseph BOUSQUIER × Maria SEGURA. Recensement 1901 à La Sénia, âge 7 ans (naissance vers 1894). Acte de naissance à retrouver.');
    insert into arbre.evenements (personne_id, type, annee, qualificatif, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1894, 'vers', 'annee', v_lieu, 'anom');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;

  -- Antoinette, 1904
  if not exists (
    select 1 from arbre.personnes p
    join arbre.evenements e on e.personne_id = p.id and e.type = 'naissance'
    where p.nom = 'BOUSQUIER' and p.prenoms = 'Antoinette' and e.annee = 1904
  ) then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Antoinette', 'BOUSQUIER', 'F', array['chereau'], array['anom']::arbre.niveau_preuve[],
      '[ANOM] Fille présumée de Joseph BOUSQUIER × Maria SEGURA. Naissance 1904 à La Sénia (registres ANOM).');
    insert into arbre.evenements (personne_id, type, annee, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1904, 'annee', v_lieu, 'anom');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;

  -- Robert Antoine Lucien, 1919
  if not exists (
    select 1 from arbre.personnes p
    join arbre.evenements e on e.personne_id = p.id and e.type = 'naissance'
    where p.nom = 'BOUSQUIER' and p.prenoms = 'Robert Antoine Lucien' and e.annee = 1919
  ) then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Robert Antoine Lucien', 'BOUSQUIER', 'M', array['chereau'], array['anom']::arbre.niveau_preuve[],
      '[ANOM] Fils présumé de Joseph BOUSQUIER × Maria SEGURA. Naissance 1919 à La Sénia.');
    insert into arbre.evenements (personne_id, type, annee, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1919, 'annee', v_lieu, 'anom');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;

  -- Antoine, 1921 (second homonyme)
  if not exists (
    select 1 from arbre.personnes p
    join arbre.evenements e on e.personne_id = p.id and e.type = 'naissance'
    where p.nom = 'BOUSQUIER' and p.prenoms = 'Antoine' and e.annee = 1921
  ) then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Antoine', 'BOUSQUIER', 'M', array['chereau'], array['anom']::arbre.niveau_preuve[],
      '[ANOM] Fils présumé de Joseph BOUSQUIER × Maria SEGURA. Naissance 1921 à La Sénia (distinct de l''aîné né vers 1894).');
    insert into arbre.evenements (personne_id, type, annee, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1921, 'annee', v_lieu, 'anom');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;

  -- Angel, 1924
  if not exists (
    select 1 from arbre.personnes p
    join arbre.evenements e on e.personne_id = p.id and e.type = 'naissance'
    where p.nom = 'BOUSQUIER' and p.prenoms = 'Angel' and e.annee = 1924
  ) then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Angel', 'BOUSQUIER', 'M', array['chereau'], array['anom']::arbre.niveau_preuve[],
      '[ANOM] Fils présumé de Joseph BOUSQUIER × Maria SEGURA. Naissance 1924 à La Sénia.');
    insert into arbre.evenements (personne_id, type, annee, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1924, 'annee', v_lieu, 'anom');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;
end $$;

update arbre.unions
set notes = notes || E'\n\n[RATTACHEMENT 2026] Cinq enfants présumés issus des registres ANOM / recensements à La Sénia : Antoine (vers 1894), Antoinette (1904), Robert Antoine Lucien (1919), Antoine (1921), Angel (1924). Copies intégrales de naissance à demander.',
    modifie_le = now()
where id = 'dc3686df-06ed-4816-bc9c-d900ef41b244';

-- Chantier pour confirmer les actes de naissance BOUSQUIER
insert into arbre.chantiers_recherche (titre, objectif, branche, statut, priorite)
select
  'BOUS-01 — Actes de naissance des enfants BOUSQUIER × SEGURA à La Sénia',
  'Obtenir les copies intégrales ANOM pour Antoine (vers 1894), Antoinette (1904), Robert Antoine Lucien (1919), Antoine (1921) et Angel (1924), tous nés à La Sénia (Oran). Ces rattachements proviennent des registres d''état civil et recensements consultés en ligne — les actes doivent les confirmer nominativement.',
  'CHEREAU (paternelle)',
  'a_faire',
  2
where not exists (
  select 1 from arbre.chantiers_recherche
  where titre like 'BOUS-01%'
);
