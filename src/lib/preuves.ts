import type { NiveauPreuve } from '@/lib/types-base';

/**
 * Ce que vaut une information, dit sans jargon d'archives.
 *
 * Source unique : ce dictionnaire est affiché sur la fiche d'une personne, dans
 * le panneau de l'arbre et partout où l'on cite une preuve. Deux formulations
 * divergentes du même niveau donneraient à croire qu'il s'agit de deux choses
 * différentes, ce qui ruinerait la seule chose qui compte ici — savoir sur quoi
 * l'on s'appuie.
 *
 * `ton` est une variable CSS, utilisable en SVG comme en style en ligne ;
 * `teinte` est la classe Tailwind correspondante, pour les fonds.
 */
export const PREUVES: Record<
  NiveauPreuve,
  { libelle: string; explication: string; ton: string; teinte: string }
> = {
  acte: {
    libelle: 'Acte',
    explication: "Établi par un acte d'état civil détenu ou consulté par la famille.",
    ton: 'var(--succes)',
    teinte: 'bg-succes',
  },
  anom: {
    libelle: 'Acte d’Algérie',
    explication:
      "Lu dans les registres d'état civil d'Algérie numérisés par les Archives nationales d'outre-mer.",
    ton: 'var(--succes)',
    teinte: 'bg-succes',
  },
  insee: {
    libelle: 'Fichier INSEE',
    explication: "Trouvé au fichier des décès de l'INSEE : très probable, à confirmer par l'acte.",
    ton: 'var(--alerte)',
    teinte: 'bg-alerte',
  },
  memoire: {
    libelle: 'Mémoire familiale',
    explication: 'Rapporté par un proche, sans pièce à l’appui pour l’instant.',
    ton: 'var(--alerte)',
    teinte: 'bg-alerte',
  },
  hypothese: {
    libelle: 'Hypothèse',
    explication: 'Déduction cohérente, à confirmer par un acte ou une source équivalente.',
    ton: 'var(--alerte)',
    teinte: 'bg-alerte',
  },
  a_trouver: {
    libelle: 'À chercher',
    explication: 'Personne identifiée par son nom, mais rien n’est encore documenté.',
    ton: 'var(--encre-tres-douce)',
    teinte: 'bg-encre-tres-douce',
  },
};

/**
 * Du plus solide au plus incertain. Sert à afficher d'abord ce qui atteste le
 * mieux une information, et à savoir laquelle de deux sources l'emporte.
 */
export const ORDRE_FIABILITE: NiveauPreuve[] = [
  'acte',
  'anom',
  'insee',
  'memoire',
  'hypothese',
  'a_trouver',
];

/** Le meilleur niveau d'un ensemble : c'est lui qui qualifie l'information. */
export function meilleurePreuve(niveaux: readonly NiveauPreuve[]): NiveauPreuve | null {
  for (const niveau of ORDRE_FIABILITE) {
    if (niveaux.includes(niveau)) return niveau;
  }
  return null;
}

/** Range des niveaux du plus solide au plus incertain. */
export function trierParFiabilite(niveaux: readonly NiveauPreuve[]): NiveauPreuve[] {
  return [...niveaux].sort(
    (a, b) => ORDRE_FIABILITE.indexOf(a) - ORDRE_FIABILITE.indexOf(b)
  );
}
