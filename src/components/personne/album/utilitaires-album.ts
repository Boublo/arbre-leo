import type { EvenementFiche, FaitFiche, MediaFiche } from '@/components/personne/donnees';

export type VueAlbum = 'chronologie' | 'organisation';

export type OptionsChronologie = {
  evenements: boolean;
  faits: boolean;
  documents: boolean;
};

export const OPTIONS_CHRONOLOGIE_DEFAUT: OptionsChronologie = {
  evenements: true,
  faits: true,
  documents: false,
};

export type EntreeChronologie =
  | { type: 'media'; id: string; tri: number; annee: number | null; media: MediaFiche }
  | { type: 'evenement'; id: string; tri: number; annee: number | null; evenement: EvenementFiche }
  | { type: 'fait'; id: string; tri: number; annee: number | null; fait: FaitFiche };

export type GroupeAnnee = {
  annee: number | null;
  libelle: string;
  medias: MediaFiche[];
};

export function cleTriDate(annee: number | null, mois: number | null, jour: number | null): number {
  if (annee === null) return 9_999_999;
  return annee * 10_000 + (mois ?? 0) * 100 + (jour ?? 0);
}

export function extraireAnnee(texte: string): number | null {
  const correspondance = texte.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return correspondance ? Number(correspondance[1]) : null;
}

export function libelleAnnee(annee: number | null): string {
  return annee === null ? 'Sans date' : String(annee);
}

export function construireChronologie(
  medias: MediaFiche[],
  evenements: EvenementFiche[],
  faits: FaitFiche[],
  options: OptionsChronologie,
): EntreeChronologie[] {
  const entrees: EntreeChronologie[] = [];

  for (const media of medias) {
    if (!media.estImage && !options.documents) continue;
    entrees.push({
      type: 'media',
      id: `media-${media.id}`,
      tri: cleTriDate(media.annee, media.mois, media.jour),
      annee: media.annee,
      media,
    });
  }

  if (options.evenements) {
    for (const evenement of evenements) {
      entrees.push({
        type: 'evenement',
        id: `evenement-${evenement.id}`,
        tri: cleTriDate(evenement.annee, null, null),
        annee: evenement.annee,
        evenement,
      });
    }
  }

  if (options.faits) {
    for (const fait of faits) {
      entrees.push({
        type: 'fait',
        id: `fait-${fait.id}`,
        tri: cleTriDate(extraireAnnee(fait.periode), null, null),
        annee: extraireAnnee(fait.periode),
        fait,
      });
    }
  }

  return entrees.sort((a, b) => a.tri - b.tri || a.id.localeCompare(b.id));
}

export function grouperParAnnee(medias: MediaFiche[]): GroupeAnnee[] {
  const cartes = new Map<number | 'sans', MediaFiche[]>();

  for (const media of medias) {
    const cle = media.annee ?? 'sans';
    const liste = cartes.get(cle) ?? [];
    liste.push(media);
    cartes.set(cle, liste);
  }

  const groupes: GroupeAnnee[] = [];

  const annees = [...cartes.keys()]
    .filter((cle): cle is number => cle !== 'sans')
    .sort((a, b) => a - b);

  for (const annee of annees) {
    groupes.push({
      annee,
      libelle: libelleAnnee(annee),
      medias: cartes.get(annee) ?? [],
    });
  }

  const sansDate = cartes.get('sans');
  if (sansDate?.length) {
    groupes.push({ annee: null, libelle: libelleAnnee(null), medias: sansDate });
  }

  return groupes;
}
