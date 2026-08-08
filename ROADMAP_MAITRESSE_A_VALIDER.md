# Roadmap maîtresse à valider — mémoire familiale, UX et ajout intelligent

**Statut :** proposition à valider — aucune étape future n’est autorisée par ce document seul.

**Dernière consolidation :** 8 août 2026

**Branche / révision :** `main` — relever la révision courante avec `git log -1` lors de chaque reprise.
**Public :** propriétaire du projet et tout agent reprenant le dépôt.

## Décision demandée

Valider le séquencement ci-dessous, notamment ces trois limites :

1. **L’humain valide toujours** toute écriture généalogique ; l’application ou l’IA ne publie jamais une déduction seule.
2. **Le premier moteur est déterministe** et local au serveur. Aucun fournisseur IA externe, OCR ou donnée familiale n’est envoyé hors du projet sans décision explicite du propriétaire.
3. **Le prototype commence par “ajouter un frère ou une sœur”** depuis une fiche existante, après tests synthétiques ; parents, enfants, conjoints, branche complète et conversation arrivent ensuite.

La validation de cette roadmap autorise la préparation et les lots explicitement cochés ; elle n’autorise ni migration, ni accès à de nouvelles données, ni déploiement, ni appel IA externe.

## État réellement vérifié

| Surface | État | Preuve |
| --- | --- | --- |
| Fiabilité et sécurité | Baseline établie ; les P0 historiques ont été classés. Reste sauvegarde/restauration, rapport qualité, CSP et performance. | [Baseline](BASELINE_BEFORE_REFACTOR.md), [plan de correction](FIX_PLAN.md) |
| Histoire familiale | Vision et roadmap immersive établies ; le lien « Votre … » est livré sur la fiche si le graphe l’établit. | [Vision](IMMERSIVE_GENEALOGY_VISION.md), [roadmap immersive](IMMERSIVE_ROADMAP.md), commit `a79c1b5` |
| UX/UI | Audit, carte de navigation et premier lot photo plein écran livrés. | [audit UX](UX_UI_INTERACTION_AUDIT.md), [carte UX](UX_NAVIGATION_MAP.md), commit `bb54e63` |
| Ajout de personne | Formulaire existant avec parents, union, conjoint, enfants, dates, lieux et preuves ; validation Zod, RLS et garde-fous de cohérence. | `src/components/saisie/formulaire-personne.tsx`, `src/components/saisie/rattachement.tsx`, `src/app/actions/personnes.ts` |
| Assistant conversationnel | Non commencé. Aucun stockage de proposition, contrat d’API IA, fournisseur IA ni OCR n’est validé. | audit de cette consolidation |
| Tests | Typecheck et lint passés pour les deux derniers lots. Les fumées E2E existantes sont synthétiques et couvrent les écrans publics ; les parcours authentifiés attendent une session de démonstration isolée. | [protocole de démonstration](docs/TESTS_DEMONSTRATION.md), [journal](IMPLEMENTATION_LOG.md) |

## Le modèle à respecter

Le modèle existant suffit pour représenter le graphe réel :

```text
personnes ──< unions >── personnes
                    │
               filiations
                    │
                 enfant

personnes / unions ── événements ── lieux
personnes / unions / événements ── sources
personnes ── médias, souvenirs, récits, faits historiques
```

- Une relation parent-enfant est portée par une **filiation vers une union**, pas par une table de liens libres.
- Les liens de fratrie, grand-parenté, cousinage et « votre … » se **calculent** depuis le graphe ; ils ne doivent pas être dupliqués en base.
- Les dates partielles, qualificatifs et niveaux de preuve existent déjà.
- L’action d’ajout vérifie déjà les auto-liens, conflits de rattachement et écarts de dates, mais elle écrit directement : elle ne constitue pas encore un brouillon révisable.
- Les sources et preuves ne doivent jamais être masquées au profit d’un récit, d’une suggestion ou d’une formulation fluide.

## Architecture cible, par couches

```mermaid
flowchart LR
  A[Contexte : fiche ou arbre] --> B[Ajout guidé déterministe]
  B --> C[Résolution de personnes existantes]
  C --> D[Moteur d'inférence]
  D --> E[Contrôles de cohérence et doublons]
  E --> F[Graphe de proposition]
  F --> G[Prévisualisation et choix humain]
  G --> H[Écriture serveur atomique]
  H --> I[Journal, revalidation, mise à jour de l'arbre]

  J[Conversation / document] -. données minimales, futur .-> K[Extraction structurée]
  K -. jamais écriture directe .-> D
```

