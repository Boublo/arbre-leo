import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { CarteSouvenir } from '@/components/souvenirs/carte-souvenir';
import { FiltresSouvenirs } from '@/components/souvenirs/filtres-souvenirs';
import { chargerPersonnesMentionnables, chargerSouvenirs } from '@/lib/souvenirs';
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

export default async function PageSouvenirs({ searchParams }: PageProps<'/souvenirs'>) {
  const parametres = await searchParams;

  const personneDemandee = premier(parametres.personne);
  const personneId = personneDemandee && UUID.test(personneDemandee) ? personneDemandee : null;
  const anneeDebut = annee(parametres.de);
  const anneeFin = annee(parametres.a);

  const [souvenirs, personnes] = await Promise.all([
    chargerSouvenirs({ personneId, anneeDebut, anneeFin }),
    chargerPersonnesMentionnables(),
  ]);

  const filtreActif = personneId !== null || anneeDebut !== null || anneeFin !== null;
  const epingles = souvenirs.filter((s) => s.epingle);
  const ordinaires = souvenirs.filter((s) => !s.epingle);

  return (
    <>
      <Navigation />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl">Souvenirs</h1>
            <p className="mt-2 max-w-2xl text-encre-douce">
              Ce que la famille dépose et qu’aucun acte ne dira jamais : un récit, une date,
              des photos, les visages qui vont avec.
            </p>
          </div>

          <Link
            href="/souvenirs/nouveau"
            className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste transition hover:brightness-110"
          >
            Déposer un souvenir
          </Link>
        </div>

        <div className="mt-6">
          <FiltresSouvenirs
            personnes={personnes}
            valeurs={{ personneId, anneeDebut, anneeFin }}
            actif={filtreActif}
          />
          {(anneeDebut !== null || anneeFin !== null) && (
            <p className="mt-2 text-xs text-encre-tres-douce">
              Une période demandée écarte les souvenirs dont on ignore la date.
            </p>
          )}
        </div>

        {souvenirs.length === 0 ? (
          <p className="carte mt-8 p-8 text-center text-encre-douce">
            {filtreActif
              ? 'Aucun souvenir ne répond à cette recherche.'
              : 'Le mur est encore vide. Le premier souvenir déposé sera celui que les autres liront.'}
          </p>
        ) : (
          <>
            {epingles.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
                  Épinglés
                </h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {epingles.map((souvenir) => (
                    <CarteSouvenir key={souvenir.id} souvenir={souvenir} />
                  ))}
                </div>
              </section>
            )}

            {ordinaires.length > 0 && (
              <section className="mt-8">
                {epingles.length > 0 && (
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
                    Du plus récent au plus ancien
                  </h2>
                )}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {ordinaires.map((souvenir) => (
                    <CarteSouvenir key={souvenir.id} souvenir={souvenir} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
