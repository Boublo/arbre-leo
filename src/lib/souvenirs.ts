import { creerClientServeur } from '@/lib/supabase/server';
import { formaterDate, lieuCourt } from '@/lib/arbre';
import { BUCKET_MEDIAS } from '@/lib/souvenirs-partage';
import type { PrecisionDate, StatutModeration } from '@/lib/types-base';

/**
 * Chargement des souvenirs.
 *
 * Un souvenir n’est pas un acte : il n’a ni cote ni registre. Il a un récit,
 * une date souvent floue, un lieu parfois introuvable au cadastre, et des
 * visages. Tout est donc facultatif sauf le titre et le récit.
 *
 * Les photos vivent dans un bucket privé : rien ne s’affiche sans URL signée.
 */

/** Une heure : le temps d’une visite, pas davantage. */
const DUREE_SIGNATURE = 60 * 60;

/** Au-delà, le mur devient illisible et la page lourde ; les filtres sont là pour ça. */
const LIMITE_MUR = 200;

type ClientServeur = Awaited<ReturnType<typeof creerClientServeur>>;

export type PhotoSouvenir = {
  id: string;
  chemin: string;
  titre: string | null;
  largeur: number | null;
  hauteur: number | null;
  /** URL signée, valable une heure. Nulle si la signature a échoué. */
  url: string | null;
};

export type PersonneMentionnee = { id: string; nomComplet: string };

export type CommentaireSouvenir = {
  id: string;
  texte: string;
  auteurId: string;
  auteur: string;
  creeLe: string;
};

export type SouvenirResume = {
  id: string;
  titre: string;
  recit: string;
  /** Date mise en forme : « 8 mars 1993 », « mars 1993 », « années 1960 ». */
  date: string;
  annee: number | null;
  lieu: string | null;
  lieuBref: string | null;
  epingle: boolean;
  statut: StatutModeration;
  auteurId: string;
  auteur: string;
  creeLe: string;
  personnes: PersonneMentionnee[];
  /** Les premières photos seulement, pour la vignette du mur. */
  photos: PhotoSouvenir[];
  nombrePhotos: number;
};

export type SouvenirDetail = SouvenirResume & {
  mois: number | null;
  jour: number | null;
  dateTexte: string | null;
  precisionDate: PrecisionDate;
  lieuId: string | null;
  lieuLibre: string | null;
  modifieLe: string;
  commentaires: CommentaireSouvenir[];
};

export type FiltresSouvenirs = {
  personneId?: string | null;
  anneeDebut?: number | null;
  anneeFin?: number | null;
};

/** Ce que la base autorise pour l’utilisateur courant, demandé à la base elle-même. */
export type Droits = {
  utilisateurId: string | null;
  peutContribuer: boolean;
  estAdmin: boolean;
};

// ---------------------------------------------------------------------------
// Mise en forme
// ---------------------------------------------------------------------------

/**
 * « 8 mars 1993 », « mars 1993 », « 1993 », « années 1960 ».
 * Les deux dernières précisions échappent à `formaterDate` : une décennie ne
 * se dit pas comme une année.
 */
export function formaterDateSouvenir(s: {
  annee: number | null;
  mois: number | null;
  jour: number | null;
  date_texte: string | null;
  precision_date: PrecisionDate;
}): string {
  if (s.annee !== null && s.precision_date === 'decennie') {
    return `années ${Math.floor(s.annee / 10) * 10}`;
  }
  if (s.annee !== null && s.precision_date === 'siecle') {
    return `${Math.floor((s.annee - 1) / 100) + 1}e siècle`;
  }
  return formaterDate({
    annee: s.annee,
    mois: s.mois,
    jour: s.jour,
    date_texte: s.date_texte,
  });
}

/** Coupe au dernier point avant la limite, pour ne pas trancher une phrase. */
export function extraitRecit(texte: string, max = 260): string {
  const propre = texte.trim();
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  const dernierPoint = coupe.lastIndexOf('.');
  return `${dernierPoint > max * 0.5 ? coupe.slice(0, dernierPoint + 1) : coupe}…`;
}

