import { useId, type ReactNode } from 'react';

/**
 * Chiffres-clés de la découverte.
 *
 * Un chiffre-clé résume d'un coup d'œil ce qu'un long paragraphe raconterait :
 * combien de personnes, combien de générations, combien de kilomètres entre les
 * deux branches. Le libellé qualifie ce qui est compté ; l'aide, discrète, dit
 * comment le chiffre a été obtenu — indispensable dans un projet où l'on
 * s'appuie sur des sources.
 *
 * Les chiffres ne sont jamais colorés selon leur valeur : la sobriété prime, et
 * la couleur ne doit jamais porter seule une information.
 */

export function ChiffreCle({
  libelle,
  valeur,
  aide,
}: {
  libelle: string;
  valeur: string | number;
  aide?: ReactNode;
}) {
  return (
    <article className="carte flex h-full flex-col justify-between gap-2 p-5">
      <p className="font-titre text-3xl leading-none text-encre sm:text-4xl">
        {valeur}
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-encre">{libelle}</p>
        {aide && <p className="text-xs leading-relaxed text-encre-tres-douce">{aide}</p>}
      </div>
    </article>
  );
}

export type EntreeChiffre = {
  /** Sert de clé React ; s'il n'est pas fourni, le libellé fait office de clé. */
  id?: string;
  libelle: string;
  valeur: string | number;
  aide?: ReactNode;
};

/**
 * Un ensemble de chiffres-clés, rangés en grille. Deux colonnes sur mobile
 * gardent la lecture confortable ; quatre sur grand écran évitent la sensation
 * de tableau vide.
 */
export function PalmaresChiffres({
  chiffres,
  titre,
  aide,
}: {
  chiffres: EntreeChiffre[];
  titre?: string;
  aide?: ReactNode;
}) {
  const titreId = useId();
  if (chiffres.length === 0) {
    return (
      <section className="carte p-5">
        {titre && <h2 className="text-lg">{titre}</h2>}
        <p className="mt-2 text-sm text-encre-tres-douce">
          Aucun chiffre à afficher pour l&apos;instant.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby={titre ? titreId : undefined}>
      {(titre || aide) && (
        <header className="mb-4">
          {titre && (
            <h2 id={titreId} className="text-lg">
              {titre}
            </h2>
          )}
          {aide && <p className="mt-1 text-sm text-encre-douce">{aide}</p>}
        </header>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {chiffres.map((c) => (
          <li key={c.id ?? c.libelle}>
            <ChiffreCle libelle={c.libelle} valeur={c.valeur} aide={c.aide} />
          </li>
        ))}
      </ul>
    </section>
  );
}
