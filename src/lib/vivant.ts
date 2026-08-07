/** Types d'événements qui closent la vie d'une personne. */
export const TYPES_FIN_DE_VIE = ['deces', 'inhumation', 'cremation'] as const;

/**
 * Indique si une personne doit être traitée comme vivante pour l'affichage
 * (pastille verte, bandeau de confidentialité, export restreint…).
 *
 * Le flag `presume_vivant` peut rester désynchronisé après un import ou une
 * saisie partielle ; la présence d'un événement de fin de vie prime toujours.
 */
export function personneEstVivante(
  presumeVivant: boolean,
  options?: { typesEvenements?: Iterable<string>; aEvenementFinDeVie?: boolean }
): boolean {
  if (!presumeVivant) return false;
  if (options?.aEvenementFinDeVie) return false;
  if (options?.typesEvenements) {
    for (const type of options.typesEvenements) {
      if ((TYPES_FIN_DE_VIE as readonly string[]).includes(type)) return false;
    }
  }
  return true;
}

/** À l'enregistrement : un décès ou une inhumation saisis retirent le statut vivant. */
export function resoudrePresumeVivant(
  presumeVivant: boolean,
  ...finDeVie: Array<{ precision: string; annee?: number; mois?: number; jour?: number }>
): boolean {
  for (const evenement of finDeVie) {
    if (evenement.precision !== 'inconnue' && (evenement.annee ?? evenement.mois ?? evenement.jour)) {
      return false;
    }
  }
  return presumeVivant;
}
