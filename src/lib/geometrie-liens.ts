import type { DonneesArbre } from '@/lib/arbre';
import { HAUTEUR_NOEUD, LARGEUR_NOEUD, type LienArbre, type NoeudArbre } from '@/lib/layout-arbre';

/** Deux conjoints voisins sur la rangée : barre dorée entre leurs cartes. */
export const SEUIL_COUPLE_ADJACENT = LARGEUR_NOEUD + 48;

/** Au-delà, on ne trace plus de barre horizontale entre les tiges (évite le pont sous les cousins). */
export const SEUIL_PONT_COUPLE = 320;

/** Barre de fratrie minimale quand un seul enfant (sinon invisible). */
const LARGEUR_BARRE_FRATRIE_MIN = 20;

const MARGE_SOUS_PARENTS = 14;
const MARGE_SUR_ENFANTS = 18;
const MARGE_ENTRE_RANGS = 14;
/** Espace entre la barre de fratrie et la couche de routage au-dessus. */
const HAUTEUR_COUCHES_ROUTAGE = 20;

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
      }
    );
    if (Math.abs(a.x - b.x) <= SEUIL_PONT_COUPLE) {
      segments.push({
        id: `couple-${id}`,
        kind: 'line',
        x1: a.x,
        y1: yCouple,
        x2: b.x,
        y2: yCouple,
        strokeWidth: 3,
        ...style,
      });
    }
  }

  return segments;
}

type PedigreeOpts = {
  id: string;
  parents: NoeudArbre[];
  enfants: NoeudArbre[];
  enfantsAuDessus: boolean;
  yBarreFratrie?: number;
};

function ajouterSegment(
  segments: SegmentLien[],
  segment: Omit<SegmentLien, 'kind'> & { kind?: 'line' | 'path' }
) {
  segments.push({ kind: 'line', ...segment });
}

