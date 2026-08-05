import { Navigation } from '@/components/navigation';
import { Alerte } from '@/components/ui/champs';
import { FriseChronologie } from '@/components/chronologie/frise-chronologie';
import { BandeauLignee, type ResumeLignee } from '@/components/chronologie/bandeau-lignee';
import { ChoixLignee, type PersonneChoisissable } from '@/components/chronologie/choix-lignee';
import {
  anneesDeVie,
  bornesDeVie,
  chevauchePeriode,
  concerneLaLignee,
  construireRelations,
  ensembleDeLaPortee,
  lirePortee,
  periodeDesAnnees,
  perimetreDeLEnsemble,
  type PorteeLignee,
} from '@/components/chronologie/lignee';
import {
  anneeDeLaCle,
  cleDeTri,
  type EntreeChronologie,
  type PersonneCitee,
} from '@/components/chronologie/vocabulaire';
import { coteDesBranches } from '@/lib/branches';
import { formaterDate, lieuCourt } from '@/lib/arbre';
import { creerClientServeur } from '@/lib/supabase/server';
import type { PorteeFait, Sexe, TypeEvenement } from '@/lib/types-base';

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
 */

export const metadata = { title: 'Chronologie' };

// Une correction de date ou un souvenir déposé doit se voir à la visite suivante.
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
          'id, personne_id, union_id, type, libelle, detail, date_texte, annee, mois, jour, annee_fin, qualificatif, date_tri, lieux(libelle, pays)'
        )
        .order('date_tri', { ascending: true, nullsFirst: false }),
      supabase.from('personnes').select('id, nom_complet, prenoms, nom, sexe, branches'),
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
  for (const p of personnesRes.data ?? []) {
    nomParPersonne.set(p.id, p.nom_complet?.trim() || p.prenoms || p.nom || 'Inconnu');
    sexeParPersonne.set(p.id, p.sexe);
    branchesParPersonne.set(p.id, p.branches ?? []);
  }

  const unionsParId = new Map(
    (unionsRes.data ?? []).map((u) => [
      u.id,
      { conjoints: [u.conjoint_a, u.conjoint_b], branches: u.branches ?? [] },
    ])
  );

  // Naissance et décès de chacun : ils servent au bandeau et à départager les
  // homonymes dans la liste de choix.
  const naissances = new Map<string, number>();
  const deces = new Map<string, number>();
  for (const e of evenements) {
    if (!e.personne_id || e.annee === null) continue;
    if (e.type === 'naissance' && !naissances.has(e.personne_id)) {
      naissances.set(e.personne_id, e.annee);
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
    });
  }

  // `date_tri` est la clé de la base ; les deux fils sont remis dans un seul
  // ordre ici. Les entrées sans année portent une clé vide : elles se rangent
  // en tête du tableau, et la frise les renvoie en fin de page.
  entrees.sort((a, b) => (a.tri < b.tri ? -1 : a.tri > b.tri ? 1 : 0));

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
      <Navigation />
      <main className="flex-1 pb-24">
        <FriseChronologie
          entrees={entrees}
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
  return `${dernierPoint > max * 0.5 ? coupe.slice(0, dernierPoint + 1) : coupe}…`;
}
