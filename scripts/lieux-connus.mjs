/**
 * Coordonnées des lieux rencontrés dans les actes.
 *
 * Saisies à la main plutôt que géocodées : les libellés des actes renvoient à
 * une géographie disparue — l'Algérie française, des hameaux rattachés depuis
 * à d'autres communes — qu'aucun service de géocodage ne résout correctement.
 * La clé est le libellé exact tel qu'il figure dans le GEDCOM.
 */
export const LIEUX_CONNUS = {
  // --- Algérie française : villages de colonisation de l'Oranie -------------
  "La Senia, Departement d'Oran, Algerie": {
    lat: 35.6497, lng: -0.6236,
    paysActuel: 'Algérie',
    note: "Es Senia, dans la banlieue d'Oran. Village de colonisation créé en 1848, peuplé pour l'essentiel d'immigrés espagnols venus d'Alicante et d'Almería.",
  },
  "Saint-Andre, Mers el-Kebir, Departement d'Oran, Algerie": {
    lat: 35.7256, lng: -0.7053,
    paysActuel: 'Algérie',
    note: "Hameau de Saint-André, sur la commune de Mers el-Kébir. Rade militaire dominée par le fort de Santa Cruz.",
  },
  "Mers el-Kebir, Departement d'Oran, Algerie": {
    lat: 35.7256, lng: -0.7053, paysActuel: 'Algérie',
  },
  "El Ancor, Departement d'Oran, Algerie": {
    lat: 35.6892, lng: -0.8636, paysActuel: 'Algérie',
    note: "Village côtier à l'ouest d'Oran, aujourd'hui El Ançor.",
  },
  "Tiaret, Departement d'Oran, Algerie": {
    lat: 35.3711, lng: 1.3170, paysActuel: 'Algérie',
  },
  "Oran, Departement d'Oran, Algerie": {
    lat: 35.6969, lng: -0.6331, paysActuel: 'Algérie',
  },

  // --- Espagne -------------------------------------------------------------
  'La Roda de Andalucia, Sevilla, Andalucia, Espagne': {
    lat: 37.2094, lng: -4.7717, paysActuel: 'Espagne',
    note: "Bourg agricole de la campagne sévillane, à la limite de la province de Málaga.",
  },
  Espagne: { lat: 40.4637, lng: -3.7492, paysActuel: 'Espagne' },

  // --- Deux-Sèvres et Charente-Maritime ------------------------------------
  'Priaires, Deux-Sevres, Nouvelle-Aquitaine, France': {
    lat: 46.1783, lng: -0.7397, paysActuel: 'France',
    note: 'Village du Marais poitevin.',
  },
  'Usseau, Deux-Sevres, Nouvelle-Aquitaine, France': { lat: 46.2000, lng: -0.6667, paysActuel: 'France' },
  'Olbreuse, Usseau, Deux-Sevres, France': {
    lat: 46.2000, lng: -0.6667, paysActuel: 'France',
    note: "Hameau d'Usseau, connu pour son château, berceau d'Éléonore d'Olbreuse.",
  },
  'Niort, Deux-Sevres, Nouvelle-Aquitaine, France': { lat: 46.3239, lng: -0.4644, paysActuel: 'France' },
  'Cram-Chaban, Charente-Maritime, Nouvelle-Aquitaine, France': { lat: 46.2242, lng: -0.8656, paysActuel: 'France' },
  'Begue, Saint-Martin-de-Villeneuve, Charente-Maritime, France': { lat: 46.1500, lng: -0.8000, paysActuel: 'France' },

  // --- Bretagne et Pays de la Loire ----------------------------------------
  'Loyat, Morbihan, Bretagne, France': { lat: 47.9847, lng: -2.3169, paysActuel: 'France' },
  'La Rosaie, Loyat, Morbihan, Bretagne, France': { lat: 47.9847, lng: -2.3169, paysActuel: 'France' },
  'Le Mans, Sarthe, Pays de la Loire, France': { lat: 48.0061, lng: 0.1996, paysActuel: 'France' },
  "Saint-Mars-d'Outille, Sarthe, Pays de la Loire, France": { lat: 47.8667, lng: 0.3667, paysActuel: 'France' },
  'Laval, Mayenne, Pays de la Loire, France': { lat: 48.0698, lng: -0.7669, paysActuel: 'France' },
  'Brest, Finistere, Bretagne, France': { lat: 48.3904, lng: -4.4861, paysActuel: 'France' },

  // --- Isère ---------------------------------------------------------------
  "Saint-Martin-d'Heres, Isere, Auvergne-Rhone-Alpes, France": {
    lat: 45.1667, lng: 5.7667, paysActuel: 'France',
  },
  'La Tronche, Isere, Auvergne-Rhone-Alpes, France': { lat: 45.2050, lng: 5.7400, paysActuel: 'France' },
  'Domene, Isere, Auvergne-Rhone-Alpes, France': { lat: 45.2028, lng: 5.8394, paysActuel: 'France' },
  'Grenoble, Isere, Auvergne-Rhone-Alpes, France': { lat: 45.1885, lng: 5.7245, paysActuel: 'France' },

  // --- Hautes-Alpes et Sud ------------------------------------------------
  "Gap, Hautes-Alpes, Provence-Alpes-Cote d'Azur, France": { lat: 44.5594, lng: 6.0790, paysActuel: 'France' },
  "Serres, Hautes-Alpes, Provence-Alpes-Cote d'Azur, France": { lat: 44.4267, lng: 5.7133, paysActuel: 'France' },
  "Marseille, Bouches-du-Rhone, Provence-Alpes-Cote d'Azur, France": {
    lat: 43.2965, lng: 5.3698, paysActuel: 'France',
    note: "Port d'arrivée des rapatriés d'Algérie en 1962.",
  },

  // --- Autres --------------------------------------------------------------
  'Bordeaux, Gironde, Nouvelle-Aquitaine, France': { lat: 44.8378, lng: -0.5792, paysActuel: 'France' },
  'Paris 11e arrondissement, Seine, France': { lat: 48.8594, lng: 2.3765, paysActuel: 'France' },
  'Italie': { lat: 41.8719, lng: 12.5674, paysActuel: 'Italie' },
};
