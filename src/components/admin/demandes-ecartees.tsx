'use client';

import { useActionState } from 'react';
import { changerStatut, type EtatAdmin } from '@/app/actions/admin';
import { Alerte } from '@/components/ui/champs';
import { BoutonSecondaire } from '@/components/admin/champs-admin';
import { formaterJour, type DemandeAdmin } from '@/components/admin/vocabulaire';

/**
 * Les demandes écartées.
 *
 * Un refus n'est pas définitif : on se souvient parfois d'une cousine deux
 * jours plus tard. Cette liste permet de revenir sur la décision, en remettant
 * la demande sur la pile.
 */
export function DemandesEcartees({ demandes }: { demandes: DemandeAdmin[] }) {
  if (demandes.length === 0) return null;

  return (
    <section aria-labelledby="titre-ecartees" className="flex flex-col gap-4">
      <header>
        <h2 id="titre-ecartees" className="text-2xl">
          Demandes écartées
        </h2>
        <p className="mt-1 text-sm text-encre-douce">
          Une décision se reprend : la demande retourne alors en attente.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {demandes.map((demande) => (
          <li key={demande.id}>
            <CarteEcartee demande={demande} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CarteEcartee({ demande }: { demande: DemandeAdmin }) {
  const [etat, action] = useActionState<EtatAdmin, FormData>(changerStatut, {});

  return (
    <article className="carte flex flex-wrap items-start justify-between gap-3 p-5">
      <div className="text-sm">
        <h3 className="text-base leading-tight">{demande.nom_affiche}</h3>
        <p className="text-encre-douce">{demande.email}</p>
        {demande.motif_refus && (
          <p className="mt-1 text-encre-tres-douce">Motif : « {demande.motif_refus} »</p>
        )}
        <p className="mt-1 text-xs text-encre-tres-douce">
          Demande reçue le {formaterJour(demande.cree_le)}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <form action={action}>
          <input type="hidden" name="membreId" value={demande.id} />
          <input type="hidden" name="statut" value="en_attente" />
          <BoutonSecondaire enCours="Enregistrement…">Revenir sur ce refus</BoutonSecondaire>
        </form>

        {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}
        {etat.message && <Alerte ton="succes">{etat.message}</Alerte>}
      </div>
    </article>
  );
}
