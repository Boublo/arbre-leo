'use client';

import { useId } from 'react';
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
 *
 * On y règle également ce qu'on cherche à voir en priorité : une personne
 * précise, un lieu, ou l'un des repères marquants qui ont fait tourner la
 * géographie de la famille. Le tout se replie sous une ligne pour ne pas
 * couvrir la frise elle-même.
 */

export type ChoixCote = 'toutes' | 'paternelle' | 'maternelle';

export type VueChronologie = 'chronologique' | 'lieux';

export type Filtres = {
  cote: ChoixCote;
  /** Types décochés. Vide au départ : tout est montré tant qu'on n'a rien retiré. */
  typesEcartes: TypeEvenement[];
  masquerHistoire: boolean;
  /** Identifiant d'une personne à laquelle se restreindre, ou `null` pour tout garder. */
  personneId: string | null;
  /** Libellé d'un lieu à retenir, ou `null` pour tout garder. */
  lieu: string | null;
  /** Ne montrer que les repères marquants (décès d'aïeul, arrivée dans un lieu nouveau). */
  marquants: boolean;
  /** Ne montrer que les événements adossés à un acte. */
  seulementEtayes: boolean;
  vue: VueChronologie;
};

export const FILTRES_INITIAUX: Filtres = {
  cote: 'toutes',
  typesEcartes: [],
  masquerHistoire: false,
  personneId: null,
  lieu: null,
  marquants: false,
  seulementEtayes: false,
  vue: 'chronologique',
};

const CHOIX_COTE: { valeur: ChoixCote; libelle: string }[] = [
  { valeur: 'toutes', libelle: 'Les deux' },
  { valeur: 'paternelle', libelle: 'Paternelle' },
  { valeur: 'maternelle', libelle: 'Maternelle' },
];

