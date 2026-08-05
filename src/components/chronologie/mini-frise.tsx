'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  accorderPluriel,
  chiffresRomains,
  decennieDeLAnnee,
  siecleDeLaDecennie,
  type EntreeChronologie,
} from '@/components/chronologie/vocabulaire';

/**
 * La miniature de chronologie.
 *
 * Une frise longue de trois siècles se lit mal sans regarder sa forme d'ensemble :
 * cette bande, posée en tête, donne la vue d'oiseau. Elle couvre toute
 * l'amplitude de la famille — de la première trace connue jusqu'à aujourd'hui —
 * et laisse voir d'un coup où les vies s'accumulent, où le silence s'installe.
 *
 * Un rectangle marque la portion actuellement visible ; on peut le glisser à
 * la souris ou au doigt, ou cliquer directement sur une décennie pour sauter à
 * son repère dans la frise principale.
 */

const ANNEE_MIN = 1697;
const HAUTEUR = 56;

export function MiniFrise({
  entrees,
  cibleAnnee,
  onCibler,
}: {
  entrees: EntreeChronologie[];
  /**
   * Année en tête d'affichage dans la frise principale. Sert à positionner le
   * rectangle de sélection.
   */
  cibleAnnee: number | null;
  /**
   * Rappelé quand l'utilisateur pointe une décennie : à charge de l'appelant
   * de faire défiler la frise principale vers le repère correspondant.
   */
  onCibler: (decennie: number) => void;
}) {
  const anneeMax = useMemo(() => new Date().getFullYear(), []);
  const decennieDeb = decennieDeLAnnee(ANNEE_MIN);
  const decennieFin = decennieDeLAnnee(anneeMax);

  /**
   * Décomptes par décennie : la famille d'un côté, la grande Histoire de
   * l'autre. Les deux fils ne sont pas additionnés pour que la barre garde son
   * sens de fond — c'est la vie de la famille qu'on lit d'abord.
   */
  const barres = useMemo(() => {
    const parDecennie = new Map<number, { famille: number; histoire: number }>();
    for (let d = decennieDeb; d <= decennieFin; d += 10) {
      parDecennie.set(d, { famille: 0, histoire: 0 });
    }

    for (const entree of entrees) {
      if (entree.annee === null) continue;
      const d = decennieDeLAnnee(entree.annee);
      const bloc = parDecennie.get(d);
      if (!bloc) continue;
      if (entree.nature === 'famille') bloc.famille += 1;
      else bloc.histoire += 1;
    }

    let maximum = 1;
    for (const bloc of parDecennie.values()) {
      const somme = bloc.famille + bloc.histoire;
      if (somme > maximum) maximum = somme;
    }

    return { parDecennie, maximum };
  }, [entrees, decennieDeb, decennieFin]);

  const decennies = useMemo(() => {
    const liste: number[] = [];
    for (let d = decennieDeb; d <= decennieFin; d += 10) liste.push(d);
    return liste;
  }, [decennieDeb, decennieFin]);

  const refPiste = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(0);

  useLayoutEffect(() => {
    const piste = refPiste.current;
    if (!piste) return;

    const mesurer = () => setLargeur(piste.clientWidth);
    mesurer();

    // Sur redimensionnement — la miniature s'ajuste à la colonne.
    if (typeof ResizeObserver === 'undefined') return;
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(piste);
    return () => observateur.disconnect();
  }, []);

  const nombreDecennies = decennies.length;
  const largeurBarre = nombreDecennies > 0 ? largeur / nombreDecennies : 0;

  /** Position en pixels d'une décennie donnée, bord gauche de sa barre. */
  const xDeDecennie = useCallback(
    (decennie: number) => ((decennie - decennieDeb) / 10) * largeurBarre,
    [decennieDeb, largeurBarre]
  );

  /** Décennie sous une position pixel, en la ramenant dans les bornes. */
  const decennieDeX = useCallback(
    (x: number) => {
      if (nombreDecennies === 0 || largeurBarre === 0) return decennieDeb;
      const rang = Math.floor(x / largeurBarre);
      const borne = Math.min(Math.max(rang, 0), nombreDecennies - 1);
      return decennieDeb + borne * 10;
    },
    [decennieDeb, largeurBarre, nombreDecennies]
  );

  const cibleDecennie =
    cibleAnnee !== null ? decennieDeLAnnee(cibleAnnee) : null;

  // --- Glissement du rectangle ------------------------------------------------

  const [glissement, setGlissement] = useState<{
    pointerId: number;
    ecartX: number;
  } | null>(null);

  const declencher = useCallback(
    (x: number) => {
      if (largeurBarre === 0) return;
      const dec = decennieDeX(x);
      onCibler(dec);
    },
    [decennieDeX, largeurBarre, onCibler]
  );

  function surPistePointerDown(evt: ReactPointerEvent<HTMLDivElement>) {
    if (evt.button !== undefined && evt.button !== 0) return;
    const rect = evt.currentTarget.getBoundingClientRect();
    declencher(evt.clientX - rect.left);
  }

  function surSelectionPointerDown(evt: ReactPointerEvent<HTMLDivElement>) {
    if (evt.button !== undefined && evt.button !== 0) return;
    evt.stopPropagation();
    const piste = refPiste.current;
    if (!piste || cibleDecennie === null) return;

    const rect = piste.getBoundingClientRect();
    const xRectangle = xDeDecennie(cibleDecennie);
    evt.currentTarget.setPointerCapture(evt.pointerId);
    setGlissement({
      pointerId: evt.pointerId,
      ecartX: evt.clientX - rect.left - xRectangle,
    });
  }

  function surGlissementPointerMove(evt: ReactPointerEvent<HTMLDivElement>) {
    if (!glissement || evt.pointerId !== glissement.pointerId) return;
    const piste = refPiste.current;
    if (!piste) return;
    const rect = piste.getBoundingClientRect();
    declencher(evt.clientX - rect.left - glissement.ecartX);
  }

  function surGlissementPointerUp(evt: ReactPointerEvent<HTMLDivElement>) {
    if (!glissement || evt.pointerId !== glissement.pointerId) return;
    try {
      evt.currentTarget.releasePointerCapture(evt.pointerId);
    } catch {
      // Rien : la capture peut avoir été libérée par le navigateur.
    }
    setGlissement(null);
  }

  // Flèches gauche / droite quand la miniature a le focus : accès clavier.
  function surTouchePiste(evt: ReactKeyboardEvent<HTMLDivElement>) {
    if (cibleDecennie === null) return;
    if (evt.key === 'ArrowLeft') {
      evt.preventDefault();
      onCibler(Math.max(decennieDeb, cibleDecennie - 10));
    } else if (evt.key === 'ArrowRight') {
      evt.preventDefault();
      onCibler(Math.min(decennieFin, cibleDecennie + 10));
    } else if (evt.key === 'Home') {
      evt.preventDefault();
      onCibler(decennieDeb);
    } else if (evt.key === 'End') {
      evt.preventDefault();
      onCibler(decennieFin);
    }
  }

  const siecleDeb = siecleDeLaDecennie(decennieDeb);
  const siecleFin = siecleDeLaDecennie(decennieFin);
  const nombreEntrees = entrees.filter((e) => e.annee !== null).length;

  return (
    <section
      aria-label="Miniature de la chronologie"
      className="carte px-3 py-2 sm:px-4"
    >
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs text-encre-tres-douce">
        <span className="tabular-nums">
          {ANNEE_MIN} — {anneeMax} · du {chiffresRomains(siecleDeb)}
          <sup>e</sup> au {chiffresRomains(siecleFin)}
          <sup>e</sup> siècle
        </span>
        <span className="tabular-nums">
          {accorderPluriel(nombreEntrees, 'entrée datée', 'entrées datées')}
        </span>
      </div>

      <div
        ref={refPiste}
        role="slider"
        aria-label="Sauter à une décennie"
        aria-valuemin={decennieDeb}
        aria-valuemax={decennieFin}
        aria-valuenow={cibleDecennie ?? decennieDeb}
        aria-valuetext={
          cibleDecennie !== null ? `Années ${cibleDecennie}` : undefined
        }
        tabIndex={0}
        onPointerDown={surPistePointerDown}
        onKeyDown={surTouchePiste}
        className="relative h-14 w-full cursor-pointer select-none rounded-[var(--rayon-petit)] bg-fond-doux focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{ height: HAUTEUR }}
      >
        {/* Barres de décennies : famille en pleine couleur, histoire en pointillé. */}
        <div className="absolute inset-0 flex items-end px-0.5" aria-hidden>
          {decennies.map((d) => {
            const bloc = barres.parDecennie.get(d) ?? { famille: 0, histoire: 0 };
            const hauteurFamille = bloc.famille
              ? Math.max(2, (bloc.famille / barres.maximum) * (HAUTEUR - 12))
              : 0;
            const hauteurHistoire = bloc.histoire
              ? Math.max(2, (bloc.histoire / barres.maximum) * (HAUTEUR - 12))
              : 0;
            return (
              <div
                key={d}
                className="flex h-full flex-1 flex-col justify-end gap-[1px]"
                style={{ maxWidth: `${100 / nombreDecennies}%` }}
                title={`Années ${d} — ${bloc.famille} de la famille, ${bloc.histoire} de la grande Histoire`}
              >
                {hauteurHistoire > 0 && (
                  <div
                    className="mx-[1px] rounded-[var(--rayon-petit)] bg-encre-tres-douce/40"
                    style={{ height: hauteurHistoire }}
                  />
                )}
                {hauteurFamille > 0 && (
                  <div
                    className="mx-[1px] rounded-[var(--rayon-petit)] bg-accent/70"
                    style={{ height: hauteurFamille }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Repères de siècles : traits verticaux discrets. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {decennies
            .filter((d) => d % 100 === 0 && d !== decennieDeb)
            .map((d) => (
              <span
                key={`siecle-${d}`}
                className="absolute top-0 h-full w-px bg-bordure-forte/70"
                style={{ left: xDeDecennie(d) }}
              />
            ))}
        </div>

        {/* Rectangle de portion visible. */}
        {cibleDecennie !== null && largeurBarre > 0 && (
          <div
            onPointerDown={surSelectionPointerDown}
            onPointerMove={surGlissementPointerMove}
            onPointerUp={surGlissementPointerUp}
            onPointerCancel={surGlissementPointerUp}
            aria-label={`Décennie affichée : ${cibleDecennie}. Glisser pour déplacer.`}
            className="absolute top-0 h-full cursor-grab rounded-[var(--rayon-petit)] border-2 border-accent bg-accent/10 shadow-[var(--ombre-douce)] active:cursor-grabbing"
            style={{
              left: xDeDecennie(cibleDecennie) - 2,
              width: Math.max(largeurBarre * 2 + 4, 20),
            }}
          >
            <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-bordure bg-fond-carte px-1.5 text-[10px] font-medium tabular-nums text-encre shadow-[var(--ombre-douce)]">
              {cibleDecennie}
            </span>
          </div>
        )}
      </div>

      {/* Repères de bord : les deux extrêmes de l'amplitude. */}
      <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-encre-tres-douce">
        <span>{ANNEE_MIN}</span>
        <span>{anneeMax}</span>
      </div>
    </section>
  );
}

/**
 * Repère l'année de la première décennie encore visible dans la frise
 * principale, en observant les repères de décennie posés en flux. Sert à
 * synchroniser la miniature quand l'utilisateur fait défiler la page.
 */
export function useDecennieVisible(): number | null {
  const [decennie, setDecennie] = useState<number | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observateur = new IntersectionObserver(
      (entrees) => {
        const visibles = entrees
          .filter((e) => e.isIntersecting)
          .map((e) => {
            const attribut = e.target.getAttribute('data-decennie');
            return attribut ? Number.parseInt(attribut, 10) : Number.NaN;
          })
          .filter((n) => Number.isFinite(n))
          .sort((a, b) => a - b);

        if (visibles.length > 0) setDecennie(visibles[0]!);
      },
      {
        // On préfère qu'un repère soit compté « visible » un peu avant qu'il
        // ne touche le bord haut, pour anticiper le glissement de la miniature.
        rootMargin: '-160px 0px -60% 0px',
        threshold: 0,
      }
    );

    // Enregistrement initial de tout ce qui porte l'attribut.
    const observes = new WeakSet<Element>();
    function observerTout() {
      const cibles = document.querySelectorAll<HTMLElement>('[data-decennie]');
      cibles.forEach((c) => {
        if (!observes.has(c)) {
          observateur.observe(c);
          observes.add(c);
        }
      });
    }
    observerTout();

    // Les filtres de la chronologie ajoutent et retirent des repères en flux :
    // un MutationObserver rebranche l'IntersectionObserver quand la liste
    // change, sans quoi la miniature se désynchroniserait au premier filtre.
    let mutation: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      mutation = new MutationObserver(() => observerTout());
      mutation.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observateur.disconnect();
      mutation?.disconnect();
    };
  }, []);

  return decennie;
}
