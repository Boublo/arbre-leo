-- ===========================================================================
-- L'arbre de Leo — 0002 noyau genealogique
-- ---------------------------------------------------------------------------
-- noyau genealogique : lieux, personnes, unions, filiations, evenements, sources
-- ===========================================================================

create type arbre.type_evenement as enum (
  'naissance','bapteme','mariage','union_libre','divorce','fiancailles',
  'deces','inhumation','cremation','profession','residence','recensement',
  'emigration','immigration','naturalisation','service_militaire','education',
  'distinction','maladie','autre'
);

create type arbre.precision_date as enum ('jour','mois','annee','decennie','siecle','inconnue');

create type arbre.qualificatif_date as enum ('exacte','vers','avant','apres','entre','depuis','jusqu_a');

-- Lieux ------------------------------------------------------------------
-- Les frontieres ont bouge, et des communes ont change de pays. On conserve donc le libelle d epoque tel qu il figure dans l acte,
-- en plus du rattachement actuel.
create table arbre.lieux (
  id            uuid primary key default gen_random_uuid(),
  libelle       text not null,
  lieu_dit      text,
  commune       text,
  departement   text,
  region        text,
  pays          text,
  pays_actuel   text,
  latitude      double precision,
  longitude     double precision,
  note          text,
  cree_le       timestamptz not null default now()
);

create unique index lieux_libelle_key on arbre.lieux (lower(libelle));
create index lieux_pays_idx on arbre.lieux (pays);
create index lieux_coord_idx on arbre.lieux (latitude, longitude) where latitude is not null;

-- Personnes ---------------------------------------------------------------
create table arbre.personnes (
  id              uuid primary key default gen_random_uuid(),
  code_gedcom     text unique,
  branches        text[] not null default '{}',
  prenoms         text,
  nom             text,
  nom_naissance   text,
  surnom          text,
  sexe            arbre.sexe not null default 'inconnu',
  notes           text,
  niveaux_preuve  arbre.niveau_preuve[] not null default '{}',
  presume_vivant  boolean not null default false,
  confidentiel    boolean not null default false,
  photo_id        uuid,
  cree_par        uuid references auth.users (id) on delete set null,
  modifie_par     uuid references auth.users (id) on delete set null,
  cree_le         timestamptz not null default now(),
  modifie_le      timestamptz not null default now()
);

alter table arbre.personnes
  add column nom_complet text generated always as (
    trim(coalesce(prenoms,'') || ' ' || coalesce(nom,''))
  ) stored;

create index personnes_nom_idx      on arbre.personnes (lower(nom));
create index personnes_branches_idx on arbre.personnes using gin (branches);
create index personnes_vivant_idx   on arbre.personnes (presume_vivant);

create index personnes_recherche_idx on arbre.personnes using gin (
  to_tsvector('french',
    coalesce(prenoms,'') || ' ' || coalesce(nom,'') || ' ' ||
    coalesce(nom_naissance,'') || ' ' || coalesce(surnom,''))
);

comment on column arbre.personnes.presume_vivant is
  'Aucun deces connu et naissance de moins de 110 ans. Sert a restreindre l affichage des donnees des personnes vivantes.';

-- La fiche membre peut desormais pointer vers sa propre fiche dans l arbre.
alter table arbre.membres
  add constraint membres_personne_fk
  foreign key (personne_id) references arbre.personnes (id) on delete set null;

-- Unions ------------------------------------------------------------------
create table arbre.unions (
  id            uuid primary key default gen_random_uuid(),
  code_gedcom   text unique,
  conjoint_a    uuid references arbre.personnes (id) on delete set null,
  conjoint_b    uuid references arbre.personnes (id) on delete set null,
  branches      text[] not null default '{}',
  notes         text,
  niveaux_preuve arbre.niveau_preuve[] not null default '{}',
  cree_le       timestamptz not null default now(),
  modifie_le    timestamptz not null default now(),
  constraint unions_au_moins_un_conjoint check (conjoint_a is not null or conjoint_b is not null)
);

create index unions_conjoint_a_idx on arbre.unions (conjoint_a);
create index unions_conjoint_b_idx on arbre.unions (conjoint_b);

-- Filiations --------------------------------------------------------------
create table arbre.filiations (
  id         uuid primary key default gen_random_uuid(),
  union_id   uuid not null references arbre.unions (id) on delete cascade,
  enfant_id  uuid not null references arbre.personnes (id) on delete cascade,
  nature     text not null default 'naturelle',
  cree_le    timestamptz not null default now(),
  unique (union_id, enfant_id)
);

create index filiations_enfant_idx on arbre.filiations (enfant_id);

-- Evenements --------------------------------------------------------------
-- Un evenement se rattache soit a une personne, soit a une union, jamais aux deux.
create table arbre.evenements (
  id            uuid primary key default gen_random_uuid(),
  personne_id   uuid references arbre.personnes (id) on delete cascade,
  union_id      uuid references arbre.unions (id) on delete cascade,
  type          arbre.type_evenement not null,
  libelle       text,
  detail        text,
  date_texte    text,
  annee         integer,
  mois          smallint check (mois between 1 and 12),
  jour          smallint check (jour between 1 and 31),
  annee_fin     integer,
  qualificatif  arbre.qualificatif_date not null default 'exacte',
  precision_date arbre.precision_date not null default 'inconnue',
  lieu_id       uuid references arbre.lieux (id) on delete set null,
  niveau_preuve arbre.niveau_preuve,
  notes         text,
  cree_par      uuid references auth.users (id) on delete set null,
  cree_le       timestamptz not null default now(),
  constraint evenements_un_seul_rattachement check (
    (personne_id is not null) <> (union_id is not null)
  )
);

-- Cle de tri chronologique unique, tolerante aux dates partielles.
alter table arbre.evenements
  add column date_tri text generated always as (
    case when annee is null then null
    else lpad(annee::text, 4, '0') || '-' ||
         lpad(coalesce(mois, 0)::text, 2, '0') || '-' ||
         lpad(coalesce(jour, 0)::text, 2, '0')
    end
  ) stored;

create index evenements_personne_idx on arbre.evenements (personne_id);
create index evenements_union_idx    on arbre.evenements (union_id);
create index evenements_tri_idx      on arbre.evenements (date_tri);
create index evenements_type_idx     on arbre.evenements (type);
create index evenements_lieu_idx     on arbre.evenements (lieu_id);

-- Sources -----------------------------------------------------------------
create table arbre.sources (
  id            uuid primary key default gen_random_uuid(),
  personne_id   uuid references arbre.personnes (id) on delete cascade,
  union_id      uuid references arbre.unions (id) on delete cascade,
  evenement_id  uuid references arbre.evenements (id) on delete cascade,
  titre         text,
  texte         text,
  page          text,
  cote          text,
  depot         text,
  url           text,
  niveau_preuve arbre.niveau_preuve,
  cree_par      uuid references auth.users (id) on delete set null,
  cree_le       timestamptz not null default now()
);

create index sources_personne_idx  on arbre.sources (personne_id);
create index sources_evenement_idx on arbre.sources (evenement_id);

create trigger personnes_touch before update on arbre.personnes
  for each row execute function arbre.touch_modifie_le();
create trigger unions_touch before update on arbre.unions
  for each row execute function arbre.touch_modifie_le();
