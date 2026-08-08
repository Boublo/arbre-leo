# Journal d’exécution

## Lot MAP-CONTEXT-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Rendre utile le lien « Voir sur la carte » d’une fiche personne. |
| Correction | `/carte?personne=…` limite les points, compteurs, déplacements et flux aux événements où la personne est explicitement présente. Un bandeau nomme le parcours et offre un retour vers la carte complète. Aucun lieu n’est choisi arbitrairement. |
| Données | Le filtre est dérivé uniquement des données cartographiques déjà chargées sous RLS ; ni requête, ni écriture, ni permission supplémentaire. |
| Vérifications | `npm.cmd run typecheck`, `npm.cmd run lint` et contrôle des différences passent. |
| Rollback | Retirer `personneInitiale` de `EcranCarte` et l’analyse du paramètre `personne` dans la route carte. |

## Lot UX-MEDIA-002 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Conserver le contexte de lecture d’un album et rendre les repères vérifiés d’une photo directement explorables. |
| Commits | `ab46e82` (navigation par période), `557ceb5` (personnes et lieu liés). |
| Correction | Une vignette transmet l’année de son album ; précédent/suivant reste dans cette période et le retour active l’onglet Album. La fiche photo expose les personnes explicitement rattachées au média et son lieu, sans déduction ni écriture. |
| Conditions | Le lieu n’est un lien que lorsqu’il possède des coordonnées ; les personnes absentes des résultats RLS ne sont pas affichées. |
| Vérifications | `npm.cmd run typecheck`, `npm.cmd run lint` et contrôle des différences passent. Aucun test authentifié, écriture, migration, permission ou URL signée supplémentaire. |
| Rollback | Retirer le contexte des URL de vignette, le bloc de navigation et le bloc de repères ; aucune donnée persistante à restaurer. |

## Lot MAP-LINKS-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Rendre effectifs les liens existants vers un lieu de la carte. |
| Commit | `ed3e769`. |
| Correction | La route `/carte?lieu=…` valide que le lieu fait partie des points situés, puis ouvre son panneau au chargement. Une navigation interne vers un autre lien profond remonte proprement le composant. |
| Vérifications | `npm.cmd run typecheck`, `npm.cmd run lint` et contrôle des différences passent. |
| Rollback | Retirer le paramètre `lieuInitialId` de `EcranCarte` et le passage de paramètre depuis la route carte. |

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
| Voyage dans le temps | `EXP-003` relie « Notre histoire » à la chronologie de lignée existante, avec une période calculée uniquement depuis les années connues. Aucun événement n’est déduit. |
| Ajout guidé | `ADD-001` ajoute depuis une fiche le raccourci « Ajouter un frère ou une sœur ». Seuls les parents dont le rôle est connu sont préremplis ; le formulaire et la validation serveur restent inchangés. |
| Ajout guidé étendu | `ADD-002` propose aussi « Ajouter son conjoint ou sa conjointe » depuis la fiche. L’identifiant est seulement prérempli dans le formulaire existant, qui conserve ses validations serveur. |
| Parents sans lien connu | `ADD-002` propose « Ajouter son père » et « Ajouter sa mère » seulement si la fiche n’a aucun parent. L’enfant et le sexe sont préremplis ; une filiation déjà présente n’est jamais déplacée automatiquement. |
| Homonymes avant création | `ADD-001` signale jusqu’à cinq personnes dont le nom correspond à la saisie. Chaque piste affiche son repère de vie et ouvre la fiche existante ; aucun doublon n’est fusionné ou bloqué automatiquement. |
| Aperçu du raccourci | `ADD-001` affiche avant le formulaire le parent, le conjoint ou l’enfant proposé par le raccourci suivi. Il s’agit d’une information modifiable : le formulaire et les validations serveur restent la source de vérité. |
| Filiation à compléter | `ADD-002` affiche, lorsqu’un seul parent est connu, un raccourci vers le formulaire de rattachement. Il ne propose que de relier une personne déjà dans l’arbre et ne déplace aucune filiation automatiquement. |
| Choix du foyer | `ADD-002` liste les foyers connus avant d’ajouter un enfant. Chaque raccourci transmet l’union exacte au formulaire ; une personne ayant plusieurs unions ne voit plus un conjoint choisi arbitrairement. |
| Homonymes et année | `ADD-001` remonte les homonymes dont l’année de naissance correspond à celle saisie et les signale comme tels. L’année est un indice de lecture, jamais un critère de fusion ou de refus. |
| Homonymes et lieu | `ADD-001` utilise aussi les mots du lieu de naissance pour classer les homonymes et signaler une commune proche. Ce signal reste une aide de lecture, jamais une preuve de l’identité. |

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

