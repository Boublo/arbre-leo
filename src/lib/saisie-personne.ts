import type { NiveauPreuve, PrecisionDate, QualificatifDate, Sexe } from '@/lib/types-base';

/**
 * Le peu que le formulaire de saisie et sa Server Action doivent savoir tous
 * les deux : le vocabulaire des dates, les bornes admises, et les règles de bon
 * sens qui empêchent d’écrire une famille impossible.
 *
 * Ce module ne lit ni cookie ni base de données : il traverse sans dommage la
 * frontière entre le navigateur et le serveur.
 */

// ---------------------------------------------------------------------------
// Bornes
// ---------------------------------------------------------------------------

/** Au-delà, les registres paroissiaux de la famille ne remontent pas. */
export const ANNEE_MIN = 1200;

export function anneeMax(): number {
  return new Date().getFullYear();
}

/**
 * Douze ans entre un parent et son enfant.
 *
 * L’état civil connaît des mères de treize ans ; il n’en connaît pas de dix.
 * En deçà, c’est presque toujours une génération sautée — un grand-père pris
 * pour un père — et il vaut mieux le dire avant d’écrire.
 */
export const ECART_MINIMAL_PARENT = 12;

// ---------------------------------------------------------------------------
// Vocabulaire des dates
// ---------------------------------------------------------------------------

/**
 * Ce que l’on sait d’une date. Un acte du XVIIIe siècle donne souvent l’année
 * seule ; on ne force personne à inventer un jour pour remplir un champ.
 */
export type PrecisionSaisie = 'jour' | 'mois' | 'annee' | 'inconnue';

export const PRECISIONS: { valeur: PrecisionSaisie; libelle: string }[] = [
  { valeur: 'inconnue', libelle: 'Rien de sûr' },
  { valeur: 'annee', libelle: 'L’année seule' },
  { valeur: 'mois', libelle: 'Le mois et l’année' },
  { valeur: 'jour', libelle: 'La date complète' },
];

export const VALEURS_PRECISION = ['jour', 'mois', 'annee', 'inconnue'] as const;

/** « vers 1850 », « avant 1900 » : la nuance vaut mieux qu’une fausse exactitude. */
export type QualificatifSaisie = 'exacte' | 'vers' | 'avant' | 'apres';

export const QUALIFICATIFS: { valeur: QualificatifSaisie; libelle: string }[] = [
  { valeur: 'exacte', libelle: 'La date exacte' },
  { valeur: 'vers', libelle: 'Vers cette date' },
  { valeur: 'avant', libelle: 'Avant cette date' },
  { valeur: 'apres', libelle: 'Après cette date' },
];

export const VALEURS_QUALIFICATIF = ['exacte', 'vers', 'avant', 'apres'] as const;

export const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export const SEXES: { valeur: Sexe; libelle: string }[] = [
  { valeur: 'inconnu', libelle: 'Non renseigné' },
  { valeur: 'F', libelle: 'Femme' },
  { valeur: 'M', libelle: 'Homme' },
];

export const VALEURS_SEXE = ['M', 'F', 'inconnu'] as const;

export const VALEURS_PREUVE = [
  'acte', 'anom', 'insee', 'memoire', 'hypothese', 'a_trouver',
] as const;

/** La nature d’une filiation. L’ordinaire ne se dit pas ; le reste, si. */
export const NATURES_FILIATION: { valeur: string; libelle: string }[] = [
  { valeur: 'naturelle', libelle: 'Filiation ordinaire' },
  { valeur: 'adoptive', libelle: 'Adoption' },
  { valeur: 'reconnue', libelle: 'Reconnaissance' },
  { valeur: 'recueillie', libelle: 'Enfant recueilli' },
];

export const VALEURS_NATURE = ['naturelle', 'adoptive', 'reconnue', 'recueillie'] as const;

// ---------------------------------------------------------------------------
// Traduction en colonnes
// ---------------------------------------------------------------------------

/** Ce qu’un bloc de date rend au formulaire, tout en chaînes. */
export type ValeursDateSaisie = {
  qualificatif: QualificatifSaisie;
  precision: PrecisionSaisie;
  annee: string;
  mois: string;
  jour: string;
  lieu: string;
};

export const DATE_VIDE: ValeursDateSaisie = {
  qualificatif: 'exacte',
  precision: 'inconnue',
  annee: '',
  mois: '',
  jour: '',
  lieu: '',
};

export type ColonnesDate = {
  annee: number | null;
  mois: number | null;
  jour: number | null;
  qualificatif: QualificatifDate;
  precision_date: PrecisionDate;
};

