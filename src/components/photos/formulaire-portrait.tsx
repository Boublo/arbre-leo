'use client';

import { useActionState, useState } from 'react';
import { deposerPortrait, type EtatPortrait } from '@/app/actions/photos';
import { Alerte, BoutonEnvoi, Champ, ZoneTexte } from '@/components/ui/champs';
import { CaseACocher } from '@/components/saisie/champs-saisie';
import { DepotPhotos, type PhotoDeposee } from '@/components/souvenirs/depot-photos';

/**
 * Dépôt d’un portrait pour une personne.
 *
 * Une image suffit : elle rejoint la galerie de la fiche et peut devenir le
 * visage de la carte sur l’arbre.
 */
export function FormulairePortrait({
  personneId,
  nomPersonne,
  utilisateurId,
  aDejaPortrait,
}: {
  personneId: string;
  nomPersonne: string;
  utilisateurId: string;
  aDejaPortrait: boolean;
}) {
  const [etat, action] = useActionState<EtatPortrait, FormData>(deposerPortrait, {});
  const [photos, setPhotos] = useState<PhotoDeposee[]>([]);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="personneId" value={personneId} />

      <Alerte ton="info">
        Vous déposez une photo pour <strong>{nomPersonne}</strong>. Elle reste privée :
        seuls les membres de la famille y accèdent.
      </Alerte>

      <DepotPhotos
        utilisateurId={utilisateurId}
        actif
        valeurs={photos}
        onChangement={(liste) => setPhotos(liste.slice(0, 1))}
      />

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

      <CaseACocher
        name="portraitSurCarte"
        value="oui"
        defaultChecked
        label="Afficher cette photo sur la carte de l’arbre"
        aide={
          aDejaPortrait
            ? 'Remplace le portrait actuel sur la carte ; l’ancienne photo reste dans la galerie.'
            : 'Sans portrait, la carte ne montre qu’une initiale.'
        }
      />

      {photos.length === 0 && (
        <Alerte ton="info">Choisissez une image avant d’envoyer.</Alerte>
      )}

      {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}

      <BoutonEnvoi disabled={photos.length === 0} enCours="Envoi…">
        Déposer la photo
      </BoutonEnvoi>
    </form>
  );
}
