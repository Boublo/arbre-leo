'use client';

import { useMemo } from 'react';
import type { MediaFiche } from '@/components/personne/donnees';
import { CarteMediaAlbum } from '@/components/personne/album/carte-media-album';
import { grouperParAnnee } from '@/components/personne/album/utilitaires-album';

export type FiltreOrganisation = 'tout' | 'photos' | 'actes';

export const LIBELLES_FILTRE: Record<FiltreOrganisation, string> = {
  tout: 'Tout',
  photos: 'Photos',
  actes: 'Actes',
};

export function AlbumOrganisation({
  medias,
  personneId,
  photoCarteId,
  filtre,
  onAgrandir,
}: {
  medias: MediaFiche[];
  personneId?: string;
  photoCarteId?: string | null;
  filtre: FiltreOrganisation;
  onAgrandir: (media: MediaFiche) => void;
}) {
  const visibles = useMemo(() => {
    if (filtre === 'photos') return medias.filter((m) => m.estImage);
    if (filtre === 'actes') return medias.filter((m) => m.type === 'acte' || !m.estImage);
    return medias;
  }, [medias, filtre]);

  const groupes = useMemo(() => grouperParAnnee(visibles), [visibles]);

  if (visibles.length === 0) {
    return (
      <p className="text-sm text-encre-tres-douce">
        Aucun élément dans cette catégorie pour le moment.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groupes.map((groupe) => (
        <section key={groupe.libelle} aria-labelledby={`album-annee-${groupe.libelle}`}>
          <div className="mb-4 flex items-baseline gap-3 border-b border-bordure pb-2">
            <h3 id={`album-annee-${groupe.libelle}`} className="font-titre text-xl text-encre">
              {groupe.libelle}
            </h3>
            <span className="text-xs text-encre-tres-douce">
              {groupe.medias.length} élément{groupe.medias.length > 1 ? 's' : ''}
            </span>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {groupe.medias.map((media) => (
              <li key={media.id}>
                <CarteMediaAlbum
                  media={media}
                  personneId={personneId}
                  estPortraitCarte={photoCarteId === media.id}
                  variante="grille"
                  onAgrandir={
                    media.estImage && media.url ? () => onAgrandir(media) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
