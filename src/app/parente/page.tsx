import type { Metadata } from 'next';
import { Navigation } from '@/components/navigation';
import { BarreScroll } from '@/components/interactions/barre-scroll';
import { RaccourciAccueil } from '@/components/interactions/raccourci-accueil';
import { SelecteurCouple } from '@/components/parente/selecteur-couple';
import { FriseChemin } from '@/components/parente/frise-chemin';
import { Vignette } from '@/components/portrait/vignette';
import { portraitDePersonne } from '@/components/portrait/types';
import { chargerArbre } from '@/lib/arbre';
import { calculerParente } from '@/lib/parente';

/**
 * Calcul de parenté entre deux personnes.
 *
 * L'adresse porte les deux identifiants : `?a=<uuid>&b=<uuid>`. La page se
 * recompose entièrement côté serveur, ce qui la rend partageable — un lien
 * envoyé à un cousin ouvre exactement la même vue chez lui. Tant que les deux
 * personnes ne sont pas choisies, on affiche seulement le formulaire.
 *
 * Le calcul lui-même vit dans `@/lib/parente` : cette page se limite à valider
 * les identifiants reçus, appeler la fonction et disposer les résultats.
 */

export const metadata: Metadata = { title: 'Parenté' };

// Une correction dans l'arbre peut changer l'ancêtre commun trouvé, il faut
// que la page reflète l'état actuel de la base à chaque visite.
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function premier(valeur: string | string[] | undefined): string | null {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  const propre = (brut ?? '').trim();
  return propre === '' ? null : propre;
}

type ParametresParente = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PageParente({ searchParams }: ParametresParente) {
  const parametres = await searchParams;
  const aBrut = premier(parametres.a);
  const bBrut = premier(parametres.b);

  const donnees = await chargerArbre();

  // Un identifiant absent, mal formé ou inconnu de la base — souvent parce
  // que la fiche est masquée par les politiques de lecture — est traité
  // comme un choix non posé : la page ne se casse pas, elle propose de choisir.
  const aValide =
    aBrut && UUID.test(aBrut) && donnees.personnes.has(aBrut) ? aBrut : null;
  const bValide =
    bBrut && UUID.test(bBrut) && donnees.personnes.has(bBrut) ? bBrut : null;

  const a = aValide ? donnees.personnes.get(aValide)! : null;
  const b = bValide ? donnees.personnes.get(bValide)! : null;

  const personnes = [...donnees.personnes.values()];
  const parente =
    aValide && bValide ? calculerParente(donnees, aValide, bValide) : null;

  return (
    <>
      <BarreScroll />
      <RaccourciAccueil />
      <Navigation />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <p className="text-xs uppercase tracking-wider text-encre-tres-douce">
          Outil
        </p>
        <h1 className="mt-1 text-3xl">Calculer une parenté</h1>
        <p className="mt-2 text-encre-douce">
          Choisissez deux personnes de l’arbre : la remontée cherche leur ancêtre
          commun le plus proche, puis en déduit le lien qui les unit.
        </p>

        <div className="mt-6 flex flex-col gap-6">
          <SelecteurCouple
            personnes={personnes}
            aInitial={aValide}
            bInitial={bValide}
          />

          {a && b && parente && (
            <>
              <section
                aria-label="Personnes comparées"
                className="grid gap-3 sm:grid-cols-2"
              >
                <Vignette personne={portraitDePersonne(a)} />
                <Vignette personne={portraitDePersonne(b)} />
              </section>

              <Resultat parente={parente} memePersonne={aValide === bValide} />

              {parente.chemin.length > 1 && parente.ancetreCommun && (
                <section aria-labelledby="titre-chemin">
                  <h2 id="titre-chemin" className="text-lg">
                    Le chemin qui les relie
                  </h2>
                  <p className="mb-3 text-sm text-encre-douce">
                    Depuis {a.nomComplet}, en remontant jusqu’à l’ancêtre commun,
                    puis en redescendant vers {b.nomComplet}.
                  </p>
                  <FriseChemin
                    chemin={parente.chemin}
                    ancetreCommun={parente.ancetreCommun}
                    donnees={donnees}
                  />
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Bloc central : le lien, mis en gros
// ---------------------------------------------------------------------------

function Resultat({
  parente,
  memePersonne,
}: {
  parente: {
    lien: string;
    description: string;
    ancetreCommun: string | null;
    distanceA: number;
    distanceB: number;
  };
  memePersonne: boolean;
}) {
  if (memePersonne) {
    return (
      <section className="carte p-5 text-center sm:p-6">
        <p className="text-xs uppercase tracking-wider text-encre-tres-douce">
          Deux fois la même
        </p>
        <p className="mt-2 text-xl text-encre-douce">
          Ce sont deux fois la même personne.
        </p>
      </section>
    );
  }

  if (!parente.ancetreCommun) {
    return (
      <section className="carte p-5 text-center sm:p-6">
        <p className="text-xs uppercase tracking-wider text-encre-tres-douce">
          Aucun lien
        </p>
        <p className="mt-2 text-lg text-encre-douce">{parente.description}</p>
      </section>
    );
  }

  return (
    <section className="carte p-5 text-center sm:p-6">
      <p className="text-xs uppercase tracking-wider text-encre-tres-douce">
        Lien de parenté
      </p>
      <p className="font-titre mt-2 text-3xl leading-tight text-encre sm:text-4xl">
        {parente.lien}
      </p>
      <p className="mt-3 text-encre-douce">{parente.description}</p>
      <p className="mt-2 text-xs text-encre-tres-douce">
        {parente.distanceA + parente.distanceB} génération
        {parente.distanceA + parente.distanceB > 1 ? 's' : ''} entre les deux, par
        l’ancêtre commun le plus proche.
      </p>
    </section>
  );
}
