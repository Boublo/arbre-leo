import Link from 'next/link';
import type { PersonneArbre } from '@/lib/arbre';
import { anneesDeVie } from '@/lib/arbre-graphe';

/**
 * Choix des deux personnes dont on veut connaître le lien.
 *
 * Un simple formulaire en GET : l'adresse porte le choix, elle se partage, se
 * met en favori, et la page se recompose entièrement côté serveur — même
 * fonctionnement que pour la chronologie. Aucun état côté navigateur, donc
 * aucune dépendance à JavaScript pour la sélection.
 *
 * Chaque proposition porte ses années de vie : plusieurs homonymes exacts
 * cohabitent dans l'arbre, et un nom seul ne désigne personne.
 */
export function SelecteurCouple({
  personnes,
  aInitial,
  bInitial,
}: {
  personnes: PersonneArbre[];
  aInitial: string | null;
  bInitial: string | null;
}) {
  const triees = [...personnes].sort((x, y) =>
    x.nomComplet.localeCompare(y.nomComplet, 'fr')
  );

  return (
    <form method="get" className="carte flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Champ
          nom="a"
          label="Première personne"
          defaut={aInitial ?? ''}
          personnes={triees}
        />
        <Champ
          nom="b"
          label="Seconde personne"
          defaut={bInitial ?? ''}
          personnes={triees}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste transition hover:brightness-110"
          >
            Calculer
          </button>
          {(aInitial || bInitial) && (
            <Link href="/parente" className="lien-discret text-sm">
              Recommencer
            </Link>
          )}
        </div>
      </div>
      <p className="text-xs text-encre-tres-douce">
        Deux personnes de l’arbre, et l’outil cherche leur ancêtre commun le plus proche.
      </p>
    </form>
  );
}

function Champ({
  nom,
  label,
  defaut,
  personnes,
}: {
  nom: string;
  label: string;
  defaut: string;
  personnes: PersonneArbre[];
}) {
  const idChamp = `parente-${nom}`;
  return (
    <div className="min-w-56 flex-1">
      <label
        htmlFor={idChamp}
        className="mb-1.5 block text-sm font-medium text-encre"
      >
        {label}
      </label>
      <select
        id={idChamp}
        name={nom}
        defaultValue={defaut}
        className="w-full rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      >
        <option value="">— Choisir —</option>
        {personnes.map((p) => {
          const annees = anneesDeVie(p);
          return (
            <option key={p.id} value={p.id}>
              {p.nomComplet}
              {annees ? ` (${annees})` : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
}
