-- ===========================================================================
-- L'arbre de Léo — 0023 : acceptation atomique d'un portrait carte
-- ---------------------------------------------------------------------------
-- Regroupe en une transaction : photo_id, rôle album, statut demande,
-- refus des autres demandes en attente pour la même personne.
-- ===========================================================================

create or replace function arbre.accepter_demande_portrait_carte(p_demande_id uuid)
returns void
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  v_demande arbre.demandes_portrait_carte;
  v_maintenant timestamptz := now();
begin
  if not arbre.est_admin() then
    raise exception 'Réservé aux administrateurs.';
  end if;

  select *
  into v_demande
  from arbre.demandes_portrait_carte
  where id = p_demande_id
  for update;

  if v_demande.id is null then
    raise exception 'Demande introuvable.';
  end if;

  if v_demande.statut <> 'en_attente' then
    raise exception 'Cette demande n''est plus en attente.';
  end if;

  update arbre.medias_personnes
  set role = 'sujet'
  where personne_id = v_demande.personne_id
    and role = 'portrait'
    and media_id <> v_demande.media_id;

  update arbre.medias_personnes
  set role = 'portrait'
  where media_id = v_demande.media_id
    and personne_id = v_demande.personne_id;

  update arbre.personnes
  set photo_id = v_demande.media_id,
      modifie_par = auth.uid()
  where id = v_demande.personne_id;

  update arbre.demandes_portrait_carte
  set statut = 'acceptee',
      traite_par = auth.uid(),
      traite_le = v_maintenant,
      motif_refus = null
  where id = v_demande.id;

  update arbre.demandes_portrait_carte
  set statut = 'refusee',
      traite_par = auth.uid(),
      traite_le = v_maintenant,
      motif_refus = 'Une autre photo a été choisie pour la carte.'
  where personne_id = v_demande.personne_id
    and statut = 'en_attente'
    and id <> v_demande.id;
end;
$$;

revoke all on function arbre.accepter_demande_portrait_carte(uuid) from public, anon;
grant execute on function arbre.accepter_demande_portrait_carte(uuid) to authenticated, service_role;

comment on function arbre.accepter_demande_portrait_carte(uuid) is
  'Valide une demande de portrait carte : met à jour personnes.photo_id, rôles album et statuts en une transaction.';
