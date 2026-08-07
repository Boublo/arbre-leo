import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PRENOM_RACINE } from '@/lib/branches';
import { creerClientServeur } from '@/lib/supabase/server';
import { personneEstVivante } from '@/lib/vivant';
import type { BaseDeDonnees, Evenement, NiveauPreuve, Sexe, TypeEvenement } from '@/lib/types-base';

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
  /**
   * URL signée de la photo, prête à mettre dans un `<img src>`. Renseignée
   * uniquement quand la personne a une photo et que le chargement l'a signée.
   * Le lien expire au bout d'une heure : c'est fait pour être servi par le
   * rendu, pas stocké ni partagé.
   */
  photoUrl: string | null;
  naissance: EvenementResume | null;
  deces: EvenementResume | null;
  inhumation: EvenementResume | null;
  profession: string | null;
  /** Identifiants des unions dont cette personne est l'un des conjoints. */
  unions: string[];
  /** Identifiant de l'union d'où elle est issue, s'il est connu. */
  issuDe: string | null;
  /**
   * Indice discret qu'il manque peut-être une descendance à saisir : soit un
   * couple sans enfant où au moins un conjoint a passé l'âge où l'on en a, soit
   * une personne présumée vivante d'âge adulte dont aucune union n'est connue.
   * Ce n'est jamais qu'une invitation à vérifier, jamais une affirmation.
   */
  descendanceIncomplete: boolean;
};

export type EvenementResume = {
  annee: number | null;
  mois: number | null;
  jour: number | null;
  texte: string;
  lieu: string | null;
  lieuCourt: string | null;
  lieuId: string | null;
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
  | 'annee'
  | 'mois'
  | 'jour'
  | 'annee_fin'
  | 'qualificatif'
  | 'date_texte'
  | 'type'
  | 'detail'
  | 'lieu_id'
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
    lieuId: e.lieu_id,
  };
}

// ---------------------------------------------------------------------------
// Chargement
// ---------------------------------------------------------------------------

/** Événements retenus pour l'affichage de l'arbre : le reste est chargé à la fiche. */
const TYPES_RESUME: TypeEvenement[] = ['naissance', 'deces', 'inhumation', 'profession', 'mariage'];

export type OptionsChargementArbre = {
  /**
   * Identifiants des personnes dont la photo doit être signée.
   * - `'tous'` (défaut) : signe tous les portraits — coût Storage élevé.
   * - `'aucun'` : aucune signature (stats, parenté, calculs purs).
   * - `Set<id>` : uniquement ces personnes.
   */
  signerPhotosPour?: Set<string> | 'tous' | 'aucun';
};

/** Signe les portraits du bucket privé pour les personnes demandées. */
export async function signerPhotosPersonnes(
  personnes: Map<string, PersonneArbre>,
  ids: Set<string>
): Promise<void> {
  if (ids.size === 0) return;

  const supabase = await creerClientServeur();
  const photoIds = [...ids]
    .map((id) => personnes.get(id)?.photoId)
    .filter((id): id is string => typeof id === 'string');

  if (photoIds.length === 0) return;

  const { data: medias } = await supabase
    .from('medias')
    .select('id, chemin')
    .in('id', photoIds);

  const cheminParPhotoId = new Map((medias ?? []).map((m) => [m.id, m.chemin]));
  const chemins = new Set<string>();
  const cheminParPersonne = new Map<string, string>();

  for (const id of ids) {
    const personne = personnes.get(id);
    if (!personne?.photoId) continue;
    const chemin = cheminParPhotoId.get(personne.photoId);
    if (!chemin) continue;
    chemins.add(chemin);
    cheminParPersonne.set(id, chemin);
  }

  if (chemins.size === 0) return;

  const { data: urlsSignees } = await supabase.storage
    .from('arbre-medias')
    .createSignedUrls([...chemins], 3600);

  const urlParChemin = new Map<string, string>();
  for (const entree of urlsSignees ?? []) {
    if (entree.path && entree.signedUrl) urlParChemin.set(entree.path, entree.signedUrl);
  }

  for (const [id, chemin] of cheminParPersonne) {
    const personne = personnes.get(id);
    if (personne) personne.photoUrl = urlParChemin.get(chemin) ?? null;
  }
}

/**
 * Charge le graphe familial.
 *
 * Mise en cache au sein d'une même requête React (`cache`) : si l'accueil et
 * une section fille appellent `chargerArbre()` avec la même clé de signature,
 * une seule aller-retour base a lieu.
 */
export async function chargerArbre(
  options: OptionsChargementArbre = {}
): Promise<DonneesArbre> {
  const cle = cleSignaturePhotos(options.signerPhotosPour ?? 'tous');
  return chargerArbreEnCache(cle);
}

