import { redirect } from 'next/navigation';
import { creerClientServeur } from '@/lib/supabase/server';
import { personneEstVivante } from '@/lib/vivant';
import { formaterDate, lieuCourt } from '@/lib/arbre';
import { LIBELLE_EVENEMENT } from '@/components/personne/vocabulaire';
import type {
  Commentaire,
  Evenement,
  FaitHistorique,
  Filiation,
  Lieu,
  Media,
  Membre,
  NiveauPreuve,
  Personne,
  PorteeFait,
  Sexe,
  Souvenir,
  Source,
  StatutModeration,
  TypeEvenement,
  TypeMedia,
  Union,
} from '@/lib/types-base';

/**
 * Tout ce qu'on sait d'une personne, rassemblé pour sa fiche.
 *
 * La base éclate volontairement l'information : une vie tient dans la table
 * « evenements », une famille dans « unions » et « filiations », une preuve
 * dans « sources ». C'est bon pour la rigueur, illisible tel quel. Ce module
 * recolle les morceaux et ne rend que des valeurs déjà mises en forme, pour que
 * les composants n'aient plus qu'à afficher.
 *
 * Les requêtes sont nombreuses mais courtes, et jamais élargies : ce que les
 * politiques RLS refusent de renvoyer n'apparaîtra pas ici.
 */

// ---------------------------------------------------------------------------
// Ce que la fiche manipule
// ---------------------------------------------------------------------------

export type LienPersonne = {
  id: string;
  nomComplet: string;
  surnom: string | null;
  sexe: Sexe;
  presumeVivant: boolean;
  branches: string[];
  /** « 1887 – 1954 », « née en 1962 », ou rien si les dates manquent. */
  annees: string | null;
};

export type EvenementFiche = {
  id: string;
  type: TypeEvenement;
  libelle: string | null;
  detail: string | null;
  date: string;
  annee: number | null;
  lieu: string | null;
  lieuCourt: string | null;
  lieuId: string | null;
  niveauPreuve: NiveauPreuve | null;
  notes: string | null;
  /** Renseigné quand l'événement est porté par une union : mariage, divorce. */
  avec: LienPersonne | null;
};

export type EnfantFiche = { personne: LienPersonne; nature: string | null };

/** Un couple parental distinct : indispensable quand une filiation reste à établir. */
export type FiliationFiche = {
  id: string;
  parents: LienPersonne[];
  nature: string | null;
};

export type Foyer = {
  id: string;
  conjoint: LienPersonne | null;
  evenements: EvenementFiche[];
  enfants: EnfantFiche[];
  notes: string | null;
  niveauxPreuve: NiveauPreuve[];
};

export type MembreFratrie = { personne: LienPersonne; demi: boolean };

export type SourceFiche = {
  id: string;
  titre: string | null;
  texte: string | null;
  page: string | null;
  cote: string | null;
  depot: string | null;
  url: string | null;
  niveauPreuve: NiveauPreuve | null;
  /** Ce que la source atteste : « Naissance, 1887 », « Union avec… », « La personne ». */
  rattachement: string;
};

export type SouvenirFiche = {
  id: string;
  titre: string;
  recit: string;
  date: string;
  lieu: string | null;
  auteur: string;
  epingle: boolean;
  statut: StatutModeration;
};

export type MediaFiche = {
  id: string;
  type: TypeMedia;
  titre: string | null;
  description: string | null;
  date: string;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  lieu: string | null;
  transcription: string | null;
  cote: string | null;
  depot: string | null;
  role: string | null;
  statut: StatutModeration;
  /** URL signée, valable une heure : le bucket est privé. */
  url: string | null;
  estImage: boolean;
  /** Dimensions natives, quand la base les connaît : réservent la boîte de la vignette avant chargement. */
  largeur: number | null;
  hauteur: number | null;
};

export type FaitFiche = {
  id: string;
  titre: string;
  resume: string | null;
  periode: string;
  portee: PorteeFait;
  lieu: string | null;
  incidence: string | null;
  sourceUrl: string | null;
};

