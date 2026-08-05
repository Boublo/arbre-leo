import { Navigation } from '@/components/navigation';
import { EcranArbre } from '@/components/arbre/ecran-arbre';
import { chargerArbre, trouverRacine } from '@/lib/arbre';
import { disposerArbre } from '@/lib/layout-arbre';
import type { ArbreSerialise } from '@/components/arbre/vue-arbre';

export const metadata = { title: 'L’arbre' };

// L'arbre change dès qu'un membre corrige une fiche ou dépose un souvenir.
export const dynamic = 'force-dynamic';

export default async function PageArbre() {
  const donnees = await chargerArbre();
  const racine = trouverRacine(donnees);

  if (!racine) {
    return (
      <>
        <Navigation />
        <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-6 text-center">
          <h1 className="text-2xl">L’arbre est encore vide</h1>
          <p className="mt-3 text-encre-douce">
            Aucune personne n’a été versée dans la base. Lancez l’import décrit
            dans le fichier <code>README.md</code>.
          </p>
        </main>
      </>
    );
  }

  // Les deux vues sont calculées côté serveur : la bascule est alors immédiate.
  const personnes = [...donnees.personnes.values()];

  const serialiser = (mode: 'ascendance' | 'complet'): ArbreSerialise => {
    const complet = disposerArbre(donnees, racine.id, mode);
    // `parGeneration` est une Map : elle ne franchit pas la frontière
    // serveur/client, et le composant n'en a pas l'usage.
    const disposition = {
      noeuds: complet.noeuds,
      liens: complet.liens,
      unions: complet.unions,
      largeur: complet.largeur,
      hauteur: complet.hauteur,
    };
    return { personnes, disposition, racineId: racine.id };
  };

  return (
    <>
      <Navigation />
      <EcranArbre ascendance={serialiser('ascendance')} complet={serialiser('complet')} />
    </>
  );
}
