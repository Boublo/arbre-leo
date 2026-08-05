'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnnotationTemps } from '@/components/carte/types-carte';

/** Une décennie par barre : le siècle se lit d'un coup d'œil. */
const PAS_HISTOGRAMME = 10;

/** Millisecondes par année lors du déroulé rapide. */
const CADENCE_RAPIDE = 90;

/** Bornes visées par la migration au fil du temps. */
const MIGRATION_DEBUT = 1850;
const MIGRATION_FIN = 2020;
const DUREE_MIGRATION_MS = 30_000;

type Props = {
  anneeMin: number;
  anneeMax: number;
  debut: number;
  fin: number;
  /** Années de tous les événements situés. */
  annees: readonly number[];
  annotations: readonly AnnotationTemps[];
  surChangement: (debut: number, fin: number) => void;
};

type Mode = 'arret' | 'rapide' | 'migration';

/**
 * Le curseur de période.
 *
 * Deux réglages séparés plutôt qu'une poignée double : c'est moins élégant,
 * mais cela se manœuvre au clavier sans rien savoir de particulier. Deux
 * boutons de déroulé : « rapide » enchaîne les années à la volée, « fil du
 * temps » balaie 1850 – 2020 en trente secondes pour laisser voir la famille
 * se déplacer sous les yeux. Ce dernier se tait quand le système demande à
 * réduire le mouvement.
 */
