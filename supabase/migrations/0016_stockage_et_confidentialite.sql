-- ===========================================================================
-- L'arbre de Léo — 0016 stockage et confidentialité
-- ---------------------------------------------------------------------------
-- 1) Storage : lecture limitée (propriétaire, admin, ou média publié lié)
--    + dépôt contraint au préfixe {userId}/
-- 2) Fiches confidentielles : les tables liées (unions, filiations, événements,
--    sources) ne fuient plus via le graphe.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Helpers lisibilité (SECURITY DEFINER pour éviter la récursion RLS)
-- ---------------------------------------------------------------------------

create or replace function arbre.peut_lire_personne(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = arbre, pg_temp
as $$
  select case
    when pid is null then false
    when not arbre.est_membre_valide() then false
    when arbre.est_admin() then true
    else exists (
      select 1 from arbre.personnes p
      where p.id = pid and not p.confidentiel
    )
  end;
$$;

create or replace function arbre.peut_lire_union(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = arbre, pg_temp
as $$
  select exists (
    select 1 from arbre.unions u
    where u.id = uid
      and (
        arbre.est_admin()
        or (
          (u.conjoint_a is null or arbre.peut_lire_personne(u.conjoint_a))
          and (u.conjoint_b is null or arbre.peut_lire_personne(u.conjoint_b))
        )
      )
  );
$$;

revoke all on function arbre.peut_lire_personne(uuid) from public, anon;
revoke all on function arbre.peut_lire_union(uuid) from public, anon;
grant execute on function arbre.peut_lire_personne(uuid) to authenticated, service_role;
grant execute on function arbre.peut_lire_union(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Politiques de lecture resserrées
-- ---------------------------------------------------------------------------

drop policy if exists unions_lire on arbre.unions;
create policy unions_lire on arbre.unions
  for select to authenticated
  using (arbre.est_membre_valide() and arbre.peut_lire_union(id));

drop policy if exists filiations_lire on arbre.filiations;
create policy filiations_lire on arbre.filiations
  for select to authenticated
  using (
    arbre.est_membre_valide()
    and arbre.peut_lire_personne(enfant_id)
    and arbre.peut_lire_union(union_id)
  );

drop policy if exists evenements_lire on arbre.evenements;
create policy evenements_lire on arbre.evenements
  for select to authenticated
  using (
    arbre.est_membre_valide()
    and (
      arbre.est_admin()
      or (personne_id is not null and arbre.peut_lire_personne(personne_id))
      or (union_id is not null and arbre.peut_lire_union(union_id))
    )
  );

drop policy if exists sources_lire on arbre.sources;
create policy sources_lire on arbre.sources
  for select to authenticated
  using (
    arbre.est_membre_valide()
    and (
      arbre.est_admin()
      or (
        (personne_id is null or arbre.peut_lire_personne(personne_id))
        and (union_id is null or arbre.peut_lire_union(union_id))
        and (
          evenement_id is null
          or exists (
            select 1 from arbre.evenements e
            where e.id = evenement_id
              and (
                (e.personne_id is not null and arbre.peut_lire_personne(e.personne_id))
                or (e.union_id is not null and arbre.peut_lire_union(e.union_id))
              )
          )
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage : lecture et dépôt
-- ---------------------------------------------------------------------------

drop policy if exists "arbre medias lecture membre valide" on storage.objects;
create policy "arbre medias lecture membre valide"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'arbre-medias'
    and arbre.est_membre_valide()
    and (
      owner = auth.uid()
      or arbre.est_admin()
      or exists (
        select 1 from arbre.medias m
        where m.chemin = name
          and (
            m.statut = 'publie'
            or m.depose_par = auth.uid()
            or arbre.est_admin()
          )
      )
    )
  );

drop policy if exists "arbre medias depot contributeur" on storage.objects;
create policy "arbre medias depot contributeur"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'arbre-medias'
    and arbre.peut_contribuer()
    and owner = auth.uid()
    and name like (auth.uid()::text || '/%')
  );

comment on function arbre.peut_lire_personne(uuid) is
  'Vrai si le membre courant peut voir cette personne (non confidentielle, ou admin).';
comment on function arbre.peut_lire_union(uuid) is
  'Vrai si les deux conjoints (s''ils existent) sont lisibles, ou si admin.';
