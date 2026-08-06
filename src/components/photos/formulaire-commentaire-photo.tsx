'use client';

import { useActionState, useEffect, useRef } from 'react';
import { deposerCommentaire, type EtatCommentaire } from '@/app/actions/commentaires';
import { Alerte, BoutonEnvoi, ZoneTexte } from '@/components/ui/champs';

/** Souvenirs et précisions laissés sous une photo de l’album. */
export function FormulaireCommentairePhoto({
  mediaId,
  titrePhoto,
}: {
  mediaId: string;
  titrePhoto: string;
}) {
  const [etat, action] = useActionState<EtatCommentaire, FormData>(deposerCommentaire, {});
  const formulaire = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (etat.message) formulaire.current?.reset();
  }, [etat.message]);

  return (
    <form ref={formulaire} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="mediaId" value={mediaId} />

      <ZoneTexte
        label={`Un souvenir à propos de « ${titrePhoto} »`}
        name="texte"
        required
        minLength={2}
        maxLength={4000}
        placeholder="Qui est sur le cliché, où, dans quelles circonstances…"
        aide="Lisible par les membres de la famille. Pour un récit plus long, ouvrez plutôt un souvenir."
      />

      {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}
      {etat.message && <Alerte ton="succes">{etat.message}</Alerte>}

      <div className="flex justify-end">
        <BoutonEnvoi enCours="Envoi…">Publier</BoutonEnvoi>
      </div>
    </form>
  );
}
