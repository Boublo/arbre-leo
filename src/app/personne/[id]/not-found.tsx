import Link from 'next/link';
import { Navigation } from '@/components/navigation';

/** Un lien recopié de travers, ou une fiche retirée depuis. */
export default function FicheIntrouvable() {
  return (
    <>
      <Navigation />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16 text-center">
        <h1 className="text-2xl">Cette fiche n’existe pas</h1>

        <p className="mt-4 text-encre-douce">
          L’identifiant demandé ne correspond à personne dans l’arbre. Le lien a peut-être été
          coupé en chemin, ou la fiche a été fondue avec une autre lors d’un rapprochement de
          doublons.
        </p>

        <p className="mt-8">
          <Link href="/arbre" className="lien-discret">
            Revenir à l’arbre
          </Link>
        </p>
      </main>
    </>
  );
}
