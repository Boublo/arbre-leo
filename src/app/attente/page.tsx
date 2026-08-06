import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { creerClientServeur } from '@/lib/supabase/server';
import { deconnecter } from '@/app/actions/auth';

export const metadata: Metadata = { title: 'Demande en attente' };

export default async function PageAttente() {
  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion');

  const { data: membre } = await supabase
    .from('membres')
    .select('nom_affiche, statut, motif_refus')
    .eq('id', user.id)
    .maybeSingle();

  // L'accès vient d'être ouvert : plus rien à attendre ici.
  if (membre?.statut === 'valide') redirect('/');

  const refuse = membre?.statut === 'refuse';
  const suspendu = membre?.statut === 'suspendu';

  return (
    <main id="contenu-principal" className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <div className="carte p-8 text-center">
        <h1 className="text-2xl">
          {refuse ? 'Demande non retenue' : suspendu ? 'Accès suspendu' : 'Votre demande est enregistrée'}
        </h1>

        <p className="mt-4 text-encre-douce">
          {refuse ? (
            <>
              Votre demande d&apos;accès n&apos;a pas été retenue.
              {membre?.motif_refus ? <> Motif indiqué : « {membre.motif_refus} »</> : null}
            </>
          ) : suspendu ? (
            <>Votre accès a été suspendu. Prenez contact avec l&apos;administrateur de l&apos;arbre.</>
          ) : (
            <>
              Bonjour {membre?.nom_affiche ?? ''}. Un administrateur de la famille doit
              maintenant ouvrir votre accès. Vous recevrez la nouvelle par e-mail —
              en général sous un jour ou deux.
            </>
          )}
        </p>

        <p className="mt-6 text-sm text-encre-tres-douce">
          Cette attente n&apos;est pas une formalité : l&apos;arbre contient des photos de
          famille et des renseignements sur des personnes vivantes, qui ne doivent pas
          circuler au-delà du cercle familial.
        </p>

        <form action={deconnecter} className="mt-8">
          <button type="submit" className="lien-discret text-sm">
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
