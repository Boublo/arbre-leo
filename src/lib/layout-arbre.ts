import type { DonneesArbre } from '@/lib/arbre';
import { coteDesBranches, type Cote } from '@/lib/branches';

/**
 * Disposition de l'arbre autour d'une personne choisie.
 *
 * Il n'y a pas de racine privilégiée : n'importe qui devient le point de
 * départ, et l'on explore à partir de lui. La personne choisie est toujours en
 * haut, et ce que l'on demande à voir se déroule en dessous — c'est ainsi qu'on
 * lit une descendance comme une ascendance, sans avoir à retourner l'image.
 *
 * Trois manières de regarder la même famille :
 *
 *  — `ascendance` : d'où il vient. Ses parents, leurs parents, jusqu'où l'on sait.
 *  — `descendance` : ce qu'il a laissé. Ses enfants, petits-enfants, et ainsi de suite.
 *  — `eclate` : tout ce qui l'entoure, sans privilégier un sens. Frères, cousins,
 *    conjoints, ancêtres et descendants mêlés, rangés par distance de parenté.
 *
 * Les deux premiers modes sont des arbres et partagent le même algorithme : on
 * mesure d'abord la largeur de chaque sous-arbre, puis on pose les branches
 * côte à côte dans cette largeur et l'on recentre le parent dessus. C'est le
 * principe des « tidy trees », qui évite les croisements sans correction après
 * coup. Seule change la fonction qui dit où aller — vers les parents ou vers
 * les enfants.
 *
 * Deux difficultés propres à un vrai arbre familial :
 *
 *  — l'implexe. Quand deux branches remontent au même ancêtre — cousins mariés
 *    entre eux, chose courante dans un village où l'on se marie entre voisins —
 *    une personne est atteinte par plusieurs chemins. On ne la place qu'une
 *    fois, au premier rencontré, et les autres liens la rejoignent.
 *
 *  — les collatéraux. Frères, sœurs, oncles et tantes ne sont ni ascendants ni
 *    descendants, mais font partie de l'histoire. On leur réserve de la place
 *    dès la mesure, faute de quoi ils chevaucheraient les sous-arbres voisins.
 */

export type ModeArbre = 'ascendance' | 'descendance' | 'eclate';

/** Ce qui rattache un nœud à la personne choisie. */
export type LienRacine = 'racine' | 'ancetre' | 'descendant' | 'collateral' | 'conjoint';

export type NoeudArbre = {
  personneId: string;
  /** Nombre de liens qui séparent de la personne choisie. 0 pour elle-même. */
  rang: number;
  x: number;
  y: number;
  lien: LienRacine;
  cote: Cote;
};

export type LienArbre = {
  id: string;
  /** Toujours orienté enfant → parent, quel que soit le sens d'exploration. */
  enfantId: string;
  parentId: string;
  /** Un lien vers une personne déjà posée ailleurs : tracé en pointillé. */
  reprise: boolean;
};

export type LienUnion = { id: string; aId: string; bId: string };

export type Disposition = {
  noeuds: NoeudArbre[];
  liens: LienArbre[];
  unions: LienUnion[];
  largeur: number;
  hauteur: number;
  mode: ModeArbre;
  racineId: string;
  /** Profondeur atteinte, en nombre de rangs. */
  rangMax: number;
};

export const ESPACEMENT_X = 210;
export const ESPACEMENT_Y = 150;
export const LARGEUR_NOEUD = 180;
export const HAUTEUR_NOEUD = 64;

/** Garde-fou : au-delà, la vue devient illisible et le calcul coûteux. */
const RANG_MAX = 25;

export function disposerArbre(
  donnees: DonneesArbre,
  racineId: string,
  mode: ModeArbre = 'ascendance'
): Disposition {
  return mode === 'eclate'
    ? disposerEclate(donnees, racineId)
    : disposerHierarchie(donnees, racineId, mode);
}

// ---------------------------------------------------------------------------
// Ascendance et descendance : un arbre, deux sens de lecture
// ---------------------------------------------------------------------------

