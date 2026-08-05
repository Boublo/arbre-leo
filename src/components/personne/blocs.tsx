import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LienPersonne } from '@/components/personne/donnees';
import { PREUVE, LIBELLE_MODERATION, nommerBranche } from '@/components/personne/vocabulaire';
import type { NiveauPreuve, StatutModeration } from '@/lib/types-base';

/** Les quelques briques que toutes les parties de la fiche se repassent. */

export function Section({
  titre,
  aide,
  compte,
  children,
}: {
  titre: string;
  aide?: ReactNode;
  compte?: number;
  children: ReactNode;
}) {
  return (
    <section className="carte p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg">{titre}</h2>
        {compte !== undefined && compte > 0 && (
          <span className="rounded-full bg-fond-doux px-2 py-0.5 text-xs text-encre-tres-douce">
            {compte}
          </span>
        )}
      </div>
      {aide && <p className="-mt-2 mb-4 text-sm text-encre-douce">{aide}</p>}
      {children}
    </section>
  );
}

/** Quand une partie de la fiche est vide, on le dit : le blanc inquiète. */
export function Rien({ children }: { children: ReactNode }) {
  return <p className="text-sm text-encre-tres-douce">{children}</p>;
}

export function Etiquette({ children, ton = 'neutre' }: { children: ReactNode; ton?: 'neutre' | 'or' }) {
  const styles =
    ton === 'or'
      ? 'border-or/40 bg-or/10 text-or'
      : 'border-bordure bg-fond-doux text-encre-douce';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${styles}`}
    >
      {children}
    </span>
  );
}

/**
 * Le niveau de preuve, jamais porté par la seule couleur : la pastille est
 * accompagnée de son libellé, et l'explication tient dans l'attribut `title`.
 */
export function Preuve({ niveau }: { niveau: NiveauPreuve }) {
  const p = PREUVE[niveau];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-encre-douce"
      title={p.explication}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${p.teinte}`} aria-hidden />
      {p.libelle}
    </span>
  );
}

export function ListePreuves({ niveaux }: { niveaux: NiveauPreuve[] }) {
  if (niveaux.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {niveaux.map((n) => (
        <li key={n}>
          <Preuve niveau={n} />
        </li>
      ))}
    </ul>
  );
}

/** Signale ce qui n'est pas encore relu, pour que personne ne s'étonne. */
export function Moderation({ statut }: { statut: StatutModeration }) {
  const libelle = LIBELLE_MODERATION[statut];
  if (!libelle) return null;
  return <Etiquette>{libelle}</Etiquette>;
}

export function Branches({ branches }: { branches: string[] }) {
  if (branches.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {branches.map((b) => (
        <li key={b}>
          <Etiquette>Branche {nommerBranche(b)}</Etiquette>
        </li>
      ))}
    </ul>
  );
}

/** Toute personne citée sur la fiche mène à la sienne. */
export function LienFiche({ personne, mention }: { personne: LienPersonne; mention?: string }) {
  return (
    <Link
      href={`/personne/${personne.id}`}
      className="flex flex-col rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-3 py-2 transition hover:border-bordure-forte hover:bg-accent-clair"
    >
      <span className="text-sm font-medium text-encre">{personne.nomComplet}</span>
      {personne.surnom && (
        <span className="text-xs text-encre-douce">« {personne.surnom} »</span>
      )}
      <span className="text-xs text-encre-tres-douce">
        {[mention, personne.annees].filter(Boolean).join(' · ') || 'Dates inconnues'}
      </span>
    </Link>
  );
}

export function GrilleLiens({ children }: { children: ReactNode }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {children}
    </ul>
  );
}
