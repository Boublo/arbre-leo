import { creerClientServeur } from '@/lib/supabase/server';
import { formaterDate, lieuCourt } from '@/lib/arbre';
import { BUCKET_MEDIAS, extraitRecit as extraitRecitPartage } from '@/lib/souvenirs-partage';
import type { PrecisionDate, Sexe, StatutModeration } from '@/lib/types-base';

// Ré-exporté pour ne pas casser les importations existantes. Le corps de la
// fonction vit dans `souvenirs-partage.ts` : ainsi un composant client peut
// s’en servir sans traîner `next/headers`.
export const extraitRecit = extraitRecitPartage;

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

/**
 * Ce que le sélecteur de personnes du formulaire affiche : de quoi remplir une
 * Vignette (années de vie, côté paternel ou maternel, lieu de naissance) sans
 * quitter la page pour aller le chercher.
 */
export type PortraitMentionnable = PersonneMentionnee & {
  surnom: string | null;
  sexe: Sexe;
  branches: string[];
  anneeNaissance: number | null;
  anneeDeces: number | null;
  lieuNaissance: string | null;
  presumeVivant: boolean;
};

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
  mois: number | null;
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
  /** Nombre de commentaires publiés — renseigné par `avecCompteurs`. */
  nombreCommentaires: number;
};

export type SouvenirDetail = SouvenirResume & {
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
  /**
   * Ce que la carte porte : rien, une photo, un simple récit. Le mur devient
   * lisible d’un coup quand on ne cherche qu’un des deux.
   */
  type?: TypeSouvenir | null;
};

export type TypeSouvenir = 'tous' | 'photos' | 'recits';

export type Contributeur = {
  id: string;
  nom: string;
  nombre: number;
};

export type AnniversaireCalendrier = {
  personneId: string;
  nomComplet: string;
  branches: string[];
  sexe: Sexe;
  type: 'naissance' | 'mariage' | 'deces';
  /** Année exacte, quand elle est connue : sert au sous-titre « en 1954 ». */
  annee: number | null;
  jour: number | null;
  /** Le conjoint, pour les mariages : « X et Y se marient ». */
  autrePersonneId: string | null;
  autreNomComplet: string | null;
};

export type CalendrierAnniversaires = Map<number, AnniversaireCalendrier[]>;

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
    mois: ligne.mois,
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
    // Rempli plus tard par `attacherCompteurs` : la table des commentaires n’est
    // pas jointe ici pour ne pas alourdir la requête du mur.
    nombreCommentaires: 0,
  };
}

/**
 * Interroge la table des commentaires pour connaître le nombre de réactions par
 * souvenir donné. Une seule requête plutôt qu’un compte par carte : le mur en
 * affiche une vingtaine à la fois.
 */
async function compterCommentaires(
  supabase: ClientServeur,
  souvenirIds: string[]
): Promise<Map<string, number>> {
  const compteurs = new Map<string, number>();
  if (souvenirIds.length === 0) return compteurs;

  const { data } = await supabase
    .from('commentaires')
    .select('souvenir_id')
    .in('souvenir_id', souvenirIds);

  for (const ligne of data ?? []) {
    if (!ligne.souvenir_id) continue;
    compteurs.set(ligne.souvenir_id, (compteurs.get(ligne.souvenir_id) ?? 0) + 1);
  }
  return compteurs;
}

