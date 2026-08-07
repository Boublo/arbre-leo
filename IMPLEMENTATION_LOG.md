# Journal d’exécution

## Lot BASELINE-001 — 7 août 2026

| Champ | Détail |
| --- | --- |
| IDs audit | `SEC-001`, `TEST-001` |
| Problème | Deux alertes P0 de l’audit devaient être confirmées avant toute correction : dépendance de test absente localement et table RLS sans policy. |
| Cause vérifiée | La CI installe déjà le lockfile et exécute les vérifications sous Node 22. La table `rappels_envoyes` est explicitement réservée au service serveur par migration et par privilèges réels. |
| Fichiers modifiés | `BASELINE_BEFORE_REFACTOR.md`, `FIX_PLAN.md`, `IMPLEMENTATION_LOG.md`. |
| Correction | Aucune modification applicative ou base de données n’est justifiée : classification des deux P0, baseline complète et contrat RLS consignés. |
| Tests | Production publique : connexion vérifiée à 390, 768 et 1440 px ; `/arbre` redirige sans session. `npm ci` et `npm run typecheck` passent. Lint, E2E et huit garde-fous `tsx` sont bloqués par la matérialisation incomplète de `node_modules` sur cette machine. |
| Résultat | Stable. `SEC-001` est documenté comme intentionnel ; `TEST-001` est rejeté comme constat local obsolète vis-à-vis du dépôt actuel. |
| Impact | Aucun changement de données, de droits, de routes, de composants, de dépendances ou de comportement utilisateur. |
| Risque résiduel | Les contrôles qui dépendent des paquets non matérialisés doivent être rejoués dans Node 22 / GitHub Actions avant un lot de code. |
| Rollback | Supprimer les trois documents de ce lot ; aucun état applicatif ou distant n’est à restaurer. |
| Commit | `docs: établir la baseline de fiabilisation` (commit local du lot ; hash disponible dans l’historique Git). |