/** Descente parents → couche de routage → barre de fratrie → tiges vers chaque enfant. */
export function segmentsPedigree({
  id,
  parents,
  enfants,
  enfantsAuDessus,
  yBarreFratrie: yBarreForce,
}: PedigreeOpts): SegmentLien[] {
  if (enfants.length === 0 || parents.length === 0) return [];

  const segments: SegmentLien[] = [];
  const style = { stroke: 'var(--bordure-forte)', opacity: 0.9 } as const;

  const xs = enfants.map((e) => e.x).sort((u, v) => u - v);
  const xFratrieGauche = xs[0]!;
  const xFratrieDroite = xs[xs.length - 1]!;
  const xFratrieCentre = (xFratrieGauche + xFratrieDroite) / 2;

  const xCentreParents = parents.reduce((s, p) => s + p.x, 0) / parents.length;
  const yBasParents = Math.max(...parents.map((p) => p.y + HAUTEUR_NOEUD));
  const yHautParents = Math.min(...parents.map((p) => p.y));

  const adjacents =
    parents.length === 2 && conjointsAdjacents(parents[0]!, parents[1]!);
  const yCoupleVisuel =
    parents.length === 2 && adjacents
      ? (parents[0]!.y + parents[1]!.y) / 2 + HAUTEUR_NOEUD / 2
      : parents.length === 2
        ? yBasParents + 10
        : parents[0]!.y + HAUTEUR_NOEUD / 2;

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

  const yRoute = enfantsAuDessus
    ? yBarreFratrie + HAUTEUR_COUCHES_ROUTAGE
    : yBarreFratrie - HAUTEUR_COUCHES_ROUTAGE;

  const yDepart = enfantsAuDessus
    ? Math.min(yCoupleVisuel, yHautParents - MARGE_SOUS_PARENTS)
    : Math.max(yCoupleVisuel, yBasParents + MARGE_SOUS_PARENTS);

  // 1. Descente verticale depuis le couple jusqu'à la couche de routage (entre les rangées).
  ajouterSegment(segments, {
    id: `descente-${id}`,
    x1: xCentreParents,
    y1: yDepart,
    x2: xCentreParents,
    y2: yRoute,
    strokeWidth: 2,
    ...style,
  });

  // 2. Raccord horizontal UNIQUEMENT sur la couche de routage — jamais sur la barre de fratrie
  //    ni au milieu des cartes, pour ne pas traverser des frères/sœurs.
  if (Math.abs(xCentreParents - xFratrieCentre) > 2) {
    ajouterSegment(segments, {
      id: `raccord-${id}`,
      x1: xCentreParents,
      y1: yRoute,
      x2: xFratrieCentre,
      y2: yRoute,
      strokeWidth: 2,
      ...style,
    });
  }

  // 3. Descente vers la barre de fratrie, centrée sur le groupe d'enfants.
  ajouterSegment(segments, {
    id: `descente-fratrie-${id}`,
    x1: xFratrieCentre,
    y1: yRoute,
    x2: xFratrieCentre,
    y2: yBarreFratrie,
    strokeWidth: 2,
    ...style,
  });

  // 4. Barre de fratrie : uniquement entre les enfants de CE couple.
  const demiBarre = Math.max((xFratrieDroite - xFratrieGauche) / 2, LARGEUR_BARRE_FRATRIE_MIN / 2);
  ajouterSegment(segments, {
    id: `fratrie-${id}`,
    x1: xFratrieCentre - demiBarre,
    y1: yBarreFratrie,
    x2: xFratrieCentre + demiBarre,
    y2: yBarreFratrie,
    strokeWidth: 2,
    ...style,
  });

  // 5. Tiges vers chaque enfant.
  for (const enfant of enfants) {
    const yEnfant = enfantsAuDessus ? enfant.y + HAUTEUR_NOEUD : enfant.y;
    ajouterSegment(segments, {
      id: `enfant-${id}-${enfant.personneId}`,
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

/** Connecteur en escalier : horizontal juste au-dessus (ou dessous) de l'enfant, pas au milieu. */
export function segmentOrthogonal(
  enfant: NoeudArbre,
  parent: NoeudArbre,
  id: string,
  reprise: boolean
): SegmentLien {
  const enfantAuDessus = enfant.y < parent.y;
  const [proche, loin] = enfantAuDessus ? [enfant, parent] : [parent, enfant];

  const ySortieLoin = enfantAuDessus ? loin.y : loin.y + HAUTEUR_NOEUD;
  const yEntreeProche = enfantAuDessus ? proche.y + HAUTEUR_NOEUD : proche.y;
  const yHoriz = enfantAuDessus
    ? yEntreeProche + MARGE_ENTRE_RANGS
    : yEntreeProche - MARGE_SUR_ENFANTS;

  return {
    id,
    kind: 'path',
    d: `M ${loin.x} ${ySortieLoin} V ${yHoriz} H ${proche.x} V ${yEntreeProche}`,
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
  parents: NoeudArbre[];
  enfants: NoeudArbre[];
  enfantsAuDessus: boolean;
};

function parentsVisibles(
  conjointA: string | null,
  conjointB: string | null,
  noeudParId: Map<string, NoeudArbre>
): NoeudArbre[] {
  const parents: NoeudArbre[] = [];
  for (const id of [conjointA, conjointB]) {
    if (!id) continue;
    const n = noeudParId.get(id);
    if (n) parents.push(n);
  }
  return parents;
}

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
    const parents = parentsVisibles(conjointA, conjointB, noeudParId);
    if (parents.length === 0) continue;

    const enfantsPlaces = enfants
      .map((enfantId) => noeudParId.get(enfantId))
      .filter((n): n is NoeudArbre => n !== undefined);

    if (
      parents.length === 2 &&
      (mode === 'famille' || (Math.abs(parents[0]!.y - parents[1]!.y) < 1 && parents[0]!.rang === parents[1]!.rang))
    ) {
      segments.push(...segmentsCouple(parents[0]!, parents[1]!, id));
    }

    if (enfantsPlaces.length === 0) continue;

    const rangParent = Math.max(...parents.map((p) => p.rang));

    // Mode famille : tous les enfants visibles. Autres modes (y compris éclaté) :
    // pedigree seulement pour les enfants sur un rang adjacent — les L orthogonaux
    // restent pour l'implexe / distances BFS non adjacentes (AUDIT M3).
    const enfantsPedigree =
      mode === 'famille'
        ? enfantsPlaces
        : enfantsPlaces.filter((e) => Math.abs(e.rang - rangParent) === 1);

    const parentsSurMemeRang =
      parents.length === 1 || Math.abs(parents[0]!.y - parents[1]!.y) < 1;

    const utiliserPedigree =
      mode === 'famille'
        ? enfantsPedigree.length > 0
        : enfantsPedigree.length > 0 && parentsSurMemeRang;

    if (!utiliserPedigree) continue;

    const yMoyenEnfants =
      enfantsPedigree.reduce((s, e) => s + e.y, 0) / enfantsPedigree.length;
    const yMoyenParents = parents.reduce((s, p) => s + p.y, 0) / parents.length;
    const enfantsAuDessus = yMoyenEnfants < yMoyenParents;

    unionsPedigree.push({
      id,
      parents,
      enfants: enfantsPedigree,
      enfantsAuDessus,
    });
    for (const enfant of enfantsPedigree) {
      enfantsParUnion.add(enfant.personneId);
    }
  }

  // Regrouper par rangée d'enfants pour décaler légèrement les barres de fratrie
  // quand plusieurs couples partagent la même rangée (évite la superposition exacte).
  const parRangEnfants = new Map<string, UnionPedigree[]>();
  for (const union of unionsPedigree) {
    const yCle = Math.min(...union.enfants.map((e) => e.y));
    const cle = `${yCle}:${union.enfantsAuDessus ? 'haut' : 'bas'}`;
    const liste = parRangEnfants.get(cle) ?? [];
    liste.push(union);
    parRangEnfants.set(cle, liste);
  }

  for (const liste of parRangEnfants.values()) {
    liste.sort((u, v) => {
      const xa = u.enfants.reduce((s, e) => s + e.x, 0) / u.enfants.length;
      const xb = v.enfants.reduce((s, e) => s + e.x, 0) / v.enfants.length;
      return xa - xb;
    });

    liste.forEach((union, index) => {
      const yEnfants = Math.min(...union.enfants.map((e) => e.y));
      let yBarre = union.enfantsAuDessus
        ? Math.max(...union.enfants.map((e) => e.y + HAUTEUR_NOEUD)) + MARGE_ENTRE_RANGS
        : yEnfants - MARGE_SUR_ENFANTS;

      if (liste.length > 1) {
        const decalage = index * 8;
        yBarre = union.enfantsAuDessus ? yBarre + decalage : yBarre - decalage;
      }

      segments.push(
        ...segmentsPedigree({
          id: union.id,
          parents: union.parents,
          enfants: union.enfants,
          enfantsAuDessus: union.enfantsAuDessus,
          yBarreFratrie: yBarre,
        })
      );
    });
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
