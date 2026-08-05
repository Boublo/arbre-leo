-- ===========================================================================
-- L'arbre de Leo — 0004 rls
-- ---------------------------------------------------------------------------
-- securite : row level security sur toutes les tables
-- ===========================================================================

-- Regle generale : rien n est lisible sans etre un membre valide par un admin.
-- Un compte fraichement inscrit ne voit donc aucune donnee familiale.

alter table arbre.membres             enable row level security;
alter table arbre.lieux               enable row level security;
alter table arbre.personnes           enable row level security;
alter table arbre.unions              enable row level security;
alter table arbre.filiations          enable row level security;
alter table arbre.evenements          enable row level security;
alter table arbre.sources             enable row level security;
alter table arbre.medias              enable row level security;
alter table arbre.medias_personnes    enable row level security;
alter table arbre.souvenirs           enable row level security;
alter table arbre.souvenirs_personnes enable row level security;
alter table arbre.souvenirs_medias    enable row level security;
alter table arbre.faits_historiques   enable row level security;
alter table arbre.faits_personnes     enable row level security;
alter table arbre.chantiers_recherche enable row level security;
alter table arbre.commentaires        enable row level security;
alter table arbre.journal             enable row level security;

revoke all on all tables in schema arbre from anon, authenticated;
grant select, insert, update, delete on all tables in schema arbre to authenticated;
grant usage, select on all sequences in schema arbre to authenticated;

-- Membres -----------------------------------------------------------------
create policy membres_voir_sa_fiche on arbre.membres
  for select to authenticated using (id = auth.uid());

create policy membres_voir_les_autres on arbre.membres
  for select to authenticated using (arbre.est_membre_valide() and statut = 'valide');

create policy membres_admin_voit_tout on arbre.membres
  for select to authenticated using (arbre.est_admin());

-- Chacun ajuste son nom affiche, sans pouvoir se promouvoir : le trigger
-- ci-dessous verrouille role et statut pour les non-admins.
create policy membres_modifier_sa_fiche on arbre.membres
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy membres_admin_modifie on arbre.membres
  for update to authenticated using (arbre.est_admin()) with check (arbre.est_admin());

create policy membres_admin_supprime on arbre.membres
  for delete to authenticated using (arbre.est_admin() and id <> auth.uid());

create or replace function arbre.verrouiller_privileges()
returns trigger
language plpgsql security definer set search_path = arbre, pg_temp
as $$
begin
  if not arbre.est_admin() then
    new.role        := old.role;
    new.statut      := old.statut;
    new.valide_par  := old.valide_par;
    new.valide_le   := old.valide_le;
    new.motif_refus := old.motif_refus;
  elsif new.statut = 'valide' and old.statut <> 'valide' then
    new.valide_par := auth.uid();
    new.valide_le  := now();
  end if;
  return new;
end;
$$;

create trigger membres_verrou before update on arbre.membres
  for each row execute function arbre.verrouiller_privileges();

-- Un admin ne peut pas se retirer a lui-meme son role : sans cela, une fausse
-- manoeuvre laisserait l application sans personne pour valider les inscrits.
create or replace function arbre.garder_un_admin()
returns trigger
language plpgsql security definer set search_path = arbre, pg_temp
as $$
begin
  if (old.role = 'admin' and old.statut = 'valide')
     and (new.role <> 'admin' or new.statut <> 'valide')
     and (select count(*) from arbre.membres where role = 'admin' and statut = 'valide') <= 1
  then
    raise exception 'Impossible de retirer le dernier administrateur.';
  end if;
  return new;
end;
$$;

create trigger membres_dernier_admin before update on arbre.membres
  for each row execute function arbre.garder_un_admin();

-- Noyau genealogique -------------------------------------------------------
-- Lecture pour tout membre valide ; les fiches marquees confidentielles
-- restent reservees aux administrateurs.

create policy personnes_lire on arbre.personnes
  for select to authenticated
  using (arbre.est_membre_valide() and (not confidentiel or arbre.est_admin()));

create policy personnes_ecrire on arbre.personnes
  for insert to authenticated with check (arbre.peut_contribuer());