/** « 12 février 2026 » : la date de dépôt, qui elle est toujours connue. */
export function formaterHorodatage(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

function nomLisible(p: { nom_complet: string | null; prenoms: string | null; nom: string | null }): string {
  return p.nom_complet?.trim() || p.prenoms || p.nom || 'Inconnu';
}

// ---------------------------------------------------------------------------
// Lignes brutes
// ---------------------------------------------------------------------------

const CHAMPS_SOUVENIR = `
  id, titre, recit, annee, mois, jour, date_texte, precision_date,
  lieu_id, lieu_libre, statut, epingle, auteur_id, cree_le, modifie_le,
  lieux(libelle),
  souvenirs_personnes(personne_id),
  souvenirs_medias(ordre, medias(id, chemin, titre, largeur, hauteur))
`;

type LigneMedia = {
  id: string;
  chemin: string;
  titre: string | null;
  largeur: number | null;
  hauteur: number | null;
};

type LigneSouvenir = {
  id: string;
  titre: string;
  recit: string;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  date_texte: string | null;
  precision_date: PrecisionDate;
  lieu_id: string | null;
  lieu_libre: string | null;
  statut: StatutModeration;
  epingle: boolean;
  auteur_id: string;
  cree_le: string;
  modifie_le: string;
  lieux: { libelle: string } | null;
  souvenirs_personnes: { personne_id: string }[];
  souvenirs_medias: { ordre: number; medias: LigneMedia | null }[];
};

/** Les photos d’un souvenir, dans l’ordre voulu par celui qui l’a déposé. */
function mediasOrdonnes(ligne: LigneSouvenir): LigneMedia[] {
  return [...(ligne.souvenirs_medias ?? [])]
    .sort((a, b) => a.ordre - b.ordre)
    .map((l) => l.medias)
    .filter((m): m is LigneMedia => m !== null);
}

// ---------------------------------------------------------------------------
// Fragments partagés
// ---------------------------------------------------------------------------

/**
 * Signe une volée de chemins d’un coup.
 * `getPublicUrl` ne donnerait rien : le bucket est privé.
 */
export async function signerMedias(
  supabase: ClientServeur,
  chemins: string[],
  secondes = DUREE_SIGNATURE
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const uniques = [...new Set(chemins)];
  if (uniques.length === 0) return urls;

  const { data } = await supabase.storage.from(BUCKET_MEDIAS).createSignedUrls(uniques, secondes);
  for (const entree of data ?? []) {
    if (entree.path && entree.signedUrl) urls.set(entree.path, entree.signedUrl);
  }
  return urls;
}

/** Le nom d’affichage des membres : `auteur_id` pointe sur `auth.users`, pas sur `membres`. */
async function nomsMembres(supabase: ClientServeur, ids: string[]): Promise<Map<string, string>> {
  const noms = new Map<string, string>();
  const uniques = [...new Set(ids)];
  if (uniques.length === 0) return noms;

  const { data } = await supabase.from('membres').select('id, nom_affiche').in('id', uniques);
  for (const m of data ?? []) noms.set(m.id, m.nom_affiche);
  return noms;
}

async function nomsPersonnes(supabase: ClientServeur, ids: string[]): Promise<Map<string, string>> {
  const noms = new Map<string, string>();
  const uniques = [...new Set(ids)];
  if (uniques.length === 0) return noms;

  const { data } = await supabase
    .from('personnes')
    .select('id, nom_complet, prenoms, nom')
    .in('id', uniques);
  for (const p of data ?? []) noms.set(p.id, nomLisible(p));
  return noms;
}

function assembler(
  ligne: LigneSouvenir,
  auteurs: Map<string, string>,
  personnes: Map<string, string>,
  urls: Map<string, string>,
  limitePhotos: number
): SouvenirResume {
  const medias = mediasOrdonnes(ligne);
  const lieu = ligne.lieux?.libelle ?? ligne.lieu_libre ?? null;

  return {
    id: ligne.id,
    titre: ligne.titre,
    recit: ligne.recit,
    date: formaterDateSouvenir(ligne),
    annee: ligne.annee,
    lieu,
    lieuBref: lieuCourt(lieu),
    epingle: ligne.epingle,
    statut: ligne.statut,
    auteurId: ligne.auteur_id,
    auteur: auteurs.get(ligne.auteur_id) ?? 'Un membre de la famille',
    creeLe: ligne.cree_le,
    personnes: (ligne.souvenirs_personnes ?? [])
      .map((l) => ({ id: l.personne_id, nomComplet: personnes.get(l.personne_id) ?? 'Inconnu' }))
      .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet, 'fr')),
    photos: medias.slice(0, limitePhotos).map((m) => ({
      id: m.id,
      chemin: m.chemin,
      titre: m.titre,
      largeur: m.largeur,
      hauteur: m.hauteur,
      url: urls.get(m.chemin) ?? null,
    })),
    nombrePhotos: medias.length,
  };
}

// ---------------------------------------------------------------------------
// Droits
// ---------------------------------------------------------------------------

/**
 * On interroge la base plutôt que de recopier sa logique : `peut_contribuer`
 * et `est_admin` font foi, ici comme dans les politiques RLS.
 */
