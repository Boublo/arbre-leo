'use client';

import { useState } from 'react';
import { VisionneusePhoto } from '@/components/photos/visionneuse-photo';

/**
 * Image d'une page photo avec une entrée évidente vers le plein écran.
 *
 * La visionneuse existante porte déjà zoom, pincement, déplacement et clavier.
 * Ce composant ne crée aucune URL ni requête : il réemploie l'URL signée que la
 * page détail a déjà reçue et conserve la page, ses légendes et ses souvenirs
 * derrière le dialogue.
 */
export function PhotoDetailPleinEcran({
  src,
  alt,
  largeur,
  hauteur,
}: {
  src: string;
  alt: string;
  largeur?: number;
  hauteur?: number;
}) {
  const [ouverte, setOuverte] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuverte(true)}
        aria-haspopup="dialog"
        aria-label={`Ouvrir ${alt} en plein écran`}
        className="group block w-full cursor-zoom-in text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
        <img
          src={src}
          alt={alt}
          width={largeur}
          height={hauteur}
          className="mx-auto max-h-[min(75vh,720px)] w-auto max-w-full object-contain transition group-hover:opacity-95"
        />
      </button>

      <div className="border-t border-bordure bg-fond-carte px-4 py-3 text-center">
        <button
          type="button"
          onClick={() => setOuverte(true)}
          aria-haspopup="dialog"
          className="min-h-11 rounded-[var(--rayon-petit)] border border-bordure px-4 py-2 text-sm font-medium text-encre transition hover:bg-fond-doux focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Agrandir la photo
        </button>
      </div>

      <VisionneusePhoto
        src={src}
        alt={alt}
        ouverte={ouverte}
        onFermer={() => setOuverte(false)}
      />
    </>
  );
}
