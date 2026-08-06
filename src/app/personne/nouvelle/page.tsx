import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Alerte } from '@/components/ui/champs';
import { FormulairePersonne } from '@/components/saisie/formulaire-personne';
import {
  PERSONNE_VIDE,
  chargerLibellesLieux,
  chargerPersonnesChoisissables,
  chargerUnions,
  lireDroitsSaisie,
  type OptionPersonne,
} from '@/components/saisie/donnees';

/**
 * Ajouter quelqu’un à l’arbre.
 *
 * L’arbre s’est constitué par import de fichiers GEDCOM ; les enfants nés
 * depuis n’y figurent dans aucun fichier et n’entreraient jamais sans cette
 * page. C’est le premier geste vraiment familial du site : écrire soi-même
 * quelqu’un des siens.
 *
 * On arrive souvent ici depuis une fiche — « ajouter un enfant de… » — et
 * l’adresse porte alors le rattachement déjà pressenti.
 */

export const metadata = { title: 'Ajouter quelqu’un' };

// La liste des personnes à désigner doit refléter la saisie précédente.
export const dynamic = 'force-dynamic';

function premier(valeur: string | string[] | undefined): string {
  return (Array.isArray(valeur) ? valeur[0] : valeur) ?? '';
}

/** Un rattachement suggéré par l’adresse n’est retenu que s’il désigne quelqu’un. */
function connu(id: string, personnes: OptionPersonne[]): string {
  return personnes.some((p) => p.id === id) ? id : '';
}

export default async function PageNouvellePersonne({ searchParams }: PageProps<'/personne/nouvelle'>) {
  const droits = await lireDroitsSaisie();

  // `proxy.ts` a déjà écarté les visiteurs ; ce garde-fou couvre la session
  // expirée entre-temps, pour ne pas afficher un formulaire qui échouera.
  if (!droits.utilisateurId) redirect('/connexion?suite=/personne/nouvelle');

  const parametres = await searchParams;

  const personnes = await chargerPersonnesChoisissables();
  const [unions, lieux] = await Promise.all([chargerUnions(personnes), chargerLibellesLieux()]);

  const valeurs = {
    ...PERSONNE_VIDE,
    pereId: connu(premier(parametres.pere), personnes),
    mereId: connu(premier(parametres.mere), personnes),
  };
  const conjointId = connu(premier(parametres.conjoint), personnes);

  return (
    <>
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/arbre" className="lien-discret text-sm">
          ← Revenir à l’arbre
        </Link>

        <h1 className="mt-4 text-3xl">Ajouter quelqu’un</h1>
        <p className="mt-2 text-encre-douce">
          Un enfant qui vient de naître, un conjoint, un aïeul retrouvé aux archives. Ce que vous
          ignorez peut rester vide : une fiche se complète à plusieurs, et sur des années.
        </p>

        <div className="mt-8">
          {droits.peutContribuer ? (
            <FormulairePersonne
              mode="creation"
              valeurs={{ ...valeurs, conjointId }}
              personnes={personnes}
              unions={unions}
              lieux={lieux}
            />
          ) : (
            <Alerte ton="info">
              Votre compte peut lire l’arbre mais pas encore l’écrire. Demandez à un administrateur
              de la famille de vous passer contributeur : la base refuserait l’enregistrement.
            </Alerte>
          )}
        </div>
      </main>
    </>
  );
}
