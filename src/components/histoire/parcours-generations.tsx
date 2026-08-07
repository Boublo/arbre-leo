import Link from 'next/link';
import type { GenerationAscendance } from '@/lib/generations';

export function ParcoursGenerations({
  generations,
}: {
  generations: GenerationAscendance[];
}) {
  if (generations.length === 0) return null;

  const sansAscendant = generations.length === 1;
  return (
    <section aria-labelledby="generations-titre" className="flex flex-col gap-5">
      <div className="carte p-4 sm:p-5">
        <h2 id="generations-titre" className="font-titre text-2xl text-encre">
          Génération après génération
        </h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-encre-douce">
          Cette lecture suit seulement les filiations présentes dans l’arbre. Une absence est une
          information : elle ne signifie jamais qu’un lien a été deviné ou complété.
        </p>
      </div>

      {generations.map((generation) => (
        <section key={generation.rang} className="carte p-4 sm:p-5" aria-labelledby={`generation-${generation.rang}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id={`generation-${generation.rang}`} className="text-lg text-encre">
              {generation.libelle}
            </h3>
            <p className="text-sm text-encre-tres-douce">
              {generation.personnes.length} personne{generation.personnes.length > 1 ? 's' : ''}
            </p>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {generation.personnes.map((personne) => (
              <li key={personne.id}>
                <Link
                  href={`/personne/${personne.id}`}
                  className="block rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-3 py-3 transition hover:border-bordure-forte hover:bg-accent-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="block font-medium text-encre">{personne.nomComplet}</span>
                  <span className="mt-0.5 block text-sm text-encre-tres-douce">
                    {annees(personne.naissance?.annee, personne.deces?.annee)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {sansAscendant && (
        <p className="rounded-[var(--rayon-petit)] border border-dashed border-bordure px-4 py-3 text-sm text-encre-douce">
          Aucun parent n’est encore relié à cette personne. Cette branche reste ouverte à la recherche.
        </p>
      )}
    </section>
  );
}

function annees(naissance: number | null | undefined, deces: number | null | undefined): string {
  if (naissance && deces) return `${naissance} – ${deces}`;
  if (naissance) return `Né(e) en ${naissance}`;
  if (deces) return `Décédé(e) en ${deces}`;
  return 'Dates à compléter';
}
