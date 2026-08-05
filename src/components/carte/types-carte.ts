/**
 * Ce que la carte a besoin de savoir.
 *
 * Tout est calculé sur le serveur et sérialisé tel quel : le composant de
 * carte ne parle jamais à la base, et aucune date n'est remise en forme dans
 * le navigateur.
 */

import type { Cote } from '@/lib/branches';
import type { TypeEvenement } from '@/lib/types-base';

export type PersonneLiee = { id: string; nom: string };

export type PersonneAuLieu = PersonneLiee & {
  cote: Cote;
  /** Nombre d'événements de cette personne à ce lieu. */
  nombre: number;
  /** Année du premier événement de cette personne à ce lieu, si connue. */
  premiereAnnee: number | null;
};

export type EvenementAuLieu = {
  id: string;
  type: TypeEvenement;
  /** Date déjà mise en forme : « 8 mars 1993 », « vers 1850 ». */
  date: string;
  annee: number | null;
  personnes: PersonneLiee[];
};

/** Une photo qui illustre le lieu : URL signée, valable une heure. */
export type PhotoLieu = {
  id: string;
  titre: string | null;
  url: string;
  largeur: number | null;
  hauteur: number | null;
};

/** Un fait de la grande Histoire rattaché au lieu. */
export type FaitLocal = {
  id: string;
  titre: string;
  annee: number;
  /** « 1954 – 1962 » ou « 1848 » selon la durée. */
  dateTexte: string;
};

export type LieuSitue = {
  id: string;
  /** Nom court, tel qu'on le dit : « La Senia ». */
  nom: string;
  /** Libellé complet porté par les actes, jamais réécrit. */
  libelle: string;
  /** Ce que le libellé ajoute après le nom : département, pays d'alors. */
  precision: string | null;
  pays: string | null;
  paysActuel: string | null;
  /** Région administrative, pour la légende par niveau. */
  region: string | null;
  note: string | null;
  latitude: number;
  longitude: number;
  /** Branche dominante, pour la couleur du point. */
  cote: Cote;
  parCote: Record<Cote, number>;
  evenements: EvenementAuLieu[];
  personnes: PersonneAuLieu[];
  anneeMin: number | null;
  anneeMax: number | null;
  /** Événements rattachés au lieu mais sans année connue. */
  nbSansDate: number;
  /** Une photo, choisie parmi les médias associés au lieu. */
  photo: PhotoLieu | null;
  /** Les faits de la grande Histoire rattachés à ce lieu. */
  faits: FaitLocal[];
  /** Nombre de souvenirs de la famille qui parlent explicitement de ce lieu. */
  nbSouvenirs: number;
};

/** Un pas d'une personne, d'un lieu au suivant, dans l'ordre de sa vie. */
export type Deplacement = {
  id: string;
  personneId: string;
  nom: string;
  cote: Cote;
  deId: string;
  versId: string;
  annee: number;
};

/**
 * Un trajet d'une vie entière, du lieu de naissance au lieu de décès.
 *
 * Seul dessiné lorsque les deux lieux sont situés et distincts : une vie
 * commencée et finie au même village n'a pas de flux à raconter.
 */
export type Flux = {
  id: string;
  personneId: string;
  nom: string;
  cote: Cote;
  naissanceId: string;
  decesId: string;
  anneeNaissance: number;
  anneeDeces: number;
};

/**
 * Un jalon de la grande Histoire, à afficher au-dessus du curseur du temps
 * quand la période affichée le recouvre : « 1848 · fondation de La Sénia ».
 */
export type AnnotationTemps = {
  annee: number;
  texte: string;
  /** Fait rattaché, s'il en est un ; ouvre alors la fiche complète. */
  faitId: string | null;
};

export type DonneesCarte = {
  lieux: LieuSitue[];
  deplacements: Deplacement[];
  /** Une flèche par personne, de sa naissance à son décès. */
  flux: Flux[];
  /** Moments clés à révéler au passage du curseur de période. */
  annotations: AnnotationTemps[];
  /** Années de tous les événements situés, pour l'histogramme du curseur. */
  annees: number[];
  anneeMin: number;
  anneeMax: number;
};
