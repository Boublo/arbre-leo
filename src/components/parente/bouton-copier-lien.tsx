'use client';

import { useState } from 'react';

/**
 * Copie l’URL de parenté courante pour la partager à un cousin.
 */
export function BoutonCopierLienParente({
  idA,
  idB,
  libelleLien,
}: {
  idA: string;
  idB: string;
  libelleLien: string;
}) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    const url = `${window.location.origin}/parente?a=${encodeURIComponent(idA)}&b=${encodeURIComponent(idB)}`;
    const texte = `${libelleLien} — ${url}`;
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2500);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  return (
    <button
      type="button"
      onClick={copier}
      className="text-sm text-accent transition hover:underline"
    >
      {copie ? 'Lien copié !' : 'Copier le lien pour partager'}
    </button>
  );
}
