import Link from 'next/link';
import { Rien, Section } from '@/components/personne/blocs';
import type { RecitResume } from '@/lib/recits';

/**
 * Les récits de famille qui mentionnent cette personne.
 *
 * Un souvenir la fait revivre en une anecdote ; un récit la relie à un
 * ensemble — la maison, la traversée, le métier. On les cite ici pour que
 * chaque fiche ouvre sur ce que la famille a écrit d'elle en plus long.
 */
export function RecitsQuiLaMentionnent({ recits }: { recits: RecitResume[] }) {
  return (
    <Section titre="Récits qui la mentionnent" compte={recits.length}>
      {recits.length === 0 ? (
        <Rien>
          Aucun récit ne la mentionne pour l’instant. Un récit — plus long qu’un souvenir —
          pourra la citer parmi les protagonistes.
        </Rien>
      ) : (
        <ul className="flex flex-col gap-4">
          {recits.map((r) => {
            const contexte = [r.patronyme ?? r.theme, r.periode].filter(Boolean).join(' · ');
            return (
              <li
                key={r.id}
                className="border-t border-bordure pt-4 first:border-t-0 first:pt-0"
              >
                <h3 className="text-base">
                  <Link
                    href={`/recits/${r.id}`}
                    className="transition hover:text-accent"
                  >
                    {r.titre}
                  </Link>
                </h3>

                {contexte && (
                  <p className="mt-0.5 text-xs text-encre-tres-douce">{contexte}</p>
                )}

                {r.chapeau && (
                  <p className="mt-2 text-sm italic leading-relaxed text-encre-douce">
                    {r.chapeau}
                  </p>
                )}

                <p className="mt-2 text-xs text-encre-tres-douce">Écrit par {r.auteur}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
