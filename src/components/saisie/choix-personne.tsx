'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { sansAccent } from '@/lib/souvenirs-partage';
import type { OptionPersonne } from '@/components/saisie/donnees';

/**
 * Désigner quelqu’un de l’arbre sans se tromper de personne.
 *
 * La base contient plusieurs homonymes exacts — deux hommes portent le même
 * prénom et le même nom, à soixante ans d’écart. Un nom seul ne désigne donc
 * personne : chaque proposition porte ses années de vie et, quand on la
 * connaît, sa commune de naissance. C’est la règle de ce module, et elle ne
 * souffre pas d’exception.
 *
 * La liste entière tient dans le navigateur : la recherche est immédiate, sans
 * aller-retour, et se navigue au clavier de bout en bout.
 */

const LIMITE_AFFICHEE = 40;

function filtrer(personnes: OptionPersonne[], recherche: string, exclus: string[]) {
  const requete = sansAccent(recherche.trim());
  const retenues = personnes.filter((p) => !exclus.includes(p.id));
  if (!requete) return retenues;
  return retenues.filter(
    (p) => sansAccent(p.nomComplet).includes(requete) || sansAccent(p.repere).includes(requete)
  );
}

// ---------------------------------------------------------------------------
// Une seule personne
// ---------------------------------------------------------------------------

