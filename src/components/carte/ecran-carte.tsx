'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { CurseurPeriode } from '@/components/carte/curseur-periode';
import { FondCarte } from '@/components/carte/fond-carte';
import { PanneauLieu } from '@/components/carte/panneau-lieu';
import {
  calculerCadre,
  contraindre,
  versEcran,
  type Transformation,
} from '@/components/carte/projection';
import type { DonneesCarte, LieuSitue } from '@/components/carte/types-carte';
import { COULEUR_COTE, LIBELLES_COTE } from '@/components/carte/vocabulaire';
import type { Cote } from '@/lib/branches';

const ECHELLE_MAX = 14;
const RAYON_MIN = 5;
const RAYON_MAX = 20;
/** Rayon d'un lieu sans événement dans la période retenue. */
const RAYON_ENDORMI = 3.5;

type PointCarte = {
  lieu: LieuSitue;
  nombre: number;
  actif: boolean;
  x: number;
  y: number;
  rayon: number;
};

/**
 * La carte des lieux et des migrations.
 *
 * Tout est dessiné à la main en SVG : le fond, les points, les traits de
 * déplacement. Le zoom est confié à d3-zoom, déjà présent pour l'arbre, mais
 * les positions sont recalculées ici afin que les points et les noms gardent
 * leur taille quel que soit l'agrandissement.
 */
