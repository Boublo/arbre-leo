'use client';

/**
 * Fond de planche pour l'arbre — plusieurs ambiances au choix.
 * Toutes restent derrière les cartes (pointer-events none) et respectent
 * prefers-reduced-motion.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { FondArbre } from '@/lib/fond-arbre';

type Transform = { x: number; y: number; k: number };
type Curseur = { x: number; y: number } | null;

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
];

const COULEUR_MOTE: Record<Mote['teinte'], string> = {
  or: 'var(--or)',
  paternelle: 'var(--paternelle)',
  maternelle: 'var(--maternelle)',
  accent: 'var(--accent)',
};

function FondParchemin() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: 'var(--fond)',
        backgroundImage: 'var(--texture-papier, none)',
        backgroundRepeat: 'repeat',
      }}
    />
  );
}

function GrillePoints({
  parallaxe,
  reduit,
  idMotif = 'fond-arbre-points',
}: {
  parallaxe: { x: number; y: number };
  reduit: boolean;
  idMotif?: string;
}) {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      style={{
        transform: `translate(${parallaxe.x}px, ${parallaxe.y}px)`,
        transition: reduit ? undefined : 'transform 0.6s ease-out',
      }}
    >
      <defs>
        <pattern id={idMotif} width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.85" fill="var(--bordure-forte)" opacity="0.22" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${idMotif})`} />
    </svg>
  );
}

function LavisBranches() {
  return (
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
  );
}

function MotifsVivants({
  parallaxe,
  reduit,
}: {
  parallaxe: { x: number; y: number };
  reduit: boolean;
}) {
  return (
    <>
      {!reduit && (
        <div
          className="fond-arbre-souffle absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 50% 40% at 50% 35%, color-mix(in srgb, var(--fond-carte) 55%, transparent), transparent 70%)',
          }}
        />
      )}

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

        <ellipse cx="50" cy="42" rx="28" ry="18" fill="url(#fond-arbre-halo)" opacity={0.25} />

        {MOTES.map((mote) => (
          <circle
            key={mote.id}
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
        ))}

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
    </>
  );
}

function AuroreInteractive({
  parallaxe,
  curseur,
  reduit,
}: {
  parallaxe: { x: number; y: number };
  curseur: Curseur;
  reduit: boolean;
}) {
  const decalageCurseur = useMemo(() => {
    if (!curseur || reduit) return { x: 0, y: 0 };
    return {
      x: (curseur.x - 0.5) * 28,
      y: (curseur.y - 0.5) * 20,
    };
  }, [curseur, reduit]);

  const styleNuage = (facteur: number) =>
    reduit
      ? undefined
      : {
          transform: `translate(${parallaxe.x * facteur + decalageCurseur.x * facteur}px, ${parallaxe.y * facteur + decalageCurseur.y * facteur}px)`,
          transition: 'transform 0.8s ease-out',
        };

  return (
    <>
      <div
        className={reduit ? 'absolute inset-0' : 'fond-arbre-aurore-1 absolute inset-0'}
        style={{
          ...styleNuage(0.6),
          background:
            'radial-gradient(ellipse 45% 55% at 18% 42%, color-mix(in srgb, var(--paternelle) 22%, transparent), transparent 72%)',
        }}
      />
      <div
        className={reduit ? 'absolute inset-0' : 'fond-arbre-aurore-2 absolute inset-0'}
        style={{
          ...styleNuage(0.8),
          background:
            'radial-gradient(ellipse 50% 60% at 82% 38%, color-mix(in srgb, var(--maternelle) 20%, transparent), transparent 70%)',
        }}
      />
      <div
        className={reduit ? 'absolute inset-0' : 'fond-arbre-aurore-3 absolute inset-0'}
        style={{
          ...styleNuage(0.45),
          background:
            'radial-gradient(ellipse 60% 45% at 50% 12%, color-mix(in srgb, var(--or) 16%, transparent), transparent 68%)',
        }}
      />
      <div
        className={reduit ? 'absolute inset-0' : 'fond-arbre-aurore-4 absolute inset-0'}
        style={{
          ...styleNuage(0.55),
          background:
            'radial-gradient(ellipse 55% 40% at 48% 88%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 72%)',
        }}
      />
      <GrillePoints parallaxe={parallaxe} reduit={reduit} idMotif="fond-arbre-points-aurore" />
    </>
  );
}

export function FondAtmospherique({
  transform,
  variante = 'points',
  curseur = null,
}: {
  transform: Transform;
  variante?: FondArbre;
  curseur?: Curseur;
}) {
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
    const synchroniser = () => setReduit(requete.matches);
    synchroniser();
    requete.addEventListener('change', synchroniser);
    return () => requete.removeEventListener('change', synchroniser);
  }, []);

  const facteurParallaxe = variante === 'vivant' || variante === 'aurore' ? 0.04 : 0.02;
  const parallaxe = useMemo(() => {
    if (reduit) return { x: 0, y: 0 };
    return {
      x: Math.max(-18, Math.min(18, transform.x * facteurParallaxe)),
      y: Math.max(-14, Math.min(14, transform.y * facteurParallaxe)),
    };
  }, [transform.x, transform.y, reduit, facteurParallaxe]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <FondParchemin />

      {variante === 'uni' && null}

      {variante === 'points' && <GrillePoints parallaxe={parallaxe} reduit={reduit} />}

      {variante === 'vivant' && (
        <>
          <LavisBranches />
          <MotifsVivants parallaxe={parallaxe} reduit={reduit} />
        </>
      )}

      {variante === 'aurore' && (
        <AuroreInteractive parallaxe={parallaxe} curseur={curseur} reduit={reduit} />
      )}
    </div>
  );
}