Les couches `B` à `G` doivent être utilisables **sans IA**. L’IA, si elle est autorisée plus tard, ne fait qu’extraire ou proposer ; le serveur résout les identités, valide et écrit.

## Roadmap priorisée

| Phase | ID | Sortie | Dépendances | Statut |
| --- | --- | --- | --- | --- |
| 0 | GOV-001 | Gouvernance, tests reproductibles et reprise agent | aucune | démarré : contrat de reprise livré |
| 1 | OPS-001 / DATA-001 | Sauvegarde-restauration exercée et rapport de qualité non destructif | GOV-001 | partiel : QLT-001 à 010, leur jeu fictif et son exécution locale sont vérifiés ; la CI Node 22 est configurée pour les rejouer. Une branche Supabase de test existe mais son déploiement de migrations est en échec ; elle ne peut pas encore servir à l’exercice de restauration. |
| 2 | EXP-002 / EXP-003 | Récit par génération et voyage dans le temps v0 | DATA-001 | livré côté code : générations et porte temporelle vers la chronologie de lignée |
| 3 | UX-002 / UX-003 | Recherche globale et fiche orientée vers l’exploration suivante | tests UI authentifiés | livré côté code : recherche RLS et UX-003 ; tests UI authentifiés à faire |
| 4 | ADD-001 | Prototype déterministe : ajouter un frère / une sœur avec aperçu | DATA-001, jeux synthétiques | partiel : raccourci avec parents préremplis, aperçu de lien et signal d’homonymes classé par année et lieu livrés ; aperçu complet à concevoir |
| 5 | ADD-002 | Étendre l’ajout guidé aux parents, enfants et conjoints | ADD-001 validé | partiel : enfant rattaché à un foyer explicitement choisi, conjoint, père ou mère préremplis si aucun parent n’est connu ; raccourci sûr pour rattacher l’autre parent déjà saisi |
| 6 | ADD-003 | Construction de branche et mode expert | ADD-002, UX de révision | préparé : les primitives existent ; le parcours unique reste à concevoir |
| 7 | COP-001 | Copilote conversationnel en mode proposition locale | ADD-003, décision confidentialité | à faire |
| 8 | COP-002 | Extraction de document / OCR optionnelle | COP-001, accord explicite fournisseur | à faire |
| 9 | TRANS-001 | Exports, mode présentation, transmission et runbook | phases précédentes | à faire |

### Phase 0 — Gouvernance et qualité

**But :** rendre le travail reproductible, relisible et réversible.

