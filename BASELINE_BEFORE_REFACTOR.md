# Baseline avant fiabilisation

**Date :** 7 août 2026
**Branche :** `audit-fixes`
**Référence de départ :** `84c3313a64aedce356166c3b85963aaaea801229`
**Périmètre :** dépôt `arbre-leo`, production Vercel lue sans authentification et schéma Supabase `arbre` lu sans modification.

## Sécurité Git

L’état initial comportait trois fichiers non suivis :

- `AUDIT_GENEALOGIE_MASTER.md` — produit par l’audit précédent ;
- `docs/emails-supabase.md` et `magic-link-email.html` — travaux locaux préexistants, hors périmètre.

Aucun de ces fichiers n’a été supprimé, déplacé ou écrasé. La branche dédiée `audit-fixes` a été créée avant ce lot.

## Routes et fonctions observées

| Surface | Accès observé | Fonction |
| --- | --- | --- |
| `/`, `/connexion`, `/inscription`, `/attente`, `/erreur` | Public | Accueil, connexion, demande d’accès et états d’attente/erreur. |
| `/arbre`, `/arbre/imprimer` | Membre validé | Arbre interactif et impression. |
| `/personne/*` | Membre validé | Fiche, modification, création, photos, actes et impression d’une personne. |
| `/chronologie`, `/carte`, `/aujourdhui`, `/statistiques`, `/parente` | Membre validé | Vues temporelle, géographique, éphémérides, statistiques et parenté. |
| `/archives`, `/souvenirs/*`, `/recits/*`, `/histoire/*`, `/recherches`, `/nouveautes` | Membre validé | Archives, souvenirs, récits, contexte historique, recherches et activité. |
| `/notifications` | Membre validé | Notifications et préférences de rappels. |
| `/export`, `/export/csv`, `/export/gedcom`, `/export/json` | Membre validé | Exports familiaux. |
| `/admin` | Administrateur | Administration. |
| `/auth/callback`, `/api/arbre/photos`, `/api/cron/rappels-anniversaires` | Route serveur | Retour d’authentification, photo et cron protégé par `CRON_SECRET`. |

Cette liste provient des routes réellement présentes sous `src/app`. Les pages privées sont encadrées par `src/proxy.ts` et par les politiques RLS ; les contrôles côté serveur restent l’autorité d’accès.

## Baseline fonctionnelle et visuelle

La production `https://arbre.modulyx.eu` a été consultée sans session :

| Vérification | Résultat |
| --- | --- |
| `/connexion` à 390 px | PASS — titre, champ e-mail et bouton de connexion visibles. |
| `/connexion` à 768 px | PASS — même parcours visible. |
| `/connexion` à 1440 px | PASS — même parcours visible. |
| `/arbre` sans session | PASS — redirection vers `/connexion?suite=%2Farbre`. |
| Arbre, fiches, archives, formulaires et administration authentifiés | Non exécuté — aucune session de test validée n’a été utilisée, afin de ne pas exposer ni modifier de données familiales. |

## Baseline technique

| Commande / contrôle | Résultat | Observation |
| --- | --- | --- |
| `npm ci` | PASS | Installation conforme au lockfile, 448 paquets audités, aucune vulnérabilité signalée. |
| `npm run typecheck` | PASS | `next typegen` et `tsc --noEmit` terminent sans erreur après l’installation. |
| `npm run lint` | WARNING | L’environnement local ne matérialise plus `node_modules/eslint/bin/eslint.js` après l’installation ; il ne s’agit pas d’une erreur de lint démontrée. |
| `npm run arbre:verifier` | WARNING | Les six contrôles sans dépendance externe passent. Les huit contrôles lancés via `npx tsx` échouent dans ce même environnement local dégradé. |
| `npm run test:e2e` | WARNING | Le binaire local `@playwright/test` est absent après l’installation locale ; aucun scénario E2E n’a pu démarrer. |
| `npm run build` | Non exécuté | Interdit par `CONVENTIONS.md` dans cet espace partagé ; la CI est le lieu prévu pour ce contrôle complet. |

Le dépôt contient déjà deux workflows GitHub Actions sous Node 22 :

- `.github/workflows/ci.yml` : `npm ci`, types, lint, build puis E2E mobile ;
- `.github/workflows/arbre.yml` : `npm ci`, types, garde-fous arbre et build.

La panne locale de matérialisation des paquets doit être résolue dans l’environnement de développement, mais elle ne permet pas de conclure à une régression du dépôt : le typecheck a bien passé et la CI possède les contrôles attendus.

## Base de données et données généalogiques

La vérification lecture seule de `arbre.rappels_envoyes` donne :

- RLS activée ;
- aucune policy client ;
- aucun droit pour `anon` ni `authenticated` ;
- seuls `SELECT` et `INSERT` sont accordés à `service_role`.

La migration `0022_rappels_anniversaires.sql` exprime précisément ce modèle et le cron utilise `creerClientService()`. Il s’agit d’une table interne de déduplication, non d’une table à rendre accessible aux membres.

Aucune donnée, règle RLS, migration, variable d’environnement ou stockage n’a été modifié pendant cette baseline.

## Limites connues de la baseline

- Aucun build local n’a été lancé conformément aux conventions du projet.
- Les parcours authentifiés, les écritures, les uploads et le cron n’ont pas été exécutés contre la production.
- Les contrôles lint, E2E et géométriques devront être rejoués dans une installation Node 22 où les dépendances restent effectivement présentes ; leur échec local actuel est documenté, non masqué.
