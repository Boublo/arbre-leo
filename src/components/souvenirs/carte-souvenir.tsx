import Link from 'next/link';
import { extraitRecit, type SouvenirResume } from '@/lib/souvenirs';

/**
 * Une vignette du mur.
 *
 * L’épingle est dite en toutes lettres autant qu’en couleur : une information
 * portée par la seule couleur se perd pour une partie des lecteurs. Chaque
 * personne mentionnée mène directement à sa fiche — un clic depuis le mur
 * doit toujours pouvoir emmener quelqu’un ailleurs, en respectant la ligne
 * du site.
 */
export function CarteSouvenir({ souvenir }: { souvenir: SouvenirResume }) {
  const illustrations = souvenir.photos.filter((p) => p.url !== null).slice(0, 3);
  const vedette = illustrations[0] ?? null;
  const autres = illustrations.slice(1);

  return (
    <article
      className="carte flex break-inside-avoid flex-col overflow-hidden transition hover:shadow-forte"
      style={{ pageBreakInside: 'avoid' }}
    >
      {vedette && (
        <Link
          href={`/souvenirs/${souvenir.id}`}
          aria-label={`Voir « ${souvenir.titre} »`}
          className="block overflow-hidden bg-fond-doux"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vedette.url ?? ''}
            alt={vedette.titre ?? ''}
            loading="lazy"
            className="w-full object-cover"
          />
          {autres.length > 0 && (
            <div className="grid grid-cols-3 gap-px bg-bordure">
              {autres.map((photo) => (
                <div key={photo.id} className="aspect-square overflow-hidden bg-fond-doux">
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
        </Link>
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
              <li key={personne.id}>
                <Link
                  href={`/personne/${personne.id}`}
                  className="rounded-full bg-fond-doux px-2.5 py-0.5 text-xs text-encre-douce transition hover:bg-accent-clair hover:text-encre"
                >
                  {personne.nomComplet}
                </Link>
              </li>
            ))}
            {souvenir.personnes.length > 5 && (
              <li className="px-1 py-0.5 text-xs text-encre-tres-douce">
                et {souvenir.personnes.length - 5} autres
              </li>
            )}
          </ul>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <p className="text-xs text-encre-tres-douce">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-fond-doux text-[0.7rem] font-medium text-encre-douce align-middle mr-1.5 inline-grid">
              {initiale(souvenir.auteur)}
            </span>
            Déposé par {souvenir.auteur}
          </p>

          <Link
            href={`/souvenirs/${souvenir.id}#reagir`}
            className="flex shrink-0 items-center gap-1 rounded-full border border-bordure bg-fond-carte px-3 py-1 text-xs text-encre-douce transition hover:border-accent hover:text-accent"
          >
            <span aria-hidden>◍</span>
            {souvenir.nombreCommentaires === 0
              ? 'Réagir'
              : `${souvenir.nombreCommentaires} réaction${souvenir.nombreCommentaires > 1 ? 's' : ''}`}
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * L’initiale d’un nom d’affichage, en majuscule. Faute de portrait des membres,
 * c’est ce qui distingue un déposant d’un autre du coin de l’œil.
 */
function initiale(nom: string): string {
  const propre = nom.trim();
  return propre.charAt(0).toUpperCase() || '·';
}
