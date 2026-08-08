# Audit public — expérience de l’arbre

**Statut :** synthèse technique sans données familiales. Les observations sur
des personnes, des branches ou des actes réels sont conservées hors du dépôt.

## Constats traités

- Les liens de fratrie, cousinage et couple doivent être visuellement distincts.
- Les couples restent des unités adjacentes dans la disposition ; les traits de
  liaison ne traversent pas les cartes intermédiaires.
- L’ascendance nécessaire est conservée autour du focus et les photos visibles
  sont chargées à la demande.
- Les parcours sans session, la navigation clavier et les vues mobiles font
  partie des garde-fous automatisés.

## Vérifications disponibles

```text
npm run arbre:verifier
npm run arbre:test-qualite
npm run typecheck
npm run lint
```

Les fixtures de géométrie sont synthétiques. Les données de production ne sont
ni nécessaires ni autorisées pour ces contrôles.

## Limites connues

- Les parcours authentifiés nécessitent une session de démonstration isolée.
- La performance doit être mesurée sur des données de test selon le
  [protocole dédié](docs/MESURE_PERFORMANCE.md).
- Le dépôt est en cours d’assainissement de confidentialité ; consulter la
  [roadmap](ROADMAP_MAITRESSE_A_VALIDER.md) avant toute modification de
  migration ou de documentation historique.
