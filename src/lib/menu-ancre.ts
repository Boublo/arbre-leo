'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/** Position d’un panneau ancré sous un bouton (coordonnées viewport). */
export type PositionMenuAncre = { top: number; left: number };

/**
 * Suit la position d’une ancre pendant qu’un menu flottant est ouvert.
 * Le panneau est rendu en portal `fixed` pour échapper aux `overflow: hidden`
 * et aux calques du canevas SVG.
 */
export function useMenuAncre(
  ouvert: boolean,
  ancreRef: RefObject<HTMLElement | null>
): { menuRef: RefObject<HTMLDivElement | null>; position: PositionMenuAncre } {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<PositionMenuAncre>({ top: 0, left: 0 });

  useEffect(() => {
    if (!ouvert || !ancreRef.current) return;

    function mettreAJour() {
      const rect = ancreRef.current!.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    }

    mettreAJour();
    window.addEventListener('resize', mettreAJour);
    window.addEventListener('scroll', mettreAJour, true);
    return () => {
      window.removeEventListener('resize', mettreAJour);
      window.removeEventListener('scroll', mettreAJour, true);
    };
  }, [ouvert, ancreRef]);

  return { menuRef, position };
}

/** Ferme au clic à l’extérieur de l’ancre et du panneau porté. */
export function useFermerMenuAncre(
  ouvert: boolean,
  onFermer: () => void,
  ancreRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!ouvert) return;

    function fermer(evenement: MouseEvent) {
      const cible = evenement.target as Node;
      if (ancreRef.current?.contains(cible)) return;
      if (menuRef.current?.contains(cible)) return;
      onFermer();
    }

    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [ouvert, onFermer, ancreRef, menuRef]);
}
