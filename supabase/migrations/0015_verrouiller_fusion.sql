-- Verrouille les RPC de fusion : réservées aux administrateurs.
-- Avant ce correctif, anon + authenticated pouvaient appeler
-- fusionner_personnes / fusionner_unions (SECURITY DEFINER sans garde).

create or replace function arbre.fusionner_personnes(p_garde uuid, p_perdue uuid)
returns void
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  n_garde arbre.personnes;
  n_perdue arbre.personnes;
begin
  if not arbre.est_admin() then
    raise exception 'Réservé aux administrateurs.';
  end if;

  if p_garde = p_perdue then
    raise exception 'Impossible de fusionner une personne avec elle-meme.';
  end if;

  select * into n_garde  from arbre.personnes where id = p_garde;
  select * into n_perdue from arbre.personnes where id = p_perdue;

  if n_garde.id is null then
    raise exception 'Personne « gardee » % introuvable', p_garde;
  end if;
  if n_perdue.id is null then
    raise exception 'Personne « perdue » % introuvable', p_perdue;
  end if;

  update arbre.personnes
  set notes = trim(both e'\n' from
    coalesce(n_garde.notes, '') ||
    case when n_garde.notes is not null and n_perdue.notes is not null then e'\n\n---\n\n' else '' end ||
    coalesce(n_perdue.notes, '')
  ),
  niveaux_preuve = (
    select coalesce(array_agg(distinct v order by v), '{}')
    from unnest(n_garde.niveaux_preuve || n_perdue.niveaux_preuve) as v
  ),
  branches = (
    select coalesce(array_agg(distinct b order by b), '{}')
    from unnest(n_garde.branches || n_perdue.branches) as b
  ),
  surnom = coalesce(n_garde.surnom, n_perdue.surnom),
  nom_naissance = coalesce(n_garde.nom_naissance, n_perdue.nom_naissance),
  prenoms = coalesce(nullif(n_garde.prenoms, ''), n_perdue.prenoms),
  nom = coalesce(nullif(n_garde.nom, ''), n_perdue.nom),
  sexe = case when n_garde.sexe <> 'inconnu' then n_garde.sexe else n_perdue.sexe end
  where id = p_garde;

  delete from arbre.evenements ep
  where ep.personne_id = p_perdue
    and exists (
      select 1 from arbre.evenements eg
      where eg.personne_id = p_garde
        and eg.type = ep.type
        and coalesce(eg.date_texte, '') = coalesce(ep.date_texte, '')
        and coalesce(eg.lieu_id::text, '') = coalesce(ep.lieu_id::text, '')
        and coalesce(eg.detail, '') = coalesce(ep.detail, '')
    );

  delete from arbre.sources sp
  where sp.personne_id = p_perdue
    and exists (
      select 1 from arbre.sources sg
      where sg.personne_id = p_garde
        and coalesce(sg.union_id::text, '') = coalesce(sp.union_id::text, '')
        and coalesce(sg.evenement_id::text, '') = coalesce(sp.evenement_id::text, '')
        and coalesce(sg.texte, '') = coalesce(sp.texte, '')
        and coalesce(sg.page, '') = coalesce(sp.page, '')
    );

  update arbre.evenements        set personne_id = p_garde where personne_id = p_perdue;
  update arbre.sources           set personne_id = p_garde where personne_id = p_perdue;
  update arbre.commentaires      set personne_id = p_garde where personne_id = p_perdue;
  update arbre.chantiers_recherche set personne_id = p_garde where personne_id = p_perdue;
  update arbre.unions set conjoint_a = p_garde where conjoint_a = p_perdue;
  update arbre.unions set conjoint_b = p_garde where conjoint_b = p_perdue;

  insert into arbre.filiations (union_id, enfant_id, nature)
  select f.union_id, p_garde, f.nature from arbre.filiations f
  where f.enfant_id = p_perdue
  on conflict (union_id, enfant_id) do nothing;
  delete from arbre.filiations where enfant_id = p_perdue;

  insert into arbre.souvenirs_personnes (souvenir_id, personne_id)
  select souvenir_id, p_garde from arbre.souvenirs_personnes where personne_id = p_perdue
  on conflict (souvenir_id, personne_id) do nothing;
  delete from arbre.souvenirs_personnes where personne_id = p_perdue;

  insert into arbre.medias_personnes (media_id, personne_id, role)
  select media_id, p_garde, role from arbre.medias_personnes where personne_id = p_perdue
  on conflict (media_id, personne_id) do nothing;
  delete from arbre.medias_personnes where personne_id = p_perdue;

  insert into arbre.faits_personnes (fait_id, personne_id, incidence)
  select fait_id, p_garde, incidence from arbre.faits_personnes where personne_id = p_perdue
  on conflict (fait_id, personne_id) do nothing;
  delete from arbre.faits_personnes where personne_id = p_perdue;

  if to_regclass('arbre.recits_personnes') is not null then
    insert into arbre.recits_personnes (recit_id, personne_id)
    select recit_id, p_garde from arbre.recits_personnes where personne_id = p_perdue
    on conflict (recit_id, personne_id) do nothing;
    delete from arbre.recits_personnes where personne_id = p_perdue;
  end if;

  update arbre.membres set personne_id = p_garde where personne_id = p_perdue;

  update arbre.personnes
  set notes = coalesce(notes, '') || e'\n\n[FUSION] Cette fiche a absorbe le doublon '
              || coalesce(n_perdue.code_gedcom, n_perdue.id::text)
              || ' (' || coalesce(n_perdue.nom_complet, '?') || ').'
  where id = p_garde;

  delete from arbre.personnes where id = p_perdue;
