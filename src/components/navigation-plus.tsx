'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, useState } from 'react';
import {
  GROUPES_NAVIGATION,
  type GroupeNavigation,
  type LienNavigation,
} from '@/lib/navigation-site';
import { useFermerMenuAncre, useMenuAncre } from '@/lib/menu-ancre';

/**
 * Menu « Plus » pour les sections secondaires — regroupées (Raconter /
 * Chercher / Outils) et navigables au clavier (flèches, Escape).
 *
 * Le panneau est porté sur `document.body` : sur /arbre, le canevas SVG
 * recouvrait autrement le bas du menu et interceptait les clics.
 */
export function NavigationPlus({
  groupes = GROUPES_NAVIGATION,
}: {
  groupes?: readonly GroupeNavigation[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [indexFocus, setIndexFocus] = useState(0);
  const ancreRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const menuId = useId();
  const chemin = usePathname() ?? '/';

  const liensPlats: LienNavigation[] = groupes.flatMap((g) => [...g.liens]);
  const { menuRef, position } = useMenuAncre(ouvert, ancreRef);

  const courantDansPlus = liensPlats.some((lien) =>
    lien.href === '/'
      ? chemin === '/'
      : chemin === lien.href || chemin.startsWith(`${lien.href}/`)
  );

  useFermerMenuAncre(ouvert, () => setOuvert(false), ancreRef, menuRef);

  useEffect(() => {
    if (!ouvert) return;
    function surTouche(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOuvert(false);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        setIndexFocus((i) => {
          const n = liensPlats.length;
          if (n === 0) return 0;
          if (e.key === 'Home') return 0;
          if (e.key === 'End') return n - 1;
          if (e.key === 'ArrowDown') return (i + 1) % n;
          return (i - 1 + n) % n;
        });
      }
    }
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [ouvert, liensPlats.length]);

  useEffect(() => {
    if (!ouvert) return;
    itemsRef.current[indexFocus]?.focus();
  }, [ouvert, indexFocus]);

  let compteur = 0;

  const panneau = ouvert
    ? createPortal(
      <div
        ref={(el) => {
          menuRef.current = el;
        }}
        id={menuId}
        role="menu"
        style={{ top: position.top, left: position.left }}
        className="fixed z-[60] mt-0 max-h-[min(70vh,calc(100dvh-5rem))] min-w-[13rem] overflow-y-auto rounded-[var(--rayon)] border border-bordure bg-fond-carte py-1 shadow-[var(--ombre-forte)]"
      >
        {groupes.map((groupe) => (
          <div key={groupe.id} role="group" aria-label={groupe.titre}>
            <p className="px-3 pb-1 pt-2 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-encre-tres-douce">
              {groupe.titre}
            </p>
            <ul>
              {groupe.liens.map((lien) => {
                const index = compteur++;
                const courant =
                  chemin === lien.href || chemin.startsWith(`${lien.href}/`);

                return (
                  <li key={lien.href} role="none">
                    <Link
                      ref={(el) => {
                        itemsRef.current[index] = el;
                      }}
                      href={lien.href}
                      role="menuitem"
                      tabIndex={index === indexFocus ? 0 : -1}
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
          </div>
        ))}
      </div>,
      document.body
    )
    : null;

  return (
    <div className="relative">
      <button
        ref={ancreRef}
        type="button"
        aria-expanded={ouvert}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => {
          setIndexFocus(0);
          setOuvert((v) => !v);
        }}
        className={
          courantDansPlus
            ? 'flex min-h-11 items-center gap-1 rounded-[var(--rayon-petit)] bg-fond-doux px-2.5 py-2 font-medium text-encre'
            : 'flex min-h-11 items-center gap-1 rounded-[var(--rayon-petit)] px-2.5 py-2 text-encre-douce transition hover:bg-fond-doux hover:text-encre'
        }
      >
        Plus
        <span aria-hidden className="text-xs">
          ▾
        </span>
      </button>

      {panneau}
    </div>
  );
}
