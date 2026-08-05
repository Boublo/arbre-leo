/**
 * Fond de carte, écrit à la main.
 *
 * Aucune tuile n'est chargée depuis un serveur extérieur : la carte d'une
 * famille n'a pas à signaler ses consultations à un tiers. Le trait de côte
 * ci-dessous est donc volontairement grossier — quelques dizaines de points
 * par rivage, relevés au degré près. Il ne sert qu'à situer le regard ; la
 * grille des méridiens et les villes de repère disent le reste. Mieux vaut un
 * fond avoué approximatif qu'un planisphère qui se prétendrait exact.
 *
 * Les segments dits « fermeture » courent hors du cadre : ils referment la
 * surface à peindre sans jamais être tracés, et ne prétendent donc à aucune
 * exactitude.
 */

import type { Coord } from '@/components/carte/projection';

export type Terre = {
  nom: string;
  /** Trait de côte réel, dessiné. */
  cote: readonly Coord[];
  /** Points ajoutés hors cadre pour refermer la surface, jamais dessinés. */
  fermeture?: readonly Coord[];
};

/**
 * L'Europe continentale, d'un seul tenant : de la côte dalmate à la mer du
 * Nord en passant par l'Italie, la Méditerranée espagnole, l'Atlantique et la
 * Manche. Le tracé commence à l'endroit où la fermeture le rejoint.
 */
const EUROPE: Terre = {
  nom: 'Europe',
  cote: [
    // Côte dalmate, remontée vers le nord-ouest
    [16.44, 43.51], [15.23, 44.12], [14.45, 45.33], [13.85, 44.87], [13.75, 45.65],
    // Adriatique, versant italien
    [12.5, 45.44], [12.28, 44.42], [13.51, 43.62], [14.21, 42.46], [15.9, 41.92],
    [18.5, 40.15], [17.23, 40.47], [17.13, 39.08], [16.05, 37.93],
    // Mer Tyrrhénienne
    [15.64, 38.11], [16.1, 38.92], [15.63, 40.07], [14.77, 40.68], [14.25, 40.83],
    [13.57, 41.21], [12.24, 41.74], [11.79, 42.09], [10.53, 42.93], [10.31, 43.55],
    [9.83, 44.1], [8.93, 44.41], [8.48, 44.31], [8.03, 43.88], [7.61, 43.79],
    // Côte provençale et golfe du Lion
    [7.27, 43.7], [6.64, 43.27], [5.93, 43.12], [5.37, 43.3], [4.85, 43.35],
    [4.43, 43.45], [4.14, 43.53], [3.7, 43.4], [3.47, 43.28], [3.11, 43.11],
    // Catalogne et Levant espagnol
    [3.11, 42.52], [3.29, 42.32], [2.18, 41.38], [1.25, 41.1], [0.87, 40.72],
    [0.4, 40.36], [-0.33, 39.46], [0.11, 38.84], [0.22, 38.73], [-0.48, 38.35],
    [-0.7, 37.63], [-0.99, 37.6], [-1.58, 37.4], [-2.19, 36.72], [-2.46, 36.83],
    [-3.52, 36.72], [-4.42, 36.71], [-4.89, 36.5], [-5.35, 36.14], [-5.6, 36.01],
    // Golfe de Cadix et Atlantique portugais
    [-6.29, 36.53], [-6.95, 37.25], [-7.93, 37.01], [-8.99, 37.02], [-8.87, 37.95],
    [-9.25, 38.68], [-9.5, 38.78], [-9.38, 39.36], [-8.87, 40.15], [-8.68, 41.15],
    [-8.83, 41.69], [-8.83, 42.24], [-9.28, 42.91], [-8.4, 43.37], [-7.04, 43.55],
    // Corniche cantabrique et golfe de Gascogne
    [-5.66, 43.55], [-3.8, 43.46], [-3.03, 43.38], [-1.98, 43.32], [-1.48, 43.52],
    [-1.25, 44.66], [-1.06, 45.57], [-1.15, 46.16], [-1.78, 46.5], [-2.2, 47.28],
    // Bretagne
    [-3.12, 47.48], [-3.92, 47.87], [-4.74, 48.04], [-4.6, 48.38], [-3.98, 48.73],
    [-2.75, 48.6], [-2.02, 48.65], [-1.6, 48.84], [-1.94, 49.72], [-1.62, 49.66],
    // Manche, mer du Nord
    [0.11, 49.49], [1.08, 49.93], [1.61, 50.72], [1.85, 50.97], [2.38, 51.03],
    [2.92, 51.23], [4.08, 51.95], [4.75, 52.96], [6.7, 53.42], [8.55, 53.87],
  ],
  fermeture: [[16, 54.6], [16, 46.5], [17.6, 45.4]],
};

