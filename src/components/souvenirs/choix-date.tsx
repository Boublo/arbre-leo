'use client';

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
 *
 * En mode contrôlé (via `onChangement`), les valeurs vivent au-dessus, ce qui
 * permet à la prévisualisation vivante d’en tirer parti sans dupliquer l’état.
 */
export function ChoixDate({
  valeurs,
  onChangement,
}: {
  valeurs?: ValeursDate;
  onChangement?: (valeurs: ValeursDate) => void;
}) {
  const precision = valeurs?.precision ?? 'annee';
  const annee = valeurs?.annee ?? null;
  const mois = valeurs?.mois ?? null;
  const jour = valeurs?.jour ?? null;
  const dateTexte = valeurs?.dateTexte ?? null;

  const controle = onChangement !== undefined;

  // `undefined` = « non touché », `null` = « effacé volontairement ». Il faut
  // distinguer les deux : sans cela, on ne pourrait plus vider la date.
  function pousser(patch: Partial<ValeursDate>) {
    const clef = <K extends keyof ValeursDate>(nom: K, courant: ValeursDate[K]): ValeursDate[K] =>
      nom in patch ? (patch[nom] as ValeursDate[K]) : courant;
    onChangement?.({
      precision: clef('precision', precision),
      annee: clef('annee', annee),
      mois: clef('mois', mois),
      jour: clef('jour', jour),
      dateTexte: clef('dateTexte', dateTexte),
    });
  }

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
        onChange={(e) => {
          const nouvellePrecision = e.target.value as PrecisionSaisie;
          if (controle) pousser({ precision: nouvellePrecision });
        }}
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
            value={annee ?? ''}
            onChange={(e) =>
              controle && pousser({ annee: e.target.value === '' ? null : Number(e.target.value) })
            }
            aide={precision === 'decennie' ? '1963 sera rangé dans les années 1960.' : undefined}
          />
        )}

        {demandeMois && (
          <Selecteur
            label="Mois"
            name="mois"
            required
            value={mois ?? ''}
            onChange={(e) =>
              controle && pousser({ mois: e.target.value === '' ? null : Number(e.target.value) })
            }
          >
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
            value={jour ?? ''}
            onChange={(e) =>
              controle && pousser({ jour: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
        )}
      </div>

      <Champ
        label="La date telle qu’on la raconte (facultatif)"
        name="dateTexte"
        maxLength={160}
        value={dateTexte ?? ''}
        onChange={(e) => controle && pousser({ dateTexte: e.target.value === '' ? null : e.target.value })}
        placeholder="l’été de mes dix ans"
        aide="Cette phrase est conservée telle quelle, à côté de la date."
      />
    </fieldset>
  );
}
