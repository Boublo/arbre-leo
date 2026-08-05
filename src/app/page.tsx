import { Navigation } from '@/components/navigation';
import { EcranArbre } from '@/components/arbre/ecran-arbre';
import { chargerArbre, derniersEnfants, personneOuDefaut } from '@/lib/arbre';
import { serialiserGraphe } from '@/lib/arbre-graphe';

export const metadata = { title: 'L’arbre' };

// L'arbre change dès qu'un membre corrige une fiche ou saisit une naissance.
export const dynamic = 'force-dynamic';

export default async function PageArbre({ searchParams }: PageProps<'/'>) {
  const { personne: focusDemande } = await searchParams;

  const donnees = await chargerArbre();

  if (donnees.personnes.size === 0) {
    return (
      <>
        <Navigation />
        <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-6 text-center">
          <h1 className="text-2xl">L’arbre est encore vide</h1>
          <p className="mt-3 text-encre-douce">
            Personne n’a été versé dans la base. Importez un fichier GEDCOM en suivant
            le <code>README.md</code>, ou saisissez la première personne à la main.
          </p>
        </main>
      </>
    );
  }

  // Le graphe entier part au navigateur : changer de personne ou de mode
  // devient instantané, sans repasser par le serveur.
  const graphe = serialiserGraphe(donnees);

  const focus = personneOuDefaut(
    donnees,
    typeof focusDemande === 'string' ? focusDemande : undefined
  );

  return (
    <>
      <Navigation />
      <EcranArbre
        graphe={graphe}
        focusInitial={focus?.id ?? graphe.personnes[0]!.id}
        derniersEnfants={derniersEnfants(donnees).map((p) => p.id)}
      />
    </>
  );
}
