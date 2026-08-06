-- ===========================================================================
-- L'arbre de Leo — 0018 synchronisation presume_vivant / fin de vie
-- ---------------------------------------------------------------------------
-- Aligne le flag presume_vivant sur les événements de fin de vie déjà saisis,
-- et maintient la cohérence lors des prochains enregistrements.
-- ===========================================================================

-- Rattrapage : toute personne avec un décès (ou équivalent) n'est plus vivante.
update arbre.personnes p
set presume_vivant = false
where p.presume_vivant = true
  and exists (
    select 1
    from arbre.evenements e
    where e.personne_id = p.id
      and e.type in ('deces', 'inhumation', 'cremation')
  );

create or replace function arbre.sync_presume_vivant_apres_evenement()
returns trigger
language plpgsql
security definer
set search_path = arbre, public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE')
     and new.type in ('deces', 'inhumation', 'cremation')
     and new.personne_id is not null then
    update arbre.personnes
    set presume_vivant = false
    where id = new.personne_id
      and presume_vivant = true;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists evenements_sync_presume_vivant on arbre.evenements;

create trigger evenements_sync_presume_vivant
after insert or update of type, personne_id
on arbre.evenements
for each row
execute function arbre.sync_presume_vivant_apres_evenement();

comment on function arbre.sync_presume_vivant_apres_evenement() is
  'Quand un décès (ou inhumation / crémation) est enregistré, retire le statut vivant.';
