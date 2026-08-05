import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { chargerArbre, type DonneesArbre, type PersonneArbre } from '@/lib/arbre';
import { creerClientServeur } from '@/lib/supabase/server';
import { NOM_DU_SITE, SOUS_TITRE_DU_SITE } from '@/lib/site';
import {
  PalmaresChiffres,
  type EntreeChiffre,
} from '@/components/decouverte/chiffre-cle';
import {
  Silhouette,
  type BandeGeneration,
} from '@/components/decouverte/silhouette-genealogique';
import { CartePortrait } from '@/components/decouverte/carte-portrait';

/**
 * Page d'accueil.
 *
 * Cinq passages de lecture, du général au concret : le nom du livre de famille,
 * ce qu'il compte, la forme qu'il prend, quelques visages, et les portes pour
 * poursuivre. Rien n'est ici saisi en dur — le dépôt est public, les mesures se
 * font sur la base, et une famille qui reprendrait l'application y trouverait
 * ses propres chiffres.
 */

export const metadata = { title: 'Accueil' };

// L'accueil parle de l'état courant de la base : rien à mettre en cache.
export const dynamic = 'force-dynamic';

/** Forme réelle de la ligne : les types Supabase ne modélisent pas la jointure. */
type SouvenirRecent = {
  id: string;
  titre: string;
  recit: string;
  cree_le: string;
  souvenirs_personnes: { personne_id: string }[] | null;
};

