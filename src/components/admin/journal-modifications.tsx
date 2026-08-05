import {
  formaterHorodatage,
  nommerAction,
  nommerTable,
  type LigneJournal,
} from '@/components/admin/vocabulaire';

/**
 * Le journal des modifications, que seuls les administrateurs peuvent lire.
 *
 * Un arbre familial se corrige à plusieurs mains : savoir qui a changé quoi,
 * et quand, évite bien des malentendus. On s'en tient aux cent dernières
 * entrées — au-delà, c'est une enquête, pas une surveillance.
 */
export function JournalModifications({ entrees }: { entrees: LigneJournal[] }) {
  return (
    <section aria-labelledby="titre-journal" className="flex flex-col gap-4">
      <header>
        <h2 id="titre-journal" className="text-2xl">
          Journal des modifications
        </h2>
        <p className="mt-1 text-sm text-encre-douce">
          {entrees.length === 0
            ? 'Rien n’a encore été consigné.'
            : `Les ${entrees.length} dernières écritures en base, de la plus récente à la plus ancienne.`}
        </p>
      </header>

      {entrees.length > 0 && (
        <div className="carte overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="sr-only">
              Qui a changé quoi, et quand, dans les tables de l’arbre.
            </caption>
            <thead>
              <tr className="border-b border-bordure text-left">
                <Entete>Quand</Entete>
                <Entete>Qui</Entete>
                <Entete>Quoi</Entete>
                <Entete>Où</Entete>
              </tr>
            </thead>
            <tbody>
              {entrees.map((entree) => (
                <tr key={entree.id} className="border-b border-bordure last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-encre-douce">
                    {formaterHorodatage(entree.creeLe)}
                  </td>
                  <td className="px-4 py-2.5 text-encre">
                    {entree.acteur ?? <span className="text-encre-tres-douce">Automatique</span>}
                  </td>
                  <td className="px-4 py-2.5 text-encre">{nommerAction(entree.action)}</td>
                  <td className="px-4 py-2.5 text-encre-douce">
                    {nommerTable(entree.tableCible)}
                    {entree.ligneId && (
                      // Le début de l'identifiant suffit à rapprocher deux
                      // écritures qui portent sur la même ligne.
                      <span className="ml-1.5 text-xs text-encre-tres-douce" title={entree.ligneId}>
                        {entree.ligneId.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Entete({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-encre-tres-douce"
    >
      {children}
    </th>
  );
}
