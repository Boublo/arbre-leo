'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { VueArbre } from '@/components/arbre/vue-arbre';
import { BarreOutilsArbre } from '@/components/arbre/barre-outils-arbre';
import { FichePersonne } from '@/components/arbre/fiche-personne';
import { PanneauMobile } from '@/components/interactions/panneau-mobile';
import { PaletteCommandes } from '@/components/arbre/palette-commandes';
import {
  anneesDeVie,
  reconstruireGraphe,
  type GrapheSerialise,
} from '@/lib/arbre-graphe';
import { disposerArbre, type ModeArbre } from '@/lib/layout-arbre';

export function EcranArbre({
  graphe,
  focusInitial,
  derniersEnfants,
  peutDeposerPhoto = false,
}: {
  graphe: GrapheSerialise;
  focusInitial: string;
  derniersEnfants: string[];
  peutDeposerPhoto?: boolean;
}) {
  const router = useRouter();
  const chemin = usePathname();

  const [focusId, setFocusId] = useState(focusInitial);
  const [mode, setMode] = useState<ModeArbre>('ascendance');
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [paletteOuverte, setPaletteOuverte] = useState(false);

  const donnees = useMemo(() => reconstruireGraphe(graphe), [graphe]);

  // Recalculée à chaque changement de personne ou de mode : cent vingt-cinq
  // nœuds se placent en quelques millisecondes.
  const disposition = useMemo(
    () => disposerArbre(donnees, focusId, mode),
    [donnees, focusId, mode]
  );

  const focus = donnees.personnes.get(focusId) ?? null;

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

  /**
   * Raccourci F : ouvre la palette de recherche. On ignore les frappes
   * quand un champ est déjà en train de recevoir du texte, faute de quoi
   * on empêcherait de taper la lettre f dans le sélecteur d'ascendance.
   */
  useEffect(() => {
    function surTouche(evenement: KeyboardEvent) {
      if (evenement.defaultPrevented) return;
      if (evenement.key !== 'f' && evenement.key !== 'F') return;
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;

      const cible = evenement.target as HTMLElement | null;
      const tag = cible?.tagName;
      if (
        cible?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT'
      ) {
        return;
      }

      evenement.preventDefault();
      setPaletteOuverte(true);
    }
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, []);

  if (!focus) {
    return (
      <main className="flex flex-1 items-center justify-center p-8 text-encre-douce">
        Cette personne n’est plus dans l’arbre.
      </main>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <BarreOutilsArbre
        graphe={graphe}
        focus={focus}
        focusId={focusId}
        mode={mode}
        onMode={setMode}
        suggestions={suggestions}
        onFocus={changerFocus}
        onChercher={() => setPaletteOuverte(true)}
      />

      {/* --- Arbre et panneau ---------------------------------------------- */}
      {/*
        min-h-0 sur la rangée flex : sans lui, le panneau latéral s'étire avec
        son contenu et overflow-y-auto ne défile jamais — régression visible
        dès que la fiche dépasse la hauteur de l'écran (portrait + notes).
      */}
      {/*
        Position absolue pour le panneau : en flex-row, un aside dont le contenu
        dépasse l'écran grossit la ligne et overflow-y-auto ne s'active jamais.
        inset-y-0 borne la hauteur au cadre visible, le défilement devient fiable.
      */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 min-h-0 min-w-0">
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
          <aside className="absolute inset-y-0 right-0 z-10 hidden w-full max-w-sm overflow-y-auto overscroll-y-contain border-l border-bordure bg-fond-carte [-webkit-overflow-scrolling:touch] lg:block">
            <FichePersonne
              personne={personneSelectionnee}
              annees={anneesDeVie(personneSelectionnee)}
              estFocus={personneSelectionnee.id === focusId}
              onRepartirDIci={() => changerFocus(personneSelectionnee.id)}
              onFermer={() => setSelectionId(null)}
              peutDeposerPhoto={peutDeposerPhoto}
            />
          </aside>
        )}
      </div>

      <PanneauMobile
        ouvert={personneSelectionnee !== null}
        onFermer={() => setSelectionId(null)}
        etiquette={personneSelectionnee?.nomComplet}
      >
        {personneSelectionnee && (
          <FichePersonne
            personne={personneSelectionnee}
            annees={anneesDeVie(personneSelectionnee)}
            estFocus={personneSelectionnee.id === focusId}
            onRepartirDIci={() => changerFocus(personneSelectionnee.id)}
            onFermer={() => setSelectionId(null)}
            peutDeposerPhoto={peutDeposerPhoto}
          />
        )}
      </PanneauMobile>

      <PaletteCommandes
        personnes={graphe.personnes}
        ouverte={paletteOuverte}
        onFermer={() => setPaletteOuverte(false)}
        onChoix={changerFocus}
      />
    </div>
  );
}
