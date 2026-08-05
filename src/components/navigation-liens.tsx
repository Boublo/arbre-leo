'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Liens de navigation avec repérage de la page courante.
 *
 * Rendu côté navigateur pour lire le chemin en direct : le lien qui correspond
 * à la page active reçoit `aria-current="page"` et un fond doux, pour que
 * l'utilisateur — clavier comme souris — voie où il se trouve dans le site.
 */
export function LiensNavigation({
  liens,
}: {
  liens: readonly { href: string; libelle: string }[];
}) {
  const chemin = usePathname() ?? '/';

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {liens.map((lien) => {
        // « / » est courant seulement en égalité stricte, sinon tout le site
        // marquerait l'accueil comme courant.
        const courant =
          lien.href === '/'
            ? chemin === '/'
            : chemin === lien.href || chemin.startsWith(`${lien.href}/`);

        return (
          <Link
            key={lien.href}
            href={lien.href}
            aria-current={courant ? 'page' : undefined}
            className={
              courant
                ? 'rounded-[var(--rayon-petit)] bg-fond-doux px-2.5 py-1.5 font-medium text-encre'
                : 'rounded-[var(--rayon-petit)] px-2.5 py-1.5 text-encre-douce transition hover:bg-fond-doux hover:text-encre'
            }
          >
            {lien.libelle}
          </Link>
        );
      })}
    </nav>
  );
}