- Terminer `OPS-001` : [runbook de sauvegarde/restauration](docs/RUNBOOK_SAUVEGARDE_RESTAURATION.md) et exercice de restauration isolé.
- Terminer `DATA-001` : [contrat de rapport qualité](docs/CONTRAT_RAPPORT_QUALITE.md), seuils et jeux de données fictifs.
- Rejouer CI/E2E sous Node 22 ; ne pas modifier les dépendances pour contourner un environnement local dégradé.
- Le test qualité et les 14 garde-fous de l’arbre utilisent désormais une dépendance déclarée et un lancement compatible Windows : ils passent localement le 8 août et sont inclus dans la CI Node 22. Vérifier leur première exécution distante, puis rejouer l’E2E avant de clore DATA-001.
- **P0 confidentialité :** l’audit complet du dépôt a relevé des données familiales dans des migrations historiques. Ne pas activer un filtre CI qui masquerait ce signal, ne pas modifier ces migrations ni réécrire l’historique Git sans un plan de remédiation validé par le propriétaire. Voir [plan de remédiation](docs/REMEDIATION_CONFIDENTIALITE.md).
- La CI interdit désormais les ajouts sensibles depuis la révision de base et masque leur contenu dans ses journaux. Ce filet préventif ne clôt pas le P0 historique.
- Le tip public remplace aussi les fixtures, commentaires et audit technique résiduels par des exemples synthétiques. Cette amélioration ne réécrit pas l'historique Git : son assainissement complet reste un P0 distinct.
- Un candidat local existe sur `prep/assainissement-confidentialite` : il neutralise les migrations de données et assainit la passation publique, sans être fusionné, poussé ni appliqué. Il exige encore une réconciliation privée du seul schéma `arbre` et une validation isolée.
- État vérifié le 8 août : une branche Supabase `e2e`, sans données de production, est active mais signale `MIGRATIONS_FAILED`. Ne pas la réparer, la réinitialiser ni y restaurer de données sans un lot explicite ; elle ne remplit donc pas encore le prérequis de cible isolée du runbook.
- Pour l’exercice OPS-001, le propriétaire doit désigner une cible isolée saine (branche réparée ou nouveau projet), préciser si un export réel peut y être restauré et autoriser l’opération. Aucune donnée familiale ne doit être copiée dans le dépôt ni dans une branche de test sans cet accord.
- Créer une session de démonstration sans données familiales réelles pour les tests UI mobile, tablette et desktop.
- Le périmètre actuel des fumées E2E et la préparation de cette session sont décrits dans le [protocole de démonstration](docs/TESTS_DEMONSTRATION.md). Ne pas présenter les fumées non authentifiées comme une validation RLS ou métier.
- Mesurer les requêtes et le poids du graphe avant toute optimisation de performance, selon le [protocole de baseline](docs/MESURE_PERFORMANCE.md). Aucun seuil ne doit être inventé avant le premier relevé synthétique.
- Contrôle Supabase du 8 août : la seule alerte de sécurité du schéma `arbre` concerne `rappels_envoyes`, volontairement sans policy et réservée au service serveur. Les prochaines améliorations sont les 29 politiques RLS à optimiser, puis les 26 clés étrangères sans index ; les 17 index non utilisés ne doivent pas être supprimés sans mesures réelles.
- La correction RLS est préparée en lecture seule : encapsuler les appels constants d'identité et de rôle dans un `select` pour les évaluer une seule fois par requête, sans modifier les droits. Les contrôles qui dépendent de la ligne consultée restent inchangés. Cette correction exige une migration dédiée et un accord explicite avant application sur Supabase.

**Critère de sortie :** un agent peut exécuter les tests prévus, expliquer les limites restantes et revenir en arrière sans données de production.

### Phase 1 — Expérience de transmission

**But :** permettre à une famille de comprendre le lien, les générations, les lieux, les dates et les preuves.

- `EXP-002` : « Notre histoire » v0, lecture par génération.
- `EXP-003` : voyage dans le temps v0, période partageable par URL et liens prudents vers carte / chronologie.
- Ne jamais déduire une migration d’une simple naissance dans un lieu.
- Conserver l’étiquette de preuve et séparer clairement fait, hypothèse, mémoire et contexte historique.

**Critère de sortie :** un adolescent comprend un parcours familial sans que le récit n’affirme plus que les sources.

### Phase 2 — Navigation et médias

**But :** transformer les modules existants en graphe d’exploration cohérent.

- `UX-002` : livré — `/recherche` réemploie l’index léger et la recherche de l’arbre ; les résultats sont chargés côté serveur avec RLS, sans index public supplémentaire.
- `UX-003` : livré — la fiche propose une prochaine étape selon son contenu déjà chargé : album, souvenirs, repères de vie ou parenté.
- Contexte photo livré : depuis l’album d’une personne, suivant/précédent reste dans la même année et le retour rouvre l’onglet Album.
- Détail photo enrichi : les personnes explicitement liées à l’image et son lieu géolocalisé deviennent des portes de navigation, sans inférence.
- Préparer, sans coder prématurément, l’import massif, la sélection multiple et les actions de classement.

**Critère de sortie :** trouver une personne puis ses photos demande au plus deux actions après l’ouverture de sa fiche ; toute action reste accessible sans geste caché.

### Phase 3 — Ajout intelligent, sans IA

**But :** éviter les liens répétitifs tout en préservant le contrôle généalogique.

#### ADD-001 : prototype frère / sœur

Scénario unique :

```text
Fiche de Paul
→ « Ajouter son frère ou sa sœur »
→ prénom, nom, date facultative
→ recherche de doublons possibles
→ parents repris depuis Paul, si connus
→ aperçu : personne + filiation vers l’union des parents
→ alertes : parent inconnu, doublon, date incohérente, boucle
→ l’utilisateur choisit ce qu’il confirme
→ écriture serveur et journal
```

Règles :

