import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { FormulaireSouvenir } from '@/components/souvenirs/formulaire-souvenir';
import { chargerLieux, chargerPortraitsMentionnables, lireDroits } from '@/lib/souvenirs';

export const metadata = { title: 'Déposer un souvenir' };

export const dynamic = 'force-dynamic';

export default async function PageNouveauSouvenir() {
  const droits = await lireDroits();

  // `proxy.ts` a déjà écarté les visiteurs ; ce garde-fou couvre la session
  // expirée entre-temps, pour ne pas afficher un formulaire qui échouera.
  if (!droits.utilisateurId) redirect('/connexion?suite=/souvenirs/nouveau');

  const [lieux, personnes] = await Promise.all([
    chargerLieux(),
    chargerPortraitsMentionnables(),
  ]);

  return (
    <>
      <Navigation />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/souvenirs" className="lien-discret text-sm">
          ← Revenir au mur
        </Link>

        <h1 className="mt-4 text-3xl">Déposer un souvenir</h1>
        <p className="mt-2 text-encre-douce">
          Une anecdote, un repas, un départ, une habitude. Ce qui n’est écrit nulle part
          ailleurs et qui se perdra si personne ne l’écrit.
        </p>

        <div className="mt-8">
          <FormulaireSouvenir
            mode="depot"
            lieux={lieux}
            personnes={personnes}
            utilisateurId={droits.utilisateurId}
            peutDeposerPhotos={droits.peutContribuer}
          />
        </div>
      </main>
    </>
  );
}
