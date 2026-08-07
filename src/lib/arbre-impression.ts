import {
  filtrerDispositionEclate,
  RANG_MAX_ECLATE,
  type Disposition,
  type FiltreBrancheEclate,
  type ModeArbre,
  type NoeudArbre,
} from '@/lib/layout-arbre';

/** Profondeur maximale affichée (nombre de rangs depuis la personne choisie). */
export type ProfondeurImpression = 2 | 3 | 4 | 5 | 8 | 'tout';

export type OptionsImpressionArbre = {
  profondeur: ProfondeurImpression;
  avecPhotos: boolean;
  format: 'paysage' | 'portrait';
  decoupage: 'complet' | 'pages';
  /** Mode « Tout » : reprise de la profondeur affichée à l’écran. */
  profondeurEclate?: number;
  /** Mode « Tout » : filtre paternel / maternel. */
  filtreBranche?: FiltreBrancheEclate;
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
  decoupage: 'complet',
};

export function parserOptionsImpression(params: {
  profondeur?: string;
  photos?: string;
  format?: string;
  decoupage?: string;
  eclateProfondeur?: string;
  branche?: string;
}): OptionsImpressionArbre {
  const profondeurBrute = params.profondeur;
  const profondeurValide = PROFONDEURS.some((p) => String(p.valeur) === profondeurBrute)
    ? (profondeurBrute === 'tout' ? 'tout' : Number(profondeurBrute)) as ProfondeurImpression
    : OPTIONS_IMPRESSION_DEFAUT.profondeur;

  const brancheBrute = params.branche;
  const filtreBranche: FiltreBrancheEclate | undefined =
    brancheBrute === 'paternelle' || brancheBrute === 'maternelle' || brancheBrute === 'tous'
      ? brancheBrute
      : undefined;

  const profondeurEclateBrute = params.eclateProfondeur
    ? Number(params.eclateProfondeur)
    : NaN;
  const profondeurEclate =
    Number.isFinite(profondeurEclateBrute) && profondeurEclateBrute > 0
      ? Math.min(profondeurEclateBrute, RANG_MAX_ECLATE)
      : undefined;

  return {
    profondeur: profondeurValide,
    avecPhotos: params.photos !== '0',
    format: params.format === 'portrait' ? 'portrait' : 'paysage',
    decoupage: params.decoupage === 'pages' ? 'pages' : 'complet',
    profondeurEclate,
    filtreBranche,
  };
}

/** Lien court vers la page imprimable, avec options par défaut modifiables. */
export function urlImpressionArbre(
  personneId: string,
  mode: string,
  partiel?: Partial<OptionsImpressionArbre>
): string {
  return urlOptionsImpression(
    { personne: personneId, mode },
    { ...OPTIONS_IMPRESSION_DEFAUT, ...partiel }
  );
}

/** Reprend la profondeur du mode « Tout » pour préremplir la page imprimable. */
export function profondeurEclateVersImpression(profondeurEclate: number): ProfondeurImpression {
  if (profondeurEclate >= RANG_MAX_ECLATE) return 'tout';
  if (profondeurEclate >= 8) return 8;
  if (profondeurEclate >= 5) return 5;
  if (profondeurEclate >= 4) return 4;
  if (profondeurEclate >= 3) return 3;
  return 2;
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
    decoupage: options.decoupage,
  });
  if (options.profondeurEclate !== undefined) {
    q.set('eclateProfondeur', String(options.profondeurEclate));
  }
  if (options.filtreBranche && options.filtreBranche !== 'tous') {
    q.set('branche', options.filtreBranche);
  }
  return `/arbre/imprimer?${q.toString()}`;
}

/**
 * Applique les filtres d’impression sur une disposition déjà calculée.
 * En mode « Tout », la profondeur écran prime sur le découpage par générations.
 */
