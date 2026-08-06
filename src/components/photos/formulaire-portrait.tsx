'use client';

import { useActionState, useId, useState } from 'react';
import { deposerPortrait, type EtatPortrait } from '@/app/actions/photos';
import { Alerte, BoutonEnvoi, Champ, ZoneTexte } from '@/components/ui/champs';
import { CaseACocher } from '@/components/saisie/champs-saisie';
import { EditeurCadrage } from '@/components/photos/editeur-cadrage';
import { creerClientNavigateur } from '@/lib/supabase/client';
import {
  BUCKET_MEDIAS,
  TAILLE_MAX_PHOTO,
  TYPES_PHOTO,
  nomFichierSain,
} from '@/lib/souvenirs-partage';
import type { PhotoDeposee } from '@/components/souvenirs/depot-photos';

type Etape = 'choix' | 'cadrage' | 'pret';

/**
 * Dépôt d’une photo pour une personne.
 *
 * Si elle doit aller sur la carte de l’arbre, on passe par un cadrage 3:5
 * avant l’envoi. Sinon, le fichier part tel quel dans l’album de la fiche.
 */
export function FormulairePortrait({
  personneId,
  nomPersonne,
  utilisateurId,
  aDejaPortrait,
  estAdmin = false,
}: {
  personneId: string;
  nomPersonne: string;
  utilisateurId: string;
  aDejaPortrait: boolean;
  estAdmin?: boolean;
}) {
  const [etat, action] = useActionState<EtatPortrait, FormData>(deposerPortrait, {});
  const [etape, setEtape] = useState<Etape>('choix');
  const [fichierBrut, setFichierBrut] = useState<File | null>(null);
  const [photo, setPhoto] = useState<PhotoDeposee | null>(null);
  const [portraitSurCarte, setPortraitSurCarte] = useState(true);
  const [envoiFichier, setEnvoiFichier] = useState(false);
  const [souci, setSouci] = useState<string | null>(null);
  const idChoix = useId();

  function surFichierChoisi(liste: FileList | null) {
    setSouci(null);
    const fichier = liste?.[0];
    if (!fichier) return;

    if (!TYPES_PHOTO.includes(fichier.type)) {
      setSouci('Ce format d’image n’est pas accepté.');
      return;
    }
    if (fichier.size > TAILLE_MAX_PHOTO) {
      setSouci('L’image dépasse 25 Mo.');
      return;
    }

    setFichierBrut(fichier);
    if (portraitSurCarte) {
      setEtape('cadrage');
    } else {
      void telechargerTelQuel(fichier);
    }
  }

  async function telechargerTelQuel(fichier: File) {
    setEnvoiFichier(true);
    setSouci(null);
    try {
      const deposee = await envoyerVersBucket(fichier, utilisateurId);
      setPhoto(deposee);
      setEtape('pret');
    } catch {
      setSouci('L’image n’a pas pu être envoyée. Réessayez.');
      setEtape('choix');
    } finally {
      setEnvoiFichier(false);
    }
  }

  async function apresCadrage(fichierCadre: File, apercuUrl: string) {
    setEnvoiFichier(true);
    setSouci(null);
    try {
      const deposee = await envoyerVersBucket(fichierCadre, utilisateurId, apercuUrl);
      setPhoto(deposee);
      setFichierBrut(null);
      setEtape('pret');
    } catch {
      setSouci('Le portrait cadré n’a pas pu être envoyé. Réessayez.');
      setEtape('cadrage');
    } finally {
      setEnvoiFichier(false);
    }
  }

  function recommencer() {
    if (photo?.apercu?.startsWith('blob:')) URL.revokeObjectURL(photo.apercu);
    setPhoto(null);
    setFichierBrut(null);
    setEtape('choix');
    setSouci(null);
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="personneId" value={personneId} />
      {photo && (
        <input
          type="hidden"
          name="photos"
          value={JSON.stringify([
            {
              chemin: photo.chemin,
              nom: photo.nom,
              mime: photo.mime,
              taille: photo.taille,
              largeur: photo.largeur,
              hauteur: photo.hauteur,
            },
          ])}
        />
      )}

      <Alerte ton="info">
        Vous déposez une photo pour <strong>{nomPersonne}</strong>. Elle reste privée :
        seuls les membres de la famille y accèdent.
      </Alerte>

      <CaseACocher
        name="portraitSurCarte"
        value="oui"
        checked={portraitSurCarte}
        onChange={(e) => setPortraitSurCarte(e.target.checked)}
        label="Afficher cette photo sur la carte de l’arbre"
        aide={
          estAdmin
            ? aDejaPortrait
              ? 'Remplace le portrait actuel ; l’ancienne photo reste dans l’album. Un cadrage 3:5 sera demandé.'
              : 'Sans portrait, la carte ne montre qu’une initiale. Un cadrage 3:5 sera demandé.'
            : aDejaPortrait
              ? 'Votre demande sera transmise à un administrateur. L’ancienne photo reste sur la carte en attendant.'
              : 'Votre demande sera transmise à un administrateur. Un cadrage 3:5 sera demandé.'
        }
      />

      {etape === 'choix' && (
        <label
          htmlFor={idChoix}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--rayon)] border-2 border-dashed border-bordure bg-fond-doux p-8 text-center transition hover:border-bordure-forte"
        >
          <span className="text-sm font-medium text-encre">
            {portraitSurCarte
              ? 'Choisir une photo à cadrer pour la carte'
              : 'Choisir une photo pour l’album'}
          </span>
          <span className="text-xs text-encre-douce">
            JPEG, PNG, WebP, AVIF, HEIC, TIFF — 25 Mo max
          </span>
          <input
            id={idChoix}
            type="file"
            accept={TYPES_PHOTO.join(',')}
            className="sr-only"
            onChange={(e) => surFichierChoisi(e.target.files)}
          />
        </label>
      )}

      {etape === 'cadrage' && fichierBrut && (
        <EditeurCadrage
          fichier={fichierBrut}
          onValider={(f, url) => void apresCadrage(f, url)}
          onAnnuler={recommencer}
        />
      )}

      {etape === 'pret' && photo && (
        <div className="flex flex-col gap-3 rounded-[var(--rayon)] border border-bordure p-4 sm:flex-row sm:items-start">
          {photo.apercu && (
            // eslint-disable-next-line @next/next/no-img-element -- blob local ou signé temporaire
            <img
              src={photo.apercu}
              alt=""
              className={
                portraitSurCarte
                  ? 'h-36 w-[5.4rem] shrink-0 rounded-[var(--rayon-petit)] object-cover'
                  : 'h-28 w-36 shrink-0 rounded-[var(--rayon-petit)] object-cover'
              }
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-encre">{photo.nom}</p>
            <p className="mt-1 text-xs text-encre-tres-douce">
              {portraitSurCarte
                ? estAdmin
                  ? 'Cadrage 3:5 prêt pour la carte et l’album.'
                  : 'Cadrage 3:5 prêt — la photo ira dans l’album et une demande partira pour la carte.'
                : 'Prête pour l’album de la fiche.'}
            </p>
            <button
              type="button"
              onClick={recommencer}
              className="mt-2 text-sm text-encre-douce underline-offset-4 hover:underline"
            >
              Changer de photo
            </button>
          </div>
        </div>
      )}

      {envoiFichier && <Alerte ton="info">Envoi de l’image…</Alerte>}
      {(souci || etat.erreur) && <Alerte ton="erreur">{souci ?? etat.erreur}</Alerte>}

      <Champ
        label="Titre"
        name="titre"
        maxLength={200}
        placeholder="Portrait de jeunesse, mariage en 1962…"
        aide="Facultatif : une courte légende pour retrouver la photo plus tard."
      />

      <ZoneTexte
        label="Description"
        name="description"
        rows={3}
        maxLength={2000}
        placeholder="Circonstances, lieu, personnes présentes sur le cliché…"
      />

      {etape !== 'pret' && !envoiFichier && (
        <Alerte ton="info">
          {portraitSurCarte
            ? 'Choisissez une image, cadrez-la, puis envoyez.'
            : 'Choisissez une image avant d’envoyer.'}
        </Alerte>
      )}

      <BoutonEnvoi disabled={etape !== 'pret' || envoiFichier} enCours="Envoi…">
        Déposer la photo
      </BoutonEnvoi>
    </form>
  );
}

async function envoyerVersBucket(
  fichier: File,
  utilisateurId: string,
  apercuExistant?: string
): Promise<PhotoDeposee> {
  const supabase = creerClientNavigateur();
  const chemin = `${utilisateurId}/${crypto.randomUUID()}-${nomFichierSain(fichier.name)}`;
  const { error } = await supabase.storage
    .from(BUCKET_MEDIAS)
    .upload(chemin, fichier, { contentType: fichier.type, upsert: false });

  if (error) throw error;

  const dims = await mesurer(fichier);
  return {
    cle: chemin,
    mediaId: null,
    chemin,
    nom: fichier.name,
    mime: fichier.type,
    taille: fichier.size,
    largeur: dims?.largeur ?? null,
    hauteur: dims?.hauteur ?? null,
    apercu: apercuExistant ?? URL.createObjectURL(fichier),
  };
}

function mesurer(fichier: File): Promise<{ largeur: number; hauteur: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      resolve({ largeur: img.naturalWidth, hauteur: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
