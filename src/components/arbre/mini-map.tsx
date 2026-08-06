'use client';

/**
 * Mini-carte de repérage, posée en bas à droite de l'arbre.
 *
 * Version compacte sur mobile pour se repérer sans masquer les cartes.
 */

import { useCallback, useMemo, useRef } from 'react';
import type { Disposition } from '@/lib/layout-arbre';
import { HAUTEUR_NOEUD } from '@/lib/layout-arbre';

const TAILLES = {
  normal: { largeur: 200, hauteur: 150, marge: 6, rayon: 1.6, rayonFocus: 2.5 },
  compact: { largeur: 120, hauteur: 88, marge: 4, rayon: 1.2, rayonFocus: 2 },
} as const;

const COULEUR_COTE = {
  paternelle: 'var(--paternelle)',
  maternelle: 'var(--maternelle)',
  commune: 'var(--commune)',
} as const;

type Transform = { x: number; y: number; k: number };

export function MiniMap({
  disposition,
  transform,
  tailleVue,
  onDeplacer,
  focusId,
  variante = 'normal',
}: {
  disposition: Disposition;
  transform: Transform;
  tailleVue: { largeur: number; hauteur: number };
  onDeplacer: (mondeX: number, mondeY: number) => void;
  focusId: string | null;
  variante?: keyof typeof TAILLES;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { largeur: LARGEUR_MINIATURE, hauteur: HAUTEUR_MINIATURE, marge: MARGE, rayon, rayonFocus } =
    TAILLES[variante];

  const echelle = useMemo(() => {
    const largeurDisponible = LARGEUR_MINIATURE - MARGE * 2;
    const hauteurDisponible = HAUTEUR_MINIATURE - MARGE * 2;
    return Math.min(
      largeurDisponible / Math.max(disposition.largeur, 1),
      hauteurDisponible / Math.max(disposition.hauteur + HAUTEUR_NOEUD, 1)
    );
  }, [disposition.largeur, disposition.hauteur, LARGEUR_MINIATURE, HAUTEUR_MINIATURE, MARGE]);

  const decalageX = (LARGEUR_MINIATURE - disposition.largeur * echelle) / 2;
  const decalageY = (HAUTEUR_MINIATURE - (disposition.hauteur + HAUTEUR_NOEUD) * echelle) / 2;

  const cadre = useMemo(() => {
    if (transform.k === 0) return null;
    const mondeX = -transform.x / transform.k;
    const mondeY = -transform.y / transform.k;
    const mondeLargeur = tailleVue.largeur / transform.k;
    const mondeHauteur = tailleVue.hauteur / transform.k;
    return {
      x: decalageX + mondeX * echelle,
      y: decalageY + mondeY * echelle,
      largeur: mondeLargeur * echelle,
      hauteur: mondeHauteur * echelle,
    };
  }, [transform, tailleVue, echelle, decalageX, decalageY]);

  const deplacerDepuisCoordonnees = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const miniX = clientX - rect.left;
      const miniY = clientY - rect.top;
      const mondeX = (miniX - decalageX) / echelle;
      const mondeY = (miniY - decalageY) / echelle;
      onDeplacer(mondeX, mondeY);
    },
    [decalageX, decalageY, echelle, onDeplacer]
  );

  const deplacerDepuisMiniature = useCallback(
    (evenement: React.MouseEvent<SVGSVGElement>) => {
      deplacerDepuisCoordonnees(evenement.clientX, evenement.clientY);
    },
    [deplacerDepuisCoordonnees]
  );

  const surGlisse = useCallback(
    (evenement: React.MouseEvent<SVGSVGElement>) => {
      if (evenement.buttons !== 1) return;
      deplacerDepuisMiniature(evenement);
    },
    [deplacerDepuisMiniature]
  );

  const surTouch = useCallback(
    (evenement: React.TouchEvent<SVGSVGElement>) => {
      const touch = evenement.touches[0];
      if (!touch) return;
      evenement.preventDefault();
      deplacerDepuisCoordonnees(touch.clientX, touch.clientY);
    },
    [deplacerDepuisCoordonnees]
  );

  return (
    <div
      className="carte pointer-events-auto overflow-hidden"
      style={{ width: LARGEUR_MINIATURE, height: HAUTEUR_MINIATURE }}
      aria-label="Mini-carte de l'arbre"
      role="img"
    >
      <svg
        ref={svgRef}
        width={LARGEUR_MINIATURE}
        height={HAUTEUR_MINIATURE}
        onMouseDown={deplacerDepuisMiniature}
        onMouseMove={surGlisse}
        onTouchStart={surTouch}
        onTouchMove={surTouch}
        className="cursor-crosshair touch-none"
      >
        <rect width={LARGEUR_MINIATURE} height={HAUTEUR_MINIATURE} fill="var(--fond-doux)" />

        <g>
          {disposition.noeuds.map((noeud) => {
            const cx = decalageX + noeud.x * echelle;
            const cy = decalageY + (noeud.y + HAUTEUR_NOEUD / 2) * echelle;
            const estFocus = noeud.personneId === focusId;
            return (
              <circle
                key={noeud.personneId}
                cx={cx}
                cy={cy}
                r={estFocus ? rayonFocus : rayon}
                fill={estFocus ? 'var(--accent)' : COULEUR_COTE[noeud.cote]}
                opacity={estFocus ? 1 : 0.75}
              />
            );
          })}
        </g>

        {cadre && (
          <rect
            x={cadre.x}
            y={cadre.y}
            width={cadre.largeur}
            height={cadre.hauteur}
            fill="var(--accent)"
            fillOpacity={0.08}
            stroke="var(--accent)"
            strokeWidth={1.2}
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}
