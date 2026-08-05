'use client';

/**
 * Menu contextuel — clic-droit sur un nœud de l'arbre.
 *
 * Il rassemble en un point les gestes qui, sans lui, obligeraient à faire
 * plusieurs clics ailleurs : recentrer l'arbre sur cette personne, ouvrir sa
 * fiche, sa chronologie, la voir sur la carte, ou copier le lien à envoyer
 * dans la famille. Un menu court, refermable à tout moment par Échap.
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { PersonneArbre } from '@/lib/arbre';

export type ActionContexte =
  | 'repartir'
  | 'fiche'
  | 'chronologie'
  | 'carte'
  | 'lien'
  | 'lignee';

export function MenuContextuel({
  personne,
  x,
  y,
  onAction,
  onFermer,
}: {
  personne: PersonneArbre;
  x: number;
  y: number;
  onAction: (action: ActionContexte) => void;
  onFermer: () => void;
}) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const premierRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    premierRef.current?.focus();
  }, [personne.id]);

  useEffect(() => {
    function surClic(evenement: MouseEvent) {
      if (!conteneurRef.current?.contains(evenement.target as Node)) onFermer();
    }
    function surTouche(evenement: KeyboardEvent) {
      if (evenement.key === 'Escape') onFermer();
    }
    document.addEventListener('mousedown', surClic);
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('mousedown', surClic);
      document.removeEventListener('keydown', surTouche);
    };
  }, [onFermer]);

  const styleBouton =
    'flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-encre transition hover:bg-fond-doux focus:bg-fond-doux focus:outline-none';

  return (
    <div
      ref={conteneurRef}
      role="menu"
      aria-label={`Actions pour ${personne.nomComplet}`}
      className="carte absolute z-40 min-w-56 overflow-hidden text-sm"
      style={{
        left: x,
        top: y,
        boxShadow: 'var(--ombre-forte)',
      }}
    >
      <p className="border-b border-bordure bg-fond-doux px-3 py-2 text-[11px] uppercase tracking-wider text-encre-tres-douce">
        {personne.nomComplet}
      </p>

      <ul className="flex flex-col py-1">
        <li>
          <button
            ref={premierRef}
            type="button"
            role="menuitem"
            onClick={() => onAction('repartir')}
            className={styleBouton}
          >
            <span>Repartir d’ici</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            role="menuitem"
            onClick={() => onAction('fiche')}
            className={styleBouton}
          >
            <span>Ouvrir la fiche</span>
          </button>
        </li>
        <li>
          <Link
            href={`/chronologie?personne=${encodeURIComponent(personne.id)}`}
            onClick={() => onAction('lignee')}
            role="menuitem"
            className={styleBouton}
          >
            <span>Chronologie de sa lignée</span>
          </Link>
        </li>
        <li>
          <Link
            href={`/carte?personne=${encodeURIComponent(personne.id)}`}
            onClick={() => onAction('carte')}
            role="menuitem"
            className={styleBouton}
          >
            <span>Voir sur la carte</span>
          </Link>
        </li>
        <li>
          <button
            type="button"
            role="menuitem"
            onClick={() => onAction('lien')}
            className={styleBouton}
          >
            <span>Copier le lien</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
