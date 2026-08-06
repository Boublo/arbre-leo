'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { EvenementFiche, FaitFiche, MediaFiche } from '@/components/personne/donnees';
import { VisionneusePhoto } from '@/components/photos/visionneuse-photo';
import { AlbumChronologie } from '@/components/personne/album/album-chronologie';
import {
  AlbumOrganisation,
  LIBELLES_FILTRE,
  type FiltreOrganisation,
} from '@/components/personne/album/album-organisation';
import {
  OPTIONS_CHRONOLOGIE_DEFAUT,
  type OptionsChronologie,
  type VueAlbum,
} from '@/components/personne/album/utilitaires-album';

const CLE_VUE = 'arbre-album-vue';
const CLE_OPTIONS = 'arbre-album-options-chrono';

/**
 * Album modulable : chronologie narrative ou grille classique par année.
 *
 * Les préférences (vue, filtres) sont mémorisées dans le navigateur pour que
 * chaque membre retrouve sa façon de parcourir l’album.
 */
export function AlbumPersonne({
  medias,
  evenements,
  faits,
  personneId,
  peutDeposer = false,
  photoCarteId = null,
}: {
  medias: MediaFiche[];
  evenements: EvenementFiche[];
  faits: FaitFiche[];
  personneId?: string;
  peutDeposer?: boolean;
  photoCarteId?: string | null;
}) {
  const [vue, setVue] = useState<VueAlbum>('chronologie');
  const [options, setOptions] = useState<OptionsChronologie>(OPTIONS_CHRONOLOGIE_DEFAUT);
  const [filtre, setFiltre] = useState<FiltreOrganisation>('tout');
  const [agrandie, setAgrandie] = useState<MediaFiche | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    try {
      const vueStockee = localStorage.getItem(CLE_VUE);
      if (vueStockee === 'chronologie' || vueStockee === 'organisation') setVue(vueStockee);
      const optionsStockees = localStorage.getItem(CLE_OPTIONS);
      if (optionsStockees) setOptions({ ...OPTIONS_CHRONOLOGIE_DEFAUT, ...JSON.parse(optionsStockees) });
    } catch {
      /* lecture locale impossible */
    }
    setPret(true);
  }, []);

  const changerVue = useCallback((prochaine: VueAlbum) => {
    setVue(prochaine);
    try {
      localStorage.setItem(CLE_VUE, prochaine);
    } catch {
      /* écriture locale impossible */
    }
  }, []);

  const basculerOption = useCallback((cle: keyof OptionsChronologie) => {
    setOptions((courantes) => {
      const suivantes = { ...courantes, [cle]: !courantes[cle] };
      try {
        localStorage.setItem(CLE_OPTIONS, JSON.stringify(suivantes));
      } catch {
        /* écriture locale impossible */
      }
      return suivantes;
    });
  }, []);

  const images = useMemo(() => medias.filter((m) => m.estImage && m.url), [medias]);
  const photosSansDate = useMemo(() => images.filter((m) => m.annee === null).length, [images]);

  if (!pret) {
    return <div className="h-24 animate-pulse rounded-[var(--rayon)] bg-fond-doux" aria-hidden />;
  }

  return (
    <div className="flex flex-col gap-5">
      <EnteteAlbum
        total={medias.length}
        photos={images.length}
        photosSansDate={photosSansDate}
        peutDeposer={peutDeposer}
        personneId={personneId}
      />

      <BarreVue vue={vue} onChanger={changerVue} />

      {vue === 'chronologie' ? (
        <>
          <BarreOptionsChronologie options={options} onBasculer={basculerOption} />
          {medias.length === 0 ? (
            <p className="rounded-[var(--rayon)] border border-dashed border-bordure bg-fond-doux/60 px-5 py-8 text-center text-sm text-encre-douce">
              L’album est encore vide. Ajoutez une première photo pour commencer à tisser
              l’histoire.
            </p>
          ) : (
            <AlbumChronologie
              medias={medias}
              evenements={evenements}
              faits={faits}
              personneId={personneId}
              photoCarteId={photoCarteId}
              options={options}
              onAgrandir={setAgrandie}
            />
          )}
        </>
      ) : (
        <>
          <BarreFiltresOrganisation filtre={filtre} onChanger={setFiltre} />
          {medias.length === 0 ? (
            <p className="text-sm text-encre-tres-douce">
              Aucune photo pour l’instant — la vue organisation se remplira au fil des dépôts.
            </p>
          ) : (
            <AlbumOrganisation
              medias={medias}
              personneId={personneId}
              photoCarteId={photoCarteId}
              filtre={filtre}
              onAgrandir={setAgrandie}
            />
          )}
        </>
      )}

      {agrandie?.url && (
        <VisionneusePhoto
          src={agrandie.url}
          alt={agrandie.titre ?? 'Photo'}
          ouverte
          onFermer={() => setAgrandie(null)}
        />
      )}
    </div>
  );
}

