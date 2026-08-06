'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { PRENOM_RACINE } from '@/lib/branches';

const CLE_GUIDE_VU = 'arbre-guide-v2';

type EtapeGuide = {
  id: string;
  icone: string;
  titre: string;
  texte: string;
  /** Sélecteur `[data-guide="…"]` à mettre en avant ; absent = carte centrée. */
  cible?: string;
  /** Le bouton Suivant reste grisé tant qu'aucune personne n'est sélectionnée. */
  attendreSelection?: boolean;
};

function etapesGuide(nomFocus: string): EtapeGuide[] {
  const prenom = PRENOM_RACINE === 'L’enfant' ? nomFocus.split(/\s+/)[0] ?? PRENOM_RACINE : PRENOM_RACINE;

  return [
    {
      id: 'bienvenue',
      icone: '🌳',
      titre: 'Bienvenue dans l’arbre',
      texte: `L’arbre part de ${prenom}. Vous voyez sa famille s’étendre autour de lui — parents, grands-parents, cousins. C’est votre point de départ pour explorer.`,
    },
    {
      id: 'partir-de',
      icone: '👤',
      titre: 'Changer de point de vue',
      texte: 'Utilisez « Partir de » pour explorer l’arbre depuis une autre personne : un ancêtre, un cousin, un conjoint…',
      cible: 'partir-de',
    },
    {
      id: 'modes',
      icone: '🔀',
      titre: 'Choisir ce que l’on montre',
      texte: '« D’où il vient » remonte les ancêtres. « La famille autour » élargit le tableau. « Ce qu’il a laissé » descend vers les descendants.',
      cible: 'modes',
    },
    {
      id: 'explorer',
      icone: '👆',
      titre: 'Essayez par vous-même',
      texte: 'Cliquez ou appuyez sur une personne pour ouvrir sa fiche. Double-cliquez pour repartir d’elle. Zoomez et déplacez-vous librement dans le dessin.',
      cible: 'arbre',
      attendreSelection: true,
    },
    {
      id: 'fiche',
      icone: '📋',
      titre: 'La fiche latérale',
      texte: 'La fiche résume l’essentiel : dates, liens, photos. Le bouton « Repartir d’ici » recentre tout l’arbre sur cette personne.',
      cible: 'fiche',
    },
    {
      id: 'chercher',
      icone: '🔍',
      titre: 'Trouver quelqu’un vite',
      texte: 'Appuyez sur F (ou sur la loupe sur mobile) pour chercher une personne par son nom et vous y rendre en un clic.',
      cible: 'chercher',
    },
    {
      id: 'fin',
      icone: '✨',
      titre: 'C’est parti',
      texte: 'Relancez ce guide à tout moment avec le bouton ? en haut de l’écran. Bonne exploration !',
    },
  ];
}

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

function estMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 1024;
}

