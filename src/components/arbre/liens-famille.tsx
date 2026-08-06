import type { ReactElement } from 'react';
import type { DonneesArbre } from '@/lib/arbre';
import { HAUTEUR_NOEUD, LARGEUR_NOEUD, type Disposition, type NoeudArbre } from '@/lib/layout-arbre';

/** Deux conjoints côte à côte : barre dorée entre leurs cartes. Sinon pont sous la rangée. */
const SEUIL_COUPLE_ADJACENT = LARGEUR_NOEUD + 48;

/** Espace fixe entre le bas des parents et la barre de fratrie. */
const MARGE_SOUS_PARENTS = 14;
/** Espace entre la barre de fratrie et le haut des cartes enfants. */
const MARGE_SUR_ENFANTS = 16;

type UnionTracee = {
  id: string;
  conjointA: NoeudArbre;
  conjointB: NoeudArbre;
  enfants: NoeudArbre[];
  adjacents: boolean;
  xCentre: number;
  yCoupleVisuel: number;
  yDescente: number;
  yBarreFratrie: number;
};

/**
 * Liens en mode « famille autour » : barre de couple, barre de fratrie à hauteur
 * uniforme par rangée d'enfants, puis traits vers chaque enfant.
 */
export function LiensFamille({
  disposition,
  donnees,
  noeudParId,
}: {
  disposition: Disposition;
  donnees: DonneesArbre;
  noeudParId: Map<string, NoeudArbre>;
}) {
  const traits: ReactElement[] = [];
  const enfantsParUnion = new Set<string>();
  const unionsTracees: UnionTracee[] = [];

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
    const yBasParents = Math.max(a.y, b.y) + HAUTEUR_NOEUD;

    let yCoupleVisuel: number;
    if (adjacents) {
      yCoupleVisuel = (a.y + b.y) / 2 + HAUTEUR_NOEUD / 2;
    } else {
      yCoupleVisuel = yBasParents + 10;
    }

    const yDescente = yBasParents + MARGE_SOUS_PARENTS;

    unionsTracees.push({
      id,
      conjointA: a,
      conjointB: b,
      enfants: enfantsPlaces,
      adjacents,
      xCentre,
      yCoupleVisuel,
      yDescente,
      yBarreFratrie: 0,
    });
  }

  // Une seule hauteur de barre de fratrie par rangée d'enfants.
  const yBarreParRangEnfant = new Map<number, number>();
  for (const union of unionsTracees) {
    if (union.enfants.length === 0) continue;
    const yEnfants = Math.min(...union.enfants.map((e) => e.y));
    const yBarre = yEnfants - MARGE_SUR_ENFANTS;
    const existant = yBarreParRangEnfant.get(yEnfants);
    yBarreParRangEnfant.set(yEnfants, existant === undefined ? yBarre : Math.min(existant, yBarre));
  }

  for (const union of unionsTracees) {
    if (union.enfants.length === 0) continue;
    const yEnfants = Math.min(...union.enfants.map((e) => e.y));
    union.yBarreFratrie = yBarreParRangEnfant.get(yEnfants) ?? yEnfants - MARGE_SUR_ENFANTS;
  }

  for (const union of unionsTracees) {
    const { id, conjointA: a, conjointB: b, adjacents, xCentre, yCoupleVisuel, yDescente } = union;

    if (adjacents) {
      const xGauche = Math.min(a.x, b.x) + LARGEUR_NOEUD / 2;
      const xDroite = Math.max(a.x, b.x) - LARGEUR_NOEUD / 2;
      traits.push(
        <line
          key={`couple-${id}`}
          x1={xGauche}
          y1={yCoupleVisuel}
          x2={xDroite}
          y2={yCoupleVisuel}
          stroke="var(--or)"
          strokeWidth={3}
          opacity={0.85}
          strokeLinecap="round"
        />
      );
    } else {
      const yBasA = a.y + HAUTEUR_NOEUD;
      const yBasB = b.y + HAUTEUR_NOEUD;
      traits.push(
        <line
          key={`couple-stub-a-${id}`}
          x1={a.x}
          y1={yBasA}
          x2={a.x}
          y2={yCoupleVisuel}
          stroke="var(--or)"
          strokeWidth={2}
          opacity={0.85}
          strokeLinecap="round"
        />,
        <line
          key={`couple-stub-b-${id}`}
          x1={b.x}
          y1={yBasB}
          x2={b.x}
          y2={yCoupleVisuel}
          stroke="var(--or)"
          strokeWidth={2}
          opacity={0.85}
          strokeLinecap="round"
        />,
        <line
          key={`couple-${id}`}
          x1={a.x}
          y1={yCoupleVisuel}
          x2={b.x}
          y2={yCoupleVisuel}
          stroke="var(--or)"
          strokeWidth={3}
          opacity={0.85}
          strokeLinecap="round"
        />
      );
    }

    if (union.enfants.length === 0) continue;

    const { yBarreFratrie, enfants: enfantsPlaces } = union;
    const xs = enfantsPlaces.map((e) => e.x).sort((u, v) => u - v);
    const xFratrieGauche = xs[0]!;
    const xFratrieDroite = xs[xs.length - 1]!;
    const xFratrieCentre = (xFratrieGauche + xFratrieDroite) / 2;

    // Point de jonction sur la barre : milieu de la fratrie, ou bord si le couple est excentré.
    const xJonction =
      xCentre < xFratrieGauche
        ? xFratrieGauche
        : xCentre > xFratrieDroite
          ? xFratrieDroite
          : xFratrieCentre;

    const yDepart = Math.max(yCoupleVisuel, yDescente);

    traits.push(
      <line
        key={`descente-${id}`}
        x1={xCentre}
        y1={yDepart}
        x2={xCentre}
        y2={yBarreFratrie}
        stroke="var(--bordure-forte)"
        strokeWidth={2}
        opacity={0.9}
        strokeLinecap="round"
      />
    );

    if (Math.abs(xCentre - xJonction) > 2) {
      traits.push(
        <line
          key={`raccord-${id}`}
          x1={xCentre}
          y1={yBarreFratrie}
          x2={xJonction}
          y2={yBarreFratrie}
          stroke="var(--bordure-forte)"
          strokeWidth={2}
          opacity={0.9}
          strokeLinecap="round"
        />
      );
    }

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
        strokeLinecap="round"
      />
    );

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
          strokeLinecap="round"
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
        strokeLinecap="round"
      />
    );
  }

  return <g fill="none">{traits}</g>;
}
