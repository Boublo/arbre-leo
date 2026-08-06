-- ===========================================================================
-- L'arbre de Léo — 0019 : notifications in-app
-- ---------------------------------------------------------------------------
-- Boîte de réception par membre : demandes d'accès, validations, commentaires,
-- souvenirs, photos et nouvelles fiches. Alimentée par des fonctions internes
-- et des déclencheurs — jamais par insertion directe depuis le client.
-- ===========================================================================

create type arbre.type_notification as enum (
  'demande_acces',
  'acces_valide',
  'acces_refuse',
  'commentaire',
  'reponse_commentaire',
  'nouveau_souvenir',
  'nouvelle_photo',
  'nouvelle_personne'
);

create table arbre.notifications (
  id               uuid primary key default gen_random_uuid(),
  destinataire_id  uuid not null references auth.users (id) on delete cascade,
  type             arbre.type_notification not null,
  titre            text not null,
  corps            text,
  lien             text,
  source_table     text,
  source_id        uuid,
  auteur_id        uuid references auth.users (id) on delete set null,
  lu_le            timestamptz,
  cree_le          timestamptz not null default now()
);

create index notifications_destinataire_idx
  on arbre.notifications (destinataire_id, cree_le desc);

create index notifications_non_lues_idx
  on arbre.notifications (destinataire_id)
  where lu_le is null;

-- ---------------------------------------------------------------------------
-- Fonctions internes
-- ---------------------------------------------------------------------------

