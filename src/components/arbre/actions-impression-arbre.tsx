'use client';

import { useCallback, useState } from 'react';

/**
 * Boutons d'action pour la page imprimable.
 */
export function ActionsImpressionArbre() {
  const [lienCopie, setLienCopie] = useState(false);

  const copierLien = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLienCopie(true);
      window.setTimeout(() => setLienCopie(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  }, []);

  return (
    <div className="arbre-impr-actions no-imprimer">
      <button
        type="button"
        className="imprimer-bouton-secondaire"
        onClick={copierLien}
        title="Copier l’adresse de cette vue (avec tous les réglages)"
      >
        {lienCopie ? 'Lien copié' : 'Copier le lien'}
      </button>
      <button
        type="button"
        className="imprimer-bouton-secondaire"
        data-telecharger-svg
        title="Télécharger le schéma au format SVG"
      >
        Télécharger SVG
      </button>
      <button type="button" className="imprimer-bouton" data-imprimer>
        Imprimer maintenant
      </button>
    </div>
  );
}
