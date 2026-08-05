'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';
import { anneesDeVie } from '@/lib/arbre-graphe';
import {
  ESPACEMENT_Y,
  HAUTEUR_NOEUD,
  LARGEUR_NOEUD,
  nommerRang,
  type Disposition,
  type NoeudArbre,
} from '@/lib/layout-arbre';
import { MiniMap } from '@/components/arbre/mini-map';
import { MenuContextuel, type ActionContexte } from '@/components/arbre/menu-contextuel';
import { BandeauAide } from '@/components/arbre/bandeau-aide';
import { Legende } from '@/components/arbre/legende';
import { iconesPour, IconeSvg } from '@/components/arbre/icones-richesse';

const COULEUR_COTE = {
  paternelle: { trait: 'var(--paternelle)', fond: 'var(--paternelle-douce)' },
  maternelle: { trait: 'var(--maternelle)', fond: 'var(--maternelle-douce)' },
  commune: { trait: 'var(--commune)', fond: 'var(--fond-doux)' },
} as const;

type EtatMenu = { personneId: string; x: number; y: number } | null;

export function VueArbre({
  donnees,
  disposition,
  focusId,
  personneSelectionnee,
  onSelection,
  onRecentrer,
}: {
  donnees: DonneesArbre;
  disposition: Disposition;
  focusId: string;
  personneSelectionnee: string | null;
  onSelection: (id: string | null) => void;
  onRecentrer: (id: string) => void;
}) {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [tailleVue, setTailleVue] = useState({ largeur: 0, hauteur: 0 });
  const [menu, setMenu] = useState<EtatMenu>(null);
  const [signalActivite, setSignalActivite] = useState(0);
  const [conseilCopie, setConseilCopie] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const groupeRef = useRef<SVGGElement>(null);
  const cadreRef = useRef<HTMLDivElement>(null);
  const comportementRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

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

  const toutVoir = useCallback(() => {
    const svg = svgRef.current;
    const comportement = comportementRef.current;
    if (!svg || !comportement) return;

    const { width, height } = svg.getBoundingClientRect();
    if (width === 0) return;

    const marge = 90;
    const k = Math.min(
      (width - marge * 2) / Math.max(disposition.largeur, 1),
      (height - marge * 2) / Math.max(disposition.hauteur + HAUTEUR_NOEUD, 1),
      1.1
    );

    select(svg)
      .transition()
      .duration(500)
      .call(
        comportement.transform,
        zoomIdentity
          .translate((width - disposition.largeur * k) / 2, (height - disposition.hauteur * k) / 2)
          .scale(k)
      );
  }, [disposition.largeur, disposition.hauteur]);

  // Chaque changement de personne ou de mode recadre sur l'ensemble : sans
  // cela, la nouvelle disposition apparaîtrait hors de l'écran.
  useEffect(() => {
    const minuteur = setTimeout(toutVoir, 60);
    return () => clearTimeout(minuteur);
  }, [toutVoir, disposition.racineId, disposition.mode]);

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
  const detaille = transform.k > 0.45;
  const personneMenu = menu ? donnees.personnes.get(menu.personneId) ?? null : null;

  return (
    <div ref={cadreRef} className="relative h-full w-full overflow-hidden bg-fond">
      {/* Liserés de branche : rappel latéral, deux ans après avoir découvert
          l'arbre on ne se rappelle plus toujours quelle couleur est quel côté. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1"
        style={{
          background:
            'linear-gradient(to bottom, transparent, var(--paternelle) 20%, var(--paternelle) 80%, transparent)',
          opacity: 0.55,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1"
        style={{
          background:
            'linear-gradient(to bottom, transparent, var(--maternelle) 20%, var(--maternelle) 80%, transparent)',
          opacity: 0.55,
        }}
      />

      <svg
        ref={svgRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        role="application"
        aria-label="Arbre généalogique. Faites glisser pour vous déplacer, la molette pour zoomer, cliquez sur une personne pour l’ouvrir, F pour chercher."
      >
        <defs>
          <pattern id="grille" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--bordure)" opacity="0.5" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#grille)" />

        <g ref={groupeRef}>
          {/* Repères de rang, en marge */}
          {Array.from({ length: disposition.rangMax + 1 }, (_, rang) => (
            <text
              key={`rang-${rang}`}
              x={-40}
              y={rang * ESPACEMENT_Y + HAUTEUR_NOEUD / 2}
              textAnchor="end"
              className="fill-[var(--encre-tres-douce)] text-[13px]"
              style={{ fontFamily: 'var(--font-titre)' }}
            >
              {nommerRang(rang, disposition.mode, prenomFocus)}
            </text>
          ))}

          {/* Filiations */}
          <g fill="none">
            {disposition.liens.map((lien) => {
              const enfant = noeudParId.get(lien.enfantId);
              const parent = noeudParId.get(lien.parentId);
              if (!enfant || !parent) return null;

              // Le trait part du bas du nœud du haut vers le haut du nœud du bas,
              // quel que soit lequel est l'enfant : le sens de lecture prime.
              const [haut, bas] = enfant.y <= parent.y ? [enfant, parent] : [parent, enfant];
              const y1 = haut.y + HAUTEUR_NOEUD;
              const y2 = bas.y;
              const milieu = y1 + (y2 - y1) / 2;

              return (
                <path
                  key={lien.id}
                  d={`M ${haut.x} ${y1} V ${milieu} H ${bas.x} V ${y2}`}
                  stroke={lien.reprise ? 'var(--or)' : 'var(--bordure-forte)'}
                  strokeWidth={lien.reprise ? 2 : 1.5}
                  strokeDasharray={lien.reprise ? '5 4' : undefined}
                  opacity={0.85}
                />
              );
            })}
          </g>

          {/* Traits d'union entre conjoints de même rangée */}
          <g fill="none">
            {disposition.unions.map((union) => {
              const a = noeudParId.get(union.aId);
              const b = noeudParId.get(union.bId);
              if (!a || !b || a.rang !== b.rang) return null;
              const y = a.y + HAUTEUR_NOEUD / 2;
              return (
                <line
                  key={union.id}
                  x1={Math.min(a.x, b.x) + LARGEUR_NOEUD / 2}
                  y1={y}
                  x2={Math.max(a.x, b.x) - LARGEUR_NOEUD / 2}
                  y2={y}
                  stroke="var(--or)"
                  strokeWidth={2}
                  opacity={0.5}
                />
              );
            })}
          </g>

          {/* Personnes */}
          <g>
            {disposition.noeuds.map((noeud) => (
              <Noeud
                key={noeud.personneId}
                noeud={noeud}
                personne={donnees.personnes.get(noeud.personneId)}
                estFocus={noeud.personneId === focusId}
                selectionne={personneSelectionnee === noeud.personneId}
                detaille={detaille}
                onClick={() => onSelection(noeud.personneId)}
                onDoubleClick={() => onRecentrer(noeud.personneId)}
                onMenu={(evenement) => ouvrirMenu(noeud.personneId, evenement)}
              />
            ))}
          </g>
        </g>
      </svg>

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

      {/* Bandeau d'aide clavier — en haut, il ne cache pas la vue de l'arbre. */}
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
        <BandeauAide signalActivite={signalActivite} />
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

      {/* Légende à gauche, mini-carte à droite. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="flex flex-col gap-3">
          <Legende />
          <div className="pointer-events-auto carte flex w-fit items-center gap-1 p-1">
            <BoutonRond titre="Voir tout l’arbre" onClick={toutVoir}>
              ⤢
            </BoutonRond>
          </div>
        </div>

        <MiniMap
          disposition={disposition}
          transform={transform}
          tailleVue={tailleVue}
          onDeplacer={deplacerVersPointMonde}
          focusId={focusId}
        />
      </div>

      {disposition.noeuds.length <= 1 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="carte pointer-events-auto max-w-sm p-5 text-center text-sm text-encre-douce">
            Rien à montrer dans ce sens : on ne connaît personne de ce côté-là.
            Essayez un autre sens de lecture, ou ouvrez un chantier de recherche.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Noeud({
  noeud,
  personne,
  estFocus,
  selectionne,
  detaille,
  onClick,
  onDoubleClick,
  onMenu,
}: {
  noeud: NoeudArbre;
  personne: PersonneArbre | undefined;
  estFocus: boolean;
  selectionne: boolean;
  detaille: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onMenu: (evenement: React.MouseEvent) => void;
}) {
  if (!personne) return null;

  const couleurs = COULEUR_COTE[noeud.cote];
  const vie = anneesDeVie(personne);
  const icones = detaille ? iconesPour(personne) : [];
  const couleurIcone = estFocus ? 'var(--accent-contraste)' : 'var(--encre-douce)';

  return (
    <g
      transform={`translate(${noeud.x - LARGEUR_NOEUD / 2}, ${noeud.y})`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onMenu}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={`${personne.nomComplet}${vie ? `, ${vie}` : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Fond doré pour la personne choisie : ce n'est pas juste un contour,
          c'est un fond patiné, comme un cadre autour d'un portrait. */}
      <rect
        width={LARGEUR_NOEUD}
        height={HAUTEUR_NOEUD}
        rx={10}
        fill={estFocus ? 'var(--accent)' : couleurs.fond}
        stroke={selectionne ? 'var(--accent)' : couleurs.trait}
        strokeWidth={selectionne ? 3 : estFocus ? 2 : noeud.lien === 'collateral' ? 1 : 1.5}
        strokeDasharray={noeud.lien === 'collateral' || noeud.lien === 'conjoint' ? '4 3' : undefined}
      />

      {/* Un liseré rappelle les personnes encore vivantes : leurs données
          appellent plus de retenue si l'écran est montré à l'extérieur. */}
      {personne.presumeVivant && !estFocus && (
        <rect x={0} y={0} width={4} height={HAUTEUR_NOEUD} rx={2} fill="var(--succes)" opacity={0.7} />
      )}

      {/* Avatar : la photo de profil rend le nœud immédiatement reconnaissable.
          Cerclée pour ne pas rompre la géométrie carrée du nœud, tronquée par
          un clipPath — sans clipPath, une image dépasserait le rectangle. */}
      {personne.photoUrl && detaille && (
        <>
          <defs>
            <clipPath id={`clip-avatar-${personne.id}`}>
              <circle cx={22} cy={HAUTEUR_NOEUD / 2} r={16} />
            </clipPath>
          </defs>
          <image
            href={personne.photoUrl}
            x={6}
            y={HAUTEUR_NOEUD / 2 - 16}
            width={32}
            height={32}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#clip-avatar-${personne.id})`}
          />
          <circle
            cx={22}
            cy={HAUTEUR_NOEUD / 2}
            r={16}
            fill="none"
            stroke={couleurs.trait}
            strokeWidth={1.5}
            opacity={0.6}
          />
        </>
      )}

      <text
        x={personne.photoUrl && detaille ? 46 : LARGEUR_NOEUD / 2}
        y={detaille ? 24 : 38}
        textAnchor={personne.photoUrl && detaille ? 'start' : 'middle'}
        className={estFocus ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre)]'}
        style={{ fontFamily: 'var(--font-titre)', fontSize: 14, fontWeight: 600 }}
      >
        {tronquer(personne.nomComplet, personne.photoUrl && detaille ? 18 : 22)}
      </text>

      {detaille && (
        <>
          {vie && (
            <text
              x={personne.photoUrl ? 46 : LARGEUR_NOEUD / 2}
              y={41}
              textAnchor={personne.photoUrl ? 'start' : 'middle'}
              className={estFocus ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre-douce)]'}
              style={{ fontSize: 11.5 }}
              opacity={0.9}
            >
              {vie}
            </text>
          )}
          {personne.naissance?.lieuCourt && (
            <text
              x={personne.photoUrl ? 46 : LARGEUR_NOEUD / 2}
              y={55}
              textAnchor={personne.photoUrl ? 'start' : 'middle'}
              className={
                estFocus ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre-tres-douce)]'
              }
              style={{ fontSize: 10.5 }}
              opacity={0.85}
            >
              {tronquer(personne.naissance.lieuCourt, personne.photoUrl ? 20 : 26)}
            </text>
          )}

          {/* Icônes de richesse — alignées en bas à droite du nœud. */}
          {icones.length > 0 && (
            <g>
              {icones.map((type, index) => (
                <IconeSvg
                  key={type}
                  type={type}
                  x={LARGEUR_NOEUD - 10 - index * 13}
                  y={HAUTEUR_NOEUD - 8}
                  couleur={couleurIcone}
                />
              ))}
            </g>
          )}
        </>
      )}
    </g>
  );
}

function tronquer(texte: string, max: number) {
  return texte.length <= max ? texte : `${texte.slice(0, max - 1)}…`;
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
      className="grid h-9 w-9 place-items-center rounded-[var(--rayon-petit)] text-lg text-encre-douce transition hover:bg-fond-doux"
    >
      {children}
    </button>
  );
}
