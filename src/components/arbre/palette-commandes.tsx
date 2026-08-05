'use client';

/**
 * Palette de recherche appelée par la touche F.
 *
 * Elle sert d'aiguilleur : on tape un début de nom, on choisit dans la liste,
 * la vue saute sur la personne. Rien d'autre. Le champ tient la main, Échap
 * ferme, Entrée valide, les flèches parcourent — la palette doit se piloter
 * sans jamais lâcher le clavier.
 *
 * L'ouverture est portée par le parent, qui remonte le composant à chaque
 * apparition : c'est ce qui remet le champ à vide sans effet de synchronisation.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PersonneArbre } from '@/lib/arbre';
import { anneesDeVie, chercherPersonnes } from '@/lib/arbre-graphe';

export function PaletteCommandes({
  personnes,
  ouverte,
  onFermer,
  onChoix,
}: {
  personnes: PersonneArbre[];
  ouverte: boolean;
  onFermer: () => void;
  onChoix: (id: string) => void;
}) {
  // Le contenu n'est monté que lorsqu'on ouvre : à la fermeture React
  // démonte tout, l'ouverture suivante repart d'un état vierge.
  if (!ouverte) return null;
  return <ContenuPalette personnes={personnes} onFermer={onFermer} onChoix={onChoix} />;
}

function ContenuPalette({
  personnes,
  onFermer,
  onChoix,
}: {
  personnes: PersonneArbre[];
  onFermer: () => void;
  onChoix: (id: string) => void;
}) {
  const [requete, setRequete] = useState('');
  const [surligne, setSurligne] = useState(0);
  const [derniereRequete, setDerniereRequete] = useState('');
  const champRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLUListElement>(null);

  const resultats = useMemo(() => {
    if (requete.trim().length < 2) {
      // À l'ouverture, on propose les personnes les plus récentes : elles sont
      // les points d'entrée les plus fréquents.
      return [...personnes]
        .filter((p) => p.naissance?.annee)
        .sort((a, b) => (b.naissance?.annee ?? 0) - (a.naissance?.annee ?? 0))
        .slice(0, 12);
    }
    return chercherPersonnes(personnes, requete, 30);
  }, [personnes, requete]);

  // Remise à zéro du curseur quand la requête change — géré pendant le rendu
  // pour éviter le va-et-vient d'un effet de synchronisation.
  if (derniereRequete !== requete) {
    setDerniereRequete(requete);
    setSurligne(0);
  }

  // Prise de focus initiale : un effet ici est légitime — c'est une
  // synchronisation avec le système extérieur qu'est le focus du DOM. On
  // mémorise aussi le déclencheur pour lui rendre le focus à la fermeture,
  // sans quoi la tabulation reprend depuis le <body>.
  useEffect(() => {
    const declencheur =
      typeof document !== 'undefined'
        ? (document.activeElement as HTMLElement | null)
        : null;
    const id = window.setTimeout(() => champRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      declencheur?.focus?.();
    };
  }, []);

  // Faire suivre le défilement quand on parcourt aux flèches.
  useEffect(() => {
    const liste = listeRef.current;
    if (!liste) return;
    const item = liste.children[surligne] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [surligne]);

  function surTouche(evenement: React.KeyboardEvent<HTMLDivElement>) {
    if (evenement.key === 'Escape') {
      evenement.preventDefault();
      onFermer();
    } else if (evenement.key === 'ArrowDown') {
      evenement.preventDefault();
      setSurligne((n) => Math.min(n + 1, Math.max(resultats.length - 1, 0)));
    } else if (evenement.key === 'ArrowUp') {
      evenement.preventDefault();
      setSurligne((n) => Math.max(n - 1, 0));
    } else if (evenement.key === 'Enter') {
      evenement.preventDefault();
      const p = resultats[surligne];
      if (p) {
        onChoix(p.id);
        onFermer();
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-encre/40 p-4 pt-24 backdrop-blur-sm"
      onClick={onFermer}
      onKeyDown={surTouche}
      role="dialog"
      aria-modal
      aria-label="Aller à une personne"
    >
      <div
        className="carte flex w-full max-w-lg flex-col overflow-hidden"
        style={{ boxShadow: 'var(--ombre-forte)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-bordure px-4 py-3">
          <span aria-hidden className="text-encre-tres-douce">
            ⌕
          </span>
          <input
            ref={champRef}
            type="search"
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            placeholder="Aller à une personne — un nom, un lieu, une année…"
            aria-label="Aller à une personne"
            className="w-full bg-transparent text-sm text-encre outline-none placeholder:text-encre-tres-douce"
          />
          <kbd className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1.5 py-0.5 text-[10px] text-encre-tres-douce">
            Échap
          </kbd>
        </div>

        <p className="border-b border-bordure bg-fond-doux px-4 py-2 text-[11px] uppercase tracking-wider text-encre-tres-douce">
          {requete.trim().length >= 2
            ? `${resultats.length} résultat${resultats.length > 1 ? 's' : ''}`
            : 'Les plus récemment nés'}
        </p>

        <ul ref={listeRef} className="max-h-[50vh] overflow-y-auto" role="listbox">
          {resultats.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-encre-tres-douce">
              Personne de ce nom dans l’arbre.
            </li>
          )}
          {resultats.map((p, index) => {
            const vie = anneesDeVie(p);
            const actif = index === surligne;
            return (
              <li key={p.id} role="option" aria-selected={actif}>
                <button
                  type="button"
                  onMouseEnter={() => setSurligne(index)}
                  onClick={() => {
                    onChoix(p.id);
                    onFermer();
                  }}
                  className={`flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left transition ${
                    actif ? 'bg-accent-clair' : 'hover:bg-fond-doux'
                  }`}
                >
                  <span className="text-sm font-medium text-encre">{p.nomComplet}</span>
                  <span className="shrink-0 text-xs text-encre-tres-douce">
                    {[vie, p.naissance?.lieuCourt].filter(Boolean).join(' · ') ||
                      'Dates inconnues'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-4 border-t border-bordure px-4 py-2 text-[11px] text-encre-tres-douce">
          <span>
            <kbd className="mr-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1 py-0.5">↑</kbd>
            <kbd className="mr-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1 py-0.5">↓</kbd>
            parcourir
          </span>
          <span>
            <kbd className="mr-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1 py-0.5">
              Entrée
            </kbd>
            aller à la personne
          </span>
        </div>
      </div>
    </div>
  );
}
