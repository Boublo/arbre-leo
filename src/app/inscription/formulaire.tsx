'use client';

import { useActionState } from 'react';
import { inscrire, type EtatFormulaire } from '@/app/actions/auth';
import { Champ, ZoneTexte, BoutonEnvoi, Alerte } from '@/components/ui/champs';

export function FormulaireInscription() {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(inscrire, {});

  if (etat.message) {
    return <Alerte ton="succes">{etat.message}</Alerte>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Champ
        label="Votre nom"
        name="nomAffiche"
        required
        placeholder="Prénom et nom"
        aide="Le nom sous lequel la famille vous connaît."
      />
      <Champ
        label="Votre lien avec la famille"
        name="lienFamille"
        required
        placeholder="Grand-mère du côté paternel"
        aide="Cela permet de vous reconnaître et de vous rattacher à votre place dans l'arbre."
      />
      <Champ label="Adresse e-mail" name="email" type="email" autoComplete="email" required />
      <Champ
        label="Mot de passe"
        name="motDePasse"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
        aide="Au moins 10 caractères."
      />
      <ZoneTexte
        label="Un mot (facultatif)"
        name="message"
        placeholder="J'ai de vieilles photos de famille à partager."
        aide="Ce message est lu par l'administrateur au moment de valider votre demande."
      />

      {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}

      <BoutonEnvoi enCours="Envoi…">Envoyer ma demande</BoutonEnvoi>
    </form>
  );
}
