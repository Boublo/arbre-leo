# Le catalogue des données

Ce document décrit **la base**, pas l’application. Il donne à quelqu’un qui
n’a jamais ouvert Supabase de quoi écrire du SQL correct sur ce schéma :
tables, relations, énums, clés, règles RLS et patrons de requêtes.

Toutes les tables vivent dans le schéma `arbre`. Le schéma `public` est occupé
par une autre application : on ne le touche jamais. Écrire donc
`arbre.personnes`, pas `public.personnes`.

Les exemples SQL utilisent partout les **guillemets-dollar** `$t$…$t$`, qui
évitent d’avoir à échapper les apostrophes françaises dans les chaînes.

---

## 1. Le schéma en un coup d’œil

Ce que contient chaque table, en une ligne. Source : `supabase/migrations/`.

| Table | Contenu |
|---|---|
| `arbre.membres` | Un compte de la famille : rôle, statut de validation, lien facultatif vers sa fiche. |
| `arbre.lieux` | Une commune, un hameau, un pays ; libellé d’époque et rattachement actuel. |
| `arbre.personnes` | Une personne de l’arbre : identité, sexe, branches, niveaux de preuve, mention « présumé vivant ». |
| `arbre.unions` | Un couple : deux conjoints (l’un ou l’autre peut être nul), branches, notes. |
| `arbre.filiations` | Le rattachement d’un enfant à une union. |
| `arbre.evenements` | Un fait daté rattaché soit à une personne, soit à une union — jamais aux deux. |
| `arbre.sources` | Une citation d’acte, de registre ou de témoignage attachée à une personne, une union ou un événement. |
| `arbre.medias` | Un fichier du bucket privé : photo, acte, document, audio, vidéo — plus sa description. |
| `arbre.medias_personnes` | Quelles personnes apparaissent sur quel média, et à quel titre. |
| `arbre.souvenirs` | Un récit déposé par un membre, daté, situé, moderé. |
| `arbre.souvenirs_personnes` | Les personnes concernées par un souvenir. |
| `arbre.souvenirs_medias` | Les médias joints à un souvenir, dans un ordre. |
| `arbre.faits_historiques` | Un fait de la grande Histoire, avec portée et bornes de dates. |
| `arbre.faits_personnes` | Qui a été concerné par un fait historique, et comment. |
| `arbre.chantiers_recherche` | Une piste ouverte : acte demandé, branche bloquée, hypothèse à vérifier. |
| `arbre.commentaires` | Une conversation sur une personne, un souvenir ou un média. |
| `arbre.journal` | Trace automatique des insertions, modifications et suppressions sur les tables sensibles. |

---

## 2. Les relations

Le noyau tient en cinq tables. Le reste (souvenirs, médias, faits, chantiers)
vient s’accrocher dessus.

```
                          arbre.personnes
                            │        │
              conjoint_a    │        │    conjoint_b
                    ┌───────┘        └────────┐
                    ▼                         ▼
                 arbre.unions ◄─── union_id ── arbre.filiations
                    │                                │
                    │                        enfant_id
                    │                                ▼
                    │                         arbre.personnes
                    │
                    │   personne_id  (l’un OU l’autre, jamais les deux)
                    ▼        ▲
              arbre.evenements ◄─────── lieu_id ─── arbre.lieux
                    ▲
                    │  evenement_id
                    │
              arbre.sources ── personne_id / union_id
```

Points à retenir :

- **Une filiation passe toujours par une union**, jamais directement d’un
  parent à un enfant. Un enfant né hors union se rattache à une union
  fictive n’ayant qu’un seul conjoint : la contrainte
  `unions_au_moins_un_conjoint` autorise ce cas.
- **Un événement porte soit `personne_id`, soit `union_id`, jamais les deux.**
  C’est la contrainte `evenements_un_seul_rattachement`
  (`(personne_id is not null) <> (union_id is not null)`). Un mariage, un
  divorce, une union libre se rattachent à `unions`. Une naissance, un décès,
  une profession se rattachent à `personnes`.
- **Une source peut se rattacher à trois cibles** — personne, union,
  événement — et rien n’oblige à n’en choisir qu’une : la même
  transcription peut renseigner à la fois une personne et l’événement
  précis qu’elle documente.
- **Un commentaire, à l’inverse, vise une seule cible** — personne,
  souvenir ou média — par la contrainte `commentaires_une_seule_cible`.

---

## 3. Les énums

Tous les types énumérés du schéma `arbre`, avec leurs valeurs exactes.
Source de vérité : `src/lib/types-base.ts` (recopié à la main sur les
migrations, comme le rappelle le commentaire en tête du fichier).

### `arbre.role_membre`

