'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';
import { resoudrePresumeVivant } from '@/lib/vivant';
import { meilleurePreuve } from '@/lib/preuves';
import {
  ANNEE_MIN,
  VALEURS_NATURE,
  VALEURS_PRECISION,
  VALEURS_PREUVE,
  VALEURS_QUALIFICATIF,
  VALEURS_SEXE,
  anneeMax,
  colonnesDate,
  dateReelle,
  verifierEcartParent,
  verifierOrdreDeVie,
} from '@/lib/saisie-personne';
import type { NiveauPreuve, TypeEvenement } from '@/lib/types-base';

/**
 * Écrire quelqu’un dans l’arbre.
 *
 * Jusqu’ici l’arbre ne se remplissait que par import GEDCOM : les enfants nés
 * depuis n’y entraient pas. Ces trois fonctions ouvrent la saisie à la famille,
 * avec les précautions qu’une base généalogique réclame.
 *
 * Trois principes tiennent tout :
 * - la base éclate l’information — une vie dans « evenements », une famille
 *   dans « unions » et « filiations » — et c’est ici qu’un formulaire à plat se
 *   retraduit en ces morceaux ;
 * - les garde-fous parlent français : une filiation impossible se refuse avec
 *   une phrase, jamais avec une erreur de Postgres ;
 * - le droit d’écrire n’est pas décidé ici. Les politiques RLS en jugent ; on
 *   se contente de traduire leur refus.
 */

export type EtatPersonne = {
  erreur?: string;
  message?: string;
  /** Ce qui mérite d’être signalé sans empêcher d’enregistrer. */
  avertissement?: string;
  /** Renseigné quand la fiche est écrite : le formulaire cède la place à un lien. */
  lienFiche?: string;
  /** Le formulaire tel qu’il était, pour le rendre inchangé après un refus. */
  saisie?: Record<string, string>;
  /** Numéro d’envoi : il force le remontage du formulaire avec ces valeurs. */
  essai?: number;
};

type ClientServeur = Awaited<ReturnType<typeof creerClientServeur>>;

// ---------------------------------------------------------------------------
// Lecture du formulaire
// ---------------------------------------------------------------------------

/** Un champ laissé vide vaut « non renseigné », pas « chaîne vide ». */
function champ(donnees: FormData, nom: string): string | undefined {
  const valeur = donnees.get(nom);
  if (typeof valeur !== 'string') return undefined;
  const propre = valeur.trim();
  return propre === '' ? undefined : propre;
}

/** Les champs répétés — preuves, enfants — repartent joints par une virgule. */
const CHAMPS_MULTIPLES = new Set(['preuves', 'enfants']);

function relire(donnees: FormData): Record<string, string> {
  const saisie: Record<string, string> = {};
  for (const [nom, valeur] of donnees.entries()) {
    if (typeof valeur !== 'string' || valeur === '') continue;
    if (CHAMPS_MULTIPLES.has(nom)) {
      saisie[nom] = saisie[nom] ? `${saisie[nom]},${valeur}` : valeur;
    } else {
      saisie[nom] = valeur;
    }
  }
  return saisie;
}

