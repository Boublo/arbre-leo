import type { Cote } from '@/lib/branches';
import type { NiveauPreuve, PorteeFait, TypeEvenement } from '@/lib/types-base';

/**
 * Le vocabulaire de la frise.
 *
 * La chronologie croise deux fils qui ne se ressemblent pas : ce qui est
 * arrivé à la famille, et ce qui est arrivé au monde autour d'elle. Les deux
 * sont décrits ici par une même forme, pour qu'un seul tri les remette dans
 * l'ordre, mais rien n'y est confondu : `nature` sépare les deux jusqu'au bout.
 */

export type NatureEntree = 'famille' | 'histoire';

export type PersonneCitee = { id: string; nom: string };

/**
 * Ce qui rend un événement remarquable dans une frise familiale.
 *
 * Le mot est réservé aux repères qui changent la géographie de la famille : la
 * mort d'un aïeul dont descend un large pan de l'arbre, l'arrivée d'un lieu
 * inconnu jusqu'alors. On ne l'attribue jamais à main levée : le calcul est
 * fait côté serveur, à partir de la parenté et de l'ordre des dates.
 */
export type MotifRemarquable = 'ancetre' | 'arrivee';

export const LIBELLE_REMARQUABLE: Record<MotifRemarquable, string> = {
  ancetre: 'Décès d’un aïeul d’où descend une large part de la famille',
  arrivee: 'Première apparition connue de ce lieu dans la famille',
};

export type EntreeChronologie = {
  /** Unique sur toute la frise : la nature préfixe l'identifiant de la ligne. */
  cle: string;
  nature: NatureEntree;
  /**
   * Clé de tri « AAAA-MM-JJ », reprise de `evenements.date_tri` quand la base
   * l'a calculée. Vide lorsque l'année n'est pas connue : l'entrée est alors
   * renvoyée en fin de frise plutôt que perdue.
   */
  tri: string;
  annee: number | null;
  /** Date déjà rédigée : « 8 mars 1898 », « vers 1850 », « 1939 – 1945 ». */
  dateTexte: string;
  /** Ce que l'entrée raconte : le libellé libre d'un événement, le titre d'un fait. */
  titre: string | null;
  detail: string | null;
  lieu: string | null;
  /** Côté de la famille, ou `null` quand aucune branche n'est rattachée. */
  cote: Cote | null;
  type: TypeEvenement | null;
  portee: PorteeFait | null;
  personnes: PersonneCitee[];
  sourceUrl: string | null;
  /**
   * Meilleure preuve rattachée à un événement de famille. `null` pour les faits
   * de la grande Histoire, qui portent leurs propres sources.
   */
  niveauPreuve: NiveauPreuve | null;
  /**
   * Pourquoi cette entrée mérite d'être remarquée sur la frise, ou `null` si
   * elle n'est qu'une ligne parmi d'autres.
   */
  remarquable: MotifRemarquable | null;
};

/**
 * Les événements, dits en clair.
 *
 * Ces libellés existent aussi sur la fiche d'une personne. Ils sont redits ici
 * plutôt qu'empruntés : deux modules écrits en parallèle ne doivent pas
 * dépendre l'un de l'autre. Le compte rendu propose de les réunir plus tard.
 */
export const LIBELLE_EVENEMENT: Record<TypeEvenement, string> = {
  naissance: 'Naissance',
  bapteme: 'Baptême',
  mariage: 'Mariage',
  union_libre: 'Union libre',
  divorce: 'Divorce',
  fiancailles: 'Fiançailles',
  deces: 'Décès',
  inhumation: 'Inhumation',
  cremation: 'Crémation',
  profession: 'Métier',
  residence: 'Résidence',
  recensement: 'Recensement',
  emigration: 'Départ du pays',
  immigration: 'Arrivée dans le pays',
  naturalisation: 'Naturalisation',
  service_militaire: 'Service militaire',
  education: 'Études',
  distinction: 'Distinction',
  maladie: 'Maladie',
  autre: 'Autre',
};

/** L'ordre d'une vie, puis celui d'un parcours : plus parlant que l'alphabet. */
export const ORDRE_EVENEMENTS: TypeEvenement[] = [
  'naissance', 'bapteme', 'fiancailles', 'mariage', 'union_libre', 'divorce',
  'deces', 'inhumation', 'cremation',
  'profession', 'education', 'service_militaire', 'distinction',
  'residence', 'recensement', 'emigration', 'immigration', 'naturalisation',
  'maladie', 'autre',
];

/** Étendue d'un fait historique, en un mot : il s'affiche à côté d'une étiquette déjà longue. */
export const LIBELLE_PORTEE: Record<PorteeFait, string> = {
  mondial: 'Monde',
  national: 'Nation',
  regional: 'Région',
  local: 'Pays de la famille',
  familial: 'Famille',
};

export const LIBELLE_COTE: Record<Cote, string> = {
  paternelle: 'côté paternel',
  maternelle: 'côté maternel',
  commune: 'les deux côtés',
};

/**
 * Reconnaît les niveaux dits « étayés » — ceux pour lesquels un acte a été
 * consulté. Isolé ici pour que la frise et le tiroir de contexte s'entendent
 * sur la même règle.
 */
export function estEtaye(niveau: NiveauPreuve | null): boolean {
  return niveau === 'acte' || niveau === 'anom';
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/**
 * Clé de tri « AAAA-MM-JJ ». Les morceaux manquants valent zéro, de sorte
 * qu'une année seule se range avant le mois de janvier de cette année-là.
 */
export function cleDeTri(
  annee: number | null,
  mois: number | null,
  jour: number | null
): string {
  if (annee === null) return '';
  const chiffres = (valeur: number | null, largeur: number) =>
    String(valeur ?? 0).padStart(largeur, '0');
  return `${chiffres(annee, 4)}-${chiffres(mois, 2)}-${chiffres(jour, 2)}`;
}

/** L'année portée par une clé de tri, quand l'événement ne la donne pas lui-même. */
export function anneeDeLaCle(tri: string): number | null {
  const annee = Number.parseInt(tri.slice(0, 4), 10);
  return Number.isFinite(annee) && annee > 0 ? annee : null;
}

const ROMAINS: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function chiffresRomains(nombre: number): string {
  let reste = Math.max(0, Math.trunc(nombre));
  let ecrit = '';
  for (const [valeur, signe] of ROMAINS) {
    while (reste >= valeur) {
      ecrit += signe;
      reste -= valeur;
    }
  }
  return ecrit;
}

/**
 * Siècle d'une décennie.
 *
 * On rattache la décennie entière au siècle où tombent neuf de ses dix années :
 * les années 1700 vont donc au XVIII siècle. Découper une décennie en deux pour
 * l'unique année 1700 rendrait la frise illisible sans rien apprendre à personne.
 */
export function siecleDeLaDecennie(decennie: number): number {
  return Math.floor(decennie / 100) + 1;
}

/** Décennie à laquelle une année appartient : 1758 → 1750, 1900 → 1900. */
export function decennieDeLAnnee(annee: number): number {
  return Math.floor(annee / 10) * 10;
}

/** « 3 personnes », « 1 personne » — l'accord au pluriel, sans y penser. */
export function accorderPluriel(nombre: number, singulier: string, pluriel: string): string {
  return `${nombre.toLocaleString('fr-FR')} ${nombre > 1 ? pluriel : singulier}`;
}
