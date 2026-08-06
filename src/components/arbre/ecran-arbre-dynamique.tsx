'use client';

import nextDynamic from 'next/dynamic';

/**
 * Chargement différé de l’écran arbre côté client uniquement.
 *
 * `ssr: false` est interdit dans une Server Component (Next 16 / Turbopack) :
 * ce wrapper client porte le dynamic import pour ne pas envoyer le gros
 * graphe SVG au premier HTML.
 */
export const EcranArbreDynamique = nextDynamic(
  () => import('@/components/arbre/ecran-arbre').then((m) => m.EcranArbre),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex flex-1 items-center justify-center p-8 text-encre-douce"
        role="status"
        aria-live="polite"
      >
        Préparation de l’arbre…
      </div>
    ),
  }
);
