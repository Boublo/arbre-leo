import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';

/**
 * Statistiques visuelles de l'arbre.
 *
 * Toutes les fonctions parcourent les données déjà chargées par `chargerArbre`
 * — aucune requête supplémentaire, aucune donnée en dur. Les mesures se font
 * ici, sur l'objet familial en mémoire ; les composants n'ont plus qu'à les
 * mettre en forme. La base garde les dates en morceaux (année, mois, jour) :
 * pour la plupart des indicateurs, la seule année suffit et se lit directement.
 *
 * Les personnes présumées vivantes ne comptent jamais dans les âges au décès ;
 * les âges négatifs, aberrations manifestes, sont exclus par sécurité.
 */

// ---------------------------------------------------------------------------
// Types de sortie
// ---------------------------------------------------------------------------

export type EntreeDecennie = {
  /** Année qui ouvre la décennie : 1900 pour la décennie 1900-1909. */
  decennie: number;
  naissances: number;
  deces: number;
};

export type EntreePays = { pays: string; personnes: number };
export type EntreeMetier = { metier: string; personnes: number };
export type EntreeBranche = { branche: string; personnes: number };
export type EntreeTranche = { tranche: string; personnes: number };
export type EntreeTaille = { enfants: number; foyers: number };
export type EntreeLongevite = { personne: PersonneArbre; age: number };
export type EntreeActe = { avecActe: number; sansActe: number };

// ---------------------------------------------------------------------------
// Outils partagés
// ---------------------------------------------------------------------------

/**
 * Âge au décès, en années entières, ou `null` si on ne connaît pas la borne
 * qu'il faut. On lit sur l'année seule : la précision au jour près n'apporte
 * rien aux moyennes et exclurait la moitié des personnes documentées.
 */
function ageAuDeces(p: PersonneArbre): number | null {
  const n = p.naissance?.annee ?? null;
  const d = p.deces?.annee ?? null;
  if (n === null || d === null) return null;
  const age = d - n;
  return age < 0 ? null : age;
}

/**
 * Le pays d'un libellé de lieu. Les libellés suivent la forme
 * « Commune, Département, Région, Pays » — on prend le dernier segment.
 * Un libellé d'un seul mot n'a rien à donner ici : on retourne `null` plutôt
 * que d'inventer un pays qui n'en est pas un.
 */
function extrairePays(libelle: string | null | undefined): string | null {
  if (!libelle) return null;
  const parts = libelle
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 1] ?? null;
}

// ---------------------------------------------------------------------------
// Répartitions
// ---------------------------------------------------------------------------

/**
 * Naissances et décès rangés par décennie. On remplit toutes les décennies
 * entre la première et la dernière connue, y compris les vides : sans cela,
 * la frise sauterait des époques et laisserait croire à des ruptures.
 */
export function repartitionParDecennie(donnees: DonneesArbre): EntreeDecennie[] {
  const naissances = new Map<number, number>();
  const deces = new Map<number, number>();

  for (const p of donnees.personnes.values()) {
    const n = p.naissance?.annee;
    if (n !== null && n !== undefined) {
      const d = Math.floor(n / 10) * 10;
      naissances.set(d, (naissances.get(d) ?? 0) + 1);
    }
    const dc = p.deces?.annee;
    if (dc !== null && dc !== undefined) {
      const d = Math.floor(dc / 10) * 10;
      deces.set(d, (deces.get(d) ?? 0) + 1);
    }
  }

  const toutes = new Set<number>([...naissances.keys(), ...deces.keys()]);
  if (toutes.size === 0) return [];

  const min = Math.min(...toutes);
  const max = Math.max(...toutes);
  const entrees: EntreeDecennie[] = [];
  for (let d = min; d <= max; d += 10) {
    entrees.push({
      decennie: d,
      naissances: naissances.get(d) ?? 0,
      deces: deces.get(d) ?? 0,
    });
  }
  return entrees;
}

/**
 * Nombre de personnes rattachées à chaque pays par leur naissance ou leur
 * décès. Une personne née en France et décédée en Algérie est comptée dans
 * les deux : c'est ce qui donne du sens au chiffre — les pays traversés,
 * pas les résidences uniques.
 */
export function repartitionParPays(donnees: DonneesArbre): EntreePays[] {
  const parPays = new Map<string, Set<string>>();

  for (const p of donnees.personnes.values()) {
    const pays = new Set<string>();
    for (const libelle of [p.naissance?.lieu, p.deces?.lieu]) {
      const x = extrairePays(libelle);
      if (x) pays.add(x);
    }
    for (const x of pays) {
      const ensemble = parPays.get(x) ?? new Set<string>();
      ensemble.add(p.id);
      parPays.set(x, ensemble);
    }
  }

  return [...parPays.entries()]
    .map(([pays, ids]) => ({ pays, personnes: ids.size }))
    .sort((a, b) => b.personnes - a.personnes || a.pays.localeCompare(b.pays, 'fr'));
}

/**
 * Métiers exercés dans la famille. Une personne n'a ici qu'un métier — celui
 * que la base a retenu comme le plus caractéristique — car `chargerArbre` ne
 * garde que le premier événement de type « profession ». Le tri met devant
 * les plus fréquents ; à égalité, l'ordre alphabétique départage.
 */
export function repartitionParMetier(donnees: DonneesArbre): EntreeMetier[] {
  const compte = new Map<string, number>();
  for (const p of donnees.personnes.values()) {
    const m = p.profession?.trim();
    if (!m) continue;
    compte.set(m, (compte.get(m) ?? 0) + 1);
  }
  return [...compte.entries()]
    .map(([metier, personnes]) => ({ metier, personnes }))
    .sort((a, b) => b.personnes - a.personnes || a.metier.localeCompare(b.metier, 'fr'));
}

