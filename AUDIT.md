# Audit complet — L'arbre de Léo

Audit réalisé le 6 août 2026. Ce document recense l'état du site, les problèmes identifiés et les actions menées ou restantes.

---

## Synthèse

| Domaine | État | Note |
| --- | --- | --- |
| Fonctionnel | Bon | 32 routes, rôles lecteur/contributeur/admin |
| Arbre interactif | Très bon | Cartes portrait, liens famille, dépôt photo/acte récents |
| Accessibilité | Moyen | Améliorations en cours (focus clavier, skip link) |
| Performance | À surveiller | Graphe complet envoyé au client sur `/arbre` |
| Découvrabilité | Amélioré | Parenté + Export ajoutés à la navigation |
| Thème sombre | Corrigé | Première visite respecte `prefers-color-scheme` |

---

## Routes (32)

### Cœur généalogique
- `/` — Accueil (chiffres, silhouettes, navigation)
- `/arbre` — Arbre interactif (4 modes)
- `/chronologie` — Frise familiale + Histoire
- `/carte` — Migrations géolocalisées
- `/parente` — Calculateur de parenté
- `/personne/[id]` — Fiche complète (onglets)
- `/personne/nouvelle`, `/modifier`, `/imprimer`
- `/personne/[id]/photo/nouveau`, `/acte/nouveau` — Dépôts récents

### Mémoire & récits
- `/souvenirs`, `/souvenirs/nouveau`, `/souvenirs/[id]`
- `/recits`, `/recits/nouveau`, `/recits/[id]`, `/modifier`
- `/histoire`, `/histoire/[id]`

### Outils & admin
- `/statistiques`, `/recherches`, `/nouveautes`, `/aujourdhui`
- `/export`, `/export/{gedcom,csv,json}`
- `/admin` — Modération membres

### Auth
- `/connexion`, `/inscription`, `/attente`, `/auth/callback`
- `/erreur` — Page d'erreur générique

---

## Corrections appliquées (PR audit)

### Critique
- [x] Messages d'erreur sur `/connexion` (`?erreur=lien_invalide|lien_expire`)
- [x] Frontière d'erreur globale `src/app/error.tsx`
- [x] Focus clavier arbre : un seul nœud tabulable (focus ou sélection)

### Haute priorité
- [x] Navigation : menu « Plus » (Parenté, Export, etc.)
- [x] Accueil : 9 cartes « Où aller » au lieu de 4
- [x] Thème sombre au premier chargement (script layout + OS)
- [x] Page `/erreur` créée
- [x] Skeleton `loading.tsx` global
- [x] Parenté : recherche par nom au lieu de `<select>` géant
- [x] Lien d'évitement « Aller au contenu principal »
- [x] `id="contenu-principal"` sur les `<main>`

### Moyenne priorité
- [x] Cibles tactiles 44 px (thème, nav desktop)
- [x] Couleurs hardcodées (`text-white`, `#211c17`) → tokens CSS
- [x] Texte vide recherche arbre corrigé

---

## Points restants (backlog)

### Performance
1. **`/arbre`** — Sérialiser un sous-graphe (focus ± N générations) plutôt que l'arbre entier.
2. **`chargerArbre()`** — Appelé sur accueil, fiche personne, parenté : mutualiser avec `React.cache()` ou requêtes légères.
3. **URLs photo signées** — Expirent après 1 h ; prévoir refresh si l'onglet reste ouvert longtemps.

### Accessibilité
4. **Onglets** — `barre-outils-arbre` et fiche personne : compléter `aria-controls` / `id` des panneaux.
5. **Audio/vidéo** — Lecteur inline dans `medias.tsx` (au lieu d'un simple lien).

### Cohérence visuelle
6. **`Vignette`** — Ajouter mini-portrait (photo ou initiale) comme les cartes arbre.
7. **`CarteSouvenir` / `CarteRecit`** — Liseré de branche harmonisé.

### SEO / partage (faible priorité — site `noindex`)
8. Favicon absent dans `public/`.
9. Descriptions Open Graph par page (partage iMessage entre proches).

### Infrastructure
10. **`Navigation`** — 3 requêtes Supabase à chaque page : cache par requête serveur.
11. Tests E2E — Scripts de vérif (`verifier-*.mjs`) existants ; pas de CI automatisée.

---

## Sécurité

| Élément | Statut |
| --- | --- |
| RLS Supabase | Actif (rôles membres) |
| `robots: noindex` | Correct pour site familial privé |
| Export filtré | Oui (vie privée, vivants) |
| Auth callback | Erreurs maintenant affichées |
| Admin guard | `exigerAdmin()` serveur |

---

## Modules — maturité

| Module | Maturité | Commentaire |
| --- | --- | --- |
| Arbre | ★★★★★ | Refonte cartes portrait, liens famille, dépôt photo |
| Fiche personne | ★★★★☆ | Onglets riches, dépôt acte/photo récent |
| Chronologie | ★★★★☆ | Frise + contexte historique |
| Carte | ★★★★☆ | Dépend du géocodage des lieux |
| Souvenirs | ★★★★☆ | Masonry, calendrier |
| Récits | ★★★★☆ | Markdown, patronymes |
| Statistiques | ★★★☆☆ | Solide, peu de graphiques avancés |
| Recherches | ★★★★☆ | Kanban chantiers |
| Export | ★★★★☆ | Fonctionnel, désormais dans le menu |
| Parenté | ★★★★☆ | Recherche améliorée |
| Admin | ★★★★☆ | Modération membres |

---

## Commandes utiles

```bash
npm run build          # Vérifier la compilation
npm run lint           # ESLint
node scripts/verifier-liens-famille.mjs
node scripts/verifier-navigation-arbre.mjs
node scripts/verifier-panneau-arbre.mjs
```

---

## Prochaine itération recommandée

1. Sous-graphe client pour `/arbre` (gain perf majeur)
2. Harmoniser `Vignette` avec portraits
3. Lecteurs audio/vidéo inline
4. Favicon + icône PWA légère
