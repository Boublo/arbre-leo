import { Section } from '@/components/personne/blocs';
import { AlbumPersonne } from '@/components/personne/album/album-personne';
import type { EvenementFiche, FaitFiche, MediaFiche } from '@/components/personne/donnees';

/**
 * Album de la fiche — deux façons de le parcourir :
 * une chronologie narrative (photos + événements + contexte) et une grille
 * classique organisée par année.
 */
export function MediasPersonne({
  medias,
  evenements = [],
  faits = [],
  personneId,
  peutDeposer = false,
  photoCarteId = null,
}: {
  medias: MediaFiche[];
  evenements?: EvenementFiche[];
  faits?: FaitFiche[];
  personneId?: string;
  peutDeposer?: boolean;
  photoCarteId?: string | null;
}) {
  return (
    <Section
      titre="Album"
      compte={medias.length}
      aide="Photos, portraits et actes — à parcourir en histoire ou en grille."
    >
      {medias.length === 0 ? (
        <AlbumPersonne
          medias={[]}
          evenements={evenements}
          faits={faits}
          personneId={personneId}
          peutDeposer={peutDeposer}
          photoCarteId={photoCarteId}
        />
      ) : (
        <AlbumPersonne
          medias={medias}
          evenements={evenements}
          faits={faits}
          personneId={personneId}
          peutDeposer={peutDeposer}
          photoCarteId={photoCarteId}
        />
      )}
    </Section>
  );
}
