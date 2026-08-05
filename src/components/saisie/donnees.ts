import { creerClientServeur } from '@/lib/supabase/server';
import { lieuCourt } from '@/lib/arbre';
import { DATE_VIDE, repereDeVie, type ValeursDateSaisie } from '@/lib/saisie-personne';
import type {
  Evenement,
  NiveauPreuve,
  PrecisionDate,
  QualificatifDate,
  Sexe,
} from '@/lib/types-base';

/**
 * Ce qu’il faut charger pour saisir quelqu’un.
 *
 * Une fiche vide se remplit surtout par des liens : un père, une mère, un
 * conjoint, des enfants déjà présents. Il faut donc pouvoir désigner une
 * personne existante sans se tromper — d’où les années de vie accolées à chaque
 * nom, la base comptant plusieurs homonymes exacts.
 *
 * Rien n’est élargi ici : ce que les politiques RLS refusent de renvoyer
 * n’apparaîtra pas dans les listes de choix.
 */

const IDENTIFIANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function estIdentifiant(valeur: string): boolean {
  return IDENTIFIANT.test(valeur);
}

// ---------------------------------------------------------------------------
// Ce que les composants manipulent
// ---------------------------------------------------------------------------

export type OptionPersonne = {
  id: string;
  nomComplet: string;
  /** « 1887 – 1954 · Commune » : jamais un nom seul. */
  repere: string;
  anneeNaissance: number | null;
  anneeDeces: number | null;
  sexe: Sexe;
};

export type OptionUnion = {
  id: string;
  /** « Untel (1887 – 1954) et Unetelle (1890 – 1970) ». */
  libelle: string;
};

export type ValeursPersonne = {
  id: string | null;
  prenoms: string;
  nom: string;
  nomNaissance: string;
  surnom: string;
  sexe: Sexe;
  presumeVivant: boolean;
  naissance: ValeursDateSaisie;
  deces: ValeursDateSaisie;
  profession: string;
  residence: string;
  notes: string;
  preuves: NiveauPreuve[];
  /** Union d’où la personne est issue, si elle est déjà rattachée. */
  unionParents: string;
  pereId: string;
  mereId: string;
  natureFiliation: string;
};

export const PERSONNE_VIDE: ValeursPersonne = {
  id: null,
  prenoms: '',
  nom: '',
  nomNaissance: '',
  surnom: '',
  sexe: 'inconnu',
  presumeVivant: true,
  naissance: DATE_VIDE,
  deces: DATE_VIDE,
  profession: '',
  residence: '',
  notes: '',
  preuves: [],
  unionParents: '',
  pereId: '',
  mereId: '',
  natureFiliation: 'naturelle',
};

/** Les liens déjà écrits, montrés en clair sur la page de modification. */
export type LiensExistants = {
  parents: OptionPersonne[];
  foyers: { id: string; conjoint: OptionPersonne | null; enfants: OptionPersonne[] }[];
};

export type DroitsSaisie = {
  utilisateurId: string | null;
  peutContribuer: boolean;
  estAdmin: boolean;
};

// ---------------------------------------------------------------------------
// Droits
// ---------------------------------------------------------------------------

/**
 * On interroge la base plutôt que de recopier sa logique : `peut_contribuer`
 * et `est_admin` font foi, ici comme dans les politiques RLS.
 */
export async function lireDroitsSaisie(): Promise<DroitsSaisie> {
  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { utilisateurId: null, peutContribuer: false, estAdmin: false };

  const [contribution, administration] = await Promise.all([
    supabase.rpc('peut_contribuer'),
    supabase.rpc('est_admin'),
  ]);

  return {
    utilisateurId: user.id,
    peutContribuer: contribution.data === true,
    estAdmin: administration.data === true,
  };
}

// ---------------------------------------------------------------------------
// Listes de choix
// ---------------------------------------------------------------------------

type LigneVie = {
  personne_id: string | null;
  type: string;
  annee: number | null;
  lieux: { libelle: string } | null;
};

function nomLisible(p: {
  nom_complet: string | null;
  prenoms: string | null;
  nom: string | null;
}): string {
  return p.nom_complet?.trim() || p.prenoms || p.nom || 'Personne sans nom';
}

/**
 * Toutes les personnes que l’on peut désigner, avec de quoi les distinguer.
 * Une centaine de lignes : la recherche se fait dans le navigateur, sans
 * aller-retour, ce qui la rend instantanée au clavier.
 */