export type CommentaireFiche = {
  id: string;
  texte: string;
  auteur: string;
  date: string;
  statut: StatutModeration;
  reponses: CommentaireFiche[];
};

export type Fiche = {
  personne: Personne;
  nomComplet: string;
  /** Naissance et décès, mis de côté pour l'en-tête. */
  naissance: EvenementFiche | null;
  deces: EvenementFiche | null;
  inhumation: EvenementFiche | null;
  evenements: EvenementFiche[];
  parents: LienPersonne[];
  filiations: FiliationFiche[];
  natureFiliation: string | null;
  fratrie: MembreFratrie[];
  foyers: Foyer[];
  sources: SourceFiche[];
  souvenirs: SouvenirFiche[];
  medias: MediaFiche[];
  faits: FaitFiche[];
  commentaires: CommentaireFiche[];
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

const IDENTIFIANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Un identifiant venu de l'URL peut être n'importe quoi. On le vérifie avant de
 * le glisser dans un filtre `or(...)`, qui se construit par concaténation.
 */
export function estIdentifiant(valeur: string): boolean {
  return IDENTIFIANT.test(valeur);
}

const BUCKET_MEDIAS = 'arbre-medias';
/** Une heure : le temps de lire la fiche, pas celui de faire circuler le lien. */
const DUREE_LIEN_SIGNE = 3600;

/** Réponse neutre : on n'interroge pas la base pour une liste d'identifiants vide. */
function rienATrouver<T>(): Promise<{ data: T[] | null }> {
  return Promise.resolve({ data: [] });
}

function uniques(ids: (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((v): v is string => Boolean(v)))];
}

/** « 12 mars 2024 » — les dépôts de la famille sont toujours datés au jour. */
function formaterHorodatage(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date);
}

function formaterPeriode(debut: number, fin: number | null): string {
  return fin && fin !== debut ? `${debut} – ${fin}` : String(debut);
}

/** Clé de tri chronologique pour un média (sans date → fin de liste). */
function cleTriMedia(m: { annee: number | null; mois: number | null; jour: number | null }): number {
  if (m.annee === null) return 9_999_999;
  return m.annee * 10_000 + (m.mois ?? 0) * 100 + (m.jour ?? 0);
}

type PersonneCitee = Pick<
  Personne,
  'id' | 'nom_complet' | 'prenoms' | 'nom' | 'surnom' | 'sexe' | 'presume_vivant' | 'branches'
>;

type DateDeVie = Pick<Evenement, 'personne_id' | 'type' | 'annee'>;

// ---------------------------------------------------------------------------
// Chargement
// ---------------------------------------------------------------------------

/** Erreur Supabase sur la fiche : redirection vers /erreur au lieu de planter la page. */
function abandonnerChargementFiche(
  id: string,
  erreur: { code?: string; message?: string }
): never {
  console.error('[chargerFiche]', id, erreur.code, erreur.message);
  if (erreur.code === '42501' || erreur.message?.toLowerCase().includes('permission denied')) {
    redirect('/erreur?code=session');
  }
  redirect('/erreur?code=fiche');
}

/** Le nom seul, pour le titre de l'onglet : inutile de charger toute la fiche. */
export async function chargerNomPersonne(id: string): Promise<string | null> {
  if (!estIdentifiant(id)) return null;

  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from('personnes')
    .select('nom_complet, prenoms, nom')
    .eq('id', id)
    .maybeSingle();

  if (!data) return null;
  return data.nom_complet?.trim() || data.prenoms || data.nom || null;
}

