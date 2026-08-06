import type { ReactElement } from 'react';
import type { DonneesArbre } from '@/lib/arbre';
import { HAUTEUR_NOEUD, LARGEUR_NOEUD, type Disposition, type NoeudArbre } from '@/lib/layout-arbre';

/** Deux conjoints côte à côte : barre dorée entre leurs cartes. Sinon pont sous la rangée. */
const SEUIL_COUPLE_ADJACENT = LARGEUR_NOEUD + 48;

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

    const memeRang = Math.abs(a.y - b.y) < 1;
    const ecart = Math.abs(a.x - b.x);
    const adjacents = memeRang && ecart <= SEUIL_COUPLE_ADJACENT;

    const xCentre = (a.x + b.x) / 2;
    let yCouple: number;

    if (adjacents) {
      // Conjoints voisins : trait doré entre les deux cartes, au milieu vertical.
      yCouple = (a.y + b.y) / 2 + HAUTEUR_NOEUD / 2;
      const xGauche = Math.min(a.x, b.x) + LARGEUR_NOEUD / 2;
      const xDroite = Math.max(a.x, b.x) - LARGEUR_NOEUD / 2;

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
    } else {
      // Conjoints éloignés (frères/sœurs entre eux sur la rangée) : on descend
      // sous la rangée pour ne pas donner l'impression qu'ils sont avec quelqu'un
      // d'autre sur la même ligne.
      const yBasA = a.y + HAUTEUR_NOEUD;
      const yBasB = b.y + HAUTEUR_NOEUD;
      yCouple = Math.max(yBasA, yBasB) + 10;

      traits.push(
        <line
          key={`couple-stub-a-${id}`}
          x1={a.x}
          y1={yBasA}
          x2={a.x}
          y2={yCouple}
          stroke="var(--or)"
          strokeWidth={2}
          opacity={0.85}
        />,
        <line
          key={`couple-stub-b-${id}`}
          x1={b.x}
          y1={yBasB}
          x2={b.x}
          y2={yCouple}
          stroke="var(--or)"
          strokeWidth={2}
          opacity={0.85}
        />,
        <line
          key={`couple-${id}`}
          x1={a.x}
          y1={yCouple}
          x2={b.x}
          y2={yCouple}
          stroke="var(--or)"
          strokeWidth={3}
          opacity={0.85}
        />
      );
    }

    if (enfantsPlaces.length === 0) continue;

    const yHautEnfants = Math.min(...enfantsPlaces.map((e) => e.y));
    const yBarreFratrie = yCouple + Math.max(12, (yHautEnfants - yCouple) * 0.45);

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