export async function lireDroits(): Promise<Droits> {
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
// Chargement
// ---------------------------------------------------------------------------

/**
 * Le mur : les souvenirs épinglés d’abord, puis du plus récent événement au
 * plus ancien. Les souvenirs sans date ferment la marche, classés par dépôt.
 */
export async function chargerSouvenirs(filtres: FiltresSouvenirs = {}): Promise<SouvenirResume[]> {
  const supabase = await creerClientServeur();

  // Filtrer sur une personne demande un détour : la jointure `!inner` amputerait
  // la liste des personnes mentionnées que l’on veut afficher en entier.
  let identifiants: string[] | null = null;
  if (filtres.personneId) {
    const { data } = await supabase
      .from('souvenirs_personnes')
      .select('souvenir_id')
      .eq('personne_id', filtres.personneId);
    identifiants = (data ?? []).map((l) => l.souvenir_id);
    if (identifiants.length === 0) return [];
  }

  let requete = supabase.from('souvenirs').select(CHAMPS_SOUVENIR);
  if (identifiants) requete = requete.in('id', identifiants);
  if (filtres.anneeDebut != null) requete = requete.gte('annee', filtres.anneeDebut);
  if (filtres.anneeFin != null) requete = requete.lte('annee', filtres.anneeFin);

  const { data, error } = await requete
    .order('epingle', { ascending: false })
    .order('date_tri', { ascending: false, nullsFirst: false })
    .order('cree_le', { ascending: false })
    .limit(LIMITE_MUR);

  if (error) throw new Error(`Chargement des souvenirs impossible : ${error.message}`);

  const lignes = (data ?? []) as unknown as LigneSouvenir[];
  if (lignes.length === 0) return [];

  // Trois vignettes suffisent au mur : inutile de signer tout un album.
  const chemins = lignes.flatMap((l) => mediasOrdonnes(l).slice(0, 3).map((m) => m.chemin));

  const [auteurs, personnes, urls] = await Promise.all([
    nomsMembres(supabase, lignes.map((l) => l.auteur_id)),
    nomsPersonnes(supabase, lignes.flatMap((l) => (l.souvenirs_personnes ?? []).map((p) => p.personne_id))),
    signerMedias(supabase, chemins),
  ]);

  return lignes.map((l) => assembler(l, auteurs, personnes, urls, 3));
}

/** La fiche entière : toutes les photos, tous les commentaires. */
export async function chargerSouvenir(id: string): Promise<SouvenirDetail | null> {
  const supabase = await creerClientServeur();

  const { data, error } = await supabase
    .from('souvenirs')
    .select(CHAMPS_SOUVENIR)
    .eq('id', id)
    .maybeSingle();

  // Une ligne masquée par RLS ne remonte pas : le « introuvable » est alors
  // la bonne réponse, et la seule qu’on ait le droit de donner.
  if (error || !data) return null;
  const ligne = data as unknown as LigneSouvenir;

  const { data: lignesCommentaires } = await supabase
    .from('commentaires')
    .select('id, texte, auteur_id, cree_le')
    .eq('souvenir_id', id)
    .order('cree_le', { ascending: true });

  const commentaires = lignesCommentaires ?? [];

  const [auteurs, personnes, urls] = await Promise.all([
    nomsMembres(supabase, [ligne.auteur_id, ...commentaires.map((c) => c.auteur_id)]),
    nomsPersonnes(supabase, (ligne.souvenirs_personnes ?? []).map((p) => p.personne_id)),
    signerMedias(supabase, mediasOrdonnes(ligne).map((m) => m.chemin)),
  ]);

  const resume = assembler(ligne, auteurs, personnes, urls, Number.POSITIVE_INFINITY);

  return {
    ...resume,
    mois: ligne.mois,
    jour: ligne.jour,
    dateTexte: ligne.date_texte,
    precisionDate: ligne.precision_date,
    lieuId: ligne.lieu_id,
    lieuLibre: ligne.lieu_libre,
    modifieLe: ligne.modifie_le,
    commentaires: commentaires.map((c) => ({
      id: c.id,
      texte: c.texte,
      auteurId: c.auteur_id,
      auteur: auteurs.get(c.auteur_id) ?? 'Un membre de la famille',
      creeLe: c.cree_le,
    })),
  };
}

/** Les 109 personnes de l’arbre, pour la recherche par nom et le filtre du mur. */
export async function chargerPersonnesMentionnables(): Promise<PersonneMentionnee[]> {
  const supabase = await creerClientServeur();
  const { data } = await supabase.from('personnes').select('id, nom_complet, prenoms, nom');

  return (data ?? [])
    .map((p) => ({ id: p.id, nomComplet: nomLisible(p) }))
    .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet, 'fr'));
}

export async function chargerLieux(): Promise<{ id: string; libelle: string }[]> {
  const supabase = await creerClientServeur();
  const { data } = await supabase.from('lieux').select('id, libelle').order('libelle');
  return data ?? [];
}

/** Les bornes du mur, pour proposer un intervalle qui ait un sens. */
export function bornesAnnees(souvenirs: SouvenirResume[]): { min: number; max: number } | null {
  const annees = souvenirs.map((s) => s.annee).filter((a): a is number => a !== null);
  if (annees.length === 0) return null;
  return { min: Math.min(...annees), max: Math.max(...annees) };
}
