'use client';

import Link from 'next/link';
import { Moderation } from '@/components/personne/blocs';
import { LIBELLE_MEDIA } from '@/components/personne/vocabulaire';
import type { MediaFiche } from '@/components/personne/donnees';

/**
 * Carte partagée entre les deux vues de l’album — photo, acte ou document.
 */
export function CarteMediaAlbum({
  media,
  personneId,
  estPortraitCarte = false,
  variante = 'grille',
  onAgrandir,
}: {
  media: MediaFiche;
  personneId?: string;
  estPortraitCarte?: boolean;
  variante?: 'grille' | 'chronologie';
  onAgrandir?: () => void;
}) {
  const legende = [media.date, media.lieu, media.role].filter(Boolean).join(' · ');
  const reference = [media.depot, media.cote && `cote ${media.cote}`].filter(Boolean).join(' · ');
  const titre = media.titre ?? `${LIBELLE_MEDIA[media.type]} sans titre`;
  const href =
    personneId && media.estImage ? `/personne/${personneId}/photo/${media.id}` : media.url;

  const image =
    media.estImage && media.url ? (
      <div className={`relative overflow-hidden bg-fond-doux ${variante === 'chronologie' ? 'aspect-[4/3]' : 'aspect-[4/3] sm:aspect-[5/4]'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.url}
          alt={titre}
          loading="lazy"
          width={media.largeur ?? undefined}
          height={media.hauteur ?? undefined}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {estPortraitCarte && (
          <span className="absolute left-2 top-2 rounded-[var(--rayon-petit)] bg-accent px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-accent-contraste">
            Carte
          </span>
        )}
        {onAgrandir && (
          <button
            type="button"
            onClick={(evenement) => {
              evenement.preventDefault();
              evenement.stopPropagation();
              onAgrandir();
            }}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-bordure bg-fond-carte/90 text-sm text-encre-douce opacity-0 shadow-[var(--ombre-douce)] backdrop-blur-sm transition group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={`Agrandir ${titre}`}
          >
            ⤢
          </button>
        )}
      </div>
    ) : (
      <div className="flex aspect-[4/3] items-center justify-center bg-fond-doux px-4 text-center text-sm text-encre-tres-douce">
        {media.url ? (
          <span className="lien-discret">Ouvrir {LIBELLE_MEDIA[media.type].toLowerCase()}</span>
        ) : (
          <span>Fichier momentanément indisponible</span>
        )}
      </div>
    );

  const legendes = (
    <figcaption className={`flex flex-1 flex-col gap-1 ${variante === 'chronologie' ? 'p-4 sm:p-5' : 'p-3'}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`font-medium text-encre ${variante === 'chronologie' ? 'font-titre text-lg' : 'text-sm'}`}>
          {titre}
        </span>
        <Moderation statut={media.statut} />
      </div>
      <span className="text-xs uppercase tracking-wide text-encre-tres-douce">
        {LIBELLE_MEDIA[media.type]}
      </span>
      {legende && <span className="text-xs text-encre-tres-douce">{legende}</span>}
      {reference && <span className="text-xs text-encre-tres-douce">{reference}</span>}
      {media.description && (
        <span
          className={`mt-1 leading-relaxed text-encre-douce ${
            variante === 'chronologie' ? 'text-sm' : 'line-clamp-2 text-sm'
          }`}
        >
          {media.description}
        </span>
      )}
      {personneId && media.estImage && (
        <span className="mt-2 text-xs font-medium text-accent">Voir et commenter →</span>
      )}
    </figcaption>
  );

  const classes =
    variante === 'chronologie'
      ? 'group flex h-full flex-col overflow-hidden rounded-[var(--rayon)] border border-bordure bg-fond-carte shadow-[var(--ombre-douce)] transition hover:border-bordure-forte hover:shadow-[var(--ombre-forte)]'
      : 'group flex h-full flex-col overflow-hidden rounded-[var(--rayon-petit)] border border-bordure transition hover:border-bordure-forte';

  if (href && !onAgrandir) {
    return (
      <figure className={classes}>
        <Link
          href={href}
          {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="flex h-full flex-col"
        >
          {image}
          {legendes}
        </Link>
      </figure>
    );
  }

  if (href) {
    return (
      <figure className={classes}>
        <div className="flex h-full flex-col">
          {media.estImage && media.url ? (
            <button
              type="button"
              onClick={onAgrandir}
              className="block w-full cursor-zoom-in text-left"
              aria-label={`Agrandir ${titre}`}
            >
              {image}
            </button>
          ) : (
            image
          )}
          <Link href={href} className="flex flex-1 flex-col">
            {legendes}
          </Link>
        </div>
      </figure>
    );
  }

  return (
    <figure className={classes}>
      {image}
      {legendes}
    </figure>
  );
}