/**
 * Le Maghreb : Maroc atlantique, littoral algérien, côte tunisienne. La
 * fermeture passe par le Sahara, très au sud du cadre.
 */
const MAGHREB: Terre = {
  nom: 'Maghreb',
  cote: [
    [-9.77, 31.51], [-8.5, 33.25], [-7.62, 33.6], [-6.83, 34.02], [-6.13, 35.19],
    [-5.8, 35.79], [-5.31, 35.89], [-4.5, 35.42], [-3.93, 35.25], [-2.94, 35.29],
    [-2.23, 35.09], [-1.86, 35.09], [-1.2, 35.42], [-0.72, 35.73], [-0.32, 35.85],
    [0.09, 35.93], [1.31, 36.52], [2.2, 36.6], [3.06, 36.79], [3.91, 36.91],
    [5.08, 36.75], [5.77, 36.82], [6.91, 36.88], [7.77, 36.9], [8.76, 36.95],
    [9.87, 37.28], [10.32, 36.87], [11.05, 37.08], [10.62, 36.4], [10.64, 35.83],
    [11.03, 35.24], [10.76, 34.74], [10.1, 33.88], [11.11, 33.5],
  ],
  fermeture: [[12, 32], [12, 27], [-11, 27], [-10.4, 29.5]],
};

const CORSE: Terre = {
  nom: 'Corse',
  cote: [
    [9.36, 43.0], [9.45, 42.7], [9.55, 42.1], [9.28, 41.59], [9.16, 41.39],
    [8.74, 41.92], [8.68, 42.27], [8.76, 42.57], [9.36, 43.0],
  ],
};

const SARDAIGNE: Terre = {
  nom: 'Sardaigne',
  cote: [
    [8.23, 40.93], [8.32, 40.56], [8.44, 39.88], [8.66, 39.1], [9.12, 39.21],
    [9.57, 39.15], [9.68, 40.05], [9.55, 40.92], [9.19, 41.24], [8.23, 40.93],
  ],
};

const SICILE: Terre = {
  nom: 'Sicile',
  cote: [
    [15.55, 38.2], [15.09, 37.5], [15.29, 37.07], [15.14, 36.68], [14.25, 37.07],
    [13.58, 37.27], [12.44, 37.8], [12.52, 38.02], [13.36, 38.13], [14.02, 38.04],
    [15.24, 38.22], [15.55, 38.2],
  ],
};

const MAJORQUE: Terre = {
  nom: 'Majorque',
  cote: [
    [2.35, 39.54], [2.79, 39.3], [3.2, 39.32], [3.46, 39.71], [3.15, 39.92],
    [2.65, 39.75], [2.35, 39.54],
  ],
};

const MINORQUE: Terre = {
  nom: 'Minorque',
  cote: [[3.82, 39.93], [4.27, 39.86], [4.2, 40.06], [3.83, 40.05], [3.82, 39.93]],
};

const IBIZA: Terre = {
  nom: 'Ibiza',
  cote: [[1.22, 38.93], [1.4, 38.68], [1.58, 38.99], [1.22, 38.93]],
};

