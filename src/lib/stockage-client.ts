'use client';

/**
 * Lecture localStorage compatible SSR via useSyncExternalStore.
 * Même onglet : déclencher `notifierStockageLocal()` après écriture.
 */

export function subscribeStockageLocal(ecouter: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const surStockage = () => ecouter();
  window.addEventListener('storage', surStockage);
  window.addEventListener('arbre-stockage', surStockage);
  return () => {
    window.removeEventListener('storage', surStockage);
    window.removeEventListener('arbre-stockage', surStockage);
  };
}

export function notifierStockageLocal(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('arbre-stockage'));
}

export function lireStockage(cle: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

export function ecrireStockage(cle: string, valeur: string): void {
  try {
    localStorage.setItem(cle, valeur);
    notifierStockageLocal();
  } catch {
    /* localStorage indisponible */
  }
}
