import type { Metadata } from 'next';
import { Navigation } from '@/components/navigation';
import { RecherchePersonnes } from '@/components/recherche/recherche-personnes';
import { chargerPersonnesRechercheArbre } from '@/lib/arbre-contexte-fiche';

export const metadata: Metadata = { title: 'Trouver une personne' };
export const dynamic = 'force-dynamic';

/** L'index est chargé côté serveur : RLS décide quelles fiches peuvent apparaître. */
export default async function PageRecherche() {
  const personnes = await chargerPersonnesRechercheArbre();

  return (
    <>
      <Navigation />
      <main id="contenu-principal" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6">
          <p className="text-sm text-encre-tres-douce">Explorer l’arbre</p>
          <h1 className="mt-1 font-titre text-3xl text-encre sm:text-4xl">Trouver une personne</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-encre-douce">
            Retrouvez une fiche sans passer par tout l’arbre, puis poursuivez l’exploration depuis ses liens de famille.
          </p>
        </header>
        <RecherchePersonnes personnes={personnes} />
      </main>
    </>
  );
}