| Valeur | Sens |
|---|---|
| `admin` | Peut valider les inscriptions, arbitrer, consulter le journal. |
| `contributeur` | Peut enrichir l’arbre : personnes, événements, souvenirs, chantiers. |
| `lecteur` | Consulte, commente, mais ne modifie rien. |

### `arbre.statut_membre`

| Valeur | Sens |
|---|---|
| `en_attente` | Compte créé, aucune donnée familiale encore lisible. |
| `valide` | Accès accordé par un admin. |
| `refuse` | Demande rejetée avec motif. |
| `suspendu` | Accès retiré temporairement. |

### `arbre.niveau_preuve`

| Valeur | Sens |
|---|---|
| `acte` | Établi par un acte d’état civil détenu ou consulté. |
| `anom` | Acte de l’état civil d’Algérie numérisé (Archives d’outre-mer). |
| `insee` | Fichier des décès de l’INSEE : très probable, à confirmer. |
| `memoire` | Souvenir familial rapporté. |
| `hypothese` | Déduction cohérente, non encore étayée. |
| `a_trouver` | Personne ou fait identifié mais non documenté. |

### `arbre.statut_moderation`

| Valeur | Sens |
|---|---|
| `publie` | Visible pour tout membre valide. |
| `en_relecture` | Visible du seul auteur et des admins. |
| `masque` | Retiré de la vue commune. |

### `arbre.type_media`

`photo`, `acte`, `document`, `audio`, `video`.

### `arbre.sexe`

`M`, `F`, `inconnu`. Un sexe inconnu se dit `inconnu`, pas `null` : la
colonne n’est pas nullable.

### `arbre.portee_fait`

Portée d’un fait de la grande Histoire, pour distinguer un événement
mondial d’un incident local :

`mondial`, `national`, `regional`, `local`, `familial`.

### `arbre.statut_chantier`

`a_faire`, `en_cours`, `en_attente_reponse`, `aboutie`, `abandonnee`.

### `arbre.type_evenement`

| Bloc | Valeurs |
|---|---|
| Naissance et baptême | `naissance`, `bapteme` |
| Union et rupture | `mariage`, `union_libre`, `fiancailles`, `divorce` |
| Fin de vie | `deces`, `inhumation`, `cremation` |
| Vie et mouvement | `profession`, `residence`, `recensement`, `emigration`, `immigration`, `naturalisation` |
| Parcours | `service_militaire`, `education`, `distinction`, `maladie` |
| Fourre-tout | `autre` |

Un événement dont le type ne rentre nulle part se code en `autre` avec un
`libelle` explicite, jamais en inventant une valeur d’énum : la base la
rejetterait.

### `arbre.precision_date`

Grain temporel de l’information disponible :

`jour`, `mois`, `annee`, `decennie`, `siecle`, `inconnue`.

### `arbre.qualificatif_date`

Nuance portée par la date brute :

| Valeur | Sens |
|---|---|
| `exacte` | Date donnée telle quelle. |
| `vers` | Approximation (« vers 1890 »). |
| `avant` | Borne supérieure (« avant 1912 »). |
| `apres` | Borne inférieure (« après 1918 »). |
| `entre` | Fourchette : `annee` et `annee_fin` sont renseignés. |
| `depuis` | Continu depuis une date. |
| `jusqu_a` | Continu jusqu’à une date. |

---

## 4. Les identifiants

Trois clés coexistent sur les tables du noyau. Il faut savoir laquelle
utiliser dans chaque cas — s’en tromper crée soit des doublons, soit des
faits déversés sur la mauvaise fiche.

### `id` (uuid) — la vraie clé primaire

Générée par la base à l’insertion (`gen_random_uuid()`). Non devinable,
stable pour toujours. C’est ce qu’on stocke dans les colonnes de type
`… _id` (`personne_id`, `union_id`, `lieu_id`, etc.) et ce qu’on manipule
dans le code applicatif.

On ne l’écrit **jamais à la main** dans un import : on la laisse la base
la fabriquer, puis on la retrouve en joignant sur `code_gedcom`.

### `code_gedcom` (text, unique) — la clé naturelle d’import

Colonne présente sur `personnes` et `unions`. C’est la clé qui rend l’import
**rejouable** : les instructions générées par `scripts/generate-import-sql.mjs`
portent toutes `on conflict (code_gedcom) do update set …`, si bien que
rejouer un import ne crée pas de doublons — seules les nouveautés entrent.

Format retenu, avec préfixe de source :

| Préfixe | Origine | Exemple |
|---|---|---|
| `chereau:` | GEDCOM historique côté maternel | `chereau:I42` |
| `suire:` | GEDCOM historique côté paternel | `suire:F13` |
| `acte:` | Personne ajoutée à partir d’un acte, hors GEDCOM | `acte:SEGURA_PIERRE` |

