import { creerClientServeur } from '@/lib/supabase/server';
import type { Recit, Sexe, StatutModeration } from '@/lib/types-base';

/**
 * Récits de famille — chargement et mise en forme.
 *
 * Un récit se distingue du souvenir : plus long, écrit en Markdown, rattaché à
 * une famille (patronyme) ou à un thème libre. On y raconte l'histoire d'un
 * couple, d'une maison, d'un métier — quelque chose qui traverse plusieurs
 * personnes. Un souvenir tient sur une anecdote, un récit sur un chapitre.
 */

type ClientServeur = Awaited<ReturnType<typeof creerClientServeur>>;

// ---------------------------------------------------------------------------
// Formes exposées
// ---------------------------------------------------------------------------

export type PersonneCitee = {
  id: string;
  nomComplet: string;
  surnom: string | null;
  sexe: Sexe;
  branches: string[];
  presumeVivant: boolean;
  anneeNaissance: number | null;
  anneeDeces: number | null;
  lieuNaissance: string | null;
};

export type RecitResume = {
  id: string;
  patronyme: string | null;
  theme: string | null;
  branche: string | null;
  titre: string;
  chapeau: string | null;
  anneeDebut: number | null;
  anneeFin: number | null;
  /** « 1920 – 1960 », « depuis 1920 », « jusqu’à 1960 », ou rien. */
  periode: string | null;
  auteurId: string;
  auteur: string;
  statut: StatutModeration;
  epingle: boolean;
  creeLe: string;
  modifieLe: string;
  nombrePersonnes: number;
  personnes: PersonneCitee[];
};

export type RecitDetail = RecitResume & {
  corps: string;
};

/** Regroupement d'une famille : combien de récits sont écrits sous ce patronyme. */
export type ChoixFamille = {
  patronyme: string;
  nombre: number;
};

export type Droits = {
  utilisateurId: string | null;
  peutContribuer: boolean;
  estAdmin: boolean;
};

// ---------------------------------------------------------------------------
// Mise en forme
// ---------------------------------------------------------------------------

/** « 1920 – 1960 », « depuis 1920 », « jusqu’à 1960 » ou `null`. */
export function formaterPeriode(debut: number | null, fin: number | null): string | null {
  if (debut !== null && fin !== null) {
    if (debut === fin) return String(debut);
    return `${debut} – ${fin}`;
  }
  if (debut !== null) return `depuis ${debut}`;
  if (fin !== null) return `jusqu’à ${fin}`;
  return null;
}

/** « 12 février 2026 » : la date de dépôt du récit. */
export function formaterHorodatage(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

function nomLisible(p: {
  nom_complet: string | null;
  prenoms: string | null;
  nom: string | null;
}): string {
  return p.nom_complet?.trim() || p.prenoms || p.nom || 'Inconnu';
}

// ---------------------------------------------------------------------------
// Requêtes internes
// ---------------------------------------------------------------------------

const CHAMPS_RECIT = `
  id, patronyme, theme, branche, titre, chapeau, corps,
  annee_debut, annee_fin, auteur_id, statut, epingle, cree_le, modifie_le,
  recits_personnes(personne_id)
` as const;

type LigneRecit = Recit & {
  recits_personnes: { personne_id: string }[] | null;
};

async function nomsMembres(supabase: ClientServeur, ids: string[]): Promise<Map<string, string>> {
  const noms = new Map<string, string>();
  const uniques = [...new Set(ids)];
  if (uniques.length === 0) return noms;

  const { data } = await supabase.from('membres').select('id, nom_affiche').in('id', uniques);
  for (const m of data ?? []) noms.set(m.id, m.nom_affiche);
  return noms;
}

async function chargerPersonnesCitees(
  supabase: ClientServeur,
  ids: string[]
): Promise<Map<string, PersonneCitee>> {
  const carte = new Map<string, PersonneCitee>();
  const uniques = [...new Set(ids)];
  if (uniques.length === 0) return carte;

  const [personnesRes, evenementsRes] = await Promise.all([
    supabase
      .from('personnes')
      .select('id, nom_complet, prenoms, nom, surnom, sexe, branches, presume_vivant')
      .in('id', uniques),
    supabase
      .from('evenements')
      .select('personne_id, type, annee, lieux(libelle)')
      .in('type', ['naissance', 'deces'])
      .in('personne_id', uniques),
  ]);

  type LigneAnniv = {
    personne_id: string | null;
    type: string;
    annee: number | null;
    lieux: { libelle: string } | null;
  };

  const parPersonne = new Map<string, LigneAnniv[]>();
  for (const e of (evenementsRes.data ?? []) as unknown as LigneAnniv[]) {
    if (!e.personne_id) continue;
    const liste = parPersonne.get(e.personne_id) ?? [];
    liste.push(e);
    parPersonne.set(e.personne_id, liste);
  }

  for (const p of personnesRes.data ?? []) {
    const evts = parPersonne.get(p.id) ?? [];
    const naissance = evts.find((e) => e.type === 'naissance');
    const deces = evts.find((e) => e.type === 'deces');
    const lieuBrut = naissance?.lieux?.libelle ?? null;
    carte.set(p.id, {
      id: p.id,
      nomComplet: nomLisible(p),
      surnom: p.surnom,
      sexe: p.sexe,
      branches: p.branches ?? [],
      presumeVivant: p.presume_vivant,
      anneeNaissance: naissance?.annee ?? null,
      anneeDeces: deces?.annee ?? null,
      lieuNaissance: lieuBrut ? lieuBrut.split(',')[0]?.trim() ?? lieuBrut : null,
    });
  }

  return carte;
}

function assembler(
  ligne: LigneRecit,
  auteurs: Map<string, string>,
  personnes: Map<string, PersonneCitee>
): RecitResume {
  const idsCites = (ligne.recits_personnes ?? []).map((l) => l.personne_id);
  const citees = idsCites
    .map((id) => personnes.get(id))
    .filter((p): p is PersonneCitee => Boolean(p))
    .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet, 'fr'));

  return {
    id: ligne.id,
    patronyme: ligne.patronyme,
    theme: ligne.theme,
    branche: ligne.branche,
    titre: ligne.titre,
    chapeau: ligne.chapeau,
    anneeDebut: ligne.annee_debut,
    anneeFin: ligne.annee_fin,
    periode: formaterPeriode(ligne.annee_debut, ligne.annee_fin),
    auteurId: ligne.auteur_id,
    auteur: auteurs.get(ligne.auteur_id) ?? 'Un membre de la famille',
    statut: ligne.statut,
    epingle: ligne.epingle,
    creeLe: ligne.cree_le,
    modifieLe: ligne.modifie_le,
    nombrePersonnes: idsCites.length,
    personnes: citees,
  };
}

