import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { FormulaireActe } from '@/components/actes/formulaire-acte';
import { chargerNomPersonne } from '@/components/personne/donnees';
import {
  chargerLibellesLieux,
  lireDroitsSaisie,
} from '@/components/saisie/donnees';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/personne/[id]/acte/nouveau'>): Promise<Metadata> {
  const { id } = await params;
  const nom = await chargerNomPersonne(id);
  return { title: nom ? `Verser un acte pour ${nom}` : 'Fiche introuvable' };
}

export default async function PageNouvelActe({
  params,
}: PageProps<'/personne/[id]/acte/nouveau'>) {
  const { id } = await params;
  const droits = await lireDroitsSaisie();

  if (!droits.utilisateurId) redirect(`/connexion?suite=/personne/${id}/acte/nouveau`);

  const [nom, lieux] = await Promise.all([chargerNomPersonne(id), chargerLibellesLieux()]);
  if (!nom) notFound();

  return (
    <>
      <Navigation />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href={`/personne/${id}`} className="lien-discret text-sm">
          ← Revenir à la fiche de {nom}
        </Link>

        <h1 className="mt-4 text-3xl">Verser un acte</h1>
        <p className="mt-2 text-encre-douce">
          Vous avez reçu une copie d’état civil, photographié un registre, ou relu une pièce aux
          archives : versez-la ici pour que toute la famille en profite.
        </p>

        <div className="mt-8">
          {droits.peutContribuer ? (
            <FormulaireActe
              personneId={id}
              nomPersonne={nom}
              lieux={lieux}
              utilisateurId={droits.utilisateurId}
              peutDeposerFichiers={droits.peutContribuer}
            />
          ) : (
            <p className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-3 py-2.5 text-sm text-encre-douce">
              Votre compte peut lire l’arbre mais pas encore y verser des actes. Demandez à un
              administrateur de la famille de vous passer contributeur.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
