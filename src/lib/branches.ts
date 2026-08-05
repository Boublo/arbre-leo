/**
 * Les deux branches d'ascendance.
 *
 * Un arbre se lit à deux couleurs : ce qui vient du père, ce qui vient de la
 * mère. Les identifiants employés en base viennent des fichiers GEDCOM
 * d'origine et sont donc propres à chaque famille ; ils sont déclarés ici par
 * variables d'environnement pour qu'aucun nom réel n'entre dans le code.
 *
 * À défaut de configuration, on retombe sur « paternelle » et « maternelle ».
 */

export const BRANCHE_PATERNELLE =
  process.env.NEXT_PUBLIC_BRANCHE_PATERNELLE?.trim() || 'paternelle';

export const BRANCHE_MATERNELLE =
  process.env.NEXT_PUBLIC_BRANCHE_MATERNELLE?.trim() || 'maternelle';

/**
 * Prénom de l'enfant autour duquel l'arbre est construit, tel qu'il s'affiche
 * en repère de génération. Configurable pour la même raison que ci-dessus.
 */
export const PRENOM_RACINE = process.env.NEXT_PUBLIC_PRENOM_RACINE?.trim() || 'L’enfant';

export type Cote = 'paternelle' | 'maternelle' | 'commune';

/**
 * Déduit le côté d'une personne des branches auxquelles elle appartient.
 * Une personne présente dans les deux — le couple d'où part l'arbre — est
 * dite « commune ».
 */
export function coteDesBranches(branches: readonly string[]): Cote {
  const paternelle = branches.includes(BRANCHE_PATERNELLE);
  const maternelle = branches.includes(BRANCHE_MATERNELLE);

  if (paternelle && maternelle) return 'commune';
  if (paternelle) return 'paternelle';
  if (maternelle) return 'maternelle';
  return 'commune';
}
