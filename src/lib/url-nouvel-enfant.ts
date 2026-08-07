import type { DonneesArbre } from '@/lib/arbre';
import type { Sexe } from '@/lib/types-base';

/**
 * Parents à préremplir quand on crée un enfant depuis la fiche ou l’arbre.
 * Si un conjoint est connu dans une union, les deux parents sont renseignés.
 */
export function parentsPourNouvelEnfant(
  personneId: string,
  sexe: Sexe,
  donnees?: Pick<DonneesArbre, 'personnes' | 'unions'> | null
): { pereId: string; mereId: string } {
  let pereId = sexe === 'M' ? personneId : '';
  let mereId = sexe === 'F' ? personneId : '';

  const personne = donnees?.personnes.get(personneId);
  for (const unionId of personne?.unions ?? []) {
    const union = donnees?.unions.get(unionId);
    if (!union) continue;

    const autreId =
      union.conjointA === personneId
        ? union.conjointB
        : union.conjointB === personneId
          ? union.conjointA
          : null;
    if (!autreId) continue;

    const autre = donnees?.personnes.get(autreId);
    if (!autre) continue;

    if (sexe === 'M') {
      if (autre.sexe === 'F') mereId = autreId;
      else if (!mereId) mereId = autreId;
    } else if (sexe === 'F') {
      if (autre.sexe === 'M') pereId = autreId;
      else if (!pereId) pereId = autreId;
    } else {
      if (autre.sexe === 'M') pereId = autreId;
      else if (autre.sexe === 'F') mereId = autreId;
    }
    break;
  }

  if (sexe === 'inconnu' && !pereId && !mereId) {
    pereId = personneId;
  }

  return { pereId, mereId };
}

export function construireUrlNouvelEnfant(pereId: string, mereId: string): string {
  const params = new URLSearchParams();
  if (pereId) params.set('pere', pereId);
  if (mereId) params.set('mere', mereId);
  const qs = params.toString();
  return `/personne/nouvelle${qs ? `?${qs}` : ''}`;
}

/** URL de création d’un enfant avec père et mère préremplis si possible. */
export function urlNouvelEnfant(
  personneId: string,
  sexe: Sexe,
  donnees?: Pick<DonneesArbre, 'personnes' | 'unions'> | null
): string {
  const { pereId, mereId } = parentsPourNouvelEnfant(personneId, sexe, donnees);
  return construireUrlNouvelEnfant(pereId, mereId);
}
