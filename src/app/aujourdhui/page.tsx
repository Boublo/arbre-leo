import { Navigation } from '@/components/navigation';
import { BarreScroll } from '@/components/interactions/barre-scroll';
import { RaccourciAccueil } from '@/components/interactions/raccourci-accueil';
import { Vignette } from '@/components/portrait/vignette';
import { portraitDePersonne } from '@/components/portrait/types';
import { chargerArbre, formaterDate } from '@/lib/arbre';
import {
  ephemeridesDeCeJour,
  ephemeridesSemaine,
  type Ephemeride,
  type JourneeEphemerides,
} from '@/lib/ephemerides';

/**
 * Ces jours-ci.
 *
 * Le calendrier de la famille : ce qui se passait un tel jour dans l'arbre —
 * un anniversaire d'aujourd'hui, un mariage il y a soixante ans, la mort d'un
 * aïeul un mois de mars. Le jour est comparé sans son année ; toute personne
 * ou union à qui il manque au moins mois, jour et année est écartée sans
 * mention (l'information ne suffirait pas à raconter quelque chose).
 *
 * La page se lit en deux temps : d'abord aujourd'hui, ensuite les six jours à
 * venir, avec chaque type d'anniversaire réuni sous son propre titre.
 */

export const metadata = { title: 'Ces jours-ci' };

// La date de référence change à chaque visite : rien à mettre en cache.
export const dynamic = 'force-dynamic';

const JOURS_SEMAINE = 7;

const MOIS_LIBELLE = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const NOMS_JOURS = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

/** « mardi 8 mars » — l'année ne sert plus une fois qu'on est dans la semaine. */
function libelleDate(date: Date): string {
  const jour = date.getDate();
  const jourEcrit = jour === 1 ? '1er' : String(jour);
  return `${NOMS_JOURS[date.getDay()]} ${jourEcrit} ${MOIS_LIBELLE[date.getMonth()]}`;
}

