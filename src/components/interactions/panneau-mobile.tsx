'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Feuille qui remonte depuis le bas de l'écran — pour les fiches ou panneaux
 * qui, sur grand écran, tiennent dans une colonne latérale.
 */
export function PanneauMobile({
  ouvert,
  onFermer,
  children,
  etiquette,
  guideCible,
}: {
  ouvert: boolean;
  onFermer: () => void;
  children: ReactNode;
  etiquette?: string;
  guideCible?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;

    function surTouche(evt: KeyboardEvent) {
      if (evt.key === 'Escape') {
        evt.preventDefault();
        onFermer();
      }
    }

    // Sur grand écran le panneau est masqué (lg:hidden) : ne pas verrouiller
    // le body, sinon le défilement du panneau latéral desktop est bloqué.
    const mobile = window.matchMedia('(max-width: 1023px)').matches;
    const debordement = document.body.style.overflow;
    if (mobile) document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', surTouche);
    ref.current?.focus();

    return () => {
      document.removeEventListener('keydown', surTouche);
      if (mobile) document.body.style.overflow = debordement || '';
    };
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col lg:hidden"
      role="presentation"
      onClick={(evt) => {
        if (evt.target === evt.currentTarget) onFermer();
      }}
    >
      <div aria-hidden className="min-h-0 flex-1 bg-encre/40 backdrop-blur-[1px]" />

      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={etiquette}
        tabIndex={-1}
        data-guide={guideCible}
        className="panneau-bas-entree relative flex max-h-[min(85dvh,100%)] min-h-0 flex-col overflow-hidden rounded-t-2xl border-t border-bordure bg-fond-carte shadow-[var(--ombre-forte)] outline-none"
        onClick={(evt) => evt.stopPropagation()}
      >
        <div
          aria-hidden
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-bordure-forte"
        />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] touch-pan-y">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes panneau-bas-entree {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .panneau-bas-entree { animation: panneau-bas-entree 200ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .panneau-bas-entree { animation: none; }
        }
      `}</style>
    </div>
  );
}
