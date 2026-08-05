'use client';

import { useActionState, useEffect } from 'react';
import {
  deposerSouvenir,
  modifierSouvenir,
  type EtatSouvenir,
} from '@/app/actions/souvenirs';
import { Champ, ZoneTexte, BoutonEnvoi, Alerte } from '@/components/ui/champs';
import { ChoixDate, type ValeursDate } from '@/components/souvenirs/choix-date';
import { ChoixLieu, type OptionLieu } from '@/components/souvenirs/choix-lieu';
import { ChoixPersonnes, type OptionPersonne } from '@/components/souvenirs/choix-personnes';
import { DepotPhotos, type PhotoDeposee } from '@/components/souvenirs/depot-photos';

export type ValeursSouvenir = ValeursDate & {
  id: string;
  titre: string;
  recit: string;
  lieuId: string | null;
  lieuLibre: string | null;
  personnes: string[];
  photos: PhotoDeposee[];
};

/**
 * Le formulaire de dépôt, qui sert aussi à la reprise.
 *
 * Rien n’est envoyé au serveur qui ne soit revalidé par zod de l’autre côté :
 * ce qui est fait ici l’est pour le confort, pas pour la sécurité.
 */
export function FormulaireSouvenir({
  mode,
  lieux,
  personnes,
  utilisateurId,
  peutDeposerPhotos,
  valeurs,
  onFini,
  onAnnuler,
}: {
  mode: 'depot' | 'reprise';
  lieux: OptionLieu[];
  personnes: OptionPersonne[];
  utilisateurId: string;
  peutDeposerPhotos: boolean;
  valeurs?: ValeursSouvenir;
  onFini?: () => void;
  onAnnuler?: () => void;
}) {
  const [etat, action] = useActionState<EtatSouvenir, FormData>(
    mode === 'depot' ? deposerSouvenir : modifierSouvenir,
    {}
  );

  useEffect(() => {
    if (etat.message) onFini?.();
  }, [etat.message, onFini]);

  return (
    <form action={action} className="flex flex-col gap-6">
      {valeurs && <input type="hidden" name="id" value={valeurs.id} />}

      <Champ
        label="Titre"
        name="titre"
        required
        maxLength={160}
        defaultValue={valeurs?.titre ?? ''}
        placeholder="Le dimanche sous la tonnelle"
        aide="Quelques mots qui donnent envie de lire la suite."
      />

      <ZoneTexte
        label="Le récit"
        name="recit"
        required
        rows={12}
        defaultValue={valeurs?.recit ?? ''}
        placeholder="Racontez comme vous le raconteriez à table."
        aide="C’est le cœur du site : ce qu’aucun acte d’état civil ne dira jamais."
      />

      <ChoixDate valeurs={valeurs} />
      <ChoixLieu lieux={lieux} valeurs={valeurs} />
      <ChoixPersonnes personnes={personnes} valeurs={valeurs?.personnes} />
      <DepotPhotos
        utilisateurId={utilisateurId}
        actif={peutDeposerPhotos}
        valeurs={valeurs?.photos}
      />

      {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}

      <div className="flex flex-wrap items-center gap-3">
        <BoutonEnvoi enCours="Enregistrement…">
          {mode === 'depot' ? 'Déposer ce souvenir' : 'Enregistrer les modifications'}
        </BoutonEnvoi>

        {onAnnuler && (
          <button
            type="button"
            onClick={onAnnuler}
            className="rounded-[var(--rayon-petit)] border border-bordure px-4 py-2.5 text-encre-douce transition hover:bg-fond-doux hover:text-encre"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