## Lot DATA-TRACE-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Distinguer les filiations établies des filiations candidates dans une fiche. |
| Correction | Chaque couple parental est conservé comme un groupe distinct. Les groupes marqués comme hypothèses sont affichés sous « Parents possibles » avec un avertissement explicite de confirmation par acte. |
| Signalement global | Toute fiche portant le niveau « Hypothèse » rappelle désormais que certaines informations attendent une confirmation par acte ou source équivalente. |

## Lot DATA-TRACE-002 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Cohérence des filiations reliées à un foyer déjà qualifié comme hypothèse. |
| Correction | Les filiations qui portaient encore le libellé ordinaire « naturelle » alors que leur union parentale était déjà une hypothèse sont explicitement qualifiées « Hypothèse de filiation — à confirmer par un acte ». |
| Vérification | Aucune filiation liée à une union hypothétique ne conserve désormais un libellé de filiation établie. |
| Impact | Données privées uniquement ; aucune information familiale n’est placée dans le dépôt public. |

## Lot DATA-TRACE-003 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Aligner les rattachements explicitement décrits comme hypothèses dans les notes de recherche. |
| Correction | Les seuls liens concernés sont maintenant affichés comme hypothèses à confirmer par un acte ; les filiations déjà documentées dans les registres restent inchangées. |
| Vérification | Aucun rattachement directement qualifié d’hypothétique par son foyer ne conserve un libellé de filiation établie. |
| Impact | Données privées uniquement ; le dépôt public ne contient aucun nom, date ni acte familial. |

## Lot RESEARCH-STATUS-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Synchroniser un chantier de recensement avec la consultation du portail d’archives officiel. |
| Correction | Le chantier est passé de « à faire » à « en cours » et conserve désormais la méthode vérifiée : listes nominatives consultables en ligne, classées par adresse et dépourvues d’index nominatif. |
| Garde-fou | Aucun lien de parenté n’est créé à partir de cette seule disponibilité d’archives ; seule la lecture du registre pourra confirmer ou réfuter une hypothèse. |
| Impact | État de recherche privé uniquement ; aucune donnée familiale n’est ajoutée au dépôt public. |

## Lot RESEARCH-STATUS-002 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Préserver le périmètre exact d’un dépouillement de recensement déjà entamé. |
| Correction | Le chantier privé enregistre désormais le volume du registre et le contrôle négatif des premières images, afin que la reprise continue au bon endroit. |
| Garde-fou | Un contrôle négatif partiel n’est jamais interprété comme une absence définitive ni comme une preuve de filiation. |
| Impact | Données de recherche privées uniquement ; aucune information familiale n’est ajoutée au dépôt public. |

## Lot PROOF-ALIGNMENT-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Requalifier une preuve familiale dont le contenu est un extrait d’acte d’état civil. |
| Correction | Les copies du même extrait, auparavant étiquetées « mémoire familiale », sont désormais classées « acte » et la fiche concernée reflète ce niveau de preuve. |
| Garde-fou | Seul le lien explicitement cité par l’extrait est confirmé ; les filiations concurrentes d’autres personnes restent des hypothèses jusqu’à lecture de leur propre acte. |
| Impact | Données privées uniquement ; aucune identité familiale n’est ajoutée au dépôt public. |

## Lot PROOF-ALIGNMENT-002 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Vérifier les sources explicitement décrites comme copies intégrales d’actes. |
| Correction | Les copies intégrales concernées, précédemment étiquetées « mémoire familiale », sont maintenant classées « acte » et leurs fiches reflètent ce niveau. |
| Garde-fou | Seules les sources qui attestent explicitement être des copies intégrales ont été requalifiées ; aucune relation familiale n’a été modifiée. |
| Impact | Données privées uniquement ; aucune identité familiale n’est ajoutée au dépôt public. |

## Lot ROADMAP-QUALITY-003 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Faire exécuter le rapport qualité fictif par la CI Node 22. |
| Correction | La vérification du rapport est ajoutée après les contrôles de style et avant la construction applicative. |
| Garde-fou | La CI ne reçoit que des variables factices ; le test ne charge aucune donnée familiale ni aucun accès Supabase réel. |
| Suite | Vérifier le premier passage distant après publication et conserver l’exercice de restauration isolé comme prérequis distinct. |

## Lot ROADMAP-OPS-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Vérifier si une cible Supabase isolée est déjà disponible pour l’exercice de restauration du runbook. |
| Constat | Une branche de test sans données de production existe, mais son dernier déploiement est en échec de migrations. Elle ne constitue pas une cible saine pour une restauration. |
| Garde-fou | Aucune réparation, réinitialisation, restauration ou copie de donnée familiale n’a été exécutée. Une cible approuvée par le propriétaire et une autorisation écrite restent requises. |
| Suite | Diagnostiquer l’échec sur un lot distinct, ou désigner une nouvelle cible isolée après validation du coût et du périmètre. |

