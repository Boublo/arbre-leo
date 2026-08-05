'use client';

/**
 * Bandeau d'aide clavier montré au premier chargement.
 *
 * Il rappelle en une ligne les gestes de base, puis s'efface : après huit
 * secondes, ou dès qu'un mouvement est fait dans l'arbre. On ne rappelle plus
 * la famille à l'ordre plus longtemps qu'il ne faut pour lire la ligne.
 */

import { useEffect, useState } from 'react';

const DUREE_AVANT_FERMETURE = 8000;

export function BandeauAide({ signalActivite }: { signalActivite: number }) {
  const [visible, setVisible] = useState(true);
  const [signalAuMontage, setSignalAuMontage] = useState(signalActivite);

  // Fermeture au premier geste dans l'arbre — traitée pendant le rendu, comme
  // la remise à zéro d'un état dérivé de props, plutôt que dans un effet.
  if (visible && signalActivite !== signalAuMontage) {
    setSignalAuMontage(signalActivite);
    setVisible(false);
  }

  // La minuterie tourne en autonome : c'est un vrai effet, il s'abonne à la
  // pendule et rappelle React quand le délai est écoulé.
  useEffect(() => {
    const id = window.setTimeout(() => setVisible(false), DUREE_AVANT_FERMETURE);
    return () => window.clearTimeout(id);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto carte flex items-center gap-3 px-3 py-2 text-xs text-encre-douce"
      style={{ boxShadow: 'var(--ombre-douce)' }}
    >
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
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

      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Fermer l’aide"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-[var(--rayon-petit)] text-encre-tres-douce hover:bg-fond-doux hover:text-encre"
      >
        ✕
      </button>
    </div>
  );
}
