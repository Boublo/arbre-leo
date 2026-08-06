-- Un récit est un article narratif long, ancré à une famille (patronyme) ou
-- à un thème, avec des personnes citées et une période couverte. Distinct
-- des souvenirs, qui sont ponctuels et déposés par la famille au jour le
-- jour ; un récit est une mise en forme, la lecture longue.

create table arbre.recits (
  id            uuid primary key default gen_random_uuid(),

  -- Le patronyme principal ou un thème. Un des deux est renseigné.
  patronyme     text,
  theme         text,
  branche       text,

  titre         text not null,
  chapeau       text,
  corps         text not null,

  -- Période couverte par le récit, si applicable.
  annee_debut   integer,
  annee_fin     integer,

  auteur_id     uuid references auth.users (id) on delete set null,
  statut        arbre.statut_moderation not null default 'publie',
  epingle       boolean not null default false,

  cree_le       timestamptz not null default now(),
  modifie_le    timestamptz not null default now(),

  constraint recits_patronyme_ou_theme check (
    (patronyme is not null) or (theme is not null)
  ),
  constraint recits_annees_coherentes check (
    annee_fin is null or annee_debut is null or annee_fin >= annee_debut
  )
);

create index recits_patronyme_idx on arbre.recits (upper(patronyme));
create index recits_theme_idx     on arbre.recits (theme);
create index recits_branche_idx   on arbre.recits (branche);
create index recits_epingle_idx   on arbre.recits (epingle) where epingle;

-- Personnes citées, pour tissage bidirectionnel.
create table arbre.recits_personnes (
  recit_id     uuid not null references arbre.recits (id) on delete cascade,
  personne_id  uuid not null references arbre.personnes (id) on delete cascade,
  primary key (recit_id, personne_id)
);
create index recits_personnes_personne_idx on arbre.recits_personnes (personne_id);

alter table arbre.recits            enable row level security;
alter table arbre.recits_personnes  enable row level security;
revoke all on arbre.recits, arbre.recits_personnes from anon, authenticated;
grant select, insert, update, delete on arbre.recits, arbre.recits_personnes to authenticated;

create policy recits_lire on arbre.recits
  for select to authenticated
  using (arbre.est_membre_valide() and (statut = 'publie' or auteur_id = auth.uid() or arbre.est_admin()));
create policy recits_ecrire on arbre.recits
  for insert to authenticated with check (arbre.peut_contribuer() and auteur_id = auth.uid());
create policy recits_modifier on arbre.recits
  for update to authenticated
  using (auteur_id = auth.uid() or arbre.est_admin())
  with check (auteur_id = auth.uid() or arbre.est_admin());
create policy recits_supprimer on arbre.recits
  for delete to authenticated using (auteur_id = auth.uid() or arbre.est_admin());

create policy recits_personnes_lire on arbre.recits_personnes
  for select to authenticated using (arbre.est_membre_valide());
create policy recits_personnes_ecrire on arbre.recits_personnes
  for insert to authenticated with check (
    exists (select 1 from arbre.recits r
            where r.id = recit_id and (r.auteur_id = auth.uid() or arbre.est_admin()))
  );
create policy recits_personnes_supprimer on arbre.recits_personnes
  for delete to authenticated using (
    exists (select 1 from arbre.recits r
            where r.id = recit_id and (r.auteur_id = auth.uid() or arbre.est_admin()))
  );

create trigger recits_touch before update on arbre.recits
  for each row execute function arbre.touch_modifie_le();

create trigger recits_journal after insert or update or delete on arbre.recits
  for each row execute function arbre.tracer();

comment on table arbre.recits is
  'Articles narratifs longs, un par famille ou par thème. Distincts des souvenirs (fragments ponctuels) : ici c''est la mise en forme d''une histoire familiale entière.';
