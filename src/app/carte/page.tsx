import { Navigation } from '@/components/navigation';
import { EcranCarte } from '@/components/carte/ecran-carte';
import type {
  AnnotationTemps,
  Deplacement,
  DonneesCarte,
  EvenementAuLieu,
  FaitLocal,
  Flux,
  LieuSitue,
  PersonneAuLieu,
  PhotoLieu,
} from '@/components/carte/types-carte';
import { formaterDate, lieuCourt } from '@/lib/arbre';
import { coteDesBranches, type Cote } from '@/lib/branches';
import { BUCKET_MEDIAS } from '@/lib/souvenirs-partage';
import { creerClientServeur } from '@/lib/supabase/server';

export const metadata = { title: 'La carte' };

// Un lieu peut être situé à tout moment par un membre : la carte se relit.
export const dynamic = 'force-dynamic';

type LieuManquant = { id: string; nom: string; libelle: string; nbEvenements: number };

type Chargement = {
  carte: DonneesCarte;
  nbLieux: number;
  manquants: LieuManquant[];
  nbEvenementsSansLieuSitue: number;
};

/** Signature d'une heure : le temps d'une visite, pas davantage. */
const DUREE_SIGNATURE = 60 * 60;

/**
 * La table peut ne pas exister sur une base fraîchement montée : on préfère
 * alors une carte sans faits ni souvenirs à une page d'erreur. Toute autre
 * erreur remonte.
 */
function tableAbsente(erreur: { code?: string; message?: string } | null): boolean {
  if (!erreur) return false;
  if (erreur.code === '42P01' || erreur.code === 'PGRST205') return true;
  const message = erreur.message?.toLowerCase() ?? '';
  return message.includes('does not exist') || message.includes('could not find the table');
}

/**
 * Rassemble ce qu'il faut pour la carte : les lieux situés, ce qui s'y est
 * passé, le chemin que chaque personne a suivi d'un lieu au suivant, et le
 * grand trajet d'une vie entière. Tout est fait ici, sur le serveur, pour
 * n'envoyer au navigateur que des données déjà en forme.
 */
