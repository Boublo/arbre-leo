-- ===========================================================================
-- Rattachements depuis les notes d'actes et tables décennales déjà en base
-- ---------------------------------------------------------------------------
-- Sources : notes [ACTE] et [TABLE] sur les fiches personnes et unions.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- TURGNE × Marianne SUIRE — enfants relevés sur les notes de Marianne [ACTE]
-- ---------------------------------------------------------------------------
do $$
declare
  v_union uuid := '3cb36b47-7359-4be7-aec4-1af2234a43fa';
  v_lieu  uuid := '515e0326-be9f-4885-a66f-54ea059709ab';
  v_id    uuid;
begin
  if not exists (select 1 from arbre.personnes where nom='TURGNE' and prenoms='Jean Romain') then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Jean Romain', 'TURGNE', 'M', array['suire'], array['acte']::arbre.niveau_preuve[],
      '[ACTE] Fils de Jean TURGNE × Marianne SUIRE. Relevé à Begue, février 1853 (table décennale / registre — acte à ouvrir aux AD 17).');
    insert into arbre.evenements (personne_id, type, annee, mois, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1853, 2, 'mois', v_lieu, 'acte');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;

  if not exists (select 1 from arbre.personnes where nom='TURGNE' and prenoms='Firmin') then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Firmin', 'TURGNE', 'M', array['suire'], array['acte']::arbre.niveau_preuve[],
      '[ACTE] Fils de Jean TURGNE × Marianne SUIRE. Né le 18 août 1856 à Begue (relevé sur les notes de Marianne SUIRE).');
    insert into arbre.evenements (personne_id, type, annee, mois, jour, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1856, 8, 18, 'jour', v_lieu, 'acte');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Jean Pierre SUIRE × Marie Magdelaine Julie — Jean Pierre Hilaire (1854)
-- ---------------------------------------------------------------------------
do $$
declare
  v_union uuid := '5faf922b-2d7a-40e5-a133-c67056b6eb90';
  v_lieu  uuid := '515e0326-be9f-4885-a66f-54ea059709ab';
  v_id    uuid;
begin
  if not exists (select 1 from arbre.personnes where nom='SUIRE' and prenoms='Jean Pierre Hilaire') then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Jean Pierre Hilaire', 'SUIRE', 'M', array['suire'], array['hypothese']::arbre.niveau_preuve[],
      '[TABLE] Fils présumé de Jean Pierre SUIRE × Marie Magdelaine Julie SUIRE (mariage 1849). Relevé table décennale 1853-1862 à Saint-Martin-de-Villeneuve ; acte de naissance à confirmer.');
    insert into arbre.evenements (personne_id, type, annee, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1854, 'annee', v_lieu, 'hypothese');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Jacques François SUIRE × Catherine DENIS — Joseph Constant (1856)
-- ---------------------------------------------------------------------------
do $$
declare
  v_union uuid := '659ec72d-e51d-4c83-91bc-90bd699f7a09';
  v_lieu  uuid := '515e0326-be9f-4885-a66f-54ea059709ab';
  v_id    uuid;
begin
  if not exists (select 1 from arbre.personnes where nom='SUIRE' and prenoms='Joseph Constant') then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Joseph Constant', 'SUIRE', 'M', array['suire'], array['hypothese']::arbre.niveau_preuve[],
      '[TABLE] Fils présumé de Jacques François SUIRE × Catherine DENIS. Relevé table décennale 1853-1862 ; plusieurs SUIRE coexistent à Begue — acte à ouvrir pour confirmer.');
    insert into arbre.evenements (personne_id, type, annee, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1856, 'annee', v_lieu, 'hypothese');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Manuel Garcia SEGURA × Maria GIMENEZ — Manuel (1883, ANOM La Sénia)
-- ---------------------------------------------------------------------------
do $$
declare
  v_union uuid := '102a591b-9e72-435b-bbab-caa44579a247';
  v_lieu  uuid := '1f8f7edc-b484-42ab-b90d-abcca8095765';
  v_id    uuid;
begin
  if not exists (
    select 1 from arbre.personnes p
    join arbre.evenements e on e.personne_id=p.id and e.type='naissance'
    where p.nom='SEGURA' and p.prenoms='Manuel' and e.annee=1883
  ) then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Manuel', 'SEGURA', 'M', array['chereau'], array['anom']::arbre.niveau_preuve[],
      '[ANOM] Fils présumé de Manuel Garcia SEGURA × Maria GIMENEZ. Naissance indexée à La Sénia en 1883 — acte à confirmer (ne pas confondre avec d''autres familles SEGURA du village).');
    insert into arbre.evenements (personne_id, type, annee, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1883, 'annee', v_lieu, 'anom');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Laurence CHATAIGNIER × PICORON Gaston — union et deux enfants [TABLE]
