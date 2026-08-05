import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { chargerFait, chargerPersonnesAChoisir, peutContribuer } from '@/lib/histoire';
import { EtiquetteBranche, EtiquettePortee } from '@/components/histoire/portee';
import {
  BoutonDetacher,
  FormulaireRattachement,
} from '@/components/histoire/formulaire-rattachement';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/histoire/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const fait = await chargerFait(id);
  return { title: fait ? fait.titre : 'Fait introuvable' };
}

export default async function PageFait({ params }: PageProps<'/histoire/[id]'>) {
  const { id } = await params;

  const [fait, contributeur] = await Promise.all([chargerFait(id), peutContribuer()]);
  if (!fait) notFound();

  // La liste des personnes n'est chargée que si elle peut servir.
  const personnes = contributeur ? await chargerPersonnesAChoisir() : [];

  return (
    <>
      <Navigation />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link href="/histoire" className="lien-discret text-sm">
          ← La grande Histoire
        </Link>

        <article className="mt-6">
          <header>
            <h1 className="text-3xl leading-tight">{fait.titre}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <EtiquettePortee portee={fait.portee} />
              {fait.branche && <EtiquetteBranche branche={fait.branche} />}
            </div>

            <p className="mt-3 text-sm text-encre-tres-douce">
              {fait.dateTexte}
              {fait.lieu && <> · {fait.lieu}</>}
            </p>
          </header>

          {fait.resume && (
            <p className="mt-6 text-lg leading-relaxed text-encre-douce">{fait.resume}</p>
          )}

          {fait.description && (
            <div className="mt-6 whitespace-pre-line leading-relaxed text-encre">
              {fait.description}
            </div>
          )}

          {fait.sourceUrl && (
            <p className="mt-6 text-sm">
              <span className="text-encre-tres-douce">Source&nbsp;: </span>
              <a
                href={fait.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="lien-discret break-all"
              >
                {fait.sourceUrl}
              </a>
            </p>
          )}
        </article>

        <section aria-labelledby="titre-personnes" className="mt-12">
          <h2 id="titre-personnes" className="text-xl">
            Qui l’a traversé
          </h2>

          {fait.personnes.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-encre-douce">
              Personne n’est encore rattaché à ce fait.
              {contributeur
                ? ' Rattachez celles et ceux qui l’ont vécu, en disant pour chacun ce que cela a changé.'
                : ' Un contributeur pourra dire qui, dans la famille, l’a vécu.'}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {fait.personnes.map((personne) => (
                <li key={personne.id} className="carte flex items-start justify-between gap-4 p-4">
                  <div>
                    <Link
                      href={`/personne/${personne.id}`}
                      className="font-medium text-encre hover:text-accent"
                    >
                      {personne.nomComplet}
                    </Link>
                    {personne.incidence ? (
                      <p className="mt-1 text-sm leading-relaxed text-encre-douce">
                        {personne.incidence}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-encre-tres-douce">
                        Ce que ce fait a changé pour elle reste à écrire.
                      </p>
                    )}
                  </div>

                  {contributeur && (
                    <BoutonDetacher
                      faitId={fait.id}
                      personneId={personne.id}
                      nomComplet={personne.nomComplet}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {contributeur && (
          <section aria-labelledby="titre-rattacher" className="carte mt-10 p-6">
            <h2 id="titre-rattacher" className="text-lg">
              Rattacher une personne
            </h2>
            <p className="mt-1 text-sm text-encre-douce">
              Choisissez quelqu’un de l’arbre, puis écrivez ce que ce fait a
              changé dans sa vie. Rattacher à nouveau la même personne réécrit
              simplement son incidence.
            </p>

            <FormulaireRattachement faitId={fait.id} personnes={personnes} />
          </section>
        )}
      </main>
    </>
  );
}
