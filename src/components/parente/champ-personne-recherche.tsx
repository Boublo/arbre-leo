'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PersonneArbre } from '@/lib/arbre';
import { anneesDeVie, chercherPersonnes } from '@/lib/arbre-graphe';

/**
 * Champ de recherche pour choisir une personne dans un formulaire GET
 * (utilisé sur la page Parenté à la place des longues listes déroulantes).
 */
export function ChampPersonneRecherche({
  nom,
  label,
  personnes,
  valeurInitiale,
}: {
  nom: string;
  label: string;
  personnes: PersonneArbre[];
  valeurInitiale: string | null;
}) {
  const idChamp = `parente-${nom}`;
  const listeId = useId();
  const conteneurRef = useRef<HTMLDivElement>(null);

  const initiale = useMemo(
    () => personnes.find((p) => p.id === valeurInitiale) ?? null,
    [personnes, valeurInitiale]
  );

  const [selectionId, setSelectionId] = useState(valeurInitiale ?? '');
  const [requete, setRequete] = useState(initiale?.nomComplet ?? '');
  const [ouvert, setOuvert] = useState(false);

  const resultats = useMemo(
    () => (requete.trim().length >= 2 ? chercherPersonnes(personnes, requete) : []),
    [personnes, requete]
  );

  function choisir(p: PersonneArbre) {
    setSelectionId(p.id);
    setRequete(p.nomComplet);
    setOuvert(false);
  }

  useEffect(() => {
    if (!ouvert) return;
    function fermer(e: MouseEvent) {
      if (!conteneurRef.current?.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [ouvert]);

  return (
    <div ref={conteneurRef} className="relative min-w-56 flex-1">
      <label htmlFor={idChamp} className="mb-1.5 block text-sm font-medium text-encre">
        {label}
      </label>
      <input type="hidden" name={nom} value={selectionId} />
      <input
        id={idChamp}
        type="search"
        value={requete}
        onChange={(e) => {
          setRequete(e.target.value);
          setSelectionId('');
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        placeholder="Un nom, un lieu, une année…"
        autoComplete="off"
        aria-controls={listeId}
        aria-expanded={ouvert && resultats.length > 0}
        className="w-full rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      />

      {ouvert && requete.trim().length >= 2 && (
        <ul
          id={listeId}
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-[var(--rayon)] border border-bordure bg-fond-carte py-1 shadow-[var(--ombre-forte)]"
        >
          {resultats.length === 0 ? (
            <li className="px-3 py-2 text-sm text-encre-tres-douce">
              Aucune personne de ce nom dans l’arbre.
            </li>
          ) : (
            resultats.slice(0, 12).map((p) => {
              const vie = anneesDeVie(p);
              return (
                <li key={p.id} role="option" aria-selected={p.id === selectionId}>
                  <button
                    type="button"
                    onClick={() => choisir(p)}
                    className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-fond-doux"
                  >
                    <span className="font-medium text-encre">{p.nomComplet}</span>
                    {vie && <span className="text-xs text-encre-tres-douce">{vie}</span>}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