## Lot ROADMAP-TEST-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Rendre explicite la portée des tests E2E et la préparation d’une session de démonstration sans donnée familiale. |
| Constat | Les fumées mobiles actuelles utilisent une configuration Supabase factice et contrôlent uniquement les écrans publics et redirections sans session. |
| Garde-fou | Les scénarios authentifiés, RLS, médias et écritures ne sont pas déclarés validés ; leur préparation exige une cible isolée saine et des comptes inventés. |
| Preuve | [Protocole de démonstration](docs/TESTS_DEMONSTRATION.md). |

## Lot ROADMAP-PERF-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Rendre reproductible la première mesure de performance avant toute optimisation du graphe. |
| Constat | Des gardes-fous statiques de chargement existent, mais aucun relevé chiffré de référence n’est encore consigné. |
| Garde-fou | Le protocole ne contient aucun seuil arbitraire ni donnée familiale ; les sorties potentiellement privées du diagnostic restent hors Git. |
| Preuve | [Protocole de baseline](docs/MESURE_PERFORMANCE.md). |

## Lot ROADMAP-TEST-002 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Rendre exécutable la suite de garde-fous de l’arbre sur le poste Windows courant. |
| Correction | Les tests TypeScript locaux et les vérificateurs qui les appellent passent par le lanceur `tsx` déclaré, compatible avec cet environnement. |
| Garde-fou | Seul le démarrage du test est ajusté : les assertions de géométrie, de qualité et de rappels restent inchangées. |
| Vérifications | Les 14 garde-fous de l’arbre, géométrie, éclaté, rappels, rapport qualité, typecheck et lint ont été rejoués avec succès. |

## Lot ROADMAP-CI-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Faire rejouer les garde-fous de l’arbre par le contrôle général Node 22. |
| Correction | Après le rapport qualité fictif, la CI exécute maintenant les 14 garde-fous de l’arbre avant la construction applicative. |
| Garde-fou | La CI conserve les variables Supabase factices ; elle ne reçoit aucune donnée ni identifiant familial. |
| Suite | Vérifier le premier passage distant après publication ; l’exécution locale est déjà verte. |

## Lot ROADMAP-GOV-002 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Auditer l’applicabilité du filtre de confidentialité au dépôt public entier. |
| Constat | Le filtre relève des données familiales dans des migrations historiques déjà versionnées, ainsi que des fixtures et documents qui demandent une analyse séparée. |
| Décision | Le branchement CI proposé est retiré : le rendre vert par exception générale aurait caché une fuite historique. Aucune migration ni historique Git n’a été modifié. |
| Suite | Appliquer le [plan de remédiation](docs/REMEDIATION_CONFIDENTIALITE.md) uniquement après validation explicite du propriétaire. |

## Lot ROADMAP-GOV-003 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Rendre le P0 de confidentialité impossible à manquer lors d’une reprise. |
| Correction | La passation et la matrice de décisions renvoient maintenant explicitement au plan P0 et à son exigence d’autorisation écrite. |
| Garde-fou | Aucun élément familial nouveau n’est recopié et aucune migration, révision Git ou donnée de production n’est modifiée. |

## Lot ROADMAP-GOV-004 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Empêcher de nouvelles données sensibles d’entrer dans les changements soumis à la CI. |
| Correction | Le filtre de confidentialité analyse maintenant les seules lignes ajoutées depuis la révision de base ; la CI masque tout détail si une alerte survient. |
| Garde-fou | Ce contrôle ne tolère pas de nouvel ajout sensible et ne prétend pas résoudre les données historiques déjà identifiées par le P0. |
| Vérification | À rejouer dans la CI distante après publication ; le mode différentiel est vérifié localement sur une révision sans ajout sensible. |

## Lot ROADMAP-GOV-005 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Préparer la réconciliation du P0 avec l’historique réellement appliqué en production. |
| Constat | La production enregistre déjà les migrations de rattachement concernées et partage son projet avec une autre application. |
| Garde-fou | L’inventaire opérationnel reste privé, ne contient aucune donnée familiale et ne lit aucune ligne de table ; aucune action Supabase n’a été exécutée. |
| Suite | Préparer une copie Git assainie et une réconciliation du seul schéma `arbre`, sans pousser ni appliquer de migration. |

