'use client';

import type { TypeEvenement } from '@/lib/types-base';
import {
  accorderPluriel,
  chiffresRomains,
  LIBELLE_EVENEMENT,
} from '@/components/chronologie/vocabulaire';

/**
 * Le bandeau de réglages, posé en haut de la frise et qui l'accompagne au
 * défilement. Trois siècles se parcourent mal sans repères : on y trouve aussi
 * de quoi sauter d'un siècle à l'autre, et le décompte de ce qui est affiché.
 */

export type ChoixCote = 'toutes' | 'paternelle' | 'maternelle';

export type Filtres = {
  cote: ChoixCote;
  /** Types décochés. Vide au départ : tout est montré tant qu'on n'a rien retiré. */
  typesEcartes: TypeEvenement[];
  masquerHistoire: boolean;
};

const CHOIX_COTE: { valeur: ChoixCote; libelle: string }[] = [
  { valeur: 'toutes', libelle: 'Les deux' },
  { valeur: 'paternelle', libelle: 'Paternelle' },
  { valeur: 'maternelle', libelle: 'Maternelle' },
];

const PASTILLE =
  'cursor-pointer rounded-full border border-bordure px-3 py-1 text-sm text-encre-douce transition ' +
  'hover:bg-fond-doux hover:text-encre ' +
  'has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-contraste ' +
  'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ' +
  'has-[:focus-visible]:outline-accent';

export function FiltresFrise({
  filtres,
  surChangement,
  typesPresents,
  comptes,
  siecles,
  nombreSansAnnee,
}: {
  filtres: Filtres;
  surChangement: (filtres: Filtres) => void;
  typesPresents: { type: TypeEvenement; nombre: number }[];
  comptes: { affichees: number; total: number; famille: number; histoire: number };
  siecles: number[];
  nombreSansAnnee: number;
}) {
  const retenus = typesPresents.length - filtres.typesEcartes.length;

  const basculerType = (type: TypeEvenement) => {
    const ecartes = filtres.typesEcartes.includes(type)
      ? filtres.typesEcartes.filter((t) => t !== type)
      : [...filtres.typesEcartes, type];
    surChangement({ ...filtres, typesEcartes: ecartes });
  };

  return (
    <div className="sticky top-0 z-10 border-b border-bordure bg-fond">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-3 sm:px-6">
        {/* --- Côté de la famille, grande Histoire, décompte ------------------- */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <fieldset className="flex flex-wrap items-center gap-1.5">
            <legend className="sr-only">Branche de la famille</legend>
            <span aria-hidden className="mr-0.5 text-xs uppercase tracking-wider text-encre-tres-douce">
              Branche
            </span>
            {CHOIX_COTE.map((choix) => (
              <label key={choix.valeur} className={PASTILLE}>
                <input
                  type="radio"
                  name="chronologie-cote"
                  value={choix.valeur}
                  checked={filtres.cote === choix.valeur}
                  onChange={() => surChangement({ ...filtres, cote: choix.valeur })}
                  className="sr-only"
                />
                {choix.libelle}
              </label>
            ))}
          </fieldset>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-encre-douce">
            <input
              type="checkbox"
              checked={filtres.masquerHistoire}
              onChange={(e) => surChangement({ ...filtres, masquerHistoire: e.target.checked })}
              className="h-4 w-4 accent-accent"
            />
            Masquer la grande Histoire
          </label>

          <p
            aria-live="polite"
            className="ml-auto text-sm text-encre-douce tabular-nums"
          >
            <strong className="font-medium text-encre">
              {accorderPluriel(comptes.affichees, 'entrée affichée', 'entrées affichées')}
            </strong>{' '}
            <span className="text-encre-tres-douce">
              sur {comptes.total.toLocaleString('fr-FR')} — {comptes.famille.toLocaleString('fr-FR')} de
              la famille, {comptes.histoire.toLocaleString('fr-FR')} de la grande Histoire
            </span>
          </p>
        </div>

        {/* --- Types d'événements, repliés pour ne pas manger la page ---------- */}
        {typesPresents.length > 0 && (
          <details className="group">
            <summary className="inline-flex w-fit cursor-pointer list-none items-center gap-1.5 text-sm text-encre-douce [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="inline-block transition-transform group-open:rotate-90">
                ▸
              </span>
              Types d’événements
              <span className="text-encre-tres-douce">
                ({retenus} sur {typesPresents.length})
              </span>
            </summary>

            <fieldset className="mt-2 flex flex-wrap items-center gap-1.5">
              <legend className="sr-only">Types d’événements à afficher</legend>

              {typesPresents.map(({ type, nombre }) => (
                <label key={type} className={PASTILLE}>
                  <input
                    type="checkbox"
                    checked={!filtres.typesEcartes.includes(type)}
                    onChange={() => basculerType(type)}
                    className="sr-only"
                  />
                  {LIBELLE_EVENEMENT[type]}{' '}
                  <span className="tabular-nums opacity-70">{nombre}</span>
                </label>
              ))}

              <span className="ml-1 flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => surChangement({ ...filtres, typesEcartes: [] })}
                  className="lien-discret"
                >
                  Tout cocher
                </button>
                <button
                  type="button"
                  onClick={() =>
                    surChangement({
                      ...filtres,
                      typesEcartes: typesPresents.map((t) => t.type),
                    })
                  }
                  className="lien-discret"
                >
                  Tout décocher
                </button>
              </span>
            </fieldset>
          </details>
        )}

        {/* --- Sauter d'un siècle à l'autre ------------------------------------ */}
        {(siecles.length > 0 || nombreSansAnnee > 0) && (
          <nav aria-label="Aller à un siècle" className="flex flex-wrap items-center gap-1.5">
            <span aria-hidden className="mr-0.5 text-xs uppercase tracking-wider text-encre-tres-douce">
              Aller à
            </span>
            {siecles.map((siecle) => (
              <a
                key={siecle}
                href={`#siecle-${siecle}`}
                className="rounded-full border border-bordure px-2.5 py-1 text-xs text-encre-douce transition hover:bg-fond-doux hover:text-encre"
              >
                {chiffresRomains(siecle)}
                <sup>e</sup> siècle
              </a>
            ))}
            {nombreSansAnnee > 0 && (
              <a
                href="#sans-annee"
                className="rounded-full border border-dashed border-bordure-forte px-2.5 py-1 text-xs text-encre-douce transition hover:bg-fond-doux hover:text-encre"
              >
                Sans date connue
              </a>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
