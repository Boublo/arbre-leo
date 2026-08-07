/** Styles de fond disponibles pour la planche de l'arbre. */
export type FondArbre = 'points' | 'uni' | 'vivant' | 'aurore';

export const CLE_FOND_ARBRE = 'arbre-fond';

export const FONDS_ARBRE: FondArbre[] = ['points', 'uni', 'vivant', 'aurore'];

export const LIBELLE_FOND_ARBRE: Record<
  FondArbre,
  { titre: string; aide: string; icone: string }
> = {
  points: {
    titre: 'Grille discrète',
    aide: 'Parchemin et petits points — fond actuel, lisible sur les grands arbres.',
    icone: '▦',
  },
  uni: {
    titre: 'Parchemin uni',
    aide: 'Grain de papier seul, sans motif ni animation.',
    icone: '▢',
  },
  vivant: {
    titre: 'Parchemin vivant',
    aide: 'Lavis de couleur, points d’encre et pétales qui dérivent doucement.',
    icone: '✦',
  },
  aurore: {
    titre: 'Aurore',
    aide: 'Nuages de lumière animés qui suivent le déplacement et la souris.',
    icone: '☁',
  },
};

export function estFondArbre(valeur: string | null | undefined): valeur is FondArbre {
  return valeur !== null && valeur !== undefined && FONDS_ARBRE.includes(valeur as FondArbre);
}

export function lireFondArbreDepuisStockage(lire: (cle: string) => string | null): FondArbre {
  const sauve = lire(CLE_FOND_ARBRE);
  return estFondArbre(sauve) ? sauve : 'points';
}
