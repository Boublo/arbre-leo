'use client';

import { EntreeFrise } from '@/components/chronologie/entree-frise';
import {
  accorderPluriel,
  type EntreeChronologie,
} from '@/components/chronologie/vocabulaire';
import type { VueLieux } from '@/components/chronologie/regroupement';

/**
 * Vue alternative : la frise regroupée par lieu.
 *
 * On y suit la géographie de la famille plutôt que sa chronologie. Chaque
 * commune apparaît une seule fois, avec les événements qu'elle a vus, dans
 * leur ordre d'apparition. Le résultat lit comme un carnet de séjours et rend
 * lisibles les migrations : on voit d'un coup où la famille s'est installée,
 * combien de temps elle y est restée, quand elle en est partie.
 */

export function VueParLieux({
  vue,
  onContextualiser,
}: {
  vue: VueLieux;
  onContextualiser?: (entree: EntreeChronologie) => void;
}) {
  const total =
    vue.groupes.reduce((n, g) => n + g.entrees.length, 0) + vue.sansLieu.length;

  if (total === 0) {
    return (
      <p className="carte mt-10 px-5 py-8 text-center text-encre-douce">
        Aucun événement ne correspond à ces réglages. Rétablissez un type
        d’événement ou revenez aux deux branches.
      </p>
    );
  }

  return (
    <>
      {vue.groupes.map((groupe) => (
        <section
          key={groupe.cle}
          id={`lieu-${groupe.cle}`}
          className="mt-8 scroll-mt-36"
        >
          <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[var(--rayon)] border border-bordure-forte bg-fond-doux px-4 py-3 text-2xl">
            <span>{groupe.lieu}</span>
            <span className="font-sans text-sm font-normal tabular-nums text-encre-tres-douce">
              {formaterPeriode(groupe.premiereAnnee, groupe.derniereAnnee)} ·{' '}
              {accorderPluriel(groupe.entrees.length, 'entrée', 'entrées')}
            </span>
          </h2>

          <ol className="mt-4">
            {groupe.entrees.map((entree) => (
              <EntreeFrise
                key={entree.cle}
                entree={entree}
                onContextualiser={onContextualiser}
              />
            ))}
          </ol>
        </section>
      ))}

      {vue.sansLieu.length > 0 && (
        <section id="lieu-inconnu" className="mt-10 scroll-mt-36">
          <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[var(--rayon)] border border-dashed border-bordure-forte bg-fond-doux px-4 py-3 text-2xl">
            <span>Lieu inconnu</span>
            <span className="font-sans text-sm font-normal tabular-nums text-encre-tres-douce">
              {accorderPluriel(vue.sansLieu.length, 'entrée', 'entrées')}
            </span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-encre-douce">
            Ces entrées ne portent pas encore de lieu identifiable. Un acte,
            un recensement ou une transcription les rattachera à une commune.
          </p>
          <ol className="mt-4">
            {vue.sansLieu.map((entree) => (
              <EntreeFrise
                key={entree.cle}
                entree={entree}
                onContextualiser={onContextualiser}
              />
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

function formaterPeriode(debut: number | null, fin: number | null): string {
  if (debut === null && fin === null) return 'Sans date connue';
  if (debut !== null && fin !== null && debut !== fin) return `${debut} – ${fin}`;
  return `${debut ?? fin}`;
}
