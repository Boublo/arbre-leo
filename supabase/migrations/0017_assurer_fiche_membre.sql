-- ===========================================================================
-- L'arbre de Léo — 0017 : fiche membre pour comptes auth partagés (Modulyx)
-- ---------------------------------------------------------------------------
-- Le projet Supabase est partagé avec PixelForge / Modulyx (schéma public).
-- Un compte auth.users créé ailleurs n'a pas déclenché gerer_nouvelle_inscription.
-- Cette RPC crée arbre.membres « en_attente » au premier accès à l'arbre.
-- ===========================================================================

create or replace function arbre.assurer_fiche_membre()
returns arbre.membres
language plpgsql
security definer
set search_path = arbre, auth, pg_temp
as $$
declare
  fiche arbre.membres;
  compte auth.users;
begin
  select * into fiche from arbre.membres where id = auth.uid();
  if found then
    return fiche;
  end if;

  select * into compte from auth.users where id = auth.uid();
  if not found then
    raise exception 'Utilisateur non authentifié';
  end if;

  insert into arbre.membres (id, email, nom_affiche, role, statut)
  values (
    compte.id,
    compte.email,
    coalesce(
      nullif(trim(compte.raw_user_meta_data ->> 'nom_affiche'), ''),
      split_part(compte.email, '@', 1)
    ),
    'lecteur'::arbre.role_membre,
    'en_attente'::arbre.statut_membre
  )
  on conflict (id) do nothing;

  select * into fiche from arbre.membres where id = auth.uid();
  return fiche;
end;
$$;

comment on function arbre.assurer_fiche_membre() is
  'Crée arbre.membres en attente si le compte auth existe déjà (base partagée Modulyx).';

grant execute on function arbre.assurer_fiche_membre() to authenticated;
