-- ===========================================================================
-- L'arbre de Leo — 0003 contenu communautaire
-- ---------------------------------------------------------------------------
-- contenu communautaire : medias, souvenirs, faits historiques, chantiers, commentaires, journal
-- ===========================================================================

-- Medias ------------------------------------------------------------------
-- Les fichiers vivent dans un bucket prive ; on ne stocke ici que le chemin.
create table arbre.medias (
  id              uuid primary key default gen_random_uuid(),
  chemin          text not null unique,
  type            arbre.type_media not null default 'photo',
  titre           text,
  description     text,
  annee           integer,
  mois            smallint check (mois between 1 and 12),
  jour            smallint check (jour between 1 and 31),
  date_texte      text,
  lieu_id         uuid references arbre.lieux (id) on delete set null,
  mime            text,
  taille_octets   bigint,
  largeur         integer,
  hauteur         integer,
  -- Une photo restauree renvoie a son original : on garde les deux.
  original_id     uuid references arbre.medias (id) on delete set null,
  cote            text,
  depot           text,
  transcription   text,
  statut          arbre.statut_moderation not null default 'publie',
  depose_par      uuid references auth.users (id) on delete set null,
  cree_le         timestamptz not null default now(),
  modifie_le      timestamptz not null default now()
);

create index medias_type_idx   on arbre.medias (type);
create index medias_statut_idx on arbre.medias (statut);
create index medias_annee_idx  on arbre.medias (annee);

alter table arbre.personnes
  add constraint personnes_photo_fk
  foreign key (photo_id) references arbre.medias (id) on delete set null;

create table arbre.medias_personnes (
  media_id    uuid not null references arbre.medias (id) on delete cascade,
  personne_id uuid not null references arbre.personnes (id) on delete cascade,
  role        text not null default 'sujet',
  primary key (media_id, personne_id)
);

create index medias_personnes_personne_idx on arbre.medias_personnes (personne_id);

-- Souvenirs ---------------------------------------------------------------
-- Le coeur communautaire : ce que la famille depose et que nul acte ne dira.
create table arbre.souvenirs (
  id             uuid primary key default gen_random_uuid(),
  auteur_id      uuid not null references auth.users (id) on delete cascade,
  titre          text not null,
  recit          text not null,
  annee          integer,
  mois           smallint check (mois between 1 and 12),
  jour           smallint check (jour between 1 and 31),
  date_texte     text,
  precision_date arbre.precision_date not null default 'inconnue',
  lieu_id        uuid references arbre.lieux (id) on delete set null,
  lieu_libre     text,
  statut         arbre.statut_moderation not null default 'publie',
  epingle        boolean not null default false,
  cree_le        timestamptz not null default now(),
  modifie_le     timestamptz not null default now()
);

alter table arbre.souvenirs
  add column date_tri text generated always as (
    case when annee is null then null
    else lpad(annee::text, 4, '0') || '-' ||
         lpad(coalesce(mois, 0)::text, 2, '0') || '-' ||
         lpad(coalesce(jour, 0)::text, 2, '0')
    end
  ) stored;

create index souvenirs_auteur_idx on arbre.souvenirs (auteur_id);
create index souvenirs_tri_idx    on arbre.souvenirs (date_tri);
create index souvenirs_statut_idx on arbre.souvenirs (statut);
create index souvenirs_recherche_idx on arbre.souvenirs using gin (
  to_tsvector('french', coalesce(titre,'') || ' ' || coalesce(recit,''))
);

create table arbre.souvenirs_personnes (
  souvenir_id uuid not null references arbre.souvenirs (id) on delete cascade,
  personne_id uuid not null references arbre.personnes (id) on delete cascade,
  primary key (souvenir_id, personne_id)
);

create index souvenirs_personnes_personne_idx on arbre.souvenirs_personnes (personne_id);

create table arbre.souvenirs_medias (
  souvenir_id uuid not null references arbre.souvenirs (id) on delete cascade,
  media_id    uuid not null references arbre.medias (id) on delete cascade,
  ordre       smallint not null default 0,
  primary key (souvenir_id, media_id)
);

-- Grande Histoire ---------------------------------------------------------
-- Les evenements du monde qui ont traverse la vie des ancetres, pour que
-- l arbre se lise sur le fond de son epoque.
create table arbre.faits_historiques (
  id            uuid primary key default gen_random_uuid(),
  titre         text not null,
  resume        text,
  description   text,
  annee_debut   integer not null,
  mois_debut    smallint check (mois_debut between 1 and 12),
  jour_debut    smallint check (jour_debut between 1 and 31),
  annee_fin     integer,
  lieu_id       uuid references arbre.lieux (id) on delete set null,
  lieu_libre    text,
  portee        arbre.portee_fait not null default 'national',
  branche       text,
  source_url    text,
  cree_par      uuid references auth.users (id) on delete set null,
  cree_le       timestamptz not null default now(),
  modifie_le    timestamptz not null default now()
);

