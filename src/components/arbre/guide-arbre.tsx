'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { PRENOM_RACINE } from '@/lib/branches';

const CLE_GUIDE_VU = 'arbre-guide-v1';

type EtapeGuide = {
  id: string;
  titre: string;
  texte: string;
  /** Sélecteur `[data-guide="…"]` à mettre en avant ; absent = carte centrée. */
  cible?: string;
};

const ETAPES: EtapeGuide[] = [
  {
    id: 'bienvenue',
    titre: 'Bienvenue dans l’arbre',
    texte: `L’arbre part de ${PRENOM_RACINE}. Vous voyez sa famille s’étendre autour de lui — parents, grands-parents, cousins. C’est votre point de départ pour explorer.`,
  },
  {
    id: 'partir-de',
    titre: 'Changer de point de vue',
    texte: 'Utilisez « Partir de » pour explorer l’arbre depuis une autre personne : un ancêtre, un cousin, un conjoint…',
    cible: 'partir-de',
  },
  {
    id: 'modes',
    titre: 'Choisir ce que l’on montre',
    texte: '« D’où il vient » remonte les ancêtres. « La famille autour » élargit le tableau. « Ce qu’il a laissé » descend vers les descendants.',
    cible: 'modes',
  },
  {
    id: 'explorer',
    titre: 'Naviguer dans l’arbre',
    texte: 'Cliquez ou appuyez sur une personne pour ouvrir sa fiche. Double-cliquez pour repartir d’elle. Zoomez et déplacez-vous librement dans le dessin.',
    cible: 'arbre',
  },
  {
    id: 'chercher',
    titre: 'Trouver quelqu’un vite',
    texte: 'Appuyez sur F (ou sur la loupe sur mobile) pour chercher une personne par son nom et vous y rendre en un clic.',
    cible: 'chercher',
  },
  {
    id: 'fin',
    titre: 'C’est parti',
    texte: 'Vous pouvez relancer ce guide à tout moment avec le bouton ? en haut de l’écran. Bonne exploration !',
  },
];

type Rectangle = { top: number; left: number; width: number; height: number };

function lireRectangle(cible: string): Rectangle | null {
  const element = document.querySelector<HTMLElement>(`[data-guide="${cible}"]`);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const marge = 8;
  return {
    top: Math.max(8, rect.top - marge),
    left: Math.max(8, rect.left - marge),
    width: rect.width + marge * 2,
    height: rect.height + marge * 2,
  };
}

function positionCarte(rectangle: Rectangle | null): CSSProperties {
  if (!rectangle) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: 'min(24rem, calc(100vw - 2rem))',
    };
  }

  const espaceSous = window.innerHeight - (rectangle.top + rectangle.height);
  const placerAuDessus = espaceSous < 220;

  if (placerAuDessus) {
    return {
      bottom: Math.max(16, window.innerHeight - rectangle.top + 12),
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: 'min(24rem, calc(100vw - 2rem))',
    };
  }

  return {
    top: rectangle.top + rectangle.height + 12,
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: 'min(24rem, calc(100vw - 2rem))',
  };
}

export function guideDejaVu(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(CLE_GUIDE_VU) === '1';
  } catch {
    return true;
  }
}

export function marquerGuideVu() {
  try {
    localStorage.setItem(CLE_GUIDE_VU, '1');
  } catch {
    /* localStorage indisponible */
  }
}

/**
 * Guide pas à pas pour découvrir l’arbre interactif. S’affiche une fois, puis
 * reste accessible via le bouton d’aide.
 */
export function GuideArbre({
  ouvert,
  onFermer,
}: {
  ouvert: boolean;
  onFermer: () => void;
}) {
  const [etapeCourante, setEtapeCourante] = useState(0);
  const [rectangle, setRectangle] = useState<Rectangle | null>(null);

  const etape = ETAPES[etapeCourante]!;
  const derniere = etapeCourante === ETAPES.length - 1;

  const actualiserRectangle = useCallback(() => {
    if (!etape.cible) {
      setRectangle(null);
      return;
    }
    setRectangle(lireRectangle(etape.cible));
  }, [etape.cible]);

  useEffect(() => {
    if (!ouvert) return;
    setEtapeCourante(0);
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;

    actualiserRectangle();
    const id = window.setTimeout(actualiserRectangle, 120);

    window.addEventListener('resize', actualiserRectangle);
    window.addEventListener('scroll', actualiserRectangle, true);

    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', actualiserRectangle);
      window.removeEventListener('scroll', actualiserRectangle, true);
    };
  }, [ouvert, etapeCourante, actualiserRectangle]);

  useEffect(() => {
    if (!ouvert) return;

    function surTouche(evt: KeyboardEvent) {
      if (evt.key === 'Escape') {
        evt.preventDefault();
        onFermer();
      }
    }

    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  function fermer() {
    marquerGuideVu();
    onFermer();
  }

  function suivant() {
    if (derniere) {
      fermer();
      return;
    }
    setEtapeCourante((i) => i + 1);
  }

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      {rectangle ? (
        <div
          className="pointer-events-none absolute rounded-[var(--rayon)] ring-2 ring-accent"
          style={{
            top: rectangle.top,
            left: rectangle.left,
            width: rectangle.width,
            height: rectangle.height,
            boxShadow: '0 0 0 9999px rgba(15, 12, 8, 0.55)',
          }}
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-encre/55" aria-hidden />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-arbre-titre"
        className="carte pointer-events-auto fixed z-[61] p-5 shadow-[var(--ombre-forte)]"
        style={positionCarte(rectangle)}
      >
        <p className="text-xs font-medium uppercase tracking-wider text-accent">
          {etapeCourante + 1} / {ETAPES.length}
        </p>
        <h2 id="guide-arbre-titre" className="mt-1 font-titre text-xl text-encre">
          {etape.titre}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-encre-douce">{etape.texte}</p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={fermer}
            className="text-sm text-encre-tres-douce transition hover:text-encre"
          >
            Passer
          </button>

          <div className="flex items-center gap-2">
            {etapeCourante > 0 && (
              <button
                type="button"
                onClick={() => setEtapeCourante((i) => i - 1)}
                className="rounded-[var(--rayon-petit)] px-3 py-2 text-sm text-encre-douce transition hover:bg-fond-doux hover:text-encre"
              >
                Retour
              </button>
            )}
            <button
              type="button"
              onClick={suivant}
              className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2 text-sm font-medium text-accent-contraste transition hover:opacity-90"
            >
              {derniere ? 'Explorer l’arbre' : 'Suivant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
