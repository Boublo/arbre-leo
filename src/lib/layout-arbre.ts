import type { DonneesArbre, UnionArbre } from '@/lib/arbre';
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

export type ModeArbre = 'ascendance' | 'descendance' | 'famille' | 'eclate';

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
  /**
   * Rang réel de la personne choisie dans la disposition finale.
   * En mode ascendance/descendance elle est toujours à 0 ; en mode famille et
   * éclaté elle peut être ailleurs — les libellés à gauche s'ajustent dessus.
   */
  rangRacine: number;
};

export const ESPACEMENT_X = 240;
export const ESPACEMENT_Y = 175;
export const LARGEUR_NOEUD = 200;
export const HAUTEUR_NOEUD = 90;
/** Bandeau photo à gauche de chaque carte dans l'arbre SVG. */
export const LARGEUR_PHOTO_NOEUD = 54;
export const RAYON_NOEUD = 12;

/** Garde-fou : au-delà, la vue devient illisible et le calcul coûteux. */
const RANG_MAX = 25;

export function disposerArbre(
  donnees: DonneesArbre,
  racineId: string,
  mode: ModeArbre = 'ascendance'
): Disposition {
  if (mode === 'eclate') return disposerEclate(donnees, racineId);
  if (mode === 'famille') return disposerFamille(donnees, racineId);
  return disposerHierarchie(donnees, racineId, mode);
}

// ---------------------------------------------------------------------------
// Famille : ascendance sur trois générations, plus la descendance de chaque
// couple ancestral (frères et sœurs, oncles, tantes, cousins) et deux
// générations sous la personne (enfants, petits-enfants).
// ---------------------------------------------------------------------------
//
// C'est le mode qui répond à la question « qui est de la famille ? » plutôt
// qu'à « d'où viens-je ? ». Il fait naturellement apparaître les cousins et
// les petits-enfants sans qu'on ait à passer à la vue éclatée.

const GENERATIONS_ANCETRES = 3;
const GENERATIONS_DESCENDANTS = 2;

