# Conventions du projet

Contrat commun à tout code ajouté à « L'arbre de Léo ». À lire avant d'écrire.

## Ce qu'est ce projet

Un arbre généalogique familial, privé, où la famille élargie dépose souvenirs
et photos. Une centaine de personnes sur neuf générations, deux branches
d'ascendance qui se rejoignent en un enfant : le côté **paternel**, dont une
partie vient d'Espagne puis d'Algérie française, et le côté **maternel**, de
l'ouest de la France et des Alpes.

Une partie de ces personnes sont vivantes. Le ton est celui d'un livre de
famille : sobre, précis, jamais familier ni bavard.

Aucun nom réel, aucune date de naissance, aucun lieu rattaché à une personne
identifiée ne doit apparaître dans le code : ce dépôt est public, les données
vivent uniquement en base.

## Langue

**Tout est en français** : noms de fichiers, de variables, de fonctions, de
routes, commentaires, textes affichés. `chargerSouvenirs`, pas `loadMemories`.
Les mots anglais imposés par le framework (`page.tsx`, `layout.tsx`, `useState`)
restent tels quels.

Apostrophes typographiques (`’`) dans les textes affichés. En JSX, échapper :
`l&apos;arbre`.

## Pile technique

- Next.js 16 (App Router, Turbopack) — **`middleware.ts` s'appelle `proxy.ts`**
- `params`, `searchParams` et `cookies()` sont **asynchrones** : les `await`
- React 19 : `useActionState`, `useFormStatus` pour les formulaires
- Tailwind 4 (`@theme` dans `globals.css`, pas de `tailwind.config`)
- Supabase — schéma **`arbre`**, jamais `public`
- Aucune bibliothèque supplémentaire sans nécessité. D3 (`d3-zoom`,
  `d3-selection`) est déjà là pour l'arbre. Pas de bibliothèque de cartographie :
  la carte est dessinée en SVG.

## Accès aux données

```ts
import { creerClientServeur } from '@/lib/supabase/server';   // Server Components, Actions
import { creerClientNavigateur } from '@/lib/supabase/client'; // Client Components
```

Le schéma `arbre` est déjà configuré dans ces clients : écrire
`.from('personnes')`, jamais `.from('arbre.personnes')`.

Types : `@/lib/types-base`. Chargement de l'arbre : `@/lib/arbre`
(`chargerArbre`, `trouverRacine`, `formaterDate`, `lieuCourt`).

## Sécurité — non négociable

- Les politiques RLS font foi. **Ne jamais contourner la base pour élargir un
  accès** ; si une requête ne renvoie rien, c'est probablement normal.
- Toute page privée suppose un membre au statut `valide` : `proxy.ts` s'en
  charge, ne pas le refaire, mais ne jamais supposer qu'un contrôle client suffit.
- Les fichiers du bucket `arbre-medias` sont privés : passer par
  `createSignedUrl`, jamais `getPublicUrl`.
- Toute saisie utilisateur est validée par **zod** dans la Server Action.
- Aucune donnée familiale en dur dans le code : ni nom, ni date, ni photo.
  Ce dépôt est public.

## Style

Palette dans `globals.css` : `fond`, `fond-carte`, `fond-doux`, `encre`,
`encre-douce`, `encre-tres-douce`, `bordure`, `bordure-forte`, `accent`, `or`,
`paternelle`, `maternelle`, `succes`, `alerte`, `erreur`.

En classes Tailwind : `bg-fond-carte`, `text-encre-douce`, `border-bordure`.
Utilitaires : `carte` (encadré), `lien-discret`.

**Jamais de couleur en dur** (`#fff`, `text-gray-500`, `bg-white`) : les deux
thèmes clair et sombre doivent tenir.

Composants prêts : `@/components/ui/champs` → `Champ`, `ZoneTexte`,
`BoutonEnvoi`, `Alerte`.

Titres en `var(--font-titre)`, appliqué par défaut à `h1`…`h4`.

## Accessibilité

Contenu en français (`lang="fr"` posé à la racine). Tout contrôle a un nom
accessible. La navigation au clavier doit fonctionner : une partie de la famille
est âgée. Ne jamais transmettre une information par la seule couleur.

## Interdits

- Ne pas modifier : `src/proxy.ts`, `src/lib/supabase/*`, `src/lib/types-base.ts`,
  `src/lib/arbre.ts`, `src/lib/layout-arbre.ts`, `src/components/navigation.tsx`,
  `src/app/layout.tsx`, `src/app/globals.css`, `supabase/migrations/*`.
  Si un besoin l'exige, le signaler dans le compte rendu plutôt que de le faire.
- Ne pas créer de migration SQL : décrire le besoin dans le compte rendu.
- Ne pas toucher aux fichiers d'un autre module que le sien.
- Ne pas ajouter de dépendance npm.

## Vérification

Le code doit passer `npx tsc --noEmit` sans erreur **sur les fichiers du
module**. Ne pas lancer `npm run build` (plusieurs modules sont écrits en
parallèle, le build échouerait sur le travail des autres).
