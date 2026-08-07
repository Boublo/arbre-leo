'use client';

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

/** Position d’un panneau ancré sous un élément (coordonnées viewport). */
export type PositionMenuAncre = {
  top: number;
  left?: number;
  width?: number;
  right?: number;
};

export type OptionsMenuAncre = {
  /** Aligner le bord droit du menu sur l’ancre (cloche de notifications). */
  aligner?: 'gauche' | 'droite';
  /** Reprendre la largeur de l’ancre (champs de recherche). */
  largeurAncre?: boolean;
};

/**
 * Suit la position d’une ancre pendant qu’un menu flottant est ouvert.
 * Le panneau est rendu en portal `fixed` pour échapper aux `overflow: hidden`
 * et aux calques du canevas SVG.
 */
export function useMenuAncre(
  ouvert: boolean,
  ancreRef: RefObject<HTMLElement | null>,
  options: OptionsMenuAncre = {}
): { menuRef: RefObject<HTMLElement | null>; position: PositionMenuAncre } {
  const menuRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<PositionMenuAncre>({ top: 0, left: 0 });

  useEffect(() => {
    if (!ouvert || !ancreRef.current) return;

    function mettreAJour() {
      const rect = ancreRef.current!.getBoundingClientRect();
      if (options.aligner === 'droite') {
        setPosition({
          top: rect.bottom + 4,
          right: Math.max(8, window.innerWidth - rect.right),
          ...(options.largeurAncre ? { width: rect.width } : {}),
        });
        return;
      }

      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        ...(options.largeurAncre ? { width: rect.width } : {}),
      });
    }

    mettreAJour();
    window.addEventListener('resize', mettreAJour);
    window.addEventListener('scroll', mettreAJour, true);
    return () => {
      window.removeEventListener('resize', mettreAJour);
      window.removeEventListener('scroll', mettreAJour, true);
    };
  }, [ouvert, ancreRef, options.aligner, options.largeurAncre]);

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

/** Styles inline pour un panneau porté à partir d’une position calculée. */
export function styleMenuAncre(position: PositionMenuAncre): CSSProperties {
  return {
    top: position.top,
    left: position.left,
    right: position.right,
    width: position.width,
  };
}