function cleSignaturePhotos(
  signer: NonNullable<OptionsChargementArbre['signerPhotosPour']>
): string {
  if (signer === 'tous' || signer === 'aucun') return signer;
  return [...signer].sort().join(',') || 'aucun';
}

function optionsDepuisCle(cle: string): OptionsChargementArbre {
  if (cle === 'tous' || cle === 'aucun') return { signerPhotosPour: cle };
  return { signerPhotosPour: new Set(cle.split(',').filter(Boolean)) };
}

const chargerArbreEnCache = cache(async (cleSignature: string): Promise<DonneesArbre> => {
  const supabase = await creerClientServeur();
  return chargerArbreInterne(supabase, optionsDepuisCle(cleSignature));
});

/** Charge l'arbre avec un client Supabase donné (service role pour les crons). */
export async function chargerArbreAvecClient(
  supabase: SupabaseClient<BaseDeDonnees, 'arbre'>,
  options: OptionsChargementArbre = {}
): Promise<DonneesArbre> {
  return chargerArbreInterne(supabase, options);
}

async function chargerArbreInterne(
  supabase: SupabaseClient<BaseDeDonnees, 'arbre'>,
  options: OptionsChargementArbre = {}
): Promise<DonneesArbre> {
  const signerPhotosPour = options.signerPhotosPour ?? 'tous';

  const [personnesRes, unionsRes, filiationsRes, evenementsRes] = await Promise.all([
    supabase
      .from('personnes')
      .select('id, code_gedcom, prenoms, nom, nom_complet, surnom, sexe, branches, niveaux_preuve, presume_vivant, notes, photo_id'),
    supabase.from('unions').select('id, conjoint_a, conjoint_b'),
    supabase.from('filiations').select('union_id, enfant_id'),
    supabase
      .from('evenements')
      .select('personne_id, union_id, type, annee, mois, jour, annee_fin, qualificatif, date_texte, detail, lieu_id, lieux(libelle)')
      .in('type', TYPES_RESUME),
  ]);

  const photoIds = [
    ...new Set(
      (personnesRes.data ?? [])
        .map((p) => p.photo_id)
        .filter((id): id is string => typeof id === 'string')
    ),
  ];

  const mediasRes =
    photoIds.length > 0 && signerPhotosPour !== 'aucun'
      ? await supabase.from('medias').select('id, chemin').eq('type', 'photo').in('id', photoIds)
      : { data: [] as { id: string; chemin: string }[], error: null };

  const erreur =
    personnesRes.error ??
    unionsRes.error ??
    filiationsRes.error ??
    evenementsRes.error ??
    mediasRes.error;
  if (erreur) throw new Error(`Chargement de l'arbre impossible : ${erreur.message}`);

  const cheminParMedia = new Map((mediasRes.data ?? []).map((m) => [m.id, m.chemin]));
  const idsASigner =
    signerPhotosPour === 'tous'
      ? new Set((personnesRes.data ?? []).map((p) => p.id))
      : signerPhotosPour === 'aucun'
        ? new Set<string>()
        : signerPhotosPour;

  const cheminsAsigner = [
    ...new Set(
      (personnesRes.data ?? [])
        .filter((p) => idsASigner.has(p.id))
        .map((p) => (p.photo_id ? cheminParMedia.get(p.photo_id) : null))
        .filter((c): c is string => typeof c === 'string')
    ),
  ];
  const urlParChemin = new Map<string, string>();
  if (cheminsAsigner.length > 0) {
    const { data: urlsSignees } = await supabase.storage
      .from('arbre-medias')
      .createSignedUrls(cheminsAsigner, 3600);
    for (const s of urlsSignees ?? []) {
      if (s.path && s.signedUrl) urlParChemin.set(s.path, s.signedUrl);
    }
  }

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

    const chemin = p.photo_id ? cheminParMedia.get(p.photo_id) : null;
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
      presumeVivant: personneEstVivante(p.presume_vivant, { typesEvenements: evts.map((e) => e.type) }),
      notes: p.notes,
      photoId: p.photo_id,
      photoUrl: chemin ? urlParChemin.get(chemin) ?? null : null,
      naissance: resumer(evts.find((e) => e.type === 'naissance')),
      deces: resumer(evts.find((e) => e.type === 'deces')),
      inhumation: resumer(evts.find((e) => e.type === 'inhumation')),
      profession: profession?.detail ?? null,
      unions: unionsParPersonne.get(p.id) ?? [],
      issuDe: issuDe.get(p.id) ?? null,
      // Repose sur les unions et les naissances : renseigné en second passage,
      // une fois toutes les personnes construites.
      descendanceIncomplete: false,
    });
  }

  // Second passage : maintenant que toutes les personnes existent, on peut
  // regarder les conjoints d'un couple pour déduire une branche à compléter.
  for (const personne of personnes.values()) {
    personne.descendanceIncomplete = descendanceParaitIncomplete(personne, personnes, unions);
  }

  return { personnes, unions, parents, enfants };
}

