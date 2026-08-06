'use client';

import { useId, useMemo, useState } from 'react';
import { Vignette } from '@/components/portrait/vignette';
import { sansAccent } from '@/lib/souvenirs-partage';
import type { PersonneCitee } from '@/lib/recits';

/**
 * Choix des personnes citées par le récit — jumelle du sélecteur des souvenirs.
 *
 * Un champ de recherche filtre les noms, chaque ligne se déploie en Vignette
 * dès qu'on la survole. Les personnes sélectionnées sont affichées elles-mêmes
 * en Vignette pour qu'on ne confonde jamais deux homonymes.
 */
export function ChoixPersonnesRecit({
  personnes,
  valeurs = [],
}: {
  personnes: PersonneCitee[];
  valeurs?: string[];
}) {
  const [selection, setSelection] = useState<string[]>(valeurs);
  const [recherche, setRecherche] = useState('');
  const [survolee, setSurvolee] = useState<string | null>(null);
  const idRecherche = useId();

  const parId = useMemo(
    () => new Map(personnes.map((p) => [p.id, p])),
    [personnes]
  );

  const resultats = useMemo(() => {
    const requete = sansAccent(recherche.trim());
    if (!requete) return personnes;
    return personnes.filter((p) => sansAccent(p.nomComplet).includes(requete));
  }, [personnes, recherche]);

  const apercu = useMemo(() => {
    if (survolee && parId.has(survolee)) return parId.get(survolee)!;
    const dernier = selection[selection.length - 1];
    return dernier ? parId.get(dernier) ?? null : null;
  }, [survolee, selection, parId]);

  function basculer(id: string) {
    setSelection((precedent) =>
      precedent.includes(id) ? precedent.filter((autre) => autre !== id) : [...precedent, id]
    );
  }

  const selectionnees = selection
    .map((id) => parId.get(id))
    .filter((p): p is PersonneCitee => p !== undefined);

  return (
    <fieldset className="flex flex-col gap-3 rounded-[var(--rayon)] border border-bordure p-4">
      <legend className="px-1.5 text-sm font-medium text-encre">Qui est cité ?</legend>

      {selectionnees.length > 0 && (
        <ul className="flex flex-col gap-2">
          {selectionnees.map((personne) => (
            <li key={personne.id} className="flex items-stretch gap-2">
              <div className="min-w-0 flex-1">
                <Vignette personne={personne} />
              </div>
              <button
                type="button"
                onClick={() => basculer(personne.id)}
                aria-label={`Retirer ${personne.nomComplet}`}
                className="shrink-0 rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 text-sm text-encre-douce transition hover:border-erreur/50 hover:text-erreur"
              >
                Retirer
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

      <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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
                  <label
                    className="flex cursor-pointer items-center gap-2.5 rounded-[var(--rayon-petit)] px-2 py-1.5 text-sm text-encre hover:bg-fond-carte"
                    onMouseEnter={() => setSurvolee(personne.id)}
                    onFocus={() => setSurvolee(personne.id)}
                    onMouseLeave={() => setSurvolee(null)}
                    onBlur={() => setSurvolee(null)}
                  >
                    <input
                      type="checkbox"
                      checked={selection.includes(personne.id)}
                      onChange={() => basculer(personne.id)}
                      className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1 truncate">{personne.nomComplet}</span>
                    <span className="shrink-0 text-xs text-encre-tres-douce">
                      {anneesCourtes(personne)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-h-16">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            {survolee ? 'Aperçu' : selectionnees.length > 0 ? 'Dernière mention' : 'Aperçu'}
          </p>
          {apercu ? (
            <Vignette personne={apercu} />
          ) : (
            <p className="rounded-[var(--rayon-petit)] border border-dashed border-bordure bg-fond-doux px-3 py-4 text-xs text-encre-tres-douce">
              Survolez un nom pour voir ses années et son côté de l’arbre.
            </p>
          )}
        </div>
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

/** « 1886–1961 », « 1886– », « –1961 », ou rien : format compact des listes. */
function anneesCourtes(p: PersonneCitee): string {
  const n = p.anneeNaissance;
  const d = p.anneeDeces;
  if (n && d) return `${n}–${d}`;
  if (n) return `${n}–`;
  if (d) return `–${d}`;
  return '';
}