// ---------------------------------------------------------------------------
// Droits
// ---------------------------------------------------------------------------

export async function lireDroits(): Promise<Droits> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
// Chargement
// ---------------------------------------------------------------------------

/**
 * Tous les récits, filtrés éventuellement sur un patronyme. Les épinglés en
 * tête, puis du plus récent au plus ancien. Les récits sans période trient au
 * fil du dépôt : rien ne prime le classement chronologique quand il existe.
 */
export async function chargerRecits(
  patronyme: string | null = null
): Promise<RecitResume[]> {
  const supabase = await creerClientServeur();

  let requete = supabase.from('recits').select(CHAMPS_RECIT);
  if (patronyme !== null) requete = requete.eq('patronyme', patronyme);

  const { data, error } = await requete
    .order('epingle', { ascending: false })
    .order('annee_debut', { ascending: false, nullsFirst: false })
    .order('cree_le', { ascending: false });

  if (error) throw new Error(`Chargement des récits impossible : ${error.message}`);

  const lignes = (data ?? []) as unknown as LigneRecit[];
  if (lignes.length === 0) return [];

  const [auteurs, personnes] = await Promise.all([
    nomsMembres(supabase, lignes.map((l) => l.auteur_id)),
    chargerPersonnesCitees(
      supabase,
      lignes.flatMap((l) => (l.recits_personnes ?? []).map((p) => p.personne_id))
    ),
  ]);

  return lignes.map((l) => assembler(l, auteurs, personnes));
}

/** Un récit précis, corps compris. */
export async function chargerRecit(id: string): Promise<RecitDetail | null> {
  const supabase = await creerClientServeur();

  const { data, error } = await supabase
    .from('recits')
    .select(CHAMPS_RECIT)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  const ligne = data as unknown as LigneRecit;

  const [auteurs, personnes] = await Promise.all([
    nomsMembres(supabase, [ligne.auteur_id]),
    chargerPersonnesCitees(
      supabase,
      (ligne.recits_personnes ?? []).map((p) => p.personne_id)
    ),
  ]);

  const resume = assembler(ligne, auteurs, personnes);
  return { ...resume, corps: ligne.corps };
}

/**
 * Les récits qui bordent celui-ci au sein de la même famille, pour que la
 * lecture se prolonge sans revenir à la liste. Renvoyé quand il en existe, ce
 * qui n'est pas garanti — un récit thématique peut être seul.
 */
export async function chargerVoisins(
  id: string,
  patronyme: string | null
): Promise<{ precedent: RecitResume | null; suivant: RecitResume | null }> {
  if (patronyme === null) return { precedent: null, suivant: null };

  const liste = await chargerRecits(patronyme);
  const index = liste.findIndex((r) => r.id === id);
  if (index === -1) return { precedent: null, suivant: null };

  return {
    precedent: liste[index - 1] ?? null,
    suivant: liste[index + 1] ?? null,
  };
}