create policy personnes_modifier on arbre.personnes
  for update to authenticated using (arbre.peut_contribuer()) with check (arbre.peut_contribuer());
create policy personnes_supprimer on arbre.personnes
  for delete to authenticated using (arbre.est_admin());

create policy lieux_lire on arbre.lieux
  for select to authenticated using (arbre.est_membre_valide());
create policy lieux_ecrire on arbre.lieux
  for insert to authenticated with check (arbre.peut_contribuer());
create policy lieux_modifier on arbre.lieux
  for update to authenticated using (arbre.peut_contribuer()) with check (arbre.peut_contribuer());
create policy lieux_supprimer on arbre.lieux
  for delete to authenticated using (arbre.est_admin());

create policy unions_lire on arbre.unions
  for select to authenticated using (arbre.est_membre_valide());
create policy unions_ecrire on arbre.unions
  for insert to authenticated with check (arbre.peut_contribuer());
create policy unions_modifier on arbre.unions
  for update to authenticated using (arbre.peut_contribuer()) with check (arbre.peut_contribuer());
create policy unions_supprimer on arbre.unions
  for delete to authenticated using (arbre.est_admin());

create policy filiations_lire on arbre.filiations
  for select to authenticated using (arbre.est_membre_valide());
create policy filiations_ecrire on arbre.filiations
  for insert to authenticated with check (arbre.peut_contribuer());
create policy filiations_modifier on arbre.filiations
  for update to authenticated using (arbre.peut_contribuer()) with check (arbre.peut_contribuer());
create policy filiations_supprimer on arbre.filiations
  for delete to authenticated using (arbre.peut_contribuer());

create policy evenements_lire on arbre.evenements
  for select to authenticated using (arbre.est_membre_valide());
create policy evenements_ecrire on arbre.evenements
  for insert to authenticated with check (arbre.peut_contribuer());
create policy evenements_modifier on arbre.evenements
  for update to authenticated using (arbre.peut_contribuer()) with check (arbre.peut_contribuer());
create policy evenements_supprimer on arbre.evenements
  for delete to authenticated using (arbre.peut_contribuer());

create policy sources_lire on arbre.sources
  for select to authenticated using (arbre.est_membre_valide());
create policy sources_ecrire on arbre.sources
  for insert to authenticated with check (arbre.peut_contribuer());
create policy sources_modifier on arbre.sources
  for update to authenticated using (arbre.peut_contribuer()) with check (arbre.peut_contribuer());
create policy sources_supprimer on arbre.sources
  for delete to authenticated using (arbre.peut_contribuer());

-- Medias -------------------------------------------------------------------
-- Un depot en relecture n est visible que de son auteur et des administrateurs.

create policy medias_lire on arbre.medias
  for select to authenticated
  using (arbre.est_membre_valide() and (statut = 'publie' or depose_par = auth.uid() or arbre.est_admin()));

create policy medias_deposer on arbre.medias
  for insert to authenticated with check (arbre.peut_contribuer() and depose_par = auth.uid());
create policy medias_modifier on arbre.medias
  for update to authenticated
  using (depose_par = auth.uid() or arbre.est_admin())
  with check (depose_par = auth.uid() or arbre.est_admin());
create policy medias_supprimer on arbre.medias
  for delete to authenticated using (depose_par = auth.uid() or arbre.est_admin());

create policy medias_personnes_lire on arbre.medias_personnes
  for select to authenticated using (arbre.est_membre_valide());
create policy medias_personnes_ecrire on arbre.medias_personnes
  for insert to authenticated with check (arbre.peut_contribuer());
create policy medias_personnes_supprimer on arbre.medias_personnes
  for delete to authenticated using (arbre.peut_contribuer());

-- Souvenirs ----------------------------------------------------------------

create policy souvenirs_lire on arbre.souvenirs
  for select to authenticated
  using (arbre.est_membre_valide() and (statut = 'publie' or auteur_id = auth.uid() or arbre.est_admin()));

create policy souvenirs_deposer on arbre.souvenirs
  for insert to authenticated with check (arbre.est_membre_valide() and auteur_id = auth.uid());
create policy souvenirs_modifier on arbre.souvenirs
  for update to authenticated
  using (auteur_id = auth.uid() or arbre.est_admin())
  with check (auteur_id = auth.uid() or arbre.est_admin());