## Lot ROADMAP-GOV-006 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Préparer une copie locale assainie sans modifier `main`, le dépôt distant ou la production. |
| Correction | Une branche locale dédiée neutralise les migrations de données identifiées et remplace la passation publique par un guide sans informations familiales. |
| Garde-fou | Le candidat n’est ni fusionné, ni poussé, ni déployé ; la production et son historique de migrations restent intacts. |
| Suite | Réconcilier le seul schéma `arbre` sur une cible isolée avant toute décision de publication ou de réécriture d’historique. |

## Lot ROADMAP-GOV-007 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Retirer les exemples personnels résiduels du tip public. |
| Correction | L’audit technique, les fixtures de géométrie et de rappels, ainsi que les commentaires concernés utilisent désormais des données synthétiques ou génériques. |
| Vérifications | Garde-fous de l’arbre, géométrie, éclaté, rappels, rapport qualité, typecheck et lint rejoués avec succès ; audit différentiel à rejouer sur le commit final. |
| Limite | Cette livraison ne réécrit pas l’historique Git et ne modifie aucune donnée Supabase. |

## Lot ROADMAP-QUALITY-002 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Exécuter réellement le jeu de données fictif du rapport de qualité sous Windows. |
| Correction | Le lancement du test évite désormais l’appel au profil Unix absent sous Windows ; l’assertion de couverture correspond aux neuf naissances connues du jeu fictif. |
| Vérifications | Test qualité : réussi (14 alertes attendues, 1 doublon potentiel). Typecheck et lint : réussis. |
| Suite | La validation CI/E2E sous Node 22 et l’exercice de restauration isolé restent des prérequis de clôture. |

## Lot ROADMAP-QUALITY-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Rendre rejouable le test fictif du rapport de qualité prévu par la roadmap. |
| Correction | L’exécuteur TypeScript requis par le script est désormais une dépendance de développement déclarée, plutôt qu’un téléchargement implicite. |
| Vérifications | Typecheck et lint réussissent. Le test qualité ne peut pas encore être validé sur ce poste : l’exécuteur échoue avant les assertions sur une erreur système Node liée au profil utilisateur. |
| Suite | Rejouer ce test dans une CI ou un environnement Node 22 sain ; aucune règle métier ni donnée familiale n’est modifiée. |

## Lot RESEARCH-ACT-002 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Trancher une filiation concurrente par la lecture de l’acte de naissance identifié. |
| Correction | La filiation explicitement désignée par le registre devient établie au niveau « acte » ; le seul rattachement concurrent incompatible est retiré. |
| Garde-fou | Les hypothèses historiques sont conservées dans la traçabilité privée comme pistes écartées, mais ne sont plus affichées comme des liens possibles. |
| Impact | Données généalogiques privées uniquement ; aucune identité familiale n’est ajoutée au dépôt public. |

## Lot RESEARCH-INSEE-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Compléter une piste de recherche au moyen d’un jeu de données public officiel. |
| Correction | La source privée existante est maintenant reliée au jeu de données de l’Insee, et les événements qu’elle couvre portent explicitement le niveau de preuve « insee ». |
| Garde-fou | Les données du fichier des décès précisent une identité et des dates ; elles ne prouvent ni parenté ni filiation. |
| Impact | Données de recherche privées uniquement ; aucune identité familiale n’est ajoutée au dépôt public. |

## Lot RESEARCH-ACT-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Clore un chantier après consultation directe d’un registre d’état civil numérisé. |
| Correction | La référence vérifiée est désormais rattachée à sa cote, sa vue et son dépôt, et son niveau de preuve est « acte ». |
| Garde-fou | La requalification confirme uniquement le mariage déjà enregistré ; aucune filiation supplémentaire n’est créée à partir de cette lecture. |
| Impact | Données de recherche privées uniquement ; aucune identité familiale n’est ajoutée au dépôt public. |

## Lot RESEARCH-TRACE-001 — 8 août 2026

| Champ | Détail |
| --- | --- |
| Objet | Convertir une référence d’acte non transcrite en chantier de recherche traçable. |
| Correction | Le chantier privé précise l’acte à consulter, son objectif et sa limite : une simple référence ne confirme pas encore le lien indiqué dans les notes. |
| Garde-fou | Aucune filiation ni niveau de preuve n’est modifié tant que l’acte n’a pas été consulté ou transcrit. |
| Impact | Données de recherche privées uniquement ; aucune identité familiale n’est ajoutée au dépôt public. |
| Garde-fou | Plusieurs couples candidats ne sont plus fusionnés visuellement en une liste qui semblerait attester plusieurs parents. Une filiation établie reste affichée séparément. |
| Impact | Présentation seulement : aucune donnée publique, règle RLS, route ou permission n’est modifiée. |
| Vérifications | Contrôle TypeScript et lint à exécuter avant publication. |
