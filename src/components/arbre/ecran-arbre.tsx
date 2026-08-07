'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { VueArbre } from '@/components/arbre/vue-arbre';
import { BarreOutilsArbre } from '@/components/arbre/barre-outils-arbre';
import { FichePersonne } from '@/components/arbre/fiche-personne';
import { PanneauMobile } from '@/components/interactions/panneau-mobile';
import { PaletteCommandes } from '@/components/arbre/palette-commandes';
import { GuideArbre, guideDejaVu } from '@/components/arbre/guide-arbre';
import { chargerGrapheArbre } from '@/app/actions/arbre';
import {
  anneesDeVie,
  conserverPhotosGraphe,
  reconstruireGraphe,
  type GrapheSerialise,
  type PersonneRecherche,
} from '@/lib/arbre-graphe';
import {
  disposerArbre,
  filtrerDispositionEclate,
  LIBELLE_MODE,
  PROFONDEUR_ECLATE_DEFAUT,
  type FiltreBrancheEclate,
  type ModeArbre,
} from '@/lib/layout-arbre';
import { ReglagesModeEclate } from '@/components/arbre/reglage-profondeur-eclate';
import { urlImpressionArbre } from '@/lib/arbre-impression';
import {
  CLE_MODE_ARBRE,
  lireFiltreBrancheEclateClient,
  lireFondArbreClient,
  lireMasquerLiensLointainsClient,
  lireModeArbreClient,
  lireProfondeurEclateClient,
} from '@/lib/preferences-arbre-client';
import { CLE_FOND_ARBRE, type FondArbre } from '@/lib/fond-arbre';
import { ecrireStockage, subscribeStockageLocal } from '@/lib/stockage-client';
import { useRafraichirPhotosArbre } from '@/components/arbre/use-rafraichir-photos-arbre';

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
  const [grapheServeur, setGrapheServeur] = useState(grapheInitial);
  const [focusId, setFocusId] = useState(focusInitial);
  const mode = useSyncExternalStore(
    subscribeStockageLocal,
    lireModeArbreClient,
    () => 'ascendance' as ModeArbre,
  );
  const setMode = useCallback((prochain: ModeArbre) => {
    ecrireStockage(CLE_MODE_ARBRE, prochain);
  }, []);
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [paletteOuverte, setPaletteOuverte] = useState(false);
  const guideVuStockage = useSyncExternalStore(subscribeStockageLocal, guideDejaVu, () => true);
  const [guideForceOuvert, setGuideForceOuvert] = useState(false);
  const [guideForceFerme, setGuideForceFerme] = useState(false);
  const guideOuvert = guideForceOuvert || (!guideVuStockage && !guideForceFerme);
  const guideTermine = guideVuStockage || guideForceFerme;
  const [etapeGuide, setEtapeGuide] = useState<string | null>(null);
  const [chargementFocus, startTransition] = useTransition();

  if (grapheInitial !== grapheServeur) {
    setGrapheServeur(grapheInitial);
    setGraphe((courant) => conserverPhotosGraphe(grapheInitial, courant));
  }

  const profondeurEclate = useSyncExternalStore(
    subscribeStockageLocal,
    lireProfondeurEclateClient,
    () => PROFONDEUR_ECLATE_DEFAUT
  );
  const filtreBrancheEclate = useSyncExternalStore(
    subscribeStockageLocal,
    lireFiltreBrancheEclateClient,
    () => 'tous' as FiltreBrancheEclate
  );
  const masquerLiensLointains = useSyncExternalStore(
    subscribeStockageLocal,
    lireMasquerLiensLointainsClient,
    () => false
  );
  const setProfondeurEclate = useCallback((niveau: number) => {
    ecrireStockage('arbre-profdondeur-eclate', String(niveau));
  }, []);
  const setFiltreBrancheEclate = useCallback((filtre: FiltreBrancheEclate) => {
    ecrireStockage('arbre-filtre-branche-eclate', filtre);
  }, []);
  const setMasquerLiensLointains = useCallback((masquer: boolean) => {
    ecrireStockage('arbre-masquer-liens-lointains-eclate', masquer ? '1' : '0');
  }, []);
  const fondArbre = useSyncExternalStore(
    subscribeStockageLocal,
    lireFondArbreClient,
    () => 'points' as FondArbre
  );
  const setFondArbre = useCallback((fond: FondArbre) => {
    ecrireStockage(CLE_FOND_ARBRE, fond);
  }, []);
  const [banniereEclateOuverte, setBanniereEclateOuverte] = useState(false);

  const donnees = useMemo(() => reconstruireGraphe(graphe), [graphe]);

  const dispositionBrute = useMemo(
    () =>
      disposerArbre(
        donnees,
        focusId,
        mode,
        mode === 'eclate' ? { profondeurEclate } : undefined
      ),
    [donnees, focusId, mode, profondeurEclate]
  );

  const disposition = useMemo(() => {
    if (mode !== 'eclate' || filtreBrancheEclate === 'tous') return dispositionBrute;
    return filtrerDispositionEclate(dispositionBrute, filtreBrancheEclate, focusId);
  }, [dispositionBrute, mode, filtreBrancheEclate, focusId]);

  const idsPhotosVisibles = useMemo(() => {
    const ids = new Set(disposition.noeuds.map((noeud) => noeud.personneId));
    ids.add(focusId);
    if (selectionId) ids.add(selectionId);
    return [...ids];
  }, [disposition.noeuds, focusId, selectionId]);

  useRafraichirPhotosArbre(graphe, setGraphe, idsPhotosVisibles);

  const cleRecadrageEclate =
    mode === 'eclate'
      ? `${profondeurEclate}-${filtreBrancheEclate}-${masquerLiensLointains}-${disposition.noeuds.length}`
      : '';

  const lienImprimer = useMemo(() => {
    if (mode === 'eclate') {
      return urlImpressionArbre(focusId, mode, {
        profondeur: 'tout',
        profondeurEclate: profondeurEclate,
        filtreBranche: filtreBrancheEclate,
      });
    }
    return urlImpressionArbre(focusId, mode);
  }, [focusId, mode, profondeurEclate, filtreBrancheEclate]);

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

  const noeudSuggestion = useMemo(() => {
    if (etapeGuide !== 'explorer') return null;
    const parents = donnees.parents.get(focusId) ?? [];
    if (parents[0]) return parents[0];
    const enfants = donnees.enfants.get(focusId) ?? [];
    return enfants[0] ?? null;
  }, [donnees, focusId, etapeGuide]);

  const surEtapeGuide = useCallback((etapeId: string) => {
    setEtapeGuide(etapeId);
    if (etapeId === 'modes' || etapeId === 'bienvenue') {
      ecrireStockage(CLE_MODE_ARBRE, 'ascendance');
    }
  }, []);

  const fermerGuide = useCallback(() => {
    setGuideForceFerme(true);
    setGuideForceOuvert(false);
    setEtapeGuide(null);
  }, []);

  const ouvrirGuide = useCallback(() => {
    setGuideForceOuvert(true);
  }, []);

  useEffect(() => {
    function surTouche(evenement: KeyboardEvent) {
      if (guideOuvert) return;
      if (evenement.defaultPrevented) return;
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

      if (evenement.key === 'f' || evenement.key === 'F') {
        evenement.preventDefault();
        setPaletteOuverte(true);
        return;
      }

      if (evenement.key === 'p' || evenement.key === 'P') {
        evenement.preventDefault();
        router.push(lienImprimer);
      }
    }
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [guideOuvert, lienImprimer, router]);

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
        onOuvrirGuide={ouvrirGuide}
        lienImprimer={lienImprimer}
        fondArbre={fondArbre}
        onFondArbre={setFondArbre}
      />

      {mode === 'eclate' && (
        <div
          role="status"
          className="shrink-0 border-b border-bordure bg-fond-doux px-3 py-2.5 sm:px-4"
        >
          <button
            type="button"
            onClick={() => setBanniereEclateOuverte((v) => !v)}
            aria-expanded={banniereEclateOuverte}
            className="flex w-full items-center justify-between gap-2 text-left sm:hidden"
          >
            <span className="text-xs font-medium text-encre">
              Mode « {LIBELLE_MODE.eclate.titre} » — réglages
            </span>
            <span className="text-encre-douce" aria-hidden>
              {banniereEclateOuverte ? '▴' : '▾'}
            </span>
          </button>

          <div className={banniereEclateOuverte ? 'mt-2' : 'hidden sm:block'}>
            <p className="text-center text-xs text-encre-douce sm:text-left">
              Mode « {LIBELLE_MODE.eclate.titre} » : les parentés proches sont en barres de fratrie ;
              les liens lointains sont atténués et peuvent se croiser — préférez «{' '}
              {LIBELLE_MODE.famille.titre} » pour lire une branche.
            </p>
            <div className="mt-2 flex justify-center sm:justify-start">
              <ReglagesModeEclate
                profondeur={profondeurEclate}
                onProfondeur={setProfondeurEclate}
                filtreBranche={filtreBrancheEclate}
                onFiltreBranche={setFiltreBrancheEclate}
                masquerLiensLointains={masquerLiensLointains}
                onMasquerLiensLointains={setMasquerLiensLointains}
                nombrePersonnes={disposition.noeuds.length}
              />
            </div>
          </div>
        </div>
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
            guideTermine={guideTermine}
            etapeGuide={etapeGuide}
            noeudSuggestion={noeudSuggestion}
            cleRecadrageEclate={cleRecadrageEclate}
            masquerLiensLointains={masquerLiensLointains}
            fondArbre={fondArbre}
          />
        </div>

        {personneSelectionnee && (
          <aside className="absolute inset-y-0 right-0 z-10 hidden w-full max-w-sm overflow-y-auto overscroll-y-contain border-l border-bordure bg-fond-carte [-webkit-overflow-scrolling:touch] lg:block" data-guide="fiche">
            <FichePersonne
              personne={personneSelectionnee}
              annees={anneesDeVie(personneSelectionnee)}
              estFocus={personneSelectionnee.id === focusId}
              onRepartirDIci={() => changerFocus(personneSelectionnee.id)}
              onFermer={() => setSelectionId(null)}
              peutDeposerPhoto={peutDeposerPhoto}
              modeArbre={mode}
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
            modeArbre={mode}
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
        onFermer={fermerGuide}
        nomFocus={focus.nomComplet}
        mode={mode}
        selectionFaite={selectionId !== null}
        ficheVisible={personneSelectionnee !== null}
        onEtapeChange={surEtapeGuide}
      />
    </div>
  );
}
