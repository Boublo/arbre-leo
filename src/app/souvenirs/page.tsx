import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { CarteSouvenir } from '@/components/souvenirs/carte-souvenir';
import { ColonneLaterale } from '@/components/souvenirs/colonne-laterale';
import { FiltresSouvenirs } from '@/components/souvenirs/filtres-souvenirs';
import { SouvenirTete } from '@/components/souvenirs/souvenir-tete';
import { VueCalendrier } from '@/components/souvenirs/vue-calendrier';
import {
  chargerCalendrierAnniversaires,
  chargerPersonnesMentionnables,
  chargerSouvenirs,
  chargerTopContributeurs,
  decenniesDansLeMur,
  souvenirDeTete,
  type TypeSouvenir,
} from '@/lib/souvenirs';
import { ANNEE_MIN, anneeMax } from '@/lib/souvenirs-partage';

export const metadata = { title: 'Souvenirs' };

// Un souvenir déposé doit apparaître tout de suite : rien n'est mis en cache.
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function premier(valeur: string | string[] | undefined): string | null {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  const propre = (brut ?? '').trim();
  return propre === '' ? null : propre;
}

/** Une année hors bornes est ignorée plutôt que renvoyée en erreur. */
function annee(valeur: string | string[] | undefined): number | null {
  const brut = premier(valeur);
  if (brut === null) return null;
  const nombre = Number(brut);
  if (!Number.isFinite(nombre)) return null;
  const entier = Math.trunc(nombre);
  return entier >= ANNEE_MIN && entier <= anneeMax() ? entier : null;
}

function typeDeCarte(valeur: string | string[] | undefined): TypeSouvenir {
  const brut = premier(valeur);
  return brut === 'photos' || brut === 'recits' ? brut : 'tous';
}

function vueDemandee(valeur: string | string[] | undefined): 'mur' | 'calendrier' {
  return premier(valeur) === 'calendrier' ? 'calendrier' : 'mur';
}

