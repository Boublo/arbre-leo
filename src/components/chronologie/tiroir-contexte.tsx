'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Tiroir } from '@/components/interactions/tiroir';
import { Vignette } from '@/components/portrait/vignette';
import type { Portrait } from '@/components/portrait/types';
import {
  accorderPluriel,
  decennieDeLAnnee,
  LIBELLE_EVENEMENT,
  LIBELLE_PORTEE,
  LIBELLE_REMARQUABLE,
  type EntreeChronologie,
} from '@/components/chronologie/vocabulaire';

/**
 * Le tiroir de contextualisation.
 *
 * Une ligne de la frise ne dit rien seule : « M. mort en 1918 » n'a de sens
 * qu'en face d'un régiment envoyé en Champagne, et d'une famille qui vit alors
 * à Alger. Ce panneau lève le rideau à côté de la frise sans en quitter la
 * lecture : la personne principale du repère, ce qui se passe alors dans le
 * même lieu à quelques années près, et le fait de la grande Histoire le plus
 * proche.
 *
 * Rien n'est rechargé — la frise a déjà toutes les entrées, le tiroir se
 * contente d'en tirer un contexte cohérent, et se referme par la touche Échap
 * ou par un clic hors du panneau (mécanique du composant `Tiroir`).
 */

const ECART_DECENNIE = 10;

