'use client';

import { useActionState } from 'react';
import { changerStatutChantier, type EtatChantier } from '@/app/actions/chantiers';
import { BoutonDiscret } from '@/components/recherches/controles';
import { COLONNES } from '@/components/recherches/vocabulaire';
import type { StatutChantier } from '@/lib/types-base';

/**
 * Le geste le plus fréquent du tableau : faire passer un chantier d'une colonne
 * à la suivante. Une liste et un bouton, rien de plus — la manœuvre doit tenir
 * en deux clics, y compris au clavier.
 */
export function ChangementStatut({
  id,
  titre,
  statut,
}: {
  id: string;
  titre: string;
  statut: StatutChantier;
}) {
  const [etat, action] = useActionState<EtatChantier, FormData>(changerStatutChantier, {});
  const idListe = `statut-${id}`;

  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="id" value={id} />

      <label htmlFor={idListe} className="sr-only">
        Colonne du chantier « {titre} »
      </label>
      <select
        id={idListe}
        name="statut"
        defaultValue={statut}
        className="min-w-0 flex-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-2 py-1.5
                   text-xs text-encre focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      >
        {COLONNES.map((colonne) => (
          <option key={colonne.statut} value={colonne.statut}>
            {colonne.libelle}
          </option>
        ))}
      </select>

      <BoutonDiscret enCours="…">Déplacer</BoutonDiscret>

      {etat.erreur && (
        <p role="alert" className="w-full text-xs text-erreur">
          {etat.erreur}
        </p>
      )}
    </form>
  );
}
