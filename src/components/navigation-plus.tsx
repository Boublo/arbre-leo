'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import type { LienNavigation } from '@/lib/navigation-site';

/**
 * Menu « Plus » pour les sections secondaires — évite une barre de navigation
 * trop longue sur les écrans moyens.
 */
export function NavigationPlus({ liens }: { liens: readonly LienNavigation[] }) {
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const chemin = usePathname() ?? '/';

  const courantDansPlus = liens.some((lien) =>
    lien.href === '/'
      ? chemin === '/'
      : chemin === lien.href || chemin.startsWith(`${lien.href}/`)
  );

  useEffect(() => {
    if (!ouvert) return;
    function fermer(e: MouseEvent) {
      if (!conteneurRef.current?.contains(e.target as Node)) setOuvert(false);
    }
    function surTouche(e: KeyboardEvent) {
      if (e.key === 'Escape') setOuvert(false);
    }
    document.addEventListener('mousedown', fermer);
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('mousedown', fermer);
      document.removeEventListener('keydown', surTouche);
    };
  }, [ouvert]);

  return (
    <div ref={conteneurRef} className="relative">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOuvert((v) => !v)}
        className={
          courantDansPlus
            ? 'flex min-h-11 items-center gap-1 rounded-[var(--rayon-petit)] bg-fond-doux px-2.5 py-2 font-medium text-encre'
            : 'flex min-h-11 items-center gap-1 rounded-[var(--rayon-petit)] px-2.5 py-2 text-encre-douce transition hover:bg-fond-doux hover:text-encre'
        }
      >
        Plus
        <span aria-hidden className="text-xs">▾</span>
      </button>

      {ouvert && (
        <ul
          id={menuId}
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 min-w-[12rem] rounded-[var(--rayon)] border border-bordure bg-fond-carte py-1 shadow-[var(--ombre-forte)]"
        >
          {liens.map((lien) => {
            const courant =
              lien.href === '/'
                ? chemin === '/'
                : chemin === lien.href || chemin.startsWith(`${lien.href}/`);

            return (
              <li key={lien.href} role="none">
                <Link
                  href={lien.href}
                  role="menuitem"
                  aria-current={courant ? 'page' : undefined}
                  onClick={() => setOuvert(false)}
                  className={
                    courant
                      ? 'block px-3 py-2.5 text-sm font-medium text-encre bg-fond-doux'
                      : 'block px-3 py-2.5 text-sm text-encre-douce transition hover:bg-fond-doux hover:text-encre'
                  }
                >
                  {lien.libelle}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
