import type { PersonneArbre } from '@/lib/arbre';

/**
 * Années de vie d'une personne, formulées pour être affichées à côté de son
 * nom : « 1887 – 1954 », « née en 1962 », rien si les dates manquent.
 *
 * La règle du projet veut que tout lien vers une personne porte ses années :
 * un nom sans dates s'égare vite dans une famille de neuf générations. On
 * garde donc cette petite fonction ici, au plus près des composants qui en
 * ont besoin.
 */
export function anneesDeVie(personne: PersonneArbre): string | null {
  const naissance = personne.naissance?.annee;
  const deces = personne.deces?.annee;

  if (naissance && deces) return `${naissance} – ${deces}`;
  if (naissance) {
    return personne.sexe === 'F' ? `née en ${naissance}` : `né en ${naissance}`;
  }
  if (deces) {
    return personne.sexe === 'F' ? `morte en ${deces}` : `mort en ${deces}`;
  }
  return null;
}