async function chargerCarte(): Promise<Chargement> {
  const supabase = await creerClientServeur();

  const [lieuxRes, evenementsRes, personnesRes, unionsRes] = await Promise.all([
    supabase
      .from('lieux')
      .select(
        'id, libelle, commune, departement, region, pays, pays_actuel, latitude, longitude, note'
      ),
    supabase
      .from('evenements')
      .select(
        'id, personne_id, union_id, type, annee, mois, jour, annee_fin, qualificatif, date_texte, lieu_id'
      ),
    supabase.from('personnes').select('id, nom_complet, prenoms, nom, branches'),
    supabase.from('unions').select('id, conjoint_a, conjoint_b'),
  ]);

  const erreur =
    lieuxRes.error ?? evenementsRes.error ?? personnesRes.error ?? unionsRes.error;
  if (erreur) throw new Error(`Chargement de la carte impossible : ${erreur.message}`);

  // --- Vocabulaire des personnes -------------------------------------------

  const personnes = new Map<string, { id: string; nom: string; cote: Cote }>();
  for (const personne of personnesRes.data ?? []) {
    personnes.set(personne.id, {
      id: personne.id,
      nom:
        personne.nom_complet?.trim() || personne.prenoms || personne.nom || 'Personne sans nom',
      cote: coteDesBranches(personne.branches ?? []),
    });
  }

  const conjoints = new Map<string, string[]>();
  for (const union of unionsRes.data ?? []) {
    conjoints.set(
      union.id,
      [union.conjoint_a, union.conjoint_b].filter((id): id is string => Boolean(id))
    );
  }

  // --- Tri des événements par lieu -----------------------------------------

  const tousLesLieux = lieuxRes.data ?? [];
  const situes = tousLesLieux.filter(
    (lieu): lieu is typeof lieu & { latitude: number; longitude: number } =>
      lieu.latitude !== null && lieu.longitude !== null
  );
  const idsSitues = new Set(situes.map((lieu) => lieu.id));

  const evenementsParLieu = new Map<string, EvenementAuLieu[]>();
  const evenementsParLieuManquant = new Map<string, number>();
  /** Passages datés de chaque personne, pour reconstituer ses déplacements. */
  const passages = new Map<string, { lieuId: string; annee: number; mois: number; jour: number }[]>();
  /** Année du premier événement d'une personne à un lieu donné. */
  const anneeParLieuPersonne = new Map<string, number>();
  /** Événement de naissance et de décès situés d'une personne, pour la vue flux. */
  const naissances = new Map<string, { lieuId: string; annee: number }>();
  const deces = new Map<string, { lieuId: string; annee: number }>();
  let nbEvenementsSansLieuSitue = 0;

  for (const evenement of evenementsRes.data ?? []) {
    if (!evenement.lieu_id) continue;

    if (!idsSitues.has(evenement.lieu_id)) {
      nbEvenementsSansLieuSitue += 1;
      evenementsParLieuManquant.set(
        evenement.lieu_id,
        (evenementsParLieuManquant.get(evenement.lieu_id) ?? 0) + 1
      );
      continue;
    }

    const identifiants = evenement.personne_id
      ? [evenement.personne_id]
      : conjoints.get(evenement.union_id ?? '') ?? [];
    const acteurs = identifiants
      .map((identifiant) => personnes.get(identifiant))
      .filter((personne): personne is { id: string; nom: string; cote: Cote } => personne !== undefined);

    const liste = evenementsParLieu.get(evenement.lieu_id) ?? [];
    liste.push({
      id: evenement.id,
      type: evenement.type,
      date: formaterDate(evenement),
      annee: evenement.annee,
      personnes: acteurs.map((acteur) => ({ id: acteur.id, nom: acteur.nom })),
    });
    evenementsParLieu.set(evenement.lieu_id, liste);

    if (evenement.annee !== null) {
      for (const acteur of acteurs) {
        const chemin = passages.get(acteur.id) ?? [];
        chemin.push({
          lieuId: evenement.lieu_id,
          annee: evenement.annee,
          mois: evenement.mois ?? 0,
          jour: evenement.jour ?? 0,
        });
        passages.set(acteur.id, chemin);

        const cle = `${acteur.id}|${evenement.lieu_id}`;
        const connue = anneeParLieuPersonne.get(cle);
        if (connue === undefined || evenement.annee < connue) {
          anneeParLieuPersonne.set(cle, evenement.annee);
        }
      }

      // Un événement d'union — mariage — n'a pas de personne_id directe : on
      // le passe pour la vue flux, qui parle d'une vie précise.
      if (evenement.personne_id) {
        if (evenement.type === 'naissance') {
          naissances.set(evenement.personne_id, {
            lieuId: evenement.lieu_id,
            annee: evenement.annee,
          });
        } else if (evenement.type === 'deces') {
          deces.set(evenement.personne_id, {
            lieuId: evenement.lieu_id,
            annee: evenement.annee,
          });
        }
      }
    }
  }

  // --- Déplacements ---------------------------------------------------------

  const deplacements: Deplacement[] = [];
  for (const [personneId, chemin] of passages) {
    const personne = personnes.get(personneId);
    if (!personne) continue;

    chemin.sort((a, b) => a.annee - b.annee || a.mois - b.mois || a.jour - b.jour);
    for (let index = 1; index < chemin.length; index += 1) {
      const precedent = chemin[index - 1];
      const courant = chemin[index];
      if (precedent.lieuId === courant.lieuId) continue;
      deplacements.push({
        id: `${personneId}-${index}`,
        personneId,
        nom: personne.nom,
        cote: personne.cote,
        deId: precedent.lieuId,
        versId: courant.lieuId,
        annee: courant.annee,
      });
    }
  }

  // --- Flux : de la naissance au décès -------------------------------------

  const flux: Flux[] = [];
  for (const [personneId, naissance] of naissances) {
    const finVie = deces.get(personneId);
    if (!finVie || finVie.lieuId === naissance.lieuId) continue;

    const personne = personnes.get(personneId);
    if (!personne) continue;

    flux.push({
      id: `flux-${personneId}`,
      personneId,
      nom: personne.nom,
      cote: personne.cote,
      naissanceId: naissance.lieuId,
      decesId: finVie.lieuId,
      anneeNaissance: naissance.annee,
      anneeDeces: finVie.annee,
    });
  }

  // --- Enrichissements : photos, faits, souvenirs ---------------------------

  const [photosParLieu, faitsParLieu, annotations, souvenirsParLieu] =
    await Promise.all([
      chargerPhotosParLieu(supabase, [...idsSitues]),
      chargerFaitsParLieu(supabase, [...idsSitues]),
      chargerAnnotations(supabase),
      chargerCompteSouvenirs(supabase, [...idsSitues]),
    ]);

  // --- Lieux situés ---------------------------------------------------------

  const lieux: LieuSitue[] = situes.map((lieu) => {
    const evenements = (evenementsParLieu.get(lieu.id) ?? []).sort(
      (a, b) => (a.annee ?? Number.MAX_SAFE_INTEGER) - (b.annee ?? Number.MAX_SAFE_INTEGER)
    );

    const parPersonne = new Map<string, PersonneAuLieu>();
    for (const evenement of evenements) {
      for (const acteur of evenement.personnes) {
        const connue = parPersonne.get(acteur.id);
        if (connue) {
          connue.nombre += 1;
          continue;
        }
        const details = personnes.get(acteur.id);
        parPersonne.set(acteur.id, {
          id: acteur.id,
          nom: acteur.nom,
          cote: details?.cote ?? 'commune',
          nombre: 1,
          premiereAnnee: anneeParLieuPersonne.get(`${acteur.id}|${lieu.id}`) ?? null,
        });
      }
    }

    const parCote: Record<Cote, number> = { paternelle: 0, maternelle: 0, commune: 0 };
    for (const personne of parPersonne.values()) parCote[personne.cote] += 1;

    const annees = evenements
      .map((evenement) => evenement.annee)
      .filter((annee): annee is number => annee !== null);

    const nom = lieuCourt(lieu.libelle) ?? lieu.libelle;
    const precision = lieu.libelle.slice(nom.length).replace(/^\s*,\s*/, '').trim();

    return {
      id: lieu.id,
      nom,
      libelle: lieu.libelle,
      precision: precision || null,
      pays: lieu.pays,
      paysActuel: lieu.pays_actuel,
      region: lieu.region,
      note: lieu.note,
      latitude: lieu.latitude,
      longitude: lieu.longitude,
      cote: coteDominant(parCote),
      parCote,
      evenements,
      personnes: [...parPersonne.values()].sort(
        (a, b) =>
          (a.premiereAnnee ?? Number.MAX_SAFE_INTEGER) -
            (b.premiereAnnee ?? Number.MAX_SAFE_INTEGER) ||
          b.nombre - a.nombre ||
          a.nom.localeCompare(b.nom, 'fr')
      ),
      anneeMin: annees.length > 0 ? Math.min(...annees) : null,
      anneeMax: annees.length > 0 ? Math.max(...annees) : null,
      nbSansDate: evenements.length - annees.length,
      photo: photosParLieu.get(lieu.id) ?? null,
      faits: faitsParLieu.get(lieu.id) ?? [],
      nbSouvenirs: souvenirsParLieu.get(lieu.id) ?? 0,
    };
  });

  // --- Bornes du temps ------------------------------------------------------

  const toutesLesAnnees = lieux
    .flatMap((lieu) => lieu.evenements.map((evenement) => evenement.annee))
    .filter((annee): annee is number => annee !== null)
    .sort((a, b) => a - b);

  const anneeMin = toutesLesAnnees[0] ?? 1800;
  const anneeMax = toutesLesAnnees[toutesLesAnnees.length - 1] ?? new Date().getFullYear();

  const manquants: LieuManquant[] = tousLesLieux
    .filter((lieu) => !idsSitues.has(lieu.id))
    .map((lieu) => ({
      id: lieu.id,
      nom: lieuCourt(lieu.libelle) ?? lieu.libelle,
      libelle: lieu.libelle,
      nbEvenements: evenementsParLieuManquant.get(lieu.id) ?? 0,
    }))
    .sort((a, b) => b.nbEvenements - a.nbEvenements || a.nom.localeCompare(b.nom, 'fr'));

  return {
    carte: {
      lieux,
      deplacements,
      flux,
      annotations,
      annees: toutesLesAnnees,
      anneeMin,
      anneeMax,
    },
    nbLieux: tousLesLieux.length,
    manquants,
    nbEvenementsSansLieuSitue,
  };
}

