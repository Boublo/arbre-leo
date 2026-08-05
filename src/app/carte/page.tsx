import { Navigation } from '@/components/navigation';
import { EcranCarte } from '@/components/carte/ecran-carte';
import type {
  Deplacement,
  DonneesCarte,
  EvenementAuLieu,
  LieuSitue,
  PersonneAuLieu,
} from '@/components/carte/types-carte';
import { formaterDate, lieuCourt } from '@/lib/arbre';
import { coteDesBranches, type Cote } from '@/lib/branches';
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

/**
 * Rassemble ce qu'il faut pour la carte : les lieux situés, ce qui s'y est
 * passé, et le chemin que chaque personne a suivi d'un lieu au suivant. Tout
 * est fait ici, sur le serveur, pour n'envoyer au navigateur que des données
 * déjà en forme.
 */
async function chargerCarte(): Promise<Chargement> {
  const supabase = await creerClientServeur();

  const [lieuxRes, evenementsRes, personnesRes, unionsRes] = await Promise.all([
    supabase
      .from('lieux')
      .select('id, libelle, commune, departement, region, pays, pays_actuel, latitude, longitude, note'),
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
      note: lieu.note,
      latitude: lieu.latitude,
      longitude: lieu.longitude,
      cote: coteDominant(parCote),
      parCote,
      evenements,
      personnes: [...parPersonne.values()].sort((a, b) => b.nombre - a.nombre || a.nom.localeCompare(b.nom, 'fr')),
      anneeMin: annees.length > 0 ? Math.min(...annees) : null,
      anneeMax: annees.length > 0 ? Math.max(...annees) : null,
      nbSansDate: evenements.length - annees.length,
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
    carte: { lieux, deplacements, annees: toutesLesAnnees, anneeMin, anneeMax },
    nbLieux: tousLesLieux.length,
    manquants,
    nbEvenementsSansLieuSitue,
  };
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
        <div className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-bordure px-4 py-3">
          <h1 className="text-xl leading-none">Les lieux et les migrations</h1>
          <p className="text-sm text-encre-douce">
            Les libellés sont ceux des actes : les communes changent de nom, les frontières
            bougent. Le pays d’aujourd’hui est rappelé quand il a changé.
          </p>
        </div>

        <EcranCarte donnees={carte} />

        <footer className="shrink-0 border-t border-bordure px-4 py-2.5 text-xs text-encre-douce">
          <p>
            <span className="tabular-nums">{nbSitues}</span> lieu{pluriel(nbSitues)} sur{' '}
            <span className="tabular-nums">{nbLieux}</span> {nbSitues > 1 ? 'sont situés' : 'est situé'}.
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
