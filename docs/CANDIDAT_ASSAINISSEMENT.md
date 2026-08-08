# Candidat local d’assainissement

**Branche :** `prep/assainissement-confidentialite`  
**Statut :** préparation locale uniquement — ne pas fusionner, pousser ou déployer.

## Portée du candidat

Les migrations `0025` à `0029` ne modifiaient pas le schéma ; elles contenaient des opérations de données familiales. Dans cette copie locale, elles sont remplacées par des commentaires neutres afin qu’une nouvelle base reconstruise le schéma sans rejouer de données privées.

## Ce que ce candidat ne fait pas

- il ne supprime rien de la production ;
- il ne réconcilie pas l’historique de migrations déjà appliqué ;
- il ne purgera pas les révisions Git antérieures ni leurs copies ;
- il ne remplace pas l’inventaire privé ni l’exercice de restauration isolé.

## Conditions avant toute étape suivante

1. Comparer le candidat à une copie isolée de l’historique de production, en limitant l’analyse au schéma `arbre`.
2. Obtenir une autorisation explicite distincte avant toute réécriture de l’historique Git ou publication distante.
3. Vérifier l’application avec des données fictives sur une cible isolée saine ; ne jamais utiliser la branche `e2e` actuellement en échec de migrations.
4. Préserver les migrations et objets de l’autre application du projet Supabase partagé.