Nouvelle règle pour tout code inventé à la main : lettres majuscules non
accentuées, tirets bas entre les mots, jamais de caractère spécial. Une
même personne doit **conserver son code entre deux passages** — c’est ce
code qui empêche de la recréer.

### `nom_complet` — jamais une clé

Colonne calculée par la base : `prenoms || ' ' || nom`. Utile pour un
affichage ou une recherche « à la ressemblance », **jamais** pour une
jointure. La base contient plusieurs homonymes stricts (mêmes prénoms,
même nom, parfois même année de naissance) : joindre sur `nom_complet`
mélangerait leurs événements.

Toujours joindre sur `id` (dans le code) ou sur `code_gedcom` (dans un
script d’import).

---

## 5. Les règles de RLS

**Row Level Security** est activée sur toutes les tables du schéma. Ces
politiques font foi : ne jamais essayer de les contourner, c’est la seule
garantie du projet.

Résumé par rôle, extrait de `supabase/migrations/0004_rls.sql`.

### Anonyme (non connecté)

Rien. Les politiques `to authenticated` ne s’appliquent pas à `anon`, et
les tables du schéma sont révoquées à `anon` (`revoke all on all tables in
schema arbre from anon, authenticated`). Un visiteur non identifié ne lit
et n’écrit rien.

### Membre `en_attente`

Ne voit que sa propre fiche membre (politique `membres_voir_sa_fiche`).
Les données familiales lui restent invisibles tant qu’un admin ne l’a
pas validé : la fonction `arbre.est_membre_valide()` renvoie `false` et
toutes les politiques `_lire` du noyau s’effondrent.

### Lecteur validé (`role = 'lecteur'` et `statut = 'valide'`)

- Lit les personnes non confidentielles, unions, filiations, événements,
  sources, lieux, faits historiques, chantiers.
- Lit les souvenirs et médias publiés, ses propres brouillons.
- **Peut déposer des commentaires** (politique `commentaires_ecrire`
  autorise tout membre valide) et **des souvenirs** (politique
  `souvenirs_deposer`).
- Ne peut pas ajouter une personne, une union, un événement : ces
  politiques exigent `arbre.peut_contribuer()`, qui vérifie
  `role in ('admin', 'contributeur')`.

### Contributeur (`role = 'contributeur'`, statut `valide`)

En plus du lecteur :

- Ajoute et modifie personnes, unions, filiations, événements, sources,
  lieux, médias, faits historiques, chantiers.
- Ne peut pas supprimer les personnes, les lieux, les faits ni les
  chantiers (réservé aux admins), mais peut supprimer une filiation,
  un événement, une source, un chantier de recherche qu’il gère.

### Administrateur (`role = 'admin'`, statut `valide`)

- Voit tout, y compris les fiches marquées `confidentiel = true` et les
  contenus `en_relecture` ou `masque`.
- Valide, refuse, suspend les inscriptions ; modifie les rôles ; ne peut
  pas se supprimer lui-même (`id <> auth.uid()`) et ne peut pas retirer
  le dernier admin (trigger `garder_un_admin`).
- Consulte le `journal`, qui n’est lisible que par lui.

### Points de vigilance

- Une personne `confidentielle = true` n’apparaît que pour les admins.
  Un contributeur ne peut donc pas la rattacher à ses souvenirs — il ne
  la voit pas.
- Un souvenir en `statut = 'en_relecture'` reste visible pour son auteur
  et pour les admins uniquement. Idem pour un média.
- Les fichiers du bucket `arbre-medias` sont privés : jamais d’URL
  publique. Toujours passer par une URL signée à durée limitée.

---

## 6. Patrons de requêtes utiles

Toutes les requêtes ci-dessous utilisent les guillemets-dollar `$t$…$t$`
pour éviter les erreurs d’échappement sur les apostrophes françaises.

### Insérer une personne avec un `code_gedcom`

```sql
insert into arbre.personnes (
  code_gedcom, prenoms, nom, sexe, branches, niveaux_preuve
) values (
  $t$acte:SEGURA_PIERRE$t$,
  $t$Pierre$t$,
  $t$Segura$t$,
  $t$M$t$,
  array[$t$paternelle$t$],
  array[$t$acte$t$::arbre.niveau_preuve]
)
on conflict (code_gedcom) do update set
  prenoms        = excluded.prenoms,
  nom            = excluded.nom,
  sexe           = excluded.sexe,
  branches       = excluded.branches,
  niveaux_preuve = excluded.niveaux_preuve;
```

La clause `on conflict` reproduit la stratégie du script d’import :
rejouable, ne casse pas ce qui existe déjà.

### Rattacher une personne à une union existante par `code_gedcom`

L’union est retrouvée par son code, la personne aussi. Aucun uuid n’est
manipulé à la main.

