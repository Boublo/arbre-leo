import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { ParcoursGenerations } from '@/components/histoire/parcours-generations';
import { generationsAscendance } from '@/lib/generations';
import { chargerGrapheArbreFocus } from '@/lib/arbre-contexte-fiche';

export const metadata: Metadata = { title: 'Notre histoire' };
export const dynamic = 'force-dynamic';

export default async function PageHistoireFamille({
  searchParams,
}: PageProps<'/histoire/famille'>) {
  const { personne } = await searchParams;
  const personneId = typeof personne === 'string' ? personne : null;

  if (!personneId) {
    return (
      <>
        <Navigation />
        <main id="contenu-principal" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
          <h1 className="font-titre text-3xl text-encre sm:text-4xl">Notre histoire</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-encre-douce">
            Choisissez une personne de départ pour remonter les générations connues, sans masquer les zones encore à rechercher.
          </p>
          <Link href="/recherche" className="mt-5 inline-block lien-discret">
            Trouver une personne →
          </Link>
        </main>
      </>
    );
  }

  const donnees = await chargerGrapheArbreFocus(personneId).catch(() => null);
  const personneFocus = donnees?.personnes.get(personneId);
  if (!donnees || !personneFocus) notFound();
  const generations = generationsAscendance(donnees, personneId);

  return (
    <>
      <Navigation />
      <main id="contenu-principal" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Link href={`/personne/${personneId}`} className="lien-discret text-sm">
          ← Revenir à la fiche de {personneFocus.nomComplet}
        </Link>
        <header className="mb-6 mt-5">
          <p className="text-sm text-encre-tres-douce">Lecture familiale</p>
          <h1 className="mt-1 font-titre text-3xl text-encre sm:text-4xl">Notre histoire</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-encre-douce">
            En remontant depuis {personneFocus.nomComplet}, voici les générations que l’arbre relie aujourd’hui.
          </p>
        </header>
        <ParcoursGenerations generations={generations} />
      </main>
    </>
  );
}
