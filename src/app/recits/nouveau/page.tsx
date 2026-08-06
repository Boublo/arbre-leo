import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { FormulaireRecit } from '@/components/recits/formulaire-recit';
import {
  chargerPatronymesConnus,
  chargerPortraitsMentionnables,
  lireDroits,
} from '@/lib/recits';

export const metadata = { title: 'Écrire un récit' };

export const dynamic = 'force-dynamic';

function premier(valeur: string | string[] | undefined): string | null {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  const propre = (brut ?? '').trim();
  return propre === '' ? null : propre;
}

export default async function PageNouveauRecit({
  searchParams,
}: PageProps<'/recits/nouveau'>) {
  const parametres = await searchParams;
  const droits = await lireDroits();

  // `proxy.ts` a déjà écarté les visiteurs ; ce garde-fou couvre la session
  // expirée entre-temps, pour ne pas afficher un formulaire qui échouera.
  if (!droits.utilisateurId) redirect('/connexion?suite=/recits/nouveau');

  const [patronymes, personnes] = await Promise.all([
    chargerPatronymesConnus(),
    chargerPortraitsMentionnables(),
  ]);

  // Pré-remplissage à partir de `?famille=` : on arrive parfois ici depuis
  // l’état vide de la liste, avec une famille déjà en tête.
  const patronymeInitial = premier(parametres.famille);
  const valeursInitiales = patronymeInitial && patronymes.includes(patronymeInitial)
    ? {
        id: '',
        patronyme: patronymeInitial,
        theme: null,
        branche: null,
        titre: '',
        chapeau: null,
        corps: '',
        anneeDebut: null,
        anneeFin: null,
        personnes: [] as string[],
      }
    : undefined;

  return (
    <>
      <Navigation />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/recits" className="lien-discret text-sm">
          ← Revenir aux récits
        </Link>

        <h1 className="mt-4 text-3xl">Écrire un récit</h1>
        <p className="mt-2 text-encre-douce">
          Choisissez la famille ou le thème, donnez-lui un titre, racontez. La
          famille pourra le lire, y répondre et le compléter.
        </p>

        {!droits.peutContribuer && (
          <p className="carte mt-6 p-4 text-sm text-encre-douce">
            L’écriture des récits est réservée aux contributeurs. Demandez-le à un
            administrateur si vous souhaitez pouvoir écrire.
          </p>
        )}

        {droits.peutContribuer && (
          <div className="mt-8">
            <FormulaireRecit
              mode="creation"
              patronymes={patronymes}
              personnes={personnes}
              valeurs={valeursInitiales}
            />
          </div>
        )}
      </main>
    </>
  );
}
