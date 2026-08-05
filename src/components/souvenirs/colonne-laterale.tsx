import type { Contributeur } from '@/lib/souvenirs';

/**
 * La colonne de droite du mur.
 *
 * Elle ne pilote rien : les filtres restent au-dessus du mur, où le regard les
 * cherche. Elle rappelle simplement qui écrit ici — dix noms, pas davantage,
 * histoire de reconnaître les voix. Sur mobile, elle passe sous le mur pour
 * ne pas voler l’écran aux souvenirs eux-mêmes.
 */
export function ColonneLaterale({
  contributeurs,
  nombreSouvenirs,
  epingleActif,
}: {
  contributeurs: Contributeur[];
  nombreSouvenirs: number;
  epingleActif: boolean;
}) {
  const total = contributeurs.reduce((n, c) => n + c.nombre, 0);
  const maxi = contributeurs[0]?.nombre ?? 0;

  return (
    <aside className="flex flex-col gap-6" aria-label="Autour du mur">
      <section className="carte flex flex-col gap-3 p-5">
        <h2 className="text-sm font-medium uppercase tracking-wider text-encre-tres-douce">
          En un coup d’œil
        </h2>
        <p className="text-encre">
          <span className="text-2xl">{nombreSouvenirs}</span>
          <span className="ml-1.5 text-sm text-encre-douce">
            souvenir{nombreSouvenirs > 1 ? 's' : ''}
          </span>
        </p>
        <p className="text-encre">
          <span className="text-2xl">{contributeurs.length}</span>
          <span className="ml-1.5 text-sm text-encre-douce">
            voix
            {contributeurs.length > 1 ? '' : ''} au fil des dépôts
          </span>
        </p>
        {epingleActif && (
          <p className="text-xs text-encre-tres-douce">
            Un souvenir est épinglé en tête : il ouvre la page.
          </p>
        )}
      </section>

      {contributeurs.length > 0 && (
        <section className="carte flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-encre-tres-douce">
              Ceux qui écrivent
            </h2>
            <p className="mt-1 text-xs text-encre-tres-douce">
              {total} souvenir{total > 1 ? 's' : ''} déposé{total > 1 ? 's' : ''}
              {contributeurs.length > 0 && ` par ces ${Math.min(contributeurs.length, 10)} voix`}.
            </p>
          </div>

          <ol className="flex flex-col gap-2">
            {contributeurs.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fond-doux text-xs text-encre-douce"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-encre" title={c.nom}>
                  {c.nom}
                </span>
                <span
                  className="text-xs tabular-nums text-encre-douce"
                  aria-label={`${c.nombre} souvenir${c.nombre > 1 ? 's' : ''}`}
                >
                  {c.nombre}
                </span>
                {/* Une petite barre pour lire les proportions sans lire les chiffres. */}
                <span
                  aria-hidden
                  className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-fond-doux sm:block"
                >
                  <span
                    className="block h-full rounded-full bg-accent/70"
                    style={{ width: `${maxi ? (c.nombre / maxi) * 100 : 0}%` }}
                  />
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  );
}