export function preparerDispositionImpression(
  disposition: Disposition,
  mode: ModeArbre,
  racineId: string,
  options: OptionsImpressionArbre
): Disposition {
  let resultat = disposition;

  if (mode === 'eclate') {
    if (options.filtreBranche && options.filtreBranche !== 'tous') {
      resultat = filtrerDispositionEclate(resultat, options.filtreBranche, racineId);
    }
    if (!options.profondeurEclate) {
      resultat = filtrerDisposition(resultat, options.profondeur, racineId);
    }
    return resultat;
  }

  return filtrerDisposition(resultat, options.profondeur, racineId);
}

/**
 * Distance en générations depuis la personne choisie (symétrique ascendance/descendance).
 */
function deltaDepuisRacine(noeud: NoeudArbre, rangRacine: number): number {
  return Math.abs(noeud.rang - rangRacine);
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

  const { rangRacine } = disposition;
  const ids = new Set(
    disposition.noeuds
      .filter(
        (n) =>
          n.personneId === racineId || deltaDepuisRacine(n, rangRacine) <= profondeur
      )
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

/** Nombre de rangs par feuille quand le découpage multi-pages est actif. */
export const RANGS_PAR_PAGE = 4;

export type TrancheImpression = {
  disposition: Disposition;
  /** Libellé du type « Générations 0 à 3 ». */
  libelle: string;
  index: number;
  total: number;
};

/**
 * Découpe une disposition en tranches de quelques générations pour l'impression
 * multi-pages. Chaque tranche ne garde que les liens internes.
 */
export function decouperDispositionParPages(disposition: Disposition): TrancheImpression[] {
  const { rangRacine } = disposition;
  const maxDelta = Math.max(
    ...disposition.noeuds.map((n) => deltaDepuisRacine(n, rangRacine)),
    0
  );

  if (maxDelta < RANGS_PAR_PAGE) {
    return [{ disposition, libelle: '', index: 0, total: 1 }];
  }

  const tranches: TrancheImpression[] = [];
  const nbPages = Math.ceil((maxDelta + 1) / RANGS_PAR_PAGE);

  for (let page = 0; page < nbPages; page++) {
    const deltaDebut = page * RANGS_PAR_PAGE;
    const deltaFin = Math.min(deltaDebut + RANGS_PAR_PAGE - 1, maxDelta);

    const ids = new Set(
      disposition.noeuds
        .filter((n) => {
          const d = deltaDepuisRacine(n, rangRacine);
          return d >= deltaDebut && d <= deltaFin;
        })
        .map((n) => n.personneId)
    );

    const noeuds = disposition.noeuds.filter((n) => ids.has(n.personneId));
    if (noeuds.length === 0) continue;

    const liens = disposition.liens.filter(
      (l) => ids.has(l.enfantId) && ids.has(l.parentId)
    );
    const unions = disposition.unions.filter(
      (u) => ids.has(u.aId) && ids.has(u.bId)
    );
    const rangMax = Math.max(...noeuds.map((n) => n.rang), 0);

    tranches.push({
      disposition: {
        ...disposition,
        noeuds,
        liens,
        unions,
        rangMax,
        largeur: recalculerEtendue(noeuds, 'x'),
        hauteur: recalculerEtendue(noeuds, 'y'),
      },
      libelle: libelleTranche(deltaDebut, deltaFin),
      index: tranches.length,
      total: 0,
    });
  }

  const total = tranches.length;
  return tranches.map((t) => ({ ...t, total }));
}

function libelleTranche(deltaDebut: number, deltaFin: number): string {
  if (deltaDebut === 0 && deltaFin === 0) return 'Personne choisie';
  if (deltaDebut === 0) return `Jusqu’à ${deltaFin} génération${deltaFin > 1 ? 's' : ''}`;
  if (deltaDebut === deltaFin) {
    return `Génération ${deltaDebut}`;
  }
  return `Générations ${deltaDebut} à ${deltaFin}`;
}