export function TiroirContexte({
  entree,
  toutes,
  portraits,
  ouvert,
  onFermer,
}: {
  /** L'entrée dont on veut le contexte, ou `null` quand aucun contexte n'est demandé. */
  entree: EntreeChronologie | null;
  /**
   * L'ensemble des entrées actuellement disponibles dans la frise (filtres
   * compris) : sert à retrouver les voisins de lieu et de décennie sans
   * requête supplémentaire.
   */
  toutes: EntreeChronologie[];
  /** Toutes les personnes, indexées par identifiant, pour dessiner leur vignette. */
  portraits: ReadonlyMap<string, Portrait>;
  ouvert: boolean;
  onFermer: () => void;
}) {
  const contexte = useMemo(
    () => (entree ? assemblerContexte(entree, toutes) : null),
    [entree, toutes]
  );

  // La personne « principale » de l'entrée : la première citée, faute d'indice
  // plus fin. Pour un mariage ou une union, l'un des deux conjoints suffit à
  // ouvrir la fiche ; l'autre est cité en note.
  const personneReferee =
    entree && entree.personnes.length > 0 ? entree.personnes[0] : null;
  const portrait = personneReferee ? portraits.get(personneReferee.id) ?? null : null;

  return (
    <Tiroir
      ouvert={ouvert}
      onFermer={onFermer}
      titre={entree ? 'Autour de cet événement' : undefined}
    >
      {entree ? (
        <div className="flex flex-col gap-6">
          {/* --- Ce qu'on contextualise --------------------------------------- */}
          <section aria-labelledby="tiroir-repere" className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wider text-encre-tres-douce">
              Le repère
            </p>
            <h3 id="tiroir-repere" className="text-lg text-encre">
              {entree.nature === 'famille'
                ? entree.type
                  ? LIBELLE_EVENEMENT[entree.type]
                  : 'Événement'
                : entree.titre ?? 'Fait de la grande Histoire'}
            </h3>
            <p className="text-sm text-encre-douce">
              {[entree.dateTexte, entree.lieu].filter(Boolean).join(' · ') ||
                'Date et lieu non connus'}
            </p>
            {entree.detail && (
              <p className="text-sm text-encre-douce">{entree.detail}</p>
            )}
            {entree.remarquable && (
              <p className="mt-1 rounded-[var(--rayon-petit)] border border-or/40 bg-or/10 px-3 py-2 text-xs text-encre">
                {LIBELLE_REMARQUABLE[entree.remarquable]}
              </p>
            )}
          </section>

          {/* --- La personne principale --------------------------------------- */}
          {personneReferee && (
            <section aria-labelledby="tiroir-personne" className="flex flex-col gap-2">
              <p
                id="tiroir-personne"
                className="text-xs uppercase tracking-wider text-encre-tres-douce"
              >
                Qui cela concerne
              </p>
              {portrait ? (
                <Vignette personne={portrait} />
              ) : (
                <Link
                  href={`/personne/${personneReferee.id}`}
                  className="lien-discret text-sm"
                >
                  Voir la fiche de {personneReferee.nom}
                </Link>
              )}
              {entree.personnes.length > 1 && (
                <p className="text-xs text-encre-tres-douce">
                  {accorderPluriel(
                    entree.personnes.length - 1,
                    'autre personne citée',
                    'autres personnes citées'
                  )}
                  {' : '}
                  {entree.personnes.slice(1).map((p, rang) => (
                    <span key={p.id}>
                      {rang > 0 && ', '}
                      <Link href={`/personne/${p.id}`} className="lien-discret">
                        {p.nom}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </section>
          )}

          {/* --- Autres événements du même lieu, dans la décennie ------------- */}
          <section aria-labelledby="tiroir-lieu" className="flex flex-col gap-2">
            <p
              id="tiroir-lieu"
              className="text-xs uppercase tracking-wider text-encre-tres-douce"
            >
              Au même endroit, à la même époque
            </p>
            {entree.lieu ? (
              contexte && contexte.voisinsLieu.length > 0 ? (
                <ol className="flex flex-col gap-1.5">
                  {contexte.voisinsLieu.map((voisin) => (
                    <li key={voisin.cle}>
                      <LigneVoisine voisin={voisin} />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-encre-douce">
                  {`Aucun autre événement n’est enregistré à ${entree.lieu} dans la décennie ${contexte?.decennie ?? ''}.`}
                </p>
              )
            ) : (
              <p className="text-sm text-encre-douce">
                L’événement n’a pas de lieu connu, il est donc sans voisins à
                rapprocher.
              </p>
            )}
          </section>

          {/* --- Fait historique le plus proche ------------------------------- */}
          <section aria-labelledby="tiroir-histoire" className="flex flex-col gap-2">
            <p
              id="tiroir-histoire"
              className="text-xs uppercase tracking-wider text-encre-tres-douce"
            >
              Dans la grande Histoire
            </p>
            {contexte?.faitProche ? (
              <FaitVoisin fait={contexte.faitProche} />
            ) : (
              <p className="text-sm text-encre-douce">
                Aucun fait historique enregistré à proximité de cette année.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </Tiroir>
  );
}

// ---------------------------------------------------------------------------
// Composition du contexte
// ---------------------------------------------------------------------------

type Contexte = {
  decennie: number | null;
  voisinsLieu: EntreeChronologie[];
  faitProche: EntreeChronologie | null;
};

/** Normalisation utilisée pour rapprocher deux orthographes d'un même lieu. */
function normaliserLieu(libelle: string): string {
  return libelle
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function assemblerContexte(
  entree: EntreeChronologie,
  toutes: readonly EntreeChronologie[]
): Contexte {
  const decennie = entree.annee !== null ? decennieDeLAnnee(entree.annee) : null;
  const cleLieu = entree.lieu ? normaliserLieu(entree.lieu) : null;

  const voisinsLieu: EntreeChronologie[] = [];
  if (cleLieu !== null && decennie !== null) {
    for (const autre of toutes) {
      if (autre.cle === entree.cle) continue;
      if (autre.annee === null) continue;
      if (!autre.lieu) continue;
      if (normaliserLieu(autre.lieu) !== cleLieu) continue;
      if (Math.abs(decennieDeLAnnee(autre.annee) - decennie) > 0) continue;
      voisinsLieu.push(autre);
    }
  }
  voisinsLieu.sort((a, b) => (a.tri < b.tri ? -1 : a.tri > b.tri ? 1 : 0));

  // Fait historique le plus proche : dans une fenêtre courte autour de l'année,
  // au plus près sur la ligne du temps. À défaut, aucun.
  let faitProche: EntreeChronologie | null = null;
  if (entree.annee !== null) {
    let ecartMin = Number.POSITIVE_INFINITY;
    for (const autre of toutes) {
      if (autre.nature !== 'histoire') continue;
      if (autre.annee === null) continue;
      const ecart = Math.abs(autre.annee - entree.annee);
      if (ecart > ECART_DECENNIE * 5) continue;
      if (ecart < ecartMin) {
        ecartMin = ecart;
        faitProche = autre;
      }
    }
  }

  return { decennie, voisinsLieu, faitProche };
}

// ---------------------------------------------------------------------------
// Petits rendus
// ---------------------------------------------------------------------------

function LigneVoisine({ voisin }: { voisin: EntreeChronologie }) {
  const libelle =
    voisin.nature === 'famille'
      ? voisin.type
        ? LIBELLE_EVENEMENT[voisin.type]
        : 'Événement'
      : voisin.titre ?? 'Grande Histoire';
  const noms =
    voisin.personnes.length > 0
      ? voisin.personnes.map((p) => p.nom).join(', ')
      : null;

  return (
    <article className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2 text-sm">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.09em] text-encre-tres-douce">
        {libelle}
      </p>
      <p className="text-encre">
        {noms ?? voisin.titre ?? '—'}{' '}
        <span className="text-encre-tres-douce">— {voisin.dateTexte}</span>
      </p>
    </article>
  );
}

function FaitVoisin({ fait }: { fait: EntreeChronologie }) {
  return (
    <article className="rounded-[var(--rayon-petit)] border border-dashed border-bordure-forte bg-fond-doux px-3 py-2 text-sm">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.09em] text-encre-tres-douce">
        Grande Histoire
        {fait.portee ? ` · ${LIBELLE_PORTEE[fait.portee]}` : ''}
      </p>
      <p className="font-titre text-base leading-snug text-encre">
        {fait.titre ?? 'Fait sans titre'}
      </p>
      <p className="mt-0.5 text-xs text-encre-tres-douce">
        {[fait.dateTexte, fait.lieu].filter(Boolean).join(' · ')}
      </p>
      {fait.detail && (
        <p className="mt-1 text-encre-douce">{fait.detail}</p>
      )}
      {fait.sourceUrl && (
        <a
          href={fait.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="lien-discret mt-1 inline-block text-xs"
        >
          Lire la source
        </a>
      )}
    </article>
  );
}
