'use client';

/**
 * Fond discret pour l'arbre : grain de papier + grille de petits points.
 * Pas de grandes taches colorées — elles masquaient les traits de filiation.
 */

import { useEffect, useMemo, useState } from 'react';

type Transform = { x: number; y: number; k: number };

export function FondAtmospherique({ transform }: { transform: Transform }) {
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
    const synchroniser = () => setReduit(requete.matches);
    synchroniser();
    requete.addEventListener('change', synchroniser);
    return () => requete.removeEventListener('change', synchroniser);
  }, []);

  const parallaxe = useMemo(() => {
    if (reduit) return { x: 0, y: 0 };
    const facteur = 0.02;
    return {
      x: Math.max(-8, Math.min(8, transform.x * facteur)),
      y: Math.max(-6, Math.min(6, transform.y * facteur)),
    };
  }, [transform.x, transform.y, reduit]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'var(--fond)',
          backgroundImage: 'var(--texture-papier, none)',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Grille de petits points — seul motif de fond, très léger. */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{
          transform: `translate(${parallaxe.x}px, ${parallaxe.y}px)`,
          transition: reduit ? undefined : 'transform 0.6s ease-out',
        }}
      >
        <defs>
          <pattern id="fond-arbre-points" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.85" fill="var(--bordure-forte)" opacity="0.22" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#fond-arbre-points)" />
      </svg>
    </div>
  );
}