export function ChoixPersonne({
  nom,
  label,
  aide,
  personnes,
  valeur = '',
  exclus = [],
  onChoix,
}: {
  nom: string;
  label: string;
  aide?: string;
  personnes: OptionPersonne[];
  valeur?: string;
  /** Identifiants à ne pas proposer : soi-même, l’autre parent déjà choisi. */
  exclus?: string[];
  onChoix?: (id: string) => void;
}) {
  const [selection, setSelection] = useState(valeur);
  const [recherche, setRecherche] = useState('');
  const idRecherche = useId();
  const idListe = useId();
  const champCache = useRef<HTMLInputElement>(null);

  const choisie = useMemo(
    () => personnes.find((p) => p.id === selection) ?? null,
    [personnes, selection]
  );

  const resultats = useMemo(() => {
    const filtres = filtrer(personnes, recherche, exclus);
    if (choisie && !filtres.some((p) => p.id === choisie.id)) {
      return [choisie, ...filtres];
    }
    return filtres;
  }, [personnes, recherche, exclus, choisie]);

  function synchroniserChampCache(valeurSelection: string) {
    if (champCache.current) champCache.current.value = valeurSelection;
  }

  useEffect(() => {
    synchroniserChampCache(selection);
  }, [selection]);

  function choisir(id: string) {
    const suivante = id === selection ? '' : id;
    setSelection(suivante);
    synchroniserChampCache(suivante);
    onChoix?.(suivante);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Champ non contrôlé : les Server Actions lisent le DOM natif, pas l’état React. */}
      <input ref={champCache} type="hidden" name={nom} defaultValue={valeur} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={idRecherche} className="text-sm font-medium text-encre">
          {label}
        </label>
        {aide && <p className="text-xs text-encre-douce">{aide}</p>}

        {choisie ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[var(--rayon-petit)] border border-accent/40 bg-accent-clair px-3 py-2">
            <span className="text-sm text-encre">
              {choisie.nomComplet}
              <span className="text-encre-douce"> — {choisie.repere}</span>
            </span>
            <button
              type="button"
              onClick={() => choisir(choisie.id)}
              className="ml-auto rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-2.5 py-1 text-xs text-encre-douce transition hover:border-bordure-forte hover:text-encre"
            >
              Retirer ce choix
            </button>
          </div>
        ) : null}

        <input
          id={idRecherche}
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Tapez les premières lettres du nom"
          aria-describedby={idListe}
          className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre
                     placeholder:text-encre-tres-douce
                     focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>

      <ListeChoix
        id={idListe}
        libelle={label}
        resultats={resultats}
        rendu={(personne) => (
          <LigneChoix
            key={personne.id}
            type="radio"
            nom={nom}
            personne={personne}
            coche={selection === personne.id}
            onBascule={() => choisir(personne.id)}
          />
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plusieurs personnes
// ---------------------------------------------------------------------------

export function ChoixPersonnesMultiple({
  nom,
  label,
  aide,
  personnes,
  valeurs = [],
  exclus = [],
  onChoix,
}: {
  nom: string;
  label: string;
  aide?: string;
  personnes: OptionPersonne[];
  valeurs?: string[];
  exclus?: string[];
  onChoix?: (ids: string[]) => void;
}) {
  const [selection, setSelection] = useState<string[]>(valeurs);
  const [recherche, setRecherche] = useState('');
  const idRecherche = useId();
  const idListe = useId();
  const champsCaches = useRef<HTMLDivElement>(null);

  const parId = useMemo(() => new Map(personnes.map((p) => [p.id, p])), [personnes]);
  const resultats = useMemo(() => {
    const filtres = filtrer(personnes, recherche, exclus);
    const manquants = selection
      .map((id) => parId.get(id))
      .filter((p): p is OptionPersonne => Boolean(p))
      .filter((p) => !filtres.some((f) => f.id === p.id));
    return [...manquants, ...filtres];
  }, [personnes, recherche, exclus, selection, parId]);

  function synchroniserChampsCaches(ids: string[]) {
    const conteneur = champsCaches.current;
    if (!conteneur) return;
    conteneur.replaceChildren(
      ...ids.map((id) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = nom;
        input.value = id;
        return input;
      })
    );
  }

  useEffect(() => {
    synchroniserChampsCaches(selection);
  }, [selection, nom]);

  function basculer(id: string) {
    setSelection((precedent) => {
      const suivante = precedent.includes(id)
        ? precedent.filter((autre) => autre !== id)
        : [...precedent, id];
      synchroniserChampsCaches(suivante);
      onChoix?.(suivante);
      return suivante;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Champs non contrôlés : les Server Actions lisent le DOM natif. */}
      <div ref={champsCaches} aria-hidden className="sr-only" />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={idRecherche} className="text-sm font-medium text-encre">
          {label}
        </label>
        {aide && <p className="text-xs text-encre-douce">{aide}</p>}

        {selection.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {selection.map((id) => {
              const personne = parId.get(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => basculer(id)}
                    className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-clair px-3 py-1 text-sm text-encre transition hover:border-accent"
                  >
                    {personne?.nomComplet ?? 'Personne retirée de l’arbre'}
                    <span className="text-xs text-encre-douce">{personne?.repere}</span>
                    <span aria-hidden className="text-encre-douce">✕</span>
                    <span className="sr-only">Retirer {personne?.nomComplet ?? 'cette personne'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <input
          id={idRecherche}
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Tapez les premières lettres du nom"
          aria-describedby={idListe}
          className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre
                     placeholder:text-encre-tres-douce
                     focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>

      <ListeChoix
        id={idListe}
        libelle={label}
        resultats={resultats}
        rendu={(personne) => (
          <LigneChoix
            key={personne.id}
            type="checkbox"
            groupe={`choix-${nom}`}
            personne={personne}
            coche={selection.includes(personne.id)}
            onBascule={() => basculer(personne.id)}
          />
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Briques communes
// ---------------------------------------------------------------------------

function ListeChoix({
  id,
  libelle,
  resultats,
  rendu,
}: {
  id: string;
  libelle: string;
  resultats: OptionPersonne[];
  rendu: (personne: OptionPersonne) => React.ReactNode;
}) {
  const montrees = resultats.slice(0, LIMITE_AFFICHEE);
  const reste = resultats.length - montrees.length;

  return (
    <div
      id={id}
      role="group"
      aria-label={libelle}
      className="max-h-64 overflow-y-auto rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux p-1"
    >
      {montrees.length === 0 ? (
        <p className="px-2 py-3 text-sm text-encre-douce">
          Aucun nom ne correspond. Cette personne n’est peut-être pas encore dans l’arbre.
        </p>
      ) : (
        <>
          <ul>{montrees.map(rendu)}</ul>
          {reste > 0 && (
            <p className="px-2 py-2 text-xs text-encre-tres-douce">
              {reste} autre{reste > 1 ? 's' : ''} nom{reste > 1 ? 's' : ''} correspond
              {reste > 1 ? 'ent' : ''} : précisez votre recherche.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Une proposition : le nom, et toujours de quoi le distinguer d’un homonyme. */
function LigneChoix({
  type,
  nom,
  groupe,
  personne,
  coche,
  onBascule,
}: {
  type: 'radio' | 'checkbox';
  /** Nom du champ formulaire (choix unique). */
  nom?: string;
  /** Groupe visuel pour les cases à cocher multiples. */
  groupe?: string;
  personne: OptionPersonne;
  coche: boolean;
  onBascule: () => void;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-baseline gap-2.5 rounded-[var(--rayon-petit)] px-2 py-1.5 text-sm text-encre hover:bg-fond-carte">
        <input
          type={type}
          name={type === 'radio' ? nom : undefined}
          value={personne.id}
          checked={coche}
          onChange={onBascule}
          className="h-4 w-4 shrink-0 self-center accent-[var(--accent)]"
        />
        <span>
          {personne.nomComplet}
          <span className="text-xs text-encre-douce"> — {personne.repere}</span>
        </span>
      </label>
    </li>
  );
}
