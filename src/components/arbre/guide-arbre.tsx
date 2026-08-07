'use client';

import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import { PRENOM_RACINE } from '@/lib/branches';
import { LIBELLE_MODE, type ModeArbre } from '@/lib/layout-arbre';

const CLE_GUIDE_VU = 'arbre-guide-v3';

type EtapeGuide = {
  id: string;
  icone: string;
  titre: string;
  texte: string | ((ctx: { mode: ModeArbre; prenom: string }) => string);
  cible?: string;
  attendreSelection?: boolean;
};

function etapesGuide(nomFocus: string): EtapeGuide[] {
  const prenom =
    PRENOM_RACINE === 'L’enfant' ? (nomFocus.split(/\s+/)[0] ?? PRENOM_RACINE) : PRENOM_RACINE;

  return [
    {
      id: 'bienvenue',
      icone: '🌳',
      titre: 'Bienvenue dans l’arbre',
      texte: `L’arbre part de ${prenom}. Vous le voyez au centre, entouré de sa famille — parents, grands-parents, cousins. C’est votre point de départ.`,
      cible: 'arbre',
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
      texte: ({ mode }) =>
        mode === 'ascendance'
          ? 'Vous êtes en « D’où il vient » : les ancêtres remontent vers le haut. Essayez les autres onglets pour élargir ou descendre.'
          : mode === 'famille'
            ? '« La famille autour » montre parents, fratrie, cousins et enfants — une vue équilibrée pour se repérer.'
            : mode === 'descendance'
              ? '« Ce qu’il a laissé » suit les enfants et petits-enfants vers le bas.'
              : 'Le mode « Tout » déploie l’entourage complet — utile pour une vue d’ensemble.',
      cible: 'modes',
    },
    {
      id: 'explorer',
      icone: '👆',
      titre: 'Essayez par vous-même',
      texte: 'La carte qui pulse est cliquable : ouvrez la fiche d’un parent ou d’un proche. Double-cliquez sur quelqu’un pour repartir d’elle.',
      cible: 'arbre',
      attendreSelection: true,
    },
    {
      id: 'fiche',
      icone: '📋',
      titre: 'La fiche latérale',
      texte: 'La fiche résume l’essentiel : dates, liens, photos. « Repartir d’ici » recentre tout l’arbre sur cette personne.',
      cible: 'fiche',
    },
    {
      id: 'controles',
      icone: '🎛',
      titre: 'Zoom et légende',
      texte: 'Agrandissez, réduisez ou cadrez tout l’arbre d’un clic. La légende en bas rappelle les couleurs des branches et les symboles.',
      cible: 'controles',
    },
    {
      id: 'chercher',
      icone: '🔍',
      titre: 'Trouver quelqu’un vite',
      texte: 'Appuyez sur F (ou sur la loupe) pour chercher une personne par son nom et vous y rendre en un clic.',
      cible: 'chercher',
    },
    {
      id: 'fond-arbre',
      icone: '🎨',
      titre: 'Personnaliser le fond',
      texte: 'Quatre ambiances sont proposées : grille discrète, parchemin uni, parchemin vivant ou aurore. Le choix est mémorisé pour vos prochaines visites.',
      cible: 'fond-arbre',
    },
    {
      id: 'imprimer',
      icone: '🖨',
      titre: 'Imprimer ou partager',
      texte: 'La vue imprimable prépare un schéma lisible sur papier : réglez la profondeur, le format et lancez l’impression (ou le PDF) depuis votre navigateur. Raccourci : P.',
      cible: 'imprimer',
    },
    {
      id: 'fin',
      icone: '✨',
      titre: 'C’est parti',
      texte: 'Relancez ce guide à tout moment avec le bouton ?. Bonne exploration !',
      cible: 'guide-aide',
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

function MasqueGuide({
  rectangle,
  onFermer,
}: {
  rectangle: Rectangle | null;
  onFermer: () => void;
}) {
  const masqueId = useId().replace(/:/g, '');

  if (!rectangle) {
    return (
      <button
        type="button"
        className="absolute inset-0 bg-encre/55"
        aria-label="Fermer le guide"
        onClick={onFermer}
      />
    );
  }

  const { top, left, width, height } = rectangle;

  return (
  <svg className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <mask id={masqueId}>
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={left}
            y={top}
            width={width}
            height={height}
            rx={12}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(15, 12, 8, 0.55)"
        mask={`url(#${masqueId})`}
        className="pointer-events-auto"
        onClick={onFermer}
      />
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        rx={12}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        className="pointer-events-none animate-pulse"
      />
    </svg>
  );
}

export function guideDejaVu(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(CLE_GUIDE_VU) === '1';
  } catch {
    return true;
  }
}

import { notifierStockageLocal } from '@/lib/stockage-client';

export function marquerGuideVu() {
  try {
    localStorage.setItem(CLE_GUIDE_VU, '1');
    notifierStockageLocal();
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
  mode,
  selectionFaite,
  ficheVisible,
  onEtapeChange,
}: {
  ouvert: boolean;
  onFermer: () => void;
  nomFocus: string;
  mode: ModeArbre;
  selectionFaite: boolean;
  ficheVisible: boolean;
  onEtapeChange?: (etapeId: string) => void;
}) {
  if (!ouvert) return null;

  return (
    <GuideArbreActif
      onFermer={onFermer}
      nomFocus={nomFocus}
      mode={mode}
      selectionFaite={selectionFaite}
      ficheVisible={ficheVisible}
      onEtapeChange={onEtapeChange}
    />
  );
}

function GuideArbreActif({
  onFermer,
  nomFocus,
  mode,
  selectionFaite,
  ficheVisible,
  onEtapeChange,
}: {
  onFermer: () => void;
  nomFocus: string;
  mode: ModeArbre;
  selectionFaite: boolean;
  ficheVisible: boolean;
  onEtapeChange?: (etapeId: string) => void;
}) {
  const etapes = useMemo(() => etapesGuide(nomFocus), [nomFocus]);
  const [etapeCourante, setEtapeCourante] = useState(0);
  const [rectangle, setRectangle] = useState<Rectangle | null>(null);

  const etape = etapes[etapeCourante]!;
  const derniere = etapeCourante === etapes.length - 1;
  const prenom =
    PRENOM_RACINE === 'L’enfant' ? (nomFocus.split(/\s+/)[0] ?? PRENOM_RACINE) : PRENOM_RACINE;
  const texteEtape =
    typeof etape.texte === 'function' ? etape.texte({ mode, prenom }) : etape.texte;

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
    onEtapeChange?.(etape.id);
  }, [etape.id, onEtapeChange]);

  useEffect(() => {
    if (!etape.attendreSelection || !selectionFaite) return;
    if (etape.id !== 'explorer') return;

    const id = window.setTimeout(() => {
      const indexFiche = etapes.findIndex((e) => e.id === 'fiche');
      if (indexFiche >= 0) setEtapeCourante(indexFiche);
    }, 600);

    return () => window.clearTimeout(id);
  }, [etape.id, etape.attendreSelection, selectionFaite, etapes]);

  useEffect(() => {
    const id = window.setTimeout(actualiserRectangle, 0);
    const id2 = window.setTimeout(actualiserRectangle, 120);

    window.addEventListener('resize', actualiserRectangle);
    window.addEventListener('scroll', actualiserRectangle, true);

    return () => {
      window.clearTimeout(id);
      window.clearTimeout(id2);
      window.removeEventListener('resize', actualiserRectangle);
      window.removeEventListener('scroll', actualiserRectangle, true);
    };
  }, [etapeCourante, actualiserRectangle]);

  const fermer = useCallback(() => {
    marquerGuideVu();
    onFermer();
  }, [onFermer]);

  const suivant = useCallback(() => {
    if (!peutAvancer) return;
    if (derniere) {
      fermer();
      return;
    }
    setEtapeCourante((i) => i + 1);
  }, [peutAvancer, derniere, fermer]);

  useEffect(() => {
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
        fermer();
        return;
      }

      if (evt.key === 'Enter' && peutAvancer) {
        evt.preventDefault();
        suivant();
      }
    }

    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [peutAvancer, fermer, suivant]);

  const libelleSuivant = (() => {
    if (derniere) return 'Explorer l’arbre';
    if (etape.id === 'explorer' && !selectionFaite) return 'Cliquez sur la carte qui pulse…';
    if (etape.id === 'fiche' && !ficheVisible) return 'Ouvrez une fiche…';
    return 'Suivant';
  })();

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <MasqueGuide rectangle={rectangle} onFermer={fermer} />

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

        <p className="mt-3 text-sm leading-relaxed text-encre-douce">{texteEtape}</p>

        {etape.id === 'modes' && (
          <p className="mt-2 text-xs text-encre-tres-douce">
            Mode actuel : <strong className="text-encre">{LIBELLE_MODE[mode].titre}</strong>
          </p>
        )}

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