export function CurseurPeriode({
  anneeMin,
  anneeMax,
  debut,
  fin,
  annees,
  annotations,
  surChangement,
}: Props) {
  const [mode, setMode] = useState<Mode>('arret');
  const [mouvementReduit, setMouvementReduit] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
    const relire = () => setMouvementReduit(requete.matches);
    relire();
    requete.addEventListener('change', relire);
    return () => requete.removeEventListener('change', relire);
  }, []);

  // Le minuteur lit les bornes courantes sans se relancer à chaque année.
  // La recopie se fait après le rendu : écrire une ref pendant le rendu
  // rendrait le composant impur.
  const bornes = useRef({ debut, fin });
  useEffect(() => {
    bornes.current = { debut, fin };
  }, [debut, fin]);

  useEffect(() => {
    if (mode === 'arret') return;

    const etendue = anneeMax - anneeMin;
    const ouverture = bornes.current.fin - bornes.current.debut;

    if (mode === 'rapide') {
      const fenetre =
        ouverture >= etendue ? Math.max(Math.round(etendue / 6), 10) : Math.max(ouverture, 5);

      if (bornes.current.fin >= anneeMax) {
        surChangement(anneeMin, Math.min(anneeMin + fenetre, anneeMax));
      }

      const minuteur = setInterval(() => {
        const prochaine = bornes.current.fin + 1;
        if (prochaine > anneeMax) {
          setMode('arret');
          surChangement(anneeMin, anneeMax);
          return;
        }
        surChangement(Math.max(anneeMin, prochaine - fenetre), prochaine);
      }, CADENCE_RAPIDE);

      return () => clearInterval(minuteur);
    }

    // Mode « migration » : trente secondes, bornes 1850 – 2020, fenêtre de
    // vingt ans qui laisse voir plusieurs vies à la fois. Le bouton est
    // désactivé quand ces bornes ne se croisent pas ; on se garde tout de même
    // contre une reprise après changement de données.
    const debutMigration = Math.max(anneeMin, MIGRATION_DEBUT);
    const finMigration = Math.min(anneeMax, MIGRATION_FIN);
    if (finMigration <= debutMigration) return;

    const fenetre = 20;
    const totalAnnees = finMigration - debutMigration;
    const cadence = Math.max(30, Math.round(DUREE_MIGRATION_MS / totalAnnees));

    // On démarre franchement au bord de la migration : la famille avait
    // souvent tout un siècle derrière elle avant 1850.
    surChangement(debutMigration, Math.min(debutMigration + fenetre, finMigration));

    const minuteur = setInterval(() => {
      const prochaine = bornes.current.fin + 1;
      if (prochaine > finMigration) {
        setMode('arret');
        surChangement(anneeMin, anneeMax);
        return;
      }
      surChangement(Math.max(debutMigration, prochaine - fenetre), prochaine);
    }, cadence);

    return () => clearInterval(minuteur);
  }, [mode, anneeMin, anneeMax, surChangement]);

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

  // Annotations dans la période affichée et positionnement sur la frise.
  const jalonsPeriode = useMemo(
    () =>
      annotations
        .filter((a) => a.annee >= debut && a.annee <= fin)
        .sort((a, b) => a.annee - b.annee),
    [annotations, debut, fin]
  );

  const jalonsFrise = useMemo(() => {
    const etendue = Math.max(anneeMax - anneeMin, 1);
    return annotations
      .filter((a) => a.annee >= anneeMin && a.annee <= anneeMax)
      .map((a) => ({ ...a, x: ((a.annee - anneeMin) / etendue) * 100 }));
  }, [annotations, anneeMin, anneeMax]);

  const migrationDisponible = anneeMax > Math.max(anneeMin, MIGRATION_DEBUT);
  const enLecture = mode !== 'arret';

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

      <div className="relative">
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

        {/* Les jalons du siècle : hauts et discrets, cliquables si un fait
             est rattaché. Ils changent d'aspect à l'intérieur de la période. */}
        {jalonsFrise.length > 0 && (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {jalonsFrise.map((jalon) => {
              const dedans = jalon.annee >= debut && jalon.annee <= fin;
              return (
                <span
                  key={`jalon-${jalon.annee}-${jalon.faitId ?? 'x'}`}
                  className="absolute top-0 bottom-0 w-px"
                  style={{
                    left: `${jalon.x}%`,
                    background: dedans ? 'var(--or)' : 'var(--bordure-forte)',
                    opacity: dedans ? 0.9 : 0.55,
                  }}
                  title={`${jalon.annee} · ${jalon.texte}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {jalonsPeriode.length > 0 && (
        <ul
          className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-encre-douce"
          aria-label="Moments clés dans la période affichée"
        >
          {jalonsPeriode.slice(0, 4).map((jalon) => (
            <li key={`${jalon.annee}-${jalon.faitId ?? 'x'}`} className="flex items-baseline gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full"
                style={{ background: 'var(--or)' }}
                aria-hidden
              />
              <span className="tabular-nums text-encre">{jalon.annee}</span>
              <span>·</span>
              {jalon.faitId ? (
                <a
                  href={`/histoire/${jalon.faitId}`}
                  className="lien-discret pointer-events-auto"
                >
                  {jalon.texte}
                </a>
              ) : (
                <span>{jalon.texte}</span>
              )}
            </li>
          ))}
          {jalonsPeriode.length > 4 && (
            <li className="text-encre-tres-douce">
              et {jalonsPeriode.length - 4} autre{jalonsPeriode.length - 4 > 1 ? 's' : ''}
            </li>
          )}
        </ul>
      )}

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
            onClick={() => setMode(mode === 'migration' ? 'arret' : 'migration')}
            aria-pressed={mode === 'migration'}
            disabled={mouvementReduit || !migrationDisponible}
            title={
              mouvementReduit
                ? 'Le système demande à réduire le mouvement : le défilement est en pause.'
                : !migrationDisponible
                  ? 'La base n’a pas encore d’événements après 1850.'
                  : 'Balayer 1850 – 2020 en trente secondes'
            }
            className="rounded-[var(--rayon-petit)] border border-bordure px-2.5 py-1.5 text-xs text-encre-douce transition hover:bg-fond-doux hover:text-encre disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {mode === 'migration' ? 'Arrêter' : 'Voir la migration au fil du temps'}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'rapide' ? 'arret' : 'rapide')}
            aria-pressed={mode === 'rapide'}
            disabled={mouvementReduit}
            className="rounded-[var(--rayon-petit)] border border-bordure px-2.5 py-1.5 text-xs text-encre-douce transition hover:bg-fond-doux hover:text-encre disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {mode === 'rapide' ? 'Arrêter' : 'Défilement rapide'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('arret');
              surChangement(anneeMin, anneeMax);
            }}
            className="rounded-[var(--rayon-petit)] px-2.5 py-1 text-xs text-encre-tres-douce transition hover:text-encre"
          >
            Toute la période
          </button>
        </div>
      </div>

      {mouvementReduit && enLecture === false && (
        <p className="text-xs text-encre-tres-douce">
          Votre système demande à réduire le mouvement : le défilement automatique est mis en
          pause. Les deux réglages restent utilisables au clavier.
        </p>
      )}
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
