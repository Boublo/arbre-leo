import Link from 'next/link';
import type { DonneesArbre } from '@/lib/arbre';
import { MiniArbre } from '@/components/portrait/mini-arbre';

/**
 * Encart « parenté immédiate » sur une fiche : un aperçu cliquable avant
 * d’ouvrir la vue complète de l’arbre.
 */
export function SectionMiniArbre({
  focusId,
  donnees,
  nomComplet,
}: {
  focusId: string;
  donnees: DonneesArbre;
  nomComplet: string;
}) {
  return (
    <section className="carte flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-8" aria-labelledby="mini-arbre-titre">
      <div className="min-w-0 flex-1">
        <h2 id="mini-arbre-titre" className="font-titre text-lg text-encre">
          Autour de {nomComplet.split(/\s+/)[0]}
        </h2>
        <p className="mt-1 text-sm text-encre-douce">
          Parents, conjoint et enfants en un coup d’œil. Cliquez sur une case pour
          ouvrir une fiche, ou l’arbre pour tout déplier.
        </p>
        <Link
          href={`/arbre?personne=${encodeURIComponent(focusId)}`}
          className="mt-3 inline-block text-sm font-medium text-accent transition hover:underline"
        >
          Voir dans l’arbre →
        </Link>
      </div>
      <div className="shrink-0 sm:w-[min(100%,18rem)]">
        <MiniArbre focusId={focusId} donnees={donnees} />
      </div>
    </section>
  );
}
