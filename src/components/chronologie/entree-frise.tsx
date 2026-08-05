'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import type { Cote } from '@/lib/branches';
import {
  LIBELLE_COTE,
  LIBELLE_EVENEMENT,
  LIBELLE_PORTEE,
  type EntreeChronologie,
} from '@/components/chronologie/vocabulaire';

/**
 * Une ligne de la frise.
 *
 * Les deux fils ne doivent jamais se confondre, et pas seulement pour qui
 * distingue les couleurs : la vie de la famille est posée sur une carte pleine,
 * marquée d'un rond ; la grande Histoire est en retrait, sur un fond discret
 * cerné de pointillés, marquée d'un losange, et son étiquette le dit en toutes
 * lettres. Forme, fond, décalage et mot : quatre signaux plutôt qu'un.
 */

const STYLE_COTE: Record<Cote, { pastille: string; bord: string }> = {
  paternelle: { pastille: 'bg-paternelle', bord: 'border-l-paternelle' },
  maternelle: { pastille: 'bg-maternelle', bord: 'border-l-maternelle' },
  commune: { pastille: 'bg-commune', bord: 'border-l-commune' },
};

const STYLE_SANS_COTE = { pastille: 'bg-encre-tres-douce', bord: 'border-l-bordure-forte' };

export function EntreeFrise({ entree }: { entree: EntreeChronologie }) {
  return entree.nature === 'famille' ? (
    <LigneFamille entree={entree} />
  ) : (
    <LigneHistoire entree={entree} />
  );
}

/** Le rail vertical et son marqueur, communs aux deux natures d'entrée. */
function Ligne({ marqueur, children }: { marqueur: ReactNode; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[0.625rem_1fr] items-stretch gap-x-3 sm:gap-x-4">
      <div className="flex flex-col items-center" aria-hidden>
        <span className="h-3.5 w-px bg-bordure" />
        {marqueur}
        <span className="w-px flex-1 bg-bordure" />
      </div>
      <div className="min-w-0 pb-3">{children}</div>
    </li>
  );
}

function LigneFamille({ entree }: { entree: EntreeChronologie }) {
  const style = entree.cote ? STYLE_COTE[entree.cote] : STYLE_SANS_COTE;

  const contexte = [
    entree.dateTexte,
    entree.lieu,
    entree.cote ? LIBELLE_COTE[entree.cote] : null,
  ].filter(Boolean);

  return (
    <Ligne
      marqueur={<span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.pastille}`} />}
    >
      <article
        className={`rounded-[var(--rayon-petit)] border border-l-4 border-bordure bg-fond-carte px-3.5 py-2.5 shadow-[var(--ombre-douce)] ${style.bord}`}
      >
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.09em] text-encre-tres-douce">
          {entree.type ? LIBELLE_EVENEMENT[entree.type] : 'Événement'}
        </p>

        <p className="mt-0.5 leading-snug text-encre">
          {entree.personnes.length > 0 ? (
            entree.personnes.map((personne, rang) => (
              <Fragment key={personne.id}>
                {rang > 0 && <span className="text-encre-tres-douce"> et </span>}
                <Link href={`/personne/${personne.id}`} className="lien-discret font-medium">
                  {personne.nom}
                </Link>
              </Fragment>
            ))
          ) : (
            <span className="text-encre-douce">Personne non identifiée</span>
          )}
        </p>

        {entree.titre && (
          <p className="mt-1 text-sm leading-snug text-encre-douce">{entree.titre}</p>
        )}
        {entree.detail && (
          <p className="mt-1 text-sm leading-snug text-encre-douce">{entree.detail}</p>
        )}

        {contexte.length > 0 && (
          <p className="mt-1.5 text-xs text-encre-tres-douce">{contexte.join(' · ')}</p>
        )}
      </article>
    </Ligne>
  );
}

function LigneHistoire({ entree }: { entree: EntreeChronologie }) {
  const contexte = [entree.dateTexte, entree.lieu].filter(Boolean);

  return (
    <Ligne
      marqueur={
        <span className="h-2.5 w-2.5 shrink-0 rotate-45 border border-encre-tres-douce bg-fond" />
      }
    >
      {/* Le décalage met la grande Histoire en retrait de la vie familiale. */}
      <article className="ml-0 rounded-[var(--rayon-petit)] border border-dashed border-bordure-forte bg-fond-doux px-3.5 py-2.5 sm:ml-6">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.09em] text-encre-tres-douce">
          Grande Histoire
          {entree.portee ? ` · ${LIBELLE_PORTEE[entree.portee]}` : ''}
        </p>

        <p className="mt-0.5 font-titre text-base leading-snug text-encre">
          {entree.titre ?? 'Fait sans titre'}
        </p>

        {entree.detail && (
          <p className="mt-1 text-sm leading-snug text-encre-douce">{entree.detail}</p>
        )}

        {contexte.length > 0 && (
          <p className="mt-1.5 text-xs text-encre-tres-douce">{contexte.join(' · ')}</p>
        )}

        {entree.sourceUrl && (
          <a
            href={entree.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="lien-discret mt-1.5 inline-block text-xs"
          >
            Lire la source
          </a>
        )}
      </article>
    </Ligne>
  );
}