// ---------------------------------------------------------------------------
// Enrichissements
// ---------------------------------------------------------------------------

type ClientArbre = Awaited<ReturnType<typeof creerClientServeur>>;

/**
 * Une photo par lieu, choisie parmi les médias explicitement rattachés à ce
 * lieu. Le bucket est privé : chaque chemin est signé pour l'heure qui vient.
 * Ne renvoie que ce qui a pu être signé ; le reste retombe sur « pas de photo ».
 */
async function chargerPhotosParLieu(
  supabase: ClientArbre,
  idsSitues: string[]
): Promise<Map<string, PhotoLieu>> {
  const photos = new Map<string, PhotoLieu>();
  if (idsSitues.length === 0) return photos;

  const { data, error } = await supabase
    .from('medias')
    .select('id, chemin, titre, type, lieu_id, annee, largeur, hauteur, statut')
    .eq('type', 'photo')
    .eq('statut', 'publie')
    .in('lieu_id', idsSitues);

  if (error) {
    if (tableAbsente(error)) return photos;
    throw new Error(`Chargement des photos de lieux impossible : ${error.message}`);
  }

  // Une seule photo par lieu suffit à l'illustrer. On garde la plus ancienne
  // datée, à défaut la première venue.
  const choisies = new Map<string, { id: string; chemin: string; titre: string | null; largeur: number | null; hauteur: number | null; annee: number | null }>();
  for (const ligne of data ?? []) {
    if (!ligne.lieu_id) continue;
    const connue = choisies.get(ligne.lieu_id);
    const meilleure =
      !connue ||
      (ligne.annee !== null &&
        (connue.annee === null || ligne.annee < connue.annee));
    if (meilleure) {
      choisies.set(ligne.lieu_id, {
        id: ligne.id,
        chemin: ligne.chemin,
        titre: ligne.titre,
        largeur: ligne.largeur,
        hauteur: ligne.hauteur,
        annee: ligne.annee,
      });
    }
  }

  const chemins = [...choisies.values()].map((c) => c.chemin);
  if (chemins.length === 0) return photos;

  const { data: signees } = await supabase.storage
    .from(BUCKET_MEDIAS)
    .createSignedUrls(chemins, DUREE_SIGNATURE);
  const urls = new Map<string, string>();
  for (const entree of signees ?? []) {
    if (entree.path && entree.signedUrl) urls.set(entree.path, entree.signedUrl);
  }

  for (const [lieuId, media] of choisies) {
    const url = urls.get(media.chemin);
    if (!url) continue;
    photos.set(lieuId, {
      id: media.id,
      titre: media.titre,
      url,
      largeur: media.largeur,
      hauteur: media.hauteur,
    });
  }

  return photos;
}

