'use client';

import type { FiltreBrancheEclate } from '@/lib/layout-arbre';
import { LIBELLE_COTE } from '@/lib/branches';
import { PROFONDEUR_ECLATE_DEFAUT, RANG_MAX_ECLATE } from '@/lib/layout-arbre';

export const NIVEAUX_PROFONDEUR_ECLATE = [6, 8, 10, 12, RANG_MAX_ECLATE] as const;

export const FILTRES_BRANCHE_ECLATE: FiltreBrancheEclate[] = [
  'tous',
  'paternelle',
  'maternelle',
];

export function libelleProfondeurEclate(niveau: number): string {
  return niveau >= RANG_MAX_ECLATE ? 'Tout l’entourage' : `${niveau} degrés`;
}

export function libelleFiltreBranche(filtre: FiltreBrancheEclate): string {
  if (filtre === 'tous') return 'Les deux côtés';
  return LIBELLE_COTE[filtre];
}

/**
 * Réglages du mode « Tout » : étendue et filtre par branche.
 */
export function ReglagesModeEclate({
  profondeur,
  onProfondeur,
  filtreBranche,
  onFiltreBranche,
  masquerLiensLointains,
  onMasquerLiensLointains,
  nombrePersonnes,
}: {
  profondeur: number;
  onProfondeur: (niveau: number) => void;
  filtreBranche: FiltreBrancheEclate;
  onFiltreBranche: (filtre: FiltreBrancheEclate) => void;
  masquerLiensLointains: boolean;
  onMasquerLiensLointains: (masquer: boolean) => void;
  nombrePersonnes: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-encre-douce">
        <span className="shrink-0 font-medium text-encre">Étendue</span>
        <div className="flex flex-wrap gap-1">
          {NIVEAUX_PROFONDEUR_ECLATE.map((niveau) => (
            <button
              key={niveau}
              type="button"
              onClick={() => onProfondeur(niveau)}
              className={boutonClasse(profondeur === niveau)}
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
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-encre-douce">
        <span className="shrink-0 font-medium text-encre">Branche</span>
        <div className="flex flex-wrap gap-1">
          {FILTRES_BRANCHE_ECLATE.map((filtre) => (
            <button
              key={filtre}
              type="button"
              onClick={() => onFiltreBranche(filtre)}
              className={boutonClasse(filtreBranche === filtre)}
              title={
                filtre === 'tous'
                  ? 'Afficher paternel et maternel'
                  : `Ne garder que le côté ${filtre === 'paternelle' ? 'paternel' : 'maternel'}`
              }
            >
              {libelleFiltreBranche(filtre)}
            </button>
          ))}
        </div>
        <span className="text-encre-tres-douce">
          {nombrePersonnes} personne{nombrePersonnes > 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-encre-douce">
        <span className="shrink-0 font-medium text-encre">Liens</span>
        <button
          type="button"
          onClick={() => onMasquerLiensLointains(!masquerLiensLointains)}
          className={boutonClasse(masquerLiensLointains)}
          title="Masquer les connecteurs atténués entre parentés éloignées"
        >
          {masquerLiensLointains ? 'Liens lointains masqués' : 'Masquer liens lointains'}
        </button>
      </div>
    </div>
  );
}

function boutonClasse(actif: boolean): string {
  return `rounded-[var(--rayon-petit)] px-2.5 py-1 transition ${
    actif
      ? 'bg-accent text-accent-contraste'
      : 'border border-bordure bg-fond-carte hover:bg-fond-doux'
  }`;
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

export function lireFiltreBrancheEclateInitial(): FiltreBrancheEclate {
  if (typeof window === 'undefined') return 'tous';
  try {
    const sauve = localStorage.getItem('arbre-filtre-branche-eclate');
    if (sauve && FILTRES_BRANCHE_ECLATE.includes(sauve as FiltreBrancheEclate)) {
      return sauve as FiltreBrancheEclate;
    }
  } catch {
    /* localStorage indisponible */
  }
  return 'tous';
}

export function lireMasquerLiensLointainsInitial(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('arbre-masquer-liens-lointains-eclate') === '1';
  } catch {
    return false;
  }
}

/** @deprecated Utiliser ReglagesModeEclate */
export const ReglageProfondeurEclate = ReglagesModeEclate;