export async function chargerPersonnesChoisissables(): Promise<OptionPersonne[]> {
  const supabase = await creerClientServeur();

  const [personnesRes, viesRes] = await Promise.all([
    supabase.from('personnes').select('id, nom_complet, prenoms, nom, sexe'),
    supabase
      .from('evenements')
      .select('personne_id, type, annee, lieux(libelle)')
      .in('type', ['naissance', 'deces']),
  ]);

  const vies = (viesRes.data ?? []) as unknown as LigneVie[];

  const naissances = new Map<string, LigneVie>();
  const deces = new Map<string, LigneVie>();
  for (const v of vies) {
    if (!v.personne_id) continue;
    if (v.type === 'naissance' && !naissances.has(v.personne_id)) naissances.set(v.personne_id, v);
    if (v.type === 'deces' && !deces.has(v.personne_id)) deces.set(v.personne_id, v);
  }

  return (personnesRes.data ?? [])
    .map((p) => {
      const naissance = naissances.get(p.id) ?? null;
      const mort = deces.get(p.id) ?? null;
      return {
        id: p.id,
        nomComplet: nomLisible(p),
        repere: repereDeVie(
          naissance?.annee ?? null,
          mort?.annee ?? null,
          p.sexe,
          lieuCourt(naissance?.lieux?.libelle ?? null)
        ),
        anneeNaissance: naissance?.annee ?? null,
        anneeDeces: mort?.annee ?? null,
        sexe: p.sexe,
      };
    })
    .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet, 'fr'));
}

/**
 * Les unions déjà enregistrées, nommées par leurs conjoints. Rattacher un
 * enfant à une union existante vaut mieux que d’en créer une seconde à côté.
 */
export async function chargerUnions(personnes: OptionPersonne[]): Promise<OptionUnion[]> {
  const supabase = await creerClientServeur();
  const { data } = await supabase.from('unions').select('id, conjoint_a, conjoint_b');

  const parId = new Map(personnes.map((p) => [p.id, p]));
  const nommer = (id: string | null): string | null => {
    if (!id) return null;
    const p = parId.get(id);
    return p ? `${p.nomComplet} (${p.repere})` : null;
  };

  return (data ?? [])
    .map((u) => {
      const a = nommer(u.conjoint_a);
      const b = nommer(u.conjoint_b);
      const libelle = [a, b].filter(Boolean).join(' et ');
      return { id: u.id, libelle: libelle || 'Union sans conjoint connu' };
    })
    .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
}

/** Les lieux déjà écrits, proposés en suggestion pour éviter les doublons. */
export async function chargerLibellesLieux(): Promise<string[]> {
  const supabase = await creerClientServeur();
  const { data } = await supabase.from('lieux').select('libelle').order('libelle');
  return [...new Set((data ?? []).map((l) => l.libelle))];
}

// ---------------------------------------------------------------------------
// Reprise d’une fiche existante
// ---------------------------------------------------------------------------

type LigneEvenement = Pick<
  Evenement,
  'id' | 'type' | 'annee' | 'mois' | 'jour' | 'qualificatif' | 'precision_date' | 'detail' | 'lieu_id'
> & { lieux: { libelle: string } | null };

function versValeursDate(e: LigneEvenement | undefined): ValeursDateSaisie {
  if (!e) return DATE_VIDE;
  return {
    qualificatif: precisionConnue(e.qualificatif),
    precision: precisionSaisie(e.precision_date, e.annee),
    annee: e.annee === null ? '' : String(e.annee),
    mois: e.mois === null ? '' : String(e.mois),
    jour: e.jour === null ? '' : String(e.jour),
    lieu: e.lieux?.libelle ?? '',
  };
}

/** La base connaît « entre », « depuis », « jusqu’à » ; le formulaire, non. */
function precisionConnue(q: QualificatifDate): ValeursDateSaisie['qualificatif'] {
  return q === 'vers' || q === 'avant' || q === 'apres' ? q : 'exacte';
}

/** Une décennie ou un siècle importés se ramènent à l’année qu’on en connaît. */
function precisionSaisie(p: PrecisionDate, annee: number | null): ValeursDateSaisie['precision'] {
  if (annee === null) return 'inconnue';
  if (p === 'jour' || p === 'mois') return p;
  return 'annee';
}

/**
 * Une fiche existante, rendue au format du formulaire. Tout ce qui est déjà
 * écrit revient en valeur initiale : on corrige, on n’écrit pas deux fois.
 */
export async function chargerValeursPersonne(id: string): Promise<ValeursPersonne | null> {
  if (!estIdentifiant(id)) return null;

  const supabase = await creerClientServeur();

  const { data: personne } = await supabase
    .from('personnes')
    .select('id, prenoms, nom, nom_naissance, surnom, sexe, notes, niveaux_preuve, presume_vivant')
    .eq('id', id)
    .maybeSingle();

  if (!personne) return null;

  const [evenementsRes, filiationRes] = await Promise.all([
    supabase
      .from('evenements')
      .select('id, type, annee, mois, jour, qualificatif, precision_date, detail, lieu_id, lieux(libelle)')
      .eq('personne_id', id)
      .in('type', ['naissance', 'deces', 'profession', 'residence']),
    supabase.from('filiations').select('union_id').eq('enfant_id', id).maybeSingle(),
  ]);

  const evenements = (evenementsRes.data ?? []) as unknown as LigneEvenement[];
  const naissance = evenements.find((e) => e.type === 'naissance');
  const deces = evenements.find((e) => e.type === 'deces');
  const profession = evenements.find((e) => e.type === 'profession');
  const residence = evenements.find((e) => e.type === 'residence');

  const unionParents = filiationRes.data?.union_id ?? '';
  let pereId = '';
  let mereId = '';
  if (unionParents) {
    const { data: union } = await supabase
      .from('unions')
      .select('conjoint_a, conjoint_b')
      .eq('id', unionParents)
      .maybeSingle();
    pereId = union?.conjoint_a ?? '';
    mereId = union?.conjoint_b ?? '';
  }

  return {
    id: personne.id,
    prenoms: personne.prenoms ?? '',
    nom: personne.nom ?? '',
    nomNaissance: personne.nom_naissance ?? '',
    surnom: personne.surnom ?? '',
    sexe: personne.sexe,
    presumeVivant: personne.presume_vivant,
    naissance: versValeursDate(naissance),
    deces: versValeursDate(deces),
    profession: profession?.detail ?? '',
    residence: residence?.lieux?.libelle ?? residence?.detail ?? '',
    notes: personne.notes ?? '',
    preuves: personne.niveaux_preuve ?? [],
    unionParents,
    pereId,
    mereId,
    natureFiliation: 'naturelle',
  };
}

