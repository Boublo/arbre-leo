import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { FormulaireRecit, type ValeursRecit } from '@/components/recits/formulaire-recit';
import {
  chargerPatronymesConnus,
  chargerPortraitsMentionnables,
  chargerRecit,
  lireDroits,
} from '@/lib/recits';

export const metadata = { title: 'Modifier un récit' };

export const dynamic = 'force-dynamic';

export default async function PageModifierRecit({
  params,
}: PageProps<'/recits/[id]/modifier'>) {
  const { id } = await params;

  const [recit, droits] = await Promise.all([chargerRecit(id), lireDroits()]);
  if (!recit) notFound();

  if (!droits.utilisateurId) redirect(`/connexion?suite=/recits/${id}/modifier`);

  const peutReprendre =
    droits.estAdmin ||
    (droits.utilisateurId !== null && droits.utilisateurId === recit.auteurId);
  if (!peutReprendre) redirect(`/recits/${id}`);

  const [patronymes, personnes] = await Promise.all([
    chargerPatronymesConnus(),
    chargerPortraitsMentionnables(),
  ]);

  // La famille du récit pourrait ne plus figurer parmi les patronymes vivants
  // (personnes retirées, importation partielle) : on la réinjecte pour ne pas
  // forcer un changement subi.
  const patronymesEtendus = recit.patronyme && !patronymes.includes(recit.patronyme)
    ? [...patronymes, recit.patronyme].sort((a, b) => a.localeCompare(b, 'fr'))
    : patronymes;

  const valeurs: ValeursRecit = {
    id: recit.id,
    patronyme: recit.patronyme,
    theme: recit.theme,
    branche: recit.branche,
    titre: recit.titre,
    chapeau: recit.chapeau,
    corps: recit.corps,
    anneeDebut: recit.anneeDebut,
    anneeFin: recit.anneeFin,
    personnes: recit.personnes.map((p) => p.id),
  };

  return (
    <>
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link href={`/recits/${recit.id}`} className="lien-discret text-sm">
          ← Revenir à la lecture
        </Link>

        <h1 className="mt-4 text-3xl">Modifier « {recit.titre} »</h1>
        <p className="mt-2 text-encre-douce">
          Ce que vous enregistrez remplace la version précédente. La date de dernière retouche
          apparaîtra en pied de récit.
        </p>

        <div className="mt-8">
          <FormulaireRecit
            mode="modification"
            patronymes={patronymesEtendus}
            personnes={personnes}
            valeurs={valeurs}
          />
        </div>
      </main>
    </>
  );
}
