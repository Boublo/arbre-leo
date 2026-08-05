import { creerClientServeur } from '@/lib/supabase/server';
import type { Evenement, NiveauPreuve, Sexe, TypeEvenement } from '@/lib/types-base';

/**
 * Chargement de l'arbre et vocabulaire de présentation.
 *
 * La base garde les dates en morceaux — année, mois, jour, qualificatif — parce
 * qu'un acte du XVIIIe siècle dit souvent « vers 1755 » et rien de plus. C'est
 * ici qu'on retraduit ces morceaux en quelque chose de lisible.
 */

export type PersonneArbre = {
  id: string;
  codeGedcom: string | null;
  prenoms: string | null;
  nom: string | null;
  nomComplet: string;
  surnom: string | null;
  sexe: Sexe;
  branches: string[];
  niveauxPreuve: NiveauPreuve[];
  presumeVivant: boolean;
  notes: string | null;
  photoId: string | null;
  naissance: EvenementResume | null;
  deces: EvenementResume | null;
  profession: string | null;
  /** Identifiants des unions dont cette personne est l'un des conjoints. */
  unions: string[];
  /** Identifiant de l'union d'où elle est issue, s'il est connu. */
  issuDe: string | null;
};

export type EvenementResume = {
  annee: number | null;
  mois: number | null;
  jour: number | null;
  texte: string;
  lieu: string | null;
  lieuCourt: string | null;
};

export type UnionArbre = {
  id: string;
  conjointA: string | null;
  conjointB: string | null;
  enfants: string[];
  mariage: EvenementResume | null;
};

export type DonneesArbre = {
  personnes: Map<string, PersonneArbre>;
  unions: Map<string, UnionArbre>;
  /** Personne → identifiants de ses parents. */
  parents: Map<string, string[]>;
  /** Personne → identifiants de ses enfants. */
  enfants: Map<string, string[]>;
};

// ---------------------------------------------------------------------------
// Mise en forme
// ---------------------------------------------------------------------------

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const PREFIXE_QUALIFICATIF: Record<string, string> = {
  vers: 'vers ', avant: 'avant ', apres: 'après ', entre: 'entre ',
  depuis: 'depuis ', jusqu_a: "jusqu'à ", exacte: '',
};

/** « 8 mars 1993 », « mars 1993 », « vers 1850 », « entre 1850 et 1860 ». */
export function formaterDate(e: {
  annee: number | null;
  mois: number | null;
  jour: number | null;
  annee_fin?: number | null;
  qualificatif?: string | null;
  date_texte?: string | null;
}): string {
  if (e.annee === null) return e.date_texte ?? '';

  const prefixe = PREFIXE_QUALIFICATIF[e.qualificatif ?? 'exacte'] ?? '';

  if (e.qualificatif === 'entre' && e.annee_fin) {
    return `entre ${e.annee} et ${e.annee_fin}`;
  }
  if (e.jour && e.mois) {
    // « le 1er » et non « le 1 ».
    const jour = e.jour === 1 ? '1er' : String(e.jour);
    return `${prefixe}${jour} ${MOIS[e.mois - 1]} ${e.annee}`;
  }
  if (e.mois) return `${prefixe}${MOIS[e.mois - 1]} ${e.annee}`;
  return `${prefixe}${e.annee}`;
}

/** Ne garde que la commune : « Commune, Département, Région, Pays » → « Commune ». */
export function lieuCourt(libelle: string | null): string | null {
  if (!libelle) return null;
  return libelle.split(',')[0]?.trim() ?? libelle;
}

type LigneEvenement = Pick<
  Evenement,
  'annee' | 'mois' | 'jour' | 'annee_fin' | 'qualificatif' | 'date_texte' | 'type' | 'detail'
> & { lieux: { libelle: string } | null };

function resumer(e: LigneEvenement | undefined): EvenementResume | null {
  if (!e) return null;
  const libelle = e.lieux?.libelle ?? null;
  return {
    annee: e.annee,
    mois: e.mois,
    jour: e.jour,
    texte: formaterDate(e),
    lieu: libelle,
    lieuCourt: lieuCourt(libelle),
  };
}

// ---------------------------------------------------------------------------
// Chargement
// ---------------------------------------------------------------------------

/** Événements retenus pour l'affichage de l'arbre : le reste est chargé à la fiche. */
const TYPES_RESUME: TypeEvenement[] = ['naissance', 'deces', 'profession', 'mariage'];

