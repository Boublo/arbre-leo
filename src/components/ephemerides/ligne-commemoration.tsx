import Link from 'next/link';
import type { LieuCommemoration } from '@/lib/lieu-commemoration';

/**
 * Rappel discret du cimetière ou du lieu de décès sur les cartes « Ces jours-ci ».
 */
export function LigneCommemoration({
  lieu,
  feminin,
}: {
  lieu: LieuCommemoration;
  feminin: boolean;
}) {
  const prefix =
    lieu.source === 'inhumation'
      ? feminin
        ? 'Inhumée à '
        : 'Inhumé à '
      : feminin
        ? 'Décédée à '
        : 'Décédé à ';

  return (
    <p className="text-xs text-encre-douce">
      {prefix}
      {lieu.lieuId ? (
        <Link
          href={`/carte?lieu=${encodeURIComponent(lieu.lieuId)}`}
          className="text-accent underline-offset-2 hover:underline"
        >
          {lieu.libelle}
        </Link>
      ) : (
        lieu.libelle
      )}
      .
    </p>
  );
}
