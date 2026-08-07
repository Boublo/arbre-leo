'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { CurseurPeriode } from '@/components/carte/curseur-periode';
import { FondCarte } from '@/components/carte/fond-carte';
import { PanneauLieu } from '@/components/carte/panneau-lieu';
import { PanneauMobile } from '@/components/interactions/panneau-mobile';
import {
  calculerCadre,
  contraindre,
  versEcran,
  type Transformation,
} from '@/components/carte/projection';
import type { DonneesCarte, LieuSitue, PersonneLiee } from '@/components/carte/types-carte';
import { COULEUR_COTE, LIBELLES_COTE } from '@/components/carte/vocabulaire';
import type { Cote } from '@/lib/branches';

const ECHELLE_MAX = 14;
const RAYON_MIN = 5;
const RAYON_MAX = 20;
/** Rayon d'un lieu sans événement dans la période retenue. */
const RAYON_ENDORMI = 3.5;

/** Seuils de zoom où la légende de bas de carte change de granularité. */
const ZOOM_REGION = 2.4;
const ZOOM_VILLE = 5.5;

type NiveauLegende = 'pays' | 'region' | 'ville';

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
export function EcranCarte({
  donnees,
  lieuInitialId = null,
  personneInitiale = null,
}: {
  donnees: DonneesCarte;
  /** Lien profond ?lieu=… : ouvre directement le panneau du lieu demandé. */
  lieuInitialId?: string | null;
  /** Lien profond ?personne=… : limite la lecture à son parcours connu. */
  personneInitiale?: PersonneLiee | null;
}) {
  const [debut, setDebut] = useState(donnees.anneeMin);
  const [fin, setFin] = useState(donnees.anneeMax);
  const [selectionId, setSelectionId] = useState<string | null>(lieuInitialId);
  const [survolId, setSurvolId] = useState<string | null>(null);
  const [montrerDeplacements, setMontrerDeplacements] = useState(true);
  const [montrerFlux, setMontrerFlux] = useState(false);
  const [legendeOuverte, setLegendeOuverte] = useState(false);
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

  const lieuxVisibles = useMemo(
    () =>
      personneInitiale
        ? donnees.lieux.filter((lieu) => lieu.personnes.some((personne) => personne.id === personneInitiale.id))
        : donnees.lieux,
    [donnees.lieux, personneInitiale],
  );

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
    () => calculerCadre(lieuxVisibles, taille.largeur, taille.hauteur),
    [lieuxVisibles, taille.largeur, taille.hauteur]
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
    () =>
      lieuxVisibles.reduce(
        (maximum, lieu) =>
          Math.max(
            maximum,
            personneInitiale
              ? lieu.evenements.filter((evenement) =>
                  evenement.personnes.some((personne) => personne.id === personneInitiale.id),
                ).length
              : lieu.evenements.length,
          ),
        1,
      ),
    [lieuxVisibles, personneInitiale],
  );

  const points = useMemo<PointCarte[]>(() => {
    return lieuxVisibles.map((lieu) => {
      const nombre = lieu.evenements.filter(
        (evenement) =>
          evenement.annee !== null &&
          evenement.annee >= debut &&
          evenement.annee <= fin &&
          (!personneInitiale || evenement.personnes.some((personne) => personne.id === personneInitiale.id))
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
  }, [lieuxVisibles, cadre, transformation, debut, fin, sommet, personneInitiale]);

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

    const parLieu = new Map(points.map((point) => [point.lieu.id, point]));
    const paires = new Map<
      string,
      { deId: string; versId: string; cote: Cote; noms: string[]; nombre: number }
    >();

    for (const pas of donnees.deplacements) {
      if (personneInitiale && pas.personneId !== personneInitiale.id) continue;
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

      // Le trait s'arrête au bord des deux points : la flèche reste lisible.
      const trait = raccourcir(depart, arrivee, depart.rayon + 2, arrivee.rayon + 5);
      if (!trait) return [];

      return [
        {
          cle,
          chemin: arcCourbe(trait.a, trait.b, 0.16),
          cote: paire.cote,
          epaisseur: 1 + Math.min(paire.nombre, 6) * 0.45,
          titre: `${depart.lieu.nom} → ${arrivee.lieu.nom} · ${paire.noms.slice(0, 4).join(', ')}${
            paire.noms.length > 4 ? ` et ${paire.noms.length - 4} autres` : ''
          }`,
        },
      ];
    });
  }, [points, donnees.deplacements, montrerDeplacements, debut, fin, personneInitiale]);

  // --- Flux : naissance → décès ---------------------------------------------

  const fluxAffiches = useMemo(() => {
    if (!montrerFlux) return [];

    const parLieu = new Map(points.map((point) => [point.lieu.id, point]));

    return donnees.flux.flatMap((vie) => {
      if (personneInitiale && vie.personneId !== personneInitiale.id) return [];
      // La vie doit chevaucher la période affichée pour valoir la peine.
      if (vie.anneeDeces < debut || vie.anneeNaissance > fin) return [];

      const depart = parLieu.get(vie.naissanceId);
      const arrivee = parLieu.get(vie.decesId);
      if (!depart || !arrivee) return [];

      const trait = raccourcir(depart, arrivee, depart.rayon + 2, arrivee.rayon + 5);
      if (!trait) return [];

      return [
        {
          cle: vie.id,
          chemin: arcCourbe(trait.a, trait.b, 0.28),
          cote: vie.cote,
          titre: `${vie.nom} · ${depart.lieu.nom} (${vie.anneeNaissance}) → ${arrivee.lieu.nom} (${vie.anneeDeces})`,
        },
      ];
    });
  }, [points, donnees.flux, montrerFlux, debut, fin, personneInitiale]);

  // --- Sélection -------------------------------------------------------------

  const selection = useMemo(
    () => lieuxVisibles.find((lieu) => lieu.id === selectionId) ?? null,
    [lieuxVisibles, selectionId]
  );

  // L'étiquette flottante ne suit que le survol : la sélection, elle, ouvre
  // le panneau de droite et n'a pas besoin d'être redite.
  const apercu = useMemo(
    () => points.find((point) => point.lieu.id === survolId) ?? null,
    [points, survolId]
  );

  // --- Légende dynamique : granularité selon le zoom ------------------------

  const niveauLegende: NiveauLegende =
    transformation.k >= ZOOM_VILLE ? 'ville' : transformation.k >= ZOOM_REGION ? 'region' : 'pays';

  const groupesLegende = useMemo(
    () => grouperPourLegende(points, niveauLegende),
    [points, niveauLegende]
  );

  if (lieuxVisibles.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="max-w-md text-encre-douce">
          {personneInitiale
            ? `Aucun lieu situé n’est encore rattaché à ${personneInitiale.nom}.`
            : 'Aucun lieu de la base ne porte encore de coordonnées : la carte reste vide tant que les latitudes et longitudes n’ont pas été renseignées.'}
        </p>
        {personneInitiale && (
          <Link href="/carte" className="lien-discret text-sm">
            Voir toute la carte familiale
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <div ref={conteneurRef} className="relative min-w-0 flex-1">
        {personneInitiale && (
          <p className="carte pointer-events-auto absolute left-4 top-4 z-30 hidden max-w-xs px-3 py-2 text-xs text-encre-douce sm:block">
            Parcours de <span className="font-medium text-encre">{personneInitiale.nom}</span>{' '}
            <Link href="/carte" className="lien-discret">
              Voir toute la carte
            </Link>
          </p>
        )}
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
                {(Object.keys(COULEUR_COTE) as Cote[]).map((cote) => (
                  <marker
                    key={`vie-${cote}`}
                    id={`vie-${cote}`}
                    viewBox="0 0 8 8"
                    refX={7}
                    refY={4}
                    markerWidth={6}
                    markerHeight={6}
                    markerUnits="userSpaceOnUse"
                    orient="auto"
                  >
                    <path d="M0 0 L8 4 L0 8 Z" fill={COULEUR_COTE[cote]} opacity={0.55} />
                  </marker>
                ))}
              </defs>

              <FondCarte cadre={cadre} transformation={transformation} lieux={lieuxVisibles} />

              {/* Les vies entières passent sous les déplacements pour laisser
                  lisible ce qui compte davantage à un moment donné. */}
              {fluxAffiches.length > 0 && (
                <g fill="none">
                  {fluxAffiches.map((vie) => (
                    <path
                      key={vie.cle}
                      d={vie.chemin}
                      stroke={COULEUR_COTE[vie.cote]}
                      strokeWidth={1.1}
                      strokeLinecap="round"
                      strokeDasharray="4 3"
                      opacity={0.35}
                      markerEnd={`url(#vie-${vie.cote})`}
                    >
                      <title>{vie.titre}</title>
                    </path>
                  ))}
                </g>
              )}

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

        <button
          type="button"
          onClick={() => setLegendeOuverte((ouvert) => !ouvert)}
          aria-expanded={legendeOuverte}
          aria-controls="carte-legende-mobile"
          className="carte pointer-events-auto absolute left-3 top-3 z-20 grid min-h-11 place-items-center rounded-[var(--rayon-petit)] px-3 text-xs font-medium text-encre sm:hidden"
        >
          {legendeOuverte ? 'Masquer' : 'Légende'}
        </button>

        {legendeOuverte && (
          <div
            id="carte-legende-mobile"
            className="carte pointer-events-auto absolute inset-x-3 top-14 z-20 max-h-[min(50dvh,20rem)] overflow-y-auto p-3 text-xs text-encre-douce sm:hidden"
          >
            <LegendeCouleurs nbActifs={nbActifs} debut={debut} fin={fin} />
            <div className="mt-3 border-t border-bordure pt-3">
              <LegendeNiveau niveau={niveauLegende} groupes={groupesLegende} />
            </div>
          </div>
        )}

        {/* --- Légende des couleurs et des symboles --------------------- */}
        <div
          className={`carte pointer-events-none absolute left-4 hidden max-w-xs p-3 text-xs text-encre-douce sm:block ${
            personneInitiale ? 'top-16' : 'top-4'
          }`}
        >
          <LegendeCouleurs nbActifs={nbActifs} debut={debut} fin={fin} />
        </div>

        {/* --- Légende dynamique de bas de carte : pays → région → ville */}
        <div className="carte pointer-events-none absolute right-4 top-4 hidden max-w-xs p-3 text-xs text-encre-douce sm:block">
          <LegendeNiveau niveau={niveauLegende} groupes={groupesLegende} />
        </div>

        {/* --- Commandes ------------------------------------------------- */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3 sm:p-4">
          <div className="carte pointer-events-auto w-full max-w-sm p-3">
            <CurseurPeriode
              anneeMin={donnees.anneeMin}
              anneeMax={donnees.anneeMax}
              debut={debut}
              fin={fin}
              annees={donnees.annees}
              annotations={donnees.annotations}
              surChangement={changerPeriode}
            />
            <div className="mt-3 flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-xs text-encre-douce">
                <input
                  type="checkbox"
                  checked={montrerDeplacements}
                  onChange={(evenement) => setMontrerDeplacements(evenement.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                Montrer les déplacements d’une vie à l’autre
              </label>
              <label className="flex items-center gap-2 text-xs text-encre-douce">
                <input
                  type="checkbox"
                  checked={montrerFlux}
                  onChange={(evenement) => setMontrerFlux(evenement.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                Tracer les vies&nbsp;: de la naissance au décès
                <span className="text-encre-tres-douce">
                  ({personneInitiale ? donnees.flux.filter((flux) => flux.personneId === personneInitiale.id).length : donnees.flux.length})
                </span>
              </label>
            </div>
          </div>

          <div className="carte pointer-events-auto flex w-fit items-center gap-1 self-end p-1">
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
        <aside className="hidden w-full max-w-sm shrink-0 overflow-y-auto border-l border-bordure bg-fond-carte lg:block">
          <PanneauLieu
            lieu={selection}
            debut={debut}
            fin={fin}
            surFermeture={() => setSelectionId(null)}
          />
        </aside>
      )}

      <PanneauMobile
        ouvert={selection !== null}
        onFermer={() => setSelectionId(null)}
        etiquette={selection?.nom}
      >
        {selection && (
          <PanneauLieu
            lieu={selection}
            debut={debut}
            fin={fin}
            surFermeture={() => setSelectionId(null)}
          />
        )}
      </PanneauMobile>
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
          className="carte-pastille-lieu"
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
        className="carte-pastille-lieu"
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

function LegendeCouleurs({
  nbActifs,
  debut,
  fin,
}: {
  nbActifs: number;
  debut: number;
  fin: number;
}) {
  return (
    <>
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
        La taille du point dit le nombre d’événements. Un cercle vide et pointillé marque un lieu
        sans événement dans la période. La flèche pleine va du lieu quitté au lieu rejoint&nbsp;;
        le trait pointillé va d’une naissance à un décès.
      </p>
    </>
  );
}

type GroupeLegende = { libelle: string; nombre: number; evenements: number };

function LegendeNiveau({
  niveau,
  groupes,
}: {
  niveau: NiveauLegende;
  groupes: GroupeLegende[];
}) {
  return (
    <>
      <p className="text-encre">
        <span className="uppercase tracking-wider text-encre-tres-douce">
          {niveau === 'pays' ? 'Par pays' : niveau === 'region' ? 'Par région' : 'Par ville'}
        </span>
      </p>
      {groupes.length === 0 ? (
        <p className="mt-1 text-encre-tres-douce">
          Aucun lieu de ce niveau n’est visible dans la période.
        </p>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5">
          {groupes.slice(0, 8).map((groupe) => (
            <li key={groupe.libelle} className="flex items-baseline justify-between gap-3">
              <span className="truncate text-encre">{groupe.libelle}</span>
              <span className="tabular-nums text-encre-douce">
                {groupe.nombre}
                <span className="text-encre-tres-douce"> · {groupe.evenements} évt</span>
              </span>
            </li>
          ))}
          {groupes.length > 8 && (
            <li className="text-encre-tres-douce">
              et {groupes.length - 8} autre{groupes.length - 8 > 1 ? 's' : ''}
            </li>
          )}
        </ul>
      )}
      <p className="mt-2 text-encre-tres-douce">
        Zoomer descend d’un cran : pays, puis région, puis ville.
      </p>
    </>
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
      className="grid h-11 w-11 place-items-center rounded-[var(--rayon-petit)] text-lg text-encre-douce transition hover:bg-fond-doux sm:h-9 sm:w-9"
    >
      {children}
    </button>
  );
}

function Pastille({ couleur }: { couleur: string }) {
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: couleur }} aria-hidden />;
}

// ---------------------------------------------------------------------------

/** Groupe les lieux visibles selon le niveau demandé pour la légende. */
function grouperPourLegende(
  points: readonly PointCarte[],
  niveau: NiveauLegende
): { libelle: string; nombre: number; evenements: number }[] {
  const cle = (point: PointCarte): string | null => {
    if (niveau === 'ville') return point.lieu.nom;
    if (niveau === 'region') {
      return point.lieu.region ?? point.lieu.paysActuel ?? point.lieu.pays ?? 'Sans région';
    }
    return point.lieu.paysActuel ?? point.lieu.pays ?? 'Sans pays';
  };

  const totaux = new Map<string, { nombre: number; evenements: number }>();
  for (const point of points) {
    if (!point.actif) continue;
    const identifiant = cle(point);
    if (!identifiant) continue;
    const acc = totaux.get(identifiant) ?? { nombre: 0, evenements: 0 };
    acc.nombre += 1;
    acc.evenements += point.nombre;
    totaux.set(identifiant, acc);
  }

  return [...totaux.entries()]
    .map(([libelle, valeurs]) => ({ libelle, ...valeurs }))
    .sort((a, b) => b.evenements - a.evenements || a.libelle.localeCompare(b.libelle, 'fr'));
}

function rayonDe(nombre: number, sommet: number): number {
  return RAYON_MIN + (RAYON_MAX - RAYON_MIN) * Math.sqrt(nombre / Math.max(sommet, 1));
}

/** Ramène les deux extrémités au bord des points, ou rien si le trajet est trop court. */
function raccourcir(
  depart: { x: number; y: number },
  arrivee: { x: number; y: number },
  margeDepart: number,
  margeArrivee: number
): { a: { x: number; y: number }; b: { x: number; y: number } } | null {
  const dx = arrivee.x - depart.x;
  const dy = arrivee.y - depart.y;
  const longueur = Math.hypot(dx, dy);
  if (longueur < margeDepart + margeArrivee + 6) return null;

  return {
    a: { x: depart.x + (dx / longueur) * margeDepart, y: depart.y + (dy / longueur) * margeDepart },
    b: {
      x: arrivee.x - (dx / longueur) * margeArrivee,
      y: arrivee.y - (dy / longueur) * margeArrivee,
    },
  };
}

/** Un arc plus ou moins bombé : deux trajets inverses ne se superposent pas. */
function arcCourbe(
  a: { x: number; y: number },
  b: { x: number; y: number },
  courbure = 0.16
): string {
  const milieuX = (a.x + b.x) / 2;
  const milieuY = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return `M${a.x} ${a.y} Q${milieuX - dy * courbure} ${milieuY + dx * courbure} ${b.x} ${b.y}`;
}

function chevauche(
  a: { x1: number; x2: number; y1: number; y2: number },
  b: { x1: number; x2: number; y1: number; y2: number }
): boolean {
  return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
}
