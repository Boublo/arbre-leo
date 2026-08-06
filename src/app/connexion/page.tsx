import Link from 'next/link';
import type { Metadata } from 'next';
import { FormulaireConnexion } from './formulaire';
import { Alerte } from '@/components/ui/champs';
import { NOM_DU_SITE, SOUS_TITRE_DU_SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Connexion' };

const MESSAGES_ERREUR: Record<string, string> = {
  lien_invalide:
    'Ce lien de confirmation n’est pas valide. Demandez un nouvel e-mail depuis l’inscription, ou connectez-vous si votre compte est déjà actif.',
  lien_expire:
    'Ce lien de confirmation a expiré. Reconnectez-vous ou demandez un nouvel accès à un administrateur.',
};

export default async function PageConnexion({ searchParams }: PageProps<'/connexion'>) {
  const { suite, erreur } = await searchParams;
  const messageErreur =
    typeof erreur === 'string' ? MESSAGES_ERREUR[erreur] : undefined;

  return (
    <main id="contenu-principal" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-encre-tres-douce">Famille</p>
        <h1 className="mt-2 text-4xl">{NOM_DU_SITE}</h1>
        <p className="mt-3 text-encre-douce">{SOUS_TITRE_DU_SITE}</p>
      </div>

      <div className="carte flex flex-col gap-4 p-6">
        {messageErreur && <Alerte ton="erreur">{messageErreur}</Alerte>}
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
