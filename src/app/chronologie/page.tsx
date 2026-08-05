import { Navigation } from '@/components/navigation';
import { Alerte } from '@/components/ui/champs';
import { BarreScroll } from '@/components/interactions/barre-scroll';
import { RaccourciAccueil } from '@/components/interactions/raccourci-accueil';
import { FriseChronologie } from '@/components/chronologie/frise-chronologie';
import { BandeauLignee, type ResumeLignee } from '@/components/chronologie/bandeau-lignee';
import { ChoixLignee, type PersonneChoisissable } from '@/components/chronologie/choix-lignee';
import {
  anneesDeVie,
  bornesDeVie,
  chevauchePeriode,
  concerneLaLignee,
  construireRelations,
  descendre,
  ensembleDeLaPortee,
  lirePortee,
  periodeDesAnnees,
  perimetreDeLEnsemble,
  type PorteeLignee,
  type RelationsFamille,
} from '@/components/chronologie/lignee';
import {
  anneeDeLaCle,
  cleDeTri,
  type EntreeChronologie,
  type MotifRemarquable,
  type PersonneCitee,
} from '@/components/chronologie/vocabulaire';
import type { Portrait } from '@/components/portrait/types';
import { coteDesBranches } from '@/lib/branches';
import { formaterDate, lieuCourt } from '@/lib/arbre';
import { creerClientServeur } from '@/lib/supabase/server';
import type { NiveauPreuve, PorteeFait, Sexe, TypeEvenement } from '@/lib/types-base';

/**
 * La chronologie.
 *
 * Deux fils descendent la même colonne : la vie de la famille, telle que les
 * actes l'ont enregistrée, et la grande Histoire qui l'a traversée. Tout est
 * assemblé et mis en forme ici, côté serveur — la base garde les dates en
 * morceaux, et `formaterDate` est la seule à savoir les recoller. Le composant
 * client ne reçoit donc que du texte prêt à lire, et filtre sans requête.
 *
 * La page se resserre sur quelqu'un par l'adresse : `?personne=<uuid>` et
 * `?portee=lignee|proche|toute`. Le choix vit dans l'URL et nulle part
 * ailleurs — il se partage entre cousins, se met en favori, et survit au
 * rechargement. Le calcul de la lignée est un parcours de graphe, tenu à part
 * dans `@/components/chronologie/lignee`.
 *
 * Deux enrichissements sont calculés en même temps que la frise elle-même :
 *  — le meilleur niveau de preuve de chaque événement, pour distinguer d'un
 *    coup d'œil ce que la famille a en main d'un acte de ce qu'elle tient
 *    encore de mémoire ;
 *  — les repères marquants : la mort d'un aïeul dont descend un large pan de
 *    l'arbre, et la première apparition d'un lieu jusqu'alors inconnu de la
 *    famille — ces deux moments où la géographie de la famille tourne.
 */

export const metadata = { title: 'Chronologie' };

// Une correction de date ou un souvenir déposé doit se voir à la visite suivante.
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Seuil au-delà duquel un ancêtre est dit remarquable par sa descendance. */
const SEUIL_ANCETRE = 8;

type LieuJoint = { libelle: string; pays: string | null } | null;

type LigneEvenement = {
  id: string;
  personne_id: string | null;
  union_id: string | null;
  type: TypeEvenement;
  libelle: string | null;
  detail: string | null;
  date_texte: string | null;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  annee_fin: number | null;
  qualificatif: string | null;
  niveau_preuve: NiveauPreuve | null;
  date_tri: string | null;
  lieux: LieuJoint;
};

type LigneFait = {
  id: string;
  titre: string;
  resume: string | null;
  description: string | null;
  annee_debut: number;
  mois_debut: number | null;
  jour_debut: number | null;
  annee_fin: number | null;
  lieu_libre: string | null;
  portee: PorteeFait;
  branche: string | null;
  source_url: string | null;
  lieux: LieuJoint;
};

