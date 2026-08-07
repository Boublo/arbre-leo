# Runbook — sauvegarde et restauration de l’arbre

**Statut :** procédure à exercer sur un environnement isolé avant de la déclarer opérationnelle.

**Périmètre :** données Supabase du schéma `arbre`, fichiers privés du bucket `arbre-medias`, configuration de production.
**Principe :** une restauration est une opération à haut risque. Elle ne se fait jamais contre la production sans accord explicite du propriétaire et point de restauration identifié.

## Quand utiliser cette procédure

- exercice annuel de restauration ;
- préparation d’une évolution de schéma importante ;
- soupçon de suppression ou corruption de données ;
- besoin de récupérer un fichier média devenu indisponible ;
- changement de propriétaire ou de fournisseur.

Cette procédure ne remplace pas une sauvegarde automatique fournie par Supabase. Elle vérifie que cette sauvegarde est réellement exploitable pour l’application.

## Prérequis

- rôle propriétaire ou administrateur Supabase, avec accès à **Database → Backups** ;
- accès à un projet Supabase isolé de restauration, jamais à la production comme cible initiale ;
- accès aux variables d’environnement du projet de test, sans les inscrire dans un fichier versionné ;
- autorisation écrite du propriétaire si l’exercice utilise des données réelles ;
- un export JSON ou GEDCOM récent, lorsqu’il est disponible, comme contrôle indépendant ;
- la révision Git de l’application à tester et ce document.

Ne copier aucun secret, export contenant des personnes vivantes, média privé ou fichier GEDCOM dans le dépôt Git.

## Inventaire à sauvegarder

| Élément | Mécanisme attendu | Contrôle |
| --- | --- | --- |
| Schéma `arbre` et données SQL | sauvegarde Supabase ou export SQL chiffré approuvé | tables, enums, fonctions, RLS et comptes cohérents |
| Bucket `arbre-medias` | sauvegarde stockage distincte ou export du bucket | objets présents, chemins et métadonnées cohérents |
| Configuration | inventaire des noms de variables et des accès, sans valeurs | les variables nécessaires sont connues et protégées |
| Dépôt applicatif | Git et tags/commits | révision récupérable et dépendances verrouillées |
| Export métier | GEDCOM / JSON depuis l’application, selon les droits | lecture possible sans devenir une source d’écriture automatique |

## Exercice de restauration isolé

### 1. Préparer le périmètre

1. Consigner la date, le responsable, le point de restauration choisi et l’objectif.
2. Créer ou sélectionner un projet Supabase **de test** vide et isolé.
3. Désactiver tout cron, e-mail, webhook ou intégration externe du projet de test.
4. Vérifier que les URL de test ne pointent jamais vers le site de production.
5. Conserver les exports et accès dans un emplacement chiffré hors du dépôt.

**Point d’arrêt :** si la cible est la production, arrêter et demander la validation écrite du propriétaire.

### 2. Restaurer la base

1. Dans Supabase, identifier le backup et son horodatage.
2. Utiliser le mécanisme de restauration documenté par Supabase vers le projet isolé, ou importer l’export SQL approuvé.
3. Vérifier que le schéma actif est `arbre`, jamais `public`.
4. Vérifier les tables principales : `personnes`, `unions`, `filiations`, `evenements`, `sources`, `medias`, `membres`, `journal`.
5. Vérifier que les enums, fonctions d’autorisation et politiques RLS sont bien présents.

Ne modifier aucune donnée pour « faire passer » la vérification.

### 3. Restaurer les médias

1. Restaurer les objets du bucket `arbre-medias` dans le projet isolé.
2. Comparer le nombre d’objets et un échantillon de chemins avec les lignes `medias`.
3. Vérifier qu’aucune URL publique n’a été introduite : les médias doivent continuer à passer par des URL signées.
4. Vérifier, avec un compte de démonstration, qu’une photo et un document autorisés sont lisibles.

### 4. Vérifier fonctionnellement

Dans l’environnement isolé, avec des comptes de test :

- connexion d’un lecteur, contributeur et administrateur ;
- arbre, fiche personne, chronologie, carte et recherche ;
- création d’un brouillon de contribution uniquement si l’exercice l’autorise ;
- contrôle de cohérence dans l’administration ;
- export JSON ou GEDCOM ;
- vérification d’un média signé ;
- test du cron uniquement avec des destinataires ou clés de test.

### 5. Vérifier les invariants

Les écarts doivent être expliqués, jamais ignorés :

| Invariant | Attendu |
| --- | --- |
| Comptes par table | égaux au point de restauration, ou différence justifiée |
| RLS | aucune lecture membre au-delà des droits attendus |
| Journal | présent et consultable par les seuls rôles autorisés |
| Graphe | aucune filiation orpheline ni union impossible due à la restauration |
| Médias | chemins et objets cohérents, sans accès public |
| Exports | structurés et lisibles, sans transformer le test en nouvel import |
| Application | routes privées accessibles uniquement après contrôle d’accès |

## Critère de réussite

L’exercice est réussi uniquement si :

1. la restauration a eu lieu sur une cible isolée ;
2. les invariants sont vérifiés et les écarts consignés ;
3. aucun e-mail, notification ou écriture n’a atteint la production ;
4. le propriétaire peut retrouver le point de restauration, le compte rendu et la révision Git ;
5. le projet de test peut être détruit après validation, avec ses secrets révoqués.

## Échec, rollback et escalade

- **Échec de restauration :** ne jamais improviser sur la production ; conserver les journaux non sensibles et ouvrir un incident avec le propriétaire.
- **Données incohérentes :** comparer avec le point de restauration précédent et le rapport qualité ; ne pas corriger en masse.
- **Médias manquants :** isoler les chemins concernés, ne pas régénérer d’URL publiques.
- **Restauration de production envisagée :** exige validation écrite, fenêtre de maintenance, backup juste avant action, plan de retour et responsable nommé.
- **Après exercice :** désactiver comptes, clés, crons et ressources temporaires du projet isolé.

## Compte rendu minimal

À stocker hors du dépôt si des données réelles sont mentionnées :

```text
Date :
Responsable :
Objectif :
Point de restauration :
Cible isolée :
Tables vérifiées :
Médias vérifiés :
RLS / rôles vérifiés :
Résultat :
Écarts et suite :
Validation du propriétaire :
```
