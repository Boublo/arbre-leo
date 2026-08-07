'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import type { DonneesArbre } from '@/lib/arbre';
import {
  HAUTEUR_NOEUD,
  type Disposition,
  type ModeArbre,
  type NoeudArbre,
} from '@/lib/layout-arbre';
import { MiniMap } from '@/components/arbre/mini-map';
import { MenuContextuel, type ActionContexte } from '@/components/arbre/menu-contextuel';
import { BandeauAide } from '@/components/arbre/bandeau-aide';
import { IndicationsMobile } from '@/components/arbre/indications-mobile';
import { Legende } from '@/components/arbre/legende';
import { ReperesRang } from '@/components/arbre/reperes-rang';
import { LiensArbre } from '@/components/arbre/liens-arbre';
import { CarteNoeud } from '@/components/arbre/carte-noeud';
import { FondAtmospherique } from '@/components/arbre/fond-atmospherique';

type EtatMenu = { personneId: string; x: number; y: number } | null;

/**
 * Voisin spatial pour la navigation clavier : même rangée à gauche/droite,
 * rangée adjacente au plus proche en x pour haut/bas.
 */
function voisinClavier(
  noeuds: NoeudArbre[],
  courantId: string,
  touche: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'
): string | null {
  const courant = noeuds.find((n) => n.personneId === courantId);
  if (!courant) return null;

  const autres = noeuds.filter((n) => n.personneId !== courantId);
  if (autres.length === 0) return null;

  if (touche === 'ArrowLeft' || touche === 'ArrowRight') {
    const memeRangee = autres.filter((n) => Math.abs(n.y - courant.y) < HAUTEUR_NOEUD * 0.6);
    const cote =
      touche === 'ArrowLeft'
        ? memeRangee.filter((n) => n.x < courant.x).sort((a, b) => b.x - a.x)
        : memeRangee.filter((n) => n.x > courant.x).sort((a, b) => a.x - b.x);
    return cote[0]?.personneId ?? null;
  }

  const versLeHaut = touche === 'ArrowUp';
  const candidats = autres
    .filter((n) => (versLeHaut ? n.y < courant.y - 8 : n.y > courant.y + 8))
    .map((n) => ({
      id: n.personneId,
      dy: Math.abs(n.y - courant.y),
      dx: Math.abs(n.x - courant.x),
    }))
    .sort((a, b) => a.dy - b.dy || a.dx - b.dx);

  return candidats[0]?.id ?? null;
}

