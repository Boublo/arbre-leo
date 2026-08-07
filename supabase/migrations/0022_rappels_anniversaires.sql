-- ===========================================================================
-- L'arbre de Léo — 0022 : rappels d'anniversaires (naissance, décès, mariage)
-- ---------------------------------------------------------------------------
-- Préférences par membre + journal d'envoi pour éviter les doublons.
-- Les courriels sont déclenchés par un cron applicatif (Vercel ou script).
-- ===========================================================================

alter type arbre.type_notification add value if not exists 'anniversaire_naissance';
alter type arbre.type_notification add value if not exists 'anniversaire_deces';
alter type arbre.type_notification add value if not exists 'anniversaire_mariage';
alter type arbre.type_notification add value if not exists 'rappel_ephemerides';

alter table arbre.membres
  add column if not exists rappels_email boolean not null default true,
  add column if not exists rappels_naissance boolean not null default true,
  add column if not exists rappels_deces boolean not null default true,
  add column if not exists rappels_mariage boolean not null default false;

comment on column arbre.membres.rappels_email is
  'Recevoir un courriel quotidien quand un anniversaire tombe ce jour-là.';
comment on column arbre.membres.rappels_naissance is
  'Inclure les anniversaires de naissance dans les rappels.';
comment on column arbre.membres.rappels_deces is
  'Inclure les anniversaires de décès dans les rappels.';
comment on column arbre.membres.rappels_mariage is
  'Inclure les anniversaires de mariage dans les rappels.';

create table arbre.rappels_envoyes (
  membre_id         uuid not null references auth.users (id) on delete cascade,
  canal             text not null check (canal in ('email', 'in_app')),
  date_calendaire   date not null,
  cree_le           timestamptz not null default now(),
  primary key (membre_id, canal, date_calendaire)
);

create index rappels_envoyes_date_idx on arbre.rappels_envoyes (date_calendaire);

alter table arbre.rappels_envoyes enable row level security;

revoke all on table arbre.rappels_envoyes from anon, authenticated;
grant select, insert on table arbre.rappels_envoyes to service_role;
