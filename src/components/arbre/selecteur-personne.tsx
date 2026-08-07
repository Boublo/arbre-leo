'use client';

import { createPortal } from 'react-dom';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PersonneArbre } from '@/lib/arbre';
import type { PersonneRecherche } from '@/lib/arbre-graphe';
import { anneesDeVie, chercherPersonnes } from '@/lib/arbre-graphe';
import { useFermerMenuAncre, useMenuAncre } from '@/lib/menu-ancre';

/**
 * Choix de la personne depuis laquelle on regarde l'arbre.
 *
 * Les derniers-nés sont proposés d'emblée : c'est d'eux qu'on remonte le plus
 * souvent. Pour tous les autres, la recherche accepte un nom, un lieu ou une
 * année, sans se soucier des accents.
 *
 * Chaque résultat porte ses années de vie, jamais son nom seul : l'arbre
 * contient des homonymes exacts, et confondre deux personnes qui portent le
 * même nom est l'erreur la plus facile à commettre en généalogie.
 */
export function SelecteurPersonne({
  personnes,
  suggestions,
  choisie,
  onChoix,
}: {
  personnes: PersonneRecherche[];
  suggestions: PersonneRecherche[];
  choisie: PersonneArbre;
  onChoix: (id: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState('');
  const ancreRef = useRef<HTMLButtonElement>(null);
  const champRef = useRef<HTMLInputElement>(null);
  const listeId = useId();
  const { menuRef, position } = useMenuAncre(ouvert, ancreRef);

  const resultats = useMemo(
    () => (requete.trim().length >= 2 ? chercherPersonnes(personnes, requete) : suggestions),
    [personnes, requete, suggestions]
  );

  const enRecherche = requete.trim().length >= 2;

  function fermer() {
    setOuvert(false);
    setRequete('');
  }

  useFermerMenuAncre(ouvert, fermer, ancreRef, menuRef);

  useEffect(() => {
    if (!ouvert) return;

    function surTouche(evenement: KeyboardEvent) {
      if (evenement.key === 'Escape') fermer();
    }

    champRef.current?.focus();
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [ouvert]);

  const annees = anneesDeVie(choisie);

  const panneau = ouvert
    ? createPortal(
      <div
        ref={menuRef}
        style={{ top: position.top, left: position.left }}
        className="fixed z-[55] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--rayon)] border border-bordure bg-fond-carte shadow-[var(--ombre-forte)] sm:w-80"
      >
        <div className="border-b border-bordure p-2">
          <input
            ref={champRef}
            type="search"
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            placeholder="Un nom, un lieu, une année…"
            aria-label="Chercher une personne dans l’arbre"
            aria-controls={listeId}
            className="w-full rounded-[var(--rayon-petit)] bg-fond-doux px-3 py-2 text-sm text-encre outline-none placeholder:text-encre-tres-douce focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <p className="px-3 py-2 text-xs uppercase tracking-wider text-encre-tres-douce">
          {enRecherche
            ? `${resultats.length} résultat${resultats.length > 1 ? 's' : ''}`
            : 'Les derniers-nés de la famille'}
        </p>

        <ul id={listeId} role="listbox" className="max-h-80 overflow-y-auto pb-1">
          {resultats.length === 0 && (
            <li className="px-3 pb-3 text-sm text-encre-tres-douce">
              {enRecherche ? 'Aucune personne de ce nom dans l’arbre.' : 'Aucune naissance datée.'}
            </li>
          )}

          {resultats.map((p) => {
            const vie = anneesDeVie(p);
            return (
              <li key={p.id} role="option" aria-selected={p.id === choisie.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChoix(p.id);
                    fermer();
                  }}
                  className={`w-full px-3 py-2 text-left transition hover:bg-fond-doux ${
                    p.id === choisie.id ? 'bg-accent-clair' : ''
                  }`}
                >
                  <span className="block text-sm font-medium text-encre">{p.nomComplet}</span>
                  <span className="block text-xs text-encre-tres-douce">
                    {[vie, p.naissance?.lieuCourt].filter(Boolean).join(' · ') ||
                      'Dates inconnues'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>,
      document.body
    )
    : null;

  return (
    <div className="relative">
      <button
        ref={ancreRef}
        type="button"
        onClick={() => (ouvert ? fermer() : setOuvert(true))}
        aria-expanded={ouvert}
        aria-haspopup="listbox"
        className="flex max-w-full items-center gap-2 rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-left transition hover:border-bordure-forte"
      >
        <span className="truncate font-medium text-encre">{choisie.nomComplet}</span>
        {annees && <span className="shrink-0 text-xs text-encre-tres-douce">{annees}</span>}
        <span aria-hidden className="shrink-0 text-encre-tres-douce">▾</span>
      </button>

      {panneau}
    </div>
  );
}
