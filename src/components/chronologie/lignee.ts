import type { Sexe } from '@/lib/types-base';

/**
 * La lignée d'une personne.
 *
 * La frise entière est une belle chose, mais on cherche presque toujours
 * quelqu'un en particulier : on veut alors voir sa vie, celle des gens dont il
 * descend et celle de ceux qui descendent de lui — le reste de la famille est
 * du bruit. Ce module ne connaît ni la base ni React : il reçoit les deux
 * tables de parenté telles quelles et rend des ensembles d'identifiants.
 *
 * La parenté est un graphe, pas un arbre : deux cousins qui se marient
 * referment une boucle, et un fichier GEDCOM mal recollé peut faire d'un homme
 * son propre aïeul. Tout parcours garde donc un ensemble des personnes déjà
 * vues et ne repasse jamais deux fois par la même.
 */

// ---------------------------------------------------------------------------
// Les trois portées
// ---------------------------------------------------------------------------

export type PorteeLignee = 'lignee' | 'proche' | 'toute';

/** Choisir quelqu'un, c'est vouloir sa lignée : c'est la portée par défaut. */
export const PORTEE_PAR_DEFAUT: PorteeLignee = 'lignee';

export const PORTEES: { valeur: PorteeLignee; libelle: string; aide: string }[] = [
  {
    valeur: 'lignee',
    libelle: 'Sa lignée',
    aide: 'Sa vie, celle de tous ses ascendants connus et celle de ses descendants.',
  },
  {
    valeur: 'proche',
    libelle: 'Ses proches',
    aide: 'Elle seule, ses parents, ses frères et sœurs, ses enfants.',
  },
  {
    valeur: 'toute',
    libelle: 'Toute la famille',
    aide: 'La frise entière, sans resserrement.',
  },
];

/** Une portée inconnue dans l'adresse ne fait pas d'erreur : on retombe sur la lignée. */
export function lirePortee(valeur: string | null | undefined): PorteeLignee {
  return PORTEES.find((p) => p.valeur === valeur)?.valeur ?? PORTEE_PAR_DEFAUT;
}

// ---------------------------------------------------------------------------
// Le graphe de parenté
// ---------------------------------------------------------------------------

/** Ce que ce module lit d'une union : qui elle réunit. */
export type LigneUnion = {
  id: string;
  conjoint_a: string | null;
  conjoint_b: string | null;
};

/** Ce que ce module lit d'une filiation : quel enfant naît de quelle union. */
export type LigneFiliation = { union_id: string; enfant_id: string };

export type RelationsFamille = {
  /** Personne → ses parents connus. */
  parents: Map<string, string[]>;
  /** Personne → ses enfants connus. */
  enfants: Map<string, string[]>;
  /** Union → les conjoints qu'elle réunit, les inconnus retirés. */
  conjointsParUnion: Map<string, string[]>;
};

function ajouter(index: Map<string, string[]>, cle: string, valeur: string): void {
  const liste = index.get(cle);
  if (!liste) index.set(cle, [valeur]);
  else if (!liste.includes(valeur)) liste.push(valeur);
}

/**
 * Recroise `unions` et `filiations` en deux index symétriques.
 *
 * Une filiation dont l'union n'a pas été chargée est ignorée : les politiques
 * de la base peuvent parfaitement masquer l'une et pas l'autre, et une union
 * absente ne dit rien de qui sont les parents.
 */
export function construireRelations(
  unions: readonly LigneUnion[],
  filiations: readonly LigneFiliation[]
): RelationsFamille {
  const conjointsParUnion = new Map<string, string[]>();
  for (const u of unions) {
    conjointsParUnion.set(
      u.id,
      [u.conjoint_a, u.conjoint_b].filter((id): id is string => Boolean(id))
    );
  }

  const parents = new Map<string, string[]>();
  const enfants = new Map<string, string[]>();

  for (const f of filiations) {
    const conjoints = conjointsParUnion.get(f.union_id);
    if (!conjoints) continue;

    for (const parent of conjoints) {
      // Une saisie fautive ferait de quelqu'un son propre parent : on refuse
      // le lien plutôt que de laisser le parcours tourner en rond.
      if (parent === f.enfant_id) continue;
      ajouter(parents, f.enfant_id, parent);
      ajouter(enfants, parent, f.enfant_id);
    }
  }

  return { parents, enfants, conjointsParUnion };
}