end;
$$;

create or replace function arbre.fusionner_unions(u_garde uuid, u_perdue uuid)
returns void
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  n_garde arbre.unions;
  n_perdue arbre.unions;
begin
  if not arbre.est_admin() then
    raise exception 'Réservé aux administrateurs.';
  end if;

  if u_garde = u_perdue then
    raise exception 'Impossible de fusionner une union avec elle-meme.';
  end if;

  select * into n_garde  from arbre.unions where id = u_garde;
  select * into n_perdue from arbre.unions where id = u_perdue;

  if n_garde.id is null then raise exception 'Union gardee % introuvable', u_garde; end if;
  if n_perdue.id is null then raise exception 'Union perdue % introuvable', u_perdue; end if;

  update arbre.unions
  set notes = trim(both e'\n' from
    coalesce(n_garde.notes, '') ||
    case when n_garde.notes is not null and n_perdue.notes is not null then e'\n\n---\n\n' else '' end ||
    coalesce(n_perdue.notes, '')
  ),
  niveaux_preuve = (
    select coalesce(array_agg(distinct v order by v), '{}')
    from unnest(n_garde.niveaux_preuve || n_perdue.niveaux_preuve) as v
  ),
  branches = (
    select coalesce(array_agg(distinct b order by b), '{}')
    from unnest(n_garde.branches || n_perdue.branches) as b
  ),
  conjoint_a = coalesce(n_garde.conjoint_a, n_perdue.conjoint_a),
  conjoint_b = coalesce(n_garde.conjoint_b, n_perdue.conjoint_b)
  where id = u_garde;

  insert into arbre.filiations (union_id, enfant_id, nature)
  select u_garde, enfant_id, nature from arbre.filiations where union_id = u_perdue
  on conflict (union_id, enfant_id) do nothing;
  delete from arbre.filiations where union_id = u_perdue;

  delete from arbre.evenements ep
  where ep.union_id = u_perdue
    and exists (
      select 1 from arbre.evenements eg
      where eg.union_id = u_garde
        and eg.type = ep.type
        and coalesce(eg.date_texte, '') = coalesce(ep.date_texte, '')
        and coalesce(eg.lieu_id::text, '') = coalesce(ep.lieu_id::text, '')
        and coalesce(eg.detail, '') = coalesce(ep.detail, '')
    );
  update arbre.evenements  set union_id = u_garde where union_id = u_perdue;
  update arbre.sources     set union_id = u_garde where union_id = u_perdue;

  update arbre.unions
  set notes = coalesce(notes, '') || e'\n\n[FUSION] Cette union a absorbe le doublon '
              || coalesce(n_perdue.code_gedcom, n_perdue.id::text) || '.'
  where id = u_garde;

  delete from arbre.unions where id = u_perdue;
end;
$$;

revoke all on function arbre.fusionner_personnes(uuid, uuid) from public, anon, authenticated;
revoke all on function arbre.fusionner_unions(uuid, uuid) from public, anon, authenticated;

grant execute on function arbre.fusionner_personnes(uuid, uuid) to authenticated, service_role;
grant execute on function arbre.fusionner_unions(uuid, uuid) to authenticated, service_role;

revoke all on function arbre.detecter_doublon_via_evenement() from public, anon, authenticated;
revoke all on function arbre.refuser_doublon_personne() from public, anon, authenticated;
grant execute on function arbre.detecter_doublon_via_evenement() to postgres, service_role;
grant execute on function arbre.refuser_doublon_personne() to postgres, service_role;

comment on function arbre.fusionner_personnes(uuid, uuid) is
  'Absorbe la personne perdue dans la gardee. Réservé aux administrateurs (est_admin).';
comment on function arbre.fusionner_unions(uuid, uuid) is
  'Absorbe l union perdue dans la gardee. Réservé aux administrateurs (est_admin).';
