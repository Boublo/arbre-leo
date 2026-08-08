# Tests de démonstration et E2E

**Statut :** protocole de préparation. Il ne crée ni compte, ni projet Supabase, ni donnée familiale.

## Ce qui est déjà automatisé

Le scénario `npm run test:e2e` exécute `e2e/smoke-mobile.spec.ts` avec une clé et une URL Supabase factices. Il couvre, en format mobile :

- l’affichage de la connexion et de l’inscription ;
- la redirection vers la connexion depuis l’arbre et la chronologie sans session ;
- la conservation du lien demandé dans le paramètre `suite` ;
- l’écran d’erreur générique.

Ces scénarios ne se connectent à aucune base Supabase réelle et ne chargent aucune donnée familiale. Ils sont rejoués par la CI Node 22 après construction de l’application. Ne pas lancer la construction locale dans l’espace partagé : la CI est la référence pour ce passage.

## Ce qui n’est pas encore couvert

Les scénarios suivants demandent une session de démonstration et restent à valider :

- lecture de l’arbre, fiche, chronologie, carte et recherche avec le rôle lecteur ;
- ajout contrôlé avec le rôle contributeur ;
- écrans d’administration et rapport de qualité avec le rôle administrateur ;
- isolement RLS entre les comptes, accès aux médias signés et gestion des erreurs ;
- ergonomie mobile, tablette et bureau après connexion.

L’absence de ces tests ne signifie pas que ces fonctions sont validées.

## Préparer une session de démonstration

1. Désigner un projet ou une branche Supabase isolée, saine et approuvée. Une branche dont les migrations sont en échec ne convient pas.
2. Créer uniquement des comptes de test et un petit graphe inventé, sans noms, dates, lieux, photos ou documents issus de la famille.
3. Préparer un compte par rôle : lecteur, contributeur et administrateur. Désactiver les envois d’e-mail, cron, webhooks et intégrations externes pour cette cible.
4. Conserver les identifiants et variables de test hors du dépôt ; ne jamais les inscrire dans `.env.example`, les tests ou la CI.
5. Rejouer les parcours listés ci-dessus à 390 px, 430 px, tablette et bureau ; noter la révision Git, la cible, le résultat et les écarts sans recopier de secrets.
6. Détruire ou désactiver les comptes et clés temporaires après validation, conformément au [runbook](RUNBOOK_SAUVEGARDE_RESTAURATION.md).

## Condition de clôture

La validation E2E authentifiée exige une preuve de parcours pour les trois rôles, l’absence de lecture hors droits RLS, et un compte rendu ne contenant aucune donnée familiale réelle.
