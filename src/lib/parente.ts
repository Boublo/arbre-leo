import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';
import type { Sexe } from '@/lib/types-base';

/**
 * Calcul du lien de parenté entre deux personnes de l'arbre.
 *
 * On part de deux identifiants et l'on cherche leur ancêtre commun le plus
 * proche par une remontée en largeur des lignes parentales. La distance en
 * générations, depuis chacune des deux personnes jusqu'à cet ancêtre, dicte
 * ensuite le nom du lien : frère, cousin germain, oncle, arrière-grand-mère…
 *
 * La remontée est bornée à quinze générations — au-delà, aucun acte ne relie
 * plus la famille elle-même à ce qui l'a précédée, et l'on économise la
 * traversée de branches lointaines. Les boucles de filiation, très rares mais
 * possibles quand deux cousins se marient, ne font pas tourner l'algorithme :
 * chaque parent n'est visité qu'une fois, à sa plus courte distance.
 */

const REMONTEE_MAX = 15;

export type ResultatParente = {
  /** Étiquette courte : « cousin germain », « grand-mère », « oncle ». */
  lien: string;
  /** Phrase complète, prête à afficher : « X est le … de Y. ». */
  description: string;
  /** Identifiant de l'ancêtre commun le plus proche, ou `null` s'il n'y en a pas. */
  ancetreCommun: string | null;
  /** Nombre de générations séparant A de l'ancêtre (0 si A est cet ancêtre). */
  distanceA: number;
  /** Idem pour B. */
  distanceB: number;
  /**
   * Suite d'identifiants qui décrit le chemin : de A, remontée jusqu'à
   * l'ancêtre commun, puis redescente jusqu'à B. Vide si aucun lien n'est
   * connu. Réduit à `[aId]` quand les deux personnes sont la même.
   */
  chemin: string[];
};

export function calculerParente(
  donnees: DonneesArbre,
  aId: string,
  bId: string
): ResultatParente {
  const a = donnees.personnes.get(aId);
  const b = donnees.personnes.get(bId);

  if (!a || !b) {
    return {
      lien: 'personne inconnue',
      description: 'L’une des deux personnes n’est pas dans l’arbre.',
      ancetreCommun: null,
      distanceA: 0,
      distanceB: 0,
      chemin: [],
    };
  }

  if (aId === bId) {
    return {
      lien: 'la même personne',
      description: 'Ce sont deux fois la même personne.',
      ancetreCommun: aId,
      distanceA: 0,
      distanceB: 0,
      chemin: [aId],
    };
  }

  const ascendanceA = remonter(donnees, aId, REMONTEE_MAX);
  const ascendanceB = remonter(donnees, bId, REMONTEE_MAX);

  // On garde l'ancêtre dont la somme des deux distances est la plus petite :
  // celui qui minimise le nombre de générations à traverser.
  let meilleur: { id: string; distA: number; distB: number } | null = null;
  for (const [id, distA] of ascendanceA.distances) {
    const distB = ascendanceB.distances.get(id);
    if (distB === undefined) continue;
    const total = distA + distB;
    if (!meilleur || total < meilleur.distA + meilleur.distB) {
      meilleur = { id, distA, distB };
    }
  }

  if (!meilleur) {
    return {
      lien: 'aucun lien connu',
      description: `${a.nomComplet} et ${b.nomComplet} n’ont pas d’ancêtre commun dans l’arbre — au moins jusqu’à quinze générations.`,
      ancetreCommun: null,
      distanceA: 0,
      distanceB: 0,
      chemin: [],
    };
  }

  const cheminAncetreDepuisA = reconstruireChemin(
    ascendanceA.precedents,
    aId,
    meilleur.id
  );
  const cheminAncetreDepuisB = reconstruireChemin(
    ascendanceB.precedents,
    bId,
    meilleur.id
  );

  // De A à B : la remontée depuis A, suivie de la redescente depuis l'ancêtre
  // jusqu'à B (on enlève l'ancêtre déjà présent en fin de la première moitié).
  const chemin = [
    ...cheminAncetreDepuisA,
    ...cheminAncetreDepuisB.slice(0, -1).reverse(),
  ];

  const { lien, description } = nommerLien(a, b, meilleur.distA, meilleur.distB);

  return {
    lien,
    description,
    ancetreCommun: meilleur.id,
    distanceA: meilleur.distA,
    distanceB: meilleur.distB,
    chemin,
  };
}

