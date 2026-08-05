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