-- ---------------------------------------------------------------------------
do $$
declare
  v_laurence uuid := '04d79033-2879-48a4-8b81-fa5726563b14';
  v_gaston   uuid;
  v_union    uuid;
  v_lieu     uuid := '43be3b91-ac77-4b67-8f2a-9f45377562e5';
  v_id       uuid;
begin
  select id into v_gaston from arbre.personnes where nom='PICORON' and prenoms like 'Gaston%' limit 1;
  if v_gaston is null then
    v_gaston := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_gaston, 'Gaston Ernest Isidore', 'PICORON', 'M', array['suire'], array['acte']::arbre.niveau_preuve[],
      '[ACTE] Époux de Laurence Fernande CHATAIGNIER. Mariage à Priaires le 27 octobre 1919.');
  end if;

  select id into v_union from arbre.unions
  where conjoint_a = v_gaston and conjoint_b = v_laurence
     or conjoint_a = v_laurence and conjoint_b = v_gaston;

  if v_union is null then
    v_union := gen_random_uuid();
    insert into arbre.unions (id, conjoint_a, conjoint_b, branches, notes, niveaux_preuve)
    values (v_union, v_gaston, v_laurence, array['suire'],
      '[ACTE] Mariage à Priaires le 27 octobre 1919. Deux enfants relevés à la table décennale : Yvette Laurena (1918) et Gaston Jean Georges (1920).',
      array['acte']::arbre.niveau_preuve[]);
    insert into arbre.evenements (union_id, type, annee, mois, jour, precision_date, lieu_id, niveau_preuve)
    values (v_union, 'mariage', 1919, 10, 27, 'jour', v_lieu, 'acte');
  end if;

  if not exists (select 1 from arbre.personnes where nom='PICORON' and prenoms='Yvette Laurena') then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Yvette Laurena', 'PICORON', 'F', array['suire'], array['hypothese']::arbre.niveau_preuve[],
      '[TABLE] Fille présumée de Gaston PICORON × Laurence CHATAIGNIER. Née le 10 juin 1918 à Priaires (table décennale).');
    insert into arbre.evenements (personne_id, type, annee, mois, jour, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1918, 6, 10, 'jour', v_lieu, 'hypothese');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;

  if not exists (select 1 from arbre.personnes where nom='PICORON' and prenoms='Gaston Jean Georges') then
    v_id := gen_random_uuid();
    insert into arbre.personnes (id, prenoms, nom, sexe, branches, niveaux_preuve, notes)
    values (v_id, 'Gaston Jean Georges', 'PICORON', 'M', array['suire'], array['hypothese']::arbre.niveau_preuve[],
      '[TABLE] Fils présumé de Gaston PICORON × Laurence CHATAIGNIER. Né le 1er avril 1920 à Priaires (table décennale).');
    insert into arbre.evenements (personne_id, type, annee, mois, jour, precision_date, lieu_id, niveau_preuve)
    values (v_id, 'naissance', 1920, 4, 1, 'jour', v_lieu, 'hypothese');
    insert into arbre.filiations (union_id, enfant_id) values (v_union, v_id);
  end if;
end $$;

-- Mise à jour des notes d'union et chantiers aboutis
update arbre.unions set notes = notes || E'\n\n[RATTACHEMENT 2026] Jean Romain TURGNE (1853) et Firmin TURGNE (18/08/1856) rattachés depuis les notes [ACTE] de Marianne SUIRE.',
  modifie_le = now() where id = '3cb36b47-7359-4be7-aec4-1af2234a43fa'
  and notes not like '%[RATTACHEMENT 2026]%';

update arbre.unions set notes = notes || E'\n\n[RATTACHEMENT 2026] Jean Pierre Hilaire SUIRE (1854) rattaché en hypothèse depuis la table décennale.',
  modifie_le = now() where id = '5faf922b-2d7a-40e5-a133-c67056b6eb90'
  and notes not like '%[RATTACHEMENT 2026]%';

update arbre.chantiers_recherche
set statut = 'aboutie',
    resultat = 'Jean Romain TURGNE (fév. 1853) et Firmin TURGNE (18/08/1856) rattachés depuis les notes d''acte de Marianne SUIRE. Jean Pierre Hilaire SUIRE (1854) rattaché en hypothèse au couple SUIRE 1849.'
where titre like 'SUIRE-02%' or titre like 'SUIRE-01%';
