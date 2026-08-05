import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import type { PersonneArbre } from '@/lib/arbre';
import { anneesDeVie } from '@/components/decouverte/annees';
import { coteDesBranches, TON_COTE } from '@/lib/branches';

/**
 * Repère d'époque : une date marquante et les personnes de la famille qui
 * l'ont vécue.
 *
 * Une bande horizontale, sobre, à poser entre deux blocs de la découverte
 * pour ancrer l'arbre dans le temps long : « 1914 · Première Guerre — quatre
 * hommes de la famille sont mobilisés ». La date, à gauche, se lit d'un coup
 * d'œil ; l'événement la nomme ; la liste, à droite, dit qui, avec ses années
 * de vie — un nom sans dates n'apprend rien.
 */

export function RepereEpoque({
  annee,
  evenement,
  personnes,
  aide,
}: {
  annee: number;
  /** L'événement en une ligne : « Guerre d’Algérie », « Loi de 1901 ». */
  evenement: string;
  /** Les personnes de l'arbre concernées ; peut être vide. */
  personnes: PersonneArbre[];
  /** Précision facultative : ce que l'événement a changé pour la famille. */
  aide?: ReactNode;
}) {
  return (
    <article
      className="carte grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 p-5 sm:gap-x-8"
      aria-labelledby={`repere-${annee}`}
    >
      <div className="flex flex-col items-start border-r border-bordure pr-5 sm:pr-8">
        <span
          className="font-titre text-3xl leading-none text-encre sm:text-4xl"
          aria-hidden
        >
          {annee}
        </span>
        <span className="sr-only">Année {annee}</span>
      </div>

      <div className="min-w-0">
        <h3 id={`repere-${annee}`} className="text-lg leading-snug">
          {evenement}
        </h3>

        {aide && (
          <p className="mt-1 text-sm leading-relaxed text-encre-douce">{aide}</p>
        )}

        {personnes.length === 0 ? (
          <p className="mt-3 text-sm text-encre-tres-douce">
            Personne de l&apos;arbre n&apos;est encore rattachée à cet événement.
          </p>
        ) : (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
              {personnes.length === 1
                ? 'Une personne l’a vécu'
                : `${personnes.length} personnes l’ont vécu`}
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {personnes.map((personne, rang) => (
                <Fragment key={personne.id}>
                  {rang > 0 && (
                    <li aria-hidden className="text-encre-tres-douce">·</li>
                  )}
                  <li>
                    <LienPersonne personne={personne} />
                  </li>
                </Fragment>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Un lien discret vers une fiche, qui porte toujours les années de vie : la
 * règle du projet, sans exception, sinon un même prénom couvrirait quatre
 * générations sans que l'on sache duquel il s'agit.
 */
function LienPersonne({ personne }: { personne: PersonneArbre }) {
  const cote = coteDesBranches(personne.branches);
  const annees = anneesDeVie(personne);

  return (
    <Link
      href={`/personne/${personne.id}`}
      className="inline-flex items-baseline gap-1.5 rounded-[var(--rayon-petit)] px-1 py-0.5 transition hover:bg-fond-doux focus:outline-none"
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 self-center rounded-full"
        style={{ background: TON_COTE[cote] }}
      />
      <span className="font-medium text-encre">{personne.nomComplet}</span>
      <span className="text-xs text-encre-tres-douce">
        {annees ?? 'dates inconnues'}
      </span>
    </Link>
  );
}
