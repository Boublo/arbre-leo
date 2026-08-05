'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Palette de commandes appelée par Cmd + K (Ctrl + K).
 *
 * Sert deux mouvements courants :
 *  — retrouver une personne par son nom ou son surnom et sauter sur sa fiche,
 *  — exécuter une commande (aller à la carte, ouvrir la chronologie, etc.).
 *
 * La saisie filtre à la volée. Flèches haut/bas pour parcourir, Entrée pour
 * valider, Échap pour refermer. Le composant est contrôlé de l'extérieur :
 * on lui passe `ouvert` et `onFermer` ; le raccourci global est géré ici pour
 * éviter d'imposer un fournisseur.
 *
 * Aucune donnée personnelle en dur : la liste est passée en propriété par le
 * parent, qui la construit depuis la base.
 */

export type PersonneChoix = {
  id: string;
  nomComplet: string;
  anneeNaissance: number | null;
  anneeDeces: number | null;
};

export type Commande = {
  id: string;
  libelle: string;
  /** Chemin de navigation, si la commande est un simple lien. */
  href?: string;
  /** Action à exécuter, prioritaire sur href. */
  onExecuter?: () => void;
  /** Petite indication à droite (raccourci, catégorie…). */
  indication?: string;
};

type ElementListe =
  | { type: 'personne'; personne: PersonneChoix }
  | { type: 'commande'; commande: Commande };

/**
 * Racine de recherche : « Élise » retrouve « élise », les accents ne comptent
 * pas, la ponctuation non plus.
 */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function anneesDeVie(p: PersonneChoix): string {
  const n = p.anneeNaissance;
  const d = p.anneeDeces;
  if (n && d) return `${n} – ${d}`;
  if (n) return `né en ${n}`;
  if (d) return `† ${d}`;
  return '';
}

