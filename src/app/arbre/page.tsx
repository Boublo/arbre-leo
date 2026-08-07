import { redirect } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { EcranArbreDynamique } from '@/components/arbre/ecran-arbre-dynamique';
import { lireDroitsSaisie } from '@/components/saisie/donnees';
import {
  chargerDerniersEnfantsIds,
  chargerGrapheArbreFocus,
  chargerPersonnesRechercheArbre,
  resoudreFocusArbre,
} from '@/lib/arbre-contexte-fiche';
import { serialiserGraphe } from '@/lib/arbre-graphe';

export const metadata = { title: 'L’arbre' };

// L'arbre change dès qu'un membre corrige une fiche ou saisit une naissance.
export const dynamic = 'force-dynamic';

export default async function PageArbre({ searchParams }: PageProps<'/arbre'>) {
  const { personne: focusDemande } = await searchParams;

  const [recherchePersonnes, droits] = await Promise.all([
    chargerPersonnesRechercheArbre(),
    lireDroitsSaisie(),
  ]);

  if (recherchePersonnes.length === 0) {
    return (
      <>
        <Navigation />
        <main id="contenu-principal" className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-6 text-center">
          <h1 className="text-2xl">L’arbre est encore vide</h1>
          <p className="mt-3 text-encre-douce">
            Personne n’a été versé dans la base. Importez un fichier GEDCOM en suivant
            le <code>README.md</code>, ou saisissez la première personne à la main.
          </p>
        </main>
      </>
    );
  }

  const focusId = resoudreFocusArbre(
    recherchePersonnes,
    typeof focusDemande === 'string' ? focusDemande : undefined
  );

  if (!focusId) {
    return (
      <>
        <Navigation />
        <main id="contenu-principal" className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-6 text-center">
          <h1 className="text-2xl">L’arbre est encore vide</h1>
        </main>
      </>
    );
  }

  if (!focusDemande) {
    redirect(`/arbre?personne=${focusId}`);
  }

  const [donnees, derniersEnfantsIds] = await Promise.all([
    chargerGrapheArbreFocus(focusId),
    chargerDerniersEnfantsIds(),
  ]);

  // Sous-graphe autour du focus : ascendance complète + voisinage latéral.
  // La recherche globale reste sur l'index léger `recherchePersonnes`.
  const graphe = serialiserGraphe(donnees);

  return (
    <>
      <Navigation compact />
      <main
        id="contenu-principal"
        className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden h-[calc(100dvh-3.25rem)] max-h-[calc(100dvh-3.25rem)]"
      >
        <EcranArbreDynamique
          graphe={graphe}
          recherchePersonnes={recherchePersonnes}
          focusInitial={focusId}
          derniersEnfants={derniersEnfantsIds}
          peutDeposerPhoto={droits.peutContribuer}
        />
      </main>
    </>
  );
}
