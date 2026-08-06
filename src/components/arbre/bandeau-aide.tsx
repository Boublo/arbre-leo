'use client';

/**
 * Bandeau d'aide montré au premier chargement.
 *
 * Il rappelle en une ligne les gestes de base, puis s'efface : après huit
 * secondes, ou dès qu'un mouvement est fait dans l'arbre. Sur mobile, les
 * indications parlent du tactile plutôt que de la molette ou du clavier.
 */

import { useEffect, useState } from 'react';

const DUREE_AVANT_FERMETURE = 8000;

export function BandeauAide({ signalActivite }: { signalActivite: number }) {
  const [visible, setVisible] = useState(true);
  const [signalAuMontage, setSignalAuMontage] = useState(signalActivite);

  if (visible && signalActivite !== signalAuMontage) {
    setSignalAuMontage(signalActivite);
    setVisible(false);
  }

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(false), DUREE_AVANT_FERMETURE);
    return () => window.clearTimeout(id);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto carte flex max-w-lg items-start gap-3 px-3 py-2.5 text-xs text-encre-douce sm:max-w-none sm:items-center"
      style={{ boxShadow: 'var(--ombre-douce)' }}
    >
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {/* Mobile : gestes tactiles */}
        <span className="sm:hidden">
          <strong className="font-medium text-encre">Pincer</strong> pour zoomer ·{' '}
          <strong className="font-medium text-encre">Glisser</strong> pour se déplacer ·{' '}
          <strong className="font-medium text-encre">Appuyer</strong> sur une personne pour l’ouvrir
        </span>

        {/* Grand écran : souris et clavier */}
        <span className="hidden flex-wrap items-center gap-x-3 gap-y-1 sm:flex">
          <span>
            <kbd className="mr-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1 py-0.5 text-[10px]">
              Molette
            </kbd>
            zoomer
          </span>
          <span>
            <kbd className="mr-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1 py-0.5 text-[10px]">
              Clic + glisser
            </kbd>
            déplacer
          </span>
          <span>
            <kbd className="mr-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1 py-0.5 text-[10px]">
              Double-clic
            </kbd>
            repartir d’ici
          </span>
          <span>
            <kbd className="mr-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1 py-0.5 text-[10px]">
              F
            </kbd>
            chercher
          </span>
        </span>
      </span>

      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Fermer l’aide"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--rayon-petit)] text-encre-tres-douce hover:bg-fond-doux hover:text-encre"
      >
        ✕
      </button>
    </div>
  );
}