export default async function PageCesJoursCi() {
  const donnees = await chargerArbre();

  // Server Component asynchrone : la lecture de l'heure est faite à chaque
  // requête et non pendant un rendu React — la règle de pureté ne s'applique pas.
  const maintenant = new Date();

  const evenementsAujourdhui = ephemeridesDeCeJour(donnees, maintenant);
  const semaine = ephemeridesSemaine(donnees, maintenant, JOURS_SEMAINE);
  // La première case correspond au jour même, déjà servi juste au-dessus.
  const semaineAvenir = semaine
    .slice(1)
    .filter((j) => j.ephemerides.length > 0);

  const totalSemaine = semaineAvenir.reduce(
    (n, j) => n + j.ephemerides.length,
    0
  );

  return (
    <>
      <BarreScroll />
      <RaccourciAccueil />
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl sm:text-4xl">Ces jours-ci</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-encre-douce">
            Les anniversaires que la famille traverse cette semaine —
            naissances, mariages, disparitions —, rangés dans l&apos;ordre du
            calendrier.
          </p>
        </header>

        <SectionAujourdhui
          date={maintenant}
          ephemerides={evenementsAujourdhui}
        />

        <SectionSemaine
          journees={semaineAvenir}
          totalEvenements={totalSemaine}
        />
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function SectionAujourdhui({
  date,
  ephemerides,
}: {
  date: Date;
  ephemerides: Ephemeride[];
}) {
  const naissances = ephemerides.filter(
    (e): e is Extract<Ephemeride, { type: 'naissance' }> => e.type === 'naissance'
  );
  const mariages = ephemerides.filter(
    (e): e is Extract<Ephemeride, { type: 'mariage' }> => e.type === 'mariage'
  );
  const deces = ephemerides.filter(
    (e): e is Extract<Ephemeride, { type: 'deces' }> => e.type === 'deces'
  );

  const dateEcrite = libelleDate(date);

  return (
    <section
      aria-labelledby="section-aujourdhui"
      className="mt-10 flex flex-col gap-6"
    >
      <div>
        <h2 id="section-aujourdhui" className="text-xl">
          Aujourd&apos;hui
        </h2>
        <p className="mt-1 text-sm text-encre-tres-douce">
          Nous sommes {dateEcrite}.
        </p>
      </div>

      {ephemerides.length === 0 ? (
        <p className="carte p-6 text-encre-douce">
          Rien de particulier aujourd&apos;hui. Tous les jours du calendrier
          n&apos;appellent pas un anniversaire — mais demain, peut-être.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {naissances.length > 0 && (
            <SousSection
              titre={
                naissances.length === 1
                  ? 'Un anniversaire de naissance'
                  : `${naissances.length} anniversaires de naissance`
              }
              ephemerides={naissances}
            />
          )}
          {mariages.length > 0 && (
            <SousSection
              titre={
                mariages.length === 1
                  ? 'Un anniversaire de mariage'
                  : `${mariages.length} anniversaires de mariage`
              }
              ephemerides={mariages}
            />
          )}
          {deces.length > 0 && (
            <SousSection
              titre={
                deces.length === 1
                  ? 'Un anniversaire de décès'
                  : `${deces.length} anniversaires de décès`
              }
              ephemerides={deces}
            />
          )}
        </div>
      )}
    </section>
  );
}

function SectionSemaine({
  journees,
  totalEvenements,
}: {
  journees: JourneeEphemerides[];
  totalEvenements: number;
}) {
  return (
    <section
      aria-labelledby="section-semaine"
      className="mt-14 flex flex-col gap-6"
    >
      <div>
        <h2 id="section-semaine" className="text-xl">
          Dans la semaine
        </h2>
        <p className="mt-1 text-sm text-encre-tres-douce">
          Ce qui vient dans les six prochains jours.
        </p>
      </div>

      {journees.length === 0 ? (
        <p className="carte p-6 text-encre-douce">
          Rien d&apos;annoncé dans les jours qui viennent. La semaine sera
          calme.
        </p>
      ) : (
        <>
          <p className="text-sm text-encre-tres-douce">
            {totalEvenements === 1
              ? '1 anniversaire à venir.'
              : `${totalEvenements} anniversaires à venir.`}
          </p>
          <ol className="flex flex-col gap-8">
            {journees.map((j) => (
              <li key={j.date.toISOString()} className="flex flex-col gap-3">
                <h3 className="text-base font-medium capitalize text-encre">
                  {libelleDate(j.date)}
                </h3>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {j.ephemerides.map((e) => (
                    <li key={cleEphemeride(e)}>
                      <CarteEphemeride ephemeride={e} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function SousSection({
  titre,
  ephemerides,
}: {
  titre: string;
  ephemerides: Ephemeride[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-medium text-encre">{titre}</h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ephemerides.map((e) => (
          <li key={cleEphemeride(e)}>
            <CarteEphemeride ephemeride={e} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carte d'un événement
// ---------------------------------------------------------------------------

function CarteEphemeride({ ephemeride }: { ephemeride: Ephemeride }) {
  const dateEcrite = formaterDate({
    annee: ephemeride.annee,
    mois: ephemeride.mois,
    jour: ephemeride.jour,
  });

  if (ephemeride.type === 'mariage') {
    return (
      <article className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.09em] text-encre-tres-douce">
          Mariage {resumeAnnees(ephemeride.annees)}
        </p>
        <ul className="flex flex-col gap-2">
          {ephemeride.conjoints.map((p) => (
            <li key={p.id}>
              <Vignette personne={portraitDePersonne(p)} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-encre-tres-douce">
          Union célébrée le {dateEcrite}.
        </p>
      </article>
    );
  }

  if (ephemeride.type === 'naissance') {
    const p = ephemeride.personne;
    const feminin = p.sexe === 'F';
    const legende = ephemeride.vivant
      ? ephemeride.annees === 0
        ? 'vient de naître'
        : `fête ses ${ephemeride.annees} ans`
      : ephemeride.annees === 0
        ? `${feminin ? 'née' : 'né'} aujourd’hui`
        : `aurait ${ephemeride.annees} ans aujourd’hui`;
    return (
      <article className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.09em] text-encre-tres-douce">
          Naissance · {legende}
        </p>
        <Vignette personne={portraitDePersonne(p)} />
        <p className="text-xs text-encre-tres-douce">
          {feminin ? 'Née' : 'Né'} le {dateEcrite}.
        </p>
      </article>
    );
  }

  // Décès
  const p = ephemeride.personne;
  const feminin = p.sexe === 'F';
  return (
    <article className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-[0.09em] text-encre-tres-douce">
        Décès {resumeAnnees(ephemeride.annees)}
      </p>
      <Vignette personne={portraitDePersonne(p)} />
      <p className="text-xs text-encre-tres-douce">
        {feminin ? 'Décédée' : 'Décédé'} le {dateEcrite}.
      </p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Petits utilitaires
// ---------------------------------------------------------------------------

function resumeAnnees(annees: number): string {
  if (annees <= 0) return 'ce jour même';
  if (annees === 1) return 'il y a un an';
  return `il y a ${annees} ans`;
}

/** Une clé stable même quand un couple ou un événement se répète. */
function cleEphemeride(e: Ephemeride): string {
  if (e.type === 'mariage') return `mariage:${e.unionId}`;
  return `${e.type}:${e.personne.id}`;
}