function positionCarte(rectangle: Rectangle | null): CSSProperties {
  const base = { maxWidth: 'min(24rem, calc(100vw - 2rem))' } as const;

  if (estMobile()) {
    return {
      ...base,
      bottom: 'max(1rem, env(safe-area-inset-bottom))',
      left: '50%',
      transform: 'translateX(-50%)',
    };
  }

  if (!rectangle) {
    return {
      ...base,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const espaceSous = window.innerHeight - (rectangle.top + rectangle.height);
  const placerAuDessus = espaceSous < 240;

  if (placerAuDessus) {
    return {
      ...base,
      bottom: Math.max(16, window.innerHeight - rectangle.top + 12),
      left: '50%',
      transform: 'translateX(-50%)',
    };
  }

  return {
    ...base,
    top: rectangle.top + rectangle.height + 12,
    left: '50%',
    transform: 'translateX(-50%)',
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
  nomFocus,
  selectionFaite,
  ficheVisible,
  onEtapeChange,
}: {
  ouvert: boolean;
  onFermer: () => void;
  nomFocus: string;
  selectionFaite: boolean;
  ficheVisible: boolean;
  onEtapeChange?: (etapeId: string) => void;
}) {
  const etapes = useMemo(() => etapesGuide(nomFocus), [nomFocus]);
  const [etapeCourante, setEtapeCourante] = useState(0);
  const [rectangle, setRectangle] = useState<Rectangle | null>(null);

  const etape = etapes[etapeCourante]!;
  const derniere = etapeCourante === etapes.length - 1;

  const peutAvancer = useMemo(() => {
    if (etape.id === 'explorer') return selectionFaite;
    if (etape.id === 'fiche') return ficheVisible || selectionFaite;
    return true;
  }, [etape.id, selectionFaite, ficheVisible]);

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
    onEtapeChange?.(etape.id);
  }, [ouvert, etape.id, onEtapeChange]);

  useEffect(() => {
    if (!ouvert || !etape.attendreSelection || !selectionFaite) return;
    if (etape.id !== 'explorer') return;

    const id = window.setTimeout(() => {
      const indexFiche = etapes.findIndex((e) => e.id === 'fiche');
      if (indexFiche >= 0) setEtapeCourante(indexFiche);
    }, 600);

    return () => window.clearTimeout(id);
  }, [ouvert, etape.id, etape.attendreSelection, selectionFaite, etapes]);

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

    function fermerClavier() {
      marquerGuideVu();
      onFermer();
    }

    function suivantClavier() {
      if (!peutAvancer) return;
      if (derniere) {
        fermerClavier();
        return;
      }
      setEtapeCourante((i) => i + 1);
    }

    function surTouche(evt: KeyboardEvent) {
      const cible = evt.target as HTMLElement | null;
      const tag = cible?.tagName;
      if (
        cible?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT'
      ) {
        return;
      }

      if (evt.key === 'Escape') {
        evt.preventDefault();
        fermerClavier();
        return;
      }

      if (evt.key === 'Enter' && peutAvancer) {
        evt.preventDefault();
        suivantClavier();
      }
    }

    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [ouvert, peutAvancer, derniere, onFermer]);

  if (!ouvert) return null;

  function fermer() {
    marquerGuideVu();
    onFermer();
  }

  function suivant() {
    if (!peutAvancer) return;
    if (derniere) {
      fermer();
      return;
    }
    setEtapeCourante((i) => i + 1);
  }

  const libelleSuivant = (() => {
    if (derniere) return 'Explorer l’arbre';
    if (etape.id === 'explorer' && !selectionFaite) return 'Cliquez sur une personne…';
    if (etape.id === 'fiche' && !ficheVisible) return 'Ouvrez une fiche…';
    return 'Suivant';
  })();

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      {rectangle ? (
        <div
          className="pointer-events-none absolute animate-pulse rounded-[var(--rayon)] ring-2 ring-accent"
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
        <button
          type="button"
          className="absolute inset-0 bg-encre/55"
          aria-label="Fermer le guide"
          onClick={fermer}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-arbre-titre"
        className="carte pointer-events-auto fixed z-[61] p-5 shadow-[var(--ombre-forte)] apparition-douce"
        style={positionCarte(rectangle)}
      >
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-2xl leading-none">
            {etape.icone}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-accent">
              Étape {etapeCourante + 1} sur {etapes.length}
            </p>
            <h2 id="guide-arbre-titre" className="mt-0.5 font-titre text-xl text-encre">
              {etape.titre}
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-encre-douce">{etape.texte}</p>

        <div className="mt-4 flex gap-1" aria-hidden>
          {etapes.map((e, index) => (
            <span
              key={e.id}
              className={`h-1 flex-1 rounded-full transition ${
                index <= etapeCourante ? 'bg-accent' : 'bg-bordure'
              }`}
            />
          ))}
        </div>

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
              disabled={!peutAvancer}
              className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2 text-sm font-medium text-accent-contraste transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {libelleSuivant}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
