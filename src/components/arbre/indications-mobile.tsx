'use client';

/**
 * Indications de navigation compactes, toujours visibles sur mobile
 * (le bandeau complet reste réservé aux grands écrans).
 */

export function IndicationsMobile({ masquer = false }: { masquer?: boolean }) {
  if (masquer) return null;
  return (
    <div
      role="note"
      className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-2 sm:hidden"
    >
      <p className="rounded-full border border-bordure bg-fond-carte/95 px-3 py-1 text-[11px] text-encre-douce shadow-[var(--ombre-douce)] backdrop-blur-sm">
        <strong className="font-medium text-encre">Pincer</strong> zoomer ·{' '}
        <strong className="font-medium text-encre">Glisser</strong> déplacer ·{' '}
        <strong className="font-medium text-encre">Appuyer</strong> ouvrir
      </p>
    </div>
  );
}