function disposerHierarchie(
  donnees: DonneesArbre,
  racineId: string,
  mode: 'ascendance' | 'descendance'
): Disposition {
  const { parents, enfants, unions, personnes } = donnees;

  // Le seul point où les deux modes diffèrent.
  const suivantsDe = (id: string): string[] => {
    const liste = mode === 'ascendance' ? parents.get(id) : enfants.get(id);
    return [...new Set(liste ?? [])].filter((p) => personnes.has(p));
  };

  const noeuds: NoeudArbre[] = [];
  const liens: LienArbre[] = [];
  const place = new Map<string, NoeudArbre>();

  /** Frères et sœurs, hors la personne elle-même. */
  function fratrieDe(id: string): string[] {
    const personne = personnes.get(id);
    if (!personne?.issuDe) return [];
    return (unions.get(personne.issuDe)?.enfants ?? []).filter(
      (e) => e !== id && personnes.has(e)
    );
  }

  // --- Mesure ---------------------------------------------------------------

  const mesures = new Map<string, number>();
  const enCours = new Set<string>();

  function mesurer(id: string, rang: number): number {
    const connue = mesures.get(id);
    if (connue !== undefined) return connue;

    // Une boucle de filiation — donnée fautive — ne doit pas faire tourner
    // la récursion indéfiniment.
    if (enCours.has(id) || rang > RANG_MAX) return 1;
    enCours.add(id);

    const suivants = suivantsDe(id);
    const largeurSuivants = suivants.reduce((somme, s) => somme + mesurer(s, rang + 1), 0);

    // En ascendance seulement : la fratrie de la personne choisie occupe la
    // même rangée qu'elle. En descendance, les enfants sont déjà des suivants.
    const largeurFratrie =
      mode === 'ascendance' && rang === 0 ? 1 + fratrieDe(id).length : 1;

    const largeur = Math.max(1, largeurSuivants, largeurFratrie);

    enCours.delete(id);
    mesures.set(id, largeur);
    return largeur;
  }

  mesurer(racineId, 0);

  // --- Placement ------------------------------------------------------------

  function cotePour(id: string, coteHerite: Cote): Cote {
    if (coteHerite !== 'commune') return coteHerite;
    return coteDesBranches(personnes.get(id)?.branches ?? []);
  }

  function placer(id: string, gauche: number, rang: number, cote: Cote): number {
    // Déjà posé par un autre chemin : on conserve la première position.
    const existant = place.get(id);
    if (existant) return existant.x;

    const largeur = mesures.get(id) ?? 1;
    const suivants = rang >= RANG_MAX ? [] : suivantsDe(id);

    let x: number;

    if (suivants.length === 0) {
      x = gauche + largeur / 2;
    } else {
      let curseur = gauche;
      const positions: number[] = [];

      for (const [ordre, suivantId] of suivants.entries()) {
        const largeurSuivant = mesures.get(suivantId) ?? 1;

        // Au départ le côté n'est pas fixé : on le lit sur les branches
        // déclarées, et à défaut sur l'ordre — les conjoints sont rangés dans
        // l'ordre de l'union, le premier tenant la gauche.
        let coteSuivant = cotePour(suivantId, cote);
        if (coteSuivant === 'commune' && mode === 'ascendance') {
          coteSuivant = ordre === 0 ? 'paternelle' : 'maternelle';
        }

        positions.push(placer(suivantId, curseur, rang + 1, coteSuivant));
        curseur += largeurSuivant;
      }

      x = positions.reduce((s, v) => s + v, 0) / positions.length;
    }

    const noeud: NoeudArbre = {
      personneId: id,
      rang,
      x,
      y: rang,
      lien: rang === 0 ? 'racine' : mode === 'ascendance' ? 'ancetre' : 'descendant',
      cote,
    };
    place.set(id, noeud);
    noeuds.push(noeud);

    for (const suivantId of suivants) {
      const [enfantId, parentId] =
        mode === 'ascendance' ? [id, suivantId] : [suivantId, id];
      liens.push({
        id: `${enfantId}->${parentId}`,
        enfantId,
        parentId,
        reprise: place.get(suivantId)?.rang !== rang + 1,
      });
    }

    return x;
  }

  placer(racineId, 0, 0, 'commune');

  // --- Fratrie de la personne choisie ---------------------------------------
  // Uniquement en ascendance : on regarde d'où vient quelqu'un, ses frères et
  // sœurs sont le premier cercle de son histoire. La place leur a été réservée.

  if (mode === 'ascendance') {
    const racine = place.get(racineId);
    if (racine) {
      let decalage = 1;
      for (const frereId of fratrieDe(racineId)) {
        if (place.has(frereId)) continue;

        const noeud: NoeudArbre = {
          personneId: frereId,
          rang: 0,
          x: racine.x + decalage,
          y: 0,
          lien: 'collateral',
          cote: racine.cote,
        };
        place.set(frereId, noeud);
        noeuds.push(noeud);
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

  return finaliser(noeuds, liens, place, donnees, mode, racineId);
}

// ---------------------------------------------------------------------------
// Éclaté : tout le monde autour d'une personne, par distance de parenté
// ---------------------------------------------------------------------------

function disposerEclate(donnees: DonneesArbre, racineId: string): Disposition {
  const { parents, enfants, unions, personnes } = donnees;

  const noeuds: NoeudArbre[] = [];
  const liens: LienArbre[] = [];
  const place = new Map<string, NoeudArbre>();
  const vu = new Set<string>([racineId]);

  /** Toutes les personnes reliées à celle-ci, quel que soit le sens. */
  function voisinsDe(id: string): { id: string; lien: LienRacine }[] {
    const voisins: { id: string; lien: LienRacine }[] = [];

    for (const p of parents.get(id) ?? []) voisins.push({ id: p, lien: 'ancetre' });
    for (const e of enfants.get(id) ?? []) voisins.push({ id: e, lien: 'descendant' });

    const personne = personnes.get(id);
    for (const unionId of personne?.unions ?? []) {
      const union = unions.get(unionId);
      if (!union) continue;
      for (const conjoint of [union.conjointA, union.conjointB]) {
        if (conjoint && conjoint !== id) voisins.push({ id: conjoint, lien: 'conjoint' });
      }
    }

    // Frères et sœurs : reliés par leurs parents, mais on les veut proches.
    if (personne?.issuDe) {
      for (const frere of unions.get(personne.issuDe)?.enfants ?? []) {
        if (frere !== id) voisins.push({ id: frere, lien: 'collateral' });
      }
    }

    return voisins.filter((v) => personnes.has(v.id));
  }

  // Parcours en largeur : chaque couche est un degré de parenté de plus.
  let couche = [{ id: racineId, lien: 'racine' as LienRacine }];
  let rang = 0;

  while (couche.length > 0 && rang <= RANG_MAX) {
    // Les couches lointaines s'élargissent vite ; on les range par nom pour
    // que l'affichage reste stable d'un chargement à l'autre.
    const ordonnee = [...couche].sort((a, b) =>
      (personnes.get(a.id)?.nomComplet ?? '').localeCompare(
        personnes.get(b.id)?.nomComplet ?? '',
        'fr'
      )
    );

    ordonnee.forEach((entree, index) => {
      const noeud: NoeudArbre = {
        personneId: entree.id,
        rang,
        // Couche centrée sur l'axe de la personne choisie.
        x: index - (ordonnee.length - 1) / 2,
        y: rang,
        lien: entree.lien,
        cote: coteDesBranches(personnes.get(entree.id)?.branches ?? []),
      };
      place.set(entree.id, noeud);
      noeuds.push(noeud);
    });

    const suivante: { id: string; lien: LienRacine }[] = [];
    for (const entree of ordonnee) {
      for (const voisin of voisinsDe(entree.id)) {
        if (vu.has(voisin.id)) continue;
        vu.add(voisin.id);
        suivante.push(voisin);
      }
    }

    couche = suivante;
    rang += 1;
  }

  // Les liens de filiation se lisent sur les personnes réellement placées.
  for (const noeud of noeuds) {
    for (const parentId of parents.get(noeud.personneId) ?? []) {
      if (!place.has(parentId)) continue;
      liens.push({
        id: `${noeud.personneId}->${parentId}`,
        enfantId: noeud.personneId,
        parentId,
        // En vue éclatée, un lien ne relie pas forcément deux couches voisines.
        reprise: Math.abs((place.get(parentId)?.rang ?? 0) - noeud.rang) !== 1,
      });
    }
  }

  return finaliser(noeuds, liens, place, donnees, 'eclate', racineId);
}

// ---------------------------------------------------------------------------
// Mise en pixels, commune aux trois modes
// ---------------------------------------------------------------------------

function finaliser(
  noeuds: NoeudArbre[],
  liens: LienArbre[],
  place: Map<string, NoeudArbre>,
  donnees: DonneesArbre,
  mode: ModeArbre,
  racineId: string
): Disposition {
  if (noeuds.length === 0) {
    return {
      noeuds: [], liens: [], unions: [],
      largeur: LARGEUR_NOEUD, hauteur: HAUTEUR_NOEUD,
      mode, racineId, rangMax: 0,
    };
  }

  const xMin = Math.min(...noeuds.map((n) => n.x));
  const rangMax = Math.max(...noeuds.map((n) => n.rang));

  for (const noeud of noeuds) {
    noeud.x = (noeud.x - xMin) * ESPACEMENT_X;
    // La personne choisie est en haut ; l'exploration se déroule vers le bas.
    noeud.y = noeud.rang * ESPACEMENT_Y;
  }

  const unionsAffichees: LienUnion[] = [];
  for (const union of donnees.unions.values()) {
    const { conjointA, conjointB } = union;
    if (conjointA && conjointB && place.has(conjointA) && place.has(conjointB)) {
      unionsAffichees.push({ id: union.id, aId: conjointA, bId: conjointB });
    }
  }

  return {
    noeuds,
    liens,
    unions: unionsAffichees,
    largeur: Math.max(...noeuds.map((n) => n.x)) + LARGEUR_NOEUD,
    hauteur: (rangMax + 1) * ESPACEMENT_Y,
    mode,
    racineId,
    rangMax,
  };
}

// ---------------------------------------------------------------------------
// Libellés
// ---------------------------------------------------------------------------

const ASCENDANCE = [
  'Ses parents',
  'Ses grands-parents',
  'Ses arrière-grands-parents',
  'Ses arrière-arrière-grands-parents',
];

const DESCENDANCE = ['Ses enfants', 'Ses petits-enfants', 'Ses arrière-petits-enfants'];

/**
 * Nom d'un rang, du point de vue de la personne choisie : « ses
 * arrière-grands-parents » plutôt que « génération 3 ».
 */
export function nommerRang(rang: number, mode: ModeArbre, prenomRacine: string): string {
  if (rang === 0) return prenomRacine;

  if (mode === 'ascendance') {
    // Au-delà, l'empilement de « arrière- » devient illisible.
    return ASCENDANCE[rang - 1] ?? `${rang}ᵉ génération au-dessus`;
  }
  if (mode === 'descendance') {
    return DESCENDANCE[rang - 1] ?? `${rang}ᵉ génération en dessous`;
  }
  return rang === 1 ? 'Son entourage direct' : `À ${rang} liens de parenté`;
}

export const LIBELLE_MODE: Record<ModeArbre, { titre: string; aide: string }> = {
  ascendance: {
    titre: 'D’où il vient',
    aide: 'Ses parents, ses grands-parents, et ainsi de suite jusqu’où l’on sait.',
  },
  descendance: {
    titre: 'Ce qu’il a laissé',
    aide: 'Ses enfants, ses petits-enfants, et toute sa descendance connue.',
  },
  eclate: {
    titre: 'Toute la famille',
    aide: 'Tout ce qui l’entoure, rangé par degré de parenté : frères, cousins, conjoints, ancêtres et descendants.',
  },
};
