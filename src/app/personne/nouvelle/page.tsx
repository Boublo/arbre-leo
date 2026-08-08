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

/** Un raccourci peut proposer le sexe d'un parent, jamais une valeur arbitraire. */
function sexeSuggere(valeur: string): 'M' | 'F' | 'inconnu' {
  return valeur === 'M' || valeur === 'F' ? valeur : 'inconnu';
}

function nomConnu(id: string, personnes: OptionPersonne[]): string | null {
  return personnes.find((personne) => personne.id === id)?.nomComplet ?? null;
}

function unionConnue(id: string, unions: { id: string }[]): string {
  return unions.some((union) => union.id === id) ? id : '';
}

/** Explique le raccourci suivi, sans préjuger des modifications faites ensuite au formulaire. */
function apercuRattachement(
  valeurs: { pereId: string; mereId: string; unionParents: string; enfants: string[] },
  conjointId: string,
  personnes: OptionPersonne[],
  unions: { id: string; libelle: string }[]
): string[] {
  const propositions: string[] = [];
  const pere = nomConnu(valeurs.pereId, personnes);
  const mere = nomConnu(valeurs.mereId, personnes);
  const conjoint = nomConnu(conjointId, personnes);
  const union = unions.find((foyer) => foyer.id === valeurs.unionParents)?.libelle ?? null;
  const enfants = valeurs.enfants.map((id) => nomConnu(id, personnes)).filter((nom): nom is string => nom !== null);

  if (pere) propositions.push(`${pere} est proposé comme père.`);
  if (mere) propositions.push(`${mere} est proposée comme mère.`);
  if (union) propositions.push(`Le foyer « ${union} » est proposé pour le rattachement.`);
  if (conjoint) propositions.push(`${conjoint} est proposé comme conjoint ou conjointe.`);
  if (enfants.length > 0) propositions.push(`${enfants.join(', ')} est proposé comme enfant de la nouvelle fiche.`);
  return propositions;
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
    unionParents: unionConnue(premier(parametres.union), unions),
    enfants: [connu(premier(parametres.enfant), personnes)].filter(Boolean),
    sexe: sexeSuggere(premier(parametres.sexe)),
  };
  const conjointId = connu(premier(parametres.conjoint), personnes);
  const apercu = apercuRattachement(valeurs, conjointId, personnes, unions);

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
        <p className="mt-3 text-sm text-encre-douce">
          Vous hésitez sur le bon lien ? <Link href="/ajout-guide" className="lien-discret">Utiliser le guide local</Link>.
        </p>

        <div className="mt-8">
          {droits.peutContribuer ? (
            <>
              {apercu.length > 0 && (
                <div className="mb-6">
                  <Alerte ton="info">
                    <span className="font-medium text-encre">Lien proposé : </span>
                    {apercu.join(' ')} Vous pouvez modifier ou retirer ces choix avant l’enregistrement.
                  </Alerte>
                </div>
              )}
              <FormulairePersonne
                mode="creation"
                valeurs={{ ...valeurs, conjointId }}
                personnes={personnes}
                unions={unions}
                lieux={lieux}
              />
            </>
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
