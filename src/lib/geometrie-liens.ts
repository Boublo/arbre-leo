import type { DonneesArbre } from '@/lib/arbre';
import { HAUTEUR_NOEUD, LARGEUR_NOEUD, type LienArbre, type NoeudArbre } from '@/lib/layout-arbre';

/** Deux conjoints voisins sur la rangée : barre dorée entre leurs cartes. */
export const SEUIL_COUPLE_ADJACENT = LARGEUR_NOEUD + 48;

const MARGE_SOUS_PARENTS = 14;
const MARGE_SUR_ENFANTS = 16;
const MARGE_ENTRE_RANGS = 12;

export type SegmentLien = {
  id: string;
  kind: 'line' | 'path';
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  d?: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity: number;
};

export function conjointsAdjacents(a: NoeudArbre, b: NoeudArbre): boolean {
  return Math.abs(a.y - b.y) < 1 && Math.abs(a.x - b.x) <= SEUIL_COUPLE_ADJACENT;
}

/** Barre dorée entre conjoints (adjacents ou pont sous la rangée). */
export function segmentsCouple(a: NoeudArbre, b: NoeudArbre, id: string): SegmentLien[] {
  const adjacents = conjointsAdjacents(a, b);
  const segments: SegmentLien[] = [];
  const style = { stroke: 'var(--or)', opacity: 0.85 } as const;

  if (adjacents) {
    const yCouple = (a.y + b.y) / 2 + HAUTEUR_NOEUD / 2;
    segments.push({
      id: `couple-${id}`,
      kind: 'line',
      x1: Math.min(a.x, b.x) + LARGEUR_NOEUD / 2,
      y1: yCouple,
      x2: Math.max(a.x, b.x) - LARGEUR_NOEUD / 2,
      y2: yCouple,
      strokeWidth: 3,
      ...style,
    });
  } else {
    const yBasA = a.y + HAUTEUR_NOEUD;
    const yBasB = b.y + HAUTEUR_NOEUD;
    const yCouple = Math.max(yBasA, yBasB) + 10;
    segments.push(
      {
        id: `couple-stub-a-${id}`,
        kind: 'line',
        x1: a.x,
        y1: yBasA,
        x2: a.x,
        y2: yCouple,
        strokeWidth: 2,
        ...style,
      },
      {
        id: `couple-stub-b-${id}`,
        kind: 'line',
        x1: b.x,
        y1: yBasB,
        x2: b.x,
        y2: yCouple,
        strokeWidth: 2,
        ...style,
      },
      {
        id: `couple-${id}`,
        kind: 'line',
        x1: a.x,
        y1: yCouple,
        x2: b.x,
        y2: yCouple,
        strokeWidth: 3,
        ...style,
      }
    );
  }

  return segments;
}

type PedigreeOpts = {
  id: string;
  a: NoeudArbre;
  b: NoeudArbre;
  enfants: NoeudArbre[];
  enfantsAuDessus: boolean;
  yBarreFratrie?: number;
};