/**
 * Nombre de personnes appartenant à chaque branche. Les personnes présentes
 * dans les deux branches — le couple d'où part l'arbre — sont comptées dans
 * chacune : elles y appartiennent réellement toutes les deux.
 */
export function repartitionParBranche(donnees: DonneesArbre): EntreeBranche[] {
  const compte = new Map<string, number>();
  for (const p of donnees.personnes.values()) {
    for (const b of p.branches) {
      compte.set(b, (compte.get(b) ?? 0) + 1);
    }
  }
  return [...compte.entries()]
    .map(([branche, personnes]) => ({ branche, personnes }))
    .sort((a, b) => b.personnes - a.personnes || a.branche.localeCompare(b.branche, 'fr'));
}

/**
 * Répartition des âges au décès en tranches de dix ans. La dernière tranche
 * rassemble les centenaires : ils sont rares et ne méritent pas plusieurs
 * lignes vides. Toutes les tranches intermédiaires sont représentées, même
 * vides — un creux dans la courbe raconte autant qu'un pic.
 */
export function agesAuDeces(donnees: DonneesArbre): EntreeTranche[] {
  const compte = new Map<number, number>();
  for (const p of donnees.personnes.values()) {
    const age = ageAuDeces(p);
    if (age === null) continue;
    const tranche = Math.min(100, Math.floor(age / 10) * 10);
    compte.set(tranche, (compte.get(tranche) ?? 0) + 1);
  }
  if (compte.size === 0) return [];

  const maxTranche = Math.max(...compte.keys());
  const entrees: EntreeTranche[] = [];
  for (let t = 0; t <= maxTranche; t += 10) {
    const libelle = t >= 100 ? '100 ans et plus' : `${t} – ${t + 9} ans`;
    entrees.push({ tranche: libelle, personnes: compte.get(t) ?? 0 });
  }
  return entrees;
}

/** Âge moyen au décès, arrondi à l'année. `null` si aucun couple naissance/décès. */
export function ageMoyenAuDeces(donnees: DonneesArbre): number | null {
  let somme = 0;
  let n = 0;
  for (const p of donnees.personnes.values()) {
    const age = ageAuDeces(p);
    if (age === null) continue;
    somme += age;
    n += 1;
  }
  return n === 0 ? null : Math.round(somme / n);
}

/**
 * Âge moyen au mariage : moyenne calculée sur les conjoints dont on connaît
 * l'année de naissance et l'année de mariage. Les âges hors bornes plausibles
 * (moins de douze ans, plus de quatre-vingt-dix ans) sont ignorés : ce sont
 * presque toujours des erreurs de saisie qui fausseraient la moyenne. `null`
 * si aucun couple exploitable.
 */
export function ageMoyenAuMariage(donnees: DonneesArbre): number | null {
  let somme = 0;
  let n = 0;
  for (const union of donnees.unions.values()) {
    const anneeMariage = union.mariage?.annee;
    if (anneeMariage === null || anneeMariage === undefined) continue;

    for (const cid of [union.conjointA, union.conjointB]) {
      if (!cid) continue;
      const conjoint = donnees.personnes.get(cid);
      const naissance = conjoint?.naissance?.annee;
      if (naissance === null || naissance === undefined) continue;
      const age = anneeMariage - naissance;
      if (age < 12 || age > 90) continue;
      somme += age;
      n += 1;
    }
  }
  return n === 0 ? null : Math.round(somme / n);
}

/**
 * Nombre de foyers par nombre d'enfants. Les couples sans enfant sont
 * comptés — leur présence dit quelque chose de la famille. Le classement va
 * du plus petit foyer au plus grand.
 */
export function tailleFamille(donnees: DonneesArbre): EntreeTaille[] {
  const compte = new Map<number, number>();
  for (const union of donnees.unions.values()) {
    const nb = union.enfants.length;
    compte.set(nb, (compte.get(nb) ?? 0) + 1);
  }
  return [...compte.entries()]
    .map(([enfants, foyers]) => ({ enfants, foyers }))
    .sort((a, b) => a.enfants - b.enfants);
}

/**
 * Les dix personnes dont l'âge au décès est le plus élevé. Ne peuvent en
 * faire partie que celles dont naissance et décès sont datés — les personnes
 * présumées vivantes n'entrent pas dans ce classement.
 */
export function longevite(donnees: DonneesArbre, combien = 10): EntreeLongevite[] {
  const entrees: EntreeLongevite[] = [];
  for (const p of donnees.personnes.values()) {
    const age = ageAuDeces(p);
    if (age === null) continue;
    entrees.push({ personne: p, age });
  }
  entrees.sort(
    (a, b) => b.age - a.age || a.personne.nomComplet.localeCompare(b.personne.nomComplet, 'fr')
  );
  return entrees.slice(0, combien);
}

/**
 * Combien de personnes s'appuient sur un acte d'état civil consulté, combien
 * ne s'appuient encore que sur la mémoire ou l'hypothèse. C'est la mesure la
 * plus directe de ce qui reste à documenter.
 */
export function avecOuSansActe(donnees: DonneesArbre): EntreeActe {
  let avec = 0;
  let sans = 0;
  for (const p of donnees.personnes.values()) {
    const aActe =
      p.niveauxPreuve.includes('acte') || p.niveauxPreuve.includes('anom');
    if (aActe) avec += 1;
    else sans += 1;
  }
  return { avecActe: avec, sansActe: sans };
}
