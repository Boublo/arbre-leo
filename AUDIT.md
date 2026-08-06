# Audit complet — L'arbre de Léo

Dernière mise à jour : 6 août 2026 — **v1–v5** (sécurité, lisibilité, immersion, assistance, densification arbre).

> Revue senior du 6 août 2026 : voir le rapport d'audit cloud agent.
> Correctifs v1–v5 appliqués.

---

## Correctifs v1 (août 2026)

```
✓ S1  fusionner_personnes / fusionner_unions : est_admin() + revoke anon (0015 + prod)
✓ D1  Migrations 0009–0015 versionnées dans le dépôt (récits, fusion, unaccent)
✓ AX1 Contraste --encre-tres-douce porté à WCAG AA
✓ U5  Thème clair par défaut (plus de suivi OS automatique)
✓ P2  React.cache sur chargerArbre + option signerPhotosPour: 'aucun'
✓ S4  Headers sécurité (CSP, frame-ancestors, nosniff…) dans next.config.ts
✓     .env.example versionné (!.env.example dans .gitignore)
```

## Correctifs v2 (août 2026)

```
✓ U1  Hero accueil allégé (composition marque + CTA ; reste sous la ligne)
✓ U2  Navigation groupée Raconter / Chercher / Outils (+ clavier menu Plus)
✓ P3  DTO arbre sans notes + dynamic import EcranArbre
✓ S2  Storage SELECT restreint + préfixe {userId}/ à l’upload (0016)
✓ S3  Tables liées aux fiches confidentielles filtrées (0016)
✓ AX3 Flèches clavier sur l’arbre (voisin spatial)
```

## Correctifs v3 (août 2026)

```
✓ Immersion  Chapitre « Sur la route » (faits nationaux + récit vedette)
✓ Immersion  /archives — bibliothèque d’actes cross-personnes
✓ Immersion  Motions douces frise + pastilles carte (respect reduced-motion)
✓ SEO privé  metadataBase + Open Graph / Twitter génériques (noindex conservé)
```

## Correctifs v4 (août 2026)

```
✓ Admin   Rapport de cohérence déterministe (dates, filiations, doublons)
✓ Fiche   Résumé de branche sourcé sur le graphe (pas d’invention)
✓ IA      Action admin `genererResumeBrancheIa` + hook `ARBRE_IA_CLE` (fallback déterministe)
✓ Actes   Transcription étiquetée « brouillon » — scaffold OCR sans pipeline
✓ CLI     `npm run arbre:diag` (script déjà présent, alias documenté)
```

## Correctifs v5 (août 2026) — lisibilité de l’arbre

```
✓ Densité   ESPACEMENT_X/Y resserrés ; cousins moins écartés ; collision −12 px
✓ Traits    Pedigree en encre douce 2.5 px ; descente depuis la barre de couple
✓ Centrage  Recentrage fratrie + re-colle couples (plus d’enfant qui flotte)
✓ Zoom      recadrer à k ≈ 1.0–1.05 ; noms de cartes un peu plus grands
✓ Cadre     Bbox aligné sur les bords de cartes (moins de vide asymétrique)
✓ Ambiance  Fond parchemin vivant (grain, lavis, points d’encre, parallaxe)
```

---

## Résumé exécutif

