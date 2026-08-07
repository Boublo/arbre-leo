import type { PersonneArbre } from '@/lib/arbre';

/** Lieu de repos ou de décès pour aider à commémorer un aïeul. */
export type LieuCommemoration = {
  libelle: string;
  lieuId: string | null;
  /** Inhumation prioritaire sur le lieu de décès. */
  source: 'inhumation' | 'deces';
};

/**
 * Retourne le lieu le plus utile pour se rendre sur la tombe :
 * inhumation d'abord, sinon lieu du décès.
 */
export function lieuCommemoration(personne: PersonneArbre): LieuCommemoration | null {
  if (personne.inhumation?.lieu) {
    return {
      libelle: personne.inhumation.lieu,
      lieuId: personne.inhumation.lieuId,
      source: 'inhumation',
    };
  }
  if (personne.deces?.lieu) {
    return {
      libelle: personne.deces.lieu,
      lieuId: personne.deces.lieuId,
      source: 'deces',
    };
  }
  return null;
}

export function libelleLieuCommemoration(
  lieu: LieuCommemoration,
  feminin: boolean
): string {
  if (lieu.source === 'inhumation') {
    return feminin ? `Inhumée à ${lieu.libelle}` : `Inhumé à ${lieu.libelle}`;
  }
  return feminin ? `Décédée à ${lieu.libelle}` : `Décédé à ${lieu.libelle}`;
}
