import { FicheChantier } from '@/components/recherches/fiche-chantier';
import { COLONNES, trierParPriorite, type ChantierVue } from '@/components/recherches/vocabulaire';

/**
 * Le tableau de bord de l'enquête : une colonne par statut, de l'idée à la
 * réponse, chaque colonne rangée par priorité et, à priorité égale, la plus
 * vieille demande en tête.
 *
 * Les colonnes défilent horizontalement plutôt que de se replier : on veut
 * pouvoir embrasser l'état de la recherche d'un seul regard.
 */
export function TableauChantiers({
  chantiers,
  peutContribuer,
}: {
  chantiers: ChantierVue[];
  peutContribuer: boolean;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-3">
      {COLONNES.map((colonne) => {
        const liste = trierParPriorite(chantiers.filter((c) => c.statut === colonne.statut));
        const identifiant = `colonne-${colonne.statut}`;

        return (
          <section
            key={colonne.statut}
            aria-labelledby={identifiant}
            className="flex w-72 shrink-0 flex-col gap-3"
          >
            <header
              className="flex flex-col gap-1 border-t-2 pt-2"
              style={{ borderColor: colonne.ton }}
            >
              <h3 id={identifiant} className="flex items-baseline justify-between gap-2 text-base">
                <span>{colonne.libelle}</span>
                <span className="text-sm font-normal text-encre-tres-douce">
                  {liste.length}
                  <span className="sr-only"> chantier{liste.length > 1 ? 's' : ''}</span>
                </span>
              </h3>
              <p className="text-xs leading-relaxed text-encre-tres-douce">{colonne.aide}</p>
            </header>

            {liste.length === 0 ? (
              <p className="rounded-[var(--rayon)] border border-dashed border-bordure px-3 py-4 text-xs text-encre-tres-douce">
                Aucun chantier dans cette colonne.
              </p>
            ) : (
              liste.map((chantier) => (
                <FicheChantier
                  key={chantier.id}
                  chantier={chantier}
                  peutContribuer={peutContribuer}
                />
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
