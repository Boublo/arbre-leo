'use client';

import { useActionState } from 'react';
import { consignerResultat, type EtatChantier } from '@/app/actions/chantiers';
import { BoutonDiscret } from '@/components/recherches/controles';
import type { StatutChantier } from '@/lib/types-base';

/**
 * Ce qu'une réponse a fini par apprendre.
 *
 * C'est la partie qu'on oublie d'écrire et qu'on regrette dix ans plus tard :
 * sans elle, personne ne saura si la mairie a répondu « acte introuvable » ou
 * si le registre a livré deux noms de plus.
 */
export function ConsignerResultat({
  id,
  titre,
  statut,
  resultat,
}: {
  id: string;
  titre: string;
  statut: StatutChantier;
  resultat: string | null;
}) {
  const [etat, action] = useActionState<EtatChantier, FormData>(consignerResultat, {});
  const idTexte = `resultat-${id}`;

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-encre-douce transition hover:text-accent">
        {resultat ? 'Corriger le résultat' : 'Consigner le résultat'}
      </summary>

      <form action={action} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="id" value={id} />

        <label htmlFor={idTexte} className="sr-only">
          Résultat du chantier « {titre} »
        </label>
        <textarea
          id={idTexte}
          name="resultat"
          rows={4}
          required
          defaultValue={etat.saisie?.resultat ?? resultat ?? ''}
          placeholder="Ce que la réponse apprend, ou pourquoi elle n’apprend rien."
          className="resize-y rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-2.5 py-2 text-xs text-encre
                     placeholder:text-encre-tres-douce focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />

        <label className="flex items-center gap-2 text-encre-douce">
          <input
            type="checkbox"
            name="clore"
            defaultChecked={statut !== 'aboutie' && statut !== 'abandonnee'}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Le chantier est abouti
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <BoutonDiscret enCours="Enregistrement…">Enregistrer</BoutonDiscret>
          {etat.message && (
            <span role="status" className="text-succes">
              {etat.message}
            </span>
          )}
        </div>

        {etat.erreur && (
          <p role="alert" className="text-erreur">
            {etat.erreur}
          </p>
        )}
      </form>
    </details>
  );
}