function EnteteAlbum({
  total,
  photos,
  photosSansDate,
  peutDeposer,
  personneId,
}: {
  total: number;
  photos: number;
  photosSansDate: number;
  peutDeposer: boolean;
  personneId?: string;
}) {
  return (
    <div className="rounded-[var(--rayon)] border border-bordure bg-gradient-to-br from-accent-clair/40 via-fond-carte to-fond-doux p-5 sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-accent">Album familial</p>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-encre-douce">
        Racontez une vie en images : photos de famille, portraits, actes numérisés. Chaque cliché
        peut porter un souvenir — et se placer dans le fil du temps, aux côtés des événements et
        des faits historiques qui l’entourent.
      </p>
      {total > 0 && (
        <p className="mt-3 text-xs text-encre-tres-douce">
          {photos} photo{photos > 1 ? 's' : ''}
          {photosSansDate > 0 &&
            ` · ${photosSansDate} sans date (pensez à la renseigner pour la chronologie)`}
        </p>
      )}
      {peutDeposer && personneId && (
        <p className="mt-4">
          <Link
            href={`/personne/${personneId}/photo/nouveau`}
            className="inline-flex items-center rounded-[var(--rayon-petit)] bg-accent px-4 py-2 text-sm font-medium text-accent-contraste transition hover:brightness-110"
          >
            Ajouter une photo ou un document
          </Link>
        </p>
      )}
    </div>
  );
}

function BarreVue({ vue, onChanger }: { vue: VueAlbum; onChanger: (v: VueAlbum) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Mode d’affichage de l’album"
      className="flex gap-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux p-1"
    >
      <BoutonVue
        actif={vue === 'chronologie'}
        onClick={() => onChanger('chronologie')}
        titre="Histoire"
        description="Fil du temps interactif"
      />
      <BoutonVue
        actif={vue === 'organisation'}
        onClick={() => onChanger('organisation')}
        titre="Organisation"
        description="Grille par année"
      />
    </div>
  );
}

function BoutonVue({
  actif,
  onClick,
  titre,
  description,
}: {
  actif: boolean;
  onClick: () => void;
  titre: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={actif}
      onClick={onClick}
      className={`flex flex-1 flex-col items-start rounded-[calc(var(--rayon-petit)-2px)] px-3 py-2 text-left transition ${
        actif ? 'bg-fond-carte text-encre shadow-[var(--ombre-douce)]' : 'text-encre-douce hover:text-encre'
      }`}
    >
      <span className="text-sm font-medium">{titre}</span>
      <span className="text-[0.65rem] text-encre-tres-douce">{description}</span>
    </button>
  );
}

function BarreOptionsChronologie({
  options,
  onBasculer,
}: {
  options: OptionsChronologie;
  onBasculer: (cle: keyof OptionsChronologie) => void;
}) {
  const cases: { cle: keyof OptionsChronologie; libelle: string }[] = [
    { cle: 'evenements', libelle: 'Événements de vie' },
    { cle: 'faits', libelle: 'Faits historiques' },
    { cle: 'documents', libelle: 'Actes et documents' },
  ];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Éléments de la chronologie">
      {cases.map(({ cle, libelle }) => (
        <button
          key={cle}
          type="button"
          aria-pressed={options[cle]}
          onClick={() => onBasculer(cle)}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            options[cle]
              ? 'border-accent bg-accent-clair text-accent'
              : 'border-bordure bg-fond-carte text-encre-douce hover:border-bordure-forte'
          }`}
        >
          {libelle}
        </button>
      ))}
    </div>
  );
}

function BarreFiltresOrganisation({
  filtre,
  onChanger,
}: {
  filtre: FiltreOrganisation;
  onChanger: (f: FiltreOrganisation) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer l’album">
      {(Object.keys(LIBELLES_FILTRE) as FiltreOrganisation[]).map((cle) => (
        <button
          key={cle}
          type="button"
          aria-pressed={filtre === cle}
          onClick={() => onChanger(cle)}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            filtre === cle
              ? 'border-accent bg-accent-clair text-accent'
              : 'border-bordure bg-fond-carte text-encre-douce hover:border-bordure-forte'
          }`}
        >
          {LIBELLES_FILTRE[cle]}
        </button>
      ))}
    </div>
  );
}
