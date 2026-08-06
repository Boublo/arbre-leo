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
}: {
  ouvert: boolean;
  onFermer: () => void;
  children: ReactNode;
  etiquette?: string;
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

    const debordement = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', surTouche);
    ref.current?.focus();

    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = debordement || '';
    };
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-end lg:hidden"
      role="presentation"
      onClick={(evt) => {
        if (evt.target === evt.currentTarget) onFermer();
      }}
    >
      <div aria-hidden className="absolute inset-0 bg-encre/40 backdrop-blur-[1px]" />

      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={etiquette}
        tabIndex={-1}
        className="panneau-bas-entree relative max-h-[min(85dvh,100%)] overflow-y-auto rounded-t-2xl border-t border-bordure bg-fond-carte shadow-[var(--ombre-forte)] outline-none"
        onClick={(evt) => evt.stopPropagation()}
      >
        <div
          aria-hidden
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-bordure-forte"
        />
        {children}
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
