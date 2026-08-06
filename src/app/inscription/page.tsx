import Link from 'next/link';
import type { Metadata } from 'next';
import { FormulaireInscription } from './formulaire';

export const metadata: Metadata = { title: 'Demander un accès' };

export default function PageInscription() {
  return (
    <main id="contenu-principal" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl">Demander un accès</h1>
        <p className="mt-3 text-sm text-encre-douce">
          Cet arbre contient des photos de famille, des actes d&apos;état civil et des
          renseignements sur des personnes vivantes. Chaque demande est donc lue et validée
          à la main avant que l&apos;accès ne soit ouvert.
        </p>
      </div>

      <div className="carte p-6">
        <FormulaireInscription />
      </div>

      <p className="mt-6 text-center text-sm text-encre-douce">
        Vous avez déjà un compte ?{' '}
        <Link href="/connexion" className="lien-discret">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
