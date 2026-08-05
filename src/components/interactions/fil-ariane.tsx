import Link from 'next/link';

/**
 * Fil d'Ariane : rappelle où l'on se trouve dans le site, et par où l'on est
 * venu. Le premier maillon renvoie toujours à l'accueil ; le dernier est le
 * lieu courant, on ne clique pas dessus.
 *
 * Rendu comme un <nav aria-label="Fil d'Ariane"> pour que les lecteurs d'écran
 * puissent l'annoncer et le sauter.
 */

export type Maillon = { label: string; href: string };

export function FilAriane({ items }: { items: readonly Maillon[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Fil d’Ariane" className="text-sm text-encre-douce">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, index) => {
          const dernier = index === items.length - 1;
          const premier = index === 0;

          return (
            <li key={`${item.href}-${index}`} className="flex items-center gap-1.5">
              {!premier && (
                <span aria-hidden className="text-encre-tres-douce">
                  ›
                </span>
              )}
              {dernier ? (
                <span aria-current="page" className="text-encre">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-[var(--rayon-petit)] px-1 text-encre-douce transition hover:text-accent"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
