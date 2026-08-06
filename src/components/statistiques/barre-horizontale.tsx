import { useId } from 'react';

/**
 * Barre horizontale — un rang à côté d'un chiffre.
 *
 * Rien de nominatif ici : le composant ne connaît que des libellés et des
 * valeurs. La largeur de la barre est proportionnelle à la valeur, rapportée
 * à un maximum qu'on peut fournir explicitement (utile pour comparer deux
 * listes entre elles) ou déduire des entrées. Les libellés sont en HTML pour
 * pouvoir se tronquer proprement ; seule la barre est en SVG maison.
 */

export type EntreeBarre = {
  /** Ce qu'on mesure. Sert de clé par défaut. */
  libelle: string;
  /** La mesure elle-même, dans l'unité qu'on veut. */
  valeur: number;
  /**
   * Complément affiché à droite du libellé, pour préciser l'entrée sans
   * grossir la valeur. Facultatif.
   */
  detail?: string | null;
  /** Clé React explicite quand plusieurs entrées peuvent partager un libellé. */
  cle?: string;
};

export function BarreHorizontale({
  entrees,
  max,
  unite = '',
  titre,
  vide = 'Aucune donnée à afficher.',
}: {
  entrees: EntreeBarre[];
  /** Maximum de référence pour la barre. À défaut, la plus grande valeur. */
  max?: number;
  /** Suffixe collé à la valeur : « ans », « personnes »… */
  unite?: string;
  /** Titre affiché au-dessus, facultatif. */
  titre?: string;
  /** Message quand la liste est vide. */
  vide?: string;
}) {
  const titreId = useId();
  if (entrees.length === 0) {
    return (
      <section className="carte p-4">
        {titre && <h3 className="text-base">{titre}</h3>}
        <p className="mt-2 text-sm text-encre-tres-douce">{vide}</p>
      </section>
    );
  }

  const vraiMax = Math.max(1, max ?? Math.max(...entrees.map((e) => e.valeur)));

  return (
    <section
      className="carte p-4 sm:p-5"
      aria-labelledby={titre ? titreId : undefined}
    >
      {titre && (
        <h3 id={titreId} className="mb-3 text-base">
          {titre}
        </h3>
      )}
      <ul className="flex flex-col gap-2">
        {entrees.map((entree) => {
          const pourcentage = vraiMax === 0 ? 0 : (entree.valeur / vraiMax) * 100;
          const suffixe = unite ? ` ${unite}` : '';
          return (
            <li
              key={entree.cle ?? entree.libelle}
              className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3"
            >
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate text-sm text-encre">{entree.libelle}</span>
                {entree.detail && (
                  <span className="truncate text-xs text-encre-tres-douce">
                    {entree.detail}
                  </span>
                )}
              </span>

              <svg
                viewBox="0 0 100 8"
                preserveAspectRatio="none"
                aria-hidden
                className="h-2.5 w-full"
              >
                <rect
                  x={0}
                  y={0}
                  width={100}
                  height={8}
                  rx={2}
                  fill="var(--fond-doux)"
                />
                {entree.valeur > 0 && (
                  <rect
                    x={0}
                    y={0}
                    width={pourcentage}
                    height={8}
                    rx={2}
                    fill="var(--accent)"
                  />
                )}
              </svg>

              <span className="w-16 shrink-0 text-right text-sm tabular-nums text-encre-douce">
                {entree.valeur}
                {suffixe}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