export default async function PageAccueil() {
  const supabase = await creerClientServeur();

  const [donnees, lieuxRes, actesRes, evtLieuxRes, souvenirRes] = await Promise.all([
    chargerArbre(),
    supabase.from('lieux').select('pays_actuel, pays'),
    supabase
      .from('evenements')
      .select('id', { count: 'exact', head: true })
      .in('niveau_preuve', ['acte', 'anom']),
    supabase
      .from('evenements')
      .select('personne_id, lieu_id')
      .not('personne_id', 'is', null)
      .not('lieu_id', 'is', null),
    supabase
      .from('souvenirs')
      .select('id, titre, recit, cree_le, souvenirs_personnes(personne_id)')
      .order('cree_le', { ascending: false })
      .limit(1),
  ]);

  // Base entièrement vide : on annonce ce qu'il faut faire, plutôt qu'un tableau désolé.
  if (donnees.personnes.size === 0) {
    return (
      <>
        <Navigation />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-6 px-4 py-16 sm:px-6">
          <h1 className="text-4xl">{NOM_DU_SITE}</h1>
          <p className="text-lg text-encre-douce">{SOUS_TITRE_DU_SITE}</p>
          <p className="carte w-full p-6 text-encre-douce">
            L’arbre est encore vide. Importez un fichier GEDCOM en suivant le{' '}
            <code>README.md</code>, ou commencez par saisir la première personne.
          </p>
        </main>
      </>
    );
  }

  // --- Chiffres clés ------------------------------------------------------
  const generations = calculerGenerations(donnees);
  const nombreGenerations =
    generations.size === 0 ? 0 : Math.max(...generations.values()) + 1;

  const bornesAnnees = calculerBornes(donnees);

  const paysUniques = new Set<string>();
  for (const l of lieuxRes.data ?? []) {
    const p = (l.pays_actuel ?? l.pays)?.trim();
    if (p) paysUniques.add(p);
  }

  const chiffres: EntreeChiffre[] = [
    {
      id: 'personnes',
      libelle: donnees.personnes.size > 1 ? 'Personnes' : 'Personne',
      valeur: donnees.personnes.size,
      aide: 'Tous ceux qu’un acte ou un souvenir a placés dans l’arbre.',
    },
    {
      id: 'generations',
      libelle: nombreGenerations > 1 ? 'Générations' : 'Génération',
      valeur: nombreGenerations,
      aide: 'De la plus ancienne aïeule au dernier-né connu.',
    },
    {
      id: 'annees',
      libelle: 'Années couvertes',
      valeur: bornesAnnees ? `${bornesAnnees.duree}` : '—',
      aide: bornesAnnees
        ? `De ${bornesAnnees.min} à ${bornesAnnees.max}.`
        : 'Aucune date n’est encore enregistrée.',
    },
    {
      id: 'pays',
      libelle: paysUniques.size > 1 ? 'Pays traversés' : 'Pays traversé',
      valeur: paysUniques.size,
      aide: 'Là où la famille est née, s’est mariée, ou s’est éteinte.',
    },
    {
      id: 'actes',
      libelle: (actesRes.count ?? 0) > 1 ? 'Actes lus' : 'Acte lu',
      valeur: actesRes.count ?? 0,
      aide: 'Événements adossés à un acte d’état civil consulté par la famille.',
    },
  ];

  // --- Silhouette ---------------------------------------------------------
  const bandes = calculerBandes(generations, nombreGenerations);

  // --- Portraits saillants ------------------------------------------------
  const plusAncien = trouverPlusAncienAncetre(donnees);
  const plusVoyage = trouverPlusVoyage(donnees, evtLieuxRes.data ?? []);

  // On évite le doublon : le plus ancien et le plus voyagé peuvent coïncider.
  const plusVoyageAffiche =
    plusVoyage && plusVoyage.personne.id !== plusAncien?.id ? plusVoyage : null;

  // La forme imbriquée n'est pas capturée par les types Supabase générés à la
  // main : on retourne au lu, en ne prenant que ce dont la page a besoin.
  const souvenirRecent = (souvenirRes.data?.[0] ?? null) as SouvenirRecent | null;
  const personneSouvenir = souvenirRecent
    ? (souvenirRecent.souvenirs_personnes ?? [])
        .map((s) => donnees.personnes.get(s.personne_id))
        .find(
          (p): p is PersonneArbre =>
            p !== undefined &&
            p.id !== plusAncien?.id &&
            p.id !== plusVoyageAffiche?.personne.id
        ) ?? null
    : null;

  const portraits = [plusAncien, plusVoyageAffiche?.personne, personneSouvenir].filter(
    (p): p is PersonneArbre => p !== undefined && p !== null
  );

  // --- Rendu --------------------------------------------------------------
  return (
    <>
      <Navigation />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-4 py-10 sm:px-6 sm:py-14">
        {/* a) En-tête */}
        <section className="flex flex-col gap-5">
          <h1 className="text-4xl leading-tight sm:text-5xl">{NOM_DU_SITE}</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-encre-douce">
            {SOUS_TITRE_DU_SITE}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/arbre"
              className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste transition hover:brightness-110"
            >
              Explorer l’arbre
            </Link>
            <Link
              href="/souvenirs/nouveau"
              className="rounded-[var(--rayon-petit)] border border-bordure-forte bg-fond-carte px-4 py-2.5 font-medium text-encre transition hover:bg-fond-doux"
            >
              Déposer un souvenir
            </Link>
          </div>
        </section>

        {/* b) Chiffres clés */}
        <PalmaresChiffres
          titre="En un coup d’œil"
          aide="Ce que la famille a documenté à ce jour."
          chiffres={chiffres}
        />

        {/* c) Silhouette */}
        <section aria-labelledby="silhouette-section" className="flex flex-col gap-4">
          <h2 id="silhouette-section" className="text-xl">
            La forme de l’arbre
          </h2>
          <Silhouette
            parGeneration={bandes}
            legende="Chaque bande dit combien de personnes composent une génération, de la plus ancienne, en haut, jusqu’aux derniers-nés, en bas."
          />
        </section>

        {/* d) Portraits saillants */}
        <section aria-labelledby="portraits-section" className="flex flex-col gap-4">
          <h2 id="portraits-section" className="text-xl">
            Portraits saillants
          </h2>

          {portraits.length === 0 ? (
            <p className="carte p-6 text-encre-douce">
              Il faudra verser quelques dates de naissance ou déposer un souvenir
              pour que trois visages viennent ouvrir la découverte.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {plusAncien && (
                <CartePortrait
                  personne={plusAncien}
                  raison="Le plus ancien ancêtre"
                  aide={
                    plusAncien.naissance?.lieuCourt
                      ? `Sa trace la plus ancienne : ${plusAncien.naissance.lieuCourt}.`
                      : 'Le plus loin que l’arbre remonte pour l’instant.'
                  }
                />
              )}
              {plusVoyageAffiche && (
                <CartePortrait
                  personne={plusVoyageAffiche.personne}
                  raison="Celui qui a le plus voyagé"
                  aide={`Sa vie a laissé une trace en ${plusVoyageAffiche.lieux} lieux différents.`}
                />
              )}
              {personneSouvenir && souvenirRecent && (
                <CartePortrait
                  personne={personneSouvenir}
                  raison="Un souvenir récent"
                  aide={
                    <>
                      <span className="font-medium text-encre">
                        « {souvenirRecent.titre} »
                      </span>{' '}
                      {extraitCourt(souvenirRecent.recit)}
                    </>
                  }
                />
              )}
            </div>
          )}
        </section>

        {/* e) Navigation vers les modules */}
        <section aria-labelledby="navigation-section" className="flex flex-col gap-4">
          <h2 id="navigation-section" className="text-xl">
            Où aller
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            <CarteRoute
              href="/arbre"
              titre="L’arbre"
              accroche="Une même image tenue à hauteur d’œil : les deux branches, et l’enfant où elles se rejoignent."
            />
            <CarteRoute
              href="/chronologie"
              titre="La chronologie"
              accroche="Les vies de la famille rangées en face de la grande Histoire."
            />
            <CarteRoute
              href="/carte"
              titre="La carte"
              accroche="D’une rive à l’autre : là où la famille est passée, s’est arrêtée, est repartie."
            />
            <CarteRoute
              href="/souvenirs"
              titre="Les souvenirs"
              accroche="Ce que les actes ne diront jamais : récits, photos, voix, visages."
            />
          </ul>
        </section>
      </main>
    </>
  );
}

/**
 * Carte de porte : un titre, une accroche, une zone cliquable en entier.
 * La flèche visuelle est facultative — le lien tient sans elle.
 */
