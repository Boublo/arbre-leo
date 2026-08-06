import type { Metadata } from 'next';
import { Navigation } from '@/components/navigation';
import { chargerFaits, peutContribuer, repartirParPeriode } from '@/lib/histoire';
import { FrisePeriodes, SommairePeriodes } from '@/components/histoire/frise-periodes';
import { AccueilHistoire } from '@/components/histoire/accueil-histoire';
import { FormulaireFait } from '@/components/histoire/formulaire-fait';

export const metadata: Metadata = { title: 'La grande Histoire' };

// La page change dès qu'un membre verse un fait ou rattache quelqu'un.
export const dynamic = 'force-dynamic';

export default async function PageHistoire() {
  const [faits, contributeur] = await Promise.all([chargerFaits(), peutContribuer()]);
  const groupes = repartirParPeriode(faits);

  const nombrePersonnes = new Set(
    faits.flatMap((fait) => fait.personnes.map((personne) => personne.id))
  ).size;

  return (
    <>
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <header>
          <h1 className="text-3xl">La grande Histoire</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-encre-douce">
            Personne n’a vécu hors de son époque. On lit ici les événements du
            monde qui ont traversé la vie des nôtres — ceux qui les ont fait
            partir, ceux qui les ont retenus, ceux qui leur ont pris quelqu’un —
            et, pour chacun, ce qu’il a changé dans une vie précise.
          </p>

          {faits.length > 0 && (
            <p className="mt-4 text-sm text-encre-tres-douce">
              {faits.length} fait{faits.length > 1 ? 's' : ''} versé
              {faits.length > 1 ? 's' : ''}
              {nombrePersonnes > 0 && (
                <>
                  , rattaché{faits.length > 1 ? 's' : ''} à {nombrePersonnes} personne
                  {nombrePersonnes > 1 ? 's' : ''} de l’arbre
                </>
              )}
              .
            </p>
          )}
        </header>

        {faits.length === 0 ? (
          <div className="mt-8">
            <AccueilHistoire peutContribuer={contributeur} />
          </div>
        ) : (
          <>
            <div className="mt-8">
              <SommairePeriodes groupes={groupes} />
            </div>
            <div className="mt-10">
              <FrisePeriodes groupes={groupes} />
            </div>
          </>
        )}

        {contributeur && (
          <div className="mt-12">
            <FormulaireFait ouvertParDefaut={faits.length === 0} />
          </div>
        )}
      </main>
    </>
  );
}
