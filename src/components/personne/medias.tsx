import { Moderation, Rien, Section } from '@/components/personne/blocs';
import { LIBELLE_MEDIA } from '@/components/personne/vocabulaire';
import type { MediaFiche } from '@/components/personne/donnees';

/**
 * Photographies et actes où elle figure.
 *
 * Le dépôt est privé : chaque fichier est servi par une URL signée, valable une
 * heure, jamais par une adresse publique. Un lien recopié dans un message
 * expire donc de lui-même — c'est voulu.
 */
export function MediasPersonne({ medias }: { medias: MediaFiche[] }) {
  return (
    <Section titre="Photographies et actes" compte={medias.length}>
      {medias.length === 0 ? (
        <Rien>
          Aucune image ne lui est encore rattachée. Une photo de mariage, un portrait de
          communion, la copie d’un acte : tout se dépose.
        </Rien>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {medias.map((m) => (
            <li key={m.id}>
              <Vignette media={m} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Vignette({ media: m }: { media: MediaFiche }) {
  const legende = [m.date, m.lieu, m.role].filter(Boolean).join(' · ');
  const reference = [m.depot, m.cote && `cote ${m.cote}`].filter(Boolean).join(' · ');
  const alternative = m.titre ?? `${LIBELLE_MEDIA[m.type]} sans titre`;

  return (
    <figure className="flex h-full flex-col overflow-hidden rounded-[var(--rayon-petit)] border border-bordure">
      {m.estImage && m.url ? (
        <a href={m.url} target="_blank" rel="noopener noreferrer" className="bg-fond-doux">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire : l'optimiseur d'images ne peut pas la mettre en cache. */}
          <img
            src={m.url}
            alt={alternative}
            loading="lazy"
            className="h-56 w-full object-contain"
          />
        </a>
      ) : (
        <div className="flex h-24 items-center justify-center bg-fond-doux px-4 text-center text-sm text-encre-tres-douce">
          {m.url ? (
            <a href={m.url} target="_blank" rel="noopener noreferrer" className="lien-discret">
              Ouvrir {LIBELLE_MEDIA[m.type].toLowerCase()}
            </a>
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
          <span className="mt-1 text-sm leading-relaxed text-encre-douce">{m.description}</span>
        )}

        {m.transcription && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-encre-douce">
              Lire la transcription
            </summary>
            <p
              className="mt-2 whitespace-pre-line border-l-2 border-or/60 py-1 pl-3 text-sm leading-relaxed text-encre"
              style={{ fontFamily: 'var(--font-titre)' }}
            >
              {m.transcription}
            </p>
          </details>
        )}
      </figcaption>
    </figure>
  );
}
