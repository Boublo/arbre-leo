import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { BarreScroll } from '@/components/interactions/barre-scroll';
import { RaccourciAccueil } from '@/components/interactions/raccourci-accueil';
import { Vignette } from '@/components/portrait/vignette';
import { portraitDePersonne } from '@/components/portrait/types';
import { chargerArbre, type PersonneArbre } from '@/lib/arbre';
import { creerClientServeur } from '@/lib/supabase/server';
import type { NiveauPreuve } from '@/lib/types-base';

/**
 * Quoi de neuf.
 *
 * La fenêtre visible sur ce que l’arbre a gagné depuis un mois : personnes qui
 * viennent d’y prendre place, actes que quelqu’un a fini par transcrire,
 * souvenirs et commentaires que la famille a déposés. Rien d’ancien, rien de
 * compilé — juste ce qui a bougé, à hauteur d’humain, pour qu’un cousin
 * absent quelques semaines retrouve le fil sans avoir à parcourir l’arbre.
 *
 * Tout est requêté sur `cree_le > now() - interval '30 days'` : la fenêtre
 * glisse, la page n’a rien à mémoriser d’une visite à l’autre. Un jour sans
 * dépôt reste un jour sans dépôt — et la page le dit.
 */

export const metadata = { title: 'Quoi de neuf' };

// La page vit sur du mouvement récent : le cache n’a pas à s’en mêler.
export const dynamic = 'force-dynamic';

/** Fenêtre glissante commune aux trois sections, en jours. */
const FENETRE_JOURS = 30;

/** Assez pour reconnaître la teneur d’un acte sans transformer la page en registre. */
const LIMITE_TRANSCRIPTION = 200;

const LIBELLE_NIVEAU: Record<NiveauPreuve, string> = {
  acte: 'Acte',
  anom: 'ANOM',
  insee: 'INSEE',
  memoire: 'Mémoire',
  hypothese: 'Hypothèse',
  a_trouver: 'À trouver',
};

/**
 * Le temps qui a passé depuis un dépôt, dit à voix humaine — « hier »,
 * « il y a trois jours ». Une date sèche ferait perdre le fil que la page
 * essaie précisément de raccrocher.
 */
function ilYaDepuis(iso: string): string {
  const jours = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (jours <= 0) return 'aujourd’hui';
  if (jours === 1) return 'hier';
  if (jours < 7) return `il y a ${jours} jours`;
  if (jours < 14) return 'il y a une semaine';
  if (jours < 30) return `il y a ${Math.round(jours / 7)} semaines`;
  return 'il y a près d’un mois';
}

/** Coupe court sans trancher un mot ; laisse un texte vide à `null`. */
function extraitCourt(texte: string | null, max = LIMITE_TRANSCRIPTION): string | null {
  if (!texte) return null;
  const propre = texte.trim();
  if (propre.length === 0) return null;
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  const dernierEspace = coupe.lastIndexOf(' ');
  return `${coupe.slice(0, dernierEspace > 0 ? dernierEspace : max)}…`;
}

// ---------------------------------------------------------------------------

type SourceRecente = {
  id: string;
  texte: string | null;
  titre: string | null;
  niveau: NiveauPreuve;
  creeLe: string;
  personne: PersonneArbre | null;
};

type DepotRecent = {
  id: string;
  titre: string;
  auteur: string;
  creeLe: string;
  lien: string | null;
  origine: 'souvenir' | 'commentaire';
};

