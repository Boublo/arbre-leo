import type { Disposition, NoeudArbre } from '@/lib/layout-arbre';

/** Profondeur maximale affichée (nombre de rangs depuis la personne choisie). */
export type ProfondeurImpression = 2 | 3 | 4 | 5 | 8 | 'tout';

export type OptionsImpressionArbre = {
  profondeur: ProfondeurImpression;
  avecPhotos: boolean;
  format: 'paysage' | 'portrait';
};

export const PROFONDEURS: { valeur: ProfondeurImpression; libelle: string }[] = [
  { valeur: 2, libelle: '2 générations' },
  { valeur: 3, libelle: '3 générations' },
  { valeur: 4, libelle: '4 générations' },
  { valeur: 5, libelle: '5 générations' },
  { valeur: 8, libelle: '8 générations' },
  { valeur: 'tout', libelle: 'Tout l’arbre' },
];

export const OPTIONS_IMPRESSION_DEFAUT: OptionsImpressionArbre = {
  profondeur: 5,
  avecPhotos: true,
  format: 'paysage',
};

export function parserOptionsImpression(params: {
  profondeur?: string;
  photos?: string;
  format?: string;
}): OptionsImpressionArbre {
  const profondeurBrute = params.profondeur;
  const profondeurValide = PROFONDEURS.some((p) => String(p.valeur) === profondeurBrute)
    ? (profondeurBrute === 'tout' ? 'tout' : Number(profondeurBrute)) as ProfondeurImpression
    : OPTIONS_IMPRESSION_DEFAUT.profondeur;

  return {
    profondeur: profondeurValide,
    avecPhotos: params.photos !== '0',
    format: params.format === 'portrait' ? 'portrait' : 'paysage',
  };
}

export function urlOptionsImpression(
  base: { personne: string; mode: string },
  options: OptionsImpressionArbre
): string {
  const q = new URLSearchParams({
    personne: base.personne,
    mode: base.mode,
    profondeur: String(options.profondeur),
    photos: options.avecPhotos ? '1' : '0',
    format: options.format,
  });
  return `/arbre/imprimer?${q.toString()}`;
}

/**
 * Réduit la disposition aux N premiers rangs autour de la personne choisie.
 * Les liens et unions ne gardent que les nœuds encore présents.
 */
export function filtrerDisposition(
  disposition: Disposition,
  profondeur: ProfondeurImpression,
  racineId: string
): Disposition {
  if (profondeur === 'tout') return disposition;

  const ids = new Set(
    disposition.noeuds
      .filter((n) => n.personneId === racineId || n.rang <= profondeur)
      .map((n) => n.personneId)
  );

  const noeuds = disposition.noeuds.filter((n) => ids.has(n.personneId));
  const liens = disposition.liens.filter(
    (l) => ids.has(l.enfantId) && ids.has(l.parentId)
  );
  const unions = disposition.unions.filter(
    (u) => ids.has(u.aId) && ids.has(u.bId)
  );

  const rangMax = Math.max(...noeuds.map((n) => n.rang), 0);

  return {
    ...disposition,
    noeuds,
    liens,
    unions,
    rangMax,
    largeur: recalculerEtendue(noeuds, 'x'),
    hauteur: recalculerEtendue(noeuds, 'y'),
  };
}

function recalculerEtendue(noeuds: NoeudArbre[], axe: 'x' | 'y'): number {
  if (noeuds.length === 0) return 0;
  const vals = noeuds.map((n) => n[axe]);
  return Math.max(...vals) - Math.min(...vals);
}

export function compterPersonnes(disposition: Disposition): number {
  return disposition.noeuds.length;
}

export function listePersonnesOrdonnee(
  noeuds: NoeudArbre[],
  noms: Map<string, string>
): { id: string; nom: string; rang: number }[] {
  return [...noeuds]
    .map((n) => ({
      id: n.personneId,
      nom: noms.get(n.personneId) ?? 'Sans nom',
      rang: n.rang,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.rang - b.rang);
}
