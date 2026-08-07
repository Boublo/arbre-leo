'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import { anneesDeVie, chercherPersonnes, type PersonneRecherche } from '@/lib/arbre-graphe';

/** Recherche locale dans l'index déjà filtré côté serveur par les politiques RLS. */
export function RecherchePersonnes({ personnes }: { personnes: PersonneRecherche[] }) {
  const [requete, setRequete] = useState('');
  const idChamp = useId();
  const idResultats = useId();
  const resultat = useMemo(
    () => (requete.trim().length >= 2 ? chercherPersonnes(personnes, requete, 30) : []),
    [personnes, requete]
  );
  const enRecherche = requete.trim().length >= 2;

  return (
    <section className="carte p-4 sm:p-6" aria-labelledby="recherche-personnes-titre">
      <label id="recherche-personnes-titre" htmlFor={idChamp} className="text-lg text-encre">
        Une personne de la famille
      </label>
      <p className="mt-1 text-sm text-encre-douce">
        Nom, prénom, surnom, lieu de naissance ou année. Les résultats respectent vos accès.
      </p>
      <input
        id={idChamp}
        type="search"
        value={requete}
        onChange={(event) => setRequete(event.target.value)}
        placeholder="Par exemple : Chéreau, Oran, 1914…"
        autoComplete="off"
        aria-controls={idResultats}
        className="mt-4 w-full rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-3 text-encre placeholder:text-encre-tres-douce focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      />

      <div id={idResultats} className="mt-4" aria-live="polite">
        {!enRecherche ? (
          <p className="text-sm text-encre-tres-douce">Saisissez au moins deux caractères.</p>
        ) : resultat.length === 0 ? (
          <p className="text-sm text-encre-douce">Aucune personne visible ne correspond à cette recherche.</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-encre-douce">
              {resultat.length} résultat{resultat.length > 1 ? 's' : ''}
            </p>
            <ul className="divide-y divide-bordure rounded-[var(--rayon-petit)] border border-bordure">
              {resultat.map((personne) => {
                const annees = anneesDeVie(personne);
                const lieu = personne.naissance?.lieuCourt ?? personne.naissance?.lieu;
                return (
                  <li key={personne.id}>
                    <Link
                      href={`/personne/${personne.id}`}
                      className="flex items-center justify-between gap-4 px-3 py-3 transition hover:bg-fond-doux focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-encre">{personne.nomComplet}</span>
                        {(annees || lieu) && (
                          <span className="mt-0.5 block truncate text-sm text-encre-tres-douce">
                            {[annees, lieu].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                      <span aria-hidden className="text-accent">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
