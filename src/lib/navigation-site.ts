/** Liens principaux — visibles en permanence sur grand écran. */
export const LIENS_PRINCIPAUX = [
  { href: '/', libelle: 'Accueil' },
  { href: '/arbre', libelle: 'L’arbre' },
  { href: '/chronologie', libelle: 'Chronologie' },
  { href: '/carte', libelle: 'Carte' },
  { href: '/souvenirs', libelle: 'Souvenirs' },
] as const;

/**
 * Sections secondaires, regroupées pour le menu « Plus » et le tiroir mobile.
 * Voir / Raconter / Chercher / Outils — pour que le récit ne se perde pas
 * derrière l’export.
 */
export const GROUPES_NAVIGATION = [
  {
    id: 'raconter',
    titre: 'Raconter',
    liens: [
      { href: '/recits', libelle: 'Récits' },
      { href: '/histoire', libelle: 'La grande Histoire' },
      { href: '/aujourdhui', libelle: 'Ces jours-ci' },
    ],
  },
  {
    id: 'chercher',
    titre: 'Chercher',
    liens: [
      { href: '/recherches', libelle: 'Recherches' },
      { href: '/parente', libelle: 'Parenté' },
      { href: '/statistiques', libelle: 'Statistiques' },
      { href: '/nouveautes', libelle: 'Quoi de neuf' },
    ],
  },
  {
    id: 'outils',
    titre: 'Outils',
    liens: [{ href: '/export', libelle: 'Exporter' }],
  },
] as const;

/** Liste plate des liens du menu « Plus » (compatibilité). */
export const LIENS_PLUS = GROUPES_NAVIGATION.flatMap((g) => [...g.liens]);

export const LIENS = [...LIENS_PRINCIPAUX, ...LIENS_PLUS] as const;

export type LienNavigation = (typeof LIENS)[number];
export type GroupeNavigation = (typeof GROUPES_NAVIGATION)[number];
