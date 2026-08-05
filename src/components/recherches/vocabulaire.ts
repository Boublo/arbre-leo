import type { StatutChantier } from '@/lib/types-base';
import { BRANCHE_PATERNELLE, BRANCHE_MATERNELLE } from '@/lib/branches';

/**
 * Le vocabulaire des chantiers, dit en clair.
 *
 * Ce fichier ne dépend de rien d'autre que des types : il est lu aussi bien par
 * les composants serveur que par les formulaires côté navigateur.
 */

/** Ce qu'on sait d'un chantier au moment de l'afficher, noms déjà résolus. */
export type ChantierVue = {
  id: string;
  titre: string;
  objectif: string | null;
  branche: string | null;
  personne: { id: string; nom: string } | null;
  organisme: string | null;
  reference: string | null;
  statut: StatutChantier;
  blocage: string | null;
  priorite: number;
  /** Nom affiché du membre qui s'en charge, s'il est connu. */
  assigneA: string | null;
  demandeLe: string | null;
  reponseLe: string | null;
  resultat: string | null;
};

/** Une personne de l'arbre dont rien n'est encore documenté. */
export type PisteVue = {
  id: string;
  nom: string;
  branches: string[];
};

export type Colonne = {
  statut: StatutChantier;
  libelle: string;
  aide: string;
  ton: string;
};

/** L'ordre des colonnes suit la vie d'une demande, de l'idée à la réponse. */
export const COLONNES: Colonne[] = [
  {
    statut: 'a_faire',
    libelle: 'À faire',
    aide: 'La cible est repérée, rien n’est encore parti.',
    ton: 'var(--encre-tres-douce)',
  },
  {
    statut: 'en_cours',
    libelle: 'En cours',
    aide: 'Quelqu’un s’en occupe : courrier en préparation, registre en cours de lecture.',
    ton: 'var(--accent)',
  },
  {
    statut: 'en_attente_reponse',
    libelle: 'En attente d’une réponse',
    aide: 'La demande est partie. C’est ici qu’on surveille les délais.',
    ton: 'var(--alerte)',
  },
  {
    statut: 'aboutie',
    libelle: 'Aboutie',
    aide: 'Le document est en main, ce qu’il apprend est consigné.',
    ton: 'var(--succes)',
  },
  {
    statut: 'abandonnee',
    libelle: 'Abandonnée',
    aide: 'Piste close : registre détruit, acte introuvable, demande refusée.',
    ton: 'var(--encre-tres-douce)',
  },
];

export const LIBELLE_STATUT: Record<StatutChantier, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  en_attente_reponse: 'En attente d’une réponse',
  aboutie: 'Aboutie',
  abandonnee: 'Abandonnée',
};

/** Ce que vaut une priorité, dans les termes de l'enquête. */
export const PRIORITES: { valeur: number; libelle: string; aide: string }[] = [
  { valeur: 1, libelle: 'P1', aide: 'Débloque une génération entière' },
  { valeur: 2, libelle: 'P2', aide: 'Ouvre une piste importante' },
  { valeur: 3, libelle: 'P3', aide: 'Confirme ou complète ce qu’on sait' },
  { valeur: 4, libelle: 'P4', aide: 'Utile, sans urgence' },
  { valeur: 5, libelle: 'P5', aide: 'Confort : photographies, contexte' },
];

export function priorite(valeur: number) {
  return PRIORITES.find((p) => p.valeur === valeur) ?? PRIORITES[2];
}

/**
 * Les deux branches qui se rejoignent en l'enfant. Leurs identifiants viennent
 * des fichiers GEDCOM d'origine : ils sont donc lus dans la configuration, et
 * non écrits ici — ce dépôt est public.
 */
export const BRANCHES: { valeur: string; libelle: string; ton: string }[] = [
  { valeur: BRANCHE_PATERNELLE, libelle: 'Côté paternel', ton: 'var(--paternelle)' },
  { valeur: BRANCHE_MATERNELLE, libelle: 'Côté maternel', ton: 'var(--maternelle)' },
];

export function brancheLisible(branche: string | null) {
  if (!branche) return null;
  return BRANCHES.find((b) => b.valeur === branche) ?? { valeur: branche, libelle: branche, ton: 'var(--commune)' };
}

/**
 * Au-delà de deux mois, une mairie qui n'a pas répondu ne répondra plus d'elle-même :
 * la demande s'est perdue, ou elle attend une pièce qu'on n'a pas jointe.
 */
export const SEUIL_RELANCE = 60;

/**
 * Jours pleins écoulés depuis une date de la base (« 2026-03-12 »).
 * L'instant de référence est celui du rendu, sauf à en imposer un autre.
 */
export function joursDepuis(date: string | null, maintenant: number = Date.now()): number | null {
  if (!date) return null;
  const debut = Date.parse(date.length <= 10 ? `${date}T12:00:00Z` : date);
  if (Number.isNaN(debut)) return null;
  return Math.max(0, Math.floor((maintenant - debut) / 86_400_000));
}

/** Délai qu'a mis un organisme à répondre, en jours. */
export function joursEntre(debut: string | null, fin: string | null): number | null {
  if (!debut || !fin) return null;
  const arrivee = Date.parse(fin.length <= 10 ? `${fin}T12:00:00Z` : fin);
  if (Number.isNaN(arrivee)) return null;
  return joursDepuis(debut, arrivee);
}

/** « aujourd’hui », « il y a 9 jours », « il y a 3 semaines », « il y a 5 mois ». */
export function depuis(jours: number): string {
  if (jours <= 0) return 'aujourd’hui';
  if (jours === 1) return 'hier';
  if (jours < 14) return `il y a ${jours} jours`;
  if (jours < 60) return `il y a ${Math.round(jours / 7)} semaines`;
  if (jours < 365) return `il y a ${Math.max(2, Math.round(jours / 30.4))} mois`;
  const annees = Math.floor(jours / 365);
  return annees === 1 ? 'il y a plus d’un an' : `il y a plus de ${annees} ans`;
}

/** Range les chantiers du plus urgent au moins urgent, la plus vieille demande d'abord. */
export function trierParPriorite(chantiers: ChantierVue[]): ChantierVue[] {
  return [...chantiers].sort(
    (a, b) =>
      a.priorite - b.priorite ||
      (a.demandeLe ?? '9999').localeCompare(b.demandeLe ?? '9999') ||
      a.titre.localeCompare(b.titre, 'fr')
  );
}
