import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Erreur' };

/**
 * Page d’erreur générique — accessible sans connexion (whitelist dans proxy.ts).
 */
export default async function PageErreur({ searchParams }: PageProps<'/erreur'>) {
  const { code } = await searchParams;
  const message =
    code === 'acces'
      ? 'Vous n’avez pas l’autorisation d’accéder à cette page.'
      : code === 'session'
        ? 'Votre session a expiré. Reconnectez-vous pour continuer.'
        : code === 'fiche'
          ? 'La fiche n’a pas pu être chargée. La connexion ou la base de données a peut-être faibli — réessayez dans un instant.'
          : 'Une erreur est survenue.';

  return (
    <main
      id="contenu-principal"
      className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-6 py-16 text-center"
    >
      <div>
        <h1 className="text-3xl">Impossible d’afficher la page</h1>
        <p className="mt-3 text-encre-douce">{message}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/connexion"
          className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 text-sm font-medium text-accent-contraste transition hover:brightness-110"
        >
          Se connecter
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
