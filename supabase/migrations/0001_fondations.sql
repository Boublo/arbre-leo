-- ===========================================================================
-- L'arbre de Léo — 0001 : fondations
-- ---------------------------------------------------------------------------
-- Tout vit dans le schéma « arbre ». Le schéma « public » de ce projet héberge
-- une application sans rapport, gérée par Prisma : la cloisonner nous protège
-- d'une migration Prisma qui voudrait supprimer des tables qu'elle ne connaît
-- pas. Aucune table de l'arbre ne doit donc être créée dans « public ».
-- ===========================================================================

create schema if not exists arbre;

-- PostgREST n'expose par défaut que « public » et « graphql_public ». On lui
-- ajoute « arbre » sans retirer l'existant, sous peine de casser l'autre app.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, arbre';

grant usage on schema arbre to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Vocabulaire
-- ---------------------------------------------------------------------------

-- Qui fait quoi. Le lecteur consulte, le contributeur enrichit, l'admin arbitre.
create type arbre.role_membre as enum ('admin', 'contributeur', 'lecteur');

-- L'inscription est libre, mais l'accès est accordé à la main par un admin.
create type arbre.statut_membre as enum ('en_attente', 'valide', 'refuse', 'suspendu');

-- Fiabilité d'une information, reprise des marqueurs de l'enquête familiale.
create type arbre.niveau_preuve as enum (
  'acte',      -- établi par un acte d'état civil détenu ou consulté
  'anom',      -- acte de l'état civil d'Algérie numérisé (Archives d'outre-mer)
  'insee',     -- fichier des décès de l'INSEE : très probable, à confirmer
  'memoire',   -- souvenir familial rapporté
  'hypothese', -- déduction cohérente, non encore étayée
  'a_trouver'  -- personne ou fait identifié mais non documenté
);

-- Ce qu'un membre a déposé doit être relu avant d'apparaître pour tous.
create type arbre.statut_moderation as enum ('publie', 'en_relecture', 'masque');

create type arbre.type_media as enum ('photo', 'acte', 'document', 'audio', 'video');

create type arbre.sexe as enum ('M', 'F', 'inconnu');

-- Portée d'un fait historique, pour distinguer la grande Histoire du fait divers local.
create type arbre.portee_fait as enum ('mondial', 'national', 'regional', 'local', 'familial');

create type arbre.statut_chantier as enum ('a_faire', 'en_cours', 'en_attente_reponse', 'aboutie', 'abandonnee');

-- ---------------------------------------------------------------------------
-- Membres
-- ---------------------------------------------------------------------------

create table arbre.membres (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text not null,
  nom_affiche    text not null,
  role           arbre.role_membre    not null default 'lecteur',
  statut         arbre.statut_membre  not null default 'en_attente',

  -- Lien facultatif vers sa propre fiche dans l'arbre (renseigné plus tard :
  -- la contrainte est ajoutée après la création de la table « personnes »).
  personne_id    uuid,

  -- Ce que la personne dit d'elle au moment de demander l'accès : c'est sur
  -- cette base que l'admin décide, il faut donc la conserver.
  message_demande text,
  lien_famille    text,

  valide_par     uuid references auth.users (id) on delete set null,
  valide_le      timestamptz,
  motif_refus    text,

  cree_le        timestamptz not null default now(),
  modifie_le     timestamptz not null default now()
);

create index membres_statut_idx on arbre.membres (statut);
create index membres_role_idx   on arbre.membres (role);

comment on table arbre.membres is
  'Un membre par compte auth. Statut « en_attente » à l''inscription : aucun accès aux données familiales tant qu''un admin n''a pas validé.';

-- ---------------------------------------------------------------------------
-- Autorisations
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER : ces fonctions lisent « membres » sans repasser par RLS,
-- faute de quoi les politiques posées sur « membres » s'appelleraient elles-mêmes.

create or replace function arbre.membre_actuel()
returns arbre.membres
language sql
stable
security definer
set search_path = arbre, pg_temp
as $$
  select * from arbre.membres where id = auth.uid();
$$;

create or replace function arbre.est_membre_valide()
returns boolean
language sql
stable
security definer
set search_path = arbre, pg_temp
as $$
  select exists (
    select 1 from arbre.membres
    where id = auth.uid() and statut = 'valide'
  );
$$;

create or replace function arbre.est_admin()
returns boolean
language sql
stable
security definer
set search_path = arbre, pg_temp
as $$
  select exists (
    select 1 from arbre.membres
    where id = auth.uid() and statut = 'valide' and role = 'admin'
  );
$$;

-- Droit d'enrichir l'arbre : déposer un souvenir, une photo, un commentaire.
create or replace function arbre.peut_contribuer()
returns boolean
language sql
stable
security definer
set search_path = arbre, pg_temp
as $$
  select exists (
    select 1 from arbre.membres
    where id = auth.uid()
      and statut = 'valide'
      and role in ('admin', 'contributeur')
  );
$$;

grant execute on function
  arbre.membre_actuel, arbre.est_membre_valide, arbre.est_admin, arbre.peut_contribuer
to authenticated;

-- ---------------------------------------------------------------------------
-- Inscription
-- ---------------------------------------------------------------------------
-- À la création d'un compte, on crée d'office sa fiche membre « en_attente ».
-- Le tout premier compte devient admin : sans cela, personne ne pourrait
-- valider personne et l'application resterait verrouillée à jamais.

create or replace function arbre.gerer_nouvelle_inscription()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  premier boolean;
begin
  select not exists (select 1 from arbre.membres) into premier;

  insert into arbre.membres (id, email, nom_affiche, role, statut, message_demande, lien_famille, valide_le)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nom_affiche'), ''), split_part(new.email, '@', 1)),
    case when premier then 'admin'::arbre.role_membre else 'lecteur'::arbre.role_membre end,
    case when premier then 'valide'::arbre.statut_membre else 'en_attente'::arbre.statut_membre end,
    nullif(trim(new.raw_user_meta_data ->> 'message_demande'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'lien_famille'), ''),
    case when premier then now() else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function arbre.gerer_nouvelle_inscription();

-- ---------------------------------------------------------------------------
-- Horodatage
-- ---------------------------------------------------------------------------

create or replace function arbre.touch_modifie_le()
returns trigger
language plpgsql
as $$
begin
  new.modifie_le := now();
  return new;
end;
$$;

create trigger membres_touch
  before update on arbre.membres
  for each row execute function arbre.touch_modifie_le();
