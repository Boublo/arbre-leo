'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/** Une décennie par barre : le siècle se lit d'un coup d'œil. */
const PAS_HISTOGRAMME = 10;

/** Millisecondes par année lors du déroulé. */
const CADENCE = 90;

type Props = {
  anneeMin: number;
  anneeMax: number;
  debut: number;
  fin: number;
  /** Années de tous les événements situés. */
  annees: readonly number[];
  surChangement: (debut: number, fin: number) => void;
};

/**
 * Le curseur de période.
 *
 * Deux réglages séparés plutôt qu'une poignée double : c'est moins élégant,
 * mais cela se manœuvre au clavier sans rien savoir de particulier. Le bouton
 * « Dérouler » fait glisser une fenêtre d'années du début à la fin, et l'on
 * voit alors la famille se déplacer.
 */
export function CurseurPeriode({
  anneeMin,
  anneeMax,
  debut,
  fin,
  annees,
  surChangement,
}: Props) {
  const [enLecture, setEnLecture] = useState(false);

  // Le minuteur lit les bornes courantes sans se relancer à chaque année.
  // La recopie se fait après le rendu : écrire une ref pendant le rendu
  // rendrait le composant impur.
  const bornes = useRef({ debut, fin });
  useEffect(() => {
    bornes.current = { debut, fin };
  }, [debut, fin]);

  useEffect(() => {
    if (!enLecture) return;

    const etendue = anneeMax - anneeMin;
    const ouverture = bornes.current.fin - bornes.current.debut;
    const fenetre = ouverture >= etendue ? Math.max(Math.round(etendue / 6), 10) : Math.max(ouverture, 5);

    if (bornes.current.fin >= anneeMax) {
      surChangement(anneeMin, Math.min(anneeMin + fenetre, anneeMax));
    }

    const minuteur = setInterval(() => {
      const prochaine = bornes.current.fin + 1;
      if (prochaine > anneeMax) {
        setEnLecture(false);
        surChangement(anneeMin, anneeMax);
        return;
      }
      surChangement(Math.max(anneeMin, prochaine - fenetre), prochaine);
    }, CADENCE);

    return () => clearInterval(minuteur);
  }, [enLecture, anneeMin, anneeMax, surChangement]);

  const paquets = useMemo(() => {
    const premier = Math.floor(anneeMin / PAS_HISTOGRAMME) * PAS_HISTOGRAMME;
    const dernier = Math.floor(anneeMax / PAS_HISTOGRAMME) * PAS_HISTOGRAMME;
    const nombre = Math.max((dernier - premier) / PAS_HISTOGRAMME + 1, 1);
    const compte = new Array<number>(nombre).fill(0);
    for (const annee of annees) {
      const index = Math.floor((annee - premier) / PAS_HISTOGRAMME);
      if (index >= 0 && index < nombre) compte[index] += 1;
    }
    return { premier, compte, sommet: Math.max(...compte, 1) };
  }, [annees, anneeMin, anneeMax]);

  const nbEvenements = useMemo(
    () => annees.filter((annee) => annee >= debut && annee <= fin).length,
    [annees, debut, fin]
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-encre-tres-douce">Période</p>
        <p className="text-xs text-encre-douce">
          <span className="tabular-nums text-encre">
            {debut} – {fin}
          </span>{' '}
          · {nbEvenements} événement{nbEvenements > 1 ? 's' : ''}
        </p>
      </div>

      {/* Densité des événements par décennie : où et quand la famille écrit. */}
      <svg
        viewBox={`0 0 ${paquets.compte.length} 24`}
        preserveAspectRatio="none"
        className="h-6 w-full"
        aria-hidden
      >
        {paquets.compte.map((nombre, index) => {
          const annee = paquets.premier + index * PAS_HISTOGRAMME;
          const dedans = annee + PAS_HISTOGRAMME - 1 >= debut && annee <= fin;
          const hauteur = (nombre / paquets.sommet) * 22;
          return (
            <rect
              key={annee}
              x={index + 0.12}
              width={0.76}
              y={24 - hauteur}
              height={hauteur}
              fill={dedans ? 'var(--accent)' : 'var(--bordure-forte)'}
              opacity={dedans ? 0.85 : 0.5}
            />
          );
        })}
      </svg>

      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Reglage
            libelle="Depuis"
            description="Première année affichée sur la carte"
            valeur={debut}
            min={anneeMin}
            max={anneeMax}
            surChangement={(valeur) => surChangement(Math.min(valeur, fin), fin)}
          />
          <Reglage
            libelle="Jusqu’à"
            description="Dernière année affichée sur la carte"
            valeur={fin}
            min={anneeMin}
            max={anneeMax}
            surChangement={(valeur) => surChangement(debut, Math.max(valeur, debut))}
          />
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setEnLecture((etat) => !etat)}
            aria-pressed={enLecture}
            className="rounded-[var(--rayon-petit)] border border-bordure px-2.5 py-1.5 text-xs text-encre-douce transition hover:bg-fond-doux hover:text-encre"
          >
            {enLecture ? 'Arrêter' : 'Dérouler le temps'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEnLecture(false);
              surChangement(anneeMin, anneeMax);
            }}
            className="rounded-[var(--rayon-petit)] px-2.5 py-1 text-xs text-encre-tres-douce transition hover:text-encre"
          >
            Toute la période
          </button>
        </div>
      </div>
    </div>
  );
}

function Reglage({
  libelle,
  description,
  valeur,
  min,
  max,
  surChangement,
}: {
  libelle: string;
  description: string;
  valeur: number;
  min: number;
  max: number;
  surChangement: (valeur: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-14 shrink-0 text-encre-douce">{libelle}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={valeur}
        aria-label={description}
        onChange={(evenement) => surChangement(Number(evenement.target.value))}
        className="h-4 flex-1 cursor-pointer"
        style={{ accentColor: 'var(--accent)' }}
      />
      <span className="w-9 shrink-0 text-right tabular-nums text-encre">{valeur}</span>
    </label>
  );
}
