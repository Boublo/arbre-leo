import { FriseVie, type EvenementFrise } from '@/components/portrait/frise-vie';
import type { Portrait } from '@/components/portrait/types';
import type { EvenementFiche, Fiche } from '@/components/personne/donnees';
import { personneEstVivante } from '@/lib/vivant';

/**
 * La frise de vie, sortie au bon format depuis la fiche.
 *
 * `FriseVie` vit dans `components/portrait/` et attend son propre vocabulaire :
 * un `Portrait` léger d’un côté, des `EvenementFrise` de l’autre. La fiche, elle,
 * pense en `EvenementFiche` et en `Personne` complète. Cet adaptateur fait la
 * traduction, sans que la frise ait à connaître la structure de la fiche.
 *
 * Une frise vide se raconte quand même : si aucune date n’est documentée,
 * `FriseVie` s’en charge par un texte discret — on ne s’en occupe pas ici.
 */
export function FriseFiche({ fiche }: { fiche: Fiche }) {
  const { personne, naissance, deces } = fiche;

  const portrait: Portrait = {
    id: personne.id,
    nomComplet: fiche.nomComplet,
    surnom: personne.surnom,
    sexe: personne.sexe,
    branches: personne.branches ?? [],
    presumeVivant: personneEstVivante(personne.presume_vivant, { aEvenementFinDeVie: Boolean(deces) }),
    anneeNaissance: naissance?.annee ?? null,
    anneeDeces: deces?.annee ?? null,
    lieuNaissance: naissance?.lieuCourt ?? null,
  };

  const evenements: EvenementFrise[] = fiche.evenements.map(versEvenementFrise);

  return (
    <section
      aria-label={`Frise de vie de ${fiche.nomComplet}`}
      className="carte p-4 sm:p-5"
    >
      <FriseVie personne={portrait} evenements={evenements} />
    </section>
  );
}

/** Réduit un événement de fiche à ce dont la frise se sert. */
function versEvenementFrise(e: EvenementFiche): EvenementFrise {
  return {
    id: e.id,
    type: e.type,
    annee: e.annee,
    detail: e.detail ?? e.avec?.nomComplet ?? null,
    lieuCourt: e.lieuCourt,
  };
}
