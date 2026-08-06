'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { GrapheSerialise } from '@/lib/arbre-graphe';

const INTERVALLE_RAFRAICHISSEMENT_MS = 45 * 60 * 1000;

/** Renouvelle les URL signées des portraits avant expiration (1 h). */
export function useRafraichirPhotosArbre(
  graphe: GrapheSerialise,
  onGraphe: (graphe: GrapheSerialise) => void
) {
  const grapheRef = useRef(graphe);
  grapheRef.current = graphe;

  const rafraichir = useCallback(async () => {
    const ids = grapheRef.current.personnes
      .filter((p) => p.photoId)
      .map((p) => p.id);
    if (ids.length === 0) return;

    try {
      const reponse = await fetch('/api/arbre/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!reponse.ok) return;
      const { urls } = (await reponse.json()) as { urls?: Record<string, string | null> };
      if (!urls || Object.keys(urls).length === 0) return;

      onGraphe({
        ...grapheRef.current,
        personnes: grapheRef.current.personnes.map((p) =>
          urls[p.id] !== undefined ? { ...p, photoUrl: urls[p.id] ?? null } : p
        ),
      });
    } catch {
      /* réseau indisponible — on réessaiera au prochain cycle */
    }
  }, [onGraphe]);

  useEffect(() => {
    const minuteur = window.setInterval(rafraichir, INTERVALLE_RAFRAICHISSEMENT_MS);
    return () => window.clearInterval(minuteur);
  }, [rafraichir]);
}
