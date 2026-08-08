import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Alerte } from '@/components/ui/champs';
import { GuideAjout } from '@/components/saisie/guide-ajout';
import { chargerPersonnesChoisissables, lireDroitsSaisie } from '@/components/saisie/donnees';

export const metadata = { title: 'Guide pour ajouter un lien familial' };
export const dynamic = 'force-dynamic';

/** Guide local et déterministe : aucun texte familial ne quitte l’application. */
export default async function PageGuideAjout() {
  const droits = await lireDroitsSaisie();
  if (!droits.utilisateurId) redirect('/connexion?suite=/ajout-guide');

  const personnes = await chargerPersonnesChoisissables();

  return (
    <>
      <Navigation />
      <main id="contenu-principal" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/personne/nouvelle" className="lien-discret text-sm">
          ← Revenir à l’ajout d’une personne
        </Link>
        <h1 className="mt-4 text-3xl">Quel lien voulez-vous ajouter ?</h1>
        <p className="mt-2 text-encre-douce">
          Ce guide local prépare seulement le bon formulaire. Il n’interprète aucun récit, ne crée
          aucun lien et n’envoie aucune information à un service extérieur.
        </p>

        <div className="mt-8">
          {droits.peutContribuer ? (
            <GuideAjout personnes={personnes} />
          ) : (
            <Alerte ton="info">
              Votre compte peut consulter ce guide, mais seul un contributeur peut enregistrer une
              fiche ou un lien familial.
            </Alerte>
          )}
        </div>
      </main>
    </>
  );
}
