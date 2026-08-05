import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { chargerFiche, chargerNomPersonne } from '@/components/personne/donnees';
import { EnTetePersonne } from '@/components/personne/en-tete';
import { ViePersonne } from '@/components/personne/vie';
import { ParentePersonne } from '@/components/personne/parente';
import { NotesPersonne } from '@/components/personne/notes';
import { SourcesPersonne } from '@/components/personne/sources';
import { MediasPersonne } from '@/components/personne/medias';
import { SouvenirsPersonne } from '@/components/personne/souvenirs';
import { FaitsPersonne } from '@/components/personne/faits';
import { CommentairesPersonne } from '@/components/personne/commentaires';
import { BarreDeSaisie } from '@/components/saisie/lien-ajout';

/**
 * La fiche complète d'une personne.
 *
 * On y vient depuis l'arbre pour tout savoir de quelqu'un : sa vie dans
 * l'ordre, sa parenté, ce qui l'atteste, ce que la famille en raconte. La page
 * est volontairement longue et d'une seule colonne — elle se lit comme une
 * notice de livre de famille, pas comme un tableau de bord.
 */

// Une correction déposée par un cousin doit se voir au rechargement suivant.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/personne/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const nom = await chargerNomPersonne(id);
  return { title: nom ?? 'Fiche introuvable' };
}

export default async function PagePersonne({ params }: PageProps<'/personne/[id]'>) {
  const { id } = await params;
  const fiche = await chargerFiche(id);

  if (!fiche) notFound();

  return (
    <>
      <Navigation />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <p className="mb-4">
          <Link href="/" className="lien-discret text-sm">
            ← Revenir à l’arbre
          </Link>
        </p>

        <div className="flex flex-col gap-6">
          <EnTetePersonne fiche={fiche} />
          <BarreDeSaisie
            personneId={fiche.personne.id}
            nomComplet={fiche.nomComplet}
            sexe={fiche.personne.sexe}
          />
          <ViePersonne evenements={fiche.evenements} />
          <ParentePersonne fiche={fiche} />
          <NotesPersonne notes={fiche.personne.notes} />
          <SourcesPersonne sources={fiche.sources} />
          <MediasPersonne medias={fiche.medias} />
          <SouvenirsPersonne souvenirs={fiche.souvenirs} />
          <FaitsPersonne faits={fiche.faits} />
          <CommentairesPersonne
            personneId={fiche.personne.id}
            nomPersonne={fiche.nomComplet}
            commentaires={fiche.commentaires}
          />
        </div>
      </main>
    </>
  );
}
