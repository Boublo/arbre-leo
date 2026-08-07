-- Notifications au demandeur quand un portrait carte est accepté ou refusé.

alter type arbre.type_notification add value if not exists 'portrait_carte_accepte';
alter type arbre.type_notification add value if not exists 'portrait_carte_refuse';

create or replace function arbre.notifier_demande_portrait_carte()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  v_nom text;
begin
  select coalesce(p.nom_complet, p.prenoms, p.nom, 'Sans nom')
  into v_nom
  from arbre.personnes p
  where p.id = new.personne_id;

  perform arbre.notifier_admins(
    'demande_portrait_carte',
    'Portrait carte demandé pour ' || v_nom,
    'Un membre souhaite afficher une photo sur la carte de l''arbre.',
    '/admin#titre-portraits',
    'demandes_portrait_carte',
    new.id,
    new.demandeur_id
  );

  return new;
end;
$$;

create or replace function arbre.notifier_reponse_demande_portrait()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  v_nom text;
  v_lien text;
begin
  if old.statut is not distinct from new.statut then
    return new;
  end if;

  if new.statut not in ('acceptee', 'refusee') then
    return new;
  end if;

  select coalesce(p.nom_complet, p.prenoms, p.nom, 'Sans nom')
  into v_nom
  from arbre.personnes p
  where p.id = new.personne_id;

  v_lien := '/personne/' || new.personne_id::text || '/photo/' || new.media_id::text;

  if new.statut = 'acceptee' then
    perform arbre.creer_notification(
      new.demandeur_id,
      'portrait_carte_accepte',
      'Portrait accepté pour ' || v_nom,
      'Votre photo a été posée sur la carte de l''arbre.',
      v_lien,
      'demandes_portrait_carte',
      new.id,
      new.traite_par
    );
  elsif new.statut = 'refusee' then
    perform arbre.creer_notification(
      new.demandeur_id,
      'portrait_carte_refuse',
      'Portrait carte écarté pour ' || v_nom,
      coalesce(new.motif_refus, 'Votre demande n''a pas été retenue.'),
      v_lien,
      'demandes_portrait_carte',
      new.id,
      new.traite_par
    );
  end if;

  return new;
end;
$$;

drop trigger if exists demandes_portrait_reponse on arbre.demandes_portrait_carte;
create trigger demandes_portrait_reponse
  after update on arbre.demandes_portrait_carte
  for each row
  when (old.statut is distinct from new.statut)
  execute function arbre.notifier_reponse_demande_portrait();
