# Passation publique — code de l’application

Ce dépôt public contient le code, le schéma reproductible et des procédures
sans données personnelles. Les recherches généalogiques, actes, exports,
médias, identifiants, mots de passe et informations de personnes vivantes
restent exclusivement dans les systèmes privés autorisés.

## Reprendre le projet sans divulgation

1. Lire la [roadmap maîtresse](../ROADMAP_MAITRESSE_A_VALIDER.md), le
   [plan de confidentialité](REMEDIATION_CONFIDENTIALITE.md) et les conventions.
2. Vérifier `git status --short` et préserver les fichiers locaux ignorés.
3. Ne jamais ajouter de données familiales, GEDCOM, photo, acte, export ou
   secret au dépôt, aux tests, aux journaux CI ou à une issue publique.
4. Avant un changement de code, exécuter les contrôles pertinents :
   `npm run typecheck`, `npm run lint` et `npm run arbre:verifier` pour l’arbre.
5. Pour tout accès Supabase, travailler dans le schéma privé prévu par
   l’application, vérifier RLS et ne jamais réinitialiser un projet partagé.

## Contributions de données

Les contributions familiales sont validées par un humain dans les outils privés
de l’application. Cette documentation ne décrit volontairement ni personne,
ni relation, ni source d’archive, ni état de recherche.

## Situation de l’assainissement

Le dépôt fait l’objet d’un assainissement de confidentialité. Ne modifier ni
migration historique, ni historique Git, ni cible Supabase de production sans
un plan approuvé par le propriétaire. La copie locale de préparation est décrite
dans `docs/CANDIDAT_ASSAINISSEMENT.md` sur sa branche dédiée et ne doit pas être
publiée telle quelle.
