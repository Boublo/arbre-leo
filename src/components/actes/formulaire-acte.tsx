'use client';

import { useActionState, useId, useState } from 'react';
import { deposerActe, type EtatActe } from '@/app/actions/actes';
import { Alerte, BoutonEnvoi, Champ, ZoneTexte } from '@/components/ui/champs';
import { Selecteur } from '@/components/saisie/champs-saisie';
import { DateActe } from '@/components/actes/date-acte';
import { DepotFichier, type FichierDepose } from '@/components/medias/depot-fichier';
import { NIVEAUX_PREUVE_ACTE, TYPES_ACTE } from '@/lib/actes-partage';

/**
 * Versement d'un acte lu ou reçu, rattaché à une fiche existante.
 *
 * Au minimum : le scan, une transcription, ou une cote. Sans rien de cela,
 * l'acte n'apporterait aucune preuve à l'arbre.
 */
export function FormulaireActe({
  personneId,
  nomPersonne,
  lieux,
  utilisateurId,
  peutDeposerFichiers,
}: {
  personneId: string;
  nomPersonne: string;
  lieux: string[];
  utilisateurId: string;
  peutDeposerFichiers: boolean;
}) {
  const [etat, action] = useActionState<EtatActe, FormData>(deposerActe, {});
  const [typeActe, setTypeActe] = useState<(typeof TYPES_ACTE)[number]['valeur']>('naissance');
  const [fichiers, setFichiers] = useState<FichierDepose[]>([]);
  const idLieux = useId();

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="personneId" value={personneId} />

      <Alerte ton="info">
        Vous versez une pièce pour <strong>{nomPersonne}</strong>. Reprenez ce qui figure sur
        l’acte : date, lieu, cote, et le texte si vous avez le temps de le recopier.
      </Alerte>

      {typeActe === 'mariage' && (
        <Alerte ton="info">
          Un mariage unit deux personnes : pour l’instant, l’acte est rattaché à cette fiche seule.
          Si le conjoint est connu dans l’arbre, un administrateur pourra relier l’événement au
          foyer plus tard.
        </Alerte>
      )}

      <Selecteur
        label="Type d’acte"
        name="typeActe"
        value={typeActe}
        onChange={(e) =>
          setTypeActe(e.target.value as (typeof TYPES_ACTE)[number]['valeur'])
        }
        required
      >
        {TYPES_ACTE.map((t) => (
          <option key={t.valeur} value={t.valeur}>
            {t.libelle}
          </option>
        ))}
      </Selecteur>

      <DateActe idLieux={idLieux} />

      <datalist id={idLieux}>
        {lieux.map((libelle) => (
          <option key={libelle} value={libelle} />
        ))}
      </datalist>

      <fieldset className="flex flex-col gap-4 rounded-[var(--rayon)] border border-bordure p-4">
        <legend className="px-1.5 text-sm font-medium text-encre">Où trouver la pièce</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Champ
            label="Cote ou numéro d’acte"
            name="cote"
            maxLength={200}
            placeholder="Année 1907 n° 2366"
            aide="Tel qu’il figure sur la copie ou au verso du scan."
          />
          <Champ
            label="Dépôt"
            name="depot"
            maxLength={200}
            placeholder="Archives départementales, mairie…"
          />
        </div>
      </fieldset>

      <ZoneTexte
        label="Transcription"
        name="transcription"
        rows={8}
        maxLength={50000}
        placeholder="Recopiez ici le texte de l’acte, mot pour mot si possible…"
        aide="Facultatif si vous joignez le scan, mais précieux pour la recherche et la relecture."
      />

      <Selecteur
        label="Niveau de preuve"
        name="niveauPreuve"
        defaultValue="acte"
        required
        aide="« Acte » signifie que vous avez lu la pièce ou en tenez une copie."
      >
        {NIVEAUX_PREUVE_ACTE.map((n) => (
          <option key={n.valeur} value={n.valeur}>
            {n.libelle}
          </option>
        ))}
      </Selecteur>

      <DepotFichier
        utilisateurId={utilisateurId}
        actif={peutDeposerFichiers}
        valeurs={fichiers}
        onChangement={setFichiers}
      />

      {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}

      <div className="flex flex-wrap items-center gap-4">
        <BoutonEnvoi enCours="Versement…">Verser l’acte</BoutonEnvoi>
        <p className="text-xs text-encre-douce">
          L’acte sera visible sur la fiche, dans la vie et les sources. Les scans restent privés :
          seuls les membres de la famille y accèdent.
        </p>
      </div>
    </form>
  );
}
