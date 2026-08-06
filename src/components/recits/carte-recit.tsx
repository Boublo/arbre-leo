import Link from 'next/link';
import type { RecitResume } from '@/lib/recits';

/**
 * Carte d'un récit dans la grille de liste.
 *
 * On y montre juste ce qu'il faut pour donner envie de cliquer : titre,
 * chapeau, période et famille en bandeau, auteur et nombre de personnes citées
 * en pied. Rien de la couleur ne porte à elle seule une information : la
 * famille est aussi écrite, l'épingle est dite en toutes lettres.
 */
export function CarteRecit({ recit }: { recit: RecitResume }) {
  const famille = recit.patronyme ?? recit.theme;

  return (
    <article className="carte flex h-full flex-col gap-3 p-5 transition hover:shadow-forte">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {recit.epingle && (
          <span className="rounded-full border border-or/50 bg-or/10 px-2 py-0.5 text-xs font-medium text-or">
            Épinglé
          </span>
        )}
        {recit.statut !== 'publie' && (
          <span className="rounded-full border border-alerte/50 bg-alerte/10 px-2 py-0.5 text-xs font-medium text-alerte">
            {recit.statut === 'en_relecture' ? 'En relecture' : 'Masqué'}
          </span>
        )}
        {famille && (
          <span className="text-xs uppercase tracking-wider text-encre-tres-douce">
            {famille}
          </span>
        )}
      </div>

      <h2 className="text-xl leading-tight">
        <Link href={`/recits/${recit.id}`} className="transition hover:text-accent">
          {recit.titre}
        </Link>
      </h2>

      {recit.chapeau && (
        <p className="text-sm italic leading-relaxed text-encre-douce">{recit.chapeau}</p>
      )}

      <p className="text-xs text-encre-tres-douce">
        {recit.periode ?? 'Sans période précise'}
      </p>

      <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-2 text-xs text-encre-tres-douce">
        <span>Écrit par {recit.auteur}</span>
        {recit.nombrePersonnes > 0 && (
          <span>
            {recit.nombrePersonnes === 1
              ? '1 personne citée'
              : `${recit.nombrePersonnes} personnes citées`}
          </span>
        )}
      </div>
    </article>
  );
}