export function VueArbre({
  donnees,
  disposition,
  focusId,
  personneSelectionnee,
  onSelection,
  onRecentrer,
  masquerAide = false,
  guideTermine = false,
  etapeGuide = null,
  noeudSuggestion = null,
  cleRecadrageEclate = '',
}: {
  donnees: DonneesArbre;
  disposition: Disposition;
  focusId: string;
  personneSelectionnee: string | null;
  onSelection: (id: string | null) => void;
  onRecentrer: (id: string) => void;
  masquerAide?: boolean;
  guideTermine?: boolean;
  etapeGuide?: string | null;
  noeudSuggestion?: string | null;
  /** Change quand les réglages du mode éclaté bougent — force un recadrage. */
  cleRecadrageEclate?: string;
}) {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [tailleVue, setTailleVue] = useState({ largeur: 0, hauteur: 0 });
  const [menu, setMenu] = useState<EtatMenu>(null);
  const [signalActivite, setSignalActivite] = useState(0);
  const [conseilCopie, setConseilCopie] = useState<string | null>(null);
  const [legendeOuverte, setLegendeOuverte] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const groupeRef = useRef<SVGGElement>(null);
  const cadreRef = useRef<HTMLDivElement>(null);
  const comportementRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const router = useRouter();

  const noeudParId = useMemo(
    () => new Map(disposition.noeuds.map((n) => [n.personneId, n])),
    [disposition.noeuds]
  );

  // --- Zoom et déplacement ---------------------------------------------------

  useEffect(() => {
    const svg = svgRef.current;
    const groupe = groupeRef.current;
    if (!svg || !groupe) return;

    const comportement = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.06, 3])
      .on('zoom', (evenement) => {
        groupe.setAttribute('transform', evenement.transform.toString());
        setTransform({
          x: evenement.transform.x,
          y: evenement.transform.y,
          k: evenement.transform.k,
        });
      })
      .on('start', () => {
        // Le premier geste ferme le bandeau d'aide et tout menu ouvert.
        setSignalActivite((n) => n + 1);
        setMenu(null);
      });

    comportementRef.current = comportement;
    select(svg).call(comportement).on('dblclick.zoom', null);

    return () => {
      select(svg).on('.zoom', null);
    };
  }, []);

  // On observe la taille du cadre pour que la mini-carte connaisse la portion
  // visible et que « Voir tout » recadre correctement au changement de fenêtre.
  useEffect(() => {
    const cadre = cadreRef.current;
    if (!cadre) return;
    const observateur = new ResizeObserver(() => {
      const rect = cadre.getBoundingClientRect();
      setTailleVue({ largeur: rect.width, hauteur: rect.height });
    });
    observateur.observe(cadre);
    return () => observateur.disconnect();
  }, []);

  const appliquerTransform = useCallback(
    (transform: ReturnType<typeof zoomIdentity.translate>, duree = 500) => {
      const svg = svgRef.current;
      const comportement = comportementRef.current;
      if (!svg || !comportement) return;
      select(svg).transition().duration(duree).call(comportement.transform, transform);
    },
    []
  );

  /** Cadre par défaut : centrer la personne choisie à une échelle lisible. */
  const recadrer = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const { width, height } = svg.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const noeudFocus = noeudParId.get(focusId);
    const mode = disposition.mode;
    const petitArbre =
      disposition.noeuds.length <= 8 &&
      disposition.rangMax <= 2 &&
      disposition.largeur <= 900;

    if (petitArbre) {
      const marge = width < 1024 ? 32 : 72;
      const k = Math.min(
        (width - marge * 2) / Math.max(disposition.largeur, 1),
        (height - marge * 2) / Math.max(disposition.hauteur + HAUTEUR_NOEUD, 1),
        1.05
      );
      appliquerTransform(
        zoomIdentity
          .translate((width - disposition.largeur * k) / 2, (height - disposition.hauteur * k) / 2)
          .scale(k)
      );
      return;
    }

    // Mode « Tout » large : montrer l'ensemble d'abord, la personne choisie reste repérable.
    if (mode === 'eclate' && disposition.noeuds.length > 14) {
      const marge = width < 1024 ? 32 : 90;
      const k = Math.min(
        (width - marge * 2) / Math.max(disposition.largeur, 1),
        (height - marge * 2) / Math.max(disposition.hauteur + HAUTEUR_NOEUD, 1),
        1.1
      );
      appliquerTransform(
        zoomIdentity
          .translate((width - disposition.largeur * k) / 2, (height - disposition.hauteur * k) / 2)
          .scale(k)
      );
      return;
    }

    if (!noeudFocus) return;

    const k = width < 1024 ? 1.05 : 1.0;
    const cx = noeudFocus.x;
    const cy = noeudFocus.y + HAUTEUR_NOEUD / 2;
    const anchorY = ancreVerticale(mode);

    appliquerTransform(
      zoomIdentity.translate(width / 2 - cx * k, height * anchorY - cy * k).scale(k)
    );
  }, [appliquerTransform, disposition, focusId, noeudParId]);

  /** Bouton « Voir tout » : réduit l'ensemble de l'arbre dans la fenêtre. */
  const toutVoir = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const { width, height } = svg.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const marge = width < 1024 ? 32 : 90;
    const k = Math.min(
      (width - marge * 2) / Math.max(disposition.largeur, 1),
      (height - marge * 2) / Math.max(disposition.hauteur + HAUTEUR_NOEUD, 1),
      1.1
    );

    appliquerTransform(
      zoomIdentity
        .translate((width - disposition.largeur * k) / 2, (height - disposition.hauteur * k) / 2)
        .scale(k)
    );
  }, [appliquerTransform, disposition.largeur, disposition.hauteur]);

  // Recadrer à chaque changement de focus/mode et dès que le cadre a une taille
  // (le panneau en position absolue peut mesurer 0×0 au premier rendu).
  useEffect(() => {
    if (tailleVue.largeur <= 0 || tailleVue.hauteur <= 0) return;
    const minuteur = setTimeout(recadrer, 60);
    return () => clearTimeout(minuteur);
  }, [recadrer, disposition.racineId, disposition.mode, cleRecadrageEclate, tailleVue.largeur, tailleVue.hauteur]);

  const zoomer = useCallback((facteur: number) => {
    const svg = svgRef.current;
    const comportement = comportementRef.current;
    if (!svg || !comportement) return;
    select(svg).transition().duration(200).call(comportement.scaleBy, facteur);
  }, []);

  // --- Mini-carte : cliquer pour recentrer la vue ---------------------------

  const deplacerVersPointMonde = useCallback(
    (mondeX: number, mondeY: number) => {
      const svg = svgRef.current;
      const comportement = comportementRef.current;
      if (!svg || !comportement) return;
      const { width, height } = svg.getBoundingClientRect();
      // On garde l'échelle courante et l'on décale pour amener le point demandé
      // au centre de la fenêtre visible.
      const k = transform.k;
      select(svg)
        .transition()
        .duration(200)
        .call(
          comportement.transform,
          zoomIdentity.translate(width / 2 - mondeX * k, height / 2 - mondeY * k).scale(k)
        );
    },
    [transform.k]
  );

  // --- Menu contextuel -------------------------------------------------------

  const ouvrirMenu = useCallback(
    (personneId: string, evenement: React.MouseEvent) => {
      evenement.preventDefault();
      const cadre = cadreRef.current;
      if (!cadre) return;
      const rect = cadre.getBoundingClientRect();
      // Éviter de dépasser du cadre : on cadre le menu dans les limites.
      const largeurMenu = 240;
      const hauteurMenu = 220;
      const x = Math.min(evenement.clientX - rect.left, rect.width - largeurMenu - 8);
      const y = Math.min(evenement.clientY - rect.top, rect.height - hauteurMenu - 8);
      setMenu({ personneId, x: Math.max(x, 8), y: Math.max(y, 8) });
    },
    []
  );

  const executerMenu = useCallback(
    (action: ActionContexte) => {
      if (!menu) return;
      const p = donnees.personnes.get(menu.personneId);
      if (!p) return;

      if (action === 'repartir') {
        onRecentrer(p.id);
      } else if (action === 'fiche') {
        onSelection(p.id);
      } else if (action === 'lien') {
        // Copie dans le presse-papier — on privilégie l'API moderne et l'on
        // retombe sur une saisie invisible si l'environnement la refuse.
        const url = new URL(window.location.href);
        url.searchParams.set('personne', p.id);
        const texte = url.toString();
        const echec = () => setConseilCopie('Impossible de copier — sélectionnez la barre d’adresse.');
        if (navigator.clipboard?.writeText) {
          navigator.clipboard
            .writeText(texte)
            .then(() => setConseilCopie('Lien copié.'))
            .catch(echec);
        } else {
          echec();
        }
        window.setTimeout(() => setConseilCopie(null), 3000);
      }
      // Les actions 'chronologie', 'carte', 'lignee' sont portées par des
      // liens Next : elles se ferment d'elles-mêmes en changeant de page.
      setMenu(null);
    },
    [menu, donnees, onRecentrer, onSelection]
  );

  const focus = donnees.personnes.get(focusId);
  const prenomFocus = focus?.prenoms?.split(' ')[0] ?? focus?.nomComplet ?? '';
  const detaille = transform.k > 0.32;
  const personneMenu = menu ? donnees.personnes.get(menu.personneId) ?? null : null;

  const surClavierArbre = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      const fleches = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const;
      if (!fleches.includes(e.key as (typeof fleches)[number])) {
        if (e.key === 'Enter' || e.key === ' ') {
          const id = personneSelectionnee ?? focusId;
          if (id) {
            e.preventDefault();
            onSelection(id);
          }
        }
        return;
      }

      e.preventDefault();
      const depuis = personneSelectionnee ?? focusId;
      const suivant = voisinClavier(
        disposition.noeuds,
        depuis,
        e.key as 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'
      );
      if (!suivant) return;
      onSelection(suivant);
      // Recentrer doucement si le nœud sort trop du viewport serait trop agressif :
      // on laisse le panneau s'ouvrir ; double-clic / Entrée longue = repartir.
    },
    [disposition.noeuds, focusId, onSelection, personneSelectionnee]
  );

  return (
    <div ref={cadreRef} className="relative h-full w-full overflow-hidden">
      <FondAtmospherique transform={transform} />

      {/* Liserés de branche : rappel latéral, deux ans après avoir découvert
          l'arbre on ne se rappelle plus toujours quelle couleur est quel côté. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-1"
        style={{
          background:
            'linear-gradient(to bottom, transparent, var(--paternelle) 20%, var(--paternelle) 80%, transparent)',
          opacity: 0.55,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-1"
        style={{
          background:
            'linear-gradient(to bottom, transparent, var(--maternelle) 20%, var(--maternelle) 80%, transparent)',
          opacity: 0.55,
        }}
      />

      <svg
        ref={svgRef}
        className="relative z-[1] h-full w-full cursor-grab active:cursor-grabbing"
        role="application"
        tabIndex={0}
        aria-label="Arbre généalogique. Flèches pour parcourir les personnes, Entrée pour ouvrir la fiche, glisser pour déplacer, molette pour zoomer."
        onKeyDown={surClavierArbre}
      >
        <defs>
          <filter id="ombre-noeud" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="var(--encre)" floodOpacity="0.1" />
          </filter>
        </defs>

        <g ref={groupeRef}>
          {/* Filiations et unions — tracé unifié (pedigree + orthogonaux) */}
          <LiensArbre disposition={disposition} donnees={donnees} noeudParId={noeudParId} />

          {/* Personnes */}
          <g>
            {disposition.noeuds.map((noeud) => {
              const personne = donnees.personnes.get(noeud.personneId);
              if (!personne) return null;
              const opacite =
                disposition.mode === 'eclate'
                  ? opaciteNoeudEclate(noeud, disposition, focusId)
                  : 1;
              return (
                <g key={noeud.personneId} opacity={opacite}>
                  <CarteNoeud
                    noeud={noeud}
                    personne={personne}
                    estFocus={noeud.personneId === focusId}
                    selectionne={personneSelectionnee === noeud.personneId}
                    detaille={detaille}
                    invitationGuide={
                      etapeGuide === 'explorer' && noeud.personneId === noeudSuggestion
                    }
                    onClick={() => onSelection(noeud.personneId)}
                    onDoubleClick={() => onRecentrer(noeud.personneId)}
                    onMenu={(evenement) => ouvrirMenu(noeud.personneId, evenement)}
                    onAjouterEnfant={(p) => {
                      const cle = p.sexe === 'F' ? 'mere' : 'pere';
                      router.push(`/personne/nouvelle?${cle}=${p.id}`);
                    }}
                  />
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <ReperesRang
        disposition={disposition}
        transform={transform}
        prenomFocus={prenomFocus}
        hauteurVue={tailleVue.hauteur}
      />

      <IndicationsMobile masquer={masquerAide} />

      {/* Menu contextuel */}
      {menu && personneMenu && (
        <MenuContextuel
          personne={personneMenu}
          x={menu.x}
          y={menu.y}
          onAction={executerMenu}
          onFermer={() => setMenu(null)}
        />
      )}

      {/* Bandeau d'aide détaillé — grands écrans ; sur mobile voir IndicationsMobile. */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 hidden justify-center px-3 sm:flex">
        <BandeauAide
          signalActivite={signalActivite}
          masquer={masquerAide}
          guideTermine={guideTermine}
        />
      </div>

      {/* Confirmation discrète après un « Copier le lien ». */}
      {conseilCopie && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-1.5 text-xs text-encre-douce shadow-[var(--ombre-douce)]"
        >
          {conseilCopie}
        </div>
      )}

      {/* Commandes et légende — toujours ancrées en bas du cadre visible. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4">
        <div
          className="pointer-events-auto flex max-w-[calc(100%-0.5rem)] flex-col items-start gap-2 sm:max-w-none"
          data-guide="controles"
        >
          <div className="flex flex-wrap items-end gap-1">
            <div className="carte flex items-center gap-1 p-1 shadow-[var(--ombre-douce)]">
              <BoutonRond titre="Agrandir" onClick={() => zoomer(1.35)}>
                +
              </BoutonRond>
              <BoutonRond titre="Réduire" onClick={() => zoomer(1 / 1.35)}>
                −
              </BoutonRond>
              <BoutonRond titre="Voir tout l’arbre" onClick={toutVoir}>
                ⤢
              </BoutonRond>
            </div>
            <button
              type="button"
              onClick={() => setLegendeOuverte((v) => !v)}
              aria-expanded={legendeOuverte}
              aria-label={legendeOuverte ? 'Masquer la légende' : 'Afficher la légende'}
              className="grid h-11 w-11 place-items-center rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte text-sm text-encre-douce shadow-[var(--ombre-douce)] sm:hidden"
            >
              ?
            </button>
          </div>
          <div className="hidden max-w-[calc(100vw-1rem)] sm:block">
            <Legende mode={disposition.mode} />
          </div>
          {legendeOuverte && (
            <div className="max-w-[calc(100vw-1rem)] sm:hidden">
              <Legende mode={disposition.mode} />
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="md:hidden">
            <MiniMap
              disposition={disposition}
              transform={transform}
              tailleVue={tailleVue}
              onDeplacer={deplacerVersPointMonde}
              focusId={focusId}
              variante="compact"
            />
          </div>
          <div className="hidden md:block">
            <MiniMap
              disposition={disposition}
              transform={transform}
              tailleVue={tailleVue}
              onDeplacer={deplacerVersPointMonde}
              focusId={focusId}
            />
          </div>
        </div>
      </div>

      {disposition.noeuds.length <= 1 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="carte pointer-events-auto max-w-sm p-5 text-center text-sm text-encre-douce">
            Rien à montrer dans ce sens : on ne connaît personne de ce côté-là.
            Essayez un autre sens de lecture, ou{' '}
            <Link href="/recherches" className="lien-discret">
              ouvrez un chantier de recherche
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

/** Où placer verticalement la personne choisie dans la fenêtre (fraction de la hauteur). */
function ancreVerticale(mode: ModeArbre): number {
  if (mode === 'ascendance') return 0.3;
  if (mode === 'descendance') return 0.55;
  if (mode === 'eclate') return 0.38;
  return 0.42;
}

/** Atténue les personnes éloignées en degrés de parenté pour faire ressortir l'entourage proche. */
function opaciteNoeudEclate(
  noeud: NoeudArbre,
  disposition: Disposition,
  focusId: string
): number {
  if (noeud.personneId === focusId) return 1;
  const delta = Math.abs(noeud.rang - disposition.rangRacine);
  if (delta <= 1) return 1;
  if (delta === 2) return 0.9;
  if (delta === 3) return 0.78;
  return 0.62;
}

function BoutonRond({
  titre,
  onClick,
  children,
}: {
  titre: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titre}
      aria-label={titre}
      className="grid h-11 w-11 place-items-center rounded-[var(--rayon-petit)] text-lg text-encre-douce transition hover:bg-fond-doux sm:h-9 sm:w-9"
    >
      {children}
    </button>
  );
}
