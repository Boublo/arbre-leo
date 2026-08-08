# Remédiation P0 — données familiales dans l’historique public

**Statut :** plan à valider. Aucune suppression, réécriture Git, migration ou action Supabase n’est autorisée par ce document seul.

## Constat

Un audit du dépôt public a identifié des données familiales dans des migrations historiques. Les filtres de pré-commit réduisent le risque de nouvelles fuites, mais ne purgent pas un contenu déjà versionné ni ses copies, forks et caches.

## Décisions requises du propriétaire

1. Autoriser un inventaire privé des fichiers et révisions concernés, sans recopier leurs données dans un rapport public.
2. Désigner un responsable de la continuité de production et une fenêtre de maintenance éventuelle.
3. Autoriser, ou non, une réécriture d’historique du dépôt public et les actions de purge associées chez l’hébergeur Git.
4. Définir la conservation privée des migrations de données, exports et preuves nécessaires à la reconstruction de l’arbre.

## Séquence sûre proposée

1. Geler les modifications non indispensables des migrations concernées et relever, dans un emplacement privé, leur état d’application sur la production.
2. Sauvegarder la production et son historique de migrations selon le [runbook](RUNBOOK_SAUVEGARDE_RESTAURATION.md), sans déposer d’export dans Git.
3. Séparer le schéma reproductible des imports de données familiales : le dépôt public ne doit conserver que le schéma, les RLS, les fonctions et des exemples fictifs.
4. Préparer sur une copie isolée la réconciliation entre l’historique de migrations de la production et le nouveau dépôt assaini. Ne jamais modifier ou rejouer une migration historique directement contre la production.
5. Faire relire le plan par le propriétaire, puis exécuter la purge d’historique avec un responsable identifié. Informer les collaborateurs qu’un nouveau clonage est nécessaire et faire révoquer les accès ou secrets concernés si l’inventaire le justifie.
6. Vérifier sur une cible isolée que le schéma, les politiques RLS, les médias privés et l’application restent cohérents ; consigner le résultat hors du dépôt si des données réelles sont impliquées.
7. Après assainissement validé, ajouter à la CI un contrôle de confidentialité qui analyse les ajouts de chaque changement, sans ignorer les chemins sensibles nouvellement modifiés.

## Interdits

- ne pas supprimer des migrations historiques à l’aveugle ;
- ne pas réécrire `main` ni forcer une publication sans validation écrite ;
- ne pas utiliser une branche de test en échec de migrations comme cible de restauration ;
- ne pas mettre d’export, GEDCOM, image, nom, date ou secret familial dans un ticket, un log CI ou le dépôt public.

## Critère de sortie

Le P0 est clos uniquement lorsque le dépôt et son historique accessible ne contiennent plus de données familiales, que la production peut être reconstruite depuis des éléments privés approuvés, et qu’un contrôle de prévention couvre les changements futurs.
