# Passation — L'arbre de Léo

Vous reprenez une enquête généalogique en cours. Cette page est faite pour être
lue en dix minutes : elle dit où nous en sommes, ce qui reste à trouver, et
surtout **comment verser proprement en base ce que vous découvrirez**.

L'application est déjà en ligne et fonctionne. Elle est centrée sur un enfant,
**Léo CHEREAU (né le 24 décembre 2017)**, et remonte deux branches
d'ascendance qui se rejoignent en lui : la **paternelle** (CHEREAU, BONDURAND,
SEGURA, BATALLER, SALMERÓN, TORRES — Sarthe, Bretagne, Andalousie, Algérie
française) et la **maternelle** (SUIRE, CARO, ROPERO, ALLEMAND, BONINO —
marais poitevin, Morbihan, Andalousie, Hautes-Alpes, Piémont).

Le propriétaire du projet est **David CHEREAU**. Il est administrateur de
l'application.

---

## 1. Où en est-on

Les chiffres ci-dessous ne sont **pas recopiés à la main** : ils vivent en
base. Lancez la requête, obtenez les valeurs du jour. Ce paragraphe existe
justement pour que vous ne vous appuyiez pas sur un compte périmé.

**Projet Supabase** : `brsjdxrsmdbbcdqgncfs` · **schéma** : `arbre` (jamais
`public`).

Un seul bloc SQL suffit pour tout compter :

```sql
-- Bilan chiffré de l'arbre — à lancer en début de session
select
  (select count(*) from arbre.personnes)                                          as personnes,
  (select count(*) from arbre.personnes where presume_vivant)                     as vivantes,
  (select count(*) from arbre.unions)                                             as unions,
  (select count(*) from arbre.filiations)                                         as filiations,
  (select count(*) from arbre.evenements)                                         as evenements,
  (select count(*) from arbre.sources)                                            as sources,
  (select count(*) from arbre.lieux)                                              as lieux;
```

