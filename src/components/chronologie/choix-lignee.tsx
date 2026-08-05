import Link from 'next/link';
import { PORTEES, type PorteeLignee } from '@/components/chronologie/lignee';

/**
 * Choisir qui la frise suit.
 *
 * Un simple formulaire en GET : l'adresse porte le choix, elle se partage, se
 * met en favori, et la page se recompose entièrement côté serveur — aucune
 * dépendance au navigateur, ce qui compte pour la partie de la famille qui
 * lit ce site sur un vieux téléphone.
 */

export type PersonneChoisissable = {
  id: string;
  /** « Nom Prénom (1798 – 1861) » : les dates départagent les homonymes. */
  libelle: string;
};

const PASTILLE =
  'cursor-pointer rounded-full border border-bordure px-3 py-1 text-sm text-encre-douce transition ' +
  'hover:bg-fond-doux hover:text-encre ' +
  'has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-contraste ' +
  'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ' +
  'has-[:focus-visible]:outline-accent';

export function ChoixLignee({
  personnes,
  personneId,
  portee,
  resserree,
}: {
  personnes: PersonneChoisissable[];
  personneId: string | null;
  portee: PorteeLignee;
  /** Vrai quand la frise est effectivement refermée sur quelqu'un. */
  resserree: boolean;
}) {
  // Tant que la frise n'est pas resserrée, décrire la portée cochée induirait
  // en erreur : c'est bien la famille entière qui s'affiche dessous.
  const aide = resserree
    ? PORTEES.find((p) => p.valeur === portee)?.aide
    : personneId
      ? 'La frise reste entière : choisissez « Sa lignée » ou « Ses proches » pour la refermer sur cette personne.'
      : 'Choisissez quelqu’un pour ne garder, dessous, que ce qui le concerne.';

  return (
    <form method="get" className="carte flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-56 flex-1">
          <label
            htmlFor="chronologie-personne"
            className="mb-1.5 block text-sm font-medium text-encre"
          >
            Dérouler la chronologie de
          </label>
          <select
            id="chronologie-personne"
            name="personne"
            defaultValue={personneId ?? ''}
            className="w-full rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre
                       focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          >
            <option value="">Toute la famille</option>
            {personnes.map((personne) => (
              <option key={personne.id} value={personne.id}>
                {personne.libelle}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="flex flex-wrap items-center gap-1.5 pb-1">
          <legend className="sr-only">Ce que la frise garde autour d’elle</legend>
          <span
            aria-hidden
            className="mr-0.5 text-xs uppercase tracking-wider text-encre-tres-douce"
          >
            Autour d’elle
          </span>
          {PORTEES.map((choix) => (
            <label key={choix.valeur} className={PASTILLE}>
              <input
                type="radio"
                name="portee"
                value={choix.valeur}
                defaultChecked={portee === choix.valeur}
                className="sr-only"
              />
              {choix.libelle}
            </label>
          ))}
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste transition hover:brightness-110"
          >
            Afficher
          </button>

          {resserree && (
            <Link href="/chronologie" className="lien-discret text-sm">
              Toute la famille
            </Link>
          )}
        </div>
      </div>

      {aide && <p className="text-xs text-encre-tres-douce">{aide}</p>}
    </form>
  );
}