create policy souvenirs_supprimer on arbre.souvenirs
  for delete to authenticated using (auteur_id = auth.uid() or arbre.est_admin());

create policy souvenirs_personnes_lire on arbre.souvenirs_personnes
  for select to authenticated using (arbre.est_membre_valide());
create policy souvenirs_personnes_ecrire on arbre.souvenirs_personnes
  for insert to authenticated with check (
    exists (select 1 from arbre.souvenirs s
            where s.id = souvenir_id and (s.auteur_id = auth.uid() or arbre.est_admin()))
  );
create policy souvenirs_personnes_supprimer on arbre.souvenirs_personnes
  for delete to authenticated using (
    exists (select 1 from arbre.souvenirs s
            where s.id = souvenir_id and (s.auteur_id = auth.uid() or arbre.est_admin()))
  );

create policy souvenirs_medias_lire on arbre.souvenirs_medias
  for select to authenticated using (arbre.est_membre_valide());
create policy souvenirs_medias_ecrire on arbre.souvenirs_medias
  for insert to authenticated with check (
    exists (select 1 from arbre.souvenirs s
            where s.id = souvenir_id and (s.auteur_id = auth.uid() or arbre.est_admin()))
  );
create policy souvenirs_medias_supprimer on arbre.souvenirs_medias
  for delete to authenticated using (
    exists (select 1 from arbre.souvenirs s
            where s.id = souvenir_id and (s.auteur_id = auth.uid() or arbre.est_admin()))
  );

-- Grande Histoire et chantiers ---------------------------------------------

create policy faits_lire on arbre.faits_historiques
  for select to authenticated using (arbre.est_membre_valide());
create policy faits_ecrire on arbre.faits_historiques
  for insert to authenticated with check (arbre.peut_contribuer());
create policy faits_modifier on arbre.faits_historiques
  for update to authenticated using (arbre.peut_contribuer()) with check (arbre.peut_contribuer());
create policy faits_supprimer on arbre.faits_historiques
  for delete to authenticated using (arbre.est_admin());

create policy faits_personnes_lire on arbre.faits_personnes
  for select to authenticated using (arbre.est_membre_valide());
create policy faits_personnes_ecrire on arbre.faits_personnes
  for insert to authenticated with check (arbre.peut_contribuer());
create policy faits_personnes_supprimer on arbre.faits_personnes
  for delete to authenticated using (arbre.peut_contribuer());

create policy chantiers_lire on arbre.chantiers_recherche
  for select to authenticated using (arbre.est_membre_valide());
create policy chantiers_ecrire on arbre.chantiers_recherche
  for insert to authenticated with check (arbre.peut_contribuer());
create policy chantiers_modifier on arbre.chantiers_recherche
  for update to authenticated using (arbre.peut_contribuer()) with check (arbre.peut_contribuer());
create policy chantiers_supprimer on arbre.chantiers_recherche
  for delete to authenticated using (arbre.est_admin());

-- Commentaires -------------------------------------------------------------
-- Tout membre valide peut prendre la parole, y compris un lecteur.

create policy commentaires_lire on arbre.commentaires
  for select to authenticated
  using (arbre.est_membre_valide() and (statut = 'publie' or auteur_id = auth.uid() or arbre.est_admin()));
create policy commentaires_ecrire on arbre.commentaires
  for insert to authenticated with check (arbre.est_membre_valide() and auteur_id = auth.uid());
create policy commentaires_modifier on arbre.commentaires
  for update to authenticated
  using (auteur_id = auth.uid() or arbre.est_admin())
  with check (auteur_id = auth.uid() or arbre.est_admin());
create policy commentaires_supprimer on arbre.commentaires
  for delete to authenticated using (auteur_id = auth.uid() or arbre.est_admin());

-- Journal ------------------------------------------------------------------
-- Consultable par les seuls administrateurs, et alimente uniquement par les
-- declencheurs : personne ne peut y ecrire ni le reecrire a la main.

create policy journal_admin_lit on arbre.journal
  for select to authenticated using (arbre.est_admin());

revoke insert, update, delete on arbre.journal from authenticated;
