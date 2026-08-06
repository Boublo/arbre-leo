'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SelecteurPersonne } from '@/components/arbre/selecteur-personne';
import { LIBELLE_MODE, type ModeArbre } from '@/lib/layout-arbre';
import type { PersonneRecherche } from '@/lib/arbre-graphe';
import type { PersonneArbre } from '@/lib/arbre';

const MODES: ModeArbre[] = ['ascendance', 'famille', 'descendance', 'eclate'];

/**
 * Barre d'outils repliée sur mobile : le plus d'espace possible pour l'arbre.
 */
export function BarreOutilsArbre({
  focus,
  focusId,
  mode,
  onMode,
  suggestions,
  recherchePersonnes,
  onFocus,
  onChercher,
  onOuvrirGuide,
}: {
  focus: PersonneArbre;
  focusId: string;
  mode: ModeArbre;
  onMode: (mode: ModeArbre) => void;
  suggestions: PersonneRecherche[];
  recherchePersonnes: PersonneRecherche[];
  onFocus: (id: string) => void;
  onChercher: () => void;
  onOuvrirGuide: () => void;
}) {
  const [deployee, setDeployee] = useState(false);

  return (
    <>
      {/* Mobile : deux lignes compactes */}
      <div className="z-10 flex flex-col gap-2 border-b border-bordure bg-fond-carte px-3 py-2 lg:hidden">
        <div className="flex min-w-0 items-center gap-2" data-guide="partir-de">
          <div className="min-w-0 flex-1">
            <SelecteurPersonne
              personnes={recherchePersonnes}
              suggestions={suggestions}
              choisie={focus}
              onChoix={onFocus}
            />
          </div>
          <button
            type="button"
            onClick={onChercher}
            data-guide="chercher"
            aria-label="Chercher une personne"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte text-encre-douce"
          >
            🔍
          </button>
          <button
            type="button"
            onClick={() => setDeployee((v) => !v)}
            aria-expanded={deployee}
            aria-label={deployee ? 'Replier les options' : 'Déplier les options'}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte text-encre-douce"
          >
            {deployee ? '▴' : '▾'}
          </button>
          <button
            type="button"
            onClick={onOuvrirGuide}
            data-guide="guide-aide"
            aria-label="Ouvrir le guide de l’arbre"
            title="Guide de l’arbre"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte text-sm text-encre-douce"
          >
            ?
          </button>
        </div>

        <label className="flex min-w-0 items-center gap-2 text-sm" data-guide="modes">
          <span className="shrink-0 text-encre-tres-douce">Vue</span>
          <select
            value={mode}
            onChange={(e) => onMode(e.target.value as ModeArbre)}
            className="min-w-0 flex-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre outline-none focus:ring-2 focus:ring-accent/25"
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {LIBELLE_MODE[m].titre}
              </option>
            ))}
          </select>
        </label>

        {deployee && (
          <div className="flex flex-wrap gap-3 border-t border-bordure pt-2 text-xs">
            <Link href={`/chronologie?personne=${encodeURIComponent(focusId)}`} className="lien-discret">
              Sa chronologie
            </Link>
            <Link href={`/personne/${focusId}`} className="lien-discret">
              Sa fiche
            </Link>
            <Link
              href={`/arbre/imprimer?personne=${encodeURIComponent(focusId)}&mode=${mode}&profondeur=5&photos=1&format=paysage`}
              className="lien-discret"
            >
              Version imprimable
            </Link>
          </div>
        )}
      </div>

      {/* Grand écran : barre complète */}
      <div className="z-10 hidden flex-wrap items-center gap-x-5 gap-y-3 border-b border-bordure bg-fond-carte px-4 py-3 lg:flex">
        <div className="flex min-w-0 items-center gap-2" data-guide="partir-de">
          <span className="shrink-0 text-sm text-encre-tres-douce">Partir de</span>
          <SelecteurPersonne
            personnes={recherchePersonnes}
            suggestions={suggestions}
            choisie={focus}
            onChoix={onFocus}
          />
        </div>

        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Sens de lecture" data-guide="modes">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              title={LIBELLE_MODE[m].aide}
              onClick={() => onMode(m)}
              className={`rounded-[var(--rayon-petit)] px-3 py-1.5 text-sm transition ${
                mode === m
                  ? 'bg-accent text-accent-contraste'
                  : 'text-encre-douce hover:bg-fond-doux hover:text-encre'
              }`}
            >
              {LIBELLE_MODE[m].titre}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={onChercher}
            data-guide="chercher"
            className="rounded-[var(--rayon-petit)] border border-bordure px-2.5 py-1.5 text-encre-douce transition hover:bg-fond-doux hover:text-encre"
            title="Chercher une personne (F)"
          >
            Chercher <kbd className="ml-1 rounded border border-bordure bg-fond-doux px-1 text-[10px]">F</kbd>
          </button>
          <button
            type="button"
            onClick={onOuvrirGuide}
            data-guide="guide-aide"
            aria-label="Ouvrir le guide de l’arbre"
            title="Guide de l’arbre"
            className="grid h-8 w-8 place-items-center rounded-full border border-bordure text-sm text-encre-douce transition hover:bg-fond-doux hover:text-encre"
          >
            ?
          </button>
          <Link href={`/chronologie?personne=${encodeURIComponent(focusId)}`} className="lien-discret">
            Sa chronologie
          </Link>
          <Link href={`/personne/${focusId}`} className="lien-discret">
            Sa fiche
          </Link>
          <Link
            href={`/arbre/imprimer?personne=${encodeURIComponent(focusId)}&mode=${mode}&profondeur=5&photos=1&format=paysage`}
            className="lien-discret"
          >
            Imprimer
          </Link>
        </div>
      </div>
    </>
  );
}
