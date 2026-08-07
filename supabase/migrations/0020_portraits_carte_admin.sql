-- ===========================================================================
-- L'arbre de Léo — 0020 : portraits de carte et album photos
-- ---------------------------------------------------------------------------
-- Règles :
--   • L'album d'une fiche reste géré librement par les contributeurs (ou par
--     tout membre validé pour une personne décédée).
--   • Le portrait affiché sur la carte de l'arbre (personnes.photo_id) ne
--     change que par un administrateur, ou via une demande en attente.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------

create or replace function arbre.personne_est_decedee(p_personne_id uuid)
returns boolean
language sql
stable
security definer
set search_path = arbre, pg_temp
as $$
  select exists (
    select 1
    from arbre.personnes p
    where p.id = p_personne_id
      and not p.presume_vivant
  );
$$;

create or replace function arbre.peut_deposer_photo_album(p_personne_id uuid)
returns boolean
language sql
stable
security definer
set search_path = arbre, pg_temp
as $$
  select case
    when arbre.peut_contribuer() then true
    when not arbre.est_membre_valide() then false
    else arbre.personne_est_decedee(p_personne_id)
  end;
$$;

revoke all on function arbre.personne_est_decedee(uuid) from public, anon;
revoke all on function arbre.peut_deposer_photo_album(uuid) from public, anon;
grant execute on function arbre.personne_est_decedee(uuid) to authenticated, service_role;
grant execute on function arbre.peut_deposer_photo_album(uuid) to authenticated, service_role;

comment on function arbre.personne_est_decedee(uuid) is
  'Vrai si la personne n''est plus présumée vivante (décès saisi ou flag retiré).';
comment on function arbre.peut_deposer_photo_album(uuid) is
  'Contributeurs : tout album. Membres validés : album des personnes décédées uniquement.';

-- ---------------------------------------------------------------------------
-- Demandes de portrait pour la carte
-- ---------------------------------------------------------------------------

create type arbre.statut_demande_portrait as enum ('en_attente', 'acceptee', 'refusee');

create table arbre.demandes_portrait_carte (
  id            uuid primary key default gen_random_uuid(),
  personne_id   uuid not null references arbre.personnes (id) on delete cascade,
  media_id      uuid not null references arbre.medias (id) on delete cascade,
  demandeur_id  uuid not null references auth.users (id) on delete cascade,
  statut        arbre.statut_demande_portrait not null default 'en_attente',
  traite_par    uuid references auth.users (id) on delete set null,
  traite_le     timestamptz,
  motif_refus   text,
  cree_le       timestamptz not null default now()
);

create index demandes_portrait_carte_statut_idx
  on arbre.demandes_portrait_carte (statut, cree_le desc);

create unique index demandes_portrait_carte_en_attente_idx
  on arbre.demandes_portrait_carte (personne_id, media_id)
  where statut = 'en_attente';

alter table arbre.demandes_portrait_carte enable row level security;

create policy demandes_portrait_lire on arbre.demandes_portrait_carte
  for select to authenticated
  using (
    arbre.est_admin()
    or demandeur_id = auth.uid()
    or exists (
      select 1 from arbre.medias m
      where m.id = media_id and m.depose_par = auth.uid()
    )
  );

create policy demandes_portrait_deposer on arbre.demandes_portrait_carte
  for insert to authenticated
  with check (
    demandeur_id = auth.uid()
    and statut = 'en_attente'
    and arbre.peut_deposer_photo_album(personne_id)
    and exists (
      select 1 from arbre.medias_personnes mp
      where mp.media_id = demandes_portrait_carte.media_id
        and mp.personne_id = demandes_portrait_carte.personne_id
    )
  );

create policy demandes_portrait_traiter on arbre.demandes_portrait_carte
  for update to authenticated
  using (arbre.est_admin())
  with check (arbre.est_admin());

-- Verrouiller photo_id sur personnes : seuls les admins modifient le portrait carte.
create or replace function arbre.verrouiller_portrait_carte()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
begin
  if new.photo_id is distinct from old.photo_id and not arbre.est_admin() then
    raise exception 'Seuls les administrateurs peuvent changer le portrait de la carte.';
  end if;
  return new;
end;
$$;

drop trigger if exists personnes_verrou_portrait on arbre.personnes;
create trigger personnes_verrou_portrait
  before update on arbre.personnes
  for each row execute function arbre.verrouiller_portrait_carte();

-- ---------------------------------------------------------------------------
-- Politiques médias : album des personnes décédées ouvert aux membres validés
-- ---------------------------------------------------------------------------

drop policy if exists medias_deposer on arbre.medias;
create policy medias_deposer on arbre.medias
  for insert to authenticated
  with check (
    depose_par = auth.uid()
    and (arbre.peut_contribuer() or arbre.est_membre_valide())
  );

drop policy if exists medias_personnes_ecrire on arbre.medias_personnes;
create policy medias_personnes_ecrire on arbre.medias_personnes
  for insert to authenticated
  with check (arbre.peut_deposer_photo_album(personne_id));

-- Stockage : tout membre validé peut déposer un fichier (le rattachement à une
-- fiche vivante reste bloqué par medias_personnes).
drop policy if exists "arbre medias depot contributeur" on storage.objects;
create policy "arbre medias depot contributeur"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'arbre-medias'
    and owner = auth.uid()
    and name like (auth.uid()::text || '/%')
    and (arbre.peut_contribuer() or arbre.est_membre_valide())
  );

-- ---------------------------------------------------------------------------
-- Notification : demande de portrait carte
-- ---------------------------------------------------------------------------

alter type arbre.type_notification add value if not exists 'demande_portrait_carte';

create or replace function arbre.notifier_demande_portrait_carte()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  v_nom text;
  v_titre text;
begin
  select coalesce(p.nom_complet, p.prenoms, p.nom, 'Sans nom')
  into v_nom
  from arbre.personnes p
  where p.id = new.personne_id;

  v_titre := 'Portrait carte demandé pour ' || v_nom;

  perform arbre.notifier_admins(
    'demande_portrait_carte',
    v_titre,
    'Un membre souhaite afficher une photo sur la carte de l''arbre.',
    '/admin',
    'demandes_portrait_carte',
    new.id,
    new.demandeur_id
  );

  return new;
end;
$$;

drop trigger if exists demandes_portrait_notifier on arbre.demandes_portrait_carte;
create trigger demandes_portrait_notifier
  after insert on arbre.demandes_portrait_carte
  for each row
  when (new.statut = 'en_attente')
  execute function arbre.notifier_demande_portrait_carte();

comment on table arbre.demandes_portrait_carte is
  'File d''attente : quelle photo de l''album doit devenir le portrait de la carte.';
