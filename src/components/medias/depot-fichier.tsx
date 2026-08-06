'use client';

import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { creerClientNavigateur } from '@/lib/supabase/client';
import { Alerte } from '@/components/ui/champs';
import {
  NOMBRE_MAX_FICHIERS,
  TAILLE_MAX_FICHIER,
  TYPES_FICHIER_ACTE,
} from '@/lib/actes-partage';
import { BUCKET_MEDIAS, nomFichierSain } from '@/lib/souvenirs-partage';

export type FichierDepose = {
  cle: string;
  chemin: string;
  nom: string;
  mime: string;
  taille: number;
  largeur: number | null;
  hauteur: number | null;
  apercu: string | null;
  estImage: boolean;
};

/**
 * Téléversement du scan d'un acte (image ou PDF).
 *
 * Comme pour les souvenirs, le fichier part vers le bucket dès la sélection ;
 * la Server Action ne reçoit ensuite que le chemin, vérifié par RLS.
 */
export function DepotFichier({
  utilisateurId,
  actif,
  valeurs = [],
  onChangement,
}: {
  utilisateurId: string;
  actif: boolean;
  valeurs?: FichierDepose[];
  onChangement?: (fichiers: FichierDepose[]) => void;
}) {
  const [fichiers, setFichiers] = useState<FichierDepose[]>(valeurs);
  const [enCours, setEnCours] = useState(0);
  const [souci, setSouci] = useState<string | null>(null);
  const [survole, setSurvole] = useState(false);
  const idChoix = useId();

  useEffect(() => {
    onChangement?.(fichiers);
  }, [fichiers, onChangement]);

  const blobsVivants = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const f of fichiers) {
      if (f.apercu?.startsWith('blob:')) blobsVivants.current.add(f.apercu);
    }
  }, [fichiers]);
  useEffect(() => {
    const ensemble = blobsVivants.current;
    return () => {
      ensemble.forEach((url) => URL.revokeObjectURL(url));
      ensemble.clear();
    };
  }, []);

  async function ajouter(liste: FileList | null) {
    if (!liste || liste.length === 0) return;
    setSouci(null);

    const supabase = creerClientNavigateur();
    const retenus = [...liste];

    if (fichiers.length + retenus.length > NOMBRE_MAX_FICHIERS) {
      setSouci(`Pas plus de ${NOMBRE_MAX_FICHIERS} fichiers par acte.`);
      return;
    }

    setEnCours((n) => n + retenus.length);

    for (const fichier of retenus) {
      try {
        if (!TYPES_FICHIER_ACTE.includes(fichier.type as (typeof TYPES_FICHIER_ACTE)[number])) {
          setSouci(`« ${fichier.name} » n’est pas une image ni un PDF.`);
          continue;
        }
        if (fichier.size > TAILLE_MAX_FICHIER) {
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

        const estImage = fichier.type.startsWith('image/');
        const mesure = estImage ? await mesurer(fichier) : null;
        const apercu = estImage ? URL.createObjectURL(fichier) : null;

        setFichiers((precedent) => [
          ...precedent,
          {
            cle: chemin,
            chemin,
            nom: fichier.name,
            mime: fichier.type,
            taille: fichier.size,
            largeur: mesure?.largeur ?? null,
            hauteur: mesure?.hauteur ?? null,
            apercu,
            estImage,
          },
        ]);
      } finally {
        setEnCours((n) => Math.max(0, n - 1));
      }
    }
  }

  async function retirer(fichier: FichierDepose) {
    setFichiers((precedent) => precedent.filter((f) => f.cle !== fichier.cle));
    if (fichier.apercu?.startsWith('blob:')) {
      URL.revokeObjectURL(fichier.apercu);
      blobsVivants.current.delete(fichier.apercu);
    }

    const supabase = creerClientNavigateur();
    await supabase.storage.from(BUCKET_MEDIAS).remove([fichier.chemin]);
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
        <p className="text-sm font-medium text-encre">Le scan de l’acte</p>
        <Alerte ton="info">
          Le dépôt de fichiers est réservé aux contributeurs. Vous pouvez tout de même recopier
          l’acte ou indiquer sa cote : demandez à un administrateur d’ouvrir votre accès pour
          joindre le scan.
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
      <legend className="px-1.5 text-sm font-medium text-encre">Le scan de l’acte</legend>

      <label
        htmlFor={idChoix}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--rayon-petit)] border-2 border-dashed p-6 text-center transition ${
          survole
            ? 'border-accent bg-accent-clair text-encre'
            : 'border-bordure bg-fond-doux text-encre-douce hover:border-bordure-forte'
        }`}
      >
        <span className="text-sm font-medium text-encre">
          {survole ? 'Relâchez pour joindre le fichier' : 'Glissez le scan ici'}
        </span>
        <span className="text-xs">
          ou{' '}
          <span className="underline decoration-bordure-forte underline-offset-2">
            choisissez-le
          </span>{' '}
          depuis votre appareil
        </span>
      </label>

      <input
        id={idChoix}
        type="file"
        multiple
        accept={[...TYPES_FICHIER_ACTE, '.pdf'].join(',')}
        onChange={(e) => {
          void ajouter(e.target.files);
          e.target.value = '';
        }}
        className="sr-only"
      />

      <p className="text-xs text-encre-douce">
        JPEG, PNG, WebP, PDF… 25 Mo au plus par fichier, {NOMBRE_MAX_FICHIERS} fichiers au plus
        (pages multiples d’un même acte). L’envoi commence dès la sélection.
      </p>

      <p aria-live="polite" className="text-xs text-encre-douce">
        {enCours > 0
          ? `Envoi de ${enCours} fichier${enCours > 1 ? 's' : ''}…`
          : `${fichiers.length} fichier${fichiers.length > 1 ? 's' : ''} joint${fichiers.length > 1 ? 's' : ''}.`}
      </p>

      {souci && <Alerte ton="erreur">{souci}</Alerte>}

      {fichiers.length > 0 && (
        <ul className="flex flex-col gap-2">
          {fichiers.map((fichier) => (
            <li
              key={fichier.cle}
              className="flex items-center gap-3 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux p-2"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--rayon-petit)] bg-fond-carte">
                {fichier.apercu ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fichier.apercu} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-encre-tres-douce">PDF</span>
                )}
              </div>

              <p className="min-w-0 flex-1 truncate text-sm text-encre" title={fichier.nom}>
                {fichier.nom}
              </p>

              <button
                type="button"
                onClick={() => void retirer(fichier)}
                className="shrink-0 rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-2 py-1 text-xs text-encre-douce transition hover:text-encre"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        type="hidden"
        name="fichiers"
        value={JSON.stringify(
          fichiers.map((f) => ({
            chemin: f.chemin,
            nom: f.nom,
            mime: f.mime,
            taille: f.taille,
            largeur: f.largeur,
            hauteur: f.hauteur,
          }))
        )}
      />
    </fieldset>
  );
}

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
