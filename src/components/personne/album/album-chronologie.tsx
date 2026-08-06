'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { EvenementFiche, FaitFiche, MediaFiche } from '@/components/personne/donnees';
import { LIBELLE_EVENEMENT } from '@/components/personne/vocabulaire';
import { CarteMediaAlbum } from '@/components/personne/album/carte-media-album';
import {
  construireChronologie,
  libelleAnnee,
  type EntreeChronologie,
  type OptionsChronologie,
} from '@/components/personne/album/utilitaires-album';

export function AlbumChronologie({
  medias,
  evenements,
  faits,
  personneId,
  photoCarteId,
  options,
  onAgrandir,
}: {
  medias: MediaFiche[];
  evenements: EvenementFiche[];
  faits: FaitFiche[];
  personneId?: string;
  photoCarteId?: string | null;
  options: OptionsChronologie;
  onAgrandir: (media: MediaFiche) => void;
}) {
  const entrees = useMemo(
    () => construireChronologie(medias, evenements, faits, options),
    [medias, evenements, faits, options],
  );

  if (entrees.length === 0) {
    return (
      <p className="rounded-[var(--rayon)] border border-dashed border-bordure bg-fond-doux/60 px-5 py-8 text-center text-sm text-encre-douce">
        Aucun repère à afficher avec ces filtres. Ajoutez une date à vos photos ou
        réactivez les événements de vie.
      </p>
    );
  }

  let anneeCourante: number | null | undefined;

  return (
    <ol className="relative flex flex-col gap-0">
      <div
        aria-hidden
        className="absolute bottom-0 left-[1.125rem] top-0 w-px bg-gradient-to-b from-accent/40 via-bordure to-transparent sm:left-6"
      />

      {entrees.map((entree, index) => {
        const marqueurAnnee = entree.annee !== anneeCourante;
        if (marqueurAnnee) anneeCourante = entree.annee;

        return (
          <li key={entree.id} className="relative pb-8 last:pb-0">
            {marqueurAnnee && (
              <div className="mb-4 flex items-center gap-3 pl-0 sm:pl-1">
                <span
                  aria-hidden
                  className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-accent bg-fond-carte text-xs font-semibold text-accent shadow-[var(--ombre-douce)] sm:h-10 sm:w-10 sm:text-sm"
                >
                  {entree.annee === null ? '?' : String(entree.annee).slice(-2)}
                </span>
                <span className="font-titre text-lg text-encre sm:text-xl">
                  {libelleAnnee(entree.annee)}
                </span>
              </div>
            )}

            <div className={`pl-11 sm:pl-14 ${marqueurAnnee ? '' : '-mt-2'}`}>
              <EntreeChronologie
                entree={entree}
                personneId={personneId}
                photoCarteId={photoCarteId}
                accent={index % 2 === 0}
                onAgrandir={onAgrandir}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EntreeChronologie({
  entree,
  personneId,
  photoCarteId,
  accent,
  onAgrandir,
}: {
  entree: EntreeChronologie;
  personneId?: string;
  photoCarteId?: string | null;
  accent: boolean;
  onAgrandir: (media: MediaFiche) => void;
}) {
  if (entree.type === 'media') {
    return (
      <CarteMediaAlbum
        media={entree.media}
        personneId={personneId}
        estPortraitCarte={photoCarteId === entree.media.id}
        variante="chronologie"
        onAgrandir={
          entree.media.estImage && entree.media.url
            ? () => onAgrandir(entree.media)
            : undefined
        }
      />
    );
  }

  if (entree.type === 'evenement') {
    const e = entree.evenement;
    return (
      <article
        className={`rounded-[var(--rayon-petit)] border px-4 py-3 ${
          accent ? 'border-accent/25 bg-accent-clair/50' : 'border-bordure bg-fond-doux/70'
        }`}
      >
        <p className="text-[0.65rem] font-medium uppercase tracking-wider text-accent">
          {LIBELLE_EVENEMENT[e.type]}
        </p>
        <p className="mt-1 text-sm font-medium text-encre">
          {e.libelle ?? LIBELLE_EVENEMENT[e.type]}
        </p>
        <p className="mt-0.5 text-sm text-encre-douce">
          {[e.date, e.lieuCourt ?? e.lieu].filter(Boolean).join(' · ')}
        </p>
        {e.detail && <p className="mt-2 text-sm leading-relaxed text-encre-tres-douce">{e.detail}</p>}
      </article>
    );
  }

  const f = entree.fait;
  return (
    <article className="rounded-[var(--rayon-petit)] border border-commune/20 bg-commune/5 px-4 py-3">
      <p className="text-[0.65rem] font-medium uppercase tracking-wider text-commune">
        Contexte historique · {f.periode}
      </p>
      <p className="mt-1 text-sm font-medium text-encre">{f.titre}</p>
      {f.resume && <p className="mt-1 text-sm leading-relaxed text-encre-douce">{f.resume}</p>}
      {f.incidence && (
        <p className="mt-2 text-sm italic text-encre-tres-douce">« {f.incidence} »</p>
      )}
      {f.sourceUrl && (
        <p className="mt-2">
          <Link href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="lien-discret text-xs">
            En savoir plus
          </Link>
        </p>
      )}
    </article>
  );
}
