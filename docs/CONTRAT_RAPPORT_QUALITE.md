# Contrat — rapport de qualité généalogique

**Statut :** contrat de sortie pour `DATA-001`, sans génération automatique ni correction de données dans ce lot.
**But :** rendre les contrôles existants comparables dans le temps, lisibles par un administrateur et sûrs pour les données familiales.

## Sources existantes

| Source | Usage actuel | Limite |
| --- | --- | --- |
| `src/lib/coherence.ts` | rapport déterministe dans l’administration | graphe chargé, synthèse limitée |
| `scripts/diagnostic.mjs` | diagnostic CLI en lecture seule | sortie humaine, nécessite un compte valide |
| `scripts/build-tree.mjs` | contrôles à la génération | lié aux sources GEDCOM, pas à toute la base applicative |
| administration | présentation des anomalies | pas de seuils de qualité versionnés |

Le futur rapport compose ces sources ; il ne remplace ni RLS ni la validation d’écriture.

## Principes

1. Lecture seule : aucune correction, fusion ou suppression automatique.
2. Données minimales : aucun rapport versionné ne contient nom, date complète, lieu précis, texte de souvenir ou URL signée.
3. Traçabilité : chaque règle porte un identifiant stable, une sévérité et une justification.
4. Prudence : une anomalie n’est pas une erreur généalogique ; elle signale une vérification humaine.
5. Comparaison : les métriques agrégées sont comparables entre deux exécutions sans divulguer l’arbre.

## Format de sortie cible

Deux sorties complémentaires :

- **rapport privé détaillé** : réservé à l’administrateur, peut contenir identifiants techniques nécessaires à la correction ;
- **résumé partageable** : agrégé, sans identité familiale, stockable dans un suivi d’exploitation.

```ts
type ResumeQualite = {
  schemaVersion: 1;
  genereLe: string;
  source: 'administration' | 'diagnostic-cli' | 'ci-fictive';
  comptes: {
    personnes: number;
    unions: number;
    filiations: number;
    evenements: number;
    sources: number;
    lieux: number;
  };
  couverture: {
    naissanceConnue: number;
    preuveActeOuAnom: number;
  };
  anomalies: Record<'critique' | 'attention' | 'info', number>;
  regles: Array<{
    id: string;
    severite: 'critique' | 'attention' | 'info';
    occurrences: number;
  }>;
  statut: 'sain' | 'a_revoir' | 'bloquant';
};
```

Le résumé ne contient ni nom complet, ni UUID, ni extrait de source, ni chemin de média.

## Catalogue initial des règles

| ID | Sévérité | Détection existante | Interprétation |
| --- | --- | --- | --- |
| QLT-001 | critique | décès antérieur à la naissance | incohérence certaine si les deux années sont fiables |
| QLT-002 | critique | enfant né avant un parent | incohérence certaine si les deux années sont fiables |
| QLT-003 | attention | écart parent-enfant hors de la plage courante | signal, pas blocage automatique : les cas historiques existent |
| QLT-004 | info | personne isolée | à compléter ou à assumer |
| QLT-005 | attention | même nom, prénoms et année de naissance | doublon possible, jamais fusion automatique |
| QLT-006 | attention | fait historique hors période de vie | vérifier le rattachement ou l’interprétation |
| QLT-007 | attention | chantier sans réponse au-delà du délai | livrée : signal après 60 jours, lien vers les recherches |
| QLT-008 | info | couverture naissance / preuve | livrée dans le résumé agrégé ; indicateur de maturité, pas de qualité individuelle |
| QLT-009 | critique | filiation pointant vers une union absente | livrée dans le contrôle du graphe |
| QLT-010 | critique | union ou filiation créant un cycle | livrée dans le contrôle du graphe |

Les règles QLT-009 et QLT-010 sont des prérequis directs du futur moteur d’ajout. Elles sont couvertes par le jeu fictif `scripts/test-rapport-qualite.ts`, sans correction automatique.

## Seuils et statut

| Statut | Condition | Effet |
| --- | --- | --- |
| `sain` | aucune anomalie critique ; attention stable ou justifiée | information, pas de blocage |
| `a_revoir` | au moins une attention nouvelle ou hausse de couverture à analyser | revue humaine avant lot sensible |
| `bloquant` | une critique nouvelle, un échec de RLS ou une règle de graphe rompue | arrêter les écritures automatisées et investiguer |

Les seuils ne doivent jamais empêcher un administrateur de corriger une donnée réelle ; ils empêchent seulement de prétendre qu’un état est vérifié.

## Jeux de données et tests

Créer un petit jeu fictif, versionné, qui couvre :

- famille cohérente avec dates partielles ;
- deux homonymes non fusionnables ;
- décès avant naissance ;
- parent plus jeune que l’enfant ;
- écart d’âge inhabituel mais possible ;
- filiation orpheline ;
- cycle de filiation ;
- personne isolée intentionnelle ;
- fait hors période de vie.

Chaque test vérifie le code de règle et le nombre d’occurrences, jamais un nom familial réel.

## Procédure d’exécution future

1. Exécuter le diagnostic avec un compte de test ou d’administration autorisé.
2. Produire le rapport privé hors Git et le résumé agrégé si nécessaire.
3. Comparer aux seuils et au dernier résumé.
4. Ouvrir un chantier de recherche ou une correction ciblée pour chaque nouvelle anomalie.
5. Ne jamais lancer une correction automatique depuis le rapport.
6. Mettre à jour le journal d’exécution avec la date, le statut et les décisions, sans données personnelles.

## Critère de sortie DATA-001

- contrat approuvé ;
- règles QLT-001 à QLT-010 couvertes par données fictives ;
- résumé agrégé reproductible ;
- rapport détaillé accessible seulement aux rôles autorisés ;
- aucune donnée réelle ajoutée au dépôt ;
- aucune correction automatique introduite.
