'use client';

import { useState } from 'react';
import { HAUTEUR_NOEUD, ESPACEMENT_Y, nommerRang, type Disposition } from '@/lib/layout-arbre';

type Transform = { x: number; y: number; k: number };

/**
 * Repères de génération fixés en marge gauche : ils restent lisibles pendant
 * le zoom et le déplacement, contrairement aux libellés SVG qui partent avec l'arbre.
 * Sur mobile, repliés par défaut pour laisser la place aux cartes.
 */
export function ReperesRang({
  disposition,
  transform,
  prenomFocus,
  hauteurVue,
}: {
  disposition: Disposition;
  transform: Transform;
  prenomFocus: string;
  hauteurVue: number;
}) {
  const [ouverts, setOuverts] = useState(false);

  if (hauteurVue <= 0) return null;

  const repères: { rang: number; y: number; libelle: string }[] = [];

  for (let rang = 0; rang <= disposition.rangMax; rang++) {
    const mondeY = rang * ESPACEMENT_Y + HAUTEUR_NOEUD / 2;
    const ecranY = transform.y + transform.k * mondeY;
    if (ecranY < 8 || ecranY > hauteurVue - 8) continue;

    repères.push({
      rang,
      y: ecranY,
      libelle: nommerRang(rang, disposition.mode, prenomFocus, disposition.rangRacine),
    });
  }

  if (repères.length === 0) return null;

  return (
    <>
      <button
        type="button"
        aria-expanded={ouverts}
        aria-label={ouverts ? 'Masquer les repères de génération' : 'Afficher les repères de génération'}
        onClick={() => setOuverts((v) => !v)}
        className="pointer-events-auto absolute left-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full border border-bordure bg-fond-carte/95 text-xs text-encre-douce shadow-[var(--ombre-douce)] backdrop-blur-sm sm:hidden"
      >
        {ouverts ? '◂' : 'Gen'}
      </button>

      <div
        aria-hidden={!ouverts}
        className={`pointer-events-none absolute inset-y-0 left-0 z-[9] transition-[width,opacity] duration-200 sm:pointer-events-none sm:!w-36 sm:!max-w-[10rem] sm:!opacity-100 ${
          ouverts
            ? 'w-[max(5.5rem,18vw)] max-w-[9rem] opacity-100'
            : 'w-0 max-w-0 overflow-hidden opacity-0 sm:w-36'
        }`}
      >
        {repères.map(({ rang, y, libelle }) => (
          <p
            key={rang}
            className="absolute right-1 max-w-full truncate px-1 text-[11px] leading-tight text-encre-tres-douce sm:text-[13px]"
            style={{
              top: y,
              transform: 'translateY(-50%)',
              fontFamily: 'var(--font-titre)',
            }}
            title={libelle}
          >
            {libelle}
          </p>
        ))}
      </div>
    </>
  );
}
