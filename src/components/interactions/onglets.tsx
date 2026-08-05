'use client';

import { useId, useRef, type KeyboardEvent } from 'react';

/**
 * Onglets clavier-navigables : flèches gauche/droite pour changer, Home et End
 * pour aller au premier ou au dernier. On expose bien role="tab" et
 * aria-selected pour que les lecteurs d'écran annoncent le rôle.
 *
 * Les onglets sont purement présentationnels : le parent tient l'état et
 * décide ce qu'il affiche sous la barre. Prévoir un aria-controls là-bas
 * pointant vers l'identifiant retourné par useId, si utile.
 */

export type Valeur = { id: string; libelle: string };

export function Onglets<T extends Valeur>({
  valeurs,
  valeur,
  onChoix,
  etiquette,
  idPanneau,
}: {
  valeurs: readonly T[];
  valeur: T['id'];
  onChoix: (id: T['id']) => void;
  /** Nom du groupe d'onglets, pour l'aria-label. */
  etiquette?: string;
  /**
   * Fournit l'identifiant du panneau associé à un onglet, pour poser
   * aria-controls et tenir le contrat ARIA vis-à-vis des lecteurs d'écran.
   * Le parent, qui construit les panneaux, garantit alors la correspondance.
   */
  idPanneau?: (id: T['id']) => string;
}) {
  const baseId = useId();
  const refs = useRef<Map<string, HTMLButtonElement>>(new Map());

  function surTouche(evt: KeyboardEvent<HTMLButtonElement>) {
    const index = valeurs.findIndex((v) => v.id === valeur);
    if (index === -1) return;

    let suivant: number | null = null;
    if (evt.key === 'ArrowRight') suivant = (index + 1) % valeurs.length;
    else if (evt.key === 'ArrowLeft') suivant = (index - 1 + valeurs.length) % valeurs.length;
    else if (evt.key === 'Home') suivant = 0;
    else if (evt.key === 'End') suivant = valeurs.length - 1;

    if (suivant === null) return;
    evt.preventDefault();
    const cible = valeurs[suivant];
    onChoix(cible.id);
    refs.current.get(cible.id)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={etiquette}
      className="flex flex-wrap gap-1 border-b border-bordure"
    >
      {valeurs.map((v) => {
        const actif = v.id === valeur;
        return (
          <button
            key={v.id}
            ref={(el) => {
              if (el) refs.current.set(v.id, el);
              else refs.current.delete(v.id);
            }}
            id={`${baseId}-${v.id}`}
            type="button"
            role="tab"
            aria-selected={actif}
            aria-controls={idPanneau?.(v.id)}
            tabIndex={actif ? 0 : -1}
            onClick={() => onChoix(v.id)}
            onKeyDown={surTouche}
            className={
              actif
                ? '-mb-px border-b-2 border-accent px-3 py-2 text-sm font-medium text-encre'
                : '-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-encre-douce transition hover:text-encre'
            }
          >
            {v.libelle}
          </button>
        );
      })}
    </div>
  );
}