export function EcranCarte({ donnees }: { donnees: DonneesCarte }) {
  const [debut, setDebut] = useState(donnees.anneeMin);
  const [fin, setFin] = useState(donnees.anneeMax);
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [survolId, setSurvolId] = useState<string | null>(null);
  const [montrerDeplacements, setMontrerDeplacements] = useState(true);
  const [taille, setTaille] = useState({ largeur: 0, hauteur: 0 });
  const [transformation, setTransformation] = useState<Transformation>({ k: 1, x: 0, y: 0 });

  const conteneurRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const comportementRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  // Le gestionnaire de zoom a besoin de la transformation courante sans être
  // réattaché à chaque déplacement. On la recopie dans une ref après le rendu :
  // l'écrire pendant le rendu rendrait le composant impur.
  const transformationRef = useRef(transformation);
  useEffect(() => {
    transformationRef.current = transformation;
  }, [transformation]);

  // --- Mesure du cadre -------------------------------------------------------

  useEffect(() => {
    const element = conteneurRef.current;
    if (!element) return;

    const observateur = new ResizeObserver((entrees) => {
      const boite = entrees[0]?.contentRect;
      if (!boite) return;
      setTaille({ largeur: Math.round(boite.width), hauteur: Math.round(boite.height) });
    });
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  const cadre = useMemo(
    () => calculerCadre(donnees.lieux, taille.largeur, taille.hauteur),
    [donnees.lieux, taille.largeur, taille.hauteur]
  );

  const pret = cadre.largeur > 60 && cadre.hauteur > 60;

  // La planche est centrée dans la place disponible : le reste est du papier.
  const decalageX = Math.round((taille.largeur - cadre.largeur) / 2);
  const decalageY = Math.round((taille.hauteur - cadre.hauteur) / 2);

  // --- Zoom et déplacement ---------------------------------------------------

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !pret) return;

    const comportement = zoom<SVGSVGElement, unknown>()
      .extent([
        [0, 0],
        [cadre.largeur, cadre.hauteur],
      ])
      .translateExtent([
        [0, 0],
        [cadre.largeur, cadre.hauteur],
      ])
      .scaleExtent([1, ECHELLE_MAX])
      .on('zoom', (evenement) => {
        const { k, x, y } = evenement.transform;
        setTransformation({ k, x, y });
      });

    comportementRef.current = comportement;
    const selection = select(svg);
    selection.call(comportement).on('dblclick.zoom', null);

    // La planche a changé de taille : on replace la vue dans ses nouvelles bornes.
    const ajustee = contraindre(transformationRef.current, cadre.largeur, cadre.hauteur, ECHELLE_MAX);
    selection.call(
      comportement.transform,
      zoomIdentity.translate(ajustee.x, ajustee.y).scale(ajustee.k)
    );

    return () => {
      selection.on('.zoom', null);
    };
  }, [pret, cadre.largeur, cadre.hauteur]);

  const appliquer = useCallback(
    (cible: Transformation) => {
      const svg = svgRef.current;
      const comportement = comportementRef.current;
      if (!svg || !comportement) return;
      const ajustee = contraindre(cible, cadre.largeur, cadre.hauteur, ECHELLE_MAX);
      select(svg).call(
        comportement.transform,
        zoomIdentity.translate(ajustee.x, ajustee.y).scale(ajustee.k)
      );
    },
    [cadre.largeur, cadre.hauteur]
  );

  const zoomer = useCallback(
    (facteur: number) => {
      const actuelle = transformationRef.current;
      const k = Math.min(Math.max(actuelle.k * facteur, 1), ECHELLE_MAX);
      const cx = cadre.largeur / 2;
      const cy = cadre.hauteur / 2;
      appliquer({
        k,
        x: cx - ((cx - actuelle.x) / actuelle.k) * k,
        y: cy - ((cy - actuelle.y) / actuelle.k) * k,
      });
    },
    [appliquer, cadre.largeur, cadre.hauteur]
  );

  const deplacer = useCallback(
    (dx: number, dy: number) => {
      const actuelle = transformationRef.current;
      appliquer({ k: actuelle.k, x: actuelle.x + dx, y: actuelle.y + dy });
    },
    [appliquer]
  );

  // --- Période ---------------------------------------------------------------

  const changerPeriode = useCallback((nouveauDebut: number, nouvelleFin: number) => {
    setDebut(nouveauDebut);
    setFin(nouvelleFin);
  }, []);

  // --- Points ----------------------------------------------------------------

  const sommet = useMemo(
    () => donnees.lieux.reduce((maximum, lieu) => Math.max(maximum, lieu.evenements.length), 1),
    [donnees.lieux]
  );

  const points = useMemo<PointCarte[]>(() => {
    return donnees.lieux.map((lieu) => {
      const nombre = lieu.evenements.filter(
        (evenement) =>
          evenement.annee !== null && evenement.annee >= debut && evenement.annee <= fin
      ).length;
      const position = versEcran(cadre, transformation, lieu.longitude, lieu.latitude);
      return {
        lieu,
        nombre,
        actif: nombre > 0,
        x: position.x,
        y: position.y,
        rayon: nombre > 0 ? rayonDe(nombre, sommet) : RAYON_ENDORMI,
      };
    });
  }, [donnees.lieux, cadre, transformation, debut, fin, sommet]);

  const nbActifs = points.filter((point) => point.actif).length;

  // Les noms se marchent sur les pieds dès qu'on dézoome : on garde les plus
  // parlants et on laisse les autres au zoom.
  const etiquettes = useMemo(() => {
    const poids = (point: PointCarte) =>
      point.lieu.id === selectionId ? 3 : point.lieu.id === survolId ? 2 : point.actif ? 1 : 0;

    const classes = [...points].sort((a, b) => poids(b) - poids(a) || b.nombre - a.nombre);
    const prises: { x1: number; x2: number; y1: number; y2: number }[] = [];
    const retenus = new Set<string>();

    for (const point of classes) {
      if (poids(point) === 0) continue;
      if (point.x < -40 || point.x > cadre.largeur + 40) continue;
      if (point.y < -20 || point.y > cadre.hauteur + 20) continue;

      const demiLargeur = point.lieu.nom.length * 3.4 + 6;
      const boite = {
        x1: point.x - demiLargeur,
        x2: point.x + demiLargeur,
        y1: point.y + point.rayon + 1,
        y2: point.y + point.rayon + 15,
      };
      if (prises.some((prise) => chevauche(prise, boite))) continue;
      prises.push(boite);
      retenus.add(point.lieu.id);
    }
    return retenus;
  }, [points, selectionId, survolId, cadre.largeur, cadre.hauteur]);

  // --- Déplacements ----------------------------------------------------------

  const arcs = useMemo(() => {
    if (!montrerDeplacements) return [];

    const parLieu = new Map(donnees.lieux.map((lieu) => [lieu.id, lieu]));
    const paires = new Map<
      string,
      { deId: string; versId: string; cote: Cote; noms: string[]; nombre: number }
    >();

    for (const pas of donnees.deplacements) {
      if (pas.annee < debut || pas.annee > fin) continue;
      if (!parLieu.has(pas.deId) || !parLieu.has(pas.versId)) continue;

      const cle = `${pas.deId}>${pas.versId}`;
      const existante = paires.get(cle);
      if (existante) {
        existante.nombre += 1;
        if (!existante.noms.includes(pas.nom)) existante.noms.push(pas.nom);
      } else {
        paires.set(cle, { deId: pas.deId, versId: pas.versId, cote: pas.cote, noms: [pas.nom], nombre: 1 });
      }
    }

    return [...paires.entries()].flatMap(([cle, paire]) => {
      const depart = parLieu.get(paire.deId);
      const arrivee = parLieu.get(paire.versId);
      if (!depart || !arrivee) return [];

      const a = versEcran(cadre, transformation, depart.longitude, depart.latitude);
      const b = versEcran(cadre, transformation, arrivee.longitude, arrivee.latitude);
      if (Math.hypot(b.x - a.x, b.y - a.y) < 3) return [];

      return [
        {
          cle,
          chemin: arcCourbe(a, b),
          cote: paire.cote,
          epaisseur: 1 + Math.min(paire.nombre, 6) * 0.45,
          titre: `${depart.nom} → ${arrivee.nom} · ${paire.noms.slice(0, 4).join(', ')}${
            paire.noms.length > 4 ? ` et ${paire.noms.length - 4} autres` : ''
          }`,
        },
      ];
    });
  }, [donnees.lieux, donnees.deplacements, montrerDeplacements, debut, fin, cadre, transformation]);

  // --- Sélection -------------------------------------------------------------

  const selection = useMemo(
    () => donnees.lieux.find((lieu) => lieu.id === selectionId) ?? null,
    [donnees.lieux, selectionId]
  );

  const apercu = useMemo(() => {
    const identifiant = survolId ?? selectionId;
    return points.find((point) => point.lieu.id === identifiant) ?? null;
  }, [points, survolId, selectionId]);

  if (donnees.lieux.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="max-w-md text-encre-douce">
          Aucun lieu de la base ne porte encore de coordonnées : la carte reste vide
          tant que les latitudes et longitudes n’ont pas été renseignées.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <div ref={conteneurRef} className="relative min-w-0 flex-1">
        <svg
          ref={svgRef}
          width={cadre.largeur}
          height={cadre.hauteur}
          style={{ left: decalageX, top: decalageY }}
          className="shadow-douce absolute cursor-grab touch-none active:cursor-grabbing"
          role="application"
          tabIndex={0}
          aria-label="Carte des lieux de la famille. Flèches pour se déplacer, plus et moins pour zoomer, zéro pour revenir à la vue d’ensemble."
          onKeyDown={(evenement) => {
            const pas = 70;
            switch (evenement.key) {
              case 'ArrowUp': deplacer(0, pas); break;
              case 'ArrowDown': deplacer(0, -pas); break;
              case 'ArrowLeft': deplacer(pas, 0); break;
              case 'ArrowRight': deplacer(-pas, 0); break;
              case '+': case '=': zoomer(1.4); break;
              case '-': case '_': zoomer(1 / 1.4); break;
              case '0': appliquer({ k: 1, x: 0, y: 0 }); break;
              case 'Escape': setSelectionId(null); break;
              default: return;
            }
            evenement.preventDefault();
          }}
        >
          {pret && (
            <>
              <defs>
                {(Object.keys(COULEUR_COTE) as Cote[]).map((cote) => (
                  <marker
                    key={cote}
                    id={`fleche-${cote}`}
                    viewBox="0 0 8 8"
                    refX={7}
                    refY={4}
                    markerWidth={7}
                    markerHeight={7}
                    markerUnits="userSpaceOnUse"
                    orient="auto"
                  >
                    <path d="M0 0 L8 4 L0 8 Z" fill={COULEUR_COTE[cote]} opacity={0.75} />
                  </marker>
                ))}
              </defs>

              <FondCarte cadre={cadre} transformation={transformation} lieux={donnees.lieux} />

              {/* Les déplacements passent sous les points. */}
              <g fill="none">
                {arcs.map((arc) => (
                  <path
                    key={arc.cle}
                    d={arc.chemin}
                    stroke={COULEUR_COTE[arc.cote]}
                    strokeWidth={arc.epaisseur}
                    strokeLinecap="round"
                    opacity={0.45}
                    markerEnd={`url(#fleche-${arc.cote})`}
                  >
                    <title>{arc.titre}</title>
                  </path>
                ))}
              </g>

              <g>
                {points.map((point) => (
                  <PointLieu
                    key={point.lieu.id}
                    point={point}
                    nomme={etiquettes.has(point.lieu.id)}
                    selectionne={point.lieu.id === selectionId}
                    survole={point.lieu.id === survolId}
                    surEntree={() => setSurvolId(point.lieu.id)}
                    surSortie={() => setSurvolId(null)}
                    surChoix={() =>
                      setSelectionId((actuel) => (actuel === point.lieu.id ? null : point.lieu.id))
                    }
                  />
                ))}
              </g>

              {/* Le cadre de la planche, comme le filet d'une gravure. */}
              <rect
                x={0.5}
                y={0.5}
                width={cadre.largeur - 1}
                height={cadre.hauteur - 1}
                fill="none"
                stroke="var(--bordure-forte)"
                strokeWidth={1}
                pointerEvents="none"
              />
            </>
          )}
        </svg>

        {/* Ce que la carte montre, pour qui ne la voit pas. */}
        <ul className="sr-only">
          {points.map((point) => (
            <li key={point.lieu.id}>
              {point.lieu.nom} — {point.lieu.libelle} —{' '}
              {point.nombre === 0
                ? 'aucun événement dans la période affichée'
                : `${point.nombre} événement${point.nombre > 1 ? 's' : ''} entre ${debut} et ${fin}`}
            </li>
          ))}
        </ul>

        {apercu && (
          <div
            className="carte pointer-events-none absolute z-10 max-w-[16rem] -translate-x-1/2 -translate-y-full px-3 py-2"
            style={{
              left:
                decalageX +
                Math.min(Math.max(apercu.x, 90), Math.max(cadre.largeur - 90, 90)),
              top: decalageY + Math.max(apercu.y - apercu.rayon - 10, 54),
            }}
          >
            <p className="text-sm font-medium text-encre">{apercu.lieu.nom}</p>
            {apercu.lieu.precision && (
              <p className="text-xs text-encre-tres-douce">{apercu.lieu.precision}</p>
            )}
            <p className="mt-1 text-xs text-encre-douce">
              {apercu.nombre === 0
                ? 'Aucun événement dans la période'
                : `${apercu.nombre} événement${apercu.nombre > 1 ? 's' : ''}`}
              {' · '}
              {LIBELLES_COTE[apercu.lieu.cote].toLowerCase()}
            </p>
            {apercu.lieu.id !== selectionId && (
              <p className="mt-1 text-xs text-encre-tres-douce">Cliquer pour voir qui y passe.</p>
            )}
          </div>
        )}

        {/* --- Légende --------------------------------------------------- */}
        <div className="carte pointer-events-none absolute left-4 top-4 max-w-xs p-3 text-xs text-encre-douce">
          <p className="mb-2 text-encre">
            <span className="tabular-nums">{nbActifs}</span> lieu{nbActifs > 1 ? 'x' : ''} entre{' '}
            <span className="tabular-nums">{debut}</span> et <span className="tabular-nums">{fin}</span>
          </p>
          <ul className="flex flex-col gap-1">
            <li className="flex items-center gap-2">
              <Pastille couleur={COULEUR_COTE.paternelle} /> Côté paternel
            </li>
            <li className="flex items-center gap-2">
              <Pastille couleur={COULEUR_COTE.maternelle} /> Côté maternel
            </li>
            <li className="flex items-center gap-2">
              <Pastille couleur={COULEUR_COTE.commune} /> Les deux branches
            </li>
          </ul>
          <p className="mt-2 text-encre-tres-douce">
            La taille du point dit le nombre d’événements. Un cercle vide et pointillé
            marque un lieu sans événement dans la période. La flèche va du lieu quitté
            au lieu rejoint.
          </p>
        </div>

        {/* --- Commandes ------------------------------------------------- */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="carte pointer-events-auto w-full max-w-sm p-3">
            <CurseurPeriode
              anneeMin={donnees.anneeMin}
              anneeMax={donnees.anneeMax}
              debut={debut}
              fin={fin}
              annees={donnees.annees}
              surChangement={changerPeriode}
            />
            <label className="mt-3 flex items-center gap-2 text-xs text-encre-douce">
              <input
                type="checkbox"
                checked={montrerDeplacements}
                onChange={(evenement) => setMontrerDeplacements(evenement.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Montrer les déplacements d’une vie à l’autre
            </label>
          </div>

          <div className="carte pointer-events-auto flex items-center gap-1 p-1">
            <BoutonRond titre="Agrandir" onClick={() => zoomer(1.4)}>
              +
            </BoutonRond>
            <BoutonRond titre="Réduire" onClick={() => zoomer(1 / 1.4)}>
              −
            </BoutonRond>
            <BoutonRond titre="Revoir toute la carte" onClick={() => appliquer({ k: 1, x: 0, y: 0 })}>
              ⤢
            </BoutonRond>
          </div>
        </div>
      </div>

      {selection && (
        <aside className="w-full max-w-sm shrink-0 overflow-y-auto border-l border-bordure bg-fond-carte">
          <PanneauLieu
            lieu={selection}
            debut={debut}
            fin={fin}
            surFermeture={() => setSelectionId(null)}
          />
        </aside>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PointLieu({
  point,
  nomme,
  selectionne,
  survole,
  surEntree,
  surSortie,
  surChoix,
}: {
  point: PointCarte;
  nomme: boolean;
  selectionne: boolean;
  survole: boolean;
  surEntree: () => void;
  surSortie: () => void;
  surChoix: () => void;
}) {
  const couleur = COULEUR_COTE[point.lieu.cote];
  const enAvant = selectionne || survole;

  return (
    <g
      role="button"
      tabIndex={point.actif ? 0 : -1}
      aria-label={`${point.lieu.nom}, ${point.nombre} événement${point.nombre > 1 ? 's' : ''}`}
      aria-pressed={selectionne}
      className="cursor-pointer outline-none"
      onMouseEnter={surEntree}
      onMouseLeave={surSortie}
      onFocus={surEntree}
      onBlur={surSortie}
      onClick={surChoix}
      onKeyDown={(evenement) => {
        if (evenement.key === 'Enter' || evenement.key === ' ') {
          evenement.preventDefault();
          surChoix();
        }
      }}
    >
      {enAvant && (
        <circle
          cx={point.x}
          cy={point.y}
          r={point.rayon + 5}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          opacity={0.8}
        />
      )}
      <circle
        cx={point.x}
        cy={point.y}
        r={point.rayon}
        fill={point.actif ? couleur : 'none'}
        fillOpacity={0.3}
        stroke={couleur}
        strokeWidth={point.actif ? 1.8 : 1.2}
        strokeDasharray={point.actif ? undefined : '2 2'}
        opacity={point.actif ? 1 : 0.55}
      />
      {nomme && (
        <text
          x={point.x}
          y={point.y + point.rayon + 12}
          textAnchor="middle"
          className="pointer-events-none"
          fill="var(--encre)"
          opacity={point.actif ? 1 : 0.6}
          style={{
            fontFamily: 'var(--font-titre)',
            fontSize: 12,
            fontWeight: enAvant ? 600 : 500,
            paintOrder: 'stroke',
            stroke: 'var(--fond-carte)',
            strokeWidth: 3,
            strokeLinejoin: 'round',
          }}
        >
          {point.lieu.nom}
        </text>
      )}
    </g>
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

function Pastille({ couleur }: { couleur: string }) {
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: couleur }} aria-hidden />;
}

// ---------------------------------------------------------------------------

function rayonDe(nombre: number, sommet: number): number {
  return RAYON_MIN + (RAYON_MAX - RAYON_MIN) * Math.sqrt(nombre / Math.max(sommet, 1));
}

/** Un arc légèrement bombé : deux trajets inverses ne se superposent pas. */
function arcCourbe(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const milieuX = (a.x + b.x) / 2;
  const milieuY = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const courbure = 0.16;
  return `M${a.x} ${a.y} Q${milieuX - dy * courbure} ${milieuY + dx * courbure} ${b.x} ${b.y}`;
}

function chevauche(
  a: { x1: number; x2: number; y1: number; y2: number },
  b: { x1: number; x2: number; y1: number; y2: number }
): boolean {
  return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
}