create or replace function arbre.creer_notification(
  p_destinataire_id uuid,
  p_type arbre.type_notification,
  p_titre text,
  p_corps text default null,
  p_lien text default null,
  p_source_table text default null,
  p_source_id uuid default null,
  p_auteur_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_destinataire_id is null then
    return null;
  end if;

  if p_auteur_id is not null and p_destinataire_id = p_auteur_id then
    return null;
  end if;

  insert into arbre.notifications (
    destinataire_id, type, titre, corps, lien, source_table, source_id, auteur_id
  )
  values (
    p_destinataire_id, p_type, p_titre, p_corps, p_lien, p_source_table, p_source_id, p_auteur_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function arbre.notifier_admins(
  p_type arbre.type_notification,
  p_titre text,
  p_corps text default null,
  p_lien text default null,
  p_source_table text default null,
  p_source_id uuid default null,
  p_auteur_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
begin
  insert into arbre.notifications (
    destinataire_id, type, titre, corps, lien, source_table, source_id, auteur_id
  )
  select
    m.id,
    p_type,
    p_titre,
    p_corps,
    p_lien,
    p_source_table,
    p_source_id,
    p_auteur_id
  from arbre.membres m
  where m.role = 'admin'
    and m.statut = 'valide'
    and (p_auteur_id is null or m.id <> p_auteur_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Membres : demande d'accès et décision admin
-- ---------------------------------------------------------------------------

create or replace function arbre.notifier_membre()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
begin
  if TG_OP = 'INSERT' and NEW.statut = 'en_attente' then
    perform arbre.notifier_admins(
      'demande_acces',
      'Nouvelle demande d''accès',
      coalesce(NEW.nom_affiche, 'Un cousin') || ' souhaite rejoindre l''arbre.',
      '/admin',
      'membres',
      NEW.id,
      NEW.id
    );
  elsif TG_OP = 'UPDATE' and OLD.statut is distinct from NEW.statut then
    if NEW.statut = 'valide' then
      perform arbre.creer_notification(
        NEW.id,
        'acces_valide',
        'Votre accès est ouvert',
        'Un administrateur a validé votre demande. Bienvenue dans l''arbre.',
        '/',
        'membres',
        NEW.id,
        NEW.valide_par
      );
    elsif NEW.statut = 'refuse' then
      perform arbre.creer_notification(
        NEW.id,
        'acces_refuse',
        'Demande non retenue',
        coalesce(NEW.motif_refus, 'Votre demande n''a pas été acceptée.'),
        '/attente',
        'membres',
        NEW.id,
        NEW.valide_par
      );
    end if;
  end if;

  return NEW;
end;
$$;

create trigger membres_notifier
  after insert or update of statut on arbre.membres
  for each row execute function arbre.notifier_membre();

-- ---------------------------------------------------------------------------
-- Commentaires
-- ---------------------------------------------------------------------------

create or replace function arbre.notifier_commentaire()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  v_auteur text;
  v_titre text;
  v_lien text;
  v_corps text;
  v_parent_auteur uuid;
begin
  select nom_affiche into v_auteur
  from arbre.membres
  where id = NEW.auteur_id;

  v_auteur := coalesce(v_auteur, 'Un membre');

  if NEW.parent_id is not null then
    select auteur_id into v_parent_auteur
    from arbre.commentaires
    where id = NEW.parent_id;

    if v_parent_auteur is not null then
      perform arbre.creer_notification(
        v_parent_auteur,
        'reponse_commentaire',
        'Réponse à votre message',
        left(NEW.texte, 200),
        case
          when NEW.personne_id is not null then '/personne/' || NEW.personne_id::text
          when NEW.media_id is not null then '/personne'
          when NEW.souvenir_id is not null then '/souvenirs/' || NEW.souvenir_id::text
          else '/notifications'
        end,
        'commentaires',
        NEW.id,
        NEW.auteur_id
      );
    end if;
  end if;

  if NEW.personne_id is not null then
    select nom_complet into v_titre from arbre.personnes where id = NEW.personne_id;
    v_lien := '/personne/' || NEW.personne_id::text;
    v_corps := v_auteur || ' a commenté la fiche de ' || coalesce(v_titre, 'cette personne') || '.';

    insert into arbre.notifications (
      destinataire_id, type, titre, corps, lien, source_table, source_id, auteur_id
    )
    select distinct
      m.id,
      'commentaire'::arbre.type_notification,
      'Nouveau commentaire',
      v_corps,
      v_lien,
      'commentaires',
      NEW.id,
      NEW.auteur_id
    from arbre.membres m
    where m.statut = 'valide'
      and m.id <> NEW.auteur_id
      and (
        m.role = 'admin'
        or m.personne_id = NEW.personne_id
      );

  elsif NEW.media_id is not null then
    v_lien := '/personne';
    v_corps := v_auteur || ' a laissé un mot sous une photo.';

    insert into arbre.notifications (
      destinataire_id, type, titre, corps, lien, source_table, source_id, auteur_id
    )
    select distinct
      m.id,
      'commentaire'::arbre.type_notification,
      'Commentaire sur une photo',
      v_corps,
      v_lien,
      'commentaires',
      NEW.id,
      NEW.auteur_id
    from arbre.membres m
    where m.statut = 'valide'
      and m.id <> NEW.auteur_id
      and (
        m.role = 'admin'
        or m.personne_id in (
          select mp.personne_id
          from arbre.medias_personnes mp
          where mp.media_id = NEW.media_id
        )
      );

  elsif NEW.souvenir_id is not null then
    v_lien := '/souvenirs/' || NEW.souvenir_id::text;
    v_corps := v_auteur || ' a commenté un souvenir.';

    insert into arbre.notifications (
      destinataire_id, type, titre, corps, lien, source_table, source_id, auteur_id
    )
    select distinct
      m.id,
      'commentaire'::arbre.type_notification,
      'Commentaire sur un souvenir',
      v_corps,
      v_lien,
      'commentaires',
      NEW.id,
      NEW.auteur_id
    from arbre.membres m
    where m.statut = 'valide'
      and m.id <> NEW.auteur_id
      and (
        m.role = 'admin'
        or m.id in (
          select s.auteur_id from arbre.souvenirs s where s.id = NEW.souvenir_id
        )
      );
  end if;

  return NEW;
end;
$$;

create trigger commentaires_notifier
  after insert on arbre.commentaires
  for each row execute function arbre.notifier_commentaire();

-- ---------------------------------------------------------------------------
-- Souvenirs et photos
-- ---------------------------------------------------------------------------

create or replace function arbre.notifier_souvenir()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  v_auteur text;
begin
  select nom_affiche into v_auteur
  from arbre.membres
  where id = NEW.auteur_id;

  perform arbre.notifier_admins(
    'nouveau_souvenir',
    'Nouveau souvenir',
    coalesce(v_auteur, 'Un membre') || ' a déposé « ' || left(NEW.titre, 80) || ' ».',
    '/souvenirs/' || NEW.id::text,
    'souvenirs',
    NEW.id,
    NEW.auteur_id
  );

  insert into arbre.notifications (
    destinataire_id, type, titre, corps, lien, source_table, source_id, auteur_id
  )
  select distinct
    m.id,
    'nouveau_souvenir'::arbre.type_notification,
    'Souvenir vous concernant',
    coalesce(v_auteur, 'Un membre') || ' a raconté « ' || left(NEW.titre, 80) || ' ».',
    '/souvenirs/' || NEW.id::text,
    'souvenirs',
    NEW.id,
    NEW.auteur_id
  from arbre.membres m
  join arbre.souvenirs_personnes sp on sp.personne_id = m.personne_id
  where sp.souvenir_id = NEW.id
    and m.statut = 'valide'
    and m.id <> NEW.auteur_id
    and m.personne_id is not null;

  return NEW;
end;
$$;

create trigger souvenirs_notifier
  after insert on arbre.souvenirs
  for each row execute function arbre.notifier_souvenir();

create or replace function arbre.notifier_photo()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  v_type arbre.type_media;
  v_titre text;
  v_personne uuid;
  v_nom text;
begin
  select m.type, m.titre into v_type, v_titre
  from arbre.medias m
  where m.id = NEW.media_id;

  if v_type is distinct from 'photo' then
    return NEW;
  end if;

  v_personne := NEW.personne_id;

  select nom_complet into v_nom
  from arbre.personnes
  where id = v_personne;

  perform arbre.notifier_admins(
    'nouvelle_photo',
    'Nouvelle photo',
    'Une image a été ajoutée à la fiche de ' || coalesce(v_nom, 'cette personne') || '.',
    '/personne/' || v_personne::text,
    'medias',
    NEW.media_id,
    null
  );

  insert into arbre.notifications (
    destinataire_id, type, titre, corps, lien, source_table, source_id, auteur_id
  )
  select distinct
    m.id,
    'nouvelle_photo'::arbre.type_notification,
    'Nouvelle photo',
    coalesce(v_titre, 'Une image') || ' — fiche de ' || coalesce(v_nom, 'cette personne') || '.',
    '/personne/' || v_personne::text,
    'medias',
    NEW.media_id,
    null
  from arbre.membres m
  where m.statut = 'valide'
    and m.personne_id = v_personne
    and m.personne_id is not null;

  return NEW;
end;
$$;

create trigger medias_personnes_notifier
  after insert on arbre.medias_personnes
  for each row execute function arbre.notifier_photo();

-- ---------------------------------------------------------------------------
-- Nouvelle personne
-- ---------------------------------------------------------------------------

create or replace function arbre.notifier_personne()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
begin
  perform arbre.notifier_admins(
    'nouvelle_personne',
    'Nouvelle fiche',
    coalesce(NEW.nom_complet, 'Une personne') || ' a été ajoutée à l''arbre.',
    '/personne/' || NEW.id::text,
    'personnes',
    NEW.id,
    null
  );

  return NEW;
end;
$$;

create trigger personnes_notifier
  after insert on arbre.personnes
  for each row execute function arbre.notifier_personne();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table arbre.notifications enable row level security;

create policy notifications_lire on arbre.notifications
  for select to authenticated
  using (destinataire_id = auth.uid());

create policy notifications_marquer_lu on arbre.notifications
  for update to authenticated
  using (destinataire_id = auth.uid())
  with check (destinataire_id = auth.uid());

revoke insert, delete on arbre.notifications from authenticated;

grant select, update on arbre.notifications to authenticated;

comment on table arbre.notifications is
  'Boîte de réception in-app : une ligne par événement ciblé vers un membre.';
