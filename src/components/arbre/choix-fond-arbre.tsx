'use client';

import { LIBELLE_FOND_ARBRE, FONDS_ARBRE, type FondArbre } from '@/lib/fond-arbre';

/**
 * Sélecteur compact du fond de la planche — icônes sur grand écran, liste sur mobile.
 */
export function ChoixFondArbre({
  fond,
  onFond,
  compact = false,
}: {
  fond: FondArbre;
  onFond: (fond: FondArbre) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <label className="flex min-w-0 items-center gap-2 text-sm" data-guide="fond-arbre">
        <span className="shrink-0 text-encre-tres-douce">Fond</span>
        <select
          value={fond}
          onChange={(e) => onFond(e.target.value as FondArbre)}
          className="min-w-0 flex-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre outline-none focus:ring-2 focus:ring-accent/25"
          aria-label="Style de fond de l’arbre"
        >
          {FONDS_ARBRE.map((f) => (
            <option key={f} value={f}>
              {LIBELLE_FOND_ARBRE[f].titre}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label="Style de fond de l’arbre"
      data-guide="fond-arbre"
    >
      <span className="mr-1 shrink-0 text-xs text-encre-tres-douce">Fond</span>
      {FONDS_ARBRE.map((f) => {
        const { titre, aide, icone } = LIBELLE_FOND_ARBRE[f];
        const actif = fond === f;
        return (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={actif}
            title={aide}
            onClick={() => onFond(f)}
            className={`grid h-8 w-8 place-items-center rounded-[var(--rayon-petit)] text-sm transition ${
              actif
                ? 'bg-accent text-accent-contraste'
                : 'border border-bordure text-encre-douce hover:bg-fond-doux hover:text-encre'
            }`}
          >
            <span aria-hidden>{icone}</span>
            <span className="sr-only">{titre}</span>
          </button>
        );
      })}
    </div>
  );
}
