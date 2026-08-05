import { Navigation } from '@/components/navigation';
import { Alerte } from '@/components/ui/champs';
import { FriseChronologie } from '@/components/chronologie/frise-chronologie';
import {
  anneeDeLaCle,
  cleDeTri,
  type EntreeChronologie,
  type PersonneCitee,
} from '@/components/chronologie/vocabulaire';
import { coteDesBranches } from '@/lib/branches';
import { formaterDate, lieuCourt } from '@/lib/arbre';
import { creerClientServeur } from '@/lib/supabase/server';
import type { PorteeFait, TypeEvenement } from '@/lib/types-base';

/**
 * La chronologie.
 *
 * Deux fils descendent la même colonne : la vie de la famille, telle que les
 * actes l'ont enregistrée, et la grande Histoire qui l'a traversée. Tout est
 * assemblé et mis en forme ici, côté serveur — la base garde les dates en
 * morceaux, et `formaterDate` est la seule à savoir les recoller. Le composant
 * client ne reçoit donc que du texte prêt à lire, et filtre sans requête.
 */

export const metadata = { title: 'Chronologie' };

// Une correction de date ou un souvenir déposé doit se voir à la visite suivante.
export const dynamic = 'force-dynamic';

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

export default async function PageChronologie() {
  const supabase = await creerClientServeur();

  const [evenementsRes, personnesRes, unionsRes, faitsRes] = await Promise.all([
    supabase
      .from('evenements')
      .select(
        'id, personne_id, union_id, type, libelle, detail, date_texte, annee, mois, jour, annee_fin, qualificatif, date_tri, lieux(libelle, pays)'
      )
      .order('date_tri', { ascending: true, nullsFirst: false }),
    supabase.from('personnes').select('id, nom_complet, prenoms, nom, branches'),
    supabase.from('unions').select('id, conjoint_a, conjoint_b, branches'),
    supabase
      .from('faits_historiques')
      .select(
        'id, titre, resume, description, annee_debut, mois_debut, jour_debut, annee_fin, lieu_libre, portee, branche, source_url, lieux(libelle, pays)'
      )
      .order('annee_debut', { ascending: true }),
  ]);

  const erreur =
    evenementsRes.error ?? personnesRes.error ?? unionsRes.error ?? faitsRes.error;

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

  // --- Index ---------------------------------------------------------------

  const nomParPersonne = new Map<string, string>();
  const branchesParPersonne = new Map<string, string[]>();
  for (const p of personnesRes.data ?? []) {
    nomParPersonne.set(p.id, p.nom_complet?.trim() || p.prenoms || p.nom || 'Inconnu');
    branchesParPersonne.set(p.id, p.branches ?? []);
  }

  const unionsParId = new Map(
    (unionsRes.data ?? []).map((u) => [
      u.id,
      { conjoints: [u.conjoint_a, u.conjoint_b], branches: u.branches ?? [] },
    ])
  );

  // --- Le fil de la famille -------------------------------------------------

  const entrees: EntreeChronologie[] = [];

  for (const e of (evenementsRes.data ?? []) as unknown as LigneEvenement[]) {
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

  // --- Le fil de la grande Histoire ----------------------------------------

  for (const f of (faitsRes.data ?? []) as unknown as LigneFait[]) {
    const periode =
      f.annee_fin && f.annee_fin !== f.annee_debut
        ? `${f.annee_debut} – ${f.annee_fin}`
        : formaterDate({ annee: f.annee_debut, mois: f.mois_debut, jour: f.jour_debut });

    entrees.push({
      cle: `fait-${f.id}`,
      nature: 'histoire',
      tri: cleDeTri(f.annee_debut, f.mois_debut, f.jour_debut),
      annee: f.annee_debut,
      dateTexte: periode,
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

  if (entrees.length === 0) {
    return (
      <>
        <Navigation />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
          <h1 className="text-3xl">Chronologie</h1>
          <p className="mt-3 text-encre-douce">
            Aucun événement n’est encore enregistré. La frise se remplira dès que
            les premières dates seront versées dans la base.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="flex-1 pb-24">
        <FriseChronologie entrees={entrees} />
      </main>
    </>
  );
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
