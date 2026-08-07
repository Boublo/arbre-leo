'use client';

/**
 * Bandeau d'aide montré après le guide de découverte.
 *
 * Il rappelle en une ligne les gestes de base, puis s'efface : après huit
 * secondes, ou dès qu'un mouvement est fait dans l'arbre. Sur mobile, les
 * indications parlent du tactile plutôt que de la molette ou du clavier.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { guideDejaVu } from '@/components/arbre/guide-arbre';
import { ecrireStockage, lireStockage, subscribeStockageLocal } from '@/lib/stockage-client';

const CLE_BANDEAU_VU = 'arbre-bandeau-aide-v1';
const DUREE_AVANT_FERMETURE = 8000;

function bandeauDejaVu(): boolean {
  return lireStockage(CLE_BANDEAU_VU) === '1';
}

function marquerBandeauVu() {
  ecrireStockage(CLE_BANDEAU_VU, '1');
}

export function BandeauAide({
  signalActivite,
  masquer = false,
  guideTermine = false,
}: {
  signalActivite: number;
  masquer?: boolean;
  guideTermine?: boolean;
}) {
  const bandeauVu = useSyncExternalStore(
    subscribeStockageLocal,
    bandeauDejaVu,
    () => true,
  );
  const guideVu = useSyncExternalStore(subscribeStockageLocal, guideDejaVu, () => true);
  const peutAfficher = !masquer && guideVu && !bandeauVu;
  const [fermeLocalement, setFermeLocalement] = useState(false);
  const signalInitial = useRef(signalActivite);

  useEffect(() => {
    if (!peutAfficher || fermeLocalement) return;
    if (signalActivite === signalInitial.current) return;
    marquerBandeauVu();
    setFermeLocalement(true);
  }, [signalActivite, peutAfficher, fermeLocalement]);

  useEffect(() => {
    if (!peutAfficher || fermeLocalement) return;
    const id = window.setTimeout(() => {
      marquerBandeauVu();
      setFermeLocalement(true);
    }, DUREE_AVANT_FERMETURE);
    return () => window.clearTimeout(id);
  }, [peutAfficher, fermeLocalement, guideTermine]);

  useEffect(() => {
    if (peutAfficher) setFermeLocalement(false);
  }, [peutAfficher]);

  const visible = peutAfficher && !fermeLocalement;

  if (!visible) return null;

  function fermer() {
    marquerBandeauVu();
    setFermeLocalement(true);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto carte flex max-w-lg items-start gap-3 px-3 py-2.5 text-xs text-encre-douce sm:max-w-none sm:items-center apparition-douce"
      style={{ boxShadow: 'var(--ombre-douce)' }}
    >
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="sm:hidden">
          <strong className="font-medium text-encre">Pincer</strong> pour zoomer ·{' '}
          <strong className="font-medium text-encre">Glisser</strong> pour se déplacer ·{' '}
          <strong className="font-medium text-encre">Appuyer</strong> sur une personne pour l’ouvrir
        </span>

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
        onClick={fermer}
        aria-label="Fermer l’aide"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--rayon-petit)] text-encre-tres-douce hover:bg-fond-doux hover:text-encre"
      >
        ✕
      </button>
    </div>
  );
}