- Si l’union des parents est connue, la nouvelle personne reçoit une filiation vers cette union.
- Si aucun parent n’est connu, l’interface ne prétend pas créer une fratrie : elle propose une personne non rattachée ou demande un parent.
- Si un seul parent est connu, une union à parent unique ne doit être créée que si le modèle et le métier la valident explicitement.
- Un doublon possible est **proposé**, jamais fusionné.
- Toute suggestion doit afficher sa justification (« mêmes parents que … », « même nom et année proche », etc.).
- Une incohérence certaine est refusée ; une incohérence plausible historiquement est signalée et demande une confirmation raisonnée.
- La première version garde le brouillon côté client / serveur de courte durée. Une table de propositions persistantes exige une décision et une migration dédiées.

**Tests requis avant code :**

- parents connus, un parent connu, parents inconnus ;
- homonymes, doublon probable, enfant déjà rattaché ;
- auto-parenté, cycle de filiation, parent plus jeune que l’enfant, dates inconnues ;
- rôle contributeur, lecteur, administrateur, RLS ;
- clavier, mobile 390/430 px, tablette, desktop ;
- aucune donnée familiale réelle dans les tests.

#### ADD-002 : extensions déterministes

Après validation de `ADD-001` seulement :

1. ajouter père / mère ;
2. ajouter enfant depuis une personne ou un couple ;
3. ajouter conjoint puis enchaîner sur les enfants ;
4. proposer l’ajout suivant sans remettre les données déjà certaines ;
5. construire une petite branche à partir d’un couple.

Chaque sous-cas est un lot distinct : pas de « moteur total » livré en une fois.

#### ADD-003 : petite branche et mode expert

Le modèle et les primitives existent déjà : création d’une personne, création ou réemploi d’un foyer, rattachement d’enfants existants, préremplissage depuis une fiche et aperçu explicite des liens proposés. Le lot restant est donc une **orchestration d’interface**, pas une nouvelle règle généalogique.

- partir d’une fiche ou d’un foyer connu ;
- réunir, dans un seul brouillon visible, adulte(s), enfant(s) et les rattachements proposés ;
- laisser chaque personne incomplète tant qu’aucun fait n’est connu ;
- afficher les contrôles de doublon et de date avant toute écriture ;
- enregistrer seulement après validation humaine, en conservant les actions actuelles comme solution de repli.

Le premier prototype n’écrira aucune branche complète en une seule opération : il préparera le brouillon et guidera l’utilisateur vers les enregistrements déjà protégés. Toute écriture groupée ou table de brouillon persistante exige une décision et une migration dédiées.

### Phase 4 — Copilote conversationnel

**But :** laisser raconter ce que l’on sait, puis transformer ce récit en propositions compréhensibles.

Préconditions non négociables :

- décision écrite sur le fournisseur, la localisation et la rétention des données ;
- minimisation stricte : jamais toute la base, aucune photo ou document de personne vivante sans accord spécifique ;
- le contenu d’un document est une donnée, jamais une instruction ;
- pas d’identifiant de base inventé par un modèle ;
- sortie structurée revalidée par Zod côté serveur ;
- séparation stricte `lire` → `proposer` → `écrire` ;
- journaux techniques sans texte familial complet.

Contrat minimal de proposition :

```ts
type PropositionGenealogique = {
  personnes: Array<{ brouillonId: string; champs: Record<string, unknown>; confiance: 'haute' | 'moyenne' | 'faible' }>;
  relations: Array<{ type: 'parent_enfant' | 'conjoint'; depuis: string; vers: string; justification: string }>;
  evenements: Array<{ type: string; date?: unknown; lieu?: string; justification: string }>;
  doublonsPossibles: Array<{ brouillonId: string; personneExistanteId?: string; raisons: string[] }>;
  incertitudes: string[];
  conflits: string[];
};
```

Les identifiants réels sont résolus après l’extraction, exclusivement par le serveur et dans le périmètre autorisé par RLS.

**Critère de sortie :** une phrase ambiguë produit un aperçu incomplet et honnête, jamais une écriture automatique.

### Phase 5 — Documents et OCR

- Commencer par un document fictif et un extrait minimal.
- Source, transcription, niveau de preuve et résultat d’extraction restent séparés.
- Toute donnée extraite est présentée comme proposition, même si l’OCR est fiable.
- Aucun envoi d’archive privée ou de photo de personne vivante sans validation explicite.
- Mesurer coût, délai et qualité avant élargissement.

## Matrice de décisions à obtenir du propriétaire

