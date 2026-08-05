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
