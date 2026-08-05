'use client';

import { useActionState } from 'react';
import { connecter, type EtatFormulaire } from '@/app/actions/auth';
import { Champ, BoutonEnvoi, Alerte } from '@/components/ui/champs';

export function FormulaireConnexion({ suite }: { suite?: string }) {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(connecter, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      {suite && <input type="hidden" name="suite" value={suite} />}

      <Champ
        label="Adresse e-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="vous@exemple.fr"
      />
      <Champ
        label="Mot de passe"
        name="motDePasse"
        type="password"
        autoComplete="current-password"
        required
      />

      {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}

      <BoutonEnvoi enCours="Connexion…">Se connecter</BoutonEnvoi>
    </form>
  );
}