/** Les liens déjà en place, pour les montrer plutôt que de les redemander. */
export async function chargerLiensExistants(
  id: string,
  personnes: OptionPersonne[]
): Promise<LiensExistants> {
  const vide: LiensExistants = { parents: [], foyers: [] };
  if (!estIdentifiant(id)) return vide;

  const supabase = await creerClientServeur();
  const parId = new Map(personnes.map((p) => [p.id, p]));

  const [foyersRes, filiationRes] = await Promise.all([
    supabase.from('unions').select('id, conjoint_a, conjoint_b').or(`conjoint_a.eq.${id},conjoint_b.eq.${id}`),
    supabase.from('filiations').select('union_id').eq('enfant_id', id).maybeSingle(),
  ]);

  const foyersBruts = foyersRes.data ?? [];
  const idsFoyers = foyersBruts.map((u) => u.id);

  const [enfantsRes, unionParentaleRes] = await Promise.all([
    idsFoyers.length
      ? supabase.from('filiations').select('union_id, enfant_id').in('union_id', idsFoyers)
      : Promise.resolve({ data: [] as { union_id: string; enfant_id: string }[] }),
    filiationRes.data?.union_id
      ? supabase
          .from('unions')
          .select('conjoint_a, conjoint_b')
          .eq('id', filiationRes.data.union_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const enfantsParFoyer = new Map<string, OptionPersonne[]>();
  for (const f of enfantsRes.data ?? []) {
    const enfant = parId.get(f.enfant_id);
    if (!enfant) continue;
    const liste = enfantsParFoyer.get(f.union_id) ?? [];
    liste.push(enfant);
    enfantsParFoyer.set(f.union_id, liste);
  }

  const parents = [unionParentaleRes.data?.conjoint_a, unionParentaleRes.data?.conjoint_b]
    .map((p) => (p ? parId.get(p) : undefined))
    .filter((p): p is OptionPersonne => p !== undefined);

  return {
    parents,
    foyers: foyersBruts.map((u) => {
      const autre = u.conjoint_a === id ? u.conjoint_b : u.conjoint_a;
      return {
        id: u.id,
        conjoint: (autre ? parId.get(autre) : undefined) ?? null,
        enfants: enfantsParFoyer.get(u.id) ?? [],
      };
    }),
  };
}

/**
 * Ce qu’une suppression romprait, compté avant de la proposer. Un chiffre
 * dissuade mieux qu’un avertissement général.
 */
export type LiensRompus = {
  parents: number;
  unions: number;
  enfants: number;
  evenements: number;
  souvenirs: number;
  photos: number;
};

export async function compterLiensRompus(id: string): Promise<LiensRompus> {
  const vide: LiensRompus = { parents: 0, unions: 0, enfants: 0, evenements: 0, souvenirs: 0, photos: 0 };
  if (!estIdentifiant(id)) return vide;

  const supabase = await creerClientServeur();

  const [filiationRes, unionsRes, evenementsRes, souvenirsRes, mediasRes] = await Promise.all([
    supabase.from('filiations').select('union_id').eq('enfant_id', id),
    supabase.from('unions').select('id').or(`conjoint_a.eq.${id},conjoint_b.eq.${id}`),
    supabase.from('evenements').select('id').eq('personne_id', id),
    supabase.from('souvenirs_personnes').select('souvenir_id').eq('personne_id', id),
    supabase.from('medias_personnes').select('media_id').eq('personne_id', id),
  ]);

  const idsFoyers = (unionsRes.data ?? []).map((u) => u.id);
  const { data: enfants } = idsFoyers.length
    ? await supabase.from('filiations').select('enfant_id').in('union_id', idsFoyers)
    : { data: [] as { enfant_id: string }[] };

  return {
    parents: (filiationRes.data ?? []).length,
    unions: idsFoyers.length,
    enfants: (enfants ?? []).length,
    evenements: (evenementsRes.data ?? []).length,
    souvenirs: (souvenirsRes.data ?? []).length,
    photos: (mediasRes.data ?? []).length,
  };
}