function lireDate(donnees: FormData, prefixe: string) {
  return {
    qualificatif: champ(donnees, `${prefixe}Qualificatif`),
    precision: champ(donnees, `${prefixe}Precision`),
    annee: champ(donnees, `${prefixe}Annee`),
    mois: champ(donnees, `${prefixe}Mois`),
    jour: champ(donnees, `${prefixe}Jour`),
    lieu: champ(donnees, `${prefixe}Lieu`),
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const schemaDate = (role: string) =>
  z
    .object({
      qualificatif: z
        .enum(VALEURS_QUALIFICATIF, 'Ce qualificatif de date n’existe pas.')
        .default('exacte'),
      precision: z
        .enum(VALEURS_PRECISION, 'Cette précision de date n’existe pas.')
        .default('inconnue'),
      annee: z.coerce
        .number(`L’année de ${role} doit être un nombre, par exemple 1887.`)
        .int(`L’année de ${role} doit être un nombre entier.`)
        .min(ANNEE_MIN, `L’arbre ne remonte pas avant ${ANNEE_MIN} : vérifiez l’année de ${role}.`)
        .max(anneeMax(), `Cette année de ${role} n’est pas encore arrivée.`)
        .optional(),
      mois: z.coerce
        .number(`Le mois de ${role} doit être un nombre.`)
        .int()
        .min(1, `Le mois de ${role} va de 1 à 12.`)
        .max(12, `Le mois de ${role} va de 1 à 12.`)
        .optional(),
      jour: z.coerce
        .number(`Le jour de ${role} doit être un nombre.`)
        .int()
        .min(1, `Le jour de ${role} va de 1 à 31.`)
        .max(31, `Le jour de ${role} va de 1 à 31.`)
        .optional(),
      lieu: z.string().trim().max(200, `Le lieu de ${role} est trop long.`).optional(),
    })
    .superRefine((v, ctx) => {
      const manque = (message: string) => ctx.addIssue({ code: 'custom', message });

      if (v.precision !== 'inconnue' && v.annee === undefined) {
        manque(`Indiquez au moins l’année de ${role}, ou choisissez « rien de sûr ».`);
      }
      if ((v.precision === 'mois' || v.precision === 'jour') && v.mois === undefined) {
        manque(`Indiquez le mois de ${role}.`);
      }
      if (v.precision === 'jour' && v.jour === undefined) {
        manque(`Indiquez le jour de ${role}.`);
      }
      if (
        v.precision === 'jour' &&
        v.annee !== undefined &&
        v.mois !== undefined &&
        v.jour !== undefined &&
        !dateReelle(v.annee, v.mois, v.jour)
      ) {
        manque(`Cette date de ${role} n’a jamais existé.`);
      }
    });

const schemaPersonne = z
  .object({
    prenoms: z.string().trim().max(160, 'Les prénoms dépassent 160 caractères.').optional(),
    nom: z.string().trim().max(120, 'Le nom dépasse 120 caractères.').optional(),
    nomNaissance: z.string().trim().max(120, 'Le nom de naissance dépasse 120 caractères.').optional(),
    surnom: z.string().trim().max(120, 'Le surnom dépasse 120 caractères.').optional(),
    sexe: z.enum(VALEURS_SEXE, 'Ce sexe n’existe pas.').default('inconnu'),
    presumeVivant: z.boolean(),
    naissance: schemaDate('naissance'),
    deces: schemaDate('décès'),
    inhumation: schemaDate('inhumation'),
    profession: z.string().trim().max(200, 'La profession dépasse 200 caractères.').optional(),
    residence: z.string().trim().max(200, 'La résidence dépasse 200 caractères.').optional(),
    notes: z.string().trim().max(20000, 'Les notes dépassent 20 000 caractères.').optional(),
    preuves: z.array(z.enum(VALEURS_PREUVE, 'Ce niveau de preuve n’existe pas.')),
    unionParents: z.uuid('Cette union n’existe pas.').optional(),
    pereId: z.uuid('Ce père n’est pas dans l’arbre.').optional(),
    mereId: z.uuid('Cette mère n’est pas dans l’arbre.').optional(),
    natureFiliation: z.enum(VALEURS_NATURE, 'Cette nature de filiation n’existe pas.').default('naturelle'),
    conjointId: z.uuid('Ce conjoint n’est pas dans l’arbre.').optional(),
    foyerEnfants: z.uuid('Ce foyer n’existe pas.').optional(),
    enfants: z
      .array(z.uuid('Un des enfants désignés n’est pas dans l’arbre.'))
      .max(30, 'Trente enfants d’un coup : reprenez en deux fois.'),
    detacherParents: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.prenoms === undefined && v.nom === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Indiquez au moins un prénom ou un nom : c’est le seul champ vraiment nécessaire.',
      });
    }
  });

type PersonneValide = z.infer<typeof schemaPersonne>;

function analyser(donnees: FormData) {
  return schemaPersonne.safeParse({
    prenoms: champ(donnees, 'prenoms'),
    nom: champ(donnees, 'nom'),
    nomNaissance: champ(donnees, 'nomNaissance'),
    surnom: champ(donnees, 'surnom'),
    sexe: champ(donnees, 'sexe'),
    // Une case décochée n’est pas envoyée : son absence est la réponse.
    presumeVivant: donnees.get('presumeVivant') !== null,
    naissance: lireDate(donnees, 'naissance'),
    deces: lireDate(donnees, 'deces'),
    inhumation: lireDate(donnees, 'inhumation'),
    profession: champ(donnees, 'profession'),
    residence: champ(donnees, 'residence'),
    notes: champ(donnees, 'notes'),
    preuves: donnees.getAll('preuves').map((v) => String(v)),
    unionParents: champ(donnees, 'unionParents'),
    pereId: champ(donnees, 'pereId'),
    mereId: champ(donnees, 'mereId'),
    natureFiliation: champ(donnees, 'natureFiliation'),
    conjointId: champ(donnees, 'conjointId'),
    foyerEnfants: champ(donnees, 'foyerEnfants'),
    enfants: donnees.getAll('enfants').map((v) => String(v)),
    detacherParents: donnees.get('detacherParents') !== null,
  });
}

function premierMessage(erreur: z.ZodError): string {
  return erreur.issues[0]?.message ?? 'Le formulaire est incomplet.';
}

// ---------------------------------------------------------------------------
// Garde-fous
// ---------------------------------------------------------------------------

type Voisin = { id: string; nom: string; anneeNaissance: number | null; branches: string[] };