Répartition des niveaux de preuve sur les événements (c'est là que se lit la
solidité réelle de l'arbre) :

```sql
select niveau_preuve, count(*) as n
from arbre.evenements
group by niveau_preuve
order by n desc;
```

Plus ancien ancêtre connu avec une date de naissance :

```sql
select p.prenoms, p.nom, e.annee, l.libelle
from arbre.personnes p
join arbre.evenements e on e.personne_id = p.id and e.type = 'naissance' and e.annee is not null
left join arbre.lieux  l on l.id = e.lieu_id
order by e.annee
limit 1;
```

Au dernier passage vérifié, cette requête renvoyait **Yves LUCAS, 1697, Loyat
(Morbihan)** — génération 11 en partant de Léo (10 générations d'ascendance
au-dessus de lui). Côté paternel, la branche la plus profonde est TORRES,
huit générations, avec Joseph TORRES et Francisca MIRALLES morts en Espagne
avant 1894 comme point extrême sans date. Vérifiez que c'est toujours vrai
avant de citer ces chiffres.

Rapport de fusion à jour (produit à chaque `arbre:maj`, jamais versionné) :

```
data/arbre-unifie.json      arbre reconstruit, autoritatif entre deux passages
data/rapport-fusion.json    doublons rapprochés, anomalies, ancêtres les plus anciens
data/derniere-fusion.json   empreinte : sert au diff au prochain passage
```

---

## 2. Ce qui est déjà vérifié — les six niveaux de preuve

Chaque événement et chaque source porte un niveau de preuve. L'énumération est
figée par la migration `0001_fondations.sql`. Ne jamais en inventer un
septième : ajoutez-le d'abord dans une migration si c'est vraiment nécessaire.

| Niveau        | Ce que ça veut dire                                                          | Quand l'utiliser                                                                                     |
| ------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `acte`        | Acte d'état civil détenu ou consulté (mairie, notaire, paroisse)             | Vous avez lu la pièce, avez sa cote et son numéro. C'est la preuve reine.                            |
| `anom`        | Acte de l'état civil d'Algérie numérisé aux Archives d'outre-mer             | Registre d'Algérie française lu sur `anom.culture.gouv.fr`. Vous avez la référence ANOM.             |
| `insee`       | Fichier des décès de l'INSEE (démarre en 1970)                               | Nom, prénoms, date et lieu de naissance et de décès concordent. **Ne dit rien de la filiation.**     |
| `memoire`     | Souvenir familial rapporté                                                   | Un membre de la famille se souvient — sans acte. Vaut souvent l'orientation d'une recherche.         |
| `hypothese`   | Déduction cohérente, non encore étayée                                       | « Il avait 33 ans à la naissance de son fils en 1907, donc né vers 1874 » : cohérent, non prouvé.    |
| `a_trouver`   | Personne ou fait identifié mais totalement non documenté                     | Le nœud existe pour tenir la structure ; le nom, la date ou la filiation restent à établir.          |

**Règle absolue déjà écrite dans les fichiers sources** : *en cas de conflit,
c'est toujours l'acte qui fait foi*. Un `memoire` ne renverse jamais un `acte`.

Trois niveaux de preuve étaient utilisés dans les GEDCOM d'origine mais
**n'existent pas dans l'énumération de la base** : `[MYHERITAGE]` et
`[FAMILYSEARCH]` (arbres tiers, à considérer comme `hypothese`) et les
composites du type `[INSEE + MEMOIRE]` (à représenter par plusieurs entrées
dans le tableau `niveaux_preuve` de la personne). Le générateur SQL sait déjà
lire ces marqueurs — ne les redoublez pas à la main.

---

## 3. Ce qui manque, ordonné par priorité

Cette section ne recopie **pas** la liste des chantiers : elle vit dans les
documents `data/research/*.md`, tenus à jour par le propriétaire. Le tour
d'horizon complet est dans :

- **`data/research/04-pistes-recherche.md`** — l'inventaire de toutes les
  démarches en cours, par branche, avec statut (`fait`, `en_route`, `pret`,
  `a_faire`, `bloque`) et priorité (`P1` / `P2` / `P3`). C'est le premier
  document à ouvrir avant d'écrire à une mairie ou à un diocèse.
- **`data/research/09-actes-livrets.md`** — le dernier dépouillement d'actes
  et de livrets de famille. Les faits qui y figurent sous `[ACTE]` sont
  prouvés ; ceux sous `[DOUTE]` restent à trancher ; ceux sous `[FICHE]`
  n'engagent que la note manuscrite dont ils proviennent.
- **`data/research/07-analyse-fusion.md`** — pourquoi le schéma est ce qu'il
  est, quels pièges d'homonymie ont été anticipés, et pourquoi il ne faut
  **jamais** dédoublonner automatiquement.

Quelques exemples marquants pour donner la couleur, sans nommer personne de
vivant :

- **La mère d'une aïeule oranaise née en 1911.** L'acte de naissance de La
  Sénia, année 1911 n° 94, mentionne le père (33 ans, journalier) et
  s'interrompt à la ligne « mère de l'enfant » : **le champ n'est pas
  renseigné sur l'acte**. Ce n'est pas une lacune de lecture, c'est un
  silence du registre. Ne pas remplir cette case par hypothèse.
- **Deux blocages de génération sur la branche paternelle française.** La
  branche CHEREAU s'arrête à un grand-père né en 1936 dans la Sarthe : ses
  parents sont inconnus, deux candidats père sont sur la table (voir
  `CHE-03` et `CHE-04` dans `04-pistes-recherche.md`), aucun n'est prouvé.
  La branche BONDURAND s'arrête à une grand-mère née en 1939 à Brest : un
  candidat père unique repéré par élimination géographique, non prouvé
  (`BON-01`).
- **Un individu présumé mort mais absent du fichier INSEE.** Six requêtes
  négatives sur toutes les orthographes plausibles du nom et du prénom : ce
  n'est **pas** un oubli de recherche, c'est un fait établi qu'il faut
  reporter tel quel dans les notes. Trois hypothèses restent ouvertes (mort
  à l'étranger, mort en France avant 1970, décès jamais transcrit) et
  aucune n'est écartée. La règle : ne pas conclure au décès faute de trace.
- **Divergences de prénoms à trancher par acte.** Une aïeule née le
  13 décembre 1914 dans le Morbihan apparaît sous trois graphies dans les
  sources familiales : *Marie Louise Joséphine*, *Marie Léonie Joséphine*
  et *Thérèse*. Le seul arbitre possible est son acte de naissance, à
  demander à la commune. Tant qu'il n'est pas lu, garder la graphie la plus
  ancienne attestée et signaler la divergence en note.

Les autres pistes ouvertes (branches SEGURA, BATALLER, SALMERÓN, TORRES en
Espagne ; branches SUIRE, VALLÉE, CHATAIGNIER, CARO, SERAZIN en France ;
chantiers ANOM, CDHA, GRFDA) sont détaillées dans
`04-pistes-recherche.md`. Chacune y porte un identifiant stable
(`CHE-01`, `SEG-04`, `BAT-02`…) que l'on peut citer dans les notes.

---

## 4. Comment verser une nouvelle pièce

Trois cas, trois voies. **Ne pas mélanger.**

### Cas a — Enrichir un fichier GEDCOM

C'est le cas le plus fréquent, et le seul qui fasse entrer proprement
plusieurs personnes à la fois. Les GEDCOM sont **hors du dépôt** : leurs
chemins sont déclarés dans `scripts/sources.config.mjs`.

**Marche à suivre :**

1. Éditez le fichier `.ged` concerné (le côté paternel ou le côté maternel)
   avec l'outil que vous préférez. Respectez la convention GEDCOM 5.5.1,
   encodage UTF-8.
2. Placez les marqueurs de preuve en tête des `NOTE` : `[ACTE]`, `[ANOM]`,
   `[INSEE]`, `[MEMOIRE]`, `[A TROUVER]`. Ils sont relus automatiquement
   à l'import et alimentent le champ `niveaux_preuve` de la personne.
3. Depuis la racine du projet :
   ```bash
   npm run arbre:maj
   ```
   Ce script enchaîne la fusion des deux GEDCOM et la génération du SQL,
   puis affiche **ce qui a changé depuis le dernier passage** : combien de
   personnes sont nouvelles, lesquelles, quelles fiches ont été corrigées,
   quelles anciennes fiches ont disparu du fichier source. Un extrait :
   ```
   === DEPUIS LE DERNIER PASSAGE ===
     3 nouvelles, 1 corrigée, 0 disparues

     NOUVELLES :
       · François Pierre Marie CARO (1911)
       · Marie Léonie Joséphine SERAZIN (1914)
       · Léone Marie Thérèse CHATAIGNIER (1901)

     CORRIGÉES :
       · Marie Thérèse CARO (1936) → Marie-Thérèse Françoise CARO (1936)
   ```
4. **Relisez ce compte rendu.** Si une personne « disparue » vous surprend,
   c'est probablement qu'un identifiant GEDCOM a changé — la ligne reste
   en base, mais elle ne sera plus mise à jour tant que l'ancien
   `code_gedcom` n'aura pas été remis. À vérifier avant d'aller plus loin.
5. Exécutez les blocs de `data/sql/` **dans l'ordre de leur numérotation**
   (les événements dépendent des personnes et des lieux, les filiations
   des unions). Chaque bloc porte sa clause `on conflict do nothing` : il
   est rejouable et **n'efface rien**. Passez d'un tenant `01-lieux.sql`,
   puis `02-personnes.sql`, puis `03-unions.sql`, `04-filiations.sql`,
   `05-evenements.sql`, `06-sources.sql`.

**Ce que l'import ne touche jamais** : les souvenirs, photos, commentaires
et fiches de recherche déposés par la famille depuis l'application. Ils
survivent à tous les réimports.

### Cas b — Ajouter une personne isolée, corriger un détail

C'est le cas des petites corrections faites entre deux campagnes de
dépouillement : une personne qui manque, une date à préciser, un lien de
filiation oublié. **Ne touchez pas au GEDCOM pour ça.** Utilisez le
formulaire de l'application :

```
/personne/nouvelle
```

L'interface applique les mêmes garde-fous que tout le monde (RLS, validation
côté serveur par zod, journal d'audit). Vous êtes traité comme un
contributeur ordinaire, et vos ajouts sont réversibles depuis l'admin.

Cette voie est aussi la bonne pour un membre de la famille qui n'a pas envie
d'apprendre GEDCOM.

### Cas c — Verser un acte réellement lu (transcription, cote, dépôt)

C'est le cas noble : vous avez la pièce sous les yeux, avec sa cote et son
numéro, et vous voulez que la base porte cette preuve. **SQL direct**, en
respectant deux règles :

- Le `niveau_preuve` est `acte` (état civil français), `anom` (Algérie
  française numérisée sur ANOM) ou une combinaison — un événement peut
  porter les deux si l'acte a été lu à la fois sur ANOM et en original.
- Chaque instruction résout sa personne par son `code_gedcom` (préfixé par
  branche, voir §5) et son lieu par le libellé, puis porte
  `on conflict (personne_id, union_id, type, date_texte, lieu_id, detail)
  do nothing` pour rester rejouable.

Le patron à recopier est dans **`data/sql-actes/02-evenements.sql`**. Pour
la structure exacte des tables, les énums autorisés et les patrons de
requêtes courantes, `docs/DONNEES.md` fait référence. Un exemple minimal,
à adapter :

```sql
insert into arbre.evenements (
  personne_id, type, date_texte, annee, mois, jour,
  qualificatif, precision_date, lieu_id, niveau_preuve, notes
)
select p.id,
       $t$naissance$t$::arbre.type_evenement,
       $t$7 OCT 1907$t$, 1907, 10, 7,
       $t$exacte$t$::arbre.qualificatif_date,
       $t$jour$t$::arbre.precision_date,
       (select id from arbre.lieux
        where lower(libelle) = lower($t$Oran, Departement d'Oran, Algerie$t$)),
       $t$acte$t$::arbre.niveau_preuve,
       $t$A six heures du matin. Acte d'Oran, annee 1907 n° 2366.$t$
from arbre.personnes p
where p.code_gedcom = $t$acte:SEGURA_PIERRE$t$
on conflict (personne_id, union_id, type, date_texte, lieu_id, detail) do nothing;
```

Les délimiteurs `$t$` évitent d'avoir à échapper les apostrophes des
transcriptions. Le préfixe `acte:` sur le `code_gedcom` distingue les
personnes créées directement par lecture d'acte (sans passer par un GEDCOM)
des personnes issues des GEDCOM (préfixées `chereau:` ou `suire:`).

Pour la source elle-même — la transcription littérale d'un acte lu — même
patron, table `arbre.sources` :

```sql
insert into arbre.sources (personne_id, texte, page, niveau_preuve)
select p.id,
       $t$Transcription integrale, La Senia, deces n° 19 du 12 septembre 1894.
L'an mil huit cent quatre-vingt-quatorze, le douze septembre a huit heures
du matin, par-devant Nous, Long Joseph, Maire de la commune de La Senia (...)$t$,
       $t$La Senia, deces n° 19, 12 septembre 1894$t$,
       $t$acte$t$::arbre.niveau_preuve
from arbre.personnes p
where p.code_gedcom = $t$acte:TORRES_FRANCISCO$t$
on conflict (personne_id, union_id, evenement_id, texte, page) do nothing;
```

Rangez vos nouveaux blocs dans `data/sql-actes/`, numérotés à la suite des
existants. Ils y sont exécutables à la main, dans l'ordre. Ce dossier
n'est pas régénéré par `arbre:maj` — c'est de la **rédaction manuelle
autoritative** qui vit sa vie propre.

---

## 5. Les règles à ne jamais enfreindre

Elles sont écrites dans `CONVENTIONS.md`. Les cinq qui font la différence
au quotidien :

1. **JAMAIS de nom, date, lieu, ni photo réelle dans le code du dépôt.** Ce
   dépôt est public. Les données familiales vivent uniquement en base
   Supabase (privée) et dans les GEDCOM (hors dépôt, exclus par
   `.gitignore`). Un nom en dur dans un composant, une date de naissance
   dans un test, une photo dans `public/` : c'est une fuite.

2. **JAMAIS de suppression en masse sans instruction explicite du
   propriétaire.** En particulier, jamais de
   `delete from arbre.evenements`, `delete from arbre.sources`,
   `delete from arbre.filiations` sans filtre étroit et sans confirmation
   écrite. Le garde-fou de sécurité a déjà bloqué deux fois de telles
   commandes, avec raison. Une correction se fait par `update` ciblée, ou
   en réimportant après avoir corrigé la source — l'import est **rejouable
   et n'efface rien** justement pour éviter ces tentations.

3. **Les identifiants GEDCOM sont préfixés par branche.** `chereau:I1`,
   `suire:I2`, `acte:SEGURA_PIERRE`. Ne jamais mélanger : les fichiers
   d'origine ont des collisions massives d'identifiants (44 individus et
   12 familles portent les mêmes numéros dans les deux GEDCOM), et le
   préfixe est la seule chose qui empêche de fondre par erreur deux
   personnes distinctes. Un nouveau fichier GEDCOM doit **d'abord** être
   déclaré dans `scripts/sources.config.mjs` avec son propre préfixe de
   `branche` ; sans cette déclaration, `arbre:maj` refuse de le lire.

4. **Les personnes vivantes sont protégées.** Le champ `presume_vivant`
   est calculé automatiquement à l'import (pas de décès connu, née il y a
   moins de 110 ans). Ne le forcez pas à `false` pour « débloquer »
   l'affichage : le masquage est voulu. Une personne vivante identifiée
   comme telle **ne quitte pas la famille** — pas de nom complet, pas
   d'année de naissance exacte, pas d'adresse dans les vues publiques.
   Léo, mineur, relève du régime le plus strict : rien ne s'affiche
   sinon son prénom et son lien de parenté.

5. **Aucune dépendance npm ajoutée sans nécessité absolue.** La pile est
   volontairement mince : Next.js, React, Tailwind, Supabase, d3, zod.
   Toute cartographie se dessine en SVG à la main. Toute nouvelle brique
   se justifie d'abord, s'installe ensuite.

Deux règles de méthode qui découlent des précédentes :

- **`data/`, `*.ged`, actes, photos** : tout est dans `.gitignore`.
  Ne jamais forcer l'ajout d'un fichier ignoré (`git add -f`) sans
  savoir précisément ce qu'il contient.
- **Ne jamais lancer `npm run build`** : plusieurs modules sont écrits
  en parallèle dans ce dépôt, un build échouerait sur du code inachevé
  qui n'est pas le vôtre. Vérifiez votre travail avec `npx tsc --noEmit`.

---

## 6. Contact

Le propriétaire du projet est **David CHEREAU** — il figure déjà dans
la base, à la racine de l'ascendance paternelle. C'est lui qui
administre l'application, valide les inscriptions et arbitre les
décisions éditoriales.

Toute passation, tout doute, toute question qui n'a pas sa réponse dans
`CONVENTIONS.md`, `MISE-EN-SERVICE.md` ou les documents
`data/research/*.md` : lui poser la question, ne pas décider seul.
