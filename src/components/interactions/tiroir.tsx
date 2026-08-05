'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Tiroir latéral : glisse depuis un bord, dépose un pan de contenu sans quitter
 * la page. Se ferme au clic hors du panneau, par la touche Échap, ou par le
 * bouton dédié.
 *
 * L'animation d'ouverture est courte, et se retire d'elle-même si l'utilisateur
 * a demandé un mouvement réduit.
 */

type Cote = 'droite' | 'gauche';

export function Tiroir({
  ouvert,
  onFermer,
  cote = 'droite',
  titre,
  children,
}: {
  ouvert: boolean;
  onFermer: () => void;
  cote?: Cote;
  titre?: string;
  children: ReactNode;
}) {
  const titreId = useId();
  const refPanneau = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;

    function surTouche(evt: KeyboardEvent) {
      if (evt.key === 'Escape') {
        evt.preventDefault();
        onFermer();
      }
    }

    document.addEventListener('keydown', surTouche);
    // Éviter le défilement de la page derrière le tiroir.
    const debordement = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Poser le focus sur le panneau à l'ouverture pour la navigation clavier.
    refPanneau.current?.focus();

    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = debordement;
    };
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  const cotePanneau =
    cote === 'droite'
      ? 'right-0 border-l tiroir-glisse-droite'
      : 'left-0 border-r tiroir-glisse-gauche';

  return (
    <div
      className="fixed inset-0 z-40 flex"
      role="presentation"
      onClick={(evt) => {
        // Fermer uniquement sur le voile, pas quand un clic remonte du panneau.
        if (evt.target === evt.currentTarget) onFermer();
      }}
    >
      <div aria-hidden className="absolute inset-0 bg-encre/40 backdrop-blur-[1px]" />

      <div
        ref={refPanneau}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titre ? titreId : undefined}
        tabIndex={-1}
        className={`absolute top-0 h-full w-full max-w-md overflow-y-auto border-bordure bg-fond-carte shadow-[var(--shadow-forte)] outline-none ${cotePanneau}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-bordure px-5 py-4">
          {titre ? (
            <h2 id={titreId} className="text-lg text-encre">
              {titre}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer le panneau"
            className="rounded-[var(--rayon-petit)] px-2 py-1 text-encre-douce transition hover:bg-fond-doux hover:text-encre"
          >
            ✕
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>

      <style>{`
        @keyframes tiroir-entree-droite {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes tiroir-entree-gauche {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        .tiroir-glisse-droite { animation: tiroir-entree-droite 180ms ease-out; }
        .tiroir-glisse-gauche { animation: tiroir-entree-gauche 180ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .tiroir-glisse-droite, .tiroir-glisse-gauche { animation: none; }
        }
      `}</style>
    </div>
  );
}
