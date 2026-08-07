import type { DonneesArbre } from '@/lib/arbre';
import { ESPACEMENT_Y, HAUTEUR_NOEUD, LARGEUR_NOEUD, type LienArbre, type NoeudArbre } from '@/lib/layout-arbre';

/** Deux conjoints voisins sur la rangée : barre dorée entre leurs cartes. */
export const SEUIL_COUPLE_ADJACENT = LARGEUR_NOEUD + 48;

/** Au-delà, on ne trace plus de barre horizontale entre les tiges (évite le pont sous les cousins). */
export const SEUIL_PONT_COUPLE = 320;

/** Barre de fratrie minimale quand un seul enfant (sinon invisible). */
const LARGEUR_BARRE_FRATRIE_MIN = 20;

const MARGE_SUR_ENFANTS = 10;
const MARGE_SOUS_PARENTS = 10;
const MARGE_ENTRE_RANGS = 10;
/** Espace entre la barre de fratrie et la couche de routage au-dessus. */
const HAUTEUR_COUCHES_ROUTAGE = 14;

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
        strokeWidth: 2.5,
        ...style,
      },
      {
        id: `couple-stub-b-${id}`,
        kind: 'line',
        x1: b.x,
        y1: yBasB,
        x2: b.x,
        y2: yCouple,
        strokeWidth: 2.5,
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
  /** Couche de routage au-dessus de la barre — décalée si plusieurs unions sur la rangée. */
  yRoute?: number;
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
  yRoute: yRouteForce,
}: PedigreeOpts): SegmentLien[] {
  if (enfants.length === 0 || parents.length === 0) return [];

  const segments: SegmentLien[] = [];
  // Encre douce : lisible sur le parchemin, sans concurrence avec la barre d'or.
  const style = { stroke: 'var(--encre-douce)', opacity: 1 } as const;

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

  const yRoute =
    yRouteForce ??
    (enfantsAuDessus
      ? yBarreFratrie + HAUTEUR_COUCHES_ROUTAGE
      : yBarreFratrie - HAUTEUR_COUCHES_ROUTAGE);

  const yDepart = enfantsAuDessus
    ? yHautParents
    : parents.length === 2
      ? yCoupleVisuel
      : yBasParents + MARGE_SOUS_PARENTS;

  // 1. Descente verticale depuis le couple jusqu'à la couche de routage (entre les rangées).
  ajouterSegment(segments, {
    id: `descente-${id}`,
    x1: xCentreParents,
    y1: yDepart,
    x2: xCentreParents,
    y2: yRoute,
    strokeWidth: 2.5,
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
      strokeWidth: 2.5,
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
    strokeWidth: 2.5,
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
    strokeWidth: 2.5,
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
      strokeWidth: 2.5,
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
  reprise: boolean,
  decalageCouloir = 0,
  modeEclate = false
): SegmentLien {
  const style = {
    stroke: reprise ? 'var(--or)' : 'var(--encre-douce)',
    strokeWidth: reprise ? 2.5 : 2,
    strokeDasharray: reprise ? '5 4' : undefined,
    opacity: modeEclate ? (reprise ? 0.5 : 0.32) : 0.9,
  } as const;

  // Même rangée (souvent en mode éclaté) : passer sous les deux cartes, pas à travers.
  if (Math.abs(enfant.y - parent.y) < 1) {
    const yBas = enfant.y + HAUTEUR_NOEUD;
    const yCouloir = yBas + MARGE_ENTRE_RANGS + 8 + decalageCouloir;
    return {
      id,
      kind: 'path',
      d: `M ${parent.x} ${parent.y + HAUTEUR_NOEUD} V ${yCouloir} H ${enfant.x} V ${yBas}`,
      ...style,
    };
  }

  const enfantAuDessus = enfant.y < parent.y;
  const [proche, loin] = enfantAuDessus ? [enfant, parent] : [parent, enfant];

  const ySortieLoin = enfantAuDessus ? loin.y : loin.y + HAUTEUR_NOEUD;
  const yEntreeProche = enfantAuDessus ? proche.y + HAUTEUR_NOEUD : proche.y;
  const yHorizBase = enfantAuDessus
    ? yEntreeProche + MARGE_ENTRE_RANGS
    : yEntreeProche - MARGE_SUR_ENFANTS;
  const yHoriz = enfantAuDessus ? yHorizBase + decalageCouloir : yHorizBase - decalageCouloir;

  return {
    id,
    kind: 'path',
    d: `M ${loin.x} ${ySortieLoin} V ${yHoriz} H ${proche.x} V ${yEntreeProche}`,
    ...style,
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

const PAS_COULOIR_PEDIGREE = 8;
const PAS_COULOIR_ORTHO = 12;

type LienOrthogonalPlan = {
  lien: LienArbre;
  enfant: NoeudArbre;
  parent: NoeudArbre;
  xMin: number;
  xMax: number;
  yCle: number;
};

function intervalleXLien(enfant: NoeudArbre, parent: NoeudArbre): [number, number] {
  const xs = [enfant.x, parent.x].sort((a, b) => a - b);
  return [xs[0]! - LARGEUR_NOEUD / 2, xs[1]! + LARGEUR_NOEUD / 2];
}

function cleYCouloirOrtho(enfant: NoeudArbre, parent: NoeudArbre): number {
  if (Math.abs(enfant.y - parent.y) < 1) {
    return Math.round(enfant.y + HAUTEUR_NOEUD + MARGE_ENTRE_RANGS + 8);
  }
  const enfantAuDessus = enfant.y < parent.y;
  const yEntreeProche = enfantAuDessus ? enfant.y + HAUTEUR_NOEUD : enfant.y;
  const yHoriz = enfantAuDessus
    ? yEntreeProche + MARGE_ENTRE_RANGS
    : yEntreeProche - MARGE_SUR_ENFANTS;
  return Math.round(yHoriz);
}

function allouerCouloirsOrthogonaux(plans: LienOrthogonalPlan[]): Map<LienOrthogonalPlan, number> {
  const attribution = new Map<LienOrthogonalPlan, number>();
  const parY = new Map<number, LienOrthogonalPlan[]>();

  for (const plan of plans) {
    const liste = parY.get(plan.yCle) ?? [];
    liste.push(plan);
    parY.set(plan.yCle, liste);
  }

  for (const liste of parY.values()) {
    liste.sort((a, b) => a.xMin - b.xMin);
    const lanes: Array<[number, number][]> = [];

    for (const plan of liste) {
      const intervalle: [number, number] = [plan.xMin, plan.xMax];
      let lane = 0;
      while (lane < lanes.length) {
        const chevauche = lanes[lane]!.some((occupe) => intervallesSeChevauchent(intervalle, occupe));
        if (!chevauche) break;
        lane++;
      }
      const occupes = lanes[lane] ?? [];
      occupes.push(intervalle);
      lanes[lane] = occupes;
      attribution.set(plan, lane);
    }
  }

  return attribution;
}

function segmentsOrthogonauxEclate(
  liens: LienArbre[],
  noeudParId: Map<string, NoeudArbre>,
  enfantsParUnion: Set<string>
): SegmentLien[] {
  const plans: LienOrthogonalPlan[] = [];

  for (const lien of liens) {
    if (enfantsParUnion.has(lien.enfantId)) continue;
    const enfant = noeudParId.get(lien.enfantId);
    const parent = noeudParId.get(lien.parentId);
    if (!enfant || !parent) continue;

    const [xMin, xMax] = intervalleXLien(enfant, parent);
    plans.push({
      lien,
      enfant,
      parent,
      xMin,
      xMax,
      yCle: cleYCouloirOrtho(enfant, parent),
    });
  }

  const couloirs = allouerCouloirsOrthogonaux(plans);

  return plans.map((plan) => {
    const decalage = (couloirs.get(plan) ?? 0) * PAS_COULOIR_ORTHO;
    return segmentOrthogonal(
      plan.enfant,
      plan.parent,
      plan.lien.id,
      plan.lien.reprise,
      decalage,
      true
    );
  });
}

function intervalleEnfants(union: UnionPedigree): [number, number] {
  const xs = union.enfants.map((e) => e.x);
  return [Math.min(...xs) - LARGEUR_NOEUD / 2, Math.max(...xs) + LARGEUR_NOEUD / 2];
}

function intervallesSeChevauchent(a: [number, number], b: [number, number]): boolean {
  return a[1] >= b[0] && b[1] >= a[0];
}

/** Réutilise un couloir si les groupes d'enfants ne se chevauchent pas horizontalement. */
function allouerCouloirsPedigree(liste: UnionPedigree[]): Map<UnionPedigree, number> {
  const couloirsMax = Math.max(
    1,
    Math.floor((ESPACEMENT_Y - HAUTEUR_NOEUD - MARGE_ENTRE_RANGS - MARGE_SUR_ENFANTS) / PAS_COULOIR_PEDIGREE)
  );
  const lanes: Array<[number, number][]> = [];
  const attribution = new Map<UnionPedigree, number>();

  for (const union of liste) {
    const intervalle = intervalleEnfants(union);
    let lane = 0;
    while (lane < lanes.length) {
      const chevauche = lanes[lane]!.some((occupe) => intervallesSeChevauchent(intervalle, occupe));
      if (!chevauche) break;
      lane++;
    }
    if (lane >= couloirsMax) lane = couloirsMax - 1;
    const occupes = lanes[lane] ?? [];
    occupes.push(intervalle);
    lanes[lane] = occupes;
    attribution.set(union, lane);
  }

  return attribution;
}

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
export type OptionsPlanLiens = {
  /** En mode éclaté : ne pas tracer les connecteurs orthogonaux atténués. */
  masquerLiensLointains?: boolean;
};

export function planifierLiens(
  donnees: DonneesArbre,
  liens: LienArbre[],
  noeudParId: Map<string, NoeudArbre>,
  mode: 'ascendance' | 'descendance' | 'famille' | 'eclate',
  options: OptionsPlanLiens = {}
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

    // Pedigree seulement pour les enfants sur un rang adjacent — les L orthogonaux
    // restent pour l'implexe / distances BFS non adjacentes (AUDIT M3).
    const enfantsAdjacents = enfantsPlaces.filter((e) => Math.abs(e.rang - rangParent) === 1);
    const parentsSurMemeRang =
      parents.length === 1 || Math.abs(parents[0]!.y - parents[1]!.y) < 1;

    if (enfantsAdjacents.length === 0 || !parentsSurMemeRang) continue;

    const parRangEnfant = new Map<number, NoeudArbre[]>();
    for (const enfant of enfantsAdjacents) {
      const groupe = parRangEnfant.get(enfant.rang) ?? [];
      groupe.push(enfant);
      parRangEnfant.set(enfant.rang, groupe);
    }

    for (const [rangEnfant, groupe] of parRangEnfant) {
      const enfantsAuDessus = rangEnfant < rangParent;
      const pedigreeId = parRangEnfant.size > 1 ? `${id}-${rangEnfant}` : id;
      unionsPedigree.push({
        id: pedigreeId,
        parents,
        enfants: groupe,
        enfantsAuDessus,
      });
      for (const enfant of groupe) {
        enfantsParUnion.add(enfant.personneId);
      }
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

    const yEnfants = Math.min(...liste[0]!.enfants.map((e) => e.y));
    const enfantsAuDessus = liste[0]!.enfantsAuDessus;
    const yBarreCommun = enfantsAuDessus
      ? Math.max(...liste.flatMap((u) => u.enfants.map((e) => e.y + HAUTEUR_NOEUD))) + MARGE_ENTRE_RANGS
      : yEnfants - MARGE_SUR_ENFANTS;

    const couloirs = liste.length > 1 ? allouerCouloirsPedigree(liste) : new Map<UnionPedigree, number>();

    for (const union of liste) {
      const decalage = (couloirs.get(union) ?? 0) * PAS_COULOIR_PEDIGREE;
      const yRoute = enfantsAuDessus
        ? yBarreCommun + HAUTEUR_COUCHES_ROUTAGE + decalage
        : yBarreCommun - HAUTEUR_COUCHES_ROUTAGE - decalage;

      segments.push(
        ...segmentsPedigree({
          id: union.id,
          parents: union.parents,
          enfants: union.enfants,
          enfantsAuDessus: union.enfantsAuDessus,
          yBarreFratrie: yBarreCommun,
          yRoute,
        })
      );
    }
  }

  for (const lien of liens) {
    if (enfantsParUnion.has(lien.enfantId)) continue;
    const enfant = noeudParId.get(lien.enfantId);
    const parent = noeudParId.get(lien.parentId);
    if (!enfant || !parent) continue;
    if (mode === 'eclate') continue;
    segments.push(segmentOrthogonal(enfant, parent, lien.id, lien.reprise));
  }

  if (mode === 'eclate' && !options.masquerLiensLointains) {
    segments.push(...segmentsOrthogonauxEclate(liens, noeudParId, enfantsParUnion));
  }

  return { segments, enfantsParUnion };
}