// ---------------------------------------------------------------------------
// Remontée en largeur
// ---------------------------------------------------------------------------

type Ascendance = {
  /** Personne → distance en générations depuis le départ (le départ inclus, à 0). */
  distances: Map<string, number>;
  /**
   * Personne → l'un de ses enfants par lequel la remontée est passée. Permet
   * de retracer le chemin sans conserver les listes complètes de tous les
   * itinéraires possibles.
   */
  precedents: Map<string, string>;
};

function remonter(
  donnees: DonneesArbre,
  depart: string,
  limite: number
): Ascendance {
  const distances = new Map<string, number>();
  const precedents = new Map<string, string>();
  distances.set(depart, 0);

  let frontiere: string[] = [depart];
  while (frontiere.length > 0) {
    const suivante: string[] = [];
    for (const id of frontiere) {
      const distance = distances.get(id) ?? 0;
      if (distance >= limite) continue;
      for (const parent of donnees.parents.get(id) ?? []) {
        // Un parent déjà vu l'a été à une distance plus courte : on ne repasse
        // pas dessus, ce qui coupe court aux boucles de filiation.
        if (distances.has(parent)) continue;
        distances.set(parent, distance + 1);
        precedents.set(parent, id);
        suivante.push(parent);
      }
    }
    frontiere = suivante;
  }

  return { distances, precedents };
}

function reconstruireChemin(
  precedents: Map<string, string>,
  depart: string,
  ancetre: string
): string[] {
  if (ancetre === depart) return [depart];

  // On part de l'ancêtre et l'on redescend jusqu'à la personne de départ en
  // suivant `precedents`. Le tableau est ensuite retourné pour partir du
  // départ. Un garde-fou sur les identifiants déjà vus évite qu'une donnée
  // corrompue ne fasse boucler la reconstruction.
  const chemin: string[] = [];
  const vus = new Set<string>();
  let courant: string | undefined = ancetre;
  while (courant && courant !== depart) {
    if (vus.has(courant)) break;
    vus.add(courant);
    chemin.push(courant);
    courant = precedents.get(courant);
  }
  chemin.push(depart);
  return chemin.reverse();
}

// ---------------------------------------------------------------------------
// Vocabulaire du lien
// ---------------------------------------------------------------------------

function nommerLien(
  a: PersonneArbre,
  b: PersonneArbre,
  distA: number,
  distB: number
): { lien: string; description: string } {
  // Cas 1 : A est un ancêtre de B.
  if (distA === 0) {
    const lien = ascendantDe(a.sexe, distB);
    return { lien, description: phrase(a, lien, b) };
  }
  // Cas 2 : B est un ancêtre de A — donc A est descendant de B.
  if (distB === 0) {
    const lien = descendantDe(a.sexe, distA);
    return { lien, description: phrase(a, lien, b) };
  }

  // Cas 3 : même génération.
  if (distA === distB) {
    const lien = generationCommune(a.sexe, distA);
    return { lien, description: phrase(a, lien, b) };
  }

  // Cas 4 : générations différentes.
  if (distA < distB) {
    // A est de la génération plus ancienne : oncle, grand-oncle, arrière-…
    if (distA === 1) {
      const lien = oncleDe(a.sexe, distB - 2);
      return { lien, description: phrase(a, lien, b) };
    }
    // Deux branches à plus de deux générations : pas de nom d'usage simple,
    // on rend le décalage en clair.
    const lien = cousinEloigne(a.sexe, distA, distB);
    return { lien, description: phrase(a, lien, b) };
  }

  // distA > distB : A est de la génération plus jeune → neveu, petit-neveu…
  if (distB === 1) {
    const lien = neveuDe(a.sexe, distA - 2);
    return { lien, description: phrase(a, lien, b) };
  }
  const lien = cousinEloigne(a.sexe, distA, distB);
  return { lien, description: phrase(a, lien, b) };
}

