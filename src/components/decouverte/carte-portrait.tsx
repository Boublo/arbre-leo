import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PersonneArbre } from '@/lib/arbre';
import { anneesDeVie } from '@/components/decouverte/annees';
import { coteDesBranches, LIBELLE_COTE, TON_COTE } from '@/lib/branches';

/**
 * Portrait mis en avant, avec la raison de sa présence.
 *
 * Sert à ouvrir la découverte sur une personne précise — le doyen d'une
 * branche, un enfant qui vient de naître, une aïeule dont on vient de retrouver
 * l'acte. La raison s'affiche en tête, en petites capitales : elle prépare le
 * regard avant même d'annoncer le nom.
 *
 * L'ensemble de la carte est cliquable et mène à la fiche. Le monogramme, à
 * gauche, prend la teinte de la branche : un repère visuel, jamais l'unique
 * porteur de l'information.
 */

/**
 * Le monogramme est purement décoratif : la première lettre du premier prénom,
 * ou une initiale neutre si le prénom manque. Aucune donnée réelle n'est en
 * dur ici — la lettre vient exclusivement de la personne passée en argument.
 */
function initiale(personne: PersonneArbre): string {
  const prenom = personne.prenoms?.trim().split(/\s+/)[0];
  const lettre = prenom?.[0] ?? personne.nom?.[0] ?? '·';
  return lettre.toUpperCase();
}

export function CartePortrait({
  personne,
  raison,
  aide,
}: {
  personne: PersonneArbre;
  /** Pourquoi cette personne est-elle mise en avant ? Ex. « Doyenne de l’arbre ». */
  raison: string;
  /** Complément facultatif : circonstance, précision, courte anecdote sourcée. */
  aide?: ReactNode;
}) {
  const cote = coteDesBranches(personne.branches);
  const annees = anneesDeVie(personne);
  const ton = TON_COTE[cote];

  return (
    <article
      className="carte group relative overflow-hidden p-5 transition
                 hover:border-bordure-forte hover:shadow-[var(--ombre-forte)]
                 focus-within:border-bordure-forte"
    >
      {/* Bande de couleur latérale : rappelle la branche sans la nommer seule. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: ton }}
      />

      <p className="pl-3 text-[0.68rem] font-medium uppercase tracking-[0.09em] text-encre-tres-douce">
        {raison}
      </p>

      <div className="mt-3 flex items-start gap-4 pl-3">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border font-titre text-2xl"
          style={{
            color: ton,
            borderColor: ton,
            background: 'var(--fond-doux)',
          }}
        >
          {initiale(personne)}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-snug">
            <Link
              href={`/personne/${personne.id}`}
              className="transition hover:text-accent focus:outline-none"
            >
              <span className="absolute inset-0" aria-hidden />
              <span className="relative">{personne.nomComplet}</span>
            </Link>
          </h3>

          {personne.surnom && (
            <p className="mt-0.5 text-sm italic text-encre-douce">
              « {personne.surnom} »
            </p>
          )}

          <p className="mt-1 text-sm text-encre-tres-douce">
            {annees ?? 'Dates inconnues'}
            <span className="mx-1.5" aria-hidden>·</span>
            <span style={{ color: ton }}>{LIBELLE_COTE[cote]}</span>
          </p>

          {personne.profession && (
            <p className="mt-1 text-sm text-encre-douce">{personne.profession}</p>
          )}
        </div>
      </div>

      {aide && (
        <p className="relative mt-4 border-t border-bordure pt-3 pl-3 text-sm leading-relaxed text-encre-douce">
          {aide}
        </p>
      )}
    </article>
  );
}
