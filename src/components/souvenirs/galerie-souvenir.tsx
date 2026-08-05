'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PhotoSouvenir } from '@/lib/souvenirs';

/**
 * Les photos du souvenir, en grand.
 *
 * Les adresses sont signées et expirent : si l’une d’elles manque, on le dit
 * plutôt que d’afficher un cadre vide.
 */
export function GalerieSouvenir({ photos, titre }: { photos: PhotoSouvenir[]; titre: string }) {
  const [ouverte, setOuverte] = useState<number | null>(null);

  const visibles = photos.filter((p) => p.url !== null);

  const deplacer = useCallback(
    (pas: number) => {
      setOuverte((index) => {
        if (index === null) return null;
        return (index + pas + visibles.length) % visibles.length;
      });
    },
    [visibles.length]
  );

  useEffect(() => {
    if (ouverte === null) return;

    function auClavier(evenement: KeyboardEvent) {
      if (evenement.key === 'Escape') setOuverte(null);
      if (evenement.key === 'ArrowRight') deplacer(1);
      if (evenement.key === 'ArrowLeft') deplacer(-1);
    }

    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [ouverte, deplacer]);

  if (photos.length === 0) return null;

  const agrandie = ouverte === null ? null : visibles[ouverte];

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg">
        {photos.length === 1 ? 'La photo' : `Les ${photos.length} photos`}
      </h2>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visibles.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOuverte(index)}
              className="block w-full overflow-hidden rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux transition hover:border-bordure-forte"
            >
              <span className="sr-only">Agrandir la photo {index + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url ?? ''}
                alt={photo.titre ?? ''}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {photos.length > visibles.length && (
        <p className="text-xs text-encre-tres-douce">
          {photos.length - visibles.length} photo
          {photos.length - visibles.length > 1 ? 's sont' : ' est'} momentanément illisible
          {photos.length - visibles.length > 1 ? 's' : ''}. Rechargez la page.
        </p>
      )}

      {agrandie && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo de « ${titre} »`}
          className="fixed inset-0 z-50 flex flex-col bg-fond/95 p-4 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-encre-douce">
              {(ouverte ?? 0) + 1} sur {visibles.length}
            </p>
            <button
              type="button"
              onClick={() => setOuverte(null)}
              autoFocus
              className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-1.5 text-sm text-encre transition hover:bg-fond-doux"
            >
              Fermer
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-hidden py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={agrandie.url ?? ''}
              alt={agrandie.titre ?? ''}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {visibles.length > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => deplacer(-1)}
                className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-4 py-2 text-sm text-encre transition hover:bg-fond-doux"
              >
                Précédente
              </button>
              <button
                type="button"
                onClick={() => deplacer(1)}
                className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-4 py-2 text-sm text-encre transition hover:bg-fond-doux"
              >
                Suivante
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