/** Descente couple → barre de fratrie → tiges vers chaque enfant. */
export function segmentsPedigree({
  id,
  a,
  b,
  enfants,
  enfantsAuDessus,
  yBarreFratrie: yBarreForce,
}: PedigreeOpts): SegmentLien[] {
  if (enfants.length === 0) return [];

  const segments: SegmentLien[] = [];
  const style = { stroke: 'var(--bordure-forte)', opacity: 0.9 } as const;
  const adjacents = conjointsAdjacents(a, b);
  const xCentre = (a.x + b.x) / 2;
  const yBasParents = Math.max(a.y, b.y) + HAUTEUR_NOEUD;
  const yHautParents = Math.min(a.y, b.y);

  const yCoupleVisuel = adjacents
    ? (a.y + b.y) / 2 + HAUTEUR_NOEUD / 2
    : yBasParents + 10;

  const xs = enfants.map((e) => e.x).sort((u, v) => u - v);
  const xFratrieGauche = xs[0]!;
  const xFratrieDroite = xs[xs.length - 1]!;
  const xFratrieCentre = (xFratrieGauche + xFratrieDroite) / 2;

  let yBarreFratrie = yBarreForce;
  if (yBarreFratrie === undefined) {
    if (enfantsAuDessus) {
      const yBasEnfants = Math.max(...enfants.map((e) => e.y + HAUTEUR_NOEUD));
      yBarreFratrie = yBasEnfants + MARGE_ENTRE_RANGS;
    } else {
      const yHautEnfants = Math.min(...enfants.map((e) => e.y));
      yBarreFratrie = yHautEnfants - MARGE_SUR_ENFANTS;
    }
  }

  const xJonction =
    xCentre < xFratrieGauche
      ? xFratrieGauche
      : xCentre > xFratrieDroite
        ? xFratrieDroite
        : xFratrieCentre;

  const yDepart = enfantsAuDessus
    ? Math.min(yCoupleVisuel, yHautParents - MARGE_SOUS_PARENTS)
    : Math.max(yCoupleVisuel, yBasParents + MARGE_SOUS_PARENTS);

  segments.push({
    id: `descente-${id}`,
    kind: 'line',
    x1: xCentre,
    y1: yDepart,
    x2: xCentre,
    y2: yBarreFratrie,
    strokeWidth: 2,
    ...style,
  });

  if (Math.abs(xCentre - xJonction) > 2) {
    segments.push({
      id: `raccord-${id}`,
      kind: 'line',
      x1: xCentre,
      y1: yBarreFratrie,
      x2: xJonction,
      y2: yBarreFratrie,
      strokeWidth: 2,
      ...style,
    });
  }

  segments.push({
    id: `fratrie-${id}`,
    kind: 'line',
    x1: xFratrieGauche,
    y1: yBarreFratrie,
    x2: xFratrieDroite,
    y2: yBarreFratrie,
    strokeWidth: 2,
    ...style,
  });

  for (const enfant of enfants) {
    const yEnfant = enfantsAuDessus ? enfant.y + HAUTEUR_NOEUD : enfant.y;
    segments.push({
      id: `enfant-${id}-${enfant.personneId}`,
      kind: 'line',
      x1: enfant.x,
      y1: yBarreFratrie,
      x2: enfant.x,
      y2: yEnfant,
      strokeWidth: 2,
      ...style,
    });
  }

  return segments;
}

/** Connecteur en escalier pour filiation simple ou lien de reprise. */
export function segmentOrthogonal(
  enfant: NoeudArbre,
  parent: NoeudArbre,
  id: string,
  reprise: boolean
): SegmentLien {
  const [haut, bas] = enfant.y <= parent.y ? [enfant, parent] : [parent, enfant];
  const y1 = haut.y + HAUTEUR_NOEUD;
  const y2 = bas.y;
  const milieu = y1 + (y2 - y1) / 2;

  return {
    id,
    kind: 'path',
    d: `M ${haut.x} ${y1} V ${milieu} H ${bas.x} V ${y2}`,
    stroke: reprise ? 'var(--or)' : 'var(--bordure-forte)',
    strokeWidth: reprise ? 2 : 1.5,
    strokeDasharray: reprise ? '5 4' : undefined,
    opacity: 0.85,
  };
}

export type PlanLiens = {
  segments: SegmentLien[];
  enfantsParUnion: Set<string>;
};

type UnionPedigree = {
  id: string;
  a: NoeudArbre;
  b: NoeudArbre;
  enfants: NoeudArbre[];
  enfantsAuDessus: boolean;
};

/**
 * Calcule tous les segments de liens pour une disposition.
 * Pedigree pour les couples avec enfants visibles sur rang adjacent ;
 * connecteur orthogonal pour le reste.
 */
