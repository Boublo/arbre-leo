/**
 * Déclaration des fichiers GEDCOM à fusionner.
 *
 * Copier ce fichier en `sources.config.mjs` — non versionné — et l'adapter.
 * Les chemins sont résolus depuis le dossier `scripts/`.
 *
 * `branche` est l'identifiant qui servira à colorer l'arbre et à préfixer les
 * identifiants GEDCOM lors de la fusion. Reportez les deux mêmes valeurs dans
 * NEXT_PUBLIC_BRANCHE_PATERNELLE et NEXT_PUBLIC_BRANCHE_MATERNELLE.
 */
export const SOURCES = [
  {
    branche: 'paternelle',
    libelle: 'Côté paternel',
    chemin: '../../ascendance-paternelle.ged',
  },
  {
    branche: 'maternelle',
    libelle: 'Côté maternel',
    chemin: '../../ascendance-maternelle.ged',
  },
];