create index faits_annee_idx  on arbre.faits_historiques (annee_debut);
create index faits_portee_idx on arbre.faits_historiques (portee);

create table arbre.faits_personnes (
  fait_id     uuid not null references arbre.faits_historiques (id) on delete cascade,
  personne_id uuid not null references arbre.personnes (id) on delete cascade,
  -- Ce que ce fait a concretement change pour cette personne-la.
  incidence   text,
  primary key (fait_id, personne_id)
);

create index faits_personnes_personne_idx on arbre.faits_personnes (personne_id);

-- Chantiers de recherche --------------------------------------------------
-- L enquete continue : actes demandes, branches bloquees, hypotheses a verifier.
create table arbre.chantiers_recherche (
  id            uuid primary key default gen_random_uuid(),
  titre         text not null,
  objectif      text,
  branche       text,
  personne_id   uuid references arbre.personnes (id) on delete set null,
  organisme     text,
  reference     text,
  statut        arbre.statut_chantier not null default 'a_faire',
  blocage       text,
  priorite      smallint not null default 3 check (priorite between 1 and 5),
  assigne_a     uuid references auth.users (id) on delete set null,
  demande_le    date,
  reponse_le    date,
  resultat      text,
  cree_par      uuid references auth.users (id) on delete set null,
  cree_le       timestamptz not null default now(),
  modifie_le    timestamptz not null default now()
);

create index chantiers_statut_idx   on arbre.chantiers_recherche (statut);
create index chantiers_priorite_idx on arbre.chantiers_recherche (priorite);

-- Commentaires ------------------------------------------------------------
-- Une conversation peut s ouvrir sur une personne, un souvenir, une photo.
create table arbre.commentaires (
  id           uuid primary key default gen_random_uuid(),
  auteur_id    uuid not null references auth.users (id) on delete cascade,
  personne_id  uuid references arbre.personnes (id) on delete cascade,
  souvenir_id  uuid references arbre.souvenirs (id) on delete cascade,
  media_id     uuid references arbre.medias (id) on delete cascade,
  parent_id    uuid references arbre.commentaires (id) on delete cascade,
  texte        text not null,
  statut       arbre.statut_moderation not null default 'publie',
  cree_le      timestamptz not null default now(),
  modifie_le   timestamptz not null default now(),
  constraint commentaires_une_seule_cible check (
    (personne_id is not null)::int + (souvenir_id is not null)::int + (media_id is not null)::int = 1
  )
);

create index commentaires_personne_idx on arbre.commentaires (personne_id);
create index commentaires_souvenir_idx on arbre.commentaires (souvenir_id);
create index commentaires_media_idx    on arbre.commentaires (media_id);

-- Journal ------------------------------------------------------------------
-- Un arbre familial se corrige a plusieurs mains : on garde trace de qui a
-- change quoi, pour pouvoir revenir en arriere et pour arbitrer les desaccords.
create table arbre.journal (
  id          bigserial primary key,
  acteur_id   uuid references auth.users (id) on delete set null,
  action      text not null,
  table_cible text not null,
  ligne_id    uuid,
  avant       jsonb,
  apres       jsonb,
  cree_le     timestamptz not null default now()
);

create index journal_cible_idx on arbre.journal (table_cible, ligne_id);
create index journal_date_idx  on arbre.journal (cree_le desc);

create or replace function arbre.tracer()
returns trigger
language plpgsql security definer set search_path = arbre, pg_temp
as $$
begin
  insert into arbre.journal (acteur_id, action, table_cible, ligne_id, avant, apres)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id')::uuid else (to_jsonb(new) ->> 'id')::uuid end,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger personnes_journal after insert or update or delete on arbre.personnes
  for each row execute function arbre.tracer();
create trigger unions_journal after insert or update or delete on arbre.unions
  for each row execute function arbre.tracer();
create trigger souvenirs_journal after insert or update or delete on arbre.souvenirs
  for each row execute function arbre.tracer();
create trigger medias_journal after insert or update or delete on arbre.medias
  for each row execute function arbre.tracer();

create trigger medias_touch before update on arbre.medias
  for each row execute function arbre.touch_modifie_le();
create trigger souvenirs_touch before update on arbre.souvenirs
  for each row execute function arbre.touch_modifie_le();
create trigger faits_touch before update on arbre.faits_historiques
  for each row execute function arbre.touch_modifie_le();
create trigger chantiers_touch before update on arbre.chantiers_recherche
  for each row execute function arbre.touch_modifie_le();
create trigger commentaires_touch before update on arbre.commentaires
  for each row execute function arbre.touch_modifie_le();
