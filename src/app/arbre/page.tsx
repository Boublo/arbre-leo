import { redirect } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { EcranArbreDynamique } from '@/components/arbre/ecran-arbre-dynamique';
import { lireDroitsSaisie } from '@/components/saisie/donnees';
import { chargerArbre, derniersEnfants, personneOuDefaut } from '@/lib/arbre';
import { serialiserGraphe, versPersonneRecherche } from '@/lib/arbre-graphe';

export const metadata = { title: 'L’arbre' };

// L'arbre change dès qu'un membre corrige une fiche ou saisit une naissance.
export const dynamic = 'force-dynamic';

export default async function PageArbre({ searchParams }: PageProps<'/arbre'>) {
  const { personne: focusDemande } = await searchParams;

  const [donnees, droits] = await Promise.all([
    chargerArbre({ signerPhotosPour: 'aucun' }),
    lireDroitsSaisie(),
  ]);

  if (donnees.personnes.size === 0) {
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

  const focus = personneOuDefaut(
    donnees,
    typeof focusDemande === 'string' ? focusDemande : undefined
  );

  const focusId = focus?.id ?? [...donnees.personnes.keys()][0]!;

  if (!focusDemande && focus) {
    redirect(`/arbre?personne=${focus.id}`);
  }

  // Graphe complet côté client : le layout est instantané et l'ascendance
  // a besoin de toute la chaîne des ancêtres (un sous-graphe BFS la tronque).
  // Les notes sont omises du payload (voir serialiserGraphe).
  const graphe = serialiserGraphe(donnees);
  const recherchePersonnes = [...donnees.personnes.values()].map(versPersonneRecherche);

  return (
    <>
      <Navigation compact />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden h-[calc(100dvh-3.25rem)] max-h-[calc(100dvh-3.25rem)]">
        <EcranArbreDynamique
          graphe={graphe}
          recherchePersonnes={recherchePersonnes}
          focusInitial={focusId}
          derniersEnfants={derniersEnfants(donnees).map((p) => p.id)}
          peutDeposerPhoto={droits.peutContribuer}
        />
      </div>
    </>
  );
}
