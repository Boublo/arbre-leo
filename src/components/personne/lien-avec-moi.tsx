import type { ResultatParente } from '@/lib/parente';

/**
 * Le lien de la fiche avec le membre qui la consulte.
 *
 * Le calcul reste côté serveur et vient du graphe réellement visible par le
 * membre. Le composant ne reçoit qu’un résultat déjà établi : il ne connaît ni
 * la session, ni des identifiants de personnes, ni la base de données.
 */
export function LienAvecMoi({ resultat }: { resultat: ResultatParente }) {
  const estMoi = resultat.lien === 'la même personne';

  return (
    <section aria-labelledby="titre-lien-avec-moi" className="carte p-4 sm:p-5">
      <p id="titre-lien-avec-moi" className="text-xs uppercase tracking-wider text-encre-tres-douce">
        Votre lien avec cette personne
      </p>
      <p className="mt-1 font-titre text-2xl leading-tight text-encre sm:text-3xl">
        {estMoi ? 'Cette fiche est la vôtre.' : `Votre ${resultat.lien}`}
      </p>
      {!estMoi && (
        <p className="mt-2 text-sm text-encre-douce">
          Ce lien est calculé à partir des filiations connues dans l’arbre.
        </p>
      )}
    </section>
  );
}