export default async function PageChronologie({ searchParams }: PageProps<'/chronologie'>) {
  const parametres = await searchParams;
  const demandee = premier(parametres.personne);
  const porteeDemandee = lirePortee(premier(parametres.portee));

  const supabase = await creerClientServeur();

  const [evenementsRes, personnesRes, unionsRes, filiationsRes, faitsRes, faitsPersonnesRes] =
    await Promise.all([
      supabase
        .from('evenements')
        .select(
          'id, personne_id, union_id, type, libelle, detail, date_texte, annee, mois, jour, annee_fin, qualificatif, niveau_preuve, date_tri, lieux(libelle, pays)'
        )
        .order('date_tri', { ascending: true, nullsFirst: false }),
      supabase.from('personnes').select('id, nom_complet, prenoms, nom, surnom, sexe, branches'),
      supabase.from('unions').select('id, conjoint_a, conjoint_b, branches'),
      supabase.from('filiations').select('union_id, enfant_id'),
      supabase
        .from('faits_historiques')
        .select(
          'id, titre, resume, description, annee_debut, mois_debut, jour_debut, annee_fin, lieu_libre, portee, branche, source_url, lieux(libelle, pays)'
        )
        .order('annee_debut', { ascending: true }),
      supabase.from('faits_personnes').select('fait_id, personne_id'),
    ]);

  const erreur =
    evenementsRes.error ??
    personnesRes.error ??
    unionsRes.error ??
    filiationsRes.error ??
    faitsRes.error ??
    faitsPersonnesRes.error;

  if (erreur) {
    console.error('Chronologie : chargement impossible.', erreur.message);
    return (
      <>
        <RaccourciAccueil />
        <Navigation />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
          <h1 className="text-3xl">Chronologie</h1>
          <div className="mt-4">
            <Alerte ton="erreur">
              La frise n’a pas pu être chargée. Réessayez dans un instant ; si cela
              persiste, prévenez un administrateur.
            </Alerte>
          </div>
        </main>
      </>
    );
  }

  const evenements = (evenementsRes.data ?? []) as unknown as LigneEvenement[];

  // --- Index ---------------------------------------------------------------

  const nomParPersonne = new Map<string, string>();
  const sexeParPersonne = new Map<string, Sexe>();
  const branchesParPersonne = new Map<string, string[]>();
  const surnomParPersonne = new Map<string, string | null>();
  for (const p of personnesRes.data ?? []) {
    nomParPersonne.set(p.id, p.nom_complet?.trim() || p.prenoms || p.nom || 'Inconnu');
    sexeParPersonne.set(p.id, p.sexe);
    branchesParPersonne.set(p.id, p.branches ?? []);
    surnomParPersonne.set(p.id, p.surnom);
  }

  const unionsParId = new Map(
    (unionsRes.data ?? []).map((u) => [
      u.id,
      { conjoints: [u.conjoint_a, u.conjoint_b], branches: u.branches ?? [] },
    ])
  );

  // Naissance et décès de chacun : ils servent au bandeau, aux portraits et à
  // départager les homonymes dans la liste de choix.
  const naissances = new Map<string, number>();
  const naissancesLieu = new Map<string, string | null>();
  const deces = new Map<string, number>();
  for (const e of evenements) {
    if (!e.personne_id || e.annee === null) continue;
    if (e.type === 'naissance' && !naissances.has(e.personne_id)) {
      naissances.set(e.personne_id, e.annee);
      naissancesLieu.set(e.personne_id, e.lieux ? lieuCourt(e.lieux.libelle) : null);
    } else if (e.type === 'deces' && !deces.has(e.personne_id)) {
      deces.set(e.personne_id, e.annee);
    }
  }

  // --- Sur qui la frise se referme -----------------------------------------

  // Une personne inconnue de la base — identifiant périmé, fiche masquée par
  // les politiques de lecture — ne fait pas d'erreur : on montre la famille.
  const personneChoisie =
    demandee && UUID.test(demandee) && nomParPersonne.has(demandee) ? demandee : null;

  const portee: PorteeLignee = personneChoisie ? porteeDemandee : 'toute';

  const relations = construireRelations(unionsRes.data ?? [], filiationsRes.data ?? []);
  const ensemble = personneChoisie
    ? ensembleDeLaPortee(relations, personneChoisie, portee)
    : null;
  const perimetre = ensemble ? perimetreDeLEnsemble(relations, ensemble) : null;

  // --- Ancêtres à large descendance ----------------------------------------

  const descendantsPar = calculerDescendants(relations, nomParPersonne.keys());

  // --- Le fil de la famille -------------------------------------------------

  const entrees: EntreeChronologie[] = [];

  for (const e of evenements) {
    if (perimetre && !concerneLaLignee(perimetre, e.personne_id, e.union_id)) continue;

    const union = e.union_id ? unionsParId.get(e.union_id) : undefined;

    const identifiants = e.personne_id
      ? [e.personne_id]
      : (union?.conjoints ?? []).filter((id): id is string => Boolean(id));

    const personnes: PersonneCitee[] = identifiants
      .filter((id) => nomParPersonne.has(id))
      .map((id) => ({ id, nom: nomParPersonne.get(id) ?? 'Inconnu' }));

    // Le côté se lit sur les personnes concernées, et sur l'union pour un mariage.
    const codes = new Set<string>(union?.branches ?? []);
    for (const id of identifiants) {
      for (const code of branchesParPersonne.get(id) ?? []) codes.add(code);
    }

    const tri = e.date_tri ?? cleDeTri(e.annee, e.mois, e.jour);

    entrees.push({
      cle: `evenement-${e.id}`,
      nature: 'famille',
      tri,
      annee: e.annee ?? anneeDeLaCle(tri),
      dateTexte: formaterDate(e),
      titre: e.libelle?.trim() || null,
      detail: abreger(e.detail),
      lieu: nommerLieu(e.lieux, null),
      cote: codes.size > 0 ? coteDesBranches([...codes]) : null,
      type: e.type,
      portee: null,
      personnes,
      sourceUrl: null,
      niveauPreuve: e.niveau_preuve,
      remarquable: null,
    });
  }

  const nombreEvenements = entrees.length;

  // --- Le fil de la grande Histoire ----------------------------------------

  // Une lignée ne traverse qu'un morceau du temps : montrer la guerre d'Algérie
  // sous quelqu'un mort en 1812 n'apprendrait rien à personne. La période est
  // celle que les événements retenus couvrent réellement.
  const periode = perimetre ? periodeDesAnnees(entrees.map((entree) => entree.annee)) : null;

  // Un fait expressément rattaché à quelqu'un de la lignée reste montré même
  // s'il déborde : le lien a été posé à la main, il vaut mieux qu'un calcul.
  const faitsRattaches = new Set<string>();
  if (perimetre) {
    for (const lien of faitsPersonnesRes.data ?? []) {
      if (perimetre.personnes.has(lien.personne_id)) faitsRattaches.add(lien.fait_id);
    }
  }

  for (const f of (faitsRes.data ?? []) as unknown as LigneFait[]) {
    if (
      perimetre &&
      !faitsRattaches.has(f.id) &&
      !chevauchePeriode(periode, f.annee_debut, f.annee_fin)
    ) {
      continue;
    }

    const periodeDuFait =
      f.annee_fin && f.annee_fin !== f.annee_debut
        ? `${f.annee_debut} – ${f.annee_fin}`
        : formaterDate({ annee: f.annee_debut, mois: f.mois_debut, jour: f.jour_debut });

    entrees.push({
      cle: `fait-${f.id}`,
      nature: 'histoire',
      tri: cleDeTri(f.annee_debut, f.mois_debut, f.jour_debut),
      annee: f.annee_debut,
      dateTexte: periodeDuFait,
      titre: f.titre,
      detail: abreger(f.resume ?? f.description),
      lieu: nommerLieu(f.lieux, f.lieu_libre),
      cote: f.branche ? coteDesBranches([f.branche]) : null,
      type: null,
      portee: f.portee,
      personnes: [],
      sourceUrl: f.source_url,
      niveauPreuve: null,
      remarquable: null,
    });
  }

  // `date_tri` est la clé de la base ; les deux fils sont remis dans un seul
  // ordre ici. Les entrées sans année portent une clé vide : elles se rangent
  // en tête du tableau, et la frise les renvoie en fin de page.
  entrees.sort((a, b) => (a.tri < b.tri ? -1 : a.tri > b.tri ? 1 : 0));

  marquerRemarquables(entrees, descendantsPar);

  // --- Portraits pour le tiroir de contextualisation -----------------------

  const portraits = new Map<string, Portrait>();
  for (const [id, nom] of nomParPersonne) {
    portraits.set(id, {
      id,
      nomComplet: nom,
      surnom: surnomParPersonne.get(id) ?? null,
      sexe: sexeParPersonne.get(id) ?? 'inconnu',
      branches: branchesParPersonne.get(id) ?? [],
      anneeNaissance: naissances.get(id) ?? null,
      anneeDeces: deces.get(id) ?? null,
      lieuNaissance: naissancesLieu.get(id) ?? null,
    });
  }

  // --- De quoi choisir, et savoir qui l'on suit -----------------------------

  const choisissables: PersonneChoisissable[] = [...nomParPersonne.entries()]
    .map(([id, nom]) => {
      const bornes = bornesDeVie(naissances.get(id) ?? null, deces.get(id) ?? null);
      return { id, libelle: bornes ? `${nom} (${bornes})` : nom };
    })
    .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));

  const resume: ResumeLignee | null =
    personneChoisie && ensemble
      ? {
          personneId: personneChoisie,
          nom: nomParPersonne.get(personneChoisie) ?? 'Inconnu',
          annees: anneesDeVie(
            naissances.get(personneChoisie) ?? null,
            deces.get(personneChoisie) ?? null,
            sexeParPersonne.get(personneChoisie) ?? 'inconnu'
          ),
          portee: ensemble.portee,
          generationsRemontees: ensemble.generationsRemontees,
          generationsDescendues: ensemble.generationsDescendues,
          nombrePersonnes: [...ensemble.personnes].filter((id) => nomParPersonne.has(id)).length,
          nombreEvenements,
          nombreFaits: entrees.length - nombreEvenements,
          periode,
        }
      : null;

  return (
    <>
      <BarreScroll />
      <RaccourciAccueil />
      <Navigation />
      <main className="flex-1 pb-24">
        <FriseChronologie
          entrees={entrees}
          portraits={portraits}
          messageVide={
            resume
              ? 'Aucune date n’est encore enregistrée pour cette lignée. Revenez à la famille entière, ou attendez qu’un acte vienne la dater.'
              : undefined
          }
          enTete={
            <>
              {resume && <BandeauLignee resume={resume} />}
              <ChoixLignee
                personnes={choisissables}
                personneId={personneChoisie}
                portee={porteeDemandee}
                resserree={resume !== null}
              />
            </>
          }
        />
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Lecture de l'adresse
// ---------------------------------------------------------------------------

function premier(valeur: string | string[] | undefined): string | null {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  const propre = (brut ?? '').trim();
  return propre === '' ? null : propre;
}

// ---------------------------------------------------------------------------
// Ancêtres à large descendance
// ---------------------------------------------------------------------------

/**
 * Compte, pour chaque personne, sa descendance connue — au sens large : tout
 * enfant, petit-enfant, arrière-petit-enfant… qu'on retrouve par parenté.
 *
 * La famille est petite (moins de deux cents personnes), un parcours en
 * largeur par personne suffit sans qu'il faille un cache. On préserve toutefois
 * la correction en présence de boucles — deux cousins qui se marient
 * referment un cycle — grâce à l'ensemble « vus » propre à chaque parcours.
 */
function calculerDescendants(
  relations: RelationsFamille,
  identifiants: Iterable<string>
): Map<string, number> {
  const total = new Map<string, number>();
  for (const id of identifiants) {
    const atteints = descendre(relations, id);
    // `descendre` compte la personne de départ ; on la retire pour ne parler
    // que de sa descendance.
    total.set(id, Math.max(0, atteints.size - 1));
  }
  return total;
}

// ---------------------------------------------------------------------------
// Repères marquants
// ---------------------------------------------------------------------------

/**
 * Repère, sur la frise déjà triée, ce qui mérite un liseré distinctif : la
 * mort d'un aïeul à large descendance, et la première apparition d'un lieu.
 *
 * L'ordre chronologique compte : une commune n'est nouvelle que si on ne l'a
 * jamais vue en amont sur la frise. Ce marquage se fait donc après le tri
 * final, en une seule passe.
 */
function marquerRemarquables(
  entrees: EntreeChronologie[],
  descendantsPar: Map<string, number>
): void {
  const lieuxVus = new Set<string>();

  for (const entree of entrees) {
    if (entree.nature !== 'famille') continue;

    let motif: MotifRemarquable | null = null;

    // Décès d'un aïeul à large descendance.
    if (entree.type === 'deces') {
      for (const personne of entree.personnes) {
        const n = descendantsPar.get(personne.id) ?? 0;
        if (n >= SEUIL_ANCETRE) {
          motif = 'ancetre';
          break;
        }
      }
    }

    // Première apparition d'un lieu, tous types d'événements confondus : une
    // arrivée peut être une naissance sur place, une émigration, une résidence
    // nouvelle. On ne l'annonce qu'une seule fois par lieu.
    if (entree.lieu) {
      const cle = normaliserLieu(entree.lieu);
      if (!lieuxVus.has(cle)) {
        lieuxVus.add(cle);
        // On laisse la priorité au motif d'aïeul quand les deux tombent
        // ensemble : c'est le plus rare et le plus parlant à la lecture.
        if (motif === null) motif = 'arrivee';
      }
    }

    if (motif) entree.remarquable = motif;
  }
}

function normaliserLieu(libelle: string): string {
  return libelle
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Mise en forme
// ---------------------------------------------------------------------------

/**
 * « La Sénia (Algérie) ». Le lieu-dit suffit à situer, le pays raconte les
 * départs : une famille qui traverse la Méditerranée le fait voir.
 */
function nommerLieu(lieu: LieuJoint, libre: string | null): string | null {
  if (!lieu) return libre?.trim() || null;

  const court = lieuCourt(lieu.libelle) ?? lieu.libelle;
  const pays = lieu.pays?.trim();
  if (!pays || pays.toLowerCase() === court.toLowerCase()) return court;
  return `${court} (${pays})`;
}

/** Coupe au dernier point avant la limite, pour ne pas trancher une phrase. */
function abreger(texte: string | null, max = 260): string | null {
  const propre = texte?.trim();
  if (!propre) return null;
  if (propre.length <= max) return propre;

  const coupe = propre.slice(0, max);
  const dernierPoint = coupe.lastIndexOf('.');
  // Si on tronque exactement à un point de phrase, ne pas doubler la
  // ponctuation par « …» : le point suffit à marquer la coupure.
  if (dernierPoint > max * 0.5) return coupe.slice(0, dernierPoint + 1);
  return `${coupe}…`;
}
