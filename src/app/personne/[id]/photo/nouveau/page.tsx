import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { FormulairePortrait } from '@/components/photos/formulaire-portrait';
import { chargerFiche, chargerNomPersonne } from '@/components/personne/donnees';
import { lireDroitsSaisie } from '@/components/saisie/donnees';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/personne/[id]/photo/nouveau'>): Promise<Metadata> {
  const { id } = await params;
  const nom = await chargerNomPersonne(id);
  return { title: nom ? `Déposer une photo pour ${nom}` : 'Fiche introuvable' };
}

export default async function PageNouveauPortrait({
  params,
}: PageProps<'/personne/[id]/photo/nouveau'>) {
  const { id } = await params;
  const droits = await lireDroitsSaisie();

  if (!droits.utilisateurId) redirect(`/connexion?suite=/personne/${id}/photo/nouveau`);

  const [nom, fiche] = await Promise.all([chargerNomPersonne(id), chargerFiche(id)]);
  if (!nom || !fiche) notFound();

  return (
    <>
      <Navigation />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href={`/personne/${id}`} className="lien-discret text-sm">
          ← Revenir à la fiche de {nom}
        </Link>

        <h1 className="mt-4 text-3xl">Déposer une photo</h1>
        <p className="mt-2 text-encre-douce">
          Un portrait scanné, une photo de mariage, un cliché retrouvé dans un album : versez-le
          ici pour qu’il apparaisse sur la fiche et, si vous le souhaitez, sur la carte de
          l’arbre.
        </p>

        <div className="mt-8">
          {droits.peutContribuer ? (
            <FormulairePortrait
              personneId={id}
              nomPersonne={nom}
              utilisateurId={droits.utilisateurId}
              aDejaPortrait={fiche.personne.photo_id !== null}
            />
          ) : (
            <p className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-3 py-2.5 text-sm text-encre-douce">
              Votre compte peut lire l’arbre mais pas encore y déposer de photos. Demandez à un
              administrateur de la famille de vous passer contributeur.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