// ---------------------------------------------------------------------------
// Parcours
// ---------------------------------------------------------------------------

/**
 * Parcours en largeur d'un index de parenté, du départ vers ses voisins.
 *
 * Le résultat associe à chaque personne atteinte le nombre de générations qui
 * la séparent du départ — celui-ci compris, au rang zéro. La table des rangs
 * sert aussi d'ensemble des personnes déjà vues : une boucle dans le graphe se
 * referme d'elle-même, sans récursion infinie.
 */
function parcourir(index: Map<string, string[]>, depart: string): Map<string, number> {
  const rangs = new Map<string, number>([[depart, 0]]);
  let frontiere = [depart];
  let rang = 0;

  while (frontiere.length > 0) {
    rang += 1;
    const suivante: string[] = [];

    for (const id of frontiere) {
      for (const voisin of index.get(id) ?? []) {
        if (rangs.has(voisin)) continue;
        rangs.set(voisin, rang);
        suivante.push(voisin);
      }
    }

    frontiere = suivante;
  }

  return rangs;
}

/** Tous les ascendants connus, du plus proche au plus lointain, par génération. */
export function remonter(relations: RelationsFamille, depart: string): Map<string, number> {
  return parcourir(relations.parents, depart);
}

/** Toute la descendance connue, par génération. */
export function descendre(relations: RelationsFamille, depart: string): Map<string, number> {
  return parcourir(relations.enfants, depart);
}

/**
 * Frères et sœurs : les autres enfants des parents.
 *
 * On passe par les parents plutôt que par l'union d'origine, ce qui embrasse
 * les demi-frères et demi-sœurs nés d'un second lit — ils sont de la famille
 * autant que les autres.
 */
export function fratrie(relations: RelationsFamille, personne: string): string[] {
  const freres = new Set<string>();
  for (const parent of relations.parents.get(personne) ?? []) {
    for (const enfant of relations.enfants.get(parent) ?? []) {
      if (enfant !== personne) freres.add(enfant);
    }
  }
  return [...freres];
}

// ---------------------------------------------------------------------------
// L'ensemble retenu
// ---------------------------------------------------------------------------

export type EnsembleLignee = {
  personne: string;
  portee: PorteeLignee;
  /** Les personnes dont la vie sera déroulée, celle de départ comprise. */
  personnes: Set<string>;
  generationsRemontees: number;
  generationsDescendues: number;
  nombreAscendants: number;
  nombreDescendants: number;
};

/**
 * Qui la frise doit suivre, selon la portée demandée.
 *
 * Rien n'est rendu pour « toute » : la famille entière n'a pas d'ensemble, elle
 * est le cas où l'on ne filtre pas.
 *
 * Les conjoints ne sont pas retenus comme personnes — ce sont les vies de la
 * lignée qu'on suit, pas celles des familles rapportées. Les mariages n'en
 * disparaissent pas pour autant : un événement porté par une union est retenu
 * dès que l'un des deux conjoints est de la lignée.
 */
export function ensembleDeLaPortee(
  relations: RelationsFamille,
  personne: string,
  portee: PorteeLignee
): EnsembleLignee | null {
  if (portee === 'toute') return null;

  if (portee === 'proche') {
    const parents = relations.parents.get(personne) ?? [];
    const enfants = relations.enfants.get(personne) ?? [];
    const freres = fratrie(relations, personne);

    return {
      personne,
      portee,
      personnes: new Set<string>([personne, ...parents, ...freres, ...enfants]),
      generationsRemontees: parents.length > 0 ? 1 : 0,
      generationsDescendues: enfants.length > 0 ? 1 : 0,
      nombreAscendants: parents.length,
      nombreDescendants: enfants.length,
    };
  }

  const ascendants = remonter(relations, personne);
  const descendants = descendre(relations, personne);

  return {
    personne,
    portee,
    personnes: new Set<string>([personne, ...ascendants.keys(), ...descendants.keys()]),
    generationsRemontees: rangLePlusLointain(ascendants),
    generationsDescendues: rangLePlusLointain(descendants),
    // Le départ compte pour lui-même dans les deux tables : on le retire.
    nombreAscendants: ascendants.size - 1,
    nombreDescendants: descendants.size - 1,
  };
}

