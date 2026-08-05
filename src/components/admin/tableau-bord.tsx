import { formaterNombre } from '@/components/admin/vocabulaire';

/**
 * Ce que pèse l'arbre aujourd'hui : le premier coup d'œil de l'administrateur.
 * Les chiffres viennent de la base à chaque affichage, jamais d'une constante.
 */
export function TableauBord({
  personnes,
  souvenirs,
  photos,
  enAttente,
}: {
  personnes: number | null;
  souvenirs: number | null;
  photos: number | null;
  enAttente: number;
}) {
  return (
    <section aria-labelledby="titre-tableau-bord">
      <h2 id="titre-tableau-bord" className="sr-only">
        L’arbre en chiffres
      </h2>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Chiffre valeur={personnes} libelle="personnes dans l’arbre" />
        <Chiffre valeur={souvenirs} libelle="souvenirs déposés" />
        <Chiffre valeur={photos} libelle="photos versées" />
        <Chiffre
          valeur={enAttente}
          libelle={enAttente > 1 ? 'demandes en attente' : 'demande en attente'}
          souligne={enAttente > 0}
        />
      </dl>
    </section>
  );
}

function Chiffre({
  valeur,
  libelle,
  souligne = false,
}: {
  valeur: number | null;
  libelle: string;
  souligne?: boolean;
}) {
  return (
    <div className="carte px-5 py-4">
      <dt className="text-sm text-encre-douce">{libelle}</dt>
      <dd
        className="mt-1 text-3xl tabular-nums"
        style={{ fontFamily: 'var(--font-titre)', color: souligne ? 'var(--alerte)' : undefined }}
      >
        {formaterNombre(valeur)}
      </dd>
    </div>
  );
}