/**
 * Traduit la précision demandée en colonnes de la table « evenements ».
 * Un mois sans année n’a pas de sens : ce qui dépasse la précision annoncée
 * est écarté plutôt que conservé à moitié.
 */
export function colonnesDate(saisie: {
  qualificatif: QualificatifSaisie;
  precision: PrecisionSaisie;
  annee: number | null;
  mois: number | null;
  jour: number | null;
}): ColonnesDate {
  const commun = { qualificatif: saisie.qualificatif as QualificatifDate };

  switch (saisie.precision) {
    case 'jour':
      return { ...commun, annee: saisie.annee, mois: saisie.mois, jour: saisie.jour, precision_date: 'jour' };
    case 'mois':
      return { ...commun, annee: saisie.annee, mois: saisie.mois, jour: null, precision_date: 'mois' };
    case 'annee':
      return { ...commun, annee: saisie.annee, mois: null, jour: null, precision_date: 'annee' };
    default:
      return { ...commun, annee: null, mois: null, jour: null, precision_date: 'inconnue' };
  }
}

/** Vrai si l’année, le mois et le jour désignent un jour qui a existé. */
export function dateReelle(annee: number, mois: number, jour: number): boolean {
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  return d.getUTCFullYear() === annee && d.getUTCMonth() === mois - 1 && d.getUTCDate() === jour;
}

// ---------------------------------------------------------------------------
// Garde-fous
// ---------------------------------------------------------------------------

/**
 * Un parent et son enfant, confrontés.
 *
 * Rend une phrase en français quand la filiation est impossible, `null` quand
 * elle tient debout ou que les dates manquent — on ne bloque jamais sur une
 * information que l’on n’a pas.
 */
export function verifierEcartParent(
  anneeParent: number | null,
  anneeEnfant: number | null,
  nomParent: string,
  nomEnfant: string
): string | null {
  if (anneeParent === null || anneeEnfant === null) return null;

  const ecart = anneeEnfant - anneeParent;
  if (ecart < 0) {
    const avance = Math.abs(ecart);
    return `${nomEnfant} naîtrait ${avance} an${pluriel(avance)} avant ${nomParent} : un enfant ne peut pas précéder son parent. Vérifiez les deux années de naissance.`;
  }
  if (ecart < ECART_MINIMAL_PARENT) {
    return `${nomParent} n’aurait eu que ${ecart} an${pluriel(ecart)} à la naissance de ${nomEnfant}. En deçà de ${ECART_MINIMAL_PARENT} ans, c’est presque toujours une génération oubliée : vérifiez le rattachement avant de l’enregistrer.`;
  }
  return null;
}

/** Un décès antérieur à la naissance : on le signale, on ne l’interdit pas. */
export function verifierOrdreDeVie(
  anneeNaissance: number | null,
  anneeDeces: number | null
): string | null {
  if (anneeNaissance === null || anneeDeces === null) return null;
  if (anneeDeces >= anneeNaissance) return null;
  return `La date de décès (${anneeDeces}) précède la date de naissance (${anneeNaissance}). La fiche est enregistrée telle quelle, mais l’une des deux dates est probablement fausse.`;
}

function pluriel(nombre: number): string {
  return nombre > 1 ? 's' : '';
}

// ---------------------------------------------------------------------------
// Présentation d’une personne dans une liste de choix
// ---------------------------------------------------------------------------

/**
 * Ce qu’il faut afficher pour ne pas confondre deux homonymes.
 *
 * La base en compte plusieurs paires : le nom seul ne désigne personne. On
 * accole donc toujours les années de vie et, à défaut, la commune de naissance.
 */
export function repereDeVie(
  anneeNaissance: number | null,
  anneeDeces: number | null,
  sexe: Sexe,
  lieuNaissance: string | null
): string {
  const morceaux: string[] = [];

  if (anneeNaissance !== null && anneeDeces !== null) {
    morceaux.push(`${anneeNaissance} – ${anneeDeces}`);
  } else if (anneeNaissance !== null) {
    morceaux.push(`${sexe === 'F' ? 'née' : 'né'} en ${anneeNaissance}`);
  } else if (anneeDeces !== null) {
    morceaux.push(`${sexe === 'F' ? 'morte' : 'mort'} en ${anneeDeces}`);
  }

  if (lieuNaissance) morceaux.push(lieuNaissance);

  return morceaux.length > 0 ? morceaux.join(' · ') : 'dates inconnues';
}

/** Les niveaux de preuve retenus, sans doublon ni valeur inventée. */
export function preuvesValides(valeurs: readonly string[]): NiveauPreuve[] {
  const connus = new Set<string>(VALEURS_PREUVE);
  return [...new Set(valeurs)].filter((v): v is NiveauPreuve => connus.has(v));
}