/**
 * Îles Britanniques et Irlande : hors cadre tant que la famille n'a pas de
 * lieu au nord de la Manche, mais présentes pour que le fond reste juste si
 * le cadrage change un jour.
 */
const GRANDE_BRETAGNE: Terre = {
  nom: 'Grande-Bretagne',
  cote: [
    [-5.71, 50.07], [-5.2, 49.96], [-4.14, 50.35], [-2.45, 50.53], [-1.1, 50.79],
    [0.25, 50.74], [1.38, 51.13], [1.4, 51.38], [1.28, 51.94], [1.73, 52.6],
    [0.35, 52.9], [0.1, 53.63], [-0.61, 54.49], [-1.42, 55.01], [-2.0, 55.77],
    [-3.0, 56.0], [-2.1, 57.15], [-3.02, 58.64], [-5.0, 58.62], [-5.8, 57.4],
    [-6.0, 56.4], [-5.6, 55.3], [-3.6, 54.9], [-3.0, 53.45], [-4.6, 53.3],
    [-4.7, 52.1], [-5.2, 51.7], [-4.0, 51.6], [-3.0, 51.4], [-4.2, 51.1],
    [-5.71, 50.07],
  ],
};

const IRLANDE: Terre = {
  nom: 'Irlande',
  cote: [
    [-6.35, 52.25], [-6.1, 53.35], [-6.35, 54.0], [-5.6, 54.65], [-6.65, 55.2],
    [-8.3, 54.9], [-8.6, 54.3], [-9.9, 53.3], [-9.7, 52.6], [-10.3, 52.1],
    [-8.5, 51.65], [-7.1, 52.1], [-6.35, 52.25],
  ],
};

export const TERRES: readonly Terre[] = [
  EUROPE, MAGHREB, GRANDE_BRETAGNE, IRLANDE,
  CORSE, SARDAIGNE, SICILE, MAJORQUE, MINORQUE, IBIZA,
];

/**
 * Villes de repère. Aucune n'est un lieu de la famille : elles ne servent
 * qu'à reconnaître le pays qu'on regarde. Celles qui tomberaient sur un lieu
 * de la base sont écartées à l'affichage.
 */
export const VILLES_REPERE: readonly { nom: string; coord: Coord }[] = [
  { nom: 'Londres', coord: [-0.13, 51.51] },
  { nom: 'Bruxelles', coord: [4.35, 50.85] },
  { nom: 'Paris', coord: [2.35, 48.86] },
  { nom: 'Nantes', coord: [-1.55, 47.22] },
  { nom: 'Lyon', coord: [4.84, 45.76] },
  { nom: 'Genève', coord: [6.14, 46.2] },
  { nom: 'Milan', coord: [9.19, 45.46] },
  { nom: 'Toulouse', coord: [1.44, 43.6] },
  { nom: 'Rome', coord: [12.5, 41.9] },
  { nom: 'Naples', coord: [14.25, 40.85] },
  { nom: 'Barcelone', coord: [2.17, 41.39] },
  { nom: 'Madrid', coord: [-3.7, 40.42] },
  { nom: 'Lisbonne', coord: [-9.14, 38.72] },
  { nom: 'Séville', coord: [-5.98, 37.39] },
  { nom: 'Palerme', coord: [13.36, 38.12] },
  { nom: 'Alger', coord: [3.06, 36.75] },
  { nom: 'Constantine', coord: [6.61, 36.36] },
  { nom: 'Tunis', coord: [10.18, 36.8] },
  { nom: 'Rabat', coord: [-6.83, 34.02] },
];

/** Étendues d'eau nommées, pour que la carte se lise sans légende. */
export const MERS: readonly { nom: string; coord: Coord }[] = [
  { nom: 'Océan Atlantique', coord: [-8.6, 44.6] },
  { nom: 'Mer Méditerranée', coord: [5.6, 38.6] },
  { nom: 'Mer du Nord', coord: [3.4, 54.2] },
];

/** Pas de la grille, en degrés. */
export const PAS_GRILLE = 5;
