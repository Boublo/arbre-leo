'use client';

import { useActionState, useEffect, useRef } from 'react';
import { commenterSouvenir, type EtatSouvenir } from '@/app/actions/souvenirs';
import { ZoneTexte, BoutonEnvoi, Alerte } from '@/components/ui/champs';

/**
 * Le mot que l’on ajoute sous un souvenir.
 *
 * Ouvert à tout membre validé, lecteur compris : commenter, c’est se souvenir
 * à voix haute, et c’est souvent là que la mémoire revient.
 */
export function FormulaireCommentaire({ souvenirId }: { souvenirId: string }) {
  const [etat, action] = useActionState<EtatSouvenir, FormData>(commenterSouvenir, {});
  const formulaire = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (etat.message) formulaire.current?.reset();
  }, [etat.message]);

  return (
    <form ref={formulaire} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="souvenirId" value={souvenirId} />

      <ZoneTexte
        label="Ajouter un mot"
        name="texte"
        required
        rows={3}
        maxLength={4000}
        placeholder="Ce que cela vous rappelle, une précision, un nom oublié…"
      />

      {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}

      <div>
        <BoutonEnvoi enCours="Publication…">Publier</BoutonEnvoi>
      </div>
    </form>
  );
}
