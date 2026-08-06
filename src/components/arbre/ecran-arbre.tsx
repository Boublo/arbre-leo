'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { VueArbre } from '@/components/arbre/vue-arbre';
import { BarreOutilsArbre } from '@/components/arbre/barre-outils-arbre';
import { FichePersonne } from '@/components/arbre/fiche-personne';
import { PanneauMobile } from '@/components/interactions/panneau-mobile';
import { PaletteCommandes } from '@/components/arbre/palette-commandes';
import { GuideArbre, guideDejaVu } from '@/components/arbre/guide-arbre';
import { useRafraichirPhotosArbre } from '@/components/arbre/use-rafraichir-photos-arbre';
import { chargerGrapheArbre } from '@/app/actions/arbre';
import {
  anneesDeVie,
  reconstruireGraphe,
  type GrapheSerialise,
  type PersonneRecherche,
} from '@/lib/arbre-graphe';
import { disposerArbre, LIBELLE_MODE, type ModeArbre } from '@/lib/layout-arbre';

const CLE_MODE_ARBRE = 'arbre-mode';
const MODES_ARBRE: ModeArbre[] = ['ascendance', 'famille', 'descendance', 'eclate'];

function lireModeInitial(): ModeArbre {
  if (typeof window === 'undefined') return 'ascendance';
  try {
    const sauve = localStorage.getItem(CLE_MODE_ARBRE);
    if (sauve && MODES_ARBRE.includes(sauve as ModeArbre)) return sauve as ModeArbre;
  } catch {
    /* localStorage indisponible */
  }
  return 'ascendance';
}

export function EcranArbre({
  graphe: grapheInitial,
  recherchePersonnes,
  focusInitial,
  derniersEnfants,
  peutDeposerPhoto = false,
}: {
  graphe: GrapheSerialise;
  recherchePersonnes: PersonneRecherche[];
  focusInitial: string;
  derniersEnfants: string[];
  peutDeposerPhoto?: boolean;
}) {
  const router = useRouter();
  const chemin = usePathname();

  const [graphe, setGraphe] = useState(grapheInitial);
  const [focusId, setFocusId] = useState(focusInitial);
  const [mode, setMode] = useState<ModeArbre>('ascendance');
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [paletteOuverte, setPaletteOuverte] = useState(false);
  const [guideOuvert, setGuideOuvert] = useState(false);
  const [chargementFocus, startTransition] = useTransition();

  useEffect(() => {
    setGraphe(grapheInitial);
  }, [grapheInitial]);

  useEffect(() => {
    if (!guideDejaVu()) {
      setMode('ascendance');
      setGuideOuvert(true);
    } else {
      setMode(lireModeInitial());
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CLE_MODE_ARBRE, mode);
    } catch {
      /* localStorage indisponible */
    }
  }, [mode]);

  useRafraichirPhotosArbre(graphe, setGraphe);

  const donnees = useMemo(() => reconstruireGraphe(graphe), [graphe]);

  const disposition = useMemo(
    () => disposerArbre(donnees, focusId, mode),
    [donnees, focusId, mode]
  );

  const focus = donnees.personnes.get(focusId) ?? null;

  const chargerFocus = useCallback(
    (id: string) => {
      if (donnees.personnes.has(id)) return;
      startTransition(async () => {
        const nouveau = await chargerGrapheArbre(id);
        setGraphe(nouveau);
      });
    },
    [donnees.personnes]
  );

  const changerFocus = useCallback(
    (id: string) => {
      setFocusId(id);
      setSelectionId(null);
      router.replace(`${chemin}?personne=${encodeURIComponent(id)}`, { scroll: false });
      chargerFocus(id);
    },
    [chemin, router, chargerFocus]
  );

  const suggestions = useMemo(
    () =>
      derniersEnfants
        .map((id) => recherchePersonnes.find((p) => p.id === id))
        .filter((p): p is PersonneRecherche => p !== undefined),
    [derniersEnfants, recherchePersonnes]
  );

  const personneSelectionnee = selectionId ? donnees.personnes.get(selectionId) ?? null : null;

  const surEtapeGuide = useCallback((etapeId: string) => {
    if (etapeId === 'modes' || etapeId === 'bienvenue') {
      setMode('ascendance');
    }
  }, []);

  useEffect(() => {
    function surTouche(evenement: KeyboardEvent) {
      if (guideOuvert) return;
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
  }, [guideOuvert]);

  if (!focus && chargementFocus) {
    return (
      <main className="flex flex-1 items-center justify-center p-8 text-encre-douce">
        Chargement de cette branche…
      </main>
    );
  }

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
        focus={focus}
        focusId={focusId}
        mode={mode}
        onMode={setMode}
        suggestions={suggestions}
        recherchePersonnes={recherchePersonnes}
        onFocus={changerFocus}
        onChercher={() => setPaletteOuverte(true)}
        onOuvrirGuide={() => setGuideOuvert(true)}
      />

      {mode === 'eclate' && (
        <p
          role="status"
          className="shrink-0 border-b border-bordure bg-fond-doux px-3 py-2 text-center text-xs text-encre-douce sm:px-4"
        >
          Mode « {LIBELLE_MODE.eclate.titre} » : parentés proches en pedigree, le reste en traits
          simples. Les liens lointains ou d’implexe peuvent se croiser — préférez «{' '}
          {LIBELLE_MODE.famille.titre} » pour lire une branche.
        </p>
      )}

      {chargementFocus && (
        <p
          role="status"
          className="shrink-0 border-b border-bordure bg-fond-carte px-3 py-1.5 text-center text-xs text-encre-douce"
        >
          Chargement de l’entourage de cette personne…
        </p>
      )}

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
      <div className="relative min-h-0 flex-1 overflow-hidden" data-guide="arbre">
        <div className="absolute inset-0 min-h-0 min-w-0">
          <VueArbre
            donnees={donnees}
            disposition={disposition}
            focusId={focusId}
            personneSelectionnee={selectionId}
            onSelection={setSelectionId}
            onRecentrer={changerFocus}
            masquerAide={guideOuvert}
          />
        </div>

        {personneSelectionnee && (
          <aside
            data-guide="fiche"
            className="absolute inset-y-0 right-0 z-10 hidden w-full max-w-sm overflow-y-auto overscroll-y-contain border-l border-bordure bg-fond-carte [-webkit-overflow-scrolling:touch] lg:block"
          >
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
        guideCible="fiche"
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
        personnes={recherchePersonnes}
        ouverte={paletteOuverte}
        onFermer={() => setPaletteOuverte(false)}
        onChoix={changerFocus}
      />

      <GuideArbre
        ouvert={guideOuvert}
        onFermer={() => setGuideOuvert(false)}
        nomFocus={focus.nomComplet}
        selectionFaite={selectionId !== null}
        ficheVisible={personneSelectionnee !== null}
        onEtapeChange={surEtapeGuide}
      />
    </div>
  );
}
