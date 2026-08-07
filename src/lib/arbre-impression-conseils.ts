import type { Disposition, ModeArbre } from '@/lib/layout-arbre';
import {
  RANGS_PAR_PAGE,
  urlOptionsImpression,
  type OptionsImpressionArbre,
} from '@/lib/arbre-impression';

export type ConseilImpression = {
  texte: string;
  lien?: string;
  libelleLien?: string;
};

/**
 * Conseils contextuels selon la taille de l'arbre et les options choisies.
 */
export function conseilsImpression(
  disposition: Disposition,
  options: OptionsImpressionArbre,
  personneId: string,
  mode: ModeArbre
): ConseilImpression[] {
  const base = { personne: personneId, mode };
  const conseils: ConseilImpression[] = [];
  const maxDelta = Math.max(
    ...disposition.noeuds.map((n) => Math.abs(n.rang - disposition.rangRacine)),
    0
  );

  if (maxDelta >= RANGS_PAR_PAGE && options.decoupage === 'complet') {
    conseils.push({
      texte: `Cet arbre s’étend sur ${maxDelta + 1} générations depuis la personne choisie : le découpage en plusieurs pages sera plus lisible à l’impression.`,
      lien: urlOptionsImpression(base, { ...options, decoupage: 'pages' }),
      libelleLien: 'Découper en plusieurs pages',
    });
  }

  if (disposition.noeuds.length > 35 && options.profondeur === 'tout') {
    conseils.push({
      texte: `${disposition.noeuds.length} personnes sur une seule vue : limitez la profondeur pour garder des cartes lisibles.`,
      lien: urlOptionsImpression(base, { ...options, profondeur: 5 }),
      libelleLien: 'Limiter à 5 générations',
    });
  }

  if (disposition.largeur > 1800 && options.avecPhotos) {
    conseils.push({
      texte: 'Arbre très large : essayez sans portraits pour gagner de la place.',
      lien: urlOptionsImpression(base, { ...options, avecPhotos: false }),
      libelleLien: 'Masquer les portraits',
    });
  }

  if (disposition.noeuds.length > 15 && options.format === 'portrait') {
    conseils.push({
      texte: 'En format portrait, un arbre large peut être serré : le paysage convient souvent mieux.',
      lien: urlOptionsImpression(base, { ...options, format: 'paysage' }),
      libelleLien: 'Passer en paysage',
    });
  }

  return conseils;
}
