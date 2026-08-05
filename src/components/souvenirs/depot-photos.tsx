'use client';

import { useEffect, useId, useState, type DragEvent } from 'react';
import { creerClientNavigateur } from '@/lib/supabase/client';
import { Alerte } from '@/components/ui/champs';
import {
  BUCKET_MEDIAS,
  NOMBRE_MAX_PHOTOS,
  TAILLE_MAX_PHOTO,
  TYPES_PHOTO,
  nomFichierSain,
} from '@/lib/souvenirs-partage';

export type PhotoDeposee = {
  /** Clé de rendu, stable tant que la photo reste dans la liste. */
  cle: string;
  /** Renseigné pour une photo déjà enregistrée en base. */
  mediaId: string | null;
  chemin: string;
  nom: string;
  mime: string;
  taille: number;
  largeur: number | null;
  hauteur: number | null;
  /** Vignette : URL locale pour un fichier tout juste choisi, URL signée sinon. */
  apercu: string | null;
};

/**
 * Le téléversement des photos.
 *
 * Les fichiers partent vers le bucket dès qu’ils sont choisis, directement
 * depuis le navigateur : la Server Action ne reçoit ensuite que des chemins.
 * Chaque chemin commence par l’identifiant du déposant — c’est ce que vérifie
 * la politique RLS du bucket, et ce que revérifie la Server Action.
 */