/** « A est le X de B. » — l'article s'adapte à la première lettre du mot. */
function phrase(a: PersonneArbre, lien: string, b: PersonneArbre): string {
  return `${a.nomComplet} est ${article(a.sexe, lien)}${lien} de ${b.nomComplet}.`;
}

/** « le », « la » ou « l’ » — élision devant voyelle et « h ». */
function article(sexe: Sexe, mot: string): string {
  const premiere = mot.charAt(0).toLowerCase();
  const voyelles = 'aàâäeéèêëiîïoôöuùûüh';
  if (voyelles.includes(premiere)) return 'l’';
  return sexe === 'F' ? 'la ' : 'le ';
}

/** « arrière-arrière-grand-mère » : préfixe le mot du bon nombre d'« arrière ». */
function arriere(nombre: number, base: string): string {
  if (nombre <= 0) return base;
  return `${Array(nombre).fill('arrière').join('-')}-${base}`;
}

function ascendantDe(sexe: Sexe, generations: number): string {
  if (generations === 1) {
    if (sexe === 'F') return 'mère';
    if (sexe === 'M') return 'père';
    return 'parent';
  }
  const base =
    sexe === 'F' ? 'grand-mère' : sexe === 'M' ? 'grand-père' : 'grand-parent';
  return arriere(generations - 2, base);
}

function descendantDe(sexe: Sexe, generations: number): string {
  if (generations === 1) {
    if (sexe === 'F') return 'fille';
    if (sexe === 'M') return 'fils';
    return 'enfant';
  }
  const base =
    sexe === 'F' ? 'petite-fille' : sexe === 'M' ? 'petit-fils' : 'petit-enfant';
  return arriere(generations - 2, base);
}

function generationCommune(sexe: Sexe, distance: number): string {
  if (distance === 1) {
    if (sexe === 'F') return 'sœur';
    if (sexe === 'M') return 'frère';
    return 'frère ou sœur';
  }
  if (distance === 2) {
    return sexe === 'F' ? 'cousine germaine' : 'cousin germain';
  }
  if (distance === 3) {
    return sexe === 'F' ? 'cousine issue de germains' : 'cousin issu de germains';
  }
  return sexe === 'F'
    ? `cousine au ${distance}ᵉ degré`
    : `cousin au ${distance}ᵉ degré`;
}

function oncleDe(sexe: Sexe, decalage: number): string {
  const base = sexe === 'F' ? 'tante' : sexe === 'M' ? 'oncle' : 'oncle ou tante';
  if (decalage === 0) return base;
  if (decalage === 1) return `grand-${base}`;
  return arriere(decalage - 1, `grand-${base}`);
}

function neveuDe(sexe: Sexe, decalage: number): string {
  if (decalage === 0) {
    if (sexe === 'F') return 'nièce';
    if (sexe === 'M') return 'neveu';
    return 'neveu ou nièce';
  }
  const base =
    sexe === 'F'
      ? 'petite-nièce'
      : sexe === 'M'
        ? 'petit-neveu'
        : 'petit-neveu ou petite-nièce';
  if (decalage === 1) return base;
  return arriere(decalage - 1, base);
}

function cousinEloigne(sexe: Sexe, distA: number, distB: number): string {
  const base =
    sexe === 'F'
      ? 'cousine éloignée'
      : sexe === 'M'
        ? 'cousin éloigné'
        : 'parent éloigné';
  return `${base} (${distA} et ${distB} générations depuis l’ancêtre commun)`;
}
