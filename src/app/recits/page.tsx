import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { BarreScroll } from '@/components/interactions/barre-scroll';
import { RaccourciAccueil } from '@/components/interactions/raccourci-accueil';
import { CarteRecit } from '@/components/recits/carte-recit';
import { SelecteurFamille } from '@/components/recits/selecteur-famille';
import { chargerChoixFamilles, chargerRecits, lireDroits } from '@/lib/recits';

export const metadata = { title: 'Récits de famille' };

// Un récit qui vient d'être publié doit apparaître tout de suite.
export const dynamic = 'force-dynamic';

function premier(valeur: string | string[] | undefined): string | null {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  const propre = (brut ?? '').trim();
  return propre === '' ? null : propre;
}

export default async function PageRecits({ searchParams }: PageProps<'/recits'>) {
  const parametres = await searchParams;
  const famille = premier(parametres.famille);

  const [choix, recits, droits] = await Promise.all([
    chargerChoixFamilles(),
    chargerRecits(famille),
    lireDroits(),
  ]);

  // La sélection demandée peut désigner un patronyme sans aucun récit encore :
  // on garde l'intention pour l'afficher, même absente du sélecteur.
  const familleConnue = famille && choix.some((c) => c.patronyme === famille);
  const familleActive = famille && !familleConnue ? [...choix, { patronyme: famille, nombre: 0 }] : choix;

  return (
    <>
      <BarreScroll />
      <RaccourciAccueil />
      <Navigation />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl">Récits de famille</h1>
            <p className="mt-2 max-w-2xl text-encre-douce">
              L’histoire longue plutôt que l’anecdote : ce qui traverse un couple, une
              maison, un métier, une génération. À écrire pour que le fil ne se perde pas.
            </p>
          </div>

          {droits.peutContribuer && (
            <Link
              href="/recits/nouveau"
              className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste transition hover:brightness-110"
            >
              Écrire un récit
            </Link>
          )}
        </div>

        <section className="mt-6" aria-label="Choix d’une famille">
          <SelecteurFamille choix={familleActive} actif={famille} />
        </section>

        <div className="mt-8">
          {recits.length === 0 ? (
            <EtatVide famille={famille} peutEcrire={droits.peutContribuer} />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recits.map((recit) => (
                <li key={recit.id}>
                  <CarteRecit recit={recit} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}

function EtatVide({
  famille,
  peutEcrire,
}: {
  famille: string | null;
  peutEcrire: boolean;
}) {
  const message = famille
    ? `Cette famille n’a pas encore de récit. Le premier est à écrire.`
    : `Aucun récit n’a encore été déposé. Le premier deviendra la matière du site.`;

  return (
    <section className="carte flex flex-col items-center gap-4 p-8 text-center">
      <p className="text-encre-douce">{message}</p>
      {peutEcrire ? (
        <Link
          href={
            famille
              ? `/recits/nouveau?famille=${encodeURIComponent(famille)}`
              : '/recits/nouveau'
          }
          className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2 text-sm font-medium text-accent-contraste transition hover:brightness-110"
        >
          Écrire le premier récit
        </Link>
      ) : (
        <p className="text-xs text-encre-tres-douce">
          Seuls les contributeurs peuvent écrire un récit.
        </p>
      )}
    </section>
  );
}