function disposerFamille(donnees: DonneesArbre, racineId: string): Disposition {
  const { parents, enfants, unions, personnes } = donnees;
  const rangs = new Map<string, number>();
  const liens: LienArbre[] = [];

  // Rang négatif = ancêtre, positif = descendant.
  rangs.set(racineId, 0);

  // On remonte d'abord, en enregistrant tous les ancêtres et en gardant leur
  // rang exact — négatif, plus loin de zéro pour les générations plus vieilles.
  const parcoursMontant: Array<{ id: string; rang: number }> = [{ id: racineId, rang: 0 }];
  let curseur = 0;
  while (curseur < parcoursMontant.length) {
    const { id, rang } = parcoursMontant[curseur++]!;
    if (-rang >= GENERATIONS_ANCETRES) continue;
    for (const parentId of parents.get(id) ?? []) {
      if (!personnes.has(parentId) || rangs.has(parentId)) continue;
      rangs.set(parentId, rang - 1);
      parcoursMontant.push({ id: parentId, rang: rang - 1 });
    }
  }

  // Pour chaque couple ancestral déjà placé, on ajoute tous les enfants dont
  // on ne connaît pas encore le rang. Ils vivent juste sous leur couple —
  // c'est ainsi que les frères et sœurs, oncles et tantes se rangent
  // naturellement au bon niveau.
  for (const union of unions.values()) {
    const { conjointA, conjointB, enfants: enfantsUnion } = union;
    const rangA = conjointA ? rangs.get(conjointA) : undefined;
    const rangB = conjointB ? rangs.get(conjointB) : undefined;
    const rangCouple = rangA ?? rangB;
    if (rangCouple === undefined || rangCouple > 0) continue;

    for (const enfantId of enfantsUnion) {
      if (!personnes.has(enfantId) || rangs.has(enfantId)) continue;
      rangs.set(enfantId, rangCouple + 1);
    }
  }

  // Descendants de la personne : enfants, petits-enfants, dans la limite fixée.
  const parcoursDescendant: Array<{ id: string; rang: number }> = [{ id: racineId, rang: 0 }];
  let cursDesc = 0;
  while (cursDesc < parcoursDescendant.length) {
    const { id, rang } = parcoursDescendant[cursDesc++]!;
    if (rang >= GENERATIONS_DESCENDANTS) continue;
    for (const enfantId of enfants.get(id) ?? []) {
      if (!personnes.has(enfantId)) continue;
      const dejaLa = rangs.get(enfantId);
      // Si l'enfant était déjà placé en tant que descendant d'ancêtre, on
      // conserve sa position ; sinon on le pose ici.
      if (dejaLa === undefined) rangs.set(enfantId, rang + 1);
      parcoursDescendant.push({ id: enfantId, rang: rang + 1 });
    }
  }

  // -------------------------------------------------------------------------
  // Placement : les fratries doivent rester groupées sous leur couple parent.
  //
  // Le tri simple par nom, testé plus tôt, entrelaçait les frères et sœurs
  // avec les cousins issus de germains — les traits de filiation se croisaient
  // en tous sens. La solution est de placer d'abord la rangée la plus ancienne,
  // puis de descendre en positionnant chaque personne SOUS le milieu de ses
  // parents déjà placés, avec un écartement minimal pour éviter les collisions.
  // -------------------------------------------------------------------------

  const parRang = new Map<number, string[]>();
  for (const [id, rang] of rangs) {
    const liste = parRang.get(rang) ?? [];
    liste.push(id);
    parRang.set(rang, liste);
  }

  const positions = new Map<string, number>();
  const rangsTries = [...parRang.keys()].sort((a, b) => a - b);

  /** Union à laquelle cette personne est rattachée dans le graphe placé. */
  const unionParentaleDe = (id: string): UnionArbre | null => {
    const personne = personnes.get(id);
    if (!personne?.issuDe) return null;
    return unions.get(personne.issuDe) ?? null;
  };

  /** Position moyenne des parents déjà placés — le point d'ancrage naturel. */
  const ancrageDe = (id: string): number | null => {
    const union = unionParentaleDe(id);
    if (!union) return null;
    const xs: number[] = [];
    for (const c of [union.conjointA, union.conjointB]) {
      if (c && positions.has(c)) xs.push(positions.get(c)!);
    }
    return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
  };

  for (const rang of rangsTries) {
    const liste = parRang.get(rang) ?? [];

    // Tri : d'abord par ancrage parental (les fratries se retrouvent groupées),
    // puis par ordre dans la fratrie de leur union, enfin par nom en dernier
    // recours pour les personnes sans parent placé.
    liste.sort((a, b) => {
      const ua = unionParentaleDe(a);
      const ub = unionParentaleDe(b);
      const anca = ancrageDe(a);
      const ancb = ancrageDe(b);

      // Les personnes rattachées à un couple placé viennent d'abord, groupées
      // par couple, dans l'ordre où l'union les a inscrites.
      if (anca !== null && ancb !== null) {
        if (anca !== ancb) return anca - ancb;
        if (ua && ub && ua.id === ub.id) {
          return ua.enfants.indexOf(a) - ua.enfants.indexOf(b);
        }
      } else if (anca !== null) return -1;
      else if (ancb !== null) return 1;

      const na = personnes.get(a)?.nomComplet ?? '';
      const nb = personnes.get(b)?.nomComplet ?? '';
      return na.localeCompare(nb, 'fr');
    });

    // Placement : on essaie de poser chaque personne à son ancrage idéal, mais
    // on écarte à droite si la précédente occupe déjà la place. Une seconde
    // passe recentrera les fratries sur leur ancrage réel si elles ont dû être
    // décalées.
    //
    // `curseur` démarre à un vrai nombre : sans ça, une rangée entière sans
    // ancrage parental produirait des positions à -Infinity et des NaN en aval.
    let curseur = Number.NEGATIVE_INFINITY;
    let derniereUnion: string | null = null;
    for (const [index, id] of liste.entries()) {
      const u = unionParentaleDe(id);
      const cleUnion = u?.id ?? '_';
      // Un peu d'air entre deux fratries cousines sur la même rangée.
      if (
        derniereUnion &&
        cleUnion !== derniereUnion &&
        derniereUnion !== '_' &&
        cleUnion !== '_'
      ) {
        curseur += 0.85;
      }
      derniereUnion = cleUnion;

      const ideal = ancrageDe(id);
      const suivant = Number.isFinite(curseur) ? curseur + 1 : index;
      const x = Math.max(ideal ?? suivant, suivant);
      positions.set(id, x);
      curseur = x;
    }

    // Seconde passe : chaque fratrie se centre autour de son ancrage, dans la
    // limite de ce que ses voisines lui permettent.
    const parGroupe = new Map<string, string[]>();
    for (const id of liste) {
      const u = unionParentaleDe(id);
      const cle = u ? u.id : '_';
      const g = parGroupe.get(cle) ?? [];
      g.push(id);
      parGroupe.set(cle, g);
    }

    for (const [cle, groupe] of parGroupe) {
      if (cle === '_') continue;
      const xs = groupe.map((id) => positions.get(id) ?? 0);
      if (xs.some((x) => !Number.isFinite(x))) continue;

      const centreActuel = (xs[0]! + xs[xs.length - 1]!) / 2;
      const ideal = ancrageDe(groupe[0]!);
      if (ideal === null || !Number.isFinite(ideal)) continue;
      const decalage = ideal - centreActuel;
      if (Math.abs(decalage) < 0.1) continue;

      // On applique le décalage seulement s'il ne crée pas de collision avec
      // les personnes déjà posées (à gauche ou à droite du groupe).
      const indexPremier = liste.indexOf(groupe[0]!);
      const indexDernier = liste.indexOf(groupe[groupe.length - 1]!);
      const marginGauche =
        indexPremier > 0 ? (positions.get(liste[indexPremier - 1]!) ?? -Infinity) + 1 : -Infinity;
      const marginDroite =
        indexDernier < liste.length - 1
          ? (positions.get(liste[indexDernier + 1]!) ?? Infinity) - 1
          : Infinity;

      const decalageEffectif = Math.max(
        marginGauche - xs[0]!,
        Math.min(decalage, marginDroite - xs[xs.length - 1]!)
      );
      if (!Number.isFinite(decalageEffectif)) continue;
      for (const id of groupe) {
        const courante = positions.get(id) ?? 0;
        positions.set(id, courante + decalageEffectif);
      }
    }
  }

  const noeuds: NoeudArbre[] = [];
  const place = new Map<string, NoeudArbre>();
  const rangMin = rangsTries[0] ?? 0;

  for (const [id, rang] of rangs) {
    const cote =
      rang === 0
        ? coteDesBranches(personnes.get(id)?.branches ?? [])
        : cotePour(id, personnes, 'commune');
    const noeud: NoeudArbre = {
      personneId: id,
      rang: rang - rangMin,
      x: positions.get(id) ?? 0,
      y: rang - rangMin,
      lien:
        id === racineId
          ? 'racine'
          : rang < 0
            ? 'ancetre'
            : rang > 0
              ? 'descendant'
              : 'collateral',
      cote,
    };
    place.set(id, noeud);
    noeuds.push(noeud);
  }

  // Liens de filiation : enfant → parent, quand les deux sont placés.
  for (const [id] of place) {
    for (const parentId of parents.get(id) ?? []) {
      if (!place.has(parentId)) continue;
      liens.push({
        id: `${id}->${parentId}`,
        enfantId: id,
        parentId,
        reprise: false,
      });
    }
  }

  return finaliser(noeuds, liens, place, donnees, 'famille', racineId);
}