/** Attache les compteurs de commentaires à une liste déjà chargée. */
async function attacherCompteurs(
  supabase: ClientServeur,
  souvenirs: SouvenirResume[]
): Promise<void> {
  const compteurs = await compterCommentaires(
    supabase,
    souvenirs.map((s) => s.id)
  );
  for (const s of souvenirs) {
    s.nombreCommentaires = compteurs.get(s.id) ?? 0;
  }
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

  let assembles = lignes.map((l) => assembler(l, auteurs, personnes, urls, 3));

  // Le filtre par type porte sur le résultat assemblé : le nombre de photos est
  // déjà comptabilisé, inutile de refaire la jointure côté base.
  if (filtres.type === 'photos') {
    assembles = assembles.filter((s) => s.nombrePhotos > 0);
  } else if (filtres.type === 'recits') {
    assembles = assembles.filter((s) => s.nombrePhotos === 0);
  }

  await attacherCompteurs(supabase, assembles);
  return assembles;
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
  resume.nombreCommentaires = commentaires.length;

  return {
    ...resume,
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

/**
 * Version étoffée destinée au formulaire de dépôt : les Vignettes ont besoin
 * d’années de vie et d’une commune de naissance pour que l’auteur reconnaisse
 * la personne au premier coup d’œil.
 */
export async function chargerPortraitsMentionnables(): Promise<PortraitMentionnable[]> {
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
    type: 'naissance' | 'deces' | string;
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
      return {
        id: p.id,
        nomComplet: nomLisible(p),
        surnom: p.surnom,
        sexe: p.sexe,
        branches: p.branches ?? [],
        presumeVivant: p.presume_vivant,
        anneeNaissance: naissance?.annee ?? null,
        anneeDeces: deces?.annee ?? null,
        lieuNaissance: lieuCourt(naissance?.lieux?.libelle ?? null),
      };
    })
    .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet, 'fr'));
}

/**
 * Les dix plus grands déposants du site. La table `souvenirs` n’a pas de vue
 * agrégée : on compte en mémoire, ce qui reste sans conséquence à cette
 * échelle. Les brouillons masqués comptent aussi, pour ne pas dévaloriser le
 * travail d’un contributeur dont un texte est en relecture.
 */
export async function chargerTopContributeurs(combien = 10): Promise<Contributeur[]> {
  const supabase = await creerClientServeur();
  const { data } = await supabase.from('souvenirs').select('auteur_id');

  const totaux = new Map<string, number>();
  for (const ligne of data ?? []) {
    totaux.set(ligne.auteur_id, (totaux.get(ligne.auteur_id) ?? 0) + 1);
  }
  if (totaux.size === 0) return [];

  const noms = await nomsMembres(supabase, [...totaux.keys()]);

  return [...totaux.entries()]
    .map(([id, nombre]) => ({
      id,
      nom: noms.get(id) ?? 'Un membre de la famille',
      nombre,
    }))
    .sort((a, b) => b.nombre - a.nombre || a.nom.localeCompare(b.nom, 'fr'))
    .slice(0, combien);
}

/**
 * Le calendrier des anniversaires : ce que la famille peut se souvenir de fêter
 * ce mois-ci — naissances, mariages, disparitions. Renvoyé sous forme de carte
 * indexée par mois (1 à 12) pour que la vue puisse balayer l’année.
 *
 * Les événements sans mois connu sont ignorés : on ne fêtera pas « quelque part
 * dans l’année 1912 ».
 */
