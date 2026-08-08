import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { LecteurPresentation, type ReperePresentation } from '@/components/presentation/lecteur-presentation';
import { chargerArbre, formaterDate } from '@/lib/arbre';

export const metadata: Metadata = { title: 'Présenter l’histoire familiale' };
export const dynamic = 'force-dynamic';

/** Lecture non éditoriale pour une réunion : uniquement des données déjà autorisées. */
export default async function PagePresentation() {
  const donnees = await chargerArbre({ signerPhotosPour: 'tous' });
  const reperes = construireReperes(donnees);
  return (
    <>
      <Navigation />
      <main id="contenu-principal" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/export" className="lien-discret text-sm">← Revenir aux transmissions</Link>
        <header className="mt-4 max-w-3xl">
          <h1 className="text-3xl">Présenter l’histoire familiale</h1>
          <p className="mt-3 leading-relaxed text-encre-douce">Un parcours calme, pensé pour une réunion ou un écran partagé. Il montre des repères déjà présents dans l’arbre ; les liens et les niveaux de preuve restent à vérifier sur chaque fiche.</p>
        </header>
        <div className="mt-8"><LecteurPresentation reperes={reperes} /></div>
      </main>
    </>
  );
}

function construireReperes(donnees: Awaited<ReturnType<typeof chargerArbre>>): ReperePresentation[] {
  const nom = (id: string) => donnees.personnes.get(id)?.nomComplet ?? 'Personne non visible';
  return [...donnees.personnes.values()]
    .filter((personne) => personne.naissance?.annee != null || personne.deces?.annee != null)
    .sort((a, b) => {
      const dateA = a.naissance?.annee ?? a.deces?.annee ?? Number.MAX_SAFE_INTEGER;
      const dateB = b.naissance?.annee ?? b.deces?.annee ?? Number.MAX_SAFE_INTEGER;
      return dateA - dateB || a.nomComplet.localeCompare(b.nomComplet, 'fr');
    })
    .slice(0, 18)
    .map((personne) => ({
      id: personne.id,
      nom: personne.nomComplet,
      dates: datesDeVie(personne.naissance, personne.deces),
      photoUrl: personne.photoUrl,
      branches: personne.branches,
      preuves: personne.niveauxPreuve,
      parents: (donnees.parents.get(personne.id) ?? []).map(nom),
      enfants: (donnees.enfants.get(personne.id) ?? []).map(nom),
    }));
}

function datesDeVie(naissance: { annee: number | null; mois: number | null; jour: number | null; texte: string } | null, deces: { annee: number | null; mois: number | null; jour: number | null; texte: string } | null): string {
  const dateNaissance = naissance ? formaterDate(naissance) : '';
  const dateDeces = deces ? formaterDate(deces) : '';
  if (dateNaissance && dateDeces) return `${dateNaissance} — ${dateDeces}`;
  if (dateNaissance) return `Né(e) ${dateNaissance}`;
  if (dateDeces) return `Décédé(e) ${dateDeces}`;
  return 'Dates non renseignées';
}
