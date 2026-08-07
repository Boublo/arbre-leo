# Audit UX/UI et interactions

**Date :** 7 août 2026

**Périmètre :** application privée « L’arbre de Léo », interfaces membre et contribution.
**Méthode :** lecture des 34 routes `page.tsx`, des composants d’interaction et des parcours transverses ; consultation de la production jusqu’à l’écran de connexion. Les fiches privées n’ont pas été testées avec un compte : les constats sur leur rendu réel sont donc issus du code et devront être confirmés dans une session de test membre avant une refonte large.

## Verdict

Le produit est déjà nettement plus qu’un arbre : la fiche relie parenté, frise, sources, souvenirs, récits, album et recherche ; l’arbre possède sa propre recherche clavier, et l’album dispose d’une chronologie et d’un zoom. La principale faiblesse est la **découvrabilité** : ces portes existent souvent, mais l’utilisateur doit déjà connaître le bon écran ou le bon onglet.

La priorité n’est donc pas d’ajouter des effets visuels. Elle est de rendre les liaisons entre personne, photo, lieu et période plus immédiates, en gardant le ton calme et lisible pour les membres peu à l’aise avec le numérique.

## Architecture observée

| Domaine | Routes ou composants existants | Évaluation UX |
| --- | --- | --- |
| Découvrir | accueil, « Ces jours-ci », nouveautés, statistiques | Très bon point d’entrée narratif ; l’accueil propose toutefois treize destinations, trop équivalentes. |
| Arbre et personnes | arbre focalisé, fiche, mini-arbre, barre de parenté, parenté | Navigation locale solide ; retour à l’arbre et parenté visibles. |
| Images et mémoire | album d’une personne, détail photo, souvenirs, récits | Album déjà riche ; il manque une entrée photo globale et un lecteur de détail plus immersif. |
| Temps et lieux | chronologie, carte, histoire | Les modules sont complémentaires, mais le passage de l’un à l’autre dépend encore de liens isolés. |
| Contribution | ajout de personne, photo, acte, souvenir, récit, administration | Les actions sont contextualisées, mais réparties entre plusieurs écrans et formulaires. |
| Recherche | recherche dans l’arbre, chantiers, archives | Une palette de recherche existe dans l’arbre uniquement ; aucune recherche globale n’est proposée. |

## Parcours réels et frictions

| Parcours | État actuel | Mesure indicative | Friction principale |
| --- | --- | --- | --- |
| Retrouver une personne puis ouvrir son album | Arbre → recherche `F` → fiche → onglet Album | 3 actions minimum | La recherche n’est pas disponible hors de l’arbre. |
| Ouvrir une photo ancienne et savoir qui est présent | Fiche → Album → vignette → page photo | 3 actions | La page photo ne propose pas encore une entrée plein écran explicite ; les personnes liées ne sont pas exposées comme une zone de navigation. |
| Remonter d’un enfant à son aïeul | Fiche → barre de parenté / mini-arbre → fiche | 1 action par génération | Très bon parcours local ; il faut conserver cette simplicité. |
| Voir une vie dans le temps | Fiche → Album « Histoire » ou chronologie de lignée | 1–2 actions | Deux temporalités coexistent sans état partagé ni passage explicite album ↔ chronologie générale. |
| Déposer une photo depuis une personne | Fiche → Album → « Ajouter une photo » | 2 actions | Bon, mais le bouton est caché dans le quatrième onglet de la fiche. |
| Créer ou corriger une information | Fiche → barre de saisie → page dédiée | 1–2 actions | Correct pour la fiabilité, mais pas de modifications simples dans le contexte. |
| Chercher « Algérie 1960 » | Carte, chronologie ou archives selon l’intuition | variable | Pas de recherche fédérée par personnes, lieux, années et médias. |
| Administrer beaucoup de photos | dépôt par personne et album individuel | non mesuré | Ni boîte de réception, ni sélection multiple, ni actions de masse constatées. |

## Règle des trois secondes

