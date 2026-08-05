import type { DonneesArbre } from '@/lib/arbre';
import { coteDesBranches, PRENOM_RACINE, type Cote } from '@/lib/branches';

/**
 * Disposition de l'arbre d'ascendance.
 *
 * L'enfant est en bas, ses ancêtres s'élèvent au-dessus, génération par
 * génération. Chaque sous-arbre se voit d'abord mesurer une largeur, puis les
 * parents sont posés côte à côte dans cette largeur et l'enfant recentré
 * dessous : c'est le principe des « tidy trees », qui évite les croisements
 * sans avoir à corriger après coup.
 *
 * Deux difficultés propres à un vrai arbre familial :
 *
 *  — l'implexe. Quand deux branches remontent au même ancêtre — cousins mariés
 *    entre eux, chose courante dans un village où l'on se marie entre voisins —
 *    une personne est atteinte par plusieurs chemins. On ne la place qu'une
 *    fois, au premier chemin rencontré, et les autres liens la rejoignent.
 *
 *  — les collatéraux. Frères, sœurs, oncles et tantes ne sont pas des ancêtres
 *    mais font partie de l'histoire. On leur réserve de la place dès la mesure,
 *    faute de quoi ils chevaucheraient les sous-arbres voisins.
 */

export type ModeArbre = 'ascendance' | 'complet';

export type NoeudArbre = {
  personneId: string;
  generation: number;
  x: number;
  y: number;
  /** Vrai pour un ancêtre en ligne directe, faux pour un collatéral. */
  lignee: boolean;
  /** À quelle branche rattacher la couleur du nœud. */
  cote: Cote;
};

export type LienArbre = {
  id: string;
  enfantId: string;
  parentId: string;
  /** Un lien vers un ancêtre déjà placé ailleurs : tracé en pointillé. */
  reprise: boolean;
};

export type LienUnion = { id: string; aId: string; bId: string };

export type Disposition = {
  noeuds: NoeudArbre[];
  liens: LienArbre[];
  unions: LienUnion[];
  largeur: number;
  hauteur: number;
  parGeneration: Map<number, NoeudArbre[]>;
};

/** Espacement en pixels. Le nœud fait 180 × 64. */
export const ESPACEMENT_X = 210;
export const ESPACEMENT_Y = 150;
export const LARGEUR_NOEUD = 180;
export const HAUTEUR_NOEUD = 64;

