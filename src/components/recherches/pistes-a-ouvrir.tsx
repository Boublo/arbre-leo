'use client';

import Link from 'next/link';
import { brancheLisible, type PisteVue } from '@/components/recherches/vocabulaire';

/**
 * Les personnes que l'arbre ne connaît que par un nom.
 *
 * Leur fiche porte le niveau de preuve « à chercher » : rien n'est documenté,
 * et aucun chantier ne les couvre encore. Ce sont les pistes les moins
 * discutables — il suffit de cliquer pour ouvrir la demande correspondante.
 */
export function PistesAOuvrir({
  pistes,
  onOuvrir,
}: {
  pistes: PisteVue[];
  onOuvrir?: (piste: PisteVue) => void;
}) {
  return (
    <aside aria-labelledby="pistes-evidentes" className="carte flex flex-col gap-3 p-4">
      <div>
        <h2 id="pistes-evidentes" className="text-lg">
          Pistes évidentes
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-encre-douce">
          Ces personnes figurent dans l’arbre sur la seule foi d’un nom : leur fiche est marquée
          « à chercher » et aucun chantier ne les couvre.
        </p>
      </div>

      {pistes.length === 0 ? (
        <p className="text-sm text-encre-tres-douce">
          Rien à signaler : chaque personne non documentée a déjà son chantier.
        </p>
      ) : (
        <ul className="flex max-h-96 flex-col overflow-y-auto">
          {pistes.map((piste) => {
            const branche = brancheLisible(piste.branches[0] ?? null);
            return (
              <li
                key={piste.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-bordure py-1.5 last:border-0"
              >
                <span className="flex items-center gap-1.5 text-sm">
                  {branche && (
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: branche.ton }}
                    />
                  )}
                  <Link href={`/personne/${piste.id}`} className="lien-discret">
                    {piste.nom}
                  </Link>
                </span>

                {onOuvrir && (
                  <button
                    type="button"
                    onClick={() => onOuvrir(piste)}
                    className="rounded-[var(--rayon-petit)] border border-bordure-forte px-2 py-1 text-xs text-encre-douce
                               transition hover:border-accent hover:text-accent"
                  >
                    Ouvrir un chantier
                    <span className="sr-only"> pour {piste.nom}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
