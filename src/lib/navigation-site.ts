/** Liens principaux — visibles en permanence sur grand écran. */
export const LIENS_PRINCIPAUX = [
  { href: '/', libelle: 'Accueil' },
  { href: '/arbre', libelle: 'L’arbre' },
  { href: '/chronologie', libelle: 'Chronologie' },
  { href: '/carte', libelle: 'Carte' },
  { href: '/souvenirs', libelle: 'Souvenirs' },
] as const;

/** Autres portes — menu « Plus » sur grand écran, liste complète sur mobile. */
export const LIENS_PLUS = [
  { href: '/recits', libelle: 'Récits' },
  { href: '/histoire', libelle: 'La grande Histoire' },
  { href: '/aujourdhui', libelle: 'Ces jours-ci' },
  { href: '/statistiques', libelle: 'Statistiques' },
  { href: '/recherches', libelle: 'Recherches' },
  { href: '/parente', libelle: 'Parenté' },
  { href: '/nouveautes', libelle: 'Quoi de neuf' },
  { href: '/export', libelle: 'Exporter' },
] as const;

export const LIENS = [...LIENS_PRINCIPAUX, ...LIENS_PLUS] as const;

export type LienNavigation = (typeof LIENS)[number];