export function disposerArbre(
  donnees: DonneesArbre,
  racineId: string,
  mode: ModeArbre = 'ascendance'
): Disposition {
  const { parents, unions, personnes } = donnees;

  const affiches = new Set<string>();
  const noeuds: NoeudArbre[] = [];
  const liens: LienArbre[] = [];
  const place = new Map<string, NoeudArbre>();

  /** Frères et sœurs d'une personne, hors elle-même. */
  function fratrieDe(id: string): string[] {
    const personne = personnes.get(id);
    if (!personne?.issuDe) return [];
    const union = unions.get(personne.issuDe);
    if (!union) return [];
    return union.enfants.filter((e) => e !== id && personnes.has(e));
  }

  /**
   * Le côté d'une personne est hérité de celui de son descendant : une fois
   * qu'on a bifurqué vers le père ou la mère, toute la lignée au-dessus reste
   * de ce côté-là. Ce n'est qu'au départ, indéterminé, qu'on interroge les
   * branches déclarées sur la personne.
   */
  function cotePour(id: string, coteDescendant: Cote): Cote {
    if (coteDescendant !== 'commune') return coteDescendant;
    return coteDesBranches(personnes.get(id)?.branches ?? []);
  }

  // --- Mesure ---------------------------------------------------------------
  // Largeur d'un sous-arbre, exprimée en nombre de colonnes.

  const mesures = new Map<string, number>();
  const enCours = new Set<string>();

  function mesurer(id: string): number {
    const connue = mesures.get(id);
    if (connue !== undefined) return connue;

    // Garde-fou : une boucle de filiation (donnée fautive) ne doit pas
    // provoquer une récursion infinie.
    if (enCours.has(id)) return 1;
    enCours.add(id);

    const ascendants = (parents.get(id) ?? []).filter((p) => personnes.has(p));
    const largeurAscendants = ascendants.reduce((somme, p) => somme + mesurer(p), 0);

    const largeurFratrie = mode === 'complet' ? 1 + fratrieDe(id).length : 1;
    const largeur = Math.max(1, largeurAscendants, largeurFratrie);

    enCours.delete(id);
    mesures.set(id, largeur);
    return largeur;
  }

  mesurer(racineId);

  // --- Placement ------------------------------------------------------------

  function placer(id: string, gauche: number, generation: number, cote: NoeudArbre['cote']): number {
    // Ancêtre atteint par une seconde branche : on garde la première position.
    if (place.has(id)) return place.get(id)!.x;

    const largeur = mesures.get(id) ?? 1;
    const ascendants = (parents.get(id) ?? []).filter((p) => personnes.has(p));

    let x: number;

    if (ascendants.length === 0) {
      x = gauche + largeur / 2;
    } else {
      // Le premier parent connu prend la gauche ; par convention le père tient
      // la gauche et la mère la droite, l'ordre venant de l'union.
      let curseur = gauche;
      const positions: number[] = [];

      for (const [rang, parentId] of ascendants.entries()) {
        const largeurParent = mesures.get(parentId) ?? 1;

        // Au départ de l'arbre, le côté n'est pas encore fixé : on le lit sur
        // les branches déclarées, et à défaut sur le rang — les conjoints sont
        // rangés dans l'ordre de l'union, le premier tenant la gauche.
        let coteParent = cotePour(parentId, cote);
        if (coteParent === 'commune') {
          coteParent = rang === 0 ? 'paternelle' : 'maternelle';
        }

        positions.push(placer(parentId, curseur, generation + 1, coteParent));
        curseur += largeurParent;
      }

      // Centré sous ses parents : la ligne de descendance reste lisible.
      x = positions.reduce((s, v) => s + v, 0) / positions.length;
    }

    const noeud: NoeudArbre = {
      personneId: id,
      generation,
      x,
      y: generation,
      lignee: true,
      cote,
    };
    place.set(id, noeud);
    noeuds.push(noeud);
    affiches.add(id);

    for (const parentId of ascendants) {
      liens.push({
        id: `${id}->${parentId}`,
        enfantId: id,
        parentId,
        // Le parent était déjà posé par une autre branche : implexe.
        reprise: place.get(parentId)?.generation !== generation + 1,
      });
    }

    return x;
  }

  placer(racineId, 0, 0, 'commune');

  // --- Collatéraux ----------------------------------------------------------
  // Posés après la lignée, dans la place que la mesure leur a réservée : à
  // droite de leur frère ou sœur de la lignée, sur la même rangée.

  if (mode === 'complet') {
    for (const noeud of [...noeuds]) {
      const fratrie = fratrieDe(noeud.personneId);
      let decalage = 1;

      for (const frereId of fratrie) {
        if (place.has(frereId)) continue;

        const noeudFrere: NoeudArbre = {
          personneId: frereId,
          generation: noeud.generation,
          x: noeud.x + decalage,
          y: noeud.generation,
          lignee: false,
          cote: noeud.cote,
        };
        place.set(frereId, noeudFrere);
        noeuds.push(noeudFrere);
        affiches.add(frereId);
        decalage += 1;

        for (const parentId of parents.get(frereId) ?? []) {
          if (!place.has(parentId)) continue;
          liens.push({
            id: `${frereId}->${parentId}`,
            enfantId: frereId,
            parentId,
            reprise: false,
          });
        }
      }
    }
  }

  // --- Conversion en pixels -------------------------------------------------

  const xMin = Math.min(...noeuds.map((n) => n.x));
  const generationMax = Math.max(...noeuds.map((n) => n.generation));

  for (const noeud of noeuds) {
    noeud.x = (noeud.x - xMin) * ESPACEMENT_X;
    // La génération 0 (l'enfant) est en bas de l'image.
    noeud.y = (generationMax - noeud.generation) * ESPACEMENT_Y;
  }

  const unionsAffichees: LienUnion[] = [];
  for (const union of unions.values()) {
    const { conjointA, conjointB } = union;
    if (conjointA && conjointB && place.has(conjointA) && place.has(conjointB)) {
      unionsAffichees.push({ id: union.id, aId: conjointA, bId: conjointB });
    }
  }

  const parGeneration = new Map<number, NoeudArbre[]>();
  for (const noeud of noeuds) {
    const liste = parGeneration.get(noeud.generation) ?? [];
    liste.push(noeud);
    parGeneration.set(noeud.generation, liste);
  }
  for (const liste of parGeneration.values()) liste.sort((a, b) => a.x - b.x);

  return {
    noeuds,
    liens,
    unions: unionsAffichees,
    largeur: Math.max(...noeuds.map((n) => n.x)) + LARGEUR_NOEUD,
    hauteur: (generationMax + 1) * ESPACEMENT_Y,
    parGeneration,
  };
}

/**
 * Nom de génération lisible, du point de vue de l'enfant : « ses
 * arrière-grands-parents » plutôt que « génération 3 ».
 */
export function nommerGeneration(generation: number, prenomRacine = PRENOM_RACINE): string {
  switch (generation) {
    case 0: return prenomRacine;
    case 1: return 'Ses parents';
    case 2: return 'Ses grands-parents';
    case 3: return 'Ses arrière-grands-parents';
    case 4: return 'Ses arrière-arrière-grands-parents';
    // Au-delà, l'empilement de « arrière- » devient illisible.
    default: return `${generation}ᵉ génération`;
  }
}
