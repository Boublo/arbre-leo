'use client';

import Link from 'next/link';
import {
  dateMariageLisible,
  libelleCouple,
  urlAjoutEnfant,
  type UnionSansEnfant,
} from '@/lib/unions-sans-enfant';
import { brancheLisible } from '@/components/recherches/vocabulaire';

/**
 * Couples enregistrés sans descendance — l'autre face des « pistes évidentes » :
 * ce n'est pas une personne isolée qu'il faut documenter, c'est une fratrie
 * entière qui manque peut-être.
 */
export function UnionsSansEnfant({
  unions,
  onOuvrirChantier,
  peutContribuer = false,
}: {
  unions: UnionSansEnfant[];
  onOuvrirChantier?: (union: UnionSansEnfant) => void;
  peutContribuer?: boolean;
}) {
  if (unions.length === 0) return null;

  return (
    <section aria-labelledby="unions-sans-enfant" className="carte flex flex-col gap-3 p-4">
      <div>
        <h2 id="unions-sans-enfant" className="text-lg">
          Couples sans descendance connue
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-encre-douce">
          {unions.length} union{unions.length > 1 ? 's' : ''} mariée
          {unions.length > 1 ? 's' : ''} ou constituée{unions.length > 1 ? 's' : ''} dont aucun
          enfant n’est encore rattaché — souvent parce que les actes de naissance n’ont pas été
          consultés.
        </p>
      </div>

      <ul className="flex max-h-[28rem] flex-col overflow-y-auto">
        {unions.map((union) => {
          const branche = brancheLisible(union.branches[0] ?? null);
          const date = dateMariageLisible(union);
          const lien =
            union.conjointA && union.conjointB ? (
              <span className="text-sm">
                <Link href={`/personne/${union.conjointA.id}`} className="lien-discret">
                  {union.conjointA.nom}
                </Link>
                <span aria-hidden className="mx-1 text-encre-tres-douce">
                  ×
                </span>
                <Link href={`/personne/${union.conjointB.id}`} className="lien-discret">
                  {union.conjointB.nom}
                </Link>
              </span>
            ) : (
              <Link
                href={`/personne/${(union.conjointA ?? union.conjointB)!.id}`}
                className="lien-discret text-sm"
              >
                {libelleCouple(union)}
              </Link>
            );

          return (
            <li
              key={union.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-bordure py-2 last:border-0"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-1.5">
                  {branche && (
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: branche.ton }}
                    />
                  )}
                  {lien}
                </span>
                {date && (
                  <span className="text-xs text-encre-tres-douce">Mariage {date}</span>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {peutContribuer && urlAjoutEnfant(union) && (
                  <Link
                    href={urlAjoutEnfant(union)!}
                    className="rounded-[var(--rayon-petit)] border border-bordure-forte px-2 py-1 text-xs text-encre-douce
                               transition hover:border-accent hover:text-accent"
                  >
                    Ajouter un enfant
                    <span className="sr-only"> à {libelleCouple(union)}</span>
                  </Link>
                )}
                {onOuvrirChantier && (
                  <button
                    type="button"
                    onClick={() => onOuvrirChantier(union)}
                    className="rounded-[var(--rayon-petit)] border border-bordure-forte px-2 py-1 text-xs text-encre-douce
                               transition hover:border-accent hover:text-accent"
                  >
                    Ouvrir un chantier
                    <span className="sr-only"> pour {libelleCouple(union)}</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
