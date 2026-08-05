'use client';

import { useMemo } from 'react';
import {
  cheminGeographique,
  versEcran,
  type Cadre,
  type Transformation,
} from '@/components/carte/projection';
import { MERS, PAS_GRILLE, TERRES, VILLES_REPERE } from '@/components/carte/geographie';

/** Un repère est écarté s'il tombe sur un lieu de la famille, à ce degré près. */
const DISTANCE_DOUBLON = 0.4;

type Props = {
  cadre: Cadre;
  transformation: Transformation;
  /** Lieux de la base, pour ne pas nommer deux fois la même ville. */
  lieux: readonly { longitude: number; latitude: number }[];
};

/**
 * Le fond : une mer unie, des terres au trait, une grille de méridiens et
 * quelques villes pour reconnaître le pays. Les traits ne s'épaississent pas
 * au zoom, et les textes ne grandissent pas : seul le dessin s'agrandit.
 */
export function FondCarte({ cadre, transformation, lieux }: Props) {
  const terres = useMemo(
    () =>
      TERRES.map((terre) => ({
        nom: terre.nom,
        surface: cheminGeographique([...terre.cote, ...(terre.fermeture ?? [])], cadre, true),
        trait: cheminGeographique(terre.cote, cadre, false),
      })),
    [cadre]
  );

  const grille = useMemo(() => {
    const { ouest, est, sud, nord } = cadre.bornes;
    const meridiens: { valeur: number; x: number; y1: number; y2: number }[] = [];
    const paralleles: { valeur: number; y: number; x1: number; x2: number }[] = [];

    const premierMeridien = Math.ceil(ouest / PAS_GRILLE) * PAS_GRILLE;
    for (let longitude = premierMeridien; longitude <= est; longitude += PAS_GRILLE) {
      const haut = versEcran(cadre, transformation, longitude, nord);
      const bas = versEcran(cadre, transformation, longitude, sud);
      meridiens.push({ valeur: longitude, x: haut.x, y1: haut.y, y2: bas.y });
    }

    const premierParallele = Math.ceil(sud / PAS_GRILLE) * PAS_GRILLE;
    for (let latitude = premierParallele; latitude <= nord; latitude += PAS_GRILLE) {
      const gauche = versEcran(cadre, transformation, ouest, latitude);
      const droite = versEcran(cadre, transformation, est, latitude);
      paralleles.push({ valeur: latitude, y: gauche.y, x1: gauche.x, x2: droite.x });
    }

    return { meridiens, paralleles };
  }, [cadre, transformation]);

  const villes = useMemo(
    () =>
      VILLES_REPERE.filter(
        (ville) =>
          !lieux.some(
            (lieu) =>
              Math.abs(lieu.longitude - ville.coord[0]) < DISTANCE_DOUBLON &&
              Math.abs(lieu.latitude - ville.coord[1]) < DISTANCE_DOUBLON
          )
      ).map((ville) => ({
        nom: ville.nom,
        ...versEcran(cadre, transformation, ville.coord[0], ville.coord[1]),
      })),
    [cadre, transformation, lieux]
  );

  const mers = useMemo(
    () =>
      MERS.map((mer) => ({
        nom: mer.nom,
        ...versEcran(cadre, transformation, mer.coord[0], mer.coord[1]),
      })),
    [cadre, transformation]
  );

  const dedans = (x: number, y: number, marge = 4) =>
    x > marge && x < cadre.largeur - marge && y > marge && y < cadre.hauteur - marge;

  return (
    <g aria-hidden>
      {/* La mer : un aplat qui tient tout le cadre, quel que soit le zoom. */}
      <rect width={cadre.largeur} height={cadre.hauteur} fill="var(--fond-doux)" />

      <g
        transform={`translate(${transformation.x} ${transformation.y}) scale(${transformation.k})`}
      >
        {terres.map((terre) => (
          <path key={`terre-${terre.nom}`} d={terre.surface} fill="var(--fond-carte)" />
        ))}
        {terres.map((terre) => (
          <path
            key={`cote-${terre.nom}`}
            d={terre.trait}
            fill="none"
            stroke="var(--bordure-forte)"
            strokeWidth={1.2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* Méridiens et parallèles, tracés à l'écran pour rester fins. */}
      <g stroke="var(--bordure)" strokeWidth={1} strokeDasharray="2 5" opacity={0.9}>
        {grille.meridiens.map((m) => (
          <line key={`meridien-${m.valeur}`} x1={m.x} y1={m.y1} x2={m.x} y2={m.y2} />
        ))}
        {grille.paralleles.map((p) => (
          <line key={`parallele-${p.valeur}`} x1={p.x1} y1={p.y} x2={p.x2} y2={p.y} />
        ))}
      </g>

      <g fill="var(--encre-tres-douce)" opacity={0.7} style={{ fontSize: 10 }}>
        {grille.meridiens
          .filter((m) => m.x > 16 && m.x < cadre.largeur - 16)
          .map((m) => (
            <text key={`nom-meridien-${m.valeur}`} x={m.x} y={cadre.hauteur - 8} textAnchor="middle">
              {nommerLongitude(m.valeur)}
            </text>
          ))}
        {grille.paralleles
          .filter((p) => p.y > 16 && p.y < cadre.hauteur - 22)
          .map((p) => (
            <text key={`nom-parallele-${p.valeur}`} x={8} y={p.y - 4}>
              {nommerLatitude(p.valeur)}
            </text>
          ))}
      </g>

      {/* Villes de repère : discrètes, elles ne disent rien de la famille. */}
      <g>
        {villes
          .filter((ville) => dedans(ville.x, ville.y, 30))
          .map((ville) => (
            <g key={`ville-${ville.nom}`}>
              <circle cx={ville.x} cy={ville.y} r={1.8} fill="var(--encre-tres-douce)" opacity={0.6} />
              <text
                x={ville.x + 5}
                y={ville.y + 3.5}
                fill="var(--encre-tres-douce)"
                opacity={0.75}
                style={{ fontSize: 10.5 }}
              >
                {ville.nom}
              </text>
            </g>
          ))}
      </g>

      <g fill="var(--encre-tres-douce)" opacity={0.45}>
        {mers
          .filter((mer) => dedans(mer.x, mer.y, 60))
          .map((mer) => (
            <text
              key={`mer-${mer.nom}`}
              x={mer.x}
              y={mer.y}
              textAnchor="middle"
              style={{ fontSize: 12, fontStyle: 'italic', letterSpacing: '0.2em' }}
            >
              {mer.nom}
            </text>
          ))}
      </g>
    </g>
  );
}

function nommerLongitude(valeur: number): string {
  if (valeur === 0) return '0°';
  return `${Math.abs(valeur)}° ${valeur > 0 ? 'E' : 'O'}`;
}

function nommerLatitude(valeur: number): string {
  if (valeur === 0) return '0°';
  return `${Math.abs(valeur)}° ${valeur > 0 ? 'N' : 'S'}`;
}
