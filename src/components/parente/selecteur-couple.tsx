import Link from 'next/link';
import type { PersonneArbre } from '@/lib/arbre';
import { ChampPersonneRecherche } from '@/components/parente/champ-personne-recherche';

/**
 * Choix des deux personnes dont on veut connaître le lien.
 *
 * Formulaire en GET : l'adresse porte le choix, elle se partage et se met en favori.
 * La recherche remplace les longues listes déroulantes difficiles à parcourir.
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
  return (
    <form method="get" className="carte flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <ChampPersonneRecherche
          nom="a"
          label="Première personne"
          personnes={personnes}
          valeurInitiale={aInitial}
        />
        <ChampPersonneRecherche
          nom="b"
          label="Seconde personne"
          personnes={personnes}
          valeurInitiale={bInitial}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="min-h-11 rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste transition hover:brightness-110"
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