export default async function PageSouvenirs({ searchParams }: PageProps<'/souvenirs'>) {
  const parametres = await searchParams;

  const personneDemandee = premier(parametres.personne);
  const personneId = personneDemandee && UUID.test(personneDemandee) ? personneDemandee : null;
  const decennieChoisie = annee(parametres.decennie);
  // Une décennie choisie remplace les bornes libres ; les bornes libres, elles,
  // l’emportent sur une décennie qui viendrait d’un lien vieilli.
  const anneeDebutLibre = annee(parametres.de);
  const anneeFinLibre = annee(parametres.a);
  const anneeDebut =
    anneeDebutLibre ??
    (decennieChoisie !== null ? decennieChoisie : null);
  const anneeFin =
    anneeFinLibre ??
    (decennieChoisie !== null ? decennieChoisie + 9 : null);

  const type = typeDeCarte(parametres.type);
  const vue = vueDemandee(parametres.vue);

  const [souvenirs, personnes, contributeurs, calendrier] = await Promise.all([
    chargerSouvenirs({ personneId, anneeDebut, anneeFin, type }),
    chargerPersonnesMentionnables(),
    chargerTopContributeurs(10),
    vue === 'calendrier' ? chargerCalendrierAnniversaires() : Promise.resolve(new Map()),
  ]);

  const filtreActif =
    personneId !== null ||
    anneeDebutLibre !== null ||
    anneeFinLibre !== null ||
    decennieChoisie !== null ||
    type !== 'tous';

  // On ne prend en tête que si aucun filtre n’est actif : rien de plus troublant
  // qu’un « épinglé » qui ne fait pas partie de la sélection en cours.
  const tete = !filtreActif && vue === 'mur' ? souvenirDeTete(souvenirs) : null;
  const reste = tete ? souvenirs.filter((s) => s.id !== tete.id) : souvenirs;

  const decenniesConnues = decenniesDansLeMur(souvenirs);

  const urlVue = (cible: 'mur' | 'calendrier') => {
    const p = new URLSearchParams();
    if (personneId) p.set('personne', personneId);
    if (decennieChoisie !== null) p.set('decennie', String(decennieChoisie));
    if (anneeDebutLibre !== null) p.set('de', String(anneeDebutLibre));
    if (anneeFinLibre !== null) p.set('a', String(anneeFinLibre));
    if (type !== 'tous') p.set('type', type);
    if (cible === 'calendrier') p.set('vue', 'calendrier');
    const q = p.toString();
    return `/souvenirs${q ? `?${q}` : ''}`;
  };

  return (
    <>
      <Navigation />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl">Souvenirs</h1>
            <p className="mt-2 max-w-2xl text-encre-douce">
              Ce que la famille dépose et qu’aucun acte ne dira jamais : un récit, une date,
              des photos, les visages qui vont avec.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <BasculeVue vue={vue} urlVue={urlVue} />
            <Link
              href="/souvenirs/nouveau"
              className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste transition hover:brightness-110"
            >
              Déposer un souvenir
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <FiltresSouvenirs
            personnes={personnes}
            decennies={decenniesConnues}
            valeurs={{
              personneId,
              anneeDebut: anneeDebutLibre,
              anneeFin: anneeFinLibre,
              decennie: decennieChoisie,
              type,
            }}
            actif={filtreActif}
            vue={vue}
          />
          {(anneeDebutLibre !== null || anneeFinLibre !== null || decennieChoisie !== null) && (
            <p className="mt-2 text-xs text-encre-tres-douce">
              Une période demandée écarte les souvenirs dont on ignore la date.
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="flex flex-col gap-8">
            {tete && <SouvenirTete souvenir={tete} />}

            {souvenirs.length === 0 ? (
              <EtatVide filtreActif={filtreActif} />
            ) : vue === 'calendrier' ? (
              <VueCalendrier souvenirs={souvenirs} calendrier={calendrier} />
            ) : (
              <MurMasonry souvenirs={reste} />
            )}
          </div>

          <ColonneLaterale
            contributeurs={contributeurs}
            nombreSouvenirs={souvenirs.length}
            epingleActif={tete?.epingle ?? false}
          />
        </div>
      </main>
    </>
  );
}

/**
 * La bascule mur/calendrier — deux gros liens, l’état courant marqué en toutes
 * lettres pour un lecteur d’écran et par un fond plein pour l’œil.
 */
function BasculeVue({
  vue,
  urlVue,
}: {
  vue: 'mur' | 'calendrier';
  urlVue: (cible: 'mur' | 'calendrier') => string;
}) {
  const base = 'rounded-[var(--rayon-petit)] px-3 py-2 text-sm transition';
  return (
    <div
      role="group"
      aria-label="Manière de voir les souvenirs"
      className="flex items-center gap-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte p-1"
    >
      <Link
        href={urlVue('mur')}
        aria-current={vue === 'mur' ? 'page' : undefined}
        className={`${base} ${
          vue === 'mur'
            ? 'bg-accent text-accent-contraste'
            : 'text-encre-douce hover:bg-fond-doux hover:text-encre'
        }`}
      >
        Le mur
      </Link>
      <Link
        href={urlVue('calendrier')}
        aria-current={vue === 'calendrier' ? 'page' : undefined}
        className={`${base} ${
          vue === 'calendrier'
            ? 'bg-accent text-accent-contraste'
            : 'text-encre-douce hover:bg-fond-doux hover:text-encre'
        }`}
      >
        L’année
      </Link>
    </div>
  );
}

/**
 * Le mur en masonry : `columns` s’occupe de la répartition sans JavaScript, et
 * `break-inside-avoid` empêche qu’une carte soit coupée en deux colonnes. À
 * chaque nouveau souvenir, la mise en page se refait toute seule.
 */
function MurMasonry({ souvenirs }: { souvenirs: import('@/lib/souvenirs').SouvenirResume[] }) {
  if (souvenirs.length === 0) return null;
  return (
    <div className="columns-1 gap-5 sm:columns-2 xl:columns-3 [&>*]:mb-5">
      {souvenirs.map((souvenir) => (
        <CarteSouvenir key={souvenir.id} souvenir={souvenir} />
      ))}
    </div>
  );
}

function EtatVide({ filtreActif }: { filtreActif: boolean }) {
  return (
    <section className="carte flex flex-col items-center gap-3 p-8 text-center">
      <p className="text-encre-douce">
        {filtreActif
          ? 'Aucun souvenir ne répond à cette recherche.'
          : 'Le mur est encore vide. Le premier souvenir déposé sera celui que les autres liront.'}
      </p>
      {filtreActif ? (
        <Link href="/souvenirs" className="lien-discret text-sm">
          Revenir à tout le mur
        </Link>
      ) : (
        <Link
          href="/souvenirs/nouveau"
          className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2 text-sm font-medium text-accent-contraste transition hover:brightness-110"
        >
          Déposer le premier
        </Link>
      )}
    </section>
  );
}
