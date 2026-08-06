import Link from 'next/link';
import { Moderation, Rien, Section } from '@/components/personne/blocs';
import { LIBELLE_MEDIA } from '@/components/personne/vocabulaire';
import type { MediaFiche } from '@/components/personne/donnees';

/**
 * Album de la fiche — photographies et actes.
 *
 * Chaque vignette ouvre la page de la photo, où la famille peut laisser un
 * souvenir. Le dépôt reste privé (URL signée).
 */
export function MediasPersonne({
  medias,
  personneId,
  peutDeposer = false,
  photoCarteId = null,
}: {
  medias: MediaFiche[];
  personneId?: string;
  peutDeposer?: boolean;
  /** Identifiant du portrait actuellement sur la carte de l’arbre. */
  photoCarteId?: string | null;
}) {
  const images = medias.filter((m) => m.estImage);
  const autres = medias.filter((m) => !m.estImage);

  return (
    <Section titre="Album" compte={medias.length}>
      {medias.length === 0 ? (
        <Rien>
          Aucune image ne lui est encore rattachée. Une photo de mariage, un portrait de
          communion, la copie d’un acte :{' '}
          {peutDeposer && personneId ? (
            <>
              <Link href={`/personne/${personneId}/photo/nouveau`} className="lien-discret">
                déposez-la ici
              </Link>
              .
            </>
          ) : (
            <>tout se dépose.</>
          )}
        </Rien>
      ) : (
        <div className="flex flex-col gap-8">
          {images.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2">
              {images.map((m) => (
                <li key={m.id}>
                  <Vignette
                    media={m}
                    personneId={personneId}
                    estPortraitCarte={photoCarteId === m.id}
                  />
                </li>
              ))}
            </ul>
          )}

          {autres.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2">
              {autres.map((m) => (
                <li key={m.id}>
                  <Vignette media={m} personneId={personneId} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {peutDeposer && personneId && (
        <p className="mt-4 text-sm">
          <Link href={`/personne/${personneId}/photo/nouveau`} className="lien-discret">
            Ajouter une photo à l’album
          </Link>
        </p>
      )}
    </Section>
  );
}

function Vignette({
  media: m,
  personneId,
  estPortraitCarte = false,
}: {
  media: MediaFiche;
  personneId?: string;
  estPortraitCarte?: boolean;
}) {
  const legende = [m.date, m.lieu, m.role].filter(Boolean).join(' · ');
  const reference = [m.depot, m.cote && `cote ${m.cote}`].filter(Boolean).join(' · ');
  const alternative = m.titre ?? `${LIBELLE_MEDIA[m.type]} sans titre`;
  const href =
    personneId && m.estImage ? `/personne/${personneId}/photo/${m.id}` : m.url;

  const corps = (
    <>
      {m.estImage && m.url ? (
        <div className="relative bg-fond-doux">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
          <img
            src={m.url}
            alt={alternative}
            loading="lazy"
            width={m.largeur ?? undefined}
            height={m.hauteur ?? undefined}
            className="h-56 w-full object-cover"
          />
          {estPortraitCarte && (
            <span className="absolute left-2 top-2 rounded-[var(--rayon-petit)] bg-accent px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-accent-contraste">
              Carte
            </span>
          )}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center bg-fond-doux px-4 text-center text-sm text-encre-tres-douce">
          {m.url ? (
            <span className="lien-discret">Ouvrir {LIBELLE_MEDIA[m.type].toLowerCase()}</span>
          ) : (
            <span>Fichier momentanément indisponible</span>
          )}
        </div>
      )}

      <figcaption className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-encre">{alternative}</span>
          <Moderation statut={m.statut} />
        </div>

        {legende && <span className="text-xs text-encre-tres-douce">{legende}</span>}
        {reference && <span className="text-xs text-encre-tres-douce">{reference}</span>}

        {m.description && (
          <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-encre-douce">
            {m.description}
          </span>
        )}

        {personneId && m.estImage && (
          <span className="mt-2 text-xs text-accent">Voir et commenter →</span>
        )}
      </figcaption>
    </>
  );

  return (
    <figure className="flex h-full flex-col overflow-hidden rounded-[var(--rayon-petit)] border border-bordure transition hover:border-bordure-forte">
      {href ? (
        <Link
          href={href}
          {...(href.startsWith('http')
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
          className="flex h-full flex-col"
        >
          {corps}
        </Link>
      ) : (
        corps
      )}
    </figure>
  );
}