export async function chargerCalendrierAnniversaires(): Promise<CalendrierAnniversaires> {
  const supabase = await creerClientServeur();

  type LigneAnnivRaw = {
    type: string;
    personne_id: string | null;
    union_id: string | null;
    annee: number | null;
    mois: number | null;
    jour: number | null;
  };

  const { data: evenements } = await supabase
    .from('evenements')
    .select('type, personne_id, union_id, annee, mois, jour')
    .in('type', ['naissance', 'mariage', 'deces'])
    .not('mois', 'is', null);

  const brut = (evenements ?? []) as LigneAnnivRaw[];
  if (brut.length === 0) return new Map();

  const idsUnions = [...new Set(brut.filter((e) => e.union_id).map((e) => e.union_id!))];
  const idsDirects = brut.filter((e) => e.personne_id).map((e) => e.personne_id!);

  const [unionsRes, personnesInit] = await Promise.all([
    idsUnions.length > 0
      ? supabase.from('unions').select('id, conjoint_a, conjoint_b').in('id', idsUnions)
      : Promise.resolve({ data: [] as { id: string; conjoint_a: string | null; conjoint_b: string | null }[] }),
    Promise.resolve(idsDirects),
  ]);
  void personnesInit;

  const parUnion = new Map<string, { a: string | null; b: string | null }>();
  for (const u of unionsRes.data ?? []) {
    parUnion.set(u.id, { a: u.conjoint_a, b: u.conjoint_b });
  }

  const tousIds = new Set<string>(idsDirects);
  for (const u of parUnion.values()) {
    if (u.a) tousIds.add(u.a);
    if (u.b) tousIds.add(u.b);
  }

  const { data: personnesData } = tousIds.size
    ? await supabase
        .from('personnes')
        .select('id, nom_complet, prenoms, nom, sexe, branches')
        .in('id', [...tousIds])
    : { data: [] };

  const infos = new Map<
    string,
    { nomComplet: string; sexe: Sexe; branches: string[] }
  >();
  for (const p of personnesData ?? []) {
    infos.set(p.id, {
      nomComplet: nomLisible(p),
      sexe: p.sexe,
      branches: p.branches ?? [],
    });
  }

  const calendrier: CalendrierAnniversaires = new Map();
  const ajouter = (mois: number, entree: AnniversaireCalendrier) => {
    const liste = calendrier.get(mois) ?? [];
    liste.push(entree);
    calendrier.set(mois, liste);
  };

  for (const e of brut) {
    const mois = e.mois;
    if (mois === null || mois < 1 || mois > 12) continue;

    if (e.type === 'mariage' && e.union_id) {
      const union = parUnion.get(e.union_id);
      if (!union) continue;
      const a = union.a ? infos.get(union.a) : null;
      const b = union.b ? infos.get(union.b) : null;
      if (!a && !b) continue;

      // La ligne est portée par le conjoint dont l’identifiant vient en premier :
      // il faut un pivot stable pour lier vers /personne/[id] sans doublon.
      const principalId = union.a ?? union.b!;
      const principal = a ?? b!;
      const autreId = union.a && union.b ? union.b : null;
      const autre = union.a && union.b ? b : null;

      ajouter(mois, {
        personneId: principalId,
        nomComplet: principal.nomComplet,
        branches: principal.branches,
        sexe: principal.sexe,
        type: 'mariage',
        annee: e.annee,
        jour: e.jour,
        autrePersonneId: autreId,
        autreNomComplet: autre?.nomComplet ?? null,
      });
      continue;
    }

    if (!e.personne_id) continue;
    const info = infos.get(e.personne_id);
    if (!info) continue;

    ajouter(mois, {
      personneId: e.personne_id,
      nomComplet: info.nomComplet,
      branches: info.branches,
      sexe: info.sexe,
      type: e.type === 'naissance' ? 'naissance' : 'deces',
      annee: e.annee,
      jour: e.jour,
      autrePersonneId: null,
      autreNomComplet: null,
    });
  }

  // À l’intérieur d’un mois, du plus tôt (petit jour) au plus tard, puis par
  // année croissante à jour égal : c’est ainsi qu’on lit un calendrier.
  for (const liste of calendrier.values()) {
    liste.sort((a, b) => {
      const ja = a.jour ?? 99;
      const jb = b.jour ?? 99;
      if (ja !== jb) return ja - jb;
      return (a.annee ?? 9999) - (b.annee ?? 9999);
    });
  }

  return calendrier;
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

/**
 * La décennie d’un souvenir, ou `null` s’il ne porte pas d’année : sert au
 * regroupement du mur et au filtre en colonne latérale.
 */
export function decennieDe(annee: number | null): number | null {
  if (annee === null) return null;
  return Math.floor(annee / 10) * 10;
}

/** Les décennies présentes dans un lot, ordonnées du plus récent au plus ancien. */
export function decenniesDansLeMur(souvenirs: SouvenirResume[]): number[] {
  const trouvees = new Set<number>();
  for (const s of souvenirs) {
    const d = decennieDe(s.annee);
    if (d !== null) trouvees.add(d);
  }
  return [...trouvees].sort((a, b) => b - a);
}

/**
 * Le souvenir qui mérite le grand cadre en tête du mur : d’abord un souvenir
 * explicitement épinglé — le plus récemment mis à jour, si plusieurs le sont —
 * puis, à défaut, le tout dernier déposé. C’est ce qui accueille le visiteur.
 */
export function souvenirDeTete(souvenirs: SouvenirResume[]): SouvenirResume | null {
  const epingles = souvenirs.filter((s) => s.epingle);
  if (epingles.length > 0) {
    // Le plus récent des épinglés : les autres seront revus au fil du mur.
    return [...epingles].sort((a, b) => b.creeLe.localeCompare(a.creeLe))[0];
  }
  return souvenirs[0] ?? null;
}