| Zone | Verdict | Problème principal |
| --- | --- | --- |
| **Liens de l'arbre** | Bon | Pedigree contacte les cartes ; couples atomiques ; fratrie centrée |
| **Cartes personnes** | Bon | Portraits OK ; badge « Fratrie » + contour plein |
| **Site global** | Bon | 32 routes, auth, navigation améliorées |
| **Performance `/arbre`** | Acceptable | Graphe complet (nécessaire à l'ascendance) + refresh photos |
| **Tests auto** | Bon | Suite `npm run arbre:verifier` (9 checks + CI) |

### Correctifs appliqués (audit)

```
✓ C1  Fratrie : contour plein + pastille « FRATRIE » ; conjoint : pointillé
✓ C2  Layout famille : rapprocherConjointsSurRang après chaque rangée
✓ C3  (suit C2) + pas de barre dorée horizontale si distance > 320 px
✓ H1  Mode par défaut « La famille autour », mémorisé dans localStorage
✓ H2  Refresh photos /api/arbre/photos (sous-graphe retiré : tronquait l'ascendance)
✓ H4  URL ?suite= conservée vers /attente pour les membres en attente
✓ M1  Couples = blocs atomiques (personne ne s'intercale entre époux)
✓ M3  Mode éclaté : pedigree pour rangs adjacents ; L seulement hors adjacence
✓ M4  Barre de fratrie minimale (20 px) pour enfant unique
✓ M5  Médias filtrés par photo_id référencés (plus de scan de tout le bucket)
✓ M2  Badge COUSIN distinct de FRATRIE (lien + cartes + légende)
✓ M6  Repères repliables + mini-carte compacte sur mobile
✓ H3  Test géométrie Laura via layout TS réel (scripts/test-geometrie-laura.ts)
✓ C3  Recentrage fratries sous couples après collision (recentererFratriesSousCouples)
✓     Ascendance : trait parent collé au haut de carte + parents centrés sous fratrie
```

---

## Architecture de l'arbre (4 modes)

| Mode | Fichier layout | Liens couple (or) | Liens pedigree (barre fratrie) | Fallback orthogonal |
| --- | --- | --- | --- | --- |
| D'où il vient | `disposerHierarchie` asc | Si même rangée + ≤248 px | Si rang adjacent + parents même rangée | Sinon |
| Ce qu'il a laissé | `disposerHierarchie` desc | Idem | Idem | Idem |
| **La famille autour** | `disposerFamille` | **Toujours** si 2 parents visibles | **Toujours** | Rare |
| Tout (éclaté) | `disposerEclate` | Même rangée + couples atomiques | Si rang adjacent + parents même rangée | Implexe / non adjacent |

Fichiers clés :
- `src/lib/layout-arbre.ts` — où sont posées les cartes
- `src/lib/geometrie-liens.ts` — comment sont tracés les traits
- `src/components/arbre/liens-arbre.tsx` — rendu SVG
- `src/components/arbre/carte-noeud.tsx` — cartes portrait

---

## CRITIQUE — ce que l'utilisateur voit de travers

### C1 — Frère et conjoint : même apparence de carte

**Fichier :** `src/components/arbre/carte-noeud.tsx` (~l.109–110)

```tsx
strokeDasharray={noeud.lien === 'collateral' || noeud.lien === 'conjoint' ? '5 4' : undefined}
```

| Type | Signification | Style actuel |
| --- | --- | --- |
| `collateral` | Frère, sœur, cousin | Contour **pointillé** |
| `conjoint` | Époux, épouse | Contour **pointillé** (identique) |

**Symptôme :** Léo (frère) à côté de Laura a la même carte qu'un conjoint. Avec la barre dorée dans la légende, l'utilisateur conclut « mon frère est avec Laura ».

**Correction :** Contour **plein** + pastille « frère/sœur » pour `collateral` ; pointillé réservé au conjoint. Mettre à jour `legende.tsx`.

---

### C2 — Conjoints éloignés : barre dorée traversante (mode famille)

**Fichiers :** `src/lib/layout-arbre.ts` (`disposerFamille`), `src/lib/geometrie-liens.ts` (`segmentsCouple`, `planifierLiens`)

**Cause :** En mode « famille autour », le layout place chaque personne sous **ses propres parents**, pas **à côté de son conjoint**. Les cousins sur la même rangée écartent encore les fratries. Résultat : deux époux peuvent être à 400–600 px l'un de l'autre.

Le tracé dessine alors un **pont doré** ( deux verticals + horizontal ) sur toute la largeur, **sous** les cartes des oncles/cousins intermédiaires.

**Scénario type (Laura, focus, mode famille) :**

```
Rang parents :  [Pierre]───────[Paul oncle]───────[Sophie]
                      \         (cartes entre)         /
Barre dorée :   ═══════════════════════════════════════  ← traverse tout
Rang enfants :              [Julie]    [Laura]──[Léo]
```

**Symptôme :** Trait doré sous Paul → on croit que Paul est marié à Pierre ou Sophie.

**Correction (layout, pas seulement liens) :**
1. Après placement d'une rangée, **rapprocher les conjoints** (comme `ordonnerCoucheEclate` le fait déjà partiellement).
2. Recentrer les fratries sous le couple **après** rapprochement.
3. Si distance > seuil : **ne pas** tracer de barre horizontale longue ; deux tiges depuis chaque conjoint seulement.

---

### C3 — Décalage centre parents ↔ centre enfants (spaghetti)

**Fichiers :** `layout-arbre.ts` + `geometrie-liens.ts` (`raccord-*`)

Même scénario Laura : parents centrés à x≈300, enfants Laura+Léo à x≈708 → raccord horizontal de **400 px** sur la couche intermédiaire.

**Symptôme :** Le trait de filiation ne descend pas « sous les parents puis vers les enfants » : il traverse des colonnes entières de personnes non concernées.

**Correction :** Liée à C2 — si les conjoints sont côte à côte et les enfants centrés dessous, Δx tombe sous ~120 px.

---

## HAUTE priorité

### H1 — Mode par défaut = ascendance, pas « famille autour »

**Fichier :** `src/components/arbre/ecran-arbre.tsx` l.32

```tsx
const [mode, setMode] = useState<ModeArbre>('ascendance');
```

**Symptôme :** On arrive sur l'arbre en « D'où il vient » — pas de cousins, fratrie réduite. L'utilisateur ne voit pas « toute la famille » et les liens paraissent incomplets.

**Correction :** Défaut `'famille'` ou mémoriser le dernier mode dans `localStorage`.

---

### H2 — Graphe entier envoyé au navigateur

**Fichiers :** `src/app/arbre/page.tsx`, `src/lib/arbre-graphe.ts`, `src/lib/arbre.ts`

Chaque visite de `/arbre` sérialise **toutes** les personnes, unions, listes d'adjacence, et URLs photo signées (1 h).

**Symptôme :** Chargement lent sur mobile ; onglet ouvert >1 h → photos cassées (URLs expirées).

**Correction :** Sous-graphe serveur (focus ±3 générations) ; re-signer les photos visibles à la demande.

---

### H3 — Scripts de vérification insuffisants

**Fichiers :** `scripts/verifier-*.mjs`

Ils vérifient que certains **noms de fonctions existent** dans le code, pas que la géométrie est correcte.

**Symptôme :** Régressions visuelles (C1, C2) passent tous les scripts « OK ».

**Correction :** Ajouter `verifier-geometrie-arbre.mjs` avec graphe Laura fixture + seuils (longueur barre couple < 300 px, Δx parents-enfants < 150 px).

---

### H4 — Membre en attente perd le lien profond

**Fichier :** `src/proxy.ts`

Redirection vers `/attente` sans conserver `?suite=/arbre?personne=…`.

**Symptôme :** Lien « voir Laura dans l'arbre » → inscription → attente → accueil (pas Laura).

---

## MOYENNE priorité

| ID | Problème | Fichier | Correction |
| --- | --- | --- | --- |
| M1 | `ecarterCollisions` sépare des conjoints déjà adjacents | `layout-arbre.ts` | **Corrigé** — couples = unités atomiques |
| M2 | Cousin et frère : même `lien: collateral` | `layout-arbre.ts` | **Corrigé** — sous-type `cousin` + badges |
| M3 | Mode éclaté : que des L orthogonaux, illisible | `geometrie-liens.ts` | **Corrigé** — pedigree si rang adjacent |
| M4 | Enfant unique : barre fratrie invisible (x1=x2) | `geometrie-liens.ts` | **Corrigé** — barre min 20 px |
| M5 | `chargerArbre()` charge **toutes** les photos médias | `arbre.ts` | **Corrigé** — filtre `photo_id` |
| M6 | Mobile : pas de mini-carte, repères gauche larges | `vue-arbre.tsx`, `reperes-rang.tsx` | **Corrigé** |
| M7 | Photos : initiales si pas de `photoUrl` | Normal | Déposer portraits via fiche / arbre |

---

## FAIBLE priorité / déjà corrigé

| Sujet | État |
| --- | --- |
| Erreurs connexion (`?erreur=`) | Corrigé |
| Thème sombre 1ère visite | Corrigé |
| Navigation Parenté + Export | Corrigé |
| Skip link, error.tsx, loading.tsx | Corrigé |
| Focus clavier arbre (1 tab stop) | Corrigé |
| Vignettes avec mini-portrait | Corrigé |
| Routage liens en 2 couches (dernier fix) | Amélioré, insuffisant sans C2 |

---

## Matrice layout ↔ tracé (quand ça diverge)

| Situation | Layout | Tracé | Problème visuel |
| --- | --- | --- | --- |
| Conjoints ≤248 px, même rangée | Côte à côte | Barre or inline | OK |
| Conjoints >248 px, mode famille | Loin | Pont doré long | **C2** |
| Fratrie + cousins même rangée | Groupes écartés | Raccord long | **C3** |
| Frère à côté du focus | `collateral` | — | **C1** (style) |
| 1 parent visible | 1 carte | Pedigree solo | OK |
| Implexe (éclaté) | BFS | Pedigree si adjacent, sinon L | OK |

---

## Scénarios de test manuels

### 1. Laura + Léo + Julie (focus Laura, « La famille autour »)

- [x] Léo identifiable comme **frère** (pas contour conjoint)
- [x] Barre dorée parents **courte** (entre Pierre et Sophie seulement)
- [x] Trait vers Laura+Léo **vertical sous les parents**, pas diagonal 400 px
- [x] Julie groupée sous Paul, **sans** trait la traversant
- [x] Paul **hors** du couple Pierre–Sophie (couples atomiques)

### 2. Focus Léo, ascendance

- [ ] Fratrie Laura visible si mode famille ; ascendance seule = parents directs
- [ ] Frères/sœurs : contour distinct du conjoint

### 3. Onglet ouvert 2 h

- [ ] Photos toujours visibles (ou initiales de repli)

### 4. Membre `en_attente` clique lien `/arbre?personne=…`

- [ ] Après validation, arrive sur la bonne personne

---

## Modules — maturité (site entier)

| Module | Note | Commentaire |
| --- | --- | --- |
| Arbre | ★★★★☆ | Cartes, liens famille/éclaté, couples atomiques, garde-fous CI |
| Fiche personne | ★★★★☆ | Riche, dépôt photo/acte |
| Chronologie / Carte | ★★★★☆ | Solide |
| Souvenirs / Récits | ★★★★☆ | Solide |
| Export / Parenté / Admin | ★★★★☆ | OK |
| Performance globale | ★★★☆☆ | `chargerArbre()` partout |

---

## Ordre de correction recommandé

```
1. C1  Style cartes : frère ≠ conjoint (+ légende)
2. C2  Layout famille : rapprocher les conjoints après chaque rangée
3. C3  (suit C2)       Recentrer fratries ; raccourcir raccords
4. H3  Tests géométrie automatisés (fixture Laura)
5. H1  Mode défaut « famille autour »
6. H2  Sous-graphe + refresh photos
7. H4  Suite URL pour membres en attente
```

---

## Commandes

```bash
npm run build
npm run arbre:verifier                   # suite anti-régression complète
npm run arbre:diag                       # santé base (membre + RLS)
node scripts/verifier-liens-famille.mjs  # grep symboles (insuffisant seul)
node scripts/verifier-navigation-arbre.mjs
node scripts/verifier-panneau-arbre.mjs
```

---

## Sécurité (inchangé)

RLS actif, `noindex`, export filtré, admin gardé côté serveur. Pas de faille critique identifiée côté auth (hors perte de deep link H4).