export function DepotPhotos({
  utilisateurId,
  actif,
  valeurs = [],
  onChangement,
}: {
  utilisateurId: string;
  actif: boolean;
  valeurs?: PhotoDeposee[];
  /** Notifie la prévisualisation à chaque ajout, retrait ou réordonnancement. */
  onChangement?: (photos: PhotoDeposee[]) => void;
}) {
  const [photos, setPhotos] = useState<PhotoDeposee[]>(valeurs);
  const [enCours, setEnCours] = useState(0);
  const [souci, setSouci] = useState<string | null>(null);
  const [survole, setSurvole] = useState(false);
  const idChoix = useId();

  // Signaler à l’extérieur : la Preview vit à côté du formulaire.
  useEffect(() => {
    onChangement?.(photos);
  }, [photos, onChangement]);

  async function ajouter(fichiers: FileList | null) {
    if (!fichiers || fichiers.length === 0) return;
    setSouci(null);

    const supabase = creerClientNavigateur();
    const retenus = [...fichiers];

    if (photos.length + retenus.length > NOMBRE_MAX_PHOTOS) {
      setSouci(`Pas plus de ${NOMBRE_MAX_PHOTOS} photos par souvenir.`);
      return;
    }

    setEnCours((n) => n + retenus.length);

    for (const fichier of retenus) {
      try {
        if (!TYPES_PHOTO.includes(fichier.type)) {
          setSouci(`« ${fichier.name} » n’est pas une image d’un format accepté.`);
          continue;
        }
        if (fichier.size > TAILLE_MAX_PHOTO) {
          setSouci(`« ${fichier.name} » dépasse 25 Mo.`);
          continue;
        }

        const chemin = `${utilisateurId}/${crypto.randomUUID()}-${nomFichierSain(fichier.name)}`;
        const { error } = await supabase.storage
          .from(BUCKET_MEDIAS)
          .upload(chemin, fichier, { contentType: fichier.type, upsert: false });

        if (error) {
          setSouci(`« ${fichier.name} » n’a pas pu être envoyé.`);
          continue;
        }

        const mesure = await mesurer(fichier);
        // Créée ici, et non dans la fonction de mise à jour : celle-ci peut
        // être rejouée par React, ce qui laisserait des URL locales orphelines.
        const apercu = URL.createObjectURL(fichier);

        setPhotos((precedent) => [
          ...precedent,
          {
            cle: chemin,
            mediaId: null,
            chemin,
            nom: fichier.name,
            mime: fichier.type,
            taille: fichier.size,
            largeur: mesure?.largeur ?? null,
            hauteur: mesure?.hauteur ?? null,
            apercu,
          },
        ]);
      } finally {
        setEnCours((n) => Math.max(0, n - 1));
      }
    }
  }

  async function retirer(photo: PhotoDeposee) {
    setPhotos((precedent) => precedent.filter((p) => p.cle !== photo.cle));
    if (photo.apercu?.startsWith('blob:')) URL.revokeObjectURL(photo.apercu);

    // Une photo jamais enregistrée n’a aucune raison de rester dans le bucket.
    // Une photo déjà enregistrée sera nettoyée par la Server Action.
    if (!photo.mediaId) {
      const supabase = creerClientNavigateur();
      await supabase.storage.from(BUCKET_MEDIAS).remove([photo.chemin]);
    }
  }

  function deplacer(index: number, pas: -1 | 1) {
    setPhotos((precedent) => {
      const cible = index + pas;
      if (cible < 0 || cible >= precedent.length) return precedent;
      const copie = [...precedent];
      [copie[index], copie[cible]] = [copie[cible], copie[index]];
      return copie;
    });
  }

  function surGlisserSurvol(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setSurvole(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function surGlisserQuitter(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setSurvole(false);
  }

  function surDeposer(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setSurvole(false);
    if (e.dataTransfer.files.length > 0) {
      void ajouter(e.dataTransfer.files);
    }
  }

  if (!actif) {
    return (
      <div className="flex flex-col gap-3 rounded-[var(--rayon)] border border-bordure p-4">
        <p className="text-sm font-medium text-encre">Des photos ?</p>
        <Alerte ton="info">
          Le dépôt de photos est réservé aux contributeurs. Votre récit, lui, est le bienvenu :
          demandez à un administrateur d’ouvrir votre accès pour y joindre des images.
        </Alerte>
      </div>
    );
  }

  return (
    <fieldset
      className="flex flex-col gap-4 rounded-[var(--rayon)] border border-bordure p-4"
      onDragOver={surGlisserSurvol}
      onDragEnter={surGlisserSurvol}
      onDragLeave={surGlisserQuitter}
      onDrop={surDeposer}
    >
      <legend className="px-1.5 text-sm font-medium text-encre">Des photos ?</legend>

      <label
        htmlFor={idChoix}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--rayon-petit)] border-2 border-dashed p-6 text-center transition ${
          survole
            ? 'border-accent bg-accent-clair text-encre'
            : 'border-bordure bg-fond-doux text-encre-douce hover:border-bordure-forte'
        }`}
      >
        <span className="text-sm font-medium text-encre">
          {survole ? 'Relâchez pour joindre les images' : 'Glissez vos photos ici'}
        </span>
        <span className="text-xs">
          ou <span className="underline decoration-bordure-forte underline-offset-2">choisissez-les</span> depuis
          votre appareil
        </span>
      </label>

      <input
        id={idChoix}
        type="file"
        multiple
        accept={TYPES_PHOTO.join(',')}
        onChange={(e) => {
          void ajouter(e.target.files);
          e.target.value = '';
        }}
        className="sr-only"
      />

      <p className="text-xs text-encre-douce">
        JPEG, PNG, WebP, AVIF, HEIC ou TIFF. 25 Mo au plus par image, {NOMBRE_MAX_PHOTOS} images
        au plus. L’envoi commence dès la sélection.
      </p>

      <p aria-live="polite" className="text-xs text-encre-douce">
        {enCours > 0
          ? `Envoi de ${enCours} image${enCours > 1 ? 's' : ''}…`
          : `${photos.length} image${photos.length > 1 ? 's' : ''} jointe${photos.length > 1 ? 's' : ''}.`}
      </p>

      {souci && <Alerte ton="erreur">{souci}</Alerte>}

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.cle} className="flex flex-col gap-1.5 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux p-2">
              <div className="aspect-square overflow-hidden rounded-[var(--rayon-petit)] bg-fond-carte">
                {photo.apercu ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.apercu} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-xs text-encre-tres-douce">
                    Aperçu indisponible
                  </span>
                )}
              </div>

              <p className="truncate text-xs text-encre-douce" title={photo.nom}>
                {photo.nom}
              </p>

              <div className="flex items-center gap-1">
                <BoutonVignette
                  libelle={`Avancer ${photo.nom}`}
                  onClick={() => deplacer(index, -1)}
                  desactive={index === 0}
                >
                  ↑
                </BoutonVignette>
                <BoutonVignette
                  libelle={`Reculer ${photo.nom}`}
                  onClick={() => deplacer(index, 1)}
                  desactive={index === photos.length - 1}
                >
                  ↓
                </BoutonVignette>
                <BoutonVignette libelle={`Retirer ${photo.nom}`} onClick={() => void retirer(photo)}>
                  Retirer
                </BoutonVignette>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        type="hidden"
        name="photos"
        value={JSON.stringify(
          photos.map((p) => ({
            mediaId: p.mediaId,
            chemin: p.chemin,
            nom: p.nom,
            mime: p.mime,
            taille: p.taille,
            largeur: p.largeur,
            hauteur: p.hauteur,
          }))
        )}
      />
    </fieldset>
  );
}

function BoutonVignette({
  libelle,
  onClick,
  desactive = false,
  children,
}: {
  libelle: string;
  onClick: () => void;
  desactive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactive}
      aria-label={libelle}
      className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-2 py-1 text-xs text-encre-douce
                 transition hover:text-encre disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Les dimensions servent à la galerie ; leur absence n’empêche rien. */
async function mesurer(fichier: File): Promise<{ largeur: number; hauteur: number } | null> {
  try {
    const image = await createImageBitmap(fichier);
    const mesure = { largeur: image.width, hauteur: image.height };
    image.close();
    return mesure;
  } catch {
    return null;
  }
}
