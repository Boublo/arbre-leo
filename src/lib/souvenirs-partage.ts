/**
 * Le peu que le formulaire de dépôt et la Server Action doivent savoir tous
 * les deux : nom du bucket, formats acceptés, vocabulaire des dates.
 *
 * Ce module ne lit ni cookie ni base de données : il traverse sans dommage la
 * frontière entre le navigateur et le serveur.
 */

/** Bucket privé : toute lecture passe par une URL signée. */
export const BUCKET_MEDIAS = 'arbre-medias';

/** Ce que le bucket accepte réellement ; refuser plus tôt évite une erreur obscure. */
export const TYPES_PHOTO = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/tiff',
];

/** 25 Mo : de quoi accueillir le scan d’un tirage argentique sans saturer la ligne. */
export const TAILLE_MAX_PHOTO = 25 * 1024 * 1024;

export const NOMBRE_MAX_PHOTOS = 24;

/**
 * Une date de souvenir est presque toujours approximative. On demande donc
 * d’abord ce que l’on sait, et les champs suivent.
 */
export type PrecisionSaisie = 'jour' | 'mois' | 'annee' | 'decennie' | 'inconnue';

export const PRECISIONS: { valeur: PrecisionSaisie; libelle: string }[] = [
  { valeur: 'jour', libelle: 'Une date précise' },
  { valeur: 'mois', libelle: 'Un mois et une année' },
  { valeur: 'annee', libelle: 'Une année seule' },
  { valeur: 'decennie', libelle: 'Une décennie' },
  { valeur: 'inconnue', libelle: 'Je ne sais plus' },
];

export const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Rien d’antérieur n’est raconté de mémoire : au-delà, c’est une faute de frappe. */
export const ANNEE_MIN = 1700;

export function anneeMax(): number {
  return new Date().getFullYear();
}

/** Vrai si l’année, le mois et le jour désignent un jour qui a existé. */
export function dateReelle(annee: number, mois: number, jour: number): boolean {
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  return d.getUTCFullYear() === annee && d.getUTCMonth() === mois - 1 && d.getUTCDate() === jour;
}

/**
 * Retire les signes diacritiques laissés par la décomposition NFD.
 * Écrit sans classe de caractères : le fichier reste lisible en ASCII.
 */
export function sansAccent(texte: string): string {
  let sortie = '';
  for (const caractere of texte.normalize('NFD')) {
    const point = caractere.codePointAt(0) ?? 0;
    if (point >= 0x0300 && point <= 0x036f) continue;
    sortie += caractere;
  }
  return sortie.toLowerCase();
}

/**
 * Réduit un nom de fichier à ce qu’un chemin de stockage accepte sans broncher.
 * « Été à la mer.JPG » devient « ete-a-la-mer.jpg ».
 */
export function nomFichierSain(nom: string): string {
  const propre = sansAccent(nom)
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+/, '')
    .replace(/-+$/, '');
  // On garde la fin : c’est là que se trouve l’extension.
  return (propre || 'photo').slice(-80);
}

/**
 * Coupe un récit au dernier point avant la limite, pour ne pas trancher une
 * phrase. Pur : partagé entre l’aperçu du formulaire (côté navigateur) et le
 * rendu du mur (côté serveur).
 */
export function extraitRecit(texte: string, max = 260): string {
  const propre = texte.trim();
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  const dernierPoint = coupe.lastIndexOf('.');
  return `${dernierPoint > max * 0.5 ? coupe.slice(0, dernierPoint + 1) : coupe}…`;
}

// ---------------------------------------------------------------------------
// Lecture d’une année dans un texte libre
// ---------------------------------------------------------------------------

/**
 * Cherche dans un récit toutes les années qui pourraient dater le souvenir.
 * On accepte « 1963 », « 1963. », « en 1963 », « années 60 », « années 1970 »
 * ou « 70’s » — c’est ce que la famille écrit spontanément. Les nombres qui
 * ne peuvent pas être des années (0 à 1699, au-delà de l’année en cours) sont
 * écartés. Les doublons aussi.
 */
export function anneesDansTexte(texte: string): number[] {
  const trouvees = new Set<number>();
  const max = anneeMax();

  // 1) Années à quatre chiffres, isolées de tout autre chiffre.
  const quatreChiffres = /(?<!\d)(\d{4})(?!\d)/g;
  for (const trouvaille of texte.matchAll(quatreChiffres)) {
    const nombre = Number(trouvaille[1]);
    if (nombre >= ANNEE_MIN && nombre <= max) trouvees.add(nombre);
  }

  // 2) « années 60 », « années 70’s », « 60’s » : on ramène au 20e siècle.
  const decenniesCourtes = /(?:ann[ée]es\s+)?(\d{2})[’']?s?\b/gi;
  const decoupe = sansAccent(texte);
  for (const trouvaille of decoupe.matchAll(decenniesCourtes)) {
    const brut = Number(trouvaille[1]);
    if (!Number.isFinite(brut)) continue;
    // 40–99 valent 1940–1999 ; 00–30 valent 2000–2030.
    const anneeComplete = brut >= 40 ? 1900 + brut : 2000 + brut;
    if (anneeComplete >= ANNEE_MIN && anneeComplete <= max) trouvees.add(anneeComplete);
  }

  return [...trouvees].sort((a, b) => a - b);
}

/**
 * Propose, à partir d’un texte, la meilleure date à préremplir : la première
 * année trouvée, avec la précision qui a le plus de sens (année seule, ou
 * décennie si le texte disait « années 70 »).
 */
export function suggererPeriode(
  texte: string
): { annee: number; precision: PrecisionSaisie } | null {
  const annees = anneesDansTexte(texte);
  if (annees.length === 0) return null;

  const evoqueDecennie = /ann[ée]es\s+\d{2,4}|\b\d{2}[’']?s\b/i.test(texte);
  return {
    annee: annees[0],
    precision: evoqueDecennie ? 'decennie' : 'annee',
  };
}
