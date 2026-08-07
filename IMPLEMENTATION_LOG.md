# Journal d’exécution

## Lot OPS-DATA-001 — 7 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Démarrage de la phase de fiabilité : protocole de restauration isolée et contrat de rapport de qualité. |
| Fichiers | `docs/RUNBOOK_SAUVEGARDE_RESTAURATION.md`, `docs/CONTRAT_RAPPORT_QUALITE.md`, `ROADMAP_MAITRESSE_A_VALIDER.md`, `IMPLEMENTATION_LOG.md`. |
| Vérifications | Contrôles existants relus dans `src/lib/coherence.ts`, `scripts/diagnostic.mjs` et l’administration ; ils sont déterministes et en lecture seule. |
| Décision | Pas d’exercice sur la production, pas de données réelles dans Git, pas de correction automatique. Les règles de filiation orpheline et cycle sont ajoutées au contrat comme prérequis du moteur d’ajout. |
| Suite | Faire valider les documents, créer une cible de test isolée, exécuter l’exercice de restauration et couvrir le contrat par un jeu de données fictif. |
| Impact | Documentation uniquement ; aucune base, règle RLS, migration, dépendance, route ou donnée familiale n’est modifiée. |
| Vérification Supabase | Projet principal actif. La branche isolée existante `e2e` est sans données, sans table `arbre` et en état `MIGRATIONS_FAILED` : aucun exercice n’y a été lancé. Une branche neuve sans données est préférable ; sa création est soumise à la confirmation de coût Supabase. |
| Test synthétique | Ajout de `scripts/test-rapport-qualite.ts` : décès avant naissance, enfant avant parent, écart d’âge, isolement et doublon potentiel. Le jeu est entièrement fictif et vérifie l’absence de fusion automatique. |
| Limite locale | L’exécution du nouveau script attend l’environnement CI / Node 22 : le binaire local `node_modules/.bin/tsx.cmd` est absent. Les contrôles TypeScript et lint restent validés localement. |
| Garde-fous de graphe | `QLT-009` (filiation vers une union absente) et `QLT-010` (cycle parent-enfant) sont désormais détectés par `src/lib/coherence.ts`, affichés dans l’administration et couverts par le jeu fictif. |
| Vérifications | `npm run typecheck` et `npm run lint` passent après ce lot ; le script fictif reste à exécuter dans le CI doté de `tsx`. |
| Résumé partageable | `resumerQualite` produit un état sans identité familiale : comptes, couverture naissance / preuve forte, occurrences par règle et statut. L’administration affiche le compteur de preuves fortes. |
| Relance de recherche | `QLT-007` réemploie le seuil commun de 60 jours, remonte les demandes sans réponse dans l’administration et renvoie vers `/recherches`. Aucun chantier n’est modifié automatiquement. |
| Faits historiques | `QLT-006` remonte dans l’administration un rattachement antérieur à la naissance ou postérieur de plus de cinq ans au décès. Les dates et rattachements sont uniquement lus. |
| Exploration de fiche | `UX-003` ajoute une porte « À explorer maintenant » : elle choisit de façon déterministe l’album, les souvenirs, les repères de vie ou la parenté déjà présents, via les onglets existants. |
| Recherche globale | `UX-002` ajoute `/recherche`, alimentée par l’index léger déjà filtré côté serveur par RLS. La page n’expose ni notes, ni sources, ni médias, ni fiches invisibles. |
| Récit par génération | `EXP-002` ajoute `/histoire/famille` : depuis une personne choisie, les ascendants connus sont groupés par génération et renvoient vers leurs fiches. Les lacunes restent explicitement affichées. |

+## Lot ROADMAP-001 — 7 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Consolidation des audits de fiabilité, vision immersive, UX/UI, ajout intelligent et copilote conversationnel dans une feuille de route unique à valider. |
| Fichier | `ROADMAP_MAITRESSE_A_VALIDER.md`. |
| Décision | Inférence déterministe et validation humaine avant IA, OCR, migration ou écriture automatique ; premier prototype limité à l’ajout d’un frère ou d’une sœur. |
| Vérifications | Modèle et workflow existants relus : personnes, unions, filiations, événements, sources, rattachements et validations serveur. Aucun accès ou changement de données familiales. |
| Impact | Documentation uniquement ; aucune route, action, base, permission, dépendance ou donnée n’est modifiée. |
| Reprise | Le document inclut les prérequis, les fichiers protégés, l’ordre de lecture, les contrôles, le rollback et les décisions restantes. |

