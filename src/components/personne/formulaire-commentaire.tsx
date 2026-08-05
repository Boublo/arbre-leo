'use client';

import { useActionState, useEffect, useRef } from 'react';
import { deposerCommentaire, type EtatCommentaire } from '@/app/actions/commentaires';
import { Alerte, BoutonEnvoi, ZoneTexte } from '@/components/ui/champs';

/** Le champ d'écriture du fil. Le formulaire se vide dès que le message est pris. */
export function FormulaireCommentaire({
  personneId,
  nomPersonne,
}: {
  personneId: string;
  nomPersonne: string;
}) {
  const [etat, action] = useActionState<EtatCommentaire, FormData>(deposerCommentaire, {});
  const formulaire = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (etat.message) formulaire.current?.reset();
  }, [etat.message]);

  return (
    <form ref={formulaire} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="personneId" value={personneId} />

      <ZoneTexte
        label={`Ajouter un mot à propos de ${nomPersonne}`}
        name="texte"
        required
        minLength={2}
        maxLength={4000}
        placeholder="Une précision, une correction, une date entendue autrement…"
        aide="Lisible par les membres de la famille. Pour un vrai récit, passez plutôt par les souvenirs."
      />

      {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}
      {etat.message && <Alerte ton="succes">{etat.message}</Alerte>}

      <div className="flex justify-end">
        <BoutonEnvoi enCours="Envoi…">Publier</BoutonEnvoi>
      </div>
    </form>
  );
}
