# Plan de correction contrôlé

**Référence :** `84c3313a64aedce356166c3b85963aaaea801229`
**Règle :** une recommandation de l’audit ne devient une correction qu’après vérification dans le dépôt et, si nécessaire, en production.

| ID | Priorité | Problème vérifié | Fichiers / surface | Risque | Correction minimale | Tests / preuve | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | P0 | `arbre.rappels_envoyes` possède RLS sans policy. La migration retire volontairement les droits client et réserve `SELECT`/`INSERT` à `service_role` ; le cron emploie ce rôle serveur. | `supabase/migrations/0022_rappels_anniversaires.sql`, cron, Supabase | Faible si ce contrat reste inchangé ; élevé si une page cliente lit la table à l’avenir. | Ne pas ajouter de policy. Consigner le contrat et prévoir un test d’intégration cron/RLS avant toute évolution. | Lecture des privilèges réels Supabase et lecture du code du cron. | DONE |
| TEST-001 | P0 | L’audit signalait Playwright absent de l’installation locale. Le lockfile le déclare et la CI sous Node 22 exécute déjà `npm ci`, types, lint, build et E2E. | `package.json`, `.github/workflows/ci.yml` | Moyen pour un poste local mal installé, pas un défaut P0 du dépôt démontré. | Aucune modification de code. Réparer l’environnement local séparément et s’appuyer sur la CI comme contrôle bloquant. | `npm ci` et typecheck local ; lecture des workflows. | REJECTED |
| ENV-001 | P1 | Après `npm ci`, cette machine Windows ne conserve pas les contenus des paquets ESLint et Playwright ; lint, E2E et les contrôles `npx tsx` ne peuvent pas démarrer. | Environnement local, non versionné | Moyen : vérification locale incomplète. | Rejouer dans un poste Node 22 propre ou dans GitHub Actions ; ne pas modifier les scripts ni les dépendances pour contourner l’environnement. | Résultats consignés dans la baseline. | BLOCKED |
| OPS-001 | P1 | Le dépôt versionne le schéma mais ne fournit pas encore un exercice de restauration documenté et vérifié. | Documentation d’exploitation à créer | Élevé à long terme. | Prochain lot : définir un runbook minimal de sauvegarde/restauration sans changer le schéma. | Relecture, exercice sur environnement isolé, sans données de production. | TODO |
| DATA-001 | P1 | Les contrôles de cohérence existent, mais pas encore comme rapport de qualité versionné avec seuils. | `src/lib/coherence.ts`, scripts de diagnostic | Moyen. | Prochain lot : inventorier les règles existantes et écrire un contrat de rapport, sans correction automatique. | Jeux de données synthétiques et diagnostic. | TODO |
| SEC-002 | P1 | La CSP contient `unsafe-inline` et `unsafe-eval`. | `next.config.ts` | Moyen ; retrait sans mesure peut casser Next ou le thème. | Mesurer les besoins sur préproduction avant toute réduction ; aucun changement dans ce lot. | Build, E2E et vérification CSP sur préproduction. | TODO |
| PERF-001 | P1 | Le graphe complet est chargé et les portraits peuvent être signés à grande échelle. | `src/lib/arbre.ts` | Croissant avec la taille de l’arbre. | Mesurer d’abord le budget réel ; fichier protégé par conventions. | Mesures sur données synthétiques. | TODO |

## Ordre retenu

1. **Lot BASELINE-001, terminé :** établir les preuves de départ et trier les P0 sans toucher au code métier.
2. **Lot OPS-001 :** documenter une sauvegarde et une restauration vérifiables.
3. **Lot DATA-001 :** transformer les contrôles existants en contrat de qualité non destructif.
4. **Lot SEC-002 / PERF-001 :** seulement après mesures reproductibles et environnement de test stable.

Les éléments `ENV-001`, `OPS-001`, `DATA-001`, `SEC-002` et `PERF-001` ne sont pas commencés dans ce lot.
