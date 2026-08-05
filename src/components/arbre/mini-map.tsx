'use client';

/**
 * Mini-carte de repérage, posée en bas à droite de l'arbre.
 *
 * Elle rappelle en miniature la forme de la disposition entière — un point par
 * personne, tracé dans sa couleur de côté — et fait figurer par-dessus le
 * rectangle de la portion réellement visible à l'écran. Le rectangle bouge en
 * temps réel quand on zoome ou qu'on fait glisser l'arbre.
 *
 * Un clic ou un glissé dans la mini-carte recentre la vue sur le point pointé.
 * Aucun bouton, aucune barre de zoom : la mini-carte se pilote au geste seul.
 */

import { useCallback, useMemo, useRef } from 'react';
import type { Disposition } from '@/lib/layout-arbre';
import { HAUTEUR_NOEUD, LARGEUR_NOEUD } from '@/lib/layout-arbre';

const LARGEUR_MINIATURE = 200;
const HAUTEUR_MINIATURE = 150;
const MARGE = 6;

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
}: {
  disposition: Disposition;
  transform: Transform;
  tailleVue: { largeur: number; hauteur: number };
  onDeplacer: (mondeX: number, mondeY: number) => void;
  focusId: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Échelle de la miniature : on garde le rapport de la disposition et l'on
  // s'ajuste à la plus contraignante des deux dimensions disponibles.
  const echelle = useMemo(() => {
    const largeurDisponible = LARGEUR_MINIATURE - MARGE * 2;
    const hauteurDisponible = HAUTEUR_MINIATURE - MARGE * 2;
    return Math.min(
      largeurDisponible / Math.max(disposition.largeur, 1),
      hauteurDisponible / Math.max(disposition.hauteur + HAUTEUR_NOEUD, 1)
    );
  }, [disposition.largeur, disposition.hauteur]);

  // Décalage pour centrer la miniature dans son cadre.
  const decalageX = (LARGEUR_MINIATURE - disposition.largeur * echelle) / 2;
  const decalageY = (HAUTEUR_MINIATURE - (disposition.hauteur + HAUTEUR_NOEUD) * echelle) / 2;

  // Cadre de la portion visible : on inverse la transformation d'écran vers
  // le monde pour connaître les coordonnées des coins de la fenêtre.
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

  const deplacerDepuisMiniature = useCallback(
    (evenement: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const miniX = evenement.clientX - rect.left;
      const miniY = evenement.clientY - rect.top;
      const mondeX = (miniX - decalageX) / echelle;
      const mondeY = (miniY - decalageY) / echelle;
      onDeplacer(mondeX, mondeY);
    },
    [decalageX, decalageY, echelle, onDeplacer]
  );

  const surGlisse = useCallback(
    (evenement: React.MouseEvent<SVGSVGElement>) => {
      if (evenement.buttons !== 1) return;
      deplacerDepuisMiniature(evenement);
    },
    [deplacerDepuisMiniature]
  );

  return (
    <div
      className="carte pointer-events-auto overflow-hidden"
      style={{ width: LARGEUR_MINIATURE, height: HAUTEUR_MINIATURE }}
      aria-hidden
    >
      <svg
        ref={svgRef}
        width={LARGEUR_MINIATURE}
        height={HAUTEUR_MINIATURE}
        onMouseDown={deplacerDepuisMiniature}
        onMouseMove={surGlisse}
        className="cursor-crosshair"
        role="img"
        aria-label="Mini-carte de l’arbre"
      >
        <rect width={LARGEUR_MINIATURE} height={HAUTEUR_MINIATURE} fill="var(--fond-doux)" />

        {/* Un point par personne, dans sa couleur de côté. */}
        <g>
          {disposition.noeuds.map((noeud) => {
            const cx = decalageX + (noeud.x + LARGEUR_NOEUD / 2) * echelle;
            const cy = decalageY + (noeud.y + HAUTEUR_NOEUD / 2) * echelle;
            const estFocus = noeud.personneId === focusId;
            return (
              <circle
                key={noeud.personneId}
                cx={cx}
                cy={cy}
                r={estFocus ? 2.5 : 1.6}
                fill={estFocus ? 'var(--accent)' : COULEUR_COTE[noeud.cote]}
                opacity={estFocus ? 1 : 0.75}
              />
            );
          })}
        </g>

        {/* Cadre de la portion visible. */}
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
