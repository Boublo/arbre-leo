import Link from 'next/link';

export type ContenuFichePourEtape = {
  evenements: number;
  sources: number;
  faits: number;
  parente: number;
  souvenirs: number;
  recits: number;
  photos: number;
};

type Etape = {
  ancre: 'vue' | 'parente' | 'souvenirs' | 'photos';
  titre: string;
  aide: string;
};

/**
 * Choix volontairement déterministe : la fiche propose une porte déjà riche,
 * jamais une action qui créerait ou exposerait une donnée supplémentaire.
 */
export function choisirProchaineEtape(contenu: ContenuFichePourEtape): Etape | null {
  if (contenu.photos > 0) {
    return {
      ancre: 'photos',
      titre: 'Ouvrir l’album',
      aide: `${contenu.photos} élément${contenu.photos > 1 ? 's' : ''} à parcourir en images.`,
    };
  }
  const souvenirs = contenu.souvenirs + contenu.recits;
  if (souvenirs > 0) {
    return {
      ancre: 'souvenirs',
      titre: 'Lire les souvenirs',
      aide: `${souvenirs} récit${souvenirs > 1 ? 's' : ''} ou souvenir${souvenirs > 1 ? 's' : ''} à découvrir.`,
    };
  }
  const repères = contenu.evenements + contenu.sources + contenu.faits;
  if (repères > 0) {
    return {
      ancre: 'vue',
      titre: 'Suivre les repères de vie',
      aide: `${repères} repère${repères > 1 ? 's' : ''} historique${repères > 1 ? 's' : ''} à relire.`,
    };
  }
  if (contenu.parente > 0) {
    return {
      ancre: 'parente',
      titre: 'Explorer sa parenté',
      aide: 'Parents, fratrie, unions et descendance déjà connus.',
    };
  }
  return null;
}

export function ProchaineEtapeFiche({
  personneId,
  contenu,
}: {
  personneId: string;
  contenu: ContenuFichePourEtape;
}) {
  const etape = choisirProchaineEtape(contenu);
  if (!etape) return null;

  return (
    <aside className="rounded-[var(--rayon)] border border-accent/30 bg-accent-clair p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
        À explorer maintenant
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg text-encre">{etape.titre}</h2>
          <p className="mt-1 text-sm text-encre-douce">{etape.aide}</p>
        </div>
        <Link
          href={`/personne/${personneId}#${etape.ancre}`}
          className="shrink-0 rounded-[var(--rayon-petit)] bg-accent px-3 py-2 text-center text-sm font-medium text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Voir
        </Link>
      </div>
    </aside>
  );
}
