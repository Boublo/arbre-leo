'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import type { Cote } from '@/lib/branches';
import { PREUVES } from '@/lib/preuves';
import {
  estEtaye,
  LIBELLE_COTE,
  LIBELLE_EVENEMENT,
  LIBELLE_PORTEE,
  LIBELLE_REMARQUABLE,
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
 *
 * Trois surcouches se posent selon ce que l'entrée porte :
 *  — un liseré d'or à gauche quand un acte l'étaye, et une pastille pleine or
 *    à côté du marqueur ;
 *  — un bandeau distinctif quand l'entrée fait tourner la géographie de la
 *    famille (mort d'un aïeul, premier passage dans un lieu) ;
 *  — un bouton discret « Contextualiser » qui ouvre le tiroir voisin.
 */

const STYLE_COTE: Record<Cote, { pastille: string; bord: string }> = {
  paternelle: { pastille: 'bg-paternelle', bord: 'border-l-paternelle' },
  maternelle: { pastille: 'bg-maternelle', bord: 'border-l-maternelle' },
  commune: { pastille: 'bg-commune', bord: 'border-l-commune' },
};

const STYLE_SANS_COTE = { pastille: 'bg-encre-tres-douce', bord: 'border-l-bordure-forte' };

export function EntreeFrise({
  entree,
  onContextualiser,
}: {
  entree: EntreeChronologie;
  /**
   * Rappelée quand on clique « Contextualiser ». La frise garde la trace de
   * l'entrée demandée et ouvre le tiroir en conséquence. Optionnel : la ligne
   * reste utilisable sans contexte, dans les listes accessoires.
   */
  onContextualiser?: (entree: EntreeChronologie) => void;
}) {
  return entree.nature === 'famille' ? (
    <LigneFamille entree={entree} onContextualiser={onContextualiser} />
  ) : (
    <LigneHistoire entree={entree} onContextualiser={onContextualiser} />
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

function LigneFamille({
  entree,
  onContextualiser,
}: {
  entree: EntreeChronologie;
  onContextualiser?: (entree: EntreeChronologie) => void;
}) {
  const style = entree.cote ? STYLE_COTE[entree.cote] : STYLE_SANS_COTE;
  const etaye = estEtaye(entree.niveauPreuve);
  const preuve = entree.niveauPreuve ? PREUVES[entree.niveauPreuve] : null;

  const contexte = [
    entree.dateTexte,
    entree.lieu,
    entree.cote ? LIBELLE_COTE[entree.cote] : null,
  ].filter(Boolean);

  return (
    <Ligne
      marqueur={
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.pastille} ${
            etaye ? 'ring-2 ring-or ring-offset-1 ring-offset-fond' : ''
          }`}
        />
      }
    >
      <article
        className={`relative rounded-[var(--rayon-petit)] border border-l-4 border-bordure bg-fond-carte px-3.5 py-2.5 shadow-[var(--ombre-douce)] ${style.bord} ${
          etaye ? 'border-r-2 border-r-or/50' : ''
        } ${entree.remarquable ? 'ring-1 ring-inset ring-or/40' : ''}`}
      >
        {entree.remarquable && (
          <p
            className="mb-1 flex items-center gap-1.5 text-[0.68rem] font-medium tracking-[0.02em] text-or"
            aria-label="Repère marquant"
          >
            <span aria-hidden>★</span>
            {LIBELLE_REMARQUABLE[entree.remarquable]}
          </p>
        )}

        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.09em] text-encre-tres-douce">
            {entree.type ? LIBELLE_EVENEMENT[entree.type] : 'Événement'}
          </p>
          {preuve && (
            <span
              className={`shrink-0 text-[0.65rem] font-medium uppercase tracking-wide ${
                etaye ? 'text-or' : 'text-encre-tres-douce'
              }`}
              title={preuve.explication}
            >
              {preuve.libelle}
            </span>
          )}
        </div>

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

        {onContextualiser && (
          <div className="mt-1.5">
            <BoutonContexte entree={entree} onContextualiser={onContextualiser} />
          </div>
        )}
      </article>
    </Ligne>
  );
}

function LigneHistoire({
  entree,
  onContextualiser,
}: {
  entree: EntreeChronologie;
  onContextualiser?: (entree: EntreeChronologie) => void;
}) {
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

        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          {entree.sourceUrl && (
            <a
              href={entree.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="lien-discret text-xs"
            >
              Lire la source
            </a>
          )}
          {onContextualiser && (
            <BoutonContexte entree={entree} onContextualiser={onContextualiser} />
          )}
        </div>
      </article>
    </Ligne>
  );
}

function BoutonContexte({
  entree,
  onContextualiser,
}: {
  entree: EntreeChronologie;
  onContextualiser: (entree: EntreeChronologie) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onContextualiser(entree)}
      className="lien-discret text-xs"
      aria-label="Ouvrir le contexte de cet événement"
    >
      Contextualiser
    </button>
  );
}
