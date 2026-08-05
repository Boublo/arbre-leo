/**
 * Identité du site.
 *
 * Rien de tout ceci n'est écrit en dur : le dépôt est public, et l'application
 * doit pouvoir servir à une autre famille sans qu'on touche au code. Les
 * valeurs réelles vivent dans `.env.local`, qui n'est pas versionné.
 */

export const NOM_DU_SITE = process.env.NEXT_PUBLIC_NOM_DU_SITE?.trim() || 'L’arbre de la famille';

export const SOUS_TITRE_DU_SITE =
  process.env.NEXT_PUBLIC_SOUS_TITRE?.trim() ||
  'Ce que les actes disent, et ce dont on se souvient.';
