'use client';

/**
 * Fond de planche pour l’arbre — parchemin vivant.
 *
 * Grain de papier, lavis de branches, points d’encre qui dérivent doucement,
 * et un léger parallaxe au pan/zoom. Rien qui concurrence les cartes : tout
 * reste derrière, pointer-events none. Si l’utilisateur préfère moins de
 * mouvement, on garde grain + lavis figés.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';

type Transform = { x: number; y: number; k: number };

type Mote = {
  id: number;
  x: number;
  y: number;
  r: number;
  duree: number;
  delai: number;
  dx: number;
  dy: number;
  opacite: number;
  teinte: 'or' | 'paternelle' | 'maternelle' | 'accent';
};

const MOTES: Mote[] = [
  { id: 1, x: 8, y: 18, r: 1.4, duree: 28, delai: 0, dx: 12, dy: -18, opacite: 0.22, teinte: 'or' },
  { id: 2, x: 22, y: 72, r: 1.1, duree: 34, delai: -4, dx: -10, dy: 14, opacite: 0.18, teinte: 'paternelle' },
  { id: 3, x: 78, y: 24, r: 1.6, duree: 31, delai: -8, dx: 8, dy: 16, opacite: 0.2, teinte: 'maternelle' },
  { id: 4, x: 88, y: 68, r: 1.2, duree: 36, delai: -2, dx: -14, dy: -10, opacite: 0.16, teinte: 'accent' },
  { id: 5, x: 45, y: 12, r: 0.9, duree: 26, delai: -6, dx: 6, dy: 20, opacite: 0.14, teinte: 'or' },
  { id: 6, x: 62, y: 82, r: 1.3, duree: 38, delai: -10, dx: -8, dy: -16, opacite: 0.17, teinte: 'paternelle' },
  { id: 7, x: 14, y: 48, r: 1.0, duree: 30, delai: -3, dx: 16, dy: 8, opacite: 0.15, teinte: 'maternelle' },
  { id: 8, x: 70, y: 44, r: 1.5, duree: 33, delai: -7, dx: -12, dy: 12, opacite: 0.19, teinte: 'accent' },
  { id: 9, x: 36, y: 58, r: 0.8, duree: 29, delai: -1, dx: 10, dy: -14, opacite: 0.13, teinte: 'or' },
  { id: 10, x: 92, y: 38, r: 1.1, duree: 35, delai: -9, dx: -6, dy: 18, opacite: 0.16, teinte: 'maternelle' },
  { id: 11, x: 28, y: 30, r: 1.2, duree: 32, delai: -5, dx: 14, dy: -8, opacite: 0.15, teinte: 'paternelle' },
  { id: 12, x: 54, y: 70, r: 1.0, duree: 27, delai: -11, dx: -16, dy: 6, opacite: 0.14, teinte: 'accent' },
  { id: 13, x: 6, y: 86, r: 1.3, duree: 37, delai: -2, dx: 8, dy: -12, opacite: 0.12, teinte: 'or' },
  { id: 14, x: 48, y: 40, r: 0.7, duree: 40, delai: -12, dx: -5, dy: 10, opacite: 0.11, teinte: 'maternelle' },
  { id: 15, x: 82, y: 12, r: 1.4, duree: 29, delai: -4, dx: -10, dy: 14, opacite: 0.18, teinte: 'paternelle' },
  { id: 16, x: 18, y: 8, r: 0.9, duree: 42, delai: -8, dx: 12, dy: 10, opacite: 0.12, teinte: 'accent' },
];

const COULEUR_MOTE: Record<Mote['teinte'], string> = {
  or: 'var(--or)',
  paternelle: 'var(--paternelle)',
  maternelle: 'var(--maternelle)',
  accent: 'var(--accent)',
};

export function FondAtmospherique({ transform }: { transform: Transform }) {
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
    const synchroniser = () => setReduit(requete.matches);
    synchroniser();
    requete.addEventListener('change', synchroniser);
    return () => requete.removeEventListener('change', synchroniser);
  }, []);

  // Parallaxe plafonnée : le fond suit le pan sans voler.
  const parallaxe = useMemo(() => {
    if (reduit) return { x: 0, y: 0 };
    const facteur = 0.04;
    return {
      x: Math.max(-18, Math.min(18, transform.x * facteur)),
      y: Math.max(-14, Math.min(14, transform.y * facteur)),
    };
  }, [transform.x, transform.y, reduit]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Parchemin de base + grain (sinon le bg-fond opaque masque le body). */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'var(--fond)',
          backgroundImage: 'var(--texture-papier, none)',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Lavis de branches : chaleur latérale, très discrète. */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 55% 70% at 12% 40%, color-mix(in srgb, var(--paternelle) 14%, transparent), transparent 70%),
            radial-gradient(ellipse 55% 70% at 88% 45%, color-mix(in srgb, var(--maternelle) 14%, transparent), transparent 70%),
            radial-gradient(ellipse 80% 60% at 50% 8%, color-mix(in srgb, var(--or) 8%, transparent), transparent 65%),
            radial-gradient(ellipse 70% 50% at 50% 100%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 70%)
          `,
        }}
      />

      {/* Souffle de lumière — respiration lente du parchemin. */}
      {!reduit && (
        <div
          className="fond-arbre-souffle absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 50% 40% at 50% 35%, color-mix(in srgb, var(--fond-carte) 55%, transparent), transparent 70%)',
          }}
        />
      )}

      {/* Points d’encre + légères formes « feuille / pétale » abstraites. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{
          transform: `translate(${parallaxe.x}px, ${parallaxe.y}px)`,
          transition: reduit ? undefined : 'transform 0.6s ease-out',
        }}
      >
        <defs>
          <radialGradient id="fond-arbre-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--or)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--or)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Halo central immobile — ancre visuelle. */}
        <ellipse
          cx="50"
          cy="42"
          rx="28"
          ry="18"
          fill="url(#fond-arbre-halo)"
          opacity={0.25}
        />

        {MOTES.map((mote) => (
          <g key={mote.id}>
            <circle
              className={reduit ? undefined : 'fond-arbre-mote'}
              cx={mote.x}
              cy={mote.y}
              r={mote.r}
              fill={COULEUR_MOTE[mote.teinte]}
              opacity={mote.opacite}
              style={
                reduit
                  ? undefined
                  : ({
                      '--fond-dx': `${mote.dx}`,
                      '--fond-dy': `${mote.dy}`,
                      animationDuration: `${mote.duree}s`,
                      animationDelay: `${mote.delai}s`,
                    } as CSSProperties)
              }
            />
          </g>
        ))}

        {/* Trois « pétales » d’encre très pâles — pas de cartoon. */}
        {!reduit && (
          <>
            <path
              className="fond-arbre-petale"
              d="M12 60 C16 52, 22 52, 24 60 C22 66, 16 66, 12 60 Z"
              fill="var(--paternelle)"
              opacity="0.07"
              style={{ animationDuration: '48s', animationDelay: '-3s' }}
            />
            <path
              className="fond-arbre-petale"
              d="M76 28 C80 22, 86 24, 86 32 C84 36, 78 34, 76 28 Z"
              fill="var(--maternelle)"
              opacity="0.08"
              style={{ animationDuration: '52s', animationDelay: '-12s' }}
            />
            <path
              className="fond-arbre-petale"
              d="M58 78 C62 72, 68 74, 66 82 C62 84, 56 82, 58 78 Z"
              fill="var(--accent)"
              opacity="0.06"
              style={{ animationDuration: '56s', animationDelay: '-20s' }}
            />
          </>
        )}
      </svg>
    </div>
  );
}
