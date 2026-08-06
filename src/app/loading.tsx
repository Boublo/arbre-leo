/**
 * Squelette affiché pendant le chargement serveur des pages lourdes.
 */

export default function ChargementGlobal() {
  return (
    <main
      id="contenu-principal"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14"
      aria-busy="true"
      aria-label="Chargement en cours"
    >
      <div className="flex flex-col gap-3">
        <div className="h-4 w-32 animate-pulse rounded bg-fond-doux" />
        <div className="h-10 w-2/3 max-w-md animate-pulse rounded bg-fond-doux" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-fond-doux" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="carte h-36 animate-pulse bg-fond-doux/60" />
        ))}
      </div>
    </main>
  );
}
