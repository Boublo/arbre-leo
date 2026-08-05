'use client';

import { useState, type ReactNode } from 'react';
import {
  FormulaireSouvenir,
  type ValeursSouvenir,
} from '@/components/souvenirs/formulaire-souvenir';
import type { OptionLieu } from '@/components/souvenirs/choix-lieu';
import type { OptionPersonne } from '@/components/souvenirs/choix-personnes';

/**
 * Reprendre son propre souvenir sans quitter la page.
 *
 * Le droit réel est arbitré par les politiques RLS : ce bouton n’est qu’une
 * commodité, il n’ouvre rien que la base n’autorise déjà.
 */
export function EditionSouvenir({
  valeurs,
  lieux,
  personnes,
  utilisateurId,
  peutDeposerPhotos,
  children,
}: {
  valeurs: ValeursSouvenir;
  lieux: OptionLieu[];
  personnes: OptionPersonne[];
  utilisateurId: string;
  peutDeposerPhotos: boolean;
  children: ReactNode;
}) {
  const [enReprise, setEnReprise] = useState(false);

  if (!enReprise) {
    return (
      <>
        {children}
        <div>
          <button
            type="button"
            onClick={() => setEnReprise(true)}
            className="rounded-[var(--rayon-petit)] border border-bordure px-3 py-1.5 text-sm text-encre-douce transition hover:bg-fond-doux hover:text-encre"
          >
            Modifier ce souvenir
          </button>
        </div>
      </>
    );
  }

  return (
    <FormulaireSouvenir
      mode="reprise"
      lieux={lieux}
      personnes={personnes}
      utilisateurId={utilisateurId}
      peutDeposerPhotos={peutDeposerPhotos}
      valeurs={valeurs}
      onFini={() => setEnReprise(false)}
      onAnnuler={() => setEnReprise(false)}
    />
  );
}