function CarteRoute({
  href,
  titre,
  accroche,
}: {
  href: string;
  titre: string;
  accroche: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="carte group flex h-full flex-col gap-1.5 p-5 transition
                   hover:border-bordure-forte hover:shadow-[var(--ombre-forte)]
                   focus:outline-none"
      >
        <h3 className="text-lg leading-snug transition group-hover:text-accent">
          {titre}
        </h3>
        <p className="text-sm text-encre-douce">{accroche}</p>
      </Link>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Mesures — sur la base, jamais sur des données codées en dur
// ---------------------------------------------------------------------------

/**
 * Numérote chaque personne par sa distance aux derniers-nés : les personnes
 * sans descendance connue reçoivent 0, leurs parents 1, leurs grands-parents 2,
 * et ainsi de suite. On mesure sur le chemin le plus long, ce qui empêche
 * qu'une même personne se retrouve rattachée à deux générations à la fois quand
 * l'implexe traverse l'arbre.
 */
function calculerGenerations(donnees: DonneesArbre): Map<string, number> {
  const generations = new Map<string, number>();
  const enCours = new Set<string>();

  function calculer(id: string): number {
    const dejaVu = generations.get(id);
    if (dejaVu !== undefined) return dejaVu;

    // Boucle de filiation — donnée fautive : on coupe court sans faire tourner.
    if (enCours.has(id)) return 0;
    enCours.add(id);

    const enfants = (donnees.enfants.get(id) ?? []).filter((eid) =>
      donnees.personnes.has(eid)
    );
    const distance =
      enfants.length === 0 ? 0 : 1 + Math.max(...enfants.map(calculer));

    enCours.delete(id);
    generations.set(id, distance);
    return distance;
  }

  for (const id of donnees.personnes.keys()) calculer(id);
  return generations;
}

/**
 * Effectif par génération, rangé du plus ancien vers le plus récent. La
 * silhouette prendra l'ordre tel quel : les aïeuls en haut, les derniers-nés
 * en bas.
 */
function calculerBandes(
  generations: Map<string, number>,
  nombre: number
): BandeGeneration[] {
  if (nombre === 0) return [];

  const compteurs = new Array<number>(nombre).fill(0);
  for (const g of generations.values()) {
    if (g >= 0 && g < nombre) compteurs[g]! += 1;
  }

  const bandes: BandeGeneration[] = [];
  for (let g = nombre - 1; g >= 0; g -= 1) {
    // Les plus anciens portent le numéro 1 : c'est ainsi qu'on numérote
    // habituellement une généalogie descendante.
    const numero = nombre - g;
    bandes.push({
      libelle: `Génération ${numero}`,
      nombre: compteurs[g] ?? 0,
    });
  }
  return bandes;
}

function calculerBornes(
  donnees: DonneesArbre
): { min: number; max: number; duree: number } | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const p of donnees.personnes.values()) {
    for (const annee of [p.naissance?.annee, p.deces?.annee]) {
      if (annee === null || annee === undefined) continue;
      if (annee < min) min = annee;
      if (annee > max) max = annee;
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max, duree: max - min + 1 };
}

function trouverPlusAncienAncetre(donnees: DonneesArbre): PersonneArbre | null {
  let candidat: PersonneArbre | null = null;
  let anneeCandidat = Number.POSITIVE_INFINITY;

  for (const p of donnees.personnes.values()) {
    const annee = p.naissance?.annee;
    if (annee === null || annee === undefined) continue;
    if (annee < anneeCandidat) {
      candidat = p;
      anneeCandidat = annee;
    }
  }
  return candidat;
}

/**
 * La personne qui, à travers ses événements enregistrés, apparaît en le plus
 * grand nombre de lieux différents. En deçà de deux lieux, la mise en avant ne
 * dit rien de plus qu'un nom au hasard : on préfère ne rien montrer.
 */
function trouverPlusVoyage(
  donnees: DonneesArbre,
  liens: readonly { personne_id: string | null; lieu_id: string | null }[]
): { personne: PersonneArbre; lieux: number } | null {
  const parPersonne = new Map<string, Set<string>>();

  for (const lien of liens) {
    if (!lien.personne_id || !lien.lieu_id) continue;
    if (!donnees.personnes.has(lien.personne_id)) continue;

    const ensemble = parPersonne.get(lien.personne_id) ?? new Set<string>();
    ensemble.add(lien.lieu_id);
    parPersonne.set(lien.personne_id, ensemble);
  }

  let meilleur: { id: string; lieux: number } | null = null;
  for (const [id, ensemble] of parPersonne) {
    if (!meilleur || ensemble.size > meilleur.lieux) {
      meilleur = { id, lieux: ensemble.size };
    }
  }

  if (!meilleur || meilleur.lieux < 2) return null;

  const personne = donnees.personnes.get(meilleur.id);
  return personne ? { personne, lieux: meilleur.lieux } : null;
}

/** Coupe au dernier espace avant la limite, pour ne pas trancher un mot. */
function extraitCourt(texte: string, max = 140): string {
  const propre = texte.trim();
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  const dernierEspace = coupe.lastIndexOf(' ');
  return `${coupe.slice(0, dernierEspace > 0 ? dernierEspace : max)}…`;
}