function nomLisible(p: {
  nom_complet: string | null;
  prenoms: string | null;
  nom: string | null;
}): string {
  return p.nom_complet?.trim() || p.prenoms || p.nom || 'cette personne';
}

function uniques(ids: (string | undefined | null)[]): string[] {
  return [...new Set(ids.filter((v): v is string => Boolean(v)))];
}

/** Les personnes désignées par le formulaire, avec ce qu’il faut pour les juger. */
async function chargerVoisins(
  supabase: ClientServeur,
  ids: string[]
): Promise<Map<string, Voisin>> {
  const voisins = new Map<string, Voisin>();
  if (ids.length === 0) return voisins;

  const [personnesRes, naissancesRes] = await Promise.all([
    supabase.from('personnes').select('id, nom_complet, prenoms, nom, branches').in('id', ids),
    supabase.from('evenements').select('personne_id, annee').eq('type', 'naissance').in('personne_id', ids),
  ]);

  const annees = new Map<string, number | null>();
  for (const e of naissancesRes.data ?? []) {
    if (e.personne_id && !annees.has(e.personne_id)) annees.set(e.personne_id, e.annee);
  }

  for (const p of personnesRes.data ?? []) {
    voisins.set(p.id, {
      id: p.id,
      nom: nomLisible(p),
      anneeNaissance: annees.get(p.id) ?? null,
      branches: p.branches ?? [],
    });
  }
  return voisins;
}

/**
 * Ce qu’une famille ne peut pas être.
 *
 * Rend la première phrase qui cloche, ou `null` si l’ensemble tient debout.
 * Rien n’est déduit d’une date manquante : on ne refuse que ce qui est
 * franchement impossible.
 */