| Décision | Recommandation | Bloque |
| --- | --- | --- |
| Valider la priorité du prototype frère / sœur | Oui | ADD-001 |
| Autoriser une table persistante de propositions | Non pour le prototype ; réexaminer après usage | toute migration de brouillon |
| Autoriser un fournisseur IA externe | Non par défaut ; décision documentée ultérieurement | COP-001 / COP-002 |
| Définir les cas de parent unique / adoption / familles recomposées | Atelier métier avant ADD-002 | extensions de relation |
| Créer une session de démonstration fictive | Oui, sans données réelles | validations UX et E2E |
| Définir une politique de conservation des sauvegardes | Oui | OPS-001 |
| Autoriser le plan P0 de confidentialité | Décision écrite avant toute purge ou réécriture | assainissement du dépôt et future CI de confidentialité |

## Risques et garde-fous

| Risque | Garde-fou |
| --- | --- |
| Fausse filiation ou hallucination | propositions explicables, source/niveau de preuve, validation humaine et tests adversariaux |
| Doublon / fusion erronée | détection seulement ; aucune fusion automatique |
| Écriture partielle | transaction serveur ou absence d’écriture ; état de résultat clair et journalisé |
| Divulgation de données familiales | RLS, données minimales, pas d’IA externe par défaut, aucun secret dans le dépôt |
| Régression mobile / senior | contrôles visibles, cibles 44 px, clavier, aucun geste obligatoire |
| Dérive de périmètre | un scénario, un lot, critères de sortie et rollback décrits avant code |
| Conflit avec sources | l’acte prévaut ; hypothèse, mémoire et proposition restent étiquetées |

## Guide de reprise pour un autre agent

1. Lire ce fichier et le [plan P0 de confidentialité](docs/REMEDIATION_CONFIDENTIALITE.md), puis [CONVENTIONS.md](CONVENTIONS.md), [docs/PASSATION.md](docs/PASSATION.md) et [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md). Le P0 interdit toute modification de migration, réécriture Git ou publication sans validation écrite du propriétaire.
2. Vérifier `git status --short` et préserver les fichiers non suivis hors périmètre : `docs/emails-supabase.md` et `magic-link-email.html`.
3. Lire le document spécifique du lot retenu, sans en déduire une autorisation de modifier les fichiers protégés, le schéma ou les données.
4. Pour un lot d’ajout, lire d’abord `src/lib/types-base.ts`, `src/app/actions/personnes.ts`, `src/components/saisie/rattachement.tsx` et les règles RLS pertinentes.
5. Ne jamais modifier `src/proxy.ts`, `src/lib/supabase/*`, `src/lib/types-base.ts`, `src/lib/arbre.ts`, `src/lib/layout-arbre.ts`, `src/components/navigation.tsx`, `src/app/layout.tsx`, `src/app/globals.css` ou une migration sans nouvelle validation explicite.
6. Ne jamais lancer `npm run build` dans cet espace partagé ; exécuter au minimum typecheck et lint quand l’environnement le permet.
7. Finir chaque lot par : preuves de test, rollback, mise à jour du journal, commit local atomique. Ne pas pousser sans demande explicite.

## Documents sources consolidés

- [AUDIT.md](AUDIT.md) et [AUDIT_GENEALOGIE_MASTER.md](AUDIT_GENEALOGIE_MASTER.md) : audit historique et correctifs initiaux.
- [BASELINE_BEFORE_REFACTOR.md](BASELINE_BEFORE_REFACTOR.md) et [FIX_PLAN.md](FIX_PLAN.md) : sécurité, exploitation, données, performance.
- [IMMERSIVE_GENEALOGY_VISION.md](IMMERSIVE_GENEALOGY_VISION.md) et [IMMERSIVE_ROADMAP.md](IMMERSIVE_ROADMAP.md) : transmission historique et vérité des sources.
- [UX_UI_INTERACTION_AUDIT.md](UX_UI_INTERACTION_AUDIT.md) et [UX_NAVIGATION_MAP.md](UX_NAVIGATION_MAP.md) : parcours, interfaces et navigation.
- [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md) : décisions et lots effectivement livrés.

## Approbation

À compléter par le propriétaire :

- [ ] Séquencement validé.
- [ ] Phase 0 autorisée.
- [ ] Prototype ADD-001 autorisé après sortie de Phase 0.
- [ ] Aucun fournisseur IA externe n’est autorisé à ce stade.
- [ ] Session de démonstration fictive à créer avant les tests authentifiés.