/**
 * Les faits de la grande Histoire rattachés à chaque lieu situé. Les faits
 * sans lieu identifié ne comptent pas ici : ils apparaissent en revanche
 * dans les annotations du curseur si leur portée passe le monde ou la nation.
 */
async function chargerFaitsParLieu(
  supabase: ClientArbre,
  idsSitues: string[]
): Promise<Map<string, FaitLocal[]>> {
  const parLieu = new Map<string, FaitLocal[]>();
  if (idsSitues.length === 0) return parLieu;

  const { data, error } = await supabase
    .from('faits_historiques')
    .select('id, titre, annee_debut, annee_fin, lieu_id')
    .in('lieu_id', idsSitues)
    .order('annee_debut', { ascending: true });

  if (error) {
    if (tableAbsente(error)) return parLieu;
    throw new Error(`Chargement des faits locaux impossible : ${error.message}`);
  }

  for (const ligne of data ?? []) {
    if (!ligne.lieu_id) continue;
    const liste = parLieu.get(ligne.lieu_id) ?? [];
    liste.push({
      id: ligne.id,
      titre: ligne.titre,
      annee: ligne.annee_debut,
      dateTexte:
        ligne.annee_fin && ligne.annee_fin !== ligne.annee_debut
          ? `${ligne.annee_debut} – ${ligne.annee_fin}`
          : String(ligne.annee_debut),
    });
    parLieu.set(ligne.lieu_id, liste);
  }
  return parLieu;
}

/** Nombre de souvenirs qui mentionnent explicitement chacun des lieux situés. */
async function chargerCompteSouvenirs(
  supabase: ClientArbre,
  idsSitues: string[]
): Promise<Map<string, number>> {
  const compte = new Map<string, number>();
  if (idsSitues.length === 0) return compte;

  const { data, error } = await supabase
    .from('souvenirs')
    .select('lieu_id')
    .in('lieu_id', idsSitues);

  if (error) {
    if (tableAbsente(error)) return compte;
    throw new Error(`Chargement des souvenirs par lieu impossible : ${error.message}`);
  }

  for (const ligne of data ?? []) {
    if (!ligne.lieu_id) continue;
    compte.set(ligne.lieu_id, (compte.get(ligne.lieu_id) ?? 0) + 1);
  }
  return compte;
}

