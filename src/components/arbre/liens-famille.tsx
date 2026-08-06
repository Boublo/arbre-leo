import type { ReactElement } from 'react';
import type { DonneesArbre } from '@/lib/arbre';
import { HAUTEUR_NOEUD, LARGEUR_NOEUD, type Disposition, type NoeudArbre } from '@/lib/layout-arbre';

/**
 * Liens en mode « famille autour » : barre de couple, puis barre de fratrie,
 * puis traits vers chaque enfant. On évite ainsi la grappe de traits horizontaux
 * qui ne permettait plus de voir qui forme un couple ni qui sont les frères et sœurs.
 */
export function LiensFamille({
  disposition,
  donnees,
  noeudParId,
}: {
  disposition: Disposition;
  noeudParId: Map<string, NoeudArbre>;
  donnees: DonneesArbre;
}) {
  const traits: ReactElement[] = [];
  const enfantsParUnion = new Set<string>();

  for (const union of donnees.unions.values()) {
    const { conjointA, conjointB, enfants, id } = union;
    if (!conjointA || !conjointB) continue;

    const a = noeudParId.get(conjointA);
    const b = noeudParId.get(conjointB);
    if (!a || !b) continue;

    const enfantsPlaces = enfants
      .map((enfantId) => noeudParId.get(enfantId))
      .filter((n): n is NoeudArbre => n !== undefined);

    for (const enfant of enfantsPlaces) {
      enfantsParUnion.add(enfant.personneId);
    }

    // Barre de couple — bien visible, au milieu vertical des deux conjoints.
    const yCouple = (a.y + b.y) / 2 + HAUTEUR_NOEUD / 2;
    const xGauche = Math.min(a.x, b.x) + LARGEUR_NOEUD / 2;
    const xDroite = Math.max(a.x, b.x) - LARGEUR_NOEUD / 2;
    const xCentre = (xGauche + xDroite) / 2;

    traits.push(
      <line
        key={`couple-${id}`}
        x1={xGauche}
        y1={yCouple}
        x2={xDroite}
        y2={yCouple}
        stroke="var(--or)"
        strokeWidth={3}
        opacity={0.85}
      />
    );

    if (enfantsPlaces.length === 0) continue;

    const yHautEnfants = Math.min(...enfantsPlaces.map((e) => e.y));
    const yBasParents = Math.max(a.y, b.y) + HAUTEUR_NOEUD;
    const yBarreFratrie = yBasParents + Math.max(12, (yHautEnfants - yBasParents) * 0.45);

    traits.push(
      <line
        key={`descente-${id}`}
        x1={xCentre}
        y1={yCouple}
        x2={xCentre}
        y2={yBarreFratrie}
        stroke="var(--bordure-forte)"
        strokeWidth={2}
        opacity={0.9}
      />
    );

    const xs = enfantsPlaces.map((e) => e.x).sort((u, v) => u - v);
    const xFratrieGauche = xs[0]!;
    const xFratrieDroite = xs[xs.length - 1]!;

    traits.push(
      <line
        key={`fratrie-${id}`}
        x1={xFratrieGauche}
        y1={yBarreFratrie}
        x2={xFratrieDroite}
        y2={yBarreFratrie}
        stroke="var(--bordure-forte)"
        strokeWidth={2}
        opacity={0.9}
      />
    );

    if (xCentre < xFratrieGauche || xCentre > xFratrieDroite) {
      const xRaccord = Math.min(Math.max(xCentre, xFratrieGauche), xFratrieDroite);
      if (Math.abs(xCentre - xRaccord) > 2) {
        traits.push(
          <line
            key={`raccord-${id}`}
            x1={xCentre}
            y1={yBarreFratrie}
            x2={xRaccord}
            y2={yBarreFratrie}
            stroke="var(--bordure-forte)"
            strokeWidth={2}
            opacity={0.9}
          />
        );
      }
    }

    for (const enfant of enfantsPlaces) {
      traits.push(
        <line
          key={`enfant-${id}-${enfant.personneId}`}
          x1={enfant.x}
          y1={yBarreFratrie}
          x2={enfant.x}
          y2={enfant.y}
          stroke="var(--bordure-forte)"
          strokeWidth={2}
          opacity={0.9}
        />
      );
    }
  }

  for (const lien of disposition.liens) {
    if (enfantsParUnion.has(lien.enfantId)) continue;

    const enfant = noeudParId.get(lien.enfantId);
    const parent = noeudParId.get(lien.parentId);
    if (!enfant || !parent) continue;

    const [haut, bas] = enfant.y <= parent.y ? [enfant, parent] : [parent, enfant];
    const y1 = haut.y + HAUTEUR_NOEUD;
    const y2 = bas.y;
    const milieu = y1 + (y2 - y1) / 2;

    traits.push(
      <path
        key={lien.id}
        d={`M ${haut.x} ${y1} V ${milieu} H ${bas.x} V ${y2}`}
        stroke={lien.reprise ? 'var(--or)' : 'var(--bordure-forte)'}
        strokeWidth={lien.reprise ? 2 : 1.5}
        strokeDasharray={lien.reprise ? '5 4' : undefined}
        fill="none"
        opacity={0.85}
      />
    );
  }

  return <g fill="none">{traits}</g>;
}
