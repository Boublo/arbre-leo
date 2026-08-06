import type { ReactNode } from 'react';

/**
 * Carte de statistique : une grande valeur, un libellé, une note discrète.
 *
 * Employée en grille sur la page des statistiques pour poser d'un coup d'œil
 * les grands ordres de grandeur — nombre de personnes, âge moyen, pays
 * traversés. La valeur n'est jamais colorée selon ce qu'elle vaut : la
 * sobriété prime, la couleur n'a pas à porter seule une information.
 */
export function CarteStat({
  valeur,
  libelle,
  aide,
}: {
  valeur: string | number;
  libelle: string;
  aide?: ReactNode;
}) {
  return (
    <article className="carte flex h-full flex-col justify-between gap-2 p-4 sm:p-5">
      <p className="font-titre text-3xl leading-none text-encre sm:text-4xl">
        {valeur}
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-encre">{libelle}</p>
        {aide && (
          <p className="text-xs leading-relaxed text-encre-tres-douce">{aide}</p>
        )}
      </div>
    </article>
  );
}
