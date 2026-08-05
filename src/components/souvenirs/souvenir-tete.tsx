import Link from 'next/link';
import { extraitRecit, type SouvenirResume } from '@/lib/souvenirs';

/**
 * Le grand souvenir qui ouvre le mur.
 *
 * Une carte large — parfois côte à côte photo et récit, parfois pleine largeur
 * — qui rappelle au visiteur ce que le site conserve. On y dit toujours pour
 * quelle raison ce souvenir vient en premier : épinglé ou déposé en dernier ;
 * une couleur seule ne suffit pas.
 */
export function SouvenirTete({ souvenir }: { souvenir: SouvenirResume }) {
  const photo = souvenir.photos.find((p) => p.url) ?? null;

  return (
    <article className="carte overflow-hidden">
      <div className={`grid gap-0 ${photo ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,4fr)]' : ''}`}>
        {photo && (
          <Link
            href={`/souvenirs/${souvenir.id}`}
            aria-label={`Voir « ${souvenir.titre} »`}
            className="block overflow-hidden bg-fond-doux"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url ?? ''}
              alt={photo.titre ?? ''}
              className="h-full w-full object-cover"
            />
          </Link>
        )}

        <div className="flex flex-col gap-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {souvenir.epingle ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-or/50 bg-or/10 px-2.5 py-0.5 text-xs font-medium text-or">
                <span aria-hidden>◆</span>
                Épinglé par la famille
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-bordure bg-fond-doux px-2.5 py-0.5 text-xs font-medium text-encre-douce">
                Le dernier déposé
              </span>
            )}
            {souvenir.statut !== 'publie' && (
              <span className="rounded-full border border-alerte/50 bg-alerte/10 px-2.5 py-0.5 text-xs font-medium text-alerte">
                {souvenir.statut === 'en_relecture' ? 'En relecture' : 'Masqué'}
              </span>
            )}
          </div>

          <h2 className="text-3xl leading-tight sm:text-4xl">
            <Link href={`/souvenirs/${souvenir.id}`} className="transition hover:text-accent">
              {souvenir.titre}
            </Link>
          </h2>

          <p className="text-sm text-encre-tres-douce">
            {souvenir.date || 'Date inconnue'}
            {souvenir.lieuBref && <> · {souvenir.lieuBref}</>}
            {souvenir.nombrePhotos > 0 && (
              <>
                {' · '}
                {souvenir.nombrePhotos} photo{souvenir.nombrePhotos > 1 ? 's' : ''}
              </>
            )}
          </p>

          <p className="text-lg leading-relaxed text-encre-douce">
            {extraitRecit(souvenir.recit, 420)}
          </p>

          {souvenir.personnes.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {souvenir.personnes.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/personne/${p.id}`}
                    className="rounded-full bg-fond-doux px-2.5 py-0.5 text-xs text-encre-douce transition hover:bg-accent-clair hover:text-encre"
                  >
                    {p.nomComplet}
                  </Link>
                </li>
              ))}
              {souvenir.personnes.length > 8 && (
                <li className="px-1 py-0.5 text-xs text-encre-tres-douce">
                  et {souvenir.personnes.length - 8} autres
                </li>
              )}
            </ul>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-encre-tres-douce">Déposé par {souvenir.auteur}</p>
            <Link
              href={`/souvenirs/${souvenir.id}`}
              className="rounded-[var(--rayon-petit)] border border-bordure px-4 py-2 text-sm text-encre-douce transition hover:border-accent hover:text-accent"
            >
              Lire le souvenir entier →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
