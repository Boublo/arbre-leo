'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { VueArbre } from '@/components/arbre/vue-arbre';
import { SelecteurPersonne } from '@/components/arbre/selecteur-personne';
import { FichePersonne } from '@/components/arbre/fiche-personne';
import {
  anneesDeVie,
  compterEntourage,
  reconstruireGraphe,
  type GrapheSerialise,
} from '@/lib/arbre-graphe';
import { disposerArbre, LIBELLE_MODE, type ModeArbre } from '@/lib/layout-arbre';

const MODES: ModeArbre[] = ['ascendance', 'descendance', 'eclate'];

export function EcranArbre({
  graphe,
  focusInitial,
  derniersEnfants,
}: {
  graphe: GrapheSerialise;
  focusInitial: string;
  derniersEnfants: string[];
}) {
  const router = useRouter();
  const chemin = usePathname();

  const [focusId, setFocusId] = useState(focusInitial);
  const [mode, setMode] = useState<ModeArbre>('ascendance');
  const [selectionId, setSelectionId] = useState<string | null>(null);

  const donnees = useMemo(() => reconstruireGraphe(graphe), [graphe]);

  // Recalculée à chaque changement de personne ou de mode : cent vingt-cinq
  // nœuds se placent en quelques millisecondes.
  const disposition = useMemo(
    () => disposerArbre(donnees, focusId, mode),
    [donnees, focusId, mode]
  );

  const focus = donnees.personnes.get(focusId) ?? null;
  const entourage = useMemo(
    () => (focus ? compterEntourage(donnees, focusId) : null),
    [donnees, focusId, focus]
  );

  /**
   * L'adresse suit la personne regardée, sans recharger la page : un membre
   * peut ainsi envoyer à la famille le lien de la branche qu'il consulte.
   */
  const changerFocus = useCallback(
    (id: string) => {
      setFocusId(id);
      setSelectionId(null);
      router.replace(`${chemin}?personne=${encodeURIComponent(id)}`, { scroll: false });
    },
    [chemin, router]
  );

  const suggestions = useMemo(
    () => derniersEnfants.map((id) => donnees.personnes.get(id)).filter((p) => p !== undefined),
    [derniersEnfants, donnees.personnes]
  );

  const personneSelectionnee = selectionId ? donnees.personnes.get(selectionId) ?? null : null;

  if (!focus) {
    return (
      <main className="flex flex-1 items-center justify-center p-8 text-encre-douce">
        Cette personne n’est plus dans l’arbre.
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* --- Barre de choix ------------------------------------------------ */}
      <div className="z-10 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-bordure bg-fond-carte px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-encre-tres-douce">Partir de</span>
          <SelecteurPersonne
            personnes={graphe.personnes}
            suggestions={suggestions}
            choisie={focus}
            onChoix={changerFocus}
          />
        </div>

        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Sens de lecture">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              title={LIBELLE_MODE[m].aide}
              onClick={() => setMode(m)}
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

        {entourage && (
          <p className="text-xs text-encre-tres-douce">
            {mode === 'ascendance' &&
              (entourage.ascendants > 0
                ? `${entourage.ascendants} ascendants sur ${entourage.generationsAuDessus} générations`
                : 'Aucun ascendant connu — c’est une piste à ouvrir.')}
            {mode === 'descendance' &&
              (entourage.descendants > 0
                ? `${entourage.descendants} descendants sur ${entourage.generationsEnDessous} générations`
                : 'Aucune descendance connue.')}
            {mode === 'eclate' && `${disposition.noeuds.length} personnes reliées`}
          </p>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs">
          <Link href={`/chronologie?personne=${encodeURIComponent(focusId)}`} className="lien-discret">
            Sa chronologie
          </Link>
          <Link href={`/personne/${focusId}`} className="lien-discret">
            Sa fiche
          </Link>
        </div>
      </div>

      {/* --- Arbre et panneau ---------------------------------------------- */}
      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1">
          <VueArbre
            donnees={donnees}
            disposition={disposition}
            focusId={focusId}
            personneSelectionnee={selectionId}
            onSelection={setSelectionId}
            onRecentrer={changerFocus}
          />
        </div>

        {personneSelectionnee && (
          <aside className="w-full max-w-sm shrink-0 overflow-y-auto border-l border-bordure bg-fond-carte">
            <FichePersonne
              personne={personneSelectionnee}
              annees={anneesDeVie(personneSelectionnee)}
              estFocus={personneSelectionnee.id === focusId}
              onRepartirDIci={() => changerFocus(personneSelectionnee.id)}
              onFermer={() => setSelectionId(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
