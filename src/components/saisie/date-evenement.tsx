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
 * Une date d’acte est rarement une date.
 *
 * « Vers 1755 », « avant la Révolution », « en septembre, l’année du grand
 * hiver » : les registres anciens ne donnent presque jamais un jour. On demande
 * donc d’abord ce que l’on sait — rien, l’année, le mois, la date entière — et
 * les champs se règlent là-dessus. C’est ce choix qui remplit `precision_date`,
 * et le qualificatif qui remplit `qualificatif`.
 *
 * Une date approximative dûment étiquetée vaut infiniment mieux qu’une date
 * inventée : c’est la seule manière de savoir, dix ans plus tard, ce que l’on
 * tenait pour sûr.
 */
export function DateEvenement({
  prefixe,
  legende,
  aide,
  valeurs,
  idLieux,
  aideLieu,
  onChangerAnnee,
  onChangerLieu,
}: {
  prefixe: 'naissance' | 'deces' | 'inhumation';
  legende: string;
  aide?: string;
  valeurs: ValeursDateSaisie;
  /** Identifiant de la liste de suggestions de lieux, partagée par le formulaire. */
  idLieux: string;
  aideLieu?: string;
  onChangerAnnee?: (annee: string) => void;
  onChangerLieu?: (lieu: string) => void;
}) {
  const [precision, setPrecision] = useState<PrecisionSaisie>(valeurs.precision);

  const demandeAnnee = precision !== 'inconnue';
  const demandeMois = precision === 'mois' || precision === 'jour';
  const demandeJour = precision === 'jour';

  return (
    <Bloc legende={legende} aide={aide}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Selecteur
          label="Ce que l’on sait de la date"
          name={`${prefixe}Precision`}
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
            name={`${prefixe}Qualificatif`}
            defaultValue={valeurs.qualificatif}
            aide="« Vers » est une réponse honnête ; une date inventée ne l’est pas."
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
            name={`${prefixe}Annee`}
            type="number"
            inputMode="numeric"
            min={ANNEE_MIN}
            max={anneeMax()}
            defaultValue={valeurs.annee}
            onChange={(event) => onChangerAnnee?.(event.currentTarget.value)}
            placeholder="1887"
          />

          {demandeMois && (
            <Selecteur label="Mois" name={`${prefixe}Mois`} defaultValue={valeurs.mois}>
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
              name={`${prefixe}Jour`}
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              defaultValue={valeurs.jour}
            />
          )}
        </div>
      )}

      <Champ
        label="Lieu"
        name={`${prefixe}Lieu`}
        list={idLieux}
        maxLength={200}
        defaultValue={valeurs.lieu}
        onChange={(event) => onChangerLieu?.(event.currentTarget.value)}
        placeholder="Commune, département, pays"
        aide={
          aideLieu ??
          'Reprenez un lieu déjà proposé quand il convient : c’est ce qui place la personne sur la carte.'
        }
      />
    </Bloc>
  );
}
