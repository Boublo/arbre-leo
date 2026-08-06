-- Le déclencheur précédent comparait les noms tels quels : « Veronique » et
-- « Véronique » lui passaient inaperçus. On normalise maintenant avec unaccent.
create or replace function arbre.refuser_doublon_personne()
returns trigger
language plpgsql security definer set search_path = arbre, extensions, pg_temp
as $$
declare
  nouvelle_annee int;
  doublon_id uuid;
begin
  if new.nom_complet is null or trim(new.nom_complet) = '' then return new; end if;

  select min(e.annee) into nouvelle_annee
  from arbre.evenements e where e.personne_id = new.id and e.type = 'naissance';

  if nouvelle_annee is null then return new; end if;

  select p.id into doublon_id
  from arbre.personnes p
  where p.id <> new.id
    and unaccent(lower(coalesce(p.nom_complet, ''))) = unaccent(lower(new.nom_complet))
    and exists (
      select 1 from arbre.evenements e
      where e.personne_id = p.id and e.type = 'naissance' and e.annee = nouvelle_annee
    )
  limit 1;

  if doublon_id is not null then
    raise exception 'Doublon refuse : une fiche « % » nee en % existe deja (id %).',
      new.nom_complet, nouvelle_annee, doublon_id
    using hint = 'Fusionnez avec arbre.fusionner_personnes(garde, perdue) si c est la meme personne.';
  end if;

  return new;
end;
$$;

create or replace function arbre.detecter_doublon_via_evenement()
returns trigger
language plpgsql security definer set search_path = arbre, extensions, pg_temp
as $$
declare
  n arbre.personnes;
  doublon_id uuid;
begin
  if new.type <> 'naissance' or new.annee is null or new.personne_id is null then return new; end if;

  select * into n from arbre.personnes where id = new.personne_id;
  if n.nom_complet is null or trim(n.nom_complet) = '' then return new; end if;

  select p.id into doublon_id
  from arbre.personnes p
  where p.id <> n.id
    and unaccent(lower(coalesce(p.nom_complet, ''))) = unaccent(lower(n.nom_complet))
    and exists (
      select 1 from arbre.evenements e
      where e.personne_id = p.id and e.type = 'naissance' and e.annee = new.annee
    )
  limit 1;

  if doublon_id is not null then
    raise warning 'Doublon possible : « % » nee en % — voir aussi id %.',
      n.nom_complet, new.annee, doublon_id;
  end if;

  return new;
end;
$$;
