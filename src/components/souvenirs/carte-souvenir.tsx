import Link from 'next/link';
import { extraitRecit, type SouvenirResume } from '@/lib/souvenirs';

/**
 * Une vignette du mur.
 *
 * L’épingle est dite en toutes lettres autant qu’en couleur : une information
 * portée par la seule couleur se perd pour une partie des lecteurs.
 */
export function CarteSouvenir({ souvenir }: { souvenir: SouvenirResume }) {
  const illustrations = souvenir.photos.filter((p) => p.url !== null).slice(0, 3);

  return (
    <article className="carte flex flex-col overflow-hidden transition hover:shadow-forte">
      {illustrations.length > 0 && (
        <div
          className={`grid gap-px bg-bordure ${illustrations.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}
        >
          {illustrations.map((photo) => (
            <div
              key={photo.id}
              className={`overflow-hidden bg-fond-doux ${illustrations.length === 1 ? 'aspect-[16/9]' : 'aspect-square'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url ?? ''}
                alt={photo.titre ?? ''}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {souvenir.epingle && (
            <span className="rounded-full border border-or/50 bg-or/10 px-2 py-0.5 text-xs font-medium text-or">
              Épinglé
            </span>
          )}
          {souvenir.statut !== 'publie' && (
            <span className="rounded-full border border-alerte/50 bg-alerte/10 px-2 py-0.5 text-xs font-medium text-alerte">
              {souvenir.statut === 'en_relecture' ? 'En relecture' : 'Masqué'}
            </span>
          )}
        </div>

        <h2 className="text-xl leading-tight">
          <Link href={`/souvenirs/${souvenir.id}`} className="transition hover:text-accent">
            {souvenir.titre}
          </Link>
        </h2>

        <p className="text-sm text-encre-tres-douce">
          {souvenir.date || 'Date inconnue'}
          {souvenir.lieuBref && <> · {souvenir.lieuBref}</>}
          {souvenir.nombrePhotos > illustrations.length && (
            <> · {souvenir.nombrePhotos} photos</>
          )}
        </p>

        <p className="text-sm leading-relaxed text-encre-douce">
          {extraitRecit(souvenir.recit)}
        </p>

        {souvenir.personnes.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {souvenir.personnes.slice(0, 5).map((personne) => (
              <li
                key={personne.id}
                className="rounded-full bg-fond-doux px-2.5 py-0.5 text-xs text-encre-douce"
              >
                {personne.nomComplet}
              </li>
            ))}
            {souvenir.personnes.length > 5 && (
              <li className="px-1 py-0.5 text-xs text-encre-tres-douce">
                et {souvenir.personnes.length - 5} autres
              </li>
            )}
          </ul>
        )}

        <p className="mt-auto pt-2 text-xs text-encre-tres-douce">
          Déposé par {souvenir.auteur}
        </p>
      </div>
    </article>
  );
}
