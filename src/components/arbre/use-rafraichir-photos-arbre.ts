'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { GrapheSerialise } from '@/lib/arbre-graphe';

const INTERVALLE_RAFRAICHISSEMENT_MS = 45 * 60 * 1000;
const DELAI_DEBOUNCE_MS = 250;
const TAILLE_LOT = 120;

/**
 * Signe les portraits visibles dans la disposition courante, puis les renouvelle
 * avant expiration (1 h). Évite de signer tout le graphe au chargement serveur.
 */
export function useRafraichirPhotosArbre(
  graphe: GrapheSerialise,
  onGraphe: (graphe: GrapheSerialise) => void,
  idsVisibles: readonly string[]
) {
  const grapheRef = useRef(graphe);
  const idsVisiblesRef = useRef(idsVisibles);

  useEffect(() => {
    grapheRef.current = graphe;
  }, [graphe]);

  useEffect(() => {
    idsVisiblesRef.current = idsVisibles;
  }, [idsVisibles]);

  const requeteCourante = useRef(0);

  const appliquerUrls = useCallback(
    (urls: Record<string, string | null>) => {
      if (Object.keys(urls).length === 0) return;
      onGraphe({
        ...grapheRef.current,
        personnes: grapheRef.current.personnes.map((personne) =>
          urls[personne.id] !== undefined
            ? { ...personne, photoUrl: urls[personne.id] ?? null }
            : personne
        ),
      });
    },
    [onGraphe]
  );

  const signerLot = useCallback(
    async (ids: string[], forcer: boolean, jeton: number) => {
      const grapheActuel = grapheRef.current;
      const aSigner = [...new Set(ids)].filter((id) => {
        const personne = grapheActuel.personnes.find((p) => p.id === id);
        if (!personne?.photoId) return false;
        return forcer || !personne.photoUrl;
      });
      if (aSigner.length === 0) return;

      const urls: Record<string, string | null> = {};

      for (let offset = 0; offset < aSigner.length; offset += TAILLE_LOT) {
        if (jeton !== requeteCourante.current) return;

        const lot = aSigner.slice(offset, offset + TAILLE_LOT);
        try {
          const reponse = await fetch('/api/arbre/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: lot }),
          });
          if (!reponse.ok) return;
          const corps = (await reponse.json()) as { urls?: Record<string, string | null> };
          if (!corps.urls) return;
          Object.assign(urls, corps.urls);
        } catch {
          return;
        }
      }

      if (jeton !== requeteCourante.current) return;
      appliquerUrls(urls);
    },
    [appliquerUrls]
  );

  const signerVisibles = useCallback(
    (forcer: boolean) => {
      const jeton = ++requeteCourante.current;
      void signerLot([...idsVisiblesRef.current], forcer, jeton);
    },
    [signerLot]
  );

  const cleVisibles = [...new Set(idsVisibles)].sort().join(',');

  const manquePhotosVisibles = useMemo(() => {
    const parId = new Map(graphe.personnes.map((p) => [p.id, p]));
    return idsVisibles.some((id) => {
      const personne = parId.get(id);
      return Boolean(personne?.photoId && !personne.photoUrl);
    });
  }, [graphe, idsVisibles]);

  useEffect(() => {
    const id = window.setTimeout(() => signerVisibles(false), DELAI_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [cleVisibles, manquePhotosVisibles, signerVisibles]);

  useEffect(() => {
    const minuteur = window.setInterval(() => signerVisibles(true), INTERVALLE_RAFRAICHISSEMENT_MS);
    return () => window.clearInterval(minuteur);
  }, [signerVisibles]);
}
