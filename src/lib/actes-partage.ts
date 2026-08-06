/**
 * Ce que le formulaire de versement d'acte et sa Server Action partagent :
 * formats de fichier, types d'acte, niveaux de preuve.
 */

import { TYPES_PHOTO, TAILLE_MAX_PHOTO } from '@/lib/souvenirs-partage';
import type { NiveauPreuve, TypeEvenement } from '@/lib/types-base';

/** Images et PDF : ce qu'une mairie ou un scanneur renvoie le plus souvent. */
export const TYPES_FICHIER_ACTE = [...TYPES_PHOTO, 'application/pdf'] as const;

export const TAILLE_MAX_FICHIER = TAILLE_MAX_PHOTO;
export const NOMBRE_MAX_FICHIERS = 4;

export const TYPES_ACTE: {
  valeur: 'naissance' | 'mariage' | 'deces' | 'autre';
  libelle: string;
  evenement: TypeEvenement;
}[] = [
  { valeur: 'naissance', libelle: 'Acte de naissance', evenement: 'naissance' },
  { valeur: 'mariage', libelle: 'Acte de mariage', evenement: 'mariage' },
  { valeur: 'deces', libelle: 'Acte de décès', evenement: 'deces' },
  { valeur: 'autre', libelle: 'Autre acte ou pièce', evenement: 'autre' },
];

export const VALEURS_TYPE_ACTE = TYPES_ACTE.map((t) => t.valeur);

export const NIVEAUX_PREUVE_ACTE: { valeur: NiveauPreuve; libelle: string }[] = [
  { valeur: 'acte', libelle: 'Acte d’état civil (mairie, notaire, paroisse…)' },
  { valeur: 'anom', libelle: 'Registre d’Algérie numérisé sur ANOM' },
  { valeur: 'insee', libelle: 'Fichier des décès INSEE' },
  { valeur: 'memoire', libelle: 'Souvenir familial (sans pièce sous les yeux)' },
  { valeur: 'hypothese', libelle: 'Déduction, pas encore étayée' },
];

export const VALEURS_NIVEAU_PREUVE_ACTE = NIVEAUX_PREUVE_ACTE.map((n) => n.valeur);

export function libelleTypeActe(valeur: (typeof VALEURS_TYPE_ACTE)[number]): string {
  return TYPES_ACTE.find((t) => t.valeur === valeur)?.libelle ?? 'Acte';
}

export function typeEvenementActe(valeur: (typeof VALEURS_TYPE_ACTE)[number]): TypeEvenement {
  return TYPES_ACTE.find((t) => t.valeur === valeur)?.evenement ?? 'autre';
}
