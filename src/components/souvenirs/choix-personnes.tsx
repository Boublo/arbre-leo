'use client';

import { useId, useMemo, useState } from 'react';
import { sansAccent } from '@/lib/souvenirs-partage';

export type OptionPersonne = { id: string; nomComplet: string };

/**
 * Qui est là-dedans.
 *
 * Cent-neuf personnes tiennent dans une liste, mais pas dans une tête : un
 * champ de recherche filtre au fur et à mesure, et les cases à cocher restent
 * de vraies cases à cocher — c’est ce qui se navigue le mieux au clavier.
 */
export function ChoixPersonnes({
  personnes,
  valeurs = [],
}: {
  personnes: OptionPersonne[];
  valeurs?: string[];
}) {
  const [selection, setSelection] = useState<string[]>(valeurs);
  const [recherche, setRecherche] = useState('');
  const idRecherche = useId();

  const noms = useMemo(
    () => new Map(personnes.map((p) => [p.id, p.nomComplet])),
    [personnes]
  );

  const resultats = useMemo(() => {
    const requete = sansAccent(recherche.trim());
    if (!requete) return personnes;
    return personnes.filter((p) => sansAccent(p.nomComplet).includes(requete));
  }, [personnes, recherche]);

  function basculer(id: string) {
    setSelection((precedent) =>
      precedent.includes(id) ? precedent.filter((autre) => autre !== id) : [...precedent, id]
    );
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-[var(--rayon)] border border-bordure p-4">
      <legend className="px-1.5 text-sm font-medium text-encre">Qui y était ?</legend>

      {selection.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selection.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => basculer(id)}
                className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-clair px-3 py-1 text-sm text-encre transition hover:border-accent"
              >
                {noms.get(id) ?? 'Inconnu'}
                <span aria-hidden className="text-encre-douce">✕</span>
                <span className="sr-only">Retirer {noms.get(id) ?? 'cette personne'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={idRecherche} className="text-sm font-medium text-encre">
          Chercher un nom
        </label>
        <input
          id={idRecherche}
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Tapez les premières lettres"
          className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre
                     placeholder:text-encre-tres-douce
                     focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>

      <div
        role="group"
        aria-label="Personnes de l’arbre"
        className="max-h-64 overflow-y-auto rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux p-1"
      >
        {resultats.length === 0 ? (
          <p className="px-2 py-3 text-sm text-encre-douce">Aucun nom ne correspond.</p>
        ) : (
          <ul>
            {resultats.map((personne) => (
              <li key={personne.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-[var(--rayon-petit)] px-2 py-1.5 text-sm text-encre hover:bg-fond-carte">
                  <input
                    type="checkbox"
                    checked={selection.includes(personne.id)}
                    onChange={() => basculer(personne.id)}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  {personne.nomComplet}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-encre-douce">
        {selection.length === 0
          ? 'Personne n’est encore mentionné.'
          : `${selection.length} personne${selection.length > 1 ? 's' : ''} mentionnée${selection.length > 1 ? 's' : ''}.`}
      </p>

      {selection.map((id) => (
        <input key={id} type="hidden" name="personnes" value={id} />
      ))}
    </fieldset>
  );
}
