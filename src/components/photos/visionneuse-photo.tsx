'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ECHELLE_MIN = 1;
const ECHELLE_MAX = 4;

/**
 * Plein écran pour une photo : zoom à la molette ou au pincement, déplacement
 * quand on est agrandi. Même logique que la galerie des souvenirs, mais pour
 * une seule image.
 */
export function VisionneusePhoto({
  src,
  alt,
  ouverte,
  onFermer,
}: {
  src: string;
  alt: string;
  ouverte: boolean;
  onFermer: () => void;
}) {
  const [echelle, setEchelle] = useState(ECHELLE_MIN);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const glisse = useRef(false);
  const dernierPoint = useRef({ x: 0, y: 0 });
  const pincement = useRef<{ distance: number; echelle: number } | null>(null);
  const conteneur = useRef<HTMLDivElement>(null);

  const reinitialiser = useCallback(() => {
    setEchelle(ECHELLE_MIN);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!ouverte) reinitialiser();
  }, [ouverte, reinitialiser]);

  useEffect(() => {
    if (!ouverte) return;

    function auClavier(evenement: KeyboardEvent) {
      if (evenement.key === 'Escape') onFermer();
    }

    const precedent = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', auClavier);

    return () => {
      document.body.style.overflow = precedent;
      window.removeEventListener('keydown', auClavier);
    };
  }, [ouverte, onFermer]);

  const ajusterEchelle = useCallback((facteur: number) => {
    setEchelle((courante) => {
      const suivante = Math.min(ECHELLE_MAX, Math.max(ECHELLE_MIN, courante * facteur));
      if (suivante <= ECHELLE_MIN) setPosition({ x: 0, y: 0 });
      return suivante;
    });
  }, []);

  const surMolette = useCallback(
    (evenement: React.WheelEvent) => {
      evenement.preventDefault();
      ajusterEchelle(evenement.deltaY > 0 ? 0.9 : 1.1);
    },
    [ajusterEchelle],
  );

  const distanceEntre = (a: React.Touch, b: React.Touch) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  if (!ouverte) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex flex-col bg-fond/95 p-4 backdrop-blur-sm"
      onClick={(evenement) => {
        if (evenement.target === evenement.currentTarget) onFermer();
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => ajusterEchelle(1 / 1.25)}
            disabled={echelle <= ECHELLE_MIN}
            aria-label="Réduire"
            className="grid h-9 w-9 place-items-center rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte text-lg text-encre transition hover:bg-fond-doux disabled:opacity-40"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => ajusterEchelle(1.25)}
            disabled={echelle >= ECHELLE_MAX}
            aria-label="Agrandir"
            className="grid h-9 w-9 place-items-center rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte text-lg text-encre transition hover:bg-fond-doux disabled:opacity-40"
          >
            +
          </button>
          {echelle > ECHELLE_MIN && (
            <button
              type="button"
              onClick={reinitialiser}
              className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-1.5 text-xs text-encre transition hover:bg-fond-doux"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onFermer}
          autoFocus
          className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-1.5 text-sm text-encre transition hover:bg-fond-doux"
        >
          Fermer
        </button>
      </div>

      <div
        ref={conteneur}
        className="flex flex-1 touch-none items-center justify-center overflow-hidden py-4"
        onWheel={surMolette}
        onPointerDown={(evenement) => {
          if (echelle <= ECHELLE_MIN) return;
          glisse.current = true;
          dernierPoint.current = { x: evenement.clientX, y: evenement.clientY };
          evenement.currentTarget.setPointerCapture(evenement.pointerId);
        }}
        onPointerMove={(evenement) => {
          if (!glisse.current) return;
          const dx = evenement.clientX - dernierPoint.current.x;
          const dy = evenement.clientY - dernierPoint.current.y;
          dernierPoint.current = { x: evenement.clientX, y: evenement.clientY };
          setPosition((courante) => ({ x: courante.x + dx, y: courante.y + dy }));
        }}
        onPointerUp={() => {
          glisse.current = false;
        }}
        onPointerCancel={() => {
          glisse.current = false;
        }}
        onTouchStart={(evenement) => {
          if (evenement.touches.length === 2) {
            pincement.current = {
              distance: distanceEntre(evenement.touches[0], evenement.touches[1]),
              echelle,
            };
          }
        }}
        onTouchMove={(evenement) => {
          if (evenement.touches.length !== 2 || !pincement.current) return;
          evenement.preventDefault();
          const distance = distanceEntre(evenement.touches[0], evenement.touches[1]);
          const ratio = distance / pincement.current.distance;
          const suivante = Math.min(
            ECHELLE_MAX,
            Math.max(ECHELLE_MIN, pincement.current.echelle * ratio),
          );
          setEchelle(suivante);
          if (suivante <= ECHELLE_MIN) setPosition({ x: 0, y: 0 });
        }}
        onTouchEnd={() => {
          pincement.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${echelle})`,
          }}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-75"
        />
      </div>

      <p className="text-center text-xs text-encre-tres-douce">
        Molette ou pincement pour zoomer · glisser pour déplacer · Échap pour fermer
      </p>
    </div>
  );
}