/**
 * Lit la couleur d'une personne sur ses branches déclarées, sans propagation.
 * Utile pour la vue famille où toutes les branches se mélangent.
 */
function cotePour(id: string, personnes: DonneesArbre['personnes'], defaut: Cote): Cote {
  const cote = coteDesBranches(personnes.get(id)?.branches ?? []);
  return cote === 'commune' ? defaut : cote;
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
      mode, racineId, rangMax: 0, rangRacine: 0,
    };
  }

  // On assainit d'abord : toute position ou rang non finis produirait des NaN
  // sur les x/y des <circle>, <line>, <rect> plus loin — c'est ce que la
  // console signalait.
  for (const noeud of noeuds) {
    if (!Number.isFinite(noeud.x)) noeud.x = 0;
    if (!Number.isFinite(noeud.rang)) noeud.rang = 0;
  }

  const xs = noeuds.map((n) => n.x);
  const xMin = xs.length > 0 ? Math.min(...xs) : 0;
  const rangs = noeuds.map((n) => n.rang);
  const rangMax = rangs.length > 0 ? Math.max(...rangs) : 0;

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
    rangRacine: place.get(racineId)?.rang ?? 0,
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
export function nommerRang(
  rang: number,
  mode: ModeArbre,
  prenomRacine: string,
  rangRacine = 0
): string {
  const delta = rang - rangRacine;
  if (delta === 0) return prenomRacine;

  // Convention visuelle du projet : la personne choisie est en HAUT (petit y),
  // ses ancêtres et descendants se déroulent VERS LE BAS. Un rang plus grand
  // que celui de la racine est donc plus profond dans l'exploration.
  if (mode === 'ascendance') {
    // Au-delà, l'empilement de « arrière- » devient illisible.
    return ASCENDANCE[delta - 1] ?? `${delta}ᵉ génération au-dessus`;
  }
  if (mode === 'descendance') {
    return DESCENDANCE[delta - 1] ?? `${delta}ᵉ génération en dessous`;
  }
  if (mode === 'famille') {
    // La vue « famille » mélange ligne directe et collatéraux à chaque
    // génération. Étiqueter « ses parents » induirait en erreur puisque le
    // rang contient aussi les oncles et tantes — on parle donc de génération.
    if (delta < 0) {
      switch (-delta) {
        case 1: return 'Génération de ses parents';
        case 2: return 'Génération de ses grands-parents';
        case 3: return 'Génération de ses arrière-grands-parents';
        default: return `${-delta} générations au-dessus`;
      }
    }
    switch (delta) {
      case 1: return 'Génération de ses enfants';
      case 2: return 'Génération de ses petits-enfants';
      default: return `${delta} générations en dessous`;
    }
  }
  return delta === 1 || delta === -1
    ? 'Son entourage direct'
    : `À ${Math.abs(delta)} liens de parenté`;
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
  famille: {
    titre: 'La famille autour',
    aide: 'Ses parents et grands-parents, avec leurs frères, sœurs et cousins, et ses propres enfants et petits-enfants.',
  },
  eclate: {
    titre: 'Tout',
    aide: 'Tout ce qui l’entoure, rangé par degré de parenté : frères, cousins, conjoints, ancêtres et descendants.',
  },
};
