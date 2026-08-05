import Link from 'next/link';
import { EtiquettePortee } from '@/components/histoire/portee';
import type { Fait } from '@/lib/histoire';

/** Au-delà, la carte deviendrait une liste : le reste se lit sur la fiche. */
const MAX_PERSONNES = 4;

export function CarteFait({ fait }: { fait: Fait }) {
  const montrees = fait.personnes.slice(0, MAX_PERSONNES);
  const reste = fait.personnes.length - montrees.length;

  return (
    <article className="carte p-5 transition hover:border-bordure-forte">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h3 className="text-lg leading-snug">
          <Link href={`/histoire/${fait.id}`} className="transition hover:text-accent">
            {fait.titre}
          </Link>
        </h3>
        <EtiquettePortee portee={fait.portee} />
      </div>

      <p className="mt-1 text-sm text-encre-tres-douce">
        {fait.dateTexte}
        {fait.lieuCourt && <> · {fait.lieuCourt}</>}
      </p>

      {fait.resume && (
        <p className="mt-3 text-sm leading-relaxed text-encre-douce">{fait.resume}</p>
      )}

      {fait.personnes.length > 0 && (
        <div className="mt-4 border-t border-bordure pt-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            Qui l’a vécu
          </h4>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {montrees.map((personne) => (
              <li key={personne.id} className="leading-relaxed">
                <Link href={`/personne/${personne.id}`} className="font-medium text-encre hover:text-accent">
                  {personne.nomComplet}
                </Link>
                {personne.incidence && (
                  <span className="text-encre-douce"> — {personne.incidence}</span>
                )}
              </li>
            ))}
          </ul>
          {reste > 0 && (
            <Link href={`/histoire/${fait.id}`} className="lien-discret mt-2 inline-block text-xs">
              et {reste} autre{reste > 1 ? 's' : ''} personne{reste > 1 ? 's' : ''}
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