export async function chargerArbre(): Promise<DonneesArbre> {
  const supabase = await creerClientServeur();

  const [personnesRes, unionsRes, filiationsRes, evenementsRes] = await Promise.all([
    supabase
      .from('personnes')
      .select('id, code_gedcom, prenoms, nom, nom_complet, surnom, sexe, branches, niveaux_preuve, presume_vivant, notes, photo_id'),
    supabase.from('unions').select('id, conjoint_a, conjoint_b'),
    supabase.from('filiations').select('union_id, enfant_id'),
    supabase
      .from('evenements')
      .select('personne_id, union_id, type, annee, mois, jour, annee_fin, qualificatif, date_texte, detail, lieux(libelle)')
      .in('type', TYPES_RESUME),
  ]);

  const erreur = personnesRes.error ?? unionsRes.error ?? filiationsRes.error ?? evenementsRes.error;
  if (erreur) throw new Error(`Chargement de l'arbre impossible : ${erreur.message}`);

  // Les événements sont indexés par personne puis par type : une même personne
  // peut avoir plusieurs professions ou résidences successives.
  const parPersonne = new Map<string, LigneEvenement[]>();
  const parUnion = new Map<string, LigneEvenement[]>();
  for (const e of (evenementsRes.data ?? []) as unknown as (LigneEvenement & {
    personne_id: string | null;
    union_id: string | null;
  })[]) {
    if (e.personne_id) {
      const liste = parPersonne.get(e.personne_id) ?? [];
      liste.push(e);
      parPersonne.set(e.personne_id, liste);
    } else if (e.union_id) {
      const liste = parUnion.get(e.union_id) ?? [];
      liste.push(e);
      parUnion.set(e.union_id, liste);
    }
  }

  const unions = new Map<string, UnionArbre>();
  for (const u of unionsRes.data ?? []) {
    const evts = parUnion.get(u.id) ?? [];
    unions.set(u.id, {
      id: u.id,
      conjointA: u.conjoint_a,
      conjointB: u.conjoint_b,
      enfants: [],
      mariage: resumer(evts.find((e) => e.type === 'mariage')),
    });
  }

  const parents = new Map<string, string[]>();
  const enfants = new Map<string, string[]>();
  const issuDe = new Map<string, string>();

  for (const f of filiationsRes.data ?? []) {
    const union = unions.get(f.union_id);
    if (!union) continue;

    union.enfants.push(f.enfant_id);
    issuDe.set(f.enfant_id, f.union_id);

    const pere = union.conjointA;
    const mere = union.conjointB;
    const listeParents = parents.get(f.enfant_id) ?? [];
    for (const p of [pere, mere]) {
      if (!p) continue;
      listeParents.push(p);
      const listeEnfants = enfants.get(p) ?? [];
      listeEnfants.push(f.enfant_id);
      enfants.set(p, listeEnfants);
    }
    parents.set(f.enfant_id, listeParents);
  }

  const unionsParPersonne = new Map<string, string[]>();
  for (const u of unions.values()) {
    for (const conjoint of [u.conjointA, u.conjointB]) {
      if (!conjoint) continue;
      const liste = unionsParPersonne.get(conjoint) ?? [];
      liste.push(u.id);
      unionsParPersonne.set(conjoint, liste);
    }
  }

  const personnes = new Map<string, PersonneArbre>();
  for (const p of personnesRes.data ?? []) {
    const evts = parPersonne.get(p.id) ?? [];
    const profession = evts.find((e) => e.type === 'profession');

    personnes.set(p.id, {
      id: p.id,
      codeGedcom: p.code_gedcom,
      prenoms: p.prenoms,
      nom: p.nom,
      nomComplet: p.nom_complet?.trim() || p.prenoms || p.nom || 'Inconnu',
      surnom: p.surnom,
      sexe: p.sexe,
      branches: p.branches ?? [],
      niveauxPreuve: p.niveaux_preuve ?? [],
      presumeVivant: p.presume_vivant,
      notes: p.notes,
      photoId: p.photo_id,
      naissance: resumer(evts.find((e) => e.type === 'naissance')),
      deces: resumer(evts.find((e) => e.type === 'deces')),
      profession: profession?.detail ?? null,
      unions: unionsParPersonne.get(p.id) ?? [],
      issuDe: issuDe.get(p.id) ?? null,
    });
  }

  return { personnes, unions, parents, enfants };
}

/**
 * Repère l'enfant autour duquel l'arbre est construit.
 * Le point de départ est nommé plutôt que codé en dur sur un identifiant, pour
 * que l'application reste utilisable si la base est repeuplée.
 */
export function trouverRacine(donnees: DonneesArbre): PersonneArbre | null {
  const candidats = [...donnees.personnes.values()];

  const leo = candidats.find((p) => /\bl[ée]o\b/i.test(p.nomComplet));
  if (leo) return leo;

  // À défaut : la personne la plus récente qui n'a pas de descendance connue.
  const sansEnfant = candidats.filter((p) => (donnees.enfants.get(p.id) ?? []).length === 0);
  return (
    sansEnfant.sort((a, b) => (b.naissance?.annee ?? 0) - (a.naissance?.annee ?? 0))[0] ??
    candidats[0] ??
    null
  );
}
