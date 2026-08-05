# L'arbre de Léo

Un arbre généalogique familial **interactif et communautaire** : la famille
élargie s'y crée un compte, consulte l'arbre, et y dépose ses souvenirs datés,
ses photos et les faits qu'elle est seule à connaître.

Ce dépôt ne contient **que le code**. Aucune donnée familiale n'y figure — ni
nom, ni date, ni photo, ni acte d'état civil. Tout cela vit dans une base
Postgres privée, dont l'accès est accordé à la main, membre par membre.

## Pourquoi ce projet

Les logiciels de généalogie savent afficher une filiation. Ils retiennent mal
le reste : pourquoi un aïeul a traversé la Méditerranée, ce qu'un
arrière-grand-père faisait de ses journées, quel événement du monde a fait
basculer une vie. Cette application essaie de tenir les deux bouts.

Elle part de fichiers GEDCOM déjà constitués, les fusionne autour d'un enfant,
et donne à la famille les moyens de continuer l'enquête ensemble.

## Ce qu'elle fait

- **Un arbre géant, navigable.** Zoom et déplacement continus, recherche
  instantanée sur les noms, les lieux et les années, bascule entre la ligne
  directe et la parenté complète. Chaque branche a sa couleur.
- **Des niveaux de preuve.** Une information tirée d'un acte d'état civil n'a
  pas le même poids qu'un souvenir de famille. L'application le dit, pour chaque
  fait : acte consulté, registre numérisé, fichier des décès, mémoire familiale,
  hypothèse, ou piste à ouvrir.
- **Une chronologie** qui déroule trois siècles en croisant la vie de la famille
  et la grande Histoire.
- **Une carte des migrations**, dessinée sans dépendance externe, avec un
  curseur de période : on voit la famille se déplacer dans le temps.
- **Des souvenirs déposés par les membres** : un récit, une date même
  approximative, un lieu, des photos, les personnes concernées.
- **Des chantiers de recherche** : quels actes sont demandés à quelles archives,
  quelles branches sont bloquées et pourquoi.
- **Une administration** : chaque inscription est lue et validée à la main.

## Vie privée

C'est la contrainte structurante du projet, pas une case à cocher.

- Le dépôt est public, **les données ne le sont pas**. Le `.gitignore` exclut
  `/data`, tout fichier `.ged`, les actes et les photos.
- **Aucun accès sans validation.** L'inscription est libre, l'accès ne l'est
  pas : un administrateur ouvre chaque compte après avoir lu la demande.
- **Row Level Security** sur toutes les tables : un compte non validé ne lit
  rien, même en interrogeant l'API directement. La sécurité tient dans la base,
  pas dans l'interface.
- Les personnes encore vivantes sont repérées comme telles et signalées dans
  l'interface. Une fiche peut être marquée confidentielle : seuls les
  administrateurs la voient alors.
- Les fichiers sont dans un **bucket privé**, servis par URL signée à durée
  limitée. Aucune image n'est accessible par une URL publique.
- Le site demande aux moteurs de recherche de ne pas l'indexer.

## Pile technique

| | |
|---|---|
| Cadre | Next.js 16 (App Router, Turbopack), React 19 |
| Style | Tailwind CSS 4, thèmes clair et sombre |
| Base | PostgreSQL via Supabase, schéma dédié, RLS partout |
| Comptes | Supabase Auth, validation manuelle |
| Fichiers | Supabase Storage, bucket privé |
| Arbre | SVG et `d3-zoom`, disposition calculée sur mesure |

## Mise en route

```bash
npm install
```

Créez un projet Supabase, puis appliquez les migrations de `supabase/migrations/`
dans l'ordre. Elles créent le schéma `arbre`, ses tables, ses politiques RLS et
le bucket privé.

Copiez `.env.example` en `.env.local` et renseignez l'URL et la clé publiable de
votre projet.

```bash
npm run dev
```

Le premier compte créé devient administrateur — sans quoi personne ne pourrait
valider personne.

### Importer des données GEDCOM

Les scripts d'import sont dans `scripts/`. Ils attendent des fichiers GEDCOM
5.5.1 situés hors du dépôt.

```bash
npm run arbre:fusion
```

Fusionne les GEDCOM en un modèle unifié, rapproche les doublons entre branches
et contrôle la cohérence des dates. Un rapport s'affiche avant tout envoi en
base : doublons rapprochés, personnes présumées vivantes, anomalies, profondeur
de l'ascendance. Relisez-le.

```bash
npm run arbre:sql
```

Traduit ce modèle en blocs SQL courts, à exécuter dans l'ordre de leur
numérotation — les événements dépendent des personnes et des lieux, les
filiations des unions.

L'import est **rejouable sans rien effacer** : chaque instruction porte sa
clause `on conflict do nothing`, adossée aux index d'unicité de la migration
`0007`. Enrichissez votre GEDCOM, relancez les deux commandes, et seules les
nouveautés entrent en base. Les souvenirs, photos et commentaires déposés par
la famille ne sont jamais touchés par l'import.

Les chemins des fichiers sources se règlent en tête de `scripts/build-tree.mjs`,
et les coordonnées des lieux dans `scripts/lieux-connus.mjs` — un géocodeur
moderne ne sait placer ni les communes de l'Algérie française, ni les hameaux
rattachés depuis à d'autres communes.

## Organisation

```
scripts/          analyse GEDCOM, fusion, génération du SQL d'import
supabase/         migrations : schéma, RLS, stockage
src/lib/          accès aux données, types, disposition de l'arbre
src/components/   composants, par module
src/app/          routes
```

`CONVENTIONS.md` fixe les règles d'écriture du projet.

## Licence

Code sous licence MIT — voir [LICENSE](LICENSE). La licence porte sur le code
seul : les données familiales n'ont jamais fait partie de ce dépôt.