function verifierFamille(
  v: PersonneValide,
  idPersonne: string | null,
  nomPersonne: string,
  anneeNaissance: number | null,
  voisins: Map<string, Voisin>,
  conjointsDeLUnion: string[]
): string | null {
  const parents = uniques([v.pereId, v.mereId, ...conjointsDeLUnion]);

  if (v.pereId && v.mereId && v.pereId === v.mereId) {
    return 'Une même personne ne peut pas être à la fois le père et la mère.';
  }
  if (idPersonne && parents.includes(idPersonne)) {
    return 'Une personne ne peut pas être son propre parent.';
  }
  if (idPersonne && v.conjointId === idPersonne) {
    return 'Une personne ne peut pas être son propre conjoint.';
  }
  if (idPersonne && v.enfants.includes(idPersonne)) {
    return 'Une personne ne peut pas être son propre enfant.';
  }

  for (const enfantId of v.enfants) {
    if (parents.includes(enfantId)) {
      const nom = voisins.get(enfantId)?.nom ?? 'Cette personne';
      return `${nom} ne peut pas être à la fois le parent et l’enfant de la même personne.`;
    }
  }

  for (const parentId of parents) {
    const parent = voisins.get(parentId);
    if (!parent) return 'Un des parents désignés n’est plus dans l’arbre.';
    const souci = verifierEcartParent(parent.anneeNaissance, anneeNaissance, parent.nom, nomPersonne);
    if (souci) return souci;
  }

  for (const enfantId of v.enfants) {
    const enfant = voisins.get(enfantId);
    if (!enfant) return 'Un des enfants désignés n’est plus dans l’arbre.';
    const souci = verifierEcartParent(anneeNaissance, enfant.anneeNaissance, nomPersonne, enfant.nom);
    if (souci) return souci;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Lieux
// ---------------------------------------------------------------------------

/** Deux libellés qui ne diffèrent que par la casse ou les accents sont le même lieu. */
function memeLieu(a: string, b: string): boolean {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' }) === 0;
}

/**
 * Retrouve un lieu par son libellé, ou le crée. Les doublons sont le fléau
 * d’une base de lieux : on préfère toujours une ligne existante.
 */
async function resoudreLieu(
  supabase: ClientServeur,
  libelle: string | undefined
): Promise<{ id: string | null; erreur?: string }> {
  if (!libelle) return { id: null };

  const { data, error } = await supabase.from('lieux').select('id, libelle');
  if (error) return { id: null, erreur: traduireErreur(error.message) };

  const connu = (data ?? []).find((l) => memeLieu(l.libelle, libelle));
  if (connu) return { id: connu.id };

  const { data: cree, error: erreurCreation } = await supabase
    .from('lieux')
    .insert({ libelle })
    .select('id')
    .single();

  if (erreurCreation || !cree) {
    return {
      id: null,
      erreur: `Le lieu « ${libelle} » n’a pas pu être ajouté à la base. ${traduireErreur(erreurCreation?.message ?? '')}`,
    };
  }
  return { id: cree.id };
}

// ---------------------------------------------------------------------------
// Unions
// ---------------------------------------------------------------------------

type LigneUnion = { id: string; conjoint_a: string | null; conjoint_b: string | null };

/** L’arbre compte quelques dizaines d’unions : les parcourir coûte moins qu’un filtre bâti à la main. */
async function toutesLesUnions(supabase: ClientServeur): Promise<LigneUnion[]> {
  const { data } = await supabase.from('unions').select('id, conjoint_a, conjoint_b');
  return data ?? [];
}

function memeCouple(u: LigneUnion, a: string | null, b: string | null): boolean {
  return (u.conjoint_a === a && u.conjoint_b === b) || (u.conjoint_a === b && u.conjoint_b === a);
}

/**
 * L’union qui joint deux personnes, retrouvée ou créée.
 *
 * `conjoint_a` reçoit le père quand on le connaît : c’est l’ordre que l’arbre
 * suppose pour placer les deux ascendances de part et d’autre d’un enfant.
 */
async function unionDe(
  supabase: ClientServeur,
  a: string | null,
  b: string | null,
  unions: LigneUnion[]
): Promise<{ id: string | null; erreur?: string }> {
  if (!a && !b) return { id: null };

  const connue = unions.find((u) => memeCouple(u, a, b));
  if (connue) return { id: connue.id };

  const { data, error } = await supabase
    .from('unions')
    .insert({ conjoint_a: a, conjoint_b: b })
    .select('id, conjoint_a, conjoint_b')
    .single();

  if (error || !data) return { id: null, erreur: traduireErreur(error?.message ?? '') };

  unions.push(data);
  return { id: data.id };
}

// ---------------------------------------------------------------------------
// Événements
// ---------------------------------------------------------------------------

type NouvelEvenement = {
  personne_id: string;
  type: TypeEvenement;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  qualificatif: ReturnType<typeof colonnesDate>['qualificatif'];
  precision_date: ReturnType<typeof colonnesDate>['precision_date'];
  lieu_id: string | null;
  detail: string | null;
  niveau_preuve: NiveauPreuve | null;
  cree_par: string;
};

/** Les quatre événements que le formulaire sait écrire, une fois les lieux résolus. */
function composerEvenements(
  v: PersonneValide,
  personneId: string,
  utilisateurId: string,
  lieux: { naissance: string | null; deces: string | null; inhumation: string | null; residence: string | null }
): NouvelEvenement[] {
  const preuve = meilleurePreuve(v.preuves);
  const socle = { personne_id: personneId, niveau_preuve: preuve, cree_par: utilisateurId };
  const evenements: NouvelEvenement[] = [];

  const vie = (
    type: 'naissance' | 'deces' | 'inhumation',
    saisie: PersonneValide['naissance'],
    lieuId: string | null
  ) => {
    // Un événement sans date ni lieu n’apprend rien : on ne l’écrit pas.
    if (saisie.precision === 'inconnue' && lieuId === null) return;
    evenements.push({
      ...socle,
      type,
      ...colonnesDate({
        qualificatif: saisie.qualificatif,
        precision: saisie.precision,
        annee: saisie.annee ?? null,
        mois: saisie.mois ?? null,
        jour: saisie.jour ?? null,
      }),
      lieu_id: lieuId,
      detail: null,
    });
  };

  vie('naissance', v.naissance, lieux.naissance);
  vie('deces', v.deces, lieux.deces);
  vie('inhumation', v.inhumation, lieux.inhumation);

  const sansDate = {
    annee: null,
    mois: null,
    jour: null,
    qualificatif: 'exacte' as const,
    precision_date: 'inconnue' as const,
  };

  if (v.profession) {
    evenements.push({ ...socle, type: 'profession', ...sansDate, lieu_id: null, detail: v.profession });
  }
  if (v.residence) {
    evenements.push({
      ...socle,
      type: 'residence',
      ...sansDate,
      lieu_id: lieux.residence,
      detail: lieux.residence ? null : v.residence,
    });
  }

  return evenements;
}

// ---------------------------------------------------------------------------
// Rattachements
// ---------------------------------------------------------------------------

/**
 * Écrit les trois liens possibles : les parents, le conjoint, les enfants.
 * Rend la liste de ce qui n’a pas pu être fait — jamais une exception : la
 * fiche, elle, est déjà enregistrée et ne doit pas être perdue.
 */
async function rattacher(
  supabase: ClientServeur,
  v: PersonneValide,
  personneId: string,
  filiationExistante: { union_id: string } | null
): Promise<string[]> {
  const soucis: string[] = [];
  const unions = await toutesLesUnions(supabase);

  // --- Les parents ---------------------------------------------------------

  let unionParents: string | null = null;

  if (v.unionParents) {
    unionParents = unions.some((u) => u.id === v.unionParents) ? v.unionParents : null;
    if (!unionParents) soucis.push('L’union des parents indiquée n’existe plus.');
  } else if (v.pereId || v.mereId) {
    const resultat = await unionDe(supabase, v.pereId ?? null, v.mereId ?? null, unions);
    if (resultat.erreur) soucis.push(`Les parents n’ont pas pu être rattachés. ${resultat.erreur}`);
    unionParents = resultat.id;
  }

  if (unionParents && filiationExistante?.union_id !== unionParents) {
    if (filiationExistante) {
      await supabase.from('filiations').delete().eq('enfant_id', personneId);
    }
    const { error } = await supabase.from('filiations').insert({
      union_id: unionParents,
      enfant_id: personneId,
      // La filiation ordinaire est la valeur par défaut de la base : on la laisse dire.
      ...(v.natureFiliation === 'naturelle' ? {} : { nature: v.natureFiliation }),
    });
    if (error) soucis.push(`Le rattachement aux parents a échoué. ${traduireErreur(error.message)}`);
  } else if (
    v.detacherParents &&
    !unionParents &&
    !v.unionParents &&
    !v.pereId &&
    !v.mereId &&
    filiationExistante
  ) {
    await supabase.from('filiations').delete().eq('enfant_id', personneId);
  }

  // --- Le conjoint ---------------------------------------------------------

  let unionConjoint: string | null = null;
  if (v.conjointId) {
    const resultat = await unionDe(supabase, personneId, v.conjointId, unions);
    if (resultat.erreur) soucis.push(`L’union avec le conjoint n’a pas pu être créée. ${resultat.erreur}`);
    unionConjoint = resultat.id;
  }

  // --- Les enfants ---------------------------------------------------------

  if (v.enfants.length === 0) return soucis;

  let foyer: string | null = null;

  if (v.foyerEnfants) {
    const choisi = unions.find((u) => u.id === v.foyerEnfants);
    if (!choisi || (choisi.conjoint_a !== personneId && choisi.conjoint_b !== personneId)) {
      soucis.push('Le foyer choisi pour les enfants n’est pas celui de cette personne.');
      return soucis;
    }
    foyer = choisi.id;
  } else if (unionConjoint) {
    foyer = unionConjoint;
  } else {
    const resultat = await unionDe(supabase, personneId, null, unions);
    if (resultat.erreur) soucis.push(`Le foyer des enfants n’a pas pu être créé. ${resultat.erreur}`);
    foyer = resultat.id;
  }

  if (!foyer) return soucis;
  const foyerId = foyer;

  // Un enfant n’appartient qu’à un foyer : celui qui en a déjà un est laissé
  // où il est, et on le dit plutôt que de le déplacer en silence.
  const { data: dejaRattaches } = await supabase
    .from('filiations')
    .select('enfant_id, union_id')
    .in('enfant_id', v.enfants);

  const ailleurs = (dejaRattaches ?? []).filter((f) => f.union_id !== foyerId).map((f) => f.enfant_id);
  const aEcrire = v.enfants.filter((id) => !(dejaRattaches ?? []).some((f) => f.enfant_id === id));

  if (ailleurs.length > 0) {
    const { data: noms } = await supabase
      .from('personnes')
      .select('id, nom_complet, prenoms, nom')
      .in('id', ailleurs);
    const listes = (noms ?? []).map(nomLisible).join(', ');
    soucis.push(
      `${listes || 'Un des enfants'} : déjà rattaché à un autre foyer, le lien n’a pas été changé. Corrigez-le depuis sa propre fiche.`
    );
  }

  if (aEcrire.length > 0) {
    const { error } = await supabase
      .from('filiations')
      .insert(aEcrire.map((enfantId) => ({ union_id: foyerId, enfant_id: enfantId })));
    if (error) soucis.push(`Les enfants n’ont pas pu être rattachés. ${traduireErreur(error.message)}`);
  }

  return soucis;
}

/** Les branches d’un enfant sont celles de ses parents : la couleur suit la lignée. */
function branchesHeritees(voisins: Map<string, Voisin>, parents: string[]): string[] {
  const branches = new Set<string>();
  for (const id of parents) {
    for (const b of voisins.get(id)?.branches ?? []) branches.add(b);
  }
  return [...branches];
}

async function conjointsDUneUnion(
  supabase: ClientServeur,
  unionId: string | undefined
): Promise<string[]> {
  if (!unionId) return [];
  const { data } = await supabase
    .from('unions')
    .select('conjoint_a, conjoint_b')
    .eq('id', unionId)
    .maybeSingle();
  return uniques([data?.conjoint_a, data?.conjoint_b]);
}

/**
 * Les liens déjà écrits, confrontés à la date de naissance qu’on vient de
 * corriger.
 *
 * Ceux-là ne bloquent pas : ils existaient avant cette saisie, et c’est
 * peut-être justement la date qui les rendait faux. On se contente de dire ce
 * qui ne concorde plus, pour que quelqu’un aille voir.
 */
async function relireLiensDejaEcrits(
  supabase: ClientServeur,
  id: string,
  nom: string,
  anneeNaissance: number | null
): Promise<string[]> {
  if (anneeNaissance === null) return [];

  const [filiationRes, foyersRes] = await Promise.all([
    supabase.from('filiations').select('union_id').eq('enfant_id', id).maybeSingle(),
    supabase.from('unions').select('id').or(`conjoint_a.eq.${id},conjoint_b.eq.${id}`),
  ]);

  const idsFoyers = (foyersRes.data ?? []).map((u) => u.id);

  const [parents, enfantsRes] = await Promise.all([
    conjointsDUneUnion(supabase, filiationRes.data?.union_id ?? undefined),
    idsFoyers.length
      ? supabase.from('filiations').select('enfant_id').in('union_id', idsFoyers)
      : Promise.resolve({ data: [] as { enfant_id: string }[] }),
  ]);

  const enfants = uniques((enfantsRes.data ?? []).map((f) => f.enfant_id)).filter((e) => e !== id);
  const voisins = await chargerVoisins(supabase, uniques([...parents, ...enfants]));

  const messages: string[] = [];

  for (const parentId of parents) {
    const parent = voisins.get(parentId);
    if (!parent) continue;
    const souci = verifierEcartParent(parent.anneeNaissance, anneeNaissance, parent.nom, nom);
    if (souci) messages.push(souci);
  }
  for (const enfantId of enfants) {
    const enfant = voisins.get(enfantId);
    if (!enfant) continue;
    const souci = verifierEcartParent(anneeNaissance, enfant.anneeNaissance, nom, enfant.nom);
    if (souci) messages.push(souci);
  }

  if (messages.length === 0) return [];
  return [`Un rattachement déjà écrit ne concorde plus avec cette date. ${messages.join(' ')}`];
}

/** Le nom que porteront les messages d’erreur avant même que la fiche existe. */
function nomAnnonce(v: PersonneValide): string {
  return [v.prenoms, v.nom].filter(Boolean).join(' ') || 'cette personne';
}

function rafraichir(personneId: string, voisins: string[]): void {
  revalidatePath('/');
  revalidatePath('/chronologie');
  revalidatePath(`/personne/${personneId}`);
  for (const id of voisins) revalidatePath(`/personne/${id}`);
}

// ---------------------------------------------------------------------------
// Enregistrer une nouvelle personne
// ---------------------------------------------------------------------------

export async function enregistrerPersonne(
  precedent: EtatPersonne,
  donnees: FormData
): Promise<EtatPersonne> {
  const essai = (precedent.essai ?? 0) + 1;
  const refus = (erreur: string): EtatPersonne => ({ erreur, saisie: relire(donnees), essai });

  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return refus('Votre session a expiré. Reconnectez-vous pour écrire dans l’arbre.');

  const analyse = analyser(donnees);
  if (!analyse.success) return refus(premierMessage(analyse.error));
  const v = analyse.data;

  const conjointsUnion = await conjointsDUneUnion(supabase, v.unionParents);
  const voisins = await chargerVoisins(
    supabase,
    uniques([v.pereId, v.mereId, v.conjointId, ...v.enfants, ...conjointsUnion])
  );

  const anneeNaissance = v.naissance.precision === 'inconnue' ? null : v.naissance.annee ?? null;
  const anneeDeces = v.deces.precision === 'inconnue' ? null : v.deces.annee ?? null;

  const impossible = verifierFamille(v, null, nomAnnonce(v), anneeNaissance, voisins, conjointsUnion);
  if (impossible) return refus(impossible);

  const lieux = await resoudreLieux(supabase, v);
  if (lieux.erreur) return refus(lieux.erreur);

  const parents = uniques([v.pereId, v.mereId, ...conjointsUnion]);
  const branches = branchesHeritees(voisins, parents);

  const { data: creee, error } = await supabase
    .from('personnes')
    .insert({
      prenoms: v.prenoms ?? null,
      nom: v.nom ?? null,
      nom_naissance: v.nomNaissance ?? null,
      surnom: v.surnom ?? null,
      sexe: v.sexe,
      notes: v.notes ?? null,
      niveaux_preuve: v.preuves,
      presume_vivant: resoudrePresumeVivant(v.presumeVivant, v.deces, v.inhumation),
      ...(branches.length > 0 ? { branches } : {}),
      cree_par: user.id,
    })
    .select('id')
    .single();

  if (error || !creee) return refus(traduireErreur(error?.message ?? ''));

  const soucis: string[] = [];

  const evenements = composerEvenements(v, creee.id, user.id, lieux);
  if (evenements.length > 0) {
    const { error: erreurEvenements } = await supabase.from('evenements').insert(evenements);
    if (erreurEvenements) {
      soucis.push(`Les dates n’ont pas pu être enregistrées. ${traduireErreur(erreurEvenements.message)}`);
    }
  }

  soucis.push(...(await rattacher(supabase, v, creee.id, null)));

  const ordre = verifierOrdreDeVie(anneeNaissance, anneeDeces);
  if (ordre) soucis.push(ordre);

  rafraichir(creee.id, uniques([v.pereId, v.mereId, v.conjointId, ...v.enfants, ...conjointsUnion]));

  // Une fiche écrite ne se réécrit pas : plutôt que de rendre le formulaire,
  // on emmène vers elle. Sauf s’il reste quelque chose à dire — un lien qui
  // n’a pas pris, une date qui interroge : on le dit avant de laisser partir.
  if (soucis.length > 0) {
    return {
      message: `${nomAnnonce(v)} est enregistré dans l’arbre.`,
      avertissement: soucis.join(' '),
      lienFiche: `/personne/${creee.id}`,
      essai,
    };
  }

  redirect(`/personne/${creee.id}`);
}

// ---------------------------------------------------------------------------
// Modifier une fiche
// ---------------------------------------------------------------------------

export async function modifierPersonne(
  precedent: EtatPersonne,
  donnees: FormData
): Promise<EtatPersonne> {
  const essai = (precedent.essai ?? 0) + 1;
  const refus = (erreur: string): EtatPersonne => ({ erreur, saisie: relire(donnees), essai });

  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return refus('Votre session a expiré. Reconnectez-vous pour écrire dans l’arbre.');

  const analyseId = z.uuid('Cette fiche n’existe pas.').safeParse(champ(donnees, 'id'));
  if (!analyseId.success) return refus('Cette fiche n’existe pas.');
  const id = analyseId.data;

  const analyse = analyser(donnees);
  if (!analyse.success) return refus(premierMessage(analyse.error));
  const v = analyse.data;

  const conjointsUnion = await conjointsDUneUnion(supabase, v.unionParents);
  const voisins = await chargerVoisins(
    supabase,
    uniques([v.pereId, v.mereId, v.conjointId, ...v.enfants, ...conjointsUnion])
  );

  const anneeNaissance = v.naissance.precision === 'inconnue' ? null : v.naissance.annee ?? null;
  const anneeDeces = v.deces.precision === 'inconnue' ? null : v.deces.annee ?? null;

  const impossible = verifierFamille(v, id, nomAnnonce(v), anneeNaissance, voisins, conjointsUnion);
  if (impossible) return refus(impossible);

  const lieux = await resoudreLieux(supabase, v);
  if (lieux.erreur) return refus(lieux.erreur);

  const { data: modifiee, error } = await supabase
    .from('personnes')
    .update({
      prenoms: v.prenoms ?? null,
      nom: v.nom ?? null,
      nom_naissance: v.nomNaissance ?? null,
      surnom: v.surnom ?? null,
      sexe: v.sexe,
      notes: v.notes ?? null,
      niveaux_preuve: v.preuves,
      presume_vivant: resoudrePresumeVivant(v.presumeVivant, v.deces, v.inhumation),
      modifie_par: user.id,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return refus(traduireErreur(error.message));
  if (!modifiee) {
    return refus(
      'Cette fiche ne peut pas être modifiée : elle n’existe plus, ou la base vous refuse ce droit.'
    );
  }

  const soucis: string[] = [];

  // Les quatre événements de la saisie sont réécrits en entier : plus sûr
  // qu’une réconciliation champ par champ, et sans effet sur les autres
  // événements de la fiche — mariage, service militaire, distinction.
  const { error: erreurNettoyage } = await supabase
    .from('evenements')
    .delete()
    .eq('personne_id', id)
    .in('type', ['naissance', 'deces', 'inhumation', 'profession', 'residence']);

  if (erreurNettoyage) {
    soucis.push(`Les anciennes dates n’ont pas pu être remplacées. ${traduireErreur(erreurNettoyage.message)}`);
  } else {
    const evenements = composerEvenements(v, id, user.id, lieux);
    if (evenements.length > 0) {
      const { error: erreurEvenements } = await supabase.from('evenements').insert(evenements);
      if (erreurEvenements) {
        soucis.push(`Les dates n’ont pas pu être enregistrées. ${traduireErreur(erreurEvenements.message)}`);
      }
    }
  }

  const { data: filiation } = await supabase
    .from('filiations')
    .select('union_id')
    .eq('enfant_id', id)
    .maybeSingle();

  soucis.push(...(await rattacher(supabase, v, id, filiation ?? null)));
  soucis.push(...(await relireLiensDejaEcrits(supabase, id, nomAnnonce(v), anneeNaissance)));

  const ordre = verifierOrdreDeVie(anneeNaissance, anneeDeces);
  if (ordre) soucis.push(ordre);

  rafraichir(id, uniques([v.pereId, v.mereId, v.conjointId, ...v.enfants, ...conjointsUnion]));

  return {
    message: 'La fiche est à jour.',
    avertissement: soucis.length > 0 ? soucis.join(' ') : undefined,
    essai,
  };
}

/** Les trois lieux du formulaire, résolus d’un bloc avant d’écrire quoi que ce soit. */
async function resoudreLieux(
  supabase: ClientServeur,
  v: PersonneValide
): Promise<{
  naissance: string | null;
  deces: string | null;
  inhumation: string | null;
  residence: string | null;
  erreur?: string;
}> {
  const naissance = await resoudreLieu(supabase, v.naissance.lieu);
  if (naissance.erreur) {
    return { naissance: null, deces: null, inhumation: null, residence: null, erreur: naissance.erreur };
  }

  const deces = await resoudreLieu(supabase, v.deces.lieu);
  if (deces.erreur) {
    return { naissance: null, deces: null, inhumation: null, residence: null, erreur: deces.erreur };
  }

  const inhumation = await resoudreLieu(supabase, v.inhumation.lieu);
  if (inhumation.erreur) {
    return { naissance: null, deces: null, inhumation: null, residence: null, erreur: inhumation.erreur };
  }

  const residence = await resoudreLieu(supabase, v.residence);
  if (residence.erreur) {
    return { naissance: null, deces: null, inhumation: null, residence: null, erreur: residence.erreur };
  }

  return {
    naissance: naissance.id,
    deces: deces.id,
    inhumation: inhumation.id,
    residence: residence.id,
  };
}

// ---------------------------------------------------------------------------
// Supprimer une fiche
// ---------------------------------------------------------------------------

/**
 * Retirer quelqu’un de l’arbre.
 *
 * Geste rare et sans retour, réservé aux administrateurs et confirmé
 * explicitement. On détache d’abord ce qui pend à la fiche — filiations,
 * événements, mentions — puis on efface la personne. Les unions dont elle était
 * l’un des conjoints survivent si l’autre conjoint ou des enfants y tiennent
 * encore : c’est la seule façon de ne pas faire disparaître une fratrie entière
 * en supprimant un père.
 */
export async function supprimerPersonne(donnees: FormData): Promise<void> {
  const supabase = await creerClientServeur();

  const analyse = z.uuid().safeParse(champ(donnees, 'id'));
  if (!analyse.success) return;
  const id = analyse.data;

  if (champ(donnees, 'confirmation') !== 'oui') return;

  const { data: autorise } = await supabase.rpc('est_admin');
  if (autorise !== true) return;

  const foyersRes = await supabase
    .from('unions')
    .select('id, conjoint_a, conjoint_b')
    .or(`conjoint_a.eq.${id},conjoint_b.eq.${id}`);

  const foyers = foyersRes.data ?? [];

  // Ce qui ne survit pas à la personne.
  await supabase.from('filiations').delete().eq('enfant_id', id);
  await supabase.from('evenements').delete().eq('personne_id', id);
  await supabase.from('sources').delete().eq('personne_id', id);
  await supabase.from('souvenirs_personnes').delete().eq('personne_id', id);
  await supabase.from('medias_personnes').delete().eq('personne_id', id);
  await supabase.from('faits_personnes').delete().eq('personne_id', id);
  await supabase.from('commentaires').delete().eq('personne_id', id);

  for (const foyer of foyers) {
    const detachement =
      foyer.conjoint_a === id ? { conjoint_a: null } : { conjoint_b: null };
    await supabase.from('unions').update(detachement).eq('id', foyer.id);

    const autre = foyer.conjoint_a === id ? foyer.conjoint_b : foyer.conjoint_a;
    if (autre) continue;

    const { data: enfants } = await supabase
      .from('filiations')
      .select('enfant_id')
      .eq('union_id', foyer.id);

    // Une union sans conjoint ni enfant n'est plus qu'une ligne morte.
    if ((enfants ?? []).length === 0) {
      await supabase.from('unions').delete().eq('id', foyer.id);
    }
  }

  await supabase.from('personnes').delete().eq('id', id);

  revalidatePath('/');
  revalidatePath('/chronologie');
  redirect('/');
}

// ---------------------------------------------------------------------------

/** Les messages de Postgres et de PostgREST sont en anglais : on les traduit. */
function traduireErreur(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'La base vous refuse ce droit. Demandez à un administrateur de la famille de vous passer contributeur.';
  }
  if (m.includes('violates foreign key')) {
    return 'Une des personnes désignées n’existe plus dans la base.';
  }
  if (m.includes('duplicate key')) {
    return 'Ce lien existe déjà.';
  }
  if (m.includes('violates check constraint')) {
    return 'La base a refusé cette valeur : elle ne fait pas partie de celles qu’elle accepte.';
  }
  if (m.includes('does not exist') || m.includes('schema cache')) {
    return 'Cette table n’est pas installée dans la base.';
  }
  if (m.includes('jwt') || m.includes('expired')) {
    return 'Votre session a expiré. Reconnectez-vous.';
  }
  return 'L’enregistrement a échoué. Réessayez dans un instant.';
}