## Lot EXP-UX-001 — 7 août 2026

| Champ | Détail |
| --- | --- |
| ID audit | `EXP-UX-001` — photo détaillée, plein écran accessible. |
| Problème | La photo s’affichait sur sa page détaillée sans action plein écran explicite, alors que la visionneuse est disponible dans l’album et l’arbre. |
| Cause vérifiée | `VisionneusePhoto` était réutilisée par les vues de collection, mais pas par la route de détail `/personne/[id]/photo/[mediaId]`. |
| Fichiers modifiés | `UX_UI_INTERACTION_AUDIT.md`, `UX_NAVIGATION_MAP.md`, `src/components/photos/photo-detail-plein-ecran.tsx`, `src/app/personne/[id]/photo/[mediaId]/page.tsx`, `IMPLEMENTATION_LOG.md`. |
| Correction | Clic sur l’image et bouton visible « Agrandir la photo » ouvrent la visionneuse existante ; zoom, pincement, déplacement, Échap et fermeture restent disponibles. |
| Tests | TypeScript, lint et contrôle des différences avant commit. La page publique de connexion ne déborde pas horizontalement à 390, 430, 768, 1024, 1440 et 1920 px ; le rendu connecté aux mêmes largeurs doit encore être confirmé avec une session membre de démonstration. |
| Impact | Aucune écriture, requête supplémentaire, nouvelle URL signée, migration ou modification de permission. |
| Rollback | Supprimer le composant et rétablir l’image directe ; aucune donnée persistante à restaurer. |

## Lot EXP-001 — 7 août 2026

| Champ | Détail |
| --- | --- |
| ID roadmap | `EXP-001` — relation avec moi sur la fiche personne. |
| Problème | Les visiteurs devaient déduire seuls le lien entre leur propre fiche et une personne consultée. |
| Cause vérifiée | Le moteur `calculerParente` et le rattachement facultatif `membres.personne_id` existaient, mais ils n’étaient pas composés sur la fiche. |
| Fichiers modifiés | `src/app/personne/[id]/page.tsx`, `src/components/personne/lien-avec-moi.tsx`, `IMMERSIVE_ROADMAP.md`, `IMPLEMENTATION_LOG.md`. |
| Correction | Calcul serveur non persistant, limité au membre validé et aux personnes déjà visibles dans son graphe ; affichage absent sans lien établi. |
| Tests | `npm run typecheck` et `npm run lint` passent après le patch ; aucun test ne lit ni ne modifie de données de production. |
| Impact | Une information dérivée, sans nouvelle requête de média, migration, écriture ou élargissement de permission. |
| Risques | Le vocabulaire du moteur de parenté doit conserver ses tests synthétiques avant extension aux liens par alliance. |
| Rollback | Retirer le composant et son appel dans la fiche ; aucune donnée persistante à restaurer. |

## Lot VISION-001 — 7 août 2026

| Champ | Détail |
| --- | --- |
| IDs audit | Vision phase 3 ; dépendances `OPS-001`, `DATA-001`, `ENV-001`. |
| Problème | Les capacités existantes étaient riches mais dispersées ; le nouveau parcours ne devait ni dupliquer les données ni devancer les preuves. |
| Cause vérifiée | Le dépôt contient déjà accueil, arbre, fiche, chronologie, carte, archives, recherches, récits, contexte historique et moteur de parenté. Le modèle porte aussi les sources, niveaux de preuve, dates partielles, lieux et journal. |
| Fichiers modifiés | `IMMERSIVE_GENEALOGY_VISION.md`, `IMMERSIVE_ROADMAP.md`, `IMPLEMENTATION_LOG.md`. |
| Correction | Architecture de lecture dérivée, contrat de vérité et feuille de route priorisée ; conception détaillée de `EXP-001` sans code applicatif. |
| Tests | Lecture du code, migrations et schéma Supabase en lecture seule ; aucune donnée familiale lue ni modifiée. |
| Résultat | Stable. Le premier lot applicatif reste `EXP-001`, à réaliser après rétablissement d’un environnement de tests reproductible. |
| Impact | Aucun changement de données, permissions, routes ou interface. |
| Risques | L’implémentation ne doit pas débuter avec une formulation de parenté non testée ou une nouvelle navigation qui dupliquerait les vues existantes. |
| Rollback | Supprimer les documents de vision ; aucun état distant n’est à restaurer. |

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
