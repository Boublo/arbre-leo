# Mesure de performance avant optimisation

**Statut :** protocole de baseline. Il ne fixe pas de seuil tant qu’aucune mesure reproductible n’a été relevée.

## Préparer une mesure sûre

- Utiliser une cible isolée et des comptes de démonstration ; ne pas copier la réponse réseau, des noms, des dates, des lieux, des identifiants ni des URL signées dans Git ou un ticket public.
- Noter hors du dépôt : date, révision Git, navigateur, taille d’écran, type de connexion, rôle utilisé et cible de test.
- Désactiver les extensions du navigateur qui modifient les pages ou les requêtes. Répéter chaque parcours au moins trois fois, cache désactivé puis cache chaud.
- Ne pas confondre la branche Supabase de test dont les migrations échouent avec une cible de mesure valide.

## Contrôles sans donnée familiale

Avant la mesure, exécuter les gardes-fous statiques :

```text
npm run arbre:verifier-chargement
npm run arbre:verifier
```

Le premier garantit notamment que l’arbre charge un sous-graphe autour du focus, conserve l’ascendance nécessaire et signe les photos visibles de façon différée. Ces contrôles n’établissent pas un temps de réponse : ils préviennent seulement une régression de stratégie de chargement.

## Relevé minimal sur une session de démonstration

Pour chaque écran, consigner seulement les nombres et verdicts suivants :

| Parcours | Mesures à relever |
| --- | --- |
| Ouverture de l’arbre avec un focus | nombre de requêtes, volume transféré, temps de réponse du document et des données, LCP, CLS, INP, nombre de nœuds affichés |
| Changement de focus | nombre de requêtes supplémentaires, durée jusqu’à interaction possible, stabilité visuelle |
| Recherche | délai avant résultats, nombre de requêtes, absence de chargement du graphe complet |
| Fiche, chronologie et carte | volume transféré, LCP, CLS, erreurs réseau et comportement sur lien profond |
| Portrait / média autorisé | nombre de signatures demandées, délai d’affichage et absence d’URL publique persistante |

Réaliser le relevé à 390 px, 430 px, tablette et bureau. Comparer uniquement des parcours et rôles identiques.

## Lecture des résultats

- Une hausse du volume ou du nombre de requêtes doit être reliée à un changement de code, de données synthétiques ou de réseau avant de devenir une tâche d’optimisation.
- Une amélioration supposée est validée seulement si le même relevé, sur la même cible, montre une évolution favorable sans régression mobile ni élargissement des données chargées.
- Les logs Supabase peuvent servir à compter les requêtes ; ils ne doivent pas être exportés dans le dépôt s’ils contiennent des données familiales ou techniques sensibles.
- Le script `npm run arbre:diag` est un contrôle de cohérence métier. Sa sortie peut contenir des informations privées : la conserver hors Git et ne jamais l’utiliser comme rapport de performance public.

## Critère de clôture

La baseline est prête lorsqu’un relevé synthétique couvre les cinq parcours, quatre largeurs d’écran et une révision Git précise. Les seuils de performance peuvent alors être décidés à partir de cette baseline, pas à partir d’une estimation.