/**
 * Les jalons de la grande Histoire à révéler au passage du curseur : les faits
 * de portée mondiale ou nationale d'abord, puis les faits régionaux si la
 * frise reste maigre. Les faits familiaux, eux, ne remontent jamais : ils sont
 * déjà dits ailleurs.
 */
async function chargerAnnotations(supabase: ClientArbre): Promise<AnnotationTemps[]> {
  const { data, error } = await supabase
    .from('faits_historiques')
    .select('id, titre, annee_debut, portee')
    .in('portee', ['mondial', 'national', 'regional', 'local'])
    .order('annee_debut', { ascending: true });

  if (error) {
    if (tableAbsente(error)) return [];
    throw new Error(`Chargement des annotations impossible : ${error.message}`);
  }

  // Un seul jalon par année : sinon la frise se marche dessus. Le premier
  // fait rencontré l'emporte — la requête est déjà triée par année.
  const parAnnee = new Map<number, AnnotationTemps>();
  for (const ligne of data ?? []) {
    if (parAnnee.has(ligne.annee_debut)) continue;
    parAnnee.set(ligne.annee_debut, {
      annee: ligne.annee_debut,
      texte: ligne.titre,
      faitId: ligne.id,
    });
  }
  return [...parAnnee.values()];
}

/** La branche qui domine un lieu ; « commune » dès que les deux s'y croisent. */
function coteDominant(parCote: Record<Cote, number>): Cote {
  if (parCote.paternelle > 0 && parCote.maternelle > 0) return 'commune';
  if (parCote.paternelle > 0) return 'paternelle';
  if (parCote.maternelle > 0) return 'maternelle';
  return 'commune';
}

const pluriel = (nombre: number) => (nombre > 1 ? 's' : '');

export default async function PageCarte() {
  const { carte, nbLieux, manquants, nbEvenementsSansLieuSitue } = await chargerCarte();
  const nbSitues = carte.lieux.length;

  return (
    <>
      <Navigation />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col gap-1 border-b border-bordure px-4 py-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4">
          <h1 className="text-xl leading-none">Les lieux et les migrations</h1>
          <p className="text-sm text-encre-douce">
            Les libellés sont ceux des actes : les communes changent de nom, les frontières
            bougent. Le pays d’aujourd’hui est rappelé quand il a changé.
          </p>
        </div>

        <EcranCarte donnees={carte} />

        <footer className="shrink-0 border-t border-bordure px-4 py-2.5 text-xs text-encre-douce">
          <p>
            {nbLieux === 0 ? (
              <>Aucun lieu n’a encore été saisi.</>
            ) : nbSitues === 0 ? (
              <>
                <span className="tabular-nums">{nbLieux}</span> lieu
                {pluriel(nbLieux)} {nbLieux > 1 ? 'sont saisis' : 'est saisi'}, aucun
                n’est encore situé.
              </>
            ) : (
              <>
                <span className="tabular-nums">{nbSitues}</span> lieu{pluriel(nbSitues)} sur{' '}
                <span className="tabular-nums">{nbLieux}</span> {nbSitues > 1 ? 'sont situés' : 'est situé'}.
              </>
            )}
            {manquants.length > 0 && (
              <>
                {' '}
                Les <span className="tabular-nums">{manquants.length}</span> autres n’ont pas encore
                de coordonnées — libellé trop vague, hameau rattaché depuis, commune disparue — et{' '}
                <span className="tabular-nums">{nbEvenementsSansLieuSitue}</span> événement
                {pluriel(nbEvenementsSansLieuSitue)} s’y rattache{nbEvenementsSansLieuSitue > 1 ? 'nt' : ''}{' '}
                sans pouvoir être placé{pluriel(nbEvenementsSansLieuSitue)} ici.
              </>
            )}
          </p>

          {manquants.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-encre-tres-douce hover:text-encre">
                Voir les lieux qui restent à situer
              </summary>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {manquants.map((lieu) => (
                  <li key={lieu.id} className="text-encre-tres-douce">
                    {lieu.nom}
                    {lieu.nbEvenements > 0 && (
                      <span className="tabular-nums"> ({lieu.nbEvenements})</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </footer>
      </main>
    </>
  );
}
