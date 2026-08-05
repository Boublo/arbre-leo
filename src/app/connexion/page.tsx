import Link from 'next/link';
import type { Metadata } from 'next';
import { FormulaireConnexion } from './formulaire';
import { NOM_DU_SITE, SOUS_TITRE_DU_SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Connexion' };

export default async function PageConnexion({ searchParams }: PageProps<'/connexion'>) {
  const { suite } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-encre-tres-douce">Famille</p>
        <h1 className="mt-2 text-4xl">{NOM_DU_SITE}</h1>
        <p className="mt-3 text-encre-douce">{SOUS_TITRE_DU_SITE}</p>
      </div>

      <div className="carte p-6">
        <FormulaireConnexion suite={typeof suite === 'string' ? suite : undefined} />
      </div>

      <p className="mt-6 text-center text-sm text-encre-douce">
        Vous faites partie de la famille et n&apos;avez pas encore de compte ?{' '}
        <Link href="/inscription" className="lien-discret">
          Demander un accès
        </Link>
      </p>
    </main>
  );
}
