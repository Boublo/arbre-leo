import { useMemo } from 'react';
import type { DonneesArbre } from '@/lib/arbre';
import { planifierLiens, type SegmentLien } from '@/lib/geometrie-liens';
import type { Disposition, NoeudArbre } from '@/lib/layout-arbre';

function SegmentSvg({ segment }: { segment: SegmentLien }) {
  if (segment.kind === 'path') {
    return (
      <path
        d={segment.d}
        stroke={segment.stroke}
        strokeWidth={segment.strokeWidth}
        strokeDasharray={segment.strokeDasharray}
        fill="none"
        opacity={segment.opacity}
        strokeLinecap="round"
      />
    );
  }

  return (
    <line
      x1={segment.x1}
      y1={segment.y1}
      x2={segment.x2}
      y2={segment.y2}
      stroke={segment.stroke}
      strokeWidth={segment.strokeWidth}
      strokeDasharray={segment.strokeDasharray}
      opacity={segment.opacity}
      strokeLinecap="square"
      strokeLinejoin="miter"
      shapeRendering="crispEdges"
    />
  );
}

/**
 * Tracé unifié des liens pour tous les modes de l'arbre :
 * barres de couple, pedigree (barre de fratrie) et connecteurs orthogonaux.
 */
export function LiensArbre({
  disposition,
  donnees,
  noeudParId,
  masquerLiensLointains = false,
}: {
  disposition: Disposition;
  donnees: DonneesArbre;
  noeudParId: Map<string, NoeudArbre>;
  masquerLiensLointains?: boolean;
}) {
  const segments = useMemo(
    () =>
      planifierLiens(donnees, disposition.liens, noeudParId, disposition.mode, {
        masquerLiensLointains,
      }).segments,
    [donnees, disposition.liens, disposition.mode, noeudParId, masquerLiensLointains]
  );

  return (
    <g fill="none">
      {segments.map((segment) => (
        <SegmentSvg key={segment.id} segment={segment} />
      ))}
    </g>
  );
}