export function PaletteCommandes({
  ouvert,
  onFermer,
  personnes,
  commandes,
  cheminPersonne = (id) => `/personne/${id}`,
  surRaccourci,
}: {
  ouvert: boolean;
  onFermer: () => void;
  personnes: readonly PersonneChoix[];
  commandes: readonly Commande[];
  /** Comment ouvrir la fiche d'une personne. */
  cheminPersonne?: (id: string) => string;
  /** Rappel à invoquer quand l'utilisateur appuie sur Ctrl/Cmd + K ; s'il est
   *  fourni, l'écouteur global est branché. */
  surRaccourci?: () => void;
}) {
  // Raccourci global d'ouverture, monté indépendamment de l'état ouvert/fermé
  // pour rester actif en permanence sans dépendre d'un fournisseur.
  useEffect(() => {
    if (!surRaccourci) return;
    const surTouche = (evt: globalThis.KeyboardEvent) => {
      if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'k') {
        evt.preventDefault();
        surRaccourci();
      }
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [surRaccourci]);

  if (!ouvert) return null;

  return (
    <PaletteInterne
      onFermer={onFermer}
      personnes={personnes}
      commandes={commandes}
      cheminPersonne={cheminPersonne}
    />
  );
}

/**
 * Le contenu vivant de la palette. Isolé pour repartir de zéro à chaque
 * ouverture — plutôt que réinitialiser les états dans un effet, on remonte.
 */
function PaletteInterne({
  onFermer,
  personnes,
  commandes,
  cheminPersonne,
}: {
  onFermer: () => void;
  personnes: readonly PersonneChoix[];
  commandes: readonly Commande[];
  cheminPersonne: (id: string) => string;
}) {
  const router = useRouter();
  const [saisie, setSaisie] = useState('');
  const [indexActif, setIndexActif] = useState(0);
  const refSaisie = useRef<HTMLInputElement>(null);
  const refListe = useRef<HTMLUListElement>(null);
  const refDialog = useRef<HTMLDivElement>(null);
  const refDeclencheur = useRef<HTMLElement | null>(null);
  const listeId = useId();

  const elements: ElementListe[] = useMemo(() => {
    const cle = normaliser(saisie.trim());
    if (!cle) {
      // Sans saisie : commandes d'abord, quelques personnes en tête de liste.
      return [
        ...commandes.map<ElementListe>((c) => ({ type: 'commande', commande: c })),
        ...personnes.slice(0, 8).map<ElementListe>((p) => ({ type: 'personne', personne: p })),
      ];
    }

    const personnesFiltrees = personnes
      .filter((p) => normaliser(p.nomComplet).includes(cle))
      .slice(0, 20);

    const commandesFiltrees = commandes.filter((c) => normaliser(c.libelle).includes(cle));

    return [
      ...commandesFiltrees.map<ElementListe>((c) => ({ type: 'commande', commande: c })),
      ...personnesFiltrees.map<ElementListe>((p) => ({ type: 'personne', personne: p })),
    ];
  }, [saisie, personnes, commandes]);

  // Ramener l'index dans les bornes, en dérivé — évite un aller-retour d'état
  // quand la liste rétrécit.
  const indexBorne = elements.length === 0 ? 0 : Math.min(indexActif, elements.length - 1);

  // Focus initial sur le champ, une seule fois. On mémorise aussi le
  // déclencheur : c'est à lui qu'on rendra le focus à la fermeture.
  useEffect(() => {
    refDeclencheur.current =
      (document.activeElement as HTMLElement | null) ?? null;
    refSaisie.current?.focus();
    return () => {
      refDeclencheur.current?.focus?.();
    };
  }, []);

  // Fermeture par Échap et focus trap : Tab et Shift+Tab bouclent dans le
  // panneau, comme le promet aria-modal="true".
  useEffect(() => {
    function surTouche(evt: globalThis.KeyboardEvent) {
      if (evt.key === 'Escape') {
        evt.preventDefault();
        onFermer();
        return;
      }
      if (evt.key !== 'Tab') return;
      const racine = refDialog.current;
      if (!racine) return;
      const selecteur =
        'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
        'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusables = Array.from(
        racine.querySelectorAll<HTMLElement>(selecteur)
      ).filter((el) => !el.hasAttribute('inert') && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const premier = focusables[0]!;
      const dernier = focusables[focusables.length - 1]!;
      const actif = document.activeElement as HTMLElement | null;
      if (evt.shiftKey && (actif === premier || !racine.contains(actif))) {
        evt.preventDefault();
        dernier.focus();
      } else if (!evt.shiftKey && actif === dernier) {
        evt.preventDefault();
        premier.focus();
      }
    }
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [onFermer]);

  // Faire défiler l'élément actif dans la vue si besoin.
  useEffect(() => {
    if (!refListe.current) return;
    const item = refListe.current.querySelector<HTMLLIElement>(`[data-index="${indexBorne}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [indexBorne]);

  function executer(el: ElementListe) {
    if (el.type === 'personne') {
      router.push(cheminPersonne(el.personne.id));
      onFermer();
      return;
    }
    if (el.commande.onExecuter) {
      el.commande.onExecuter();
      onFermer();
      return;
    }
    if (el.commande.href) {
      router.push(el.commande.href);
      onFermer();
    }
  }

  function surToucheChamp(evt: KeyboardEvent<HTMLInputElement>) {
    if (evt.key === 'ArrowDown') {
      evt.preventDefault();
      setIndexActif((i) => (elements.length ? (i + 1) % elements.length : 0));
    } else if (evt.key === 'ArrowUp') {
      evt.preventDefault();
      setIndexActif((i) => (elements.length ? (i - 1 + elements.length) % elements.length : 0));
    } else if (evt.key === 'Enter') {
      evt.preventDefault();
      const el = elements[indexBorne];
      if (el) executer(el);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
      role="presentation"
      onClick={(evt) => {
        if (evt.target === evt.currentTarget) onFermer();
      }}
    >
      <div aria-hidden className="absolute inset-0 bg-encre/40 backdrop-blur-[1px]" />

      <div
        ref={refDialog}
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
        className="palette-entree relative flex w-full max-w-xl flex-col overflow-hidden rounded-[var(--rayon)] border border-bordure bg-fond-carte shadow-forte"
      >
        <div className="border-b border-bordure px-4 py-3">
          <label htmlFor={`${listeId}-saisie`} className="sr-only">
            Chercher une personne ou une commande
          </label>
          <input
            ref={refSaisie}
            id={`${listeId}-saisie`}
            type="text"
            value={saisie}
            onChange={(evt) => {
              setSaisie(evt.target.value);
              setIndexActif(0);
            }}
            onKeyDown={surToucheChamp}
            placeholder="Chercher un nom, une page…"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded="true"
            aria-controls={listeId}
            aria-activedescendant={
              elements[indexBorne] ? `${listeId}-el-${indexBorne}` : undefined
            }
            className="w-full bg-transparent px-1 py-1 text-base text-encre outline-none placeholder:text-encre-tres-douce"
          />
        </div>

        {elements.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-encre-douce">
            {saisie.trim() === ''
              ? 'L’arbre est encore vide — il n’y a personne à chercher pour l’instant.'
              : `Rien ne correspond à « ${saisie} ». Essayez un prénom, un surnom ou le nom d’une page.`}
          </p>
        ) : (
          <ul
            ref={refListe}
            id={listeId}
            role="listbox"
            aria-label="Résultats"
            className="max-h-[60vh] overflow-y-auto"
          >
            {elements.map((el, i) => {
              const actif = i === indexBorne;
              const cle =
                el.type === 'personne'
                  ? `personne-${el.personne.id}`
                  : `commande-${el.commande.id}`;

              return (
                <li
                  key={cle}
                  id={`${listeId}-el-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={actif}
                  onMouseEnter={() => setIndexActif(i)}
                  onClick={() => executer(el)}
                  className={`flex cursor-pointer items-center justify-between gap-3 border-b border-bordure/60 px-4 py-2.5 last:border-b-0 ${
                    actif ? 'bg-fond-doux' : ''
                  }`}
                >
                  {el.type === 'personne' ? (
                    <>
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span
                          aria-hidden
                          className="text-xs uppercase tracking-wide text-encre-tres-douce"
                        >
                          Personne
                        </span>
                        <span className="truncate text-encre">{el.personne.nomComplet}</span>
                      </span>
                      <span className="shrink-0 text-xs text-encre-douce">
                        {anneesDeVie(el.personne)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span
                          aria-hidden
                          className="text-xs uppercase tracking-wide text-encre-tres-douce"
                        >
                          Aller
                        </span>
                        <span className="truncate text-encre">{el.commande.libelle}</span>
                      </span>
                      {el.commande.indication && (
                        <span className="shrink-0 text-xs text-encre-douce">
                          {el.commande.indication}
                        </span>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-bordure bg-fond-doux px-4 py-2 text-xs text-encre-douce">
          <span>
            <kbd className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1">↑</kbd>{' '}
            <kbd className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1">↓</kbd> parcourir ·{' '}
            <kbd className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1">Entrée</kbd> ouvrir ·{' '}
            <kbd className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-1">Échap</kbd> fermer
          </span>
          <span>{elements.length} résultat{elements.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      <style>{`
        @keyframes palette-entree {
          from { transform: translateY(-6px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .palette-entree { animation: palette-entree 140ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .palette-entree { animation: none; }
        }
      `}</style>
    </div>
  );
}