| Écran | Où suis-je ? | Action principale perçue | Retour / suite | Conclusion |
| --- | --- | --- | --- | --- |
| Connexion | Oui | Oui | Oui | Conforme. |
| Accueil | Oui | Partiellement : l’arbre et la chronologie sont visibles, puis de nombreuses cartes se concurrencent. | Oui | Simplifier la hiérarchie des portes. |
| Arbre | Oui | Oui : explorer / rechercher une personne. | Oui | Conforme, à conserver. |
| Fiche personne | Oui | Partiellement : identité et liens familiaux dominent, puis six matières et des actions de contribution. | Oui | Renforcer l’accès aux photos et à la frise sans retirer les preuves. |
| Photo détaillée | Oui | Voir / lire les souvenirs ; pas d’action immersive immédiatement explicite. | Oui | Premier correctif retenu. |
| Chronologie, carte, souvenirs | Oui | Oui, mais les changements de module sont peu suggérés. | Oui | Créer des ponts, sans fusionner les écrans. |

## Les dix frictions à traiter

1. La recherche de personne dépend de l’écran Arbre ; il n’existe pas de recherche globale.
2. L’accueil rend trop de destinations de même importance visibles en même temps.
3. Une photo détaillée ne propose pas de passage plein écran explicite alors que le zoom existe dans d’autres contextes.
4. La page photo ne transforme pas encore ses métadonnées en portes vers personnes, lieu, période et album.
5. Les photos d’une personne sont accessibles, mais le bouton Album est l’un des derniers onglets de la fiche.
6. Le contexte de navigation photo (album, personne, année) n’est pas conservé pour passer à l’image suivante.
7. La carte et la chronologie n’échangent pas encore une période commune.
8. Les actions de contribution sont sûres mais fragmentées ; aucune boîte de classement pour les imports volumineux n’est présente.
9. Les composants `FilAriane` et palette de commandes générale existent, mais ne sont pas raccordés aux parcours généraux.
10. Les tests visuels authentifiés mobile/tablette/desktop restent à automatiser ou à exécuter avec une session de démonstration.

## Composants à préserver

- `BarreParente`, `SectionMiniArbre` et `NavigationContextuelle` : ils font déjà de la fiche un graphe parcourable.
- `AlbumPersonne` : deux modes compréhensibles, filtres simples et mémorisation locale des préférences.
- `VisionneusePhoto` : zoom, pincement, déplacement, Échap et contrôle clavier déjà présents.
- Navigation active, tiroir mobile, thèmes, cibles de 44 px et composants d’onglets accessibles.
- Sources, niveaux de preuve et bandeau des personnes vivantes : aucune amélioration immersive ne doit les écarter.

## Composants ou capacités à faire évoluer

| Priorité | Capacité | Décision |
| --- | --- | --- |
| UX P1 | Photo détaillée | Ajouter une entrée plein écran explicite et cohérente avec la visionneuse existante. |
| UX P1 | Recherche globale | Raccorder la palette existante à la navigation, puis étendre son index par étapes. |
| UX P1 | Fiche personne | Raccourcir le chemin vers Album / chronologie avec une action primaire selon le contenu disponible. |
| UX P2 | Contexte photo | Conserver collection, personne ou période pendant la navigation entre images. |
| UX P2 | Albums et import | Concevoir sélection multiple, classement et actions de masse avant toute implémentation. |
| UX P3 | Animations | Réserver des transitions courtes aux confirmations d’action ; respecter `prefers-reduced-motion`. |

## Priorités retenues

1. **EXP-UX-001 — Photo détaillée, plein écran accessible.** Impact 8/10, complexité 2/10, risque 2/10. La visionneuse est déjà éprouvée dans l’album ; il faut la rendre accessible depuis la page détail avec un contrôle visible.
2. **EXP-UX-002 — Recherche réellement globale.** Impact 10/10, complexité 5/10, risque 4/10. Réutiliser la palette existante, sans charger ni divulguer de données hors RLS.
3. **EXP-UX-003 — Fiche centrée sur la prochaine exploration.** Impact 9/10, complexité 4/10, risque 3/10. Un raccourci dynamique vers album, chronologie ou sources, selon ce qui existe.

## Critères avant/après du premier lot

- Avant : ouvrir une photo détaillée puis l’agrandir n’est pas une action clairement offerte.
- Après : un bouton nommé et un clic sur l’image ouvrent la visionneuse ; fermeture avec Échap, clic extérieur ou bouton « Fermer ».
- Aucun nouveau chargement de données, aucune écriture, aucun changement de permissions ni de lien signé.
- À vérifier avec un compte membre : 390, 430, 768, 1024, 1440 et 1920 px ; souris, tactile et clavier.