function rangLePlusLointain(rangs: Map<string, number>): number {
  let plus = 0;
  for (const rang of rangs.values()) if (rang > plus) plus = rang;
  return plus;
}

/** Le périmètre effectivement interrogé par la frise : des personnes et des unions. */
export type PerimetreLignee = {
  personnes: ReadonlySet<string>;
  unions: ReadonlySet<string>;
};

/** Les unions dont au moins un conjoint est de la lignée. */
export function perimetreDeLEnsemble(
  relations: RelationsFamille,
  ensemble: EnsembleLignee
): PerimetreLignee {
  const unions = new Set<string>();
  for (const [union, conjoints] of relations.conjointsParUnion) {
    if (conjoints.some((id) => ensemble.personnes.has(id))) unions.add(union);
  }
  return { personnes: ensemble.personnes, unions };
}

/**
 * Un événement entre dans la frise resserrée s'il touche quelqu'un de la
 * lignée, directement ou par l'union qui le porte. Celui qui n'est rattaché
 * ni à une personne ni à une union ne concerne personne en particulier : il
 * reste sur la frise entière.
 */
export function concerneLaLignee(
  perimetre: PerimetreLignee,
  personneId: string | null,
  unionId: string | null
): boolean {
  if (personneId) return perimetre.personnes.has(personneId);
  if (unionId) return perimetre.unions.has(unionId);
  return false;
}

// ---------------------------------------------------------------------------
// La période couverte
// ---------------------------------------------------------------------------

/**
 * Le temps que la lignée traverse réellement.
 *
 * Il sert à écarter les faits historiques hors sujet : la guerre d'Algérie n'a
 * rien à faire sous quelqu'un mort en 1812.
 */
export type Periode = { debut: number; fin: number };

export function periodeDesAnnees(annees: readonly (number | null)[]): Periode | null {
  let debut: number | null = null;
  let fin: number | null = null;

  for (const annee of annees) {
    if (annee === null) continue;
    if (debut === null || annee < debut) debut = annee;
    if (fin === null || annee > fin) fin = annee;
  }

  return debut === null || fin === null ? null : { debut, fin };
}

/** Vrai si l'intervalle d'un fait touche la période, bornes comprises. */
export function chevauchePeriode(
  periode: Periode | null,
  debut: number,
  fin: number | null
): boolean {
  if (!periode) return false;
  return (fin ?? debut) >= periode.debut && debut <= periode.fin;
}

// ---------------------------------------------------------------------------
// Dire une vie en quelques chiffres
// ---------------------------------------------------------------------------

/** « 1798 – 1861 », « 1798 – … », « … – 1861 » : forme brève, pour une liste. */
export function bornesDeVie(naissance: number | null, deces: number | null): string | null {
  if (naissance === null && deces === null) return null;
  return `${naissance ?? '…'} – ${deces ?? '…'}`;
}

/**
 * « 1798 – 1861 », « née en 1798 », « mort en 1861 » : forme rédigée, pour le
 * bandeau. L'accord suit le sexe connu ; à défaut, le masculin l'emporte, faute
 * de mieux.
 */
export function anneesDeVie(
  naissance: number | null,
  deces: number | null,
  sexe: Sexe
): string | null {
  const accord = (mot: string) => (sexe === 'F' ? `${mot}e` : mot);

  if (naissance !== null && deces !== null) return `${naissance} – ${deces}`;
  if (naissance !== null) return `${accord('né')} en ${naissance}`;
  if (deces !== null) return `${accord('mort')} en ${deces}`;
  return null;
}
