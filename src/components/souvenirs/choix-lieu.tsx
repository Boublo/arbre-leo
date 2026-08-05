'use client';

import { useState } from 'react';
import { Champ } from '@/components/ui/champs';
import { Selecteur } from '@/components/souvenirs/selecteur';

export type OptionLieu = { id: string; libelle: string };

/**
 * Un lieu de l’arbre, ou bien un lieu qui n’y figure pas encore.
 *
 * Les souvenirs se passent souvent ailleurs que sur les actes : une plage, une
 * cuisine, une salle des fêtes. On accepte donc le texte libre plutôt que
 * d’obliger à créer une commune pour un dimanche après-midi.
 */
export function ChoixLieu({
  lieux,
  valeurs,
}: {
  lieux: OptionLieu[];
  valeurs?: { lieuId: string | null; lieuLibre: string | null };
}) {
  const [lieuId, setLieuId] = useState(valeurs?.lieuId ?? '');

  return (
    <fieldset className="flex flex-col gap-4 rounded-[var(--rayon)] border border-bordure p-4">
      <legend className="px-1.5 text-sm font-medium text-encre">Où ?</legend>

      <Selecteur
        label="Un lieu déjà connu de l’arbre"
        name="lieuId"
        value={lieuId}
        onChange={(e) => setLieuId(e.target.value)}
      >
        <option value="">Aucun de ceux-là</option>
        {lieux.map((lieu) => (
          <option key={lieu.id} value={lieu.id}>
            {lieu.libelle}
          </option>
        ))}
      </Selecteur>

      {lieuId === '' && (
        <Champ
          label="Ou bien, dites-le avec vos mots (facultatif)"
          name="lieuLibre"
          maxLength={160}
          defaultValue={valeurs?.lieuLibre ?? ''}
          placeholder="la maison du bas, derrière le lavoir"
          aide="Ce lieu ne sera pas placé sur la carte, mais il sera écrit."
        />
      )}
    </fieldset>
  );
}