export async function chargerFiche(id: string): Promise<Fiche | null> {
  if (!estIdentifiant(id)) return null;

  const supabase = await creerClientServeur();

  const { data: personne, error } = await supabase
    .from('personnes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) abandonnerChargementFiche(id, error);
  if (!personne) return null;

  // --- Ce qui ne dépend que de la personne ----------------------------------

  const [
    evenementsRes,
    unionsRes,
    filiationsSujetRes,
    sourcesPersonneRes,
    liensSouvenirsRes,
    liensMediasRes,
    liensFaitsRes,
    commentairesRes,
  ] = await Promise.all([
    supabase.from('evenements').select('*').eq('personne_id', id),
    supabase.from('unions').select('*').or(`conjoint_a.eq.${id},conjoint_b.eq.${id}`),
    supabase.from('filiations').select('*').eq('enfant_id', id),
    supabase.from('sources').select('*').eq('personne_id', id),
    supabase.from('souvenirs_personnes').select('souvenir_id').eq('personne_id', id),
    supabase.from('medias_personnes').select('media_id, role').eq('personne_id', id),
    supabase.from('faits_personnes').select('fait_id, incidence').eq('personne_id', id),
    supabase.from('commentaires').select('*').eq('personne_id', id).order('cree_le'),
  ]);

  const evenementsPersonne: Evenement[] = evenementsRes.data ?? [];
  const unionsSujet: Union[] = unionsRes.data ?? [];
  const filiationsSujet: Filiation[] = filiationsSujetRes.data ?? [];
  const commentaires: Commentaire[] = commentairesRes.data ?? [];

  const idsUnionsSujet = unionsSujet.map((u) => u.id);
  const idsUnionsParentales = uniques(filiationsSujet.map((f) => f.union_id));

  // --- Ce qui dépend des unions ---------------------------------------------

  const [unionsParentalesRes, evenementsUnionsRes, filiationsEnfantsRes, filiationsFratrieRes] =
    await Promise.all([
      idsUnionsParentales.length
        ? supabase.from('unions').select('*').in('id', idsUnionsParentales)
        : rienATrouver<Union>(),
      idsUnionsSujet.length
        ? supabase.from('evenements').select('*').in('union_id', idsUnionsSujet)
        : rienATrouver<Evenement>(),
      idsUnionsSujet.length
        ? supabase.from('filiations').select('*').in('union_id', idsUnionsSujet)
        : rienATrouver<Filiation>(),
      idsUnionsParentales.length
        ? supabase.from('filiations').select('*').in('union_id', idsUnionsParentales)
        : rienATrouver<Filiation>(),
    ]);

  const unionsParentales: Union[] = unionsParentalesRes.data ?? [];
  const evenementsUnions: Evenement[] = evenementsUnionsRes.data ?? [];
  const filiationsEnfants: Filiation[] = filiationsEnfantsRes.data ?? [];
  const filiationsFratrie: Filiation[] = filiationsFratrieRes.data ?? [];

  const idsParents = uniques(unionsParentales.flatMap((u) => [u.conjoint_a, u.conjoint_b])).filter(
    (p) => p !== id
  );

  // Les demi-frères et demi-sœurs viennent des autres unions des parents.
  const autresUnionsRes = idsParents.length
    ? await supabase
        .from('unions')
        .select('*')
        .or(`conjoint_a.in.(${idsParents.join(',')}),conjoint_b.in.(${idsParents.join(',')})`)
    : await rienATrouver<Union>();

  const idsUnionsDemi = (autresUnionsRes.data ?? [])
    .map((u) => u.id)
    .filter((u) => !idsUnionsParentales.includes(u));

  const filiationsDemiRes = idsUnionsDemi.length
    ? await supabase.from('filiations').select('*').in('union_id', idsUnionsDemi)
    : await rienATrouver<Filiation>();

  const filiationsDemi: Filiation[] = filiationsDemiRes.data ?? [];

  // --- Personnes citées, pièces déposées ------------------------------------

  const idsConjoints = uniques(
    unionsSujet.map((u) => (u.conjoint_a === id ? u.conjoint_b : u.conjoint_a))
  );
  const idsFratrie = uniques(filiationsFratrie.map((f) => f.enfant_id)).filter((e) => e !== id);
  const idsDemiFratrie = uniques(filiationsDemi.map((f) => f.enfant_id)).filter((e) => e !== id);
  const idsEnfants = uniques(filiationsEnfants.map((f) => f.enfant_id));

  const idsPersonnesCitees = uniques([
    ...idsParents,
    ...idsConjoints,
    ...idsFratrie,
    ...idsDemiFratrie,
    ...idsEnfants,
  ]);

  const idsEvenements = uniques([
    ...evenementsPersonne.map((e) => e.id),
    ...evenementsUnions.map((e) => e.id),
  ]);

  const idsSouvenirs = uniques((liensSouvenirsRes.data ?? []).map((l) => l.souvenir_id));
  const idsMedias = uniques((liensMediasRes.data ?? []).map((l) => l.media_id));
  const idsFaits = uniques((liensFaitsRes.data ?? []).map((l) => l.fait_id));

  const filtreSources = [
    idsEvenements.length ? `evenement_id.in.(${idsEvenements.join(',')})` : '',
    idsUnionsSujet.length ? `union_id.in.(${idsUnionsSujet.join(',')})` : '',
  ]
    .filter((f) => f !== '')
    .join(',');

  const [
    personnesCiteesRes,
    datesDeVieRes,
    sourcesRattacheesRes,
    souvenirsRes,
    mediasRes,
    faitsRes,
  ] = await Promise.all([
    idsPersonnesCitees.length
      ? supabase
          .from('personnes')
          .select('id, nom_complet, prenoms, nom, surnom, sexe, presume_vivant, branches')
          .in('id', idsPersonnesCitees)
      : rienATrouver<PersonneCitee>(),
    idsPersonnesCitees.length
      ? supabase
          .from('evenements')
          .select('personne_id, type, annee')
          .in('personne_id', idsPersonnesCitees)
          .in('type', ['naissance', 'deces', 'inhumation', 'cremation'])
      : rienATrouver<DateDeVie>(),
    filtreSources ? supabase.from('sources').select('*').or(filtreSources) : rienATrouver<Source>(),
    idsSouvenirs.length
      ? supabase.from('souvenirs').select('*').in('id', idsSouvenirs)
      : rienATrouver<Souvenir>(),
    idsMedias.length ? supabase.from('medias').select('*').in('id', idsMedias) : rienATrouver<Media>(),
    idsFaits.length
      ? supabase.from('faits_historiques').select('*').in('id', idsFaits)
      : rienATrouver<FaitHistorique>(),
  ]);

  const personnesCitees: PersonneCitee[] = personnesCiteesRes.data ?? [];
  const datesDeVie: DateDeVie[] = datesDeVieRes.data ?? [];
  const souvenirs: Souvenir[] = souvenirsRes.data ?? [];
  const medias: Media[] = mediasRes.data ?? [];
  const faits: FaitHistorique[] = faitsRes.data ?? [];

  // --- Lieux, auteurs, fichiers ---------------------------------------------

  const idsLieux = uniques([
    ...evenementsPersonne.map((e) => e.lieu_id),
    ...evenementsUnions.map((e) => e.lieu_id),
    ...souvenirs.map((s) => s.lieu_id),
    ...medias.map((m) => m.lieu_id),
    ...faits.map((f) => f.lieu_id),
  ]);

  const idsAuteurs = uniques([
    ...commentaires.map((c) => c.auteur_id),
    ...souvenirs.map((s) => s.auteur_id),
  ]);

  const cheminsMedias = uniques(medias.map((m) => m.chemin));

  const [lieuxRes, auteursRes] = await Promise.all([
    idsLieux.length
      ? supabase.from('lieux').select('id, libelle').in('id', idsLieux)
      : rienATrouver<Pick<Lieu, 'id' | 'libelle'>>(),
    idsAuteurs.length
      ? supabase.from('membres').select('id, nom_affiche').in('id', idsAuteurs)
      : rienATrouver<Pick<Membre, 'id' | 'nom_affiche'>>(),
  ]);

  const libelleLieu = new Map<string, string>();
  for (const l of lieuxRes.data ?? []) libelleLieu.set(l.id, l.libelle);

  const nomAuteur = new Map<string, string>();
  for (const m of auteursRes.data ?? []) nomAuteur.set(m.id, m.nom_affiche);

  // Le bucket est privé : chaque fichier réclame une URL signée.
  const urlSignee = new Map<string, string>();
  if (cheminsMedias.length) {
    const { data: signes } = await supabase.storage
      .from(BUCKET_MEDIAS)
      .createSignedUrls(cheminsMedias, DUREE_LIEN_SIGNE);
    for (const s of signes ?? []) {
      if (s.path && s.signedUrl) urlSignee.set(s.path, s.signedUrl);
    }
  }

  // --- Mise en forme ---------------------------------------------------------

  const anneesDeVie = new Map<string, string>();
  for (const p of personnesCitees) {
    const naissance = datesDeVie.find((e) => e.personne_id === p.id && e.type === 'naissance');
    const deces = datesDeVie.find((e) => e.personne_id === p.id && e.type === 'deces');
    if (naissance?.annee && deces?.annee) {
      anneesDeVie.set(p.id, `${naissance.annee} – ${deces.annee}`);
    } else if (naissance?.annee) {
      anneesDeVie.set(p.id, `${p.sexe === 'F' ? 'née' : 'né'} en ${naissance.annee}`);
    } else if (deces?.annee) {
      anneesDeVie.set(p.id, `${p.sexe === 'F' ? 'morte' : 'mort'} en ${deces.annee}`);
    }
  }

  const lien = (idPersonne: string | null): LienPersonne | null => {
    if (!idPersonne) return null;
    const p = personnesCitees.find((c) => c.id === idPersonne);
    if (!p) return null;
    const aFinDeVie = datesDeVie.some(
      (e) => e.personne_id === p.id && (e.type === 'deces' || e.type === 'inhumation' || e.type === 'cremation')
    );
    return {
      id: p.id,
      nomComplet: p.nom_complet?.trim() || p.prenoms || p.nom || 'Personne sans nom',
      surnom: p.surnom,
      sexe: p.sexe,
      presumeVivant: personneEstVivante(p.presume_vivant, { aEvenementFinDeVie: aFinDeVie }),
      branches: p.branches ?? [],
      annees: anneesDeVie.get(p.id) ?? null,
    };
  };

  const liens = (ids: string[]): LienPersonne[] =>
    ids.map(lien).filter((l): l is LienPersonne => l !== null);

  const conjointDeUnion = (idUnion: string): LienPersonne | null => {
    const union = unionsSujet.find((u) => u.id === idUnion);
    if (!union) return null;
    return lien(union.conjoint_a === id ? union.conjoint_b : union.conjoint_a);
  };

  const mettreEnForme = (e: Evenement, avec: LienPersonne | null): EvenementFiche => {
    const libelle = e.lieu_id ? libelleLieu.get(e.lieu_id) ?? null : null;
    return {
      id: e.id,
      type: e.type,
      libelle: e.libelle,
      detail: e.detail,
      date: formaterDate(e),
      annee: e.annee,
      lieu: libelle,
      lieuCourt: lieuCourt(libelle),
      lieuId: e.lieu_id,
      niveauPreuve: e.niveau_preuve,
      notes: e.notes,
      avec,
    };
  };

  const toutesLesLignes = [...evenementsPersonne, ...evenementsUnions];
  const evenements = [
    ...evenementsPersonne.map((e) => mettreEnForme(e, null)),
    ...evenementsUnions.map((e) => mettreEnForme(e, e.union_id ? conjointDeUnion(e.union_id) : null)),
  ].sort(comparerChronologie(toutesLesLignes));

  const foyers: Foyer[] = unionsSujet.map((union) => {
    const idsEvenementsUnion = evenementsUnions
      .filter((e) => e.union_id === union.id)
      .map((e) => e.id);

    return {
      id: union.id,
      conjoint: conjointDeUnion(union.id),
      evenements: evenements.filter((e) => idsEvenementsUnion.includes(e.id)),
      enfants: filiationsEnfants
        .filter((f) => f.union_id === union.id)
        .map((f) => ({ personne: lien(f.enfant_id), nature: preciserNature(f.nature) }))
        .filter((e): e is EnfantFiche => e.personne !== null)
        .sort(comparerParAnnee),
      notes: union.notes,
      niveauxPreuve: union.niveaux_preuve ?? [],
    };
  });

  // Une personne peut avoir plusieurs filiations candidates. On les conserve
  // séparément afin de ne jamais présenter quatre parents comme un fait établi.
  const filiations: FiliationFiche[] = unionsParentales
    .map((union) => ({
      id: union.id,
      parents: liens(uniques([union.conjoint_a, union.conjoint_b]).filter((p) => p !== id)),
      nature: preciserNature(filiationsSujet.find((f) => f.union_id === union.id)?.nature ?? null),
    }))
    .filter((filiation) => filiation.parents.length > 0);

  const fratrie: MembreFratrie[] = [
    ...liens(idsFratrie).map((personne) => ({ personne, demi: false })),
    ...liens(idsDemiFratrie)
      .filter((p) => !idsFratrie.includes(p.id))
      .map((personne) => ({ personne, demi: true })),
  ].sort(comparerParAnnee);

  const rattachement = (s: Pick<Source, 'evenement_id' | 'union_id'>): string => {
    if (s.evenement_id) {
      const e = evenements.find((ev) => ev.id === s.evenement_id);
      if (e) return e.date ? `${LIBELLE_EVENEMENT[e.type]}, ${e.date}` : LIBELLE_EVENEMENT[e.type];
    }
    if (s.union_id) {
      const conjoint = conjointDeUnion(s.union_id);
      return conjoint ? `Union avec ${conjoint.nomComplet}` : 'Union';
    }
    return 'La personne';
  };

  const sources: SourceFiche[] = [
    ...(sourcesPersonneRes.data ?? []),
    ...(sourcesRattacheesRes.data ?? []),
  ]
    .filter((s, i, tout) => tout.findIndex((autre) => autre.id === s.id) === i)
    .map((s) => ({
      id: s.id,
      titre: s.titre,
      texte: s.texte,
      page: s.page,
      cote: s.cote,
      depot: s.depot,
      url: s.url,
      niveauPreuve: s.niveau_preuve,
      rattachement: rattachement(s),
    }));

  const roleMedia = new Map<string, string>();
  for (const l of liensMediasRes.data ?? []) roleMedia.set(l.media_id, l.role);

  const incidenceFait = new Map<string, string | null>();
  for (const l of liensFaitsRes.data ?? []) incidenceFait.set(l.fait_id, l.incidence);

  return {
    personne,
    nomComplet:
      personne.nom_complet?.trim() || personne.prenoms || personne.nom || 'Personne sans nom',
    naissance: evenements.find((e) => e.type === 'naissance') ?? null,
    deces: evenements.find((e) => e.type === 'deces') ?? null,
    inhumation: evenements.find((e) => e.type === 'inhumation') ?? null,
    evenements,
    parents: liens(idsParents),
    filiations,
    natureFiliation: filiations.length === 1 ? filiations[0]?.nature ?? null : null,
    fratrie,
    foyers,
    sources,
    souvenirs: souvenirs
      .map((s) => ({
        id: s.id,
        titre: s.titre,
        recit: s.recit,
        date: formaterDate(s) || formaterHorodatage(s.cree_le),
        lieu: (s.lieu_id ? libelleLieu.get(s.lieu_id) : null) ?? s.lieu_libre,
        auteur: nomAuteur.get(s.auteur_id) ?? 'Un membre de la famille',
        epingle: s.epingle,
        statut: s.statut,
      }))
      .sort((a, b) => Number(b.epingle) - Number(a.epingle)),
    medias: medias
      .map((m) => ({
        id: m.id,
        type: m.type,
        titre: m.titre,
        description: m.description,
        date: formaterDate(m),
        annee: m.annee,
        mois: m.mois,
        jour: m.jour,
        lieu: (m.lieu_id ? libelleLieu.get(m.lieu_id) : null) ?? null,
        transcription: m.transcription,
        cote: m.cote,
        depot: m.depot,
        role: roleMedia.get(m.id) ?? null,
        statut: m.statut,
        url: urlSignee.get(m.chemin) ?? null,
        estImage: m.mime ? m.mime.startsWith('image/') : m.type === 'photo',
        largeur: m.largeur ?? null,
        hauteur: m.hauteur ?? null,
      }))
      .sort((a, b) => {
        const triA = cleTriMedia(a);
        const triB = cleTriMedia(b);
        if (triA !== triB) return triA - triB;
        return Number(b.estImage) - Number(a.estImage);
      }),
    faits: faits
      .map((f) => ({
        id: f.id,
        titre: f.titre,
        resume: f.resume,
        periode: formaterPeriode(f.annee_debut, f.annee_fin),
        portee: f.portee,
        lieu: (f.lieu_id ? libelleLieu.get(f.lieu_id) : null) ?? f.lieu_libre,
        incidence: incidenceFait.get(f.id) ?? null,
        sourceUrl: f.source_url,
      }))
      .sort((a, b) => a.periode.localeCompare(b.periode)),
    commentaires: assemblerFilCommentaires(commentaires, nomAuteur),
  };
}

// ---------------------------------------------------------------------------
// Tri et assemblage
// ---------------------------------------------------------------------------

/**
 * La base calcule `date_tri`, tolérant aux dates partielles : on s'appuie
 * dessus. Ce qui n'est pas daté du tout ferme la marche plutôt que de l'ouvrir.
 */
function comparerChronologie(lignes: Evenement[]) {
  const cles = new Map<string, string>();
  for (const e of lignes) {
    if (e.date_tri) cles.set(e.id, e.date_tri);
    else if (e.annee) {
      cles.set(e.id, `${String(e.annee).padStart(4, '0')}-${String(e.mois ?? 1).padStart(2, '0')}`);
    }
  }

  return (a: { id: string }, b: { id: string }) => {
    const ca = cles.get(a.id);
    const cb = cles.get(b.id);
    if (!ca && !cb) return 0;
    if (!ca) return 1;
    if (!cb) return -1;
    return ca.localeCompare(cb);
  };
}

/** Frères, sœurs et enfants sont rangés par âge, l'aîné d'abord. */
function comparerParAnnee(a: { personne: LienPersonne }, b: { personne: LienPersonne }) {
  const annee = (l: LienPersonne) => Number(l.annees?.match(/\d{4}/)?.[0] ?? 9999);
  return annee(a.personne) - annee(b.personne);
}

/** La filiation ordinaire ne se dit pas ; l'adoption ou la reconnaissance, si. */
function preciserNature(nature: string | null): string | null {
  if (!nature) return null;
  const n = nature.trim().toLowerCase();
  return n === '' || n === 'naturelle' || n === 'biologique' ? null : nature;
}

function assemblerFilCommentaires(
  lignes: Commentaire[],
  nomAuteur: Map<string, string>
): CommentaireFiche[] {
  const fiches = new Map<string, CommentaireFiche>();
  for (const c of lignes) {
    fiches.set(c.id, {
      id: c.id,
      texte: c.texte,
      auteur: nomAuteur.get(c.auteur_id) ?? 'Un membre de la famille',
      date: formaterHorodatage(c.cree_le),
      statut: c.statut,
      reponses: [],
    });
  }

  const racines: CommentaireFiche[] = [];
  for (const c of lignes) {
    const fiche = fiches.get(c.id);
    if (!fiche) continue;
    const parent = c.parent_id ? fiches.get(c.parent_id) : undefined;
    if (parent) parent.reponses.push(fiche);
    else racines.push(fiche);
  }
  return racines;
}
