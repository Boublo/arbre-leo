/**
 * Le vocabulaire de la carte : ce qui s'affiche, dit en clair.
 *
 * Les couleurs sont celles de la palette et rien d'autre ; elles reprennent
 * celles de l'arbre pour qu'un point de la carte et une case de l'arbre se
 * répondent. Aucune information ne repose sur la seule couleur : la branche
 * est toujours écrite quelque part à côté.
 */

import type { Cote } from '@/lib/branches';
import type { TypeEvenement } from '@/lib/types-base';

export const COULEUR_COTE: Record<Cote, string> = {
  paternelle: 'var(--paternelle)',
  maternelle: 'var(--maternelle)',
  commune: 'var(--commune)',
};

export const LIBELLES_COTE: Record<Cote, string> = {
  paternelle: 'Côté paternel',
  maternelle: 'Côté maternel',
  commune: 'Les deux branches',
};

/** Les types d'événements, dits comme on les dirait à table. */
export const LIBELLES_TYPE: Record<TypeEvenement, string> = {
  naissance: 'Naissance',
  bapteme: 'Baptême',
  mariage: 'Mariage',
  union_libre: 'Union',
  divorce: 'Divorce',
  fiancailles: 'Fiançailles',
  deces: 'Décès',
  inhumation: 'Inhumation',
  cremation: 'Crémation',
  profession: 'Métier',
  residence: 'Résidence',
  recensement: 'Recensement',
  emigration: 'Départ',
  immigration: 'Arrivée',
  naturalisation: 'Naturalisation',
  service_militaire: 'Service militaire',
  education: 'Études',
  distinction: 'Distinction',
  maladie: 'Maladie',
  autre: 'Autre',
};

/** Enlève les accents et la casse, pour comparer « Algerie » et « Algérie ». */
export const sansAccent = (texte: string) =>
  texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/**
 * « XIXᵉ », « XXᵉ ». Une année 1875 relève du 19ᵉ, non du 18ᵉ : on divise
 * par cent après retrait d'une unité.
 */
export function siecleDe(annee: number): number {
  return Math.floor((annee - 1) / 100) + 1;
}

/** Numéro de siècle vers chiffres romains, sans dépendance extérieure. */
export function romain(nombre: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let reste = nombre;
  let sortie = '';
  for (const [valeur, symbole] of table) {
    while (reste >= valeur) {
      sortie += symbole;
      reste -= valeur;
    }
  }
  return sortie;
}

/** « XIXᵉ siècle » — le nombre en romain, l'exposant en typographie française. */
export function libelleSiecleDeAnnee(annee: number): string {
  return `${romain(siecleDe(annee))}ᵉ siècle`;
}

/** Le même, à partir du numéro de siècle : 19 → « XIXᵉ siècle ». */
export function libelleSiecle(siecle: number): string {
  return `${romain(siecle)}ᵉ siècle`;
}
