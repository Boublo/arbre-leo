import Link from 'next/link';
import type { Ephemeride } from '@/lib/ephemerides';

/**
 * Bandeau d’accueil quand le membre connecté est rattaché à une fiche.
 *
 * Propose des raccourcis personnels : sa fiche, l’arbre centré sur lui, et un
 * mot doux si c’est son anniversaire aujourd’hui.
 */
export function AccueilPersonnel({
  prenom,
  personneId,
  anniversaire,
}: {
  prenom: string;
  personneId: string;
  anniversaire: Extract<Ephemeride, { type: 'naissance' }> | null;
}) {
  const lienArbre = `/arbre?personne=${encodeURIComponent(personneId)}`;

  return (
    <aside className="carte flex flex-col gap-4 border-accent/25 bg-accent-clair/25 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-accent">
          Votre place dans l’arbre
        </p>
        <p className="mt-1 font-titre text-xl text-encre">
          Bonjour {prenom}
          {anniversaire ? ' — et joyeux anniversaire !' : ''}
        </p>
        <p className="mt-1 text-sm text-encre-douce">
          {anniversaire
            ? anniversaire.vivant
              ? anniversaire.annees === 0
                ? 'Bienvenue dans la famille.'
                : `Vous fêtez vos ${anniversaire.annees} ans aujourd’hui.`
              : `Vous auriez ${anniversaire.annees} ans aujourd’hui.`
            : 'Retrouvez votre fiche ou explorez l’arbre depuis votre point de vue.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 sm:shrink-0">
        <Link
          href={`/personne/${personneId}`}
          className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-4 py-2.5 text-sm font-medium text-encre transition hover:bg-fond-doux"
        >
          Ma fiche
        </Link>
        <Link
          href={lienArbre}
          className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 text-sm font-medium text-accent-contraste transition hover:brightness-110"
        >
          Mon arbre
        </Link>
        {anniversaire && (
          <Link
            href={`/personne/${personneId}#conversation`}
            className="rounded-[var(--rayon-petit)] border border-accent/40 px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-accent-clair/40"
          >
            Laisser un mot
          </Link>
        )}
      </div>
    </aside>
  );
}
