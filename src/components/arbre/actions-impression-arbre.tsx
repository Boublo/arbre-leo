'use client';

/**
 * Boutons d'action pour la page imprimable.
 */
export function ActionsImpressionArbre() {
  return (
    <div className="arbre-impr-actions no-imprimer">
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
