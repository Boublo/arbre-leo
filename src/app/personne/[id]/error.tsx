'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Frontière d'erreur locale — fiche personne.
 * Affiche un message adapté et des actions de repli vers l'arbre.
 */
export default function ErreurFichePersonne({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[fiche personne]', error);
  }, [error]);

  return (
    <main
      id="contenu-principal"
      className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-6 py-16 text-center"
    >
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-encre-tres-douce">Fiche interrompue</p>
        <h1 className="mt-2 text-3xl">Cette fiche n’a pas pu s’afficher</h1>
        <p className="mt-3 text-sm leading-relaxed text-encre-douce">
          Un problème est survenu pendant le chargement. Cela peut venir d’une connexion
          instable ou d’un souci temporaire avec la base de données.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
        <button
          type="button"
          onClick={reset}
          className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 text-sm font-medium text-accent-contraste transition hover:brightness-110"
        >
          Réessayer
        </button>
        <Link
          href="/arbre"
          className="rounded-[var(--rayon-petit)] border border-bordure px-4 py-2.5 text-sm text-encre transition hover:bg-fond-doux"
        >
          Revenir à l’arbre
        </Link>
        <Link
          href="/"
          className="rounded-[var(--rayon-petit)] border border-bordure px-4 py-2.5 text-sm text-encre transition hover:bg-fond-doux"
        >
          Accueil
        </Link>
      </div>
    </main>
  );
}
