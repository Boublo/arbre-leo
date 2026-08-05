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

const COULEUR_COTE = {
  paternelle: { trait: 'var(--paternelle)', fond: 'var(--paternelle-douce)' },
  maternelle: { trait: 'var(--maternelle)', fond: 'var(--maternelle-douce)' },
  commune: { trait: 'var(--commune)', fond: 'var(--fond-doux)' },
} as const;

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
  const [echelle, setEchelle] = useState(1);

  const svgRef = useRef<SVGSVGElement>(null);
  const groupeRef = useRef<SVGGElement>(null);
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
        setEchelle(evenement.transform.k);
      });

    comportementRef.current = comportement;
    select(svg).call(comportement).on('dblclick.zoom', null);

    return () => {
      select(svg).on('.zoom', null);
    };
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

  const focus = donnees.personnes.get(focusId);
  const prenomFocus = focus?.prenoms?.split(' ')[0] ?? focus?.nomComplet ?? '';
  const detaille = echelle > 0.45;

  return (
    <div className="relative h-full w-full overflow-hidden bg-fond">
      <svg
        ref={svgRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        role="application"
        aria-label="Arbre généalogique. Faites glisser pour vous déplacer, la molette pour zoomer, cliquez sur une personne pour l’ouvrir."
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
              />
            ))}
          </g>
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="pointer-events-auto carte flex flex-wrap items-center gap-4 px-3 py-2 text-xs text-encre-douce">
          <Pastille couleur="var(--paternelle)">Côté paternel</Pastille>
          <Pastille couleur="var(--maternelle)">Côté maternel</Pastille>
          <Pastille couleur="var(--or)">Union</Pastille>
          <span className="text-encre-tres-douce">Double-clic : repartir de cette personne</span>
        </div>

        <div className="pointer-events-auto carte flex items-center gap-1 p-1">
          <BoutonRond titre="Voir tout l’arbre" onClick={toutVoir}>
            ⤢
          </BoutonRond>
        </div>
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
}: {
  noeud: NoeudArbre;
  personne: PersonneArbre | undefined;
  estFocus: boolean;
  selectionne: boolean;
  detaille: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  if (!personne) return null;

  const couleurs = COULEUR_COTE[noeud.cote];
  const vie = anneesDeVie(personne);

  return (
    <g
      transform={`translate(${noeud.x - LARGEUR_NOEUD / 2}, ${noeud.y})`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
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

      <text
        x={LARGEUR_NOEUD / 2}
        y={detaille ? 24 : 38}
        textAnchor="middle"
        className={estFocus ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre)]'}
        style={{ fontFamily: 'var(--font-titre)', fontSize: 14, fontWeight: 600 }}
      >
        {tronquer(personne.nomComplet, 22)}
      </text>

      {detaille && (
        <>
          {vie && (
            <text
              x={LARGEUR_NOEUD / 2}
              y={41}
              textAnchor="middle"
              className={estFocus ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre-douce)]'}
              style={{ fontSize: 11.5 }}
              opacity={0.9}
            >
              {vie}
            </text>
          )}
          {personne.naissance?.lieuCourt && (
            <text
              x={LARGEUR_NOEUD / 2}
              y={55}
              textAnchor="middle"
              className={
                estFocus ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre-tres-douce)]'
              }
              style={{ fontSize: 10.5 }}
              opacity={0.85}
            >
              {tronquer(personne.naissance.lieuCourt, 26)}
            </text>
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

function Pastille({ couleur, children }: { couleur: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: couleur }} />
      {children}
    </span>
  );
}