const CHOIX_VUE: { valeur: VueChronologie; libelle: string; aide: string }[] = [
  { valeur: 'chronologique', libelle: 'Par époque', aide: 'La frise dans l’ordre du temps.' },
  { valeur: 'lieux', libelle: 'Par lieu', aide: 'La frise regroupée par lieu, dans l’ordre où la famille les a fréquentés.' },
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
  personnesPresentes,
  lieuxPresents,
  nombreMarquants,
}: {
  filtres: Filtres;
  surChangement: (filtres: Filtres) => void;
  typesPresents: { type: TypeEvenement; nombre: number }[];
  comptes: { affichees: number; total: number; famille: number; histoire: number };
  siecles: number[];
  nombreSansAnnee: number;
  /** Personnes concernées par au moins un événement, pour l'affinage par personne. */
  personnesPresentes: { id: string; libelle: string; nombre: number }[];
  /** Lieux distincts rencontrés au moins une fois, pour l'affinage par lieu. */
  lieuxPresents: { libelle: string; nombre: number }[];
  nombreMarquants: number;
}) {
  const idPersonne = useId();
  const idLieu = useId();
  const listePersonnes = `${idPersonne}-liste`;
  const listeLieux = `${idLieu}-liste`;

  const retenus = typesPresents.length - filtres.typesEcartes.length;
  const chercheEnLibre = filtres.personneId !== null || filtres.lieu !== null;

  const basculerType = (type: TypeEvenement) => {
    const ecartes = filtres.typesEcartes.includes(type)
      ? filtres.typesEcartes.filter((t) => t !== type)
      : [...filtres.typesEcartes, type];
    surChangement({ ...filtres, typesEcartes: ecartes });
  };

  return (
    <div className="sticky top-0 z-10 border-b border-bordure bg-fond">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-3 sm:px-6">
        {/* --- Vue, côté de la famille, décompte ------------------------------- */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <fieldset className="flex flex-wrap items-center gap-1.5">
            <legend className="sr-only">Mode d’affichage de la frise</legend>
            <span aria-hidden className="mr-0.5 text-xs uppercase tracking-wider text-encre-tres-douce">
              Vue
            </span>
            {CHOIX_VUE.map((choix) => (
              <label key={choix.valeur} className={PASTILLE} title={choix.aide}>
                <input
                  type="radio"
                  name="chronologie-vue"
                  value={choix.valeur}
                  checked={filtres.vue === choix.valeur}
                  onChange={() => surChangement({ ...filtres, vue: choix.valeur })}
                  className="sr-only"
                />
                {choix.libelle}
              </label>
            ))}
          </fieldset>

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

        {/* --- Affinage : personne, lieu, marquants, étayés -------------------- */}
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <div className="flex min-w-52 flex-1 flex-col">
            <label htmlFor={idPersonne} className="text-xs uppercase tracking-wider text-encre-tres-douce">
              Personne
            </label>
            <input
              id={idPersonne}
              list={listePersonnes}
              type="text"
              defaultValue={
                filtres.personneId
                  ? personnesPresentes.find((p) => p.id === filtres.personneId)?.libelle ?? ''
                  : ''
              }
              key={filtres.personneId ?? 'vide-personne'}
              placeholder="Un nom, un surnom…"
              onChange={(evt) => {
                const brut = evt.target.value.trim();
                if (brut === '') {
                  if (filtres.personneId !== null) surChangement({ ...filtres, personneId: null });
                  return;
                }
                const trouvee = personnesPresentes.find((p) => p.libelle === brut);
                if (trouvee) surChangement({ ...filtres, personneId: trouvee.id });
              }}
              className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-1.5 text-sm text-encre placeholder:text-encre-tres-douce focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <datalist id={listePersonnes}>
              {personnesPresentes.map((p) => (
                <option key={p.id} value={p.libelle} label={`${p.nombre} événement${p.nombre > 1 ? 's' : ''}`} />
              ))}
            </datalist>
          </div>

          <div className="flex min-w-40 flex-1 flex-col">
            <label htmlFor={idLieu} className="text-xs uppercase tracking-wider text-encre-tres-douce">
              Lieu
            </label>
            <input
              id={idLieu}
              list={listeLieux}
              type="text"
              defaultValue={filtres.lieu ?? ''}
              key={filtres.lieu ?? 'vide-lieu'}
              placeholder="Une commune, un pays…"
              onChange={(evt) => {
                const brut = evt.target.value.trim();
                if (brut === '') {
                  if (filtres.lieu !== null) surChangement({ ...filtres, lieu: null });
                  return;
                }
                const trouve = lieuxPresents.find((l) => l.libelle === brut);
                if (trouve) surChangement({ ...filtres, lieu: trouve.libelle });
              }}
              className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-1.5 text-sm text-encre placeholder:text-encre-tres-douce focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <datalist id={listeLieux}>
              {lieuxPresents.map((l) => (
                <option key={l.libelle} value={l.libelle} label={`${l.nombre} événement${l.nombre > 1 ? 's' : ''}`} />
              ))}
            </datalist>
          </div>

          <label
            className="flex cursor-pointer items-center gap-2 text-sm text-encre-douce"
            title="Les décès d’aïeul de large descendance et les premières apparitions d’un lieu"
          >
            <input
              type="checkbox"
              checked={filtres.marquants}
              onChange={(evt) => surChangement({ ...filtres, marquants: evt.target.checked })}
              className="h-4 w-4 accent-accent"
              disabled={nombreMarquants === 0}
            />
            <span aria-hidden className="text-or">★</span>
            Repères marquants
            <span className="text-encre-tres-douce">({nombreMarquants})</span>
          </label>

          <label
            className="flex cursor-pointer items-center gap-2 text-sm text-encre-douce"
            title="Événements adossés à un acte d’état civil"
          >
            <input
              type="checkbox"
              checked={filtres.seulementEtayes}
              onChange={(evt) => surChangement({ ...filtres, seulementEtayes: evt.target.checked })}
              className="h-4 w-4 accent-accent"
            />
            <span aria-hidden className="text-or">◆</span>
            Étayés par un acte
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-encre-douce">
            <input
              type="checkbox"
              checked={filtres.masquerHistoire}
              onChange={(e) => surChangement({ ...filtres, masquerHistoire: e.target.checked })}
              className="h-4 w-4 accent-accent"
            />
            Masquer la grande Histoire
          </label>

          {(chercheEnLibre || filtres.marquants || filtres.seulementEtayes) && (
            <button
              type="button"
              onClick={() =>
                surChangement({
                  ...filtres,
                  personneId: null,
                  lieu: null,
                  marquants: false,
                  seulementEtayes: false,
                })
              }
              className="lien-discret text-xs"
            >
              Effacer les affinages
            </button>
          )}
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

        {/* --- Sauter d'un siècle à l'autre — vue chronologique seulement ----- */}
        {filtres.vue === 'chronologique' && (siecles.length > 0 || nombreSansAnnee > 0) && (
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
