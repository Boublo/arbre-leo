'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import type { PersonneArbre } from '@/lib/arbre';
import { PRENOM_RACINE } from '@/lib/branches';
import {
  ESPACEMENT_Y,
  HAUTEUR_NOEUD,
  LARGEUR_NOEUD,
  nommerGeneration,
  type Disposition,
  type ModeArbre,
  type NoeudArbre,
} from '@/lib/layout-arbre';

export type ArbreSerialise = {
  personnes: PersonneArbre[];
  disposition: Omit<Disposition, 'parGeneration'>;
  racineId: string;
};

type Props = {
  ascendance: ArbreSerialise;
  complet: ArbreSerialise;
  onSelection?: (personneId: string | null) => void;
  personneSelectionnee?: string | null;
};

const COULEUR_COTE = {
  paternelle: { trait: 'var(--paternelle)', fond: 'var(--paternelle-douce)' },
  maternelle: { trait: 'var(--maternelle)', fond: 'var(--maternelle-douce)' },
  commune: { trait: 'var(--commune)', fond: 'var(--fond-doux)' },
} as const;

/** Enlève accents et casse : une recherche sans accent doit trouver le nom accentué. */
const normaliser = (texte: string) =>
  texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function VueArbre({ ascendance, complet, onSelection, personneSelectionnee }: Props) {
  const [mode, setMode] = useState<ModeArbre>('ascendance');
  const [recherche, setRecherche] = useState('');
  const [echelle, setEchelle] = useState(1);

  const donnees = mode === 'ascendance' ? ascendance : complet;
  const { disposition } = donnees;

  const svgRef = useRef<SVGSVGElement>(null);
  const groupeRef = useRef<SVGGElement>(null);
  const comportementRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const parId = useMemo(
    () => new Map(donnees.personnes.map((p) => [p.id, p])),
    [donnees.personnes]
  );
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
      .scaleExtent([0.08, 3])
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

  /** Amène une personne au centre de l'écran, à l'échelle demandée. */
  const centrerSur = useCallback((personneId: string, k = 1) => {
    const svg = svgRef.current;
    const comportement = comportementRef.current;
    const noeud = noeudParId.get(personneId);
    if (!svg || !comportement || !noeud) return;

    const { width, height } = svg.getBoundingClientRect();
    const transformation = zoomIdentity
      .translate(width / 2 - noeud.x * k, height / 2 - noeud.y * k)
      .scale(k);

    select(svg).transition().duration(600).call(comportement.transform, transformation);
  }, [noeudParId]);

  /** Cadre l'arbre entier dans la fenêtre. */
  const toutVoir = useCallback(() => {
    const svg = svgRef.current;
    const comportement = comportementRef.current;
    if (!svg || !comportement) return;

    const { width, height } = svg.getBoundingClientRect();
    const marge = 80;
    const k = Math.min(
      (width - marge * 2) / Math.max(disposition.largeur, 1),
      (height - marge * 2) / Math.max(disposition.hauteur + HAUTEUR_NOEUD, 1),
      1.2
    );

    const transformation = zoomIdentity
      .translate(
        (width - disposition.largeur * k) / 2,
        (height - disposition.hauteur * k) / 2
      )
      .scale(k);

    select(svg).transition().duration(600).call(comportement.transform, transformation);
  }, [disposition.largeur, disposition.hauteur]);

  // Au chargement et à chaque changement de mode, on recadre sur l'ensemble.
  useEffect(() => {
    const minuteur = setTimeout(toutVoir, 60);
    return () => clearTimeout(minuteur);
  }, [toutVoir, mode]);

  // --- Recherche -------------------------------------------------------------

  const resultats = useMemo(() => {
    const q = normaliser(recherche.trim());
    if (q.length < 2) return [];
    return donnees.personnes
      .filter((p) => {
        const cible = normaliser(
          `${p.nomComplet} ${p.surnom ?? ''} ${p.naissance?.lieu ?? ''} ${p.naissance?.annee ?? ''}`
        );
        return cible.includes(q);
      })
      .slice(0, 8);
  }, [recherche, donnees.personnes]);

  const surligne = useMemo(() => new Set(resultats.map((p) => p.id)), [resultats]);

  // --- Rendu -----------------------------------------------------------------

  const generationMax = Math.max(...disposition.noeuds.map((n) => n.generation), 0);

  return (
    <div className="relative h-full w-full overflow-hidden bg-fond">
      <svg
        ref={svgRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        role="application"
        aria-label="Arbre généalogique interactif. Faites glisser pour vous déplacer, la molette pour zoomer."
      >
        <defs>
          {/* Repères de génération, en fond, pour garder le sens de lecture. */}
          <pattern id="grille" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--bordure)" opacity="0.5" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#grille)" />

        <g ref={groupeRef}>
          {/* Bandes de génération */}
          {Array.from({ length: generationMax + 1 }, (_, gen) => (
            <g key={`bande-${gen}`}>
              <text
                x={-40}
                y={(generationMax - gen) * ESPACEMENT_Y + HAUTEUR_NOEUD / 2}
                textAnchor="end"
                className="fill-[var(--encre-tres-douce)] text-[13px]"
                style={{ fontFamily: 'var(--font-titre)' }}
              >
                {nommerGeneration(gen)}
              </text>
            </g>
          ))}

          {/* Liens de filiation, sous les nœuds */}
          <g fill="none">
            {disposition.liens.map((lien) => {
              const enfant = noeudParId.get(lien.enfantId);
              const parent = noeudParId.get(lien.parentId);
              if (!enfant || !parent) return null;

              const x1 = enfant.x;
              const y1 = enfant.y;
              const x2 = parent.x;
              const y2 = parent.y + HAUTEUR_NOEUD;
              const milieu = y1 - (y1 - y2) / 2;

              return (
                <path
                  key={lien.id}
                  d={`M ${x1} ${y1} V ${milieu} H ${x2} V ${y2}`}
                  stroke={lien.reprise ? 'var(--or)' : 'var(--bordure-forte)'}
                  strokeWidth={lien.reprise ? 2 : 1.5}
                  strokeDasharray={lien.reprise ? '5 4' : undefined}
                  opacity={0.85}
                />
              );
            })}
          </g>

          {/* Traits d'union entre conjoints */}
          <g fill="none">
            {disposition.unions.map((union) => {
              const a = noeudParId.get(union.aId);
              const b = noeudParId.get(union.bId);
              if (!a || !b || a.generation !== b.generation) return null;
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
                personne={parId.get(noeud.personneId)}
                racine={noeud.personneId === donnees.racineId}
                selectionne={personneSelectionnee === noeud.personneId}
                surligne={surligne.size > 0 && surligne.has(noeud.personneId)}
                attenue={surligne.size > 0 && !surligne.has(noeud.personneId)}
                detaille={echelle > 0.45}
                onClick={() => onSelection?.(noeud.personneId)}
              />
            ))}
          </g>
        </g>
      </svg>

      {/* --- Commandes --------------------------------------------------- */}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="carte flex items-center gap-2 p-2">
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Chercher un nom, un lieu, une année…"
              aria-label="Chercher dans l'arbre"
              className="w-64 bg-transparent px-2 py-1 text-sm text-encre outline-none placeholder:text-encre-tres-douce"
            />
          </div>

          {resultats.length > 0 && (
            <ul className="carte max-h-72 w-72 overflow-y-auto p-1 text-sm">
              {resultats.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      centrerSur(p.id, 1);
                      onSelection?.(p.id);
                      setRecherche('');
                    }}
                    className="w-full rounded-[var(--rayon-petit)] px-2 py-1.5 text-left hover:bg-fond-doux"
                  >
                    <span className="font-medium">{p.nomComplet}</span>
                    {p.naissance?.annee && (
                      <span className="text-encre-tres-douce"> · {p.naissance.annee}</span>
                    )}
                    {p.naissance?.lieuCourt && (
                      <span className="block text-xs text-encre-tres-douce">
                        {p.naissance.lieuCourt}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pointer-events-auto carte flex items-center gap-1 p-1 text-sm">
          <BoutonMode actif={mode === 'ascendance'} onClick={() => setMode('ascendance')}>
            Ligne directe
          </BoutonMode>
          <BoutonMode actif={mode === 'complet'} onClick={() => setMode('complet')}>
            Toute la famille
          </BoutonMode>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="pointer-events-auto carte flex items-center gap-4 px-3 py-2 text-xs text-encre-douce">
          <Pastille couleur="var(--paternelle)">Côté paternel</Pastille>
          <Pastille couleur="var(--maternelle)">Côté maternel</Pastille>
          <Pastille couleur="var(--or)">Union</Pastille>
          <span>
            {disposition.noeuds.length} personnes · {generationMax + 1} générations
          </span>
        </div>

        <div className="pointer-events-auto carte flex items-center gap-1 p-1">
          <BoutonRond
            titre={`Recentrer sur ${PRENOM_RACINE}`}
            onClick={() => centrerSur(donnees.racineId, 1)}
          >
            ◎
          </BoutonRond>
          <BoutonRond titre="Voir tout l'arbre" onClick={toutVoir}>
            ⤢
          </BoutonRond>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Noeud({
  noeud,
  personne,
  racine,
  selectionne,
  surligne,
  attenue,
  detaille,
  onClick,
}: {
  noeud: NoeudArbre;
  personne: PersonneArbre | undefined;
  racine: boolean;
  selectionne: boolean;
  surligne: boolean;
  attenue: boolean;
  detaille: boolean;
  onClick: () => void;
}) {
  if (!personne) return null;

  const couleurs = COULEUR_COTE[noeud.cote];
  const naissance = personne.naissance?.annee;
  const deces = personne.deces?.annee;

  // « 1886–1954 », « né en 1993 », « 1886– » quand la mort n'est pas connue.
  const vie = naissance
    ? deces
      ? `${naissance} – ${deces}`
      : personne.presumeVivant
        ? `né${personne.sexe === 'F' ? 'e' : ''} en ${naissance}`
        : `${naissance} – ?`
    : deces
      ? `† ${deces}`
      : null;

  return (
    <g
      transform={`translate(${noeud.x - LARGEUR_NOEUD / 2}, ${noeud.y})`}
      onClick={onClick}
      className="cursor-pointer"
      opacity={attenue ? 0.25 : 1}
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
        fill={racine ? 'var(--accent)' : couleurs.fond}
        stroke={selectionne || surligne ? 'var(--accent)' : couleurs.trait}
        strokeWidth={selectionne ? 3 : surligne ? 2.5 : noeud.lignee ? 1.5 : 1}
        strokeDasharray={noeud.lignee ? undefined : '4 3'}
      />

      {/* Un liseré rappelle les personnes encore vivantes : leurs données
          méritent plus de retenue si l'arbre est montré à l'extérieur. */}
      {personne.presumeVivant && !racine && (
        <rect x={0} y={0} width={4} height={HAUTEUR_NOEUD} rx={2} fill="var(--succes)" opacity={0.7} />
      )}

      <text
        x={LARGEUR_NOEUD / 2}
        y={detaille ? 24 : 38}
        textAnchor="middle"
        className={racine ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre)]'}
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
              className={racine ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre-douce)]'}
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
              className={racine ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre-tres-douce)]'}
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

function BoutonMode({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`rounded-[var(--rayon-petit)] px-3 py-1.5 transition ${
        actif ? 'bg-accent text-accent-contraste' : 'text-encre-douce hover:bg-fond-doux'
      }`}
    >
      {children}
    </button>
  );
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
