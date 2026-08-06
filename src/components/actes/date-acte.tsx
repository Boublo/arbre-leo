'use client';

import { useState } from 'react';
import { Champ } from '@/components/ui/champs';
import { Bloc, Selecteur } from '@/components/saisie/champs-saisie';
import {
  ANNEE_MIN,
  MOIS,
  PRECISIONS,
  QUALIFICATIFS,
  anneeMax,
  type PrecisionSaisie,
  type ValeursDateSaisie,
} from '@/lib/saisie-personne';

/**
 * Date telle qu'elle figure sur l'acte.
 *
 * Reprend le même principe que la saisie d'une naissance : on demande d'abord
 * ce que l'on sait, puis les champs se règlent là-dessus.
 */
export function DateActe({
  valeurs,
  idLieux,
}: {
  valeurs?: ValeursDateSaisie;
  idLieux: string;
}) {
  const [precision, setPrecision] = useState<PrecisionSaisie>(valeurs?.precision ?? 'annee');

  const demandeAnnee = precision !== 'inconnue';
  const demandeMois = precision === 'mois' || precision === 'jour';
  const demandeJour = precision === 'jour';

  return (
    <Bloc
      legende="Date de l’acte"
      aide="Reprenez la date telle qu’elle est écrite sur la pièce, même approximative."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Selecteur
          label="Ce que l’on sait de la date"
          name="actePrecision"
          value={precision}
          onChange={(e) => setPrecision(e.target.value as PrecisionSaisie)}
        >
          {PRECISIONS.map((p) => (
            <option key={p.valeur} value={p.valeur}>
              {p.libelle}
            </option>
          ))}
        </Selecteur>

        {demandeAnnee && (
          <Selecteur
            label="Avec quelle certitude"
            name="acteQualificatif"
            defaultValue={valeurs?.qualificatif ?? 'exacte'}
          >
            {QUALIFICATIFS.map((q) => (
              <option key={q.valeur} value={q.valeur}>
                {q.libelle}
              </option>
            ))}
          </Selecteur>
        )}
      </div>

      {demandeAnnee && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Champ
            label="Année"
            name="acteAnnee"
            type="number"
            inputMode="numeric"
            min={ANNEE_MIN}
            max={anneeMax()}
            defaultValue={valeurs?.annee}
            placeholder="1907"
          />

          {demandeMois && (
            <Selecteur label="Mois" name="acteMois" defaultValue={valeurs?.mois}>
              <option value="">Choisir…</option>
              {MOIS.map((nomMois, index) => (
                <option key={nomMois} value={index + 1}>
                  {nomMois}
                </option>
              ))}
            </Selecteur>
          )}

          {demandeJour && (
            <Champ
              label="Jour"
              name="acteJour"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              defaultValue={valeurs?.jour}
            />
          )}
        </div>
      )}

      <Champ
        label="Lieu"
        name="acteLieu"
        list={idLieux}
        maxLength={200}
        defaultValue={valeurs?.lieu}
        placeholder="Commune, département, pays"
        aide="Tel qu’il figure sur l’acte, composants séparés par des virgules."
      />
    </Bloc>
  );
}
