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
};

export type EvenementAuLieu = {
  id: string;
  type: TypeEvenement;
  /** Date déjà mise en forme : « 8 mars 1993 », « vers 1850 ». */
  date: string;
  annee: number | null;
  personnes: PersonneLiee[];
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

export type DonneesCarte = {
  lieux: LieuSitue[];
  deplacements: Deplacement[];
  /** Années de tous les événements situés, pour l'histogramme du curseur. */
  annees: number[];
  anneeMin: number;
  anneeMax: number;
};