export default async function PageNouveautes() {
  const supabase = await creerClientServeur();
  // Server Component asynchrone : la lecture de l’heure est faite à chaque
  // requête et non pendant un rendu React — la règle de pureté ne s’applique pas.
  // eslint-disable-next-line react-hooks/purity
  const depuis = new Date(Date.now() - FENETRE_JOURS * 86_400_000).toISOString();

  const [donnees, personnesRes, sourcesRes, souvenirsRes, commentairesRes] =
    await Promise.all([
      chargerArbre({ signerPhotosPour: 'aucun' }),
      supabase
        .from('personnes')
        .select('id, cree_le')
        .gt('cree_le', depuis)
        .order('cree_le', { ascending: false }),
      // Les sources d’un acte peuvent être rattachées directement à la personne
      // ou passer par l’événement : on demande les deux chemins et on retombera
      // sur le premier disponible côté rendu.
      supabase
        .from('sources')
        .select(
          'id, titre, texte, niveau_preuve, cree_le, personne_id, evenements(personne_id)'
        )
        .in('niveau_preuve', ['acte', 'anom'])
        .gt('cree_le', depuis)
        .order('cree_le', { ascending: false }),
      supabase
        .from('souvenirs')
        .select('id, titre, auteur_id, statut, cree_le')
        .eq('statut', 'publie')
        .gt('cree_le', depuis)
        .order('cree_le', { ascending: false }),
      supabase
        .from('commentaires')
        .select(
          'id, texte, auteur_id, personne_id, souvenir_id, statut, cree_le'
        )
        .eq('statut', 'publie')
        .gt('cree_le', depuis)
        .order('cree_le', { ascending: false }),
    ]);

  // --- Les derniers-venus --------------------------------------------------
  //
  // Une personne peut apparaître en base et disparaître ensuite de l’arbre
  // (fusion de doublons, restriction RLS) : on ignore silencieusement celles
  // que `chargerArbre` ne nous renvoie plus.
  const nouvellesPersonnes = (personnesRes.data ?? [])
    .map((p) => {
      const personne = donnees.personnes.get(p.id);
      return personne ? { personne, creeLe: p.cree_le } : null;
    })
    .filter((x): x is { personne: PersonneArbre; creeLe: string } => x !== null);

  // --- Les derniers actes lus ---------------------------------------------
  const derniersActes: SourceRecente[] = (sourcesRes.data ?? []).map((s) => {
    // Selon la version du client Supabase, un lien FK unique se rend en objet
    // ou en tableau : on couvre les deux et on prend la première ligne utile.
    const evtBrut = (s as { evenements?: unknown }).evenements;
    const evt = Array.isArray(evtBrut) ? evtBrut[0] : evtBrut;
    const personneId =
      s.personne_id ??
      (evt && typeof evt === 'object' && 'personne_id' in evt
        ? ((evt as { personne_id: string | null }).personne_id ?? null)
        : null);
    return {
      id: s.id,
      texte: s.texte,
      titre: s.titre,
      niveau: s.niveau_preuve as NiveauPreuve,
      creeLe: s.cree_le,
      personne: personneId ? donnees.personnes.get(personneId) ?? null : null,
    };
  });

  // --- Les derniers souvenirs et commentaires -----------------------------
  //
  // Souvenirs et commentaires sont mêlés puis triés du plus récent au plus
  // ancien : c’est bien le dépôt d’un commentaire, pas la date du souvenir
  // qu’il vise, qui compte pour cette page.
  const idsAuteurs = [
    ...new Set([
      ...(souvenirsRes.data ?? []).map((s) => s.auteur_id),
      ...(commentairesRes.data ?? []).map((c) => c.auteur_id),
    ]),
  ];
  const auteursRes = idsAuteurs.length
    ? await supabase.from('membres').select('id, nom_affiche').in('id', idsAuteurs)
    : { data: [] };
  const nomAuteur = new Map(
    (auteursRes.data ?? []).map((m) => [m.id, m.nom_affiche])
  );
  const nomOuDefaut = (id: string) =>
    nomAuteur.get(id) ?? 'Un membre de la famille';

  const depotsSouvenirs: DepotRecent[] = (souvenirsRes.data ?? []).map((s) => ({
    id: `souvenir:${s.id}`,
    titre: s.titre,
    auteur: nomOuDefaut(s.auteur_id),
    creeLe: s.cree_le,
    lien: `/souvenirs/${s.id}`,
    origine: 'souvenir',
  }));

  const depotsCommentaires: DepotRecent[] = (commentairesRes.data ?? []).map(
    (c) => ({
      id: `commentaire:${c.id}`,
      // Un commentaire n’a pas de titre : on prend le début du texte, coupé
      // sans trancher un mot, faute de meilleure carte de visite.
      titre: extraitCourt(c.texte, 90) ?? 'Commentaire',
      auteur: nomOuDefaut(c.auteur_id),
      creeLe: c.cree_le,
      lien: c.souvenir_id
        ? `/souvenirs/${c.souvenir_id}`
        : c.personne_id
          ? `/personne/${c.personne_id}`
          : null,
      origine: 'commentaire',
    })
  );

  const derniersDepots = [...depotsSouvenirs, ...depotsCommentaires].sort(
    (a, b) => b.creeLe.localeCompare(a.creeLe)
  );

  const rienDeNeuf =
    nouvellesPersonnes.length === 0 &&
    derniersActes.length === 0 &&
    derniersDepots.length === 0;

  return (
    <>
      <BarreScroll />
      <RaccourciAccueil />
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl sm:text-4xl">Quoi de neuf</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-encre-douce">
            L’arbre grandit. Voici ce qui s’y est ajouté ces derniers temps.
          </p>
        </header>

        {rienDeNeuf ? (
          <section className="carte mt-10 p-8 text-encre-douce">
            <p>
              Rien de nouveau depuis un mois. L’arbre est complet — ou il attend
              qu’on y ajoute une découverte.
            </p>
          </section>
        ) : (
          <div className="mt-10 flex flex-col gap-14">
            {nouvellesPersonnes.length > 0 && (
              <SectionDerniersVenus entrees={nouvellesPersonnes} />
            )}

            {derniersActes.length > 0 && (
              <SectionActes entrees={derniersActes} />
            )}

            {derniersDepots.length > 0 && (
              <SectionDepots entrees={derniersDepots} />
            )}
          </div>
        )}
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function SectionDerniersVenus({
  entrees,
}: {
  entrees: { personne: PersonneArbre; creeLe: string }[];
}) {
  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="section-personnes"
    >
      <div>
        <h2 id="section-personnes" className="text-xl">
          Les derniers-venus
        </h2>
        <p className="mt-1 text-sm text-encre-tres-douce">
          {entrees.length === 1
            ? 'Une personne a rejoint l’arbre ce mois-ci.'
            : `${entrees.length} personnes ont rejoint l’arbre ce mois-ci.`}
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {entrees.map(({ personne, creeLe }) => (
          <li key={personne.id} className="flex flex-col gap-1.5">
            <Vignette personne={portraitDePersonne(personne)} />
            <span className="pl-5 text-xs text-encre-tres-douce">
              Ajoutée {ilYaDepuis(creeLe)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionActes({ entrees }: { entrees: SourceRecente[] }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="section-actes">
      <div>
        <h2 id="section-actes" className="text-xl">
          Les derniers actes lus
        </h2>
        <p className="mt-1 text-sm text-encre-tres-douce">
          {entrees.length === 1
            ? 'Un acte a été transcrit ce mois-ci.'
            : `${entrees.length} actes ont été transcrits ce mois-ci.`}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {entrees.map((acte) => (
          <li key={acte.id}>
            <CarteActe acte={acte} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CarteActe({ acte }: { acte: SourceRecente }) {
  const extrait = extraitCourt(acte.texte) ?? extraitCourt(acte.titre, 180);
  const contenu = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-base font-medium text-encre">
          {acte.personne?.nomComplet ?? 'Personne non rattachée'}
        </span>
        <span className="text-xs text-encre-tres-douce">
          {ilYaDepuis(acte.creeLe)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-2 py-0.5 text-xs uppercase tracking-wide text-encre-douce">
          {LIBELLE_NIVEAU[acte.niveau]}
        </span>
        {acte.titre && (
          <span className="text-xs italic text-encre-douce">« {acte.titre} »</span>
        )}
      </div>
      {extrait && (
        <p className="mt-2 text-sm leading-relaxed text-encre-douce">{extrait}</p>
      )}
    </>
  );

  const classes =
    'carte block p-4 transition hover:border-bordure-forte hover:bg-fond-doux';

  return acte.personne ? (
    <Link href={`/personne/${acte.personne.id}`} className={classes}>
      {contenu}
    </Link>
  ) : (
    <div className={classes}>{contenu}</div>
  );
}

function SectionDepots({ entrees }: { entrees: DepotRecent[] }) {
  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="section-depots"
    >
      <div>
        <h2 id="section-depots" className="text-xl">
          Les derniers souvenirs et commentaires
        </h2>
        <p className="mt-1 text-sm text-encre-tres-douce">
          Ce que la famille a déposé — récits, photos, réactions — ces
          derniers jours.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {entrees.map((depot) => (
          <li key={depot.id}>
            <CarteDepot depot={depot} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CarteDepot({ depot }: { depot: DepotRecent }) {
  const etiquette = depot.origine === 'souvenir' ? 'Souvenir' : 'Commentaire';
  const contenu = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-base font-medium text-encre">{depot.titre}</span>
        <span className="text-xs text-encre-tres-douce">
          {ilYaDepuis(depot.creeLe)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-encre-douce">
        <span className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-2 py-0.5 uppercase tracking-wide">
          {etiquette}
        </span>
        <span>Déposé par {depot.auteur}</span>
      </div>
    </>
  );

  const classes =
    'carte block p-4 transition hover:border-bordure-forte hover:bg-fond-doux';

  return depot.lien ? (
    <Link href={depot.lien} className={classes}>
      {contenu}
    </Link>
  ) : (
    <div className={classes}>{contenu}</div>
  );
}
