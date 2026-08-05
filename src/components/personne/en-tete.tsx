import { Branches, Etiquette, ListePreuves } from '@/components/personne/blocs';
import { LIBELLE_SEXE, accorder } from '@/components/personne/vocabulaire';
import type { Fiche } from '@/components/personne/donnees';

/** L'identité : le nom, ce qu'on l'appelait, et d'où elle vient dans l'arbre. */
export function EnTetePersonne({ fiche }: { fiche: Fiche }) {
  const { personne, naissance, deces } = fiche;

  const bornes = [
    naissance?.annee ? String(naissance.annee) : null,
    deces?.annee ? String(deces.annee) : null,
  ];
  const vie =
    bornes[0] && bornes[1]
      ? `${bornes[0]} – ${bornes[1]}`
      : bornes[0]
        ? `${accorder(personne.sexe, 'né')} en ${bornes[0]}`
        : bornes[1]
          ? `${accorder(personne.sexe, 'mort')} en ${bornes[1]}`
          : null;

  return (
    <header className="carte p-5 sm:p-6">
      <p className="text-xs uppercase tracking-wider text-encre-tres-douce">Fiche de famille</p>

      <h1 className="mt-1 text-3xl leading-tight sm:text-4xl">{fiche.nomComplet}</h1>

      {personne.surnom && (
        <p className="mt-1 text-encre-douce">
          {accorder(personne.sexe, 'dit')} « {personne.surnom} »
        </p>
      )}

      {personne.nom_naissance && personne.nom_naissance !== personne.nom && (
        <p className="mt-1 text-sm text-encre-douce">
          {accorder(personne.sexe, 'né')} {personne.nom_naissance}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {vie && <Etiquette>{vie}</Etiquette>}
        <Etiquette>{LIBELLE_SEXE[personne.sexe]}</Etiquette>
        <Branches branches={personne.branches ?? []} />
      </div>

      {(personne.niveaux_preuve ?? []).length > 0 && (
        <div className="mt-4 border-t border-bordure pt-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            Ce qui l’atteste
          </h2>
          <ListePreuves niveaux={personne.niveaux_preuve ?? []} />
        </div>
      )}
    </header>
  );
  // La mention « présumée vivante » a migré dans `<BandeauVivant>`, posé
  // pleine largeur au sommet de la page : rappel visible à l'arrivée sans
  // alourdir l'en-tête.
}