/**
 * Les patronymes retenus, avec le compte de récits associés. Un patronyme sans
 * récit — la famille attend son premier — apparaît aussi si on a demandé tous
 * les patronymes de la base.
 */
export async function chargerChoixFamilles(): Promise<ChoixFamille[]> {
  const supabase = await creerClientServeur();

  const { data } = await supabase.from('recits').select('patronyme');
  const totaux = new Map<string, number>();
  for (const ligne of data ?? []) {
    const cle = ligne.patronyme?.trim();
    if (!cle) continue;
    totaux.set(cle, (totaux.get(cle) ?? 0) + 1);
  }

  return [...totaux.entries()]
    .map(([patronyme, nombre]) => ({ patronyme, nombre }))
    .sort((a, b) => a.patronyme.localeCompare(b.patronyme, 'fr'));
}

/**
 * Les patronymes vus dans la table `personnes` : sert au sélecteur du
 * formulaire de dépôt, pour qu'on choisisse une famille existante plutôt que
 * de retaper une chaîne. Renvoyé trié.
 */
export async function chargerPatronymesConnus(): Promise<string[]> {
  const supabase = await creerClientServeur();
  const { data } = await supabase.from('personnes').select('nom');
  const uniques = new Set<string>();
  for (const p of data ?? []) {
    const nom = p.nom?.trim();
    if (nom) uniques.add(nom);
  }
  return [...uniques].sort((a, b) => a.localeCompare(b, 'fr'));
}

/**
 * Les personnes de l'arbre, sous une forme prête pour le sélecteur du
 * formulaire — assez de contexte pour reconnaître un homonyme d'un coup d'œil.
 */
export async function chargerPortraitsMentionnables(): Promise<PersonneCitee[]> {
  const supabase = await creerClientServeur();

  const [personnesRes, evenementsRes] = await Promise.all([
    supabase
      .from('personnes')
      .select('id, nom_complet, prenoms, nom, surnom, sexe, branches, presume_vivant'),
    supabase
      .from('evenements')
      .select('personne_id, type, annee, lieux(libelle)')
      .in('type', ['naissance', 'deces'])
      .not('personne_id', 'is', null),
  ]);

  type LigneAnniv = {
    personne_id: string | null;
    type: string;
    annee: number | null;
    lieux: { libelle: string } | null;
  };

  const parPersonne = new Map<string, LigneAnniv[]>();
  for (const e of (evenementsRes.data ?? []) as unknown as LigneAnniv[]) {
    if (!e.personne_id) continue;
    const liste = parPersonne.get(e.personne_id) ?? [];
    liste.push(e);
    parPersonne.set(e.personne_id, liste);
  }

  return (personnesRes.data ?? [])
    .map((p) => {
      const evts = parPersonne.get(p.id) ?? [];
      const naissance = evts.find((e) => e.type === 'naissance');
      const deces = evts.find((e) => e.type === 'deces');
      const lieuBrut = naissance?.lieux?.libelle ?? null;
      return {
        id: p.id,
        nomComplet: nomLisible(p),
        surnom: p.surnom,
        sexe: p.sexe,
        branches: p.branches ?? [],
        presumeVivant: p.presume_vivant,
        anneeNaissance: naissance?.annee ?? null,
        anneeDeces: deces?.annee ?? null,
        lieuNaissance: lieuBrut ? lieuBrut.split(',')[0]?.trim() ?? lieuBrut : null,
      };
    })
    .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet, 'fr'));
}

/**
 * Les récits qui citent explicitement une personne, du plus récent au plus
 * ancien. Sert à la section « Récits qui la mentionnent » de la fiche.
 */
export async function chargerRecitsPourPersonne(
  personneId: string
): Promise<RecitResume[]> {
  const supabase = await creerClientServeur();

  const { data: liens } = await supabase
    .from('recits_personnes')
    .select('recit_id')
    .eq('personne_id', personneId);

  const ids = (liens ?? []).map((l) => l.recit_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('recits')
    .select(CHAMPS_RECIT)
    .in('id', ids)
    .order('epingle', { ascending: false })
    .order('annee_debut', { ascending: false, nullsFirst: false })
    .order('cree_le', { ascending: false });

  if (error) return [];
  const lignes = (data ?? []) as unknown as LigneRecit[];
  if (lignes.length === 0) return [];

  const [auteurs, personnes] = await Promise.all([
    nomsMembres(supabase, lignes.map((l) => l.auteur_id)),
    chargerPersonnesCitees(
      supabase,
      lignes.flatMap((l) => (l.recits_personnes ?? []).map((p) => p.personne_id))
    ),
  ]);

  return lignes.map((l) => assembler(l, auteurs, personnes));
}
