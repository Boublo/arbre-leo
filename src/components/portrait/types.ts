import type { PersonneArbre } from '@/lib/arbre';
import type { Sexe } from '@/lib/types-base';

/**
 * De quoi dessiner une personne, sans plus.
 *
 * Les composants de portrait sont partagés : ils doivent se laisser construire
 * depuis n’importe quelle source — `PersonneArbre`, `LienPersonne` d’une fiche,
 * ou une projection ad hoc — sans forcer l’appelant à charger davantage que ce
 * qu’il affiche. D’où ce type volontairement pauvre, où presque tout est
 * facultatif.
 */
export type Portrait = {
  id: string;
  nomComplet: string;
  surnom?: string | null;
  sexe: Sexe;
  branches: readonly string[];
  presumeVivant?: boolean;
  anneeNaissance?: number | null;
  anneeDeces?: number | null;
  lieuNaissance?: string | null;
};

/**
 * Version étoffée pour la variante à photo : la vignette riche ne signe pas
 * elle-même l’URL — c’est l’appelant qui en a la charge, parce que la vignette
 * n’a pas connaissance du contexte de session.
 */
export type PortraitEnrichi = Portrait & {
  profession?: string | null;
  /** URL déjà signée : le bucket des médias est privé, la signature est brève. */
  photoUrl?: string | null;
  nbSouvenirs?: number;
};

/**
 * Traduit une `PersonneArbre` — le fruit de `chargerArbre` — en `Portrait`.
 * L’adaptation la plus courante, glissée ici pour éviter que chaque appelant
 * en reproduise sa propre variante.
 */
export function portraitDePersonne(p: PersonneArbre): Portrait {
  return {
    id: p.id,
    nomComplet: p.nomComplet,
    surnom: p.surnom,
    sexe: p.sexe,
    branches: p.branches,
    presumeVivant: p.presumeVivant,
    anneeNaissance: p.naissance?.annee ?? null,
    anneeDeces: p.deces?.annee ?? null,
    lieuNaissance: p.naissance?.lieuCourt ?? null,
  };
}

/**
 * « 1886–1961 », « née en 1886 », « mort en 1961 » ou rien du tout. L’accord
 * suit le sexe : dans un livre de famille, la personne reste reconnaissable au
 * premier coup d’œil, jusque dans la mention la plus brève.
 */
export function formaterAnneesDeVie(p: Portrait): string | null {
  const n = p.anneeNaissance ?? null;
  const d = p.anneeDeces ?? null;
  if (n && d) return `${n}–${d}`;
  if (n) return `${p.sexe === 'F' ? 'née' : 'né'} en ${n}`;
  if (d) return `${p.sexe === 'F' ? 'morte' : 'mort'} en ${d}`;
  return null;
}

/**
 * Forme courte pour les cases étroites du mini-arbre : « 1886–1961 »,
 * « 1886– » si l’on ne sait pas quand la personne est morte, « –1961 » si
 * l’on ignore quand elle est née. Rien si les deux manquent.
 */
export function anneesCourtes(p: Portrait): string | null {
  const n = p.anneeNaissance ?? null;
  const d = p.anneeDeces ?? null;
  if (n && d) return `${n}–${d}`;
  if (n) return `${n}–`;
  if (d) return `–${d}`;
  return null;
}