export function planifierLiens(
  donnees: DonneesArbre,
  liens: LienArbre[],
  noeudParId: Map<string, NoeudArbre>,
  mode: 'ascendance' | 'descendance' | 'famille' | 'eclate'
): PlanLiens {
  const segments: SegmentLien[] = [];
  const enfantsParUnion = new Set<string>();
  const unionsPedigree: UnionPedigree[] = [];

  for (const union of donnees.unions.values()) {
    const { conjointA, conjointB, enfants, id } = union;
    if (!conjointA || !conjointB) continue;

    const a = noeudParId.get(conjointA);
    const b = noeudParId.get(conjointB);
    if (!a || !b) continue;

    const enfantsPlaces = enfants
      .map((enfantId) => noeudParId.get(enfantId))
      .filter((n): n is NoeudArbre => n !== undefined);

    const dessinerCouple =
      mode === 'famille' || (Math.abs(a.y - b.y) < 1 && a.rang === b.rang);
    if (dessinerCouple) {
      segments.push(...segmentsCouple(a, b, id));
    }

    if (enfantsPlaces.length === 0) continue;

    const yMoyenEnfants = enfantsPlaces.reduce((s, e) => s + e.y, 0) / enfantsPlaces.length;
    const yMoyenParents = (a.y + b.y) / 2;
    const enfantsAuDessus = yMoyenEnfants < yMoyenParents;

    const rangParent = Math.max(a.rang, b.rang);
    const rangProche = enfantsPlaces.every((e) => Math.abs(e.rang - rangParent) === 1);

    const utiliserPedigree =
      mode === 'famille' || (mode !== 'eclate' && rangProche && Math.abs(a.y - b.y) < 1);

    if (utiliserPedigree) {
      unionsPedigree.push({ id, a, b, enfants: enfantsPlaces, enfantsAuDessus });
      for (const enfant of enfantsPlaces) {
        enfantsParUnion.add(enfant.personneId);
      }
    }
  }

  // Barres de fratrie alignées par rangée (enfants en dessous).
  const yBarreParRangEnfant = new Map<number, number>();
  for (const union of unionsPedigree) {
    if (union.enfantsAuDessus) continue;
    const yEnfants = Math.min(...union.enfants.map((e) => e.y));
    const yBarre = yEnfants - MARGE_SUR_ENFANTS;
    const existant = yBarreParRangEnfant.get(yEnfants);
    yBarreParRangEnfant.set(yEnfants, existant === undefined ? yBarre : Math.min(existant, yBarre));
  }

  // Barres alignées par rangée (enfants au-dessus, ascendance).
  const yBarreParRangEnfantHaut = new Map<number, number>();
  for (const union of unionsPedigree) {
    if (!union.enfantsAuDessus) continue;
    const yEnfants = Math.min(...union.enfants.map((e) => e.y));
    const yBarre = Math.max(...union.enfants.map((e) => e.y + HAUTEUR_NOEUD)) + MARGE_ENTRE_RANGS;
    const existant = yBarreParRangEnfantHaut.get(yEnfants);
    yBarreParRangEnfantHaut.set(
      yEnfants,
      existant === undefined ? yBarre : Math.max(existant, yBarre)
    );
  }

  for (const union of unionsPedigree) {
    const yEnfants = Math.min(...union.enfants.map((e) => e.y));
    const yBarre = union.enfantsAuDessus
      ? yBarreParRangEnfantHaut.get(yEnfants)
      : yBarreParRangEnfant.get(yEnfants);

    segments.push(
      ...segmentsPedigree({
        ...union,
        yBarreFratrie: yBarre,
      })
    );
  }

  for (const lien of liens) {
    if (enfantsParUnion.has(lien.enfantId)) continue;
    const enfant = noeudParId.get(lien.enfantId);
    const parent = noeudParId.get(lien.parentId);
    if (!enfant || !parent) continue;
    segments.push(segmentOrthogonal(enfant, parent, lien.id, lien.reprise));
  }

  return { segments, enfantsParUnion };
}