```sql
insert into arbre.filiations (union_id, enfant_id)
select u.id, p.id
from   arbre.unions   u,
       arbre.personnes p
where  u.code_gedcom = $t$suire:F13$t$
  and  p.code_gedcom = $t$acte:SEGURA_PIERRE$t$
on conflict (union_id, enfant_id) do nothing;
```

### Ajouter un événement daté avec un lieu

Le lieu est retrouvé par son libellé (insensible à la casse, comme le
définit l’index `lieux_libelle_key`). L’événement se rattache à la
personne — donc `union_id` reste nul, sinon la contrainte
`evenements_un_seul_rattachement` refuserait l’insertion.

```sql
insert into arbre.evenements (
  personne_id, type, date_texte, annee, mois, jour,
  qualificatif, precision_date, lieu_id, niveau_preuve
)
select
  p.id,
  $t$naissance$t$::arbre.type_evenement,
  $t$7 juillet 1936$t$,
  1936, 7, 7,
  $t$exacte$t$::arbre.qualificatif_date,
  $t$jour$t$::arbre.precision_date,
  l.id,
  $t$acte$t$::arbre.niveau_preuve
from   arbre.personnes p
left join arbre.lieux l
       on lower(l.libelle) = lower($t$La Roda de Andalucía (Séville, Espagne)$t$)
where  p.code_gedcom = $t$acte:SEGURA_PIERRE$t$
on conflict (personne_id, union_id, type, date_texte, lieu_id, detail)
  do nothing;
```

Si le lieu n’existe pas encore, l’insérer d’abord :

```sql
insert into arbre.lieux (libelle, commune, region, pays, pays_actuel)
values (
  $t$La Roda de Andalucía (Séville, Espagne)$t$,
  $t$La Roda de Andalucía$t$,
  $t$Andalousie$t$,
  $t$Espagne$t$,
  $t$Espagne$t$
)
on conflict (lower(libelle)) do nothing;
```

### Trouver toutes les personnes sans date de naissance

Utile pour prioriser les recherches d’actes.

```sql
select p.id, p.code_gedcom, p.nom_complet, p.branches
from   arbre.personnes p
where  not exists (
  select 1
  from   arbre.evenements e
  where  e.personne_id = p.id
    and  e.type = $t$naissance$t$
    and  e.annee is not null
)
order  by p.nom, p.prenoms;
```

### Remonter l’ascendance d’une personne (CTE récursive)

Renvoie la personne et tous ses ancêtres, avec leur génération (0 = la
personne, 1 = ses parents, 2 = ses grands-parents, etc.).

```sql
with recursive ascendance as (
  select p.id, p.nom_complet, 0 as generation
  from   arbre.personnes p
  where  p.code_gedcom = $t$chereau:I1$t$

  union all

  select parent.id, parent.nom_complet, a.generation + 1
  from   ascendance a
  join   arbre.filiations f on f.enfant_id = a.id
  join   arbre.unions     u on u.id = f.union_id
  join   arbre.personnes  parent
         on parent.id in (u.conjoint_a, u.conjoint_b)
  where  a.generation < 12  -- garde-fou anti-boucle
)
select generation, nom_complet
from   ascendance
order  by generation, nom_complet;
```

Le garde-fou est indispensable : rien dans la base n’empêche
structurellement qu’un cycle apparaisse (une saisie erronée peut placer
quelqu’un dans sa propre ascendance).

### Trouver les doublons potentiels

Deux personnes qui portent les mêmes prénoms, le même nom et sont nées
la même année sont vraisemblablement une seule et même personne saisie
deux fois — ou deux homonymes stricts, à vérifier.

```sql
with naissances as (
  select personne_id, annee
  from   arbre.evenements
  where  type = $t$naissance$t$ and annee is not null
)
select p.prenoms,
       p.nom,
       n.annee,
       count(*)                          as combien,
       array_agg(p.code_gedcom)          as codes,
       array_agg(p.id::text)             as ids
from   arbre.personnes p
join   naissances      n on n.personne_id = p.id
group  by p.prenoms, p.nom, n.annee
having count(*) > 1
order  by combien desc, p.nom, p.prenoms;
```

Une variante sans exiger l’année de naissance (utile quand un des deux
n’en a pas), pour un rapprochement plus lâche :

```sql
select prenoms, nom, count(*) as combien,
       array_agg(code_gedcom) as codes
from   arbre.personnes
where  prenoms is not null and nom is not null
group  by lower(prenoms), lower(nom), prenoms, nom
having count(*) > 1
order  by combien desc;
```

Un doublon avéré se résout **à la main** : jamais de `delete` cavalier
sur `personnes`, les événements et filiations partiraient en cascade.
Rapatrier d’abord les événements et les filiations de la fiche à
supprimer vers la fiche à garder, puis supprimer la seconde.
