'use client';

import { PROFONDEUR_ECLATE_DEFAUT, RANG_MAX_ECLATE } from '@/lib/layout-arbre';

export const NIVEAUX_PROFONDEUR_ECLATE = [6, 8, 10, 12, RANG_MAX_ECLATE] as const;

export function libelleProfondeurEclate(niveau: number): string {
  return niveau >= RANG_MAX_ECLATE ? 'Tout l’entourage' : `${niveau} degrés`;
}

/**
 * Limite le nombre de couches en mode « Tout » pour garder l’arbre lisible.
 */
export function ReglageProfondeurEclate({
  valeur,
  onChange,
  nombrePersonnes,
}: {
  valeur: number;
  onChange: (niveau: number) => void;
  nombrePersonnes: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-encre-douce">
      <span className="shrink-0 font-medium text-encre">Étendue</span>
      <div className="flex flex-wrap gap-1">
        {NIVEAUX_PROFONDEUR_ECLATE.map((niveau) => (
          <button
            key={niveau}
            type="button"
            onClick={() => onChange(niveau)}
            className={`rounded-[var(--rayon-petit)] px-2.5 py-1 transition ${
              valeur === niveau
                ? 'bg-accent text-accent-contraste'
                : 'border border-bordure bg-fond-carte hover:bg-fond-doux'
            }`}
            title={
              niveau >= RANG_MAX_ECLATE
                ? 'Afficher tout l’entourage connu'
                : `Limiter à ${niveau} degrés de parenté depuis la personne choisie`
            }
          >
            {libelleProfondeurEclate(niveau)}
          </button>
        ))}
      </div>
      <span className="text-encre-tres-douce">
        {nombrePersonnes} personne{nombrePersonnes > 1 ? 's' : ''}
        {valeur === PROFONDEUR_ECLATE_DEFAUT ? '' : ''}
      </span>
    </div>
  );
}

export function lireProfondeurEclateInitiale(): number {
  if (typeof window === 'undefined') return PROFONDEUR_ECLATE_DEFAUT;
  try {
    const sauve = Number(localStorage.getItem('arbre-profdondeur-eclate'));
    if (NIVEAUX_PROFONDEUR_ECLATE.includes(sauve as (typeof NIVEAUX_PROFONDEUR_ECLATE)[number])) {
      return sauve;
    }
  } catch {
    /* localStorage indisponible */
  }
  return PROFONDEUR_ECLATE_DEFAUT;
}
