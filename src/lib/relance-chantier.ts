/** Au-delà de deux mois sans réponse, une demande mérite une relance humaine. */
export const SEUIL_RELANCE = 60;

/** Jours pleins écoulés depuis une date de la base, avec instant injectable pour les tests. */
export function joursDepuis(date: string | null, maintenant: number = Date.now()): number | null {
  if (!date) return null;
  const debut = Date.parse(date.length <= 10 ? `${date}T12:00:00Z` : date);
  if (Number.isNaN(debut)) return null;
  return Math.max(0, Math.floor((maintenant - debut) / 86_400_000));
}
