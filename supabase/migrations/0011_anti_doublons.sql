-- Filet permanent contre les doublons introduits par un rejeu d'import ou par
-- une saisie manuelle. Ne remplace pas l'attention humaine : signale.

-- 1. Unions : deux personnes ne peuvent pas former deux unions distinctes.
create unique index if not exists unions_paire_unique
  on arbre.unions (
    least(conjoint_a, conjoint_b),
    greatest(conjoint_a, conjoint_b)
  )
  where conjoint_a is not null and conjoint_b is not null;

comment on index arbre.unions_paire_unique is
  'Empêche deux unions distinctes entre les mêmes deux personnes.';

-- 2. Personnes : déclencheur qui refuse l'ajout d'une deuxième fiche
--    exactement homonyme et née la même année.
create or replace function arbre.refuser_doublon_personne()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  nouvelle_annee int;
  doublon_id uuid;
begin
  if new.nom_complet is null or trim(new.nom_complet) = '' then
    return new;
  end if;

  select min(e.annee) into nouvelle_annee
  from arbre.evenements e
  where e.personne_id = new.id and e.type = 'naissance';

  if nouvelle_annee is null then
    return new;
  end if;

  select p.id into doublon_id
  from arbre.personnes p
  where p.id <> new.id
    and lower(coalesce(p.nom_complet, '')) = lower(new.nom_complet)
    and exists (
      select 1 from arbre.evenements e
      where e.personne_id = p.id and e.type = 'naissance' and e.annee = nouvelle_annee
    )
  limit 1;

  if doublon_id is not null then
    raise exception 'Doublon refuse : une fiche « % » nee en % existe deja (id %).',
      new.nom_complet, nouvelle_annee, doublon_id
    using hint = 'Fusionnez avec arbre.fusionner_personnes(garde, perdue) si c est bien la meme personne.';
  end if;

  return new;
end;
$$;

create or replace function arbre.detecter_doublon_via_evenement()
returns trigger
language plpgsql
security definer
set search_path = arbre, pg_temp
as $$
declare
  n arbre.personnes;
  doublon_id uuid;
begin
  if new.type <> 'naissance' or new.annee is null or new.personne_id is null then
    return new;
  end if;

  select * into n from arbre.personnes where id = new.personne_id;
  if n.nom_complet is null or trim(n.nom_complet) = '' then return new; end if;

  select p.id into doublon_id
  from arbre.personnes p
  where p.id <> n.id
    and lower(coalesce(p.nom_complet, '')) = lower(n.nom_complet)
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

drop trigger if exists personnes_anti_doublon on arbre.personnes;
create trigger personnes_anti_doublon
  after insert or update of nom, prenoms on arbre.personnes
  for each row execute function arbre.refuser_doublon_personne();

drop trigger if exists evenements_signaler_doublon on arbre.evenements;
create trigger evenements_signaler_doublon
  after insert on arbre.evenements
  for each row execute function arbre.detecter_doublon_via_evenement();

comment on trigger personnes_anti_doublon on arbre.personnes is
  'Refuse une fiche identique (nom + année de naissance) à une autre existante.';
comment on trigger evenements_signaler_doublon on arbre.evenements is
  'Émet un warning quand une naissance rend deux fiches indistinguables.';