// ---------------------------------------------------------------------------
// Descendance qui semble à compléter
// ---------------------------------------------------------------------------

/**
 * Deux situations très différentes justifient qu'un nœud porte l'invitation
 * discrète à ajouter un enfant :
 *
 *  — un couple constitué mais dont aucune descendance n'est en base, alors
 *    qu'au moins l'un des conjoints est en âge d'en avoir eu (plus de dix-huit
 *    ans, seuil conservateur) ;
 *  — une personne présumée vivante, adulte confirmée (plus de trente ans),
 *    qu'aucune union ne rattache encore à qui que ce soit — souvent parce
 *    que sa famille récente n'a pas encore été saisie.
 *
 * On garde volontairement l'indication vague : elle n'affirme rien qui manque,
 * elle interroge — « faut-il compléter ? ».
 */
function descendanceParaitIncomplete(
  personne: PersonneArbre,
  personnes: Map<string, PersonneArbre>,
  unions: Map<string, UnionArbre>
): boolean {
  const anneeCourante = new Date().getFullYear();

  const ageDe = (p: PersonneArbre | undefined): number | null => {
    const annee = p?.naissance?.annee;
    return annee == null ? null : anneeCourante - annee;
  };

  // Cas A : au moins une union sans enfant, avec un conjoint majeur.
  for (const unionId of personne.unions) {
    const union = unions.get(unionId);
    if (!union || union.enfants.length > 0) continue;

    const agePersonne = ageDe(personne);
    const autreId =
      union.conjointA === personne.id ? union.conjointB : union.conjointA;
    const ageAutre = ageDe(autreId ? personnes.get(autreId) : undefined);

    if ((agePersonne !== null && agePersonne > 18) || (ageAutre !== null && ageAutre > 18)) {
      return true;
    }
  }

  // Cas B : présumée vivante, adulte confirmée, aucune union enregistrée.
  if (personne.presumeVivant && personne.unions.length === 0) {
    const age = ageDe(personne);
    if (age !== null && age > 30) return true;
  }

  return false;
}

/**
 * Les derniers-nés de la famille : ceux dont on ne connaît pas de descendance.
 *
 * Ce sont les points de départ naturels d'une remontée — les enfants d'où part
 * toute l'histoire. Ils sont proposés en tête du choix, du plus jeune au plus
 * ancien. Aucun nom n'est codé en dur : la liste se déduit de la base et se
 * met à jour d'elle-même à chaque naissance saisie.
 */
export function derniersEnfants(donnees: DonneesArbre, combien = 12): PersonneArbre[] {
  return [...donnees.personnes.values()]
    .filter((p) => (donnees.enfants.get(p.id) ?? []).length === 0)
    .filter((p) => p.naissance?.annee)
    .sort((a, b) => (b.naissance?.annee ?? 0) - (a.naissance?.annee ?? 0))
    .slice(0, combien);
}

/**
 * La personne montrée à l'ouverture, faute de choix explicite.
 *
 * Ordre de priorité : identifiant configuré, prénom racine (ex. Léo), puis le
 * plus jeune des derniers-nés. Ainsi l'arbre s'ouvre toujours sur l'enfant
 * autour duquel il est construit, même si un cousin plus jeune est ajouté.
 */
function normaliserPourComparaison(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[''`’]/g, "'");
}

function personneParPrenomRacine(donnees: DonneesArbre): PersonneArbre | null {
  const cible = normaliserPourComparaison(PRENOM_RACINE);
  if (!cible || cible === "l'enfant") return null;

  for (const personne of donnees.personnes.values()) {
    const prenom = personne.prenoms?.split(/[\s,]+/)[0]?.trim();
    if (prenom && normaliserPourComparaison(prenom) === cible) return personne;

    const premierMot = personne.nomComplet.split(/\s+/)[0]?.trim();
    if (premierMot && normaliserPourComparaison(premierMot) === cible) return personne;
  }

  return null;
}

export function racineParDefaut(donnees: DonneesArbre): PersonneArbre | null {
  const idConfigure = process.env.NEXT_PUBLIC_PERSONNE_RACINE?.trim();
  if (idConfigure && donnees.personnes.has(idConfigure)) {
    return donnees.personnes.get(idConfigure)!;
  }

  const parPrenom = personneParPrenomRacine(donnees);
  if (parPrenom) return parPrenom;

  return derniersEnfants(donnees, 1)[0] ?? [...donnees.personnes.values()][0] ?? null;
}

/** Retrouve une personne par son identifiant, si elle existe encore. */
export function personneOuDefaut(
  donnees: DonneesArbre,
  id: string | undefined
): PersonneArbre | null {
  if (id && donnees.personnes.has(id)) return donnees.personnes.get(id)!;
  return racineParDefaut(donnees);
}
