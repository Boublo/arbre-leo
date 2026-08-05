'use client';

import { useState } from 'react';
import { Champ } from '@/components/ui/champs';
import { Selecteur } from '@/components/souvenirs/selecteur';
import {
  ANNEE_MIN,
  MOIS,
  PRECISIONS,
  anneeMax,
  type PrecisionSaisie,
} from '@/lib/souvenirs-partage';

export type ValeursDate = {
  precision: PrecisionSaisie;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  dateTexte: string | null;
};

/**
 * La date d’un souvenir est rarement une date.
 *
 * On demande donc d’abord ce que l’on sait — le jour, le mois, l’année, la
 * décennie, ou rien — et les champs se règlent là-dessus. C’est ce choix qui
 * remplit `precision_date` en base.
 */
export function ChoixDate({ valeurs }: { valeurs?: ValeursDate }) {
  const [precision, setPrecision] = useState<PrecisionSaisie>(valeurs?.precision ?? 'annee');

  const demandeAnnee = precision !== 'inconnue';
  const demandeMois = precision === 'mois' || precision === 'jour';
  const demandeJour = precision === 'jour';

  return (
    <fieldset className="flex flex-col gap-4 rounded-[var(--rayon)] border border-bordure p-4">
      <legend className="px-1.5 text-sm font-medium text-encre">Quand cela s’est-il passé ?</legend>

      <Selecteur
        label="Ce dont vous êtes sûr"
        name="precision"
        value={precision}
        onChange={(e) => setPrecision(e.target.value as PrecisionSaisie)}
        aide="Une année approximative vaut mieux qu’une date inventée."
      >
        {PRECISIONS.map((p) => (
          <option key={p.valeur} value={p.valeur}>
            {p.libelle}
          </option>
        ))}
      </Selecteur>

      <div className="grid gap-4 sm:grid-cols-3">
        {demandeAnnee && (
          <Champ
            label={precision === 'decennie' ? 'Une année de cette décennie' : 'Année'}
            name="annee"
            type="number"
            inputMode="numeric"
            min={ANNEE_MIN}
            max={anneeMax()}
            required
            defaultValue={valeurs?.annee ?? ''}
            aide={precision === 'decennie' ? '1963 sera rangé dans les années 1960.' : undefined}
          />
        )}

        {demandeMois && (
          <Selecteur label="Mois" name="mois" required defaultValue={valeurs?.mois ?? ''}>
            <option value="">Choisir…</option>
            {MOIS.map((nom, index) => (
              <option key={nom} value={index + 1}>
                {nom}
              </option>
            ))}
          </Selecteur>
        )}

        {demandeJour && (
          <Champ
            label="Jour"
            name="jour"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            required
            defaultValue={valeurs?.jour ?? ''}
          />
        )}
      </div>

      <Champ
        label="La date telle qu’on la raconte (facultatif)"
        name="dateTexte"
        maxLength={160}
        defaultValue={valeurs?.dateTexte ?? ''}
        placeholder="l’été de mes dix ans"
        aide="Cette phrase est conservée telle quelle, à côté de la date."
      />
    </fieldset>
  );
}
