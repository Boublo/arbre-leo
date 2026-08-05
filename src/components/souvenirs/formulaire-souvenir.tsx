'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
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
import { ApercuSouvenir } from '@/components/souvenirs/apercu-souvenir';
import {
  suggererPeriode,
  type PrecisionSaisie,
} from '@/lib/souvenirs-partage';

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
 * À droite du formulaire, une prévisualisation vivante : chaque frappe se
 * répercute sur ce qu’un lecteur verra du souvenir. Les années citées dans le
 * récit remplissent la date, si elle n’a rien été dit encore.
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

  const [titre, setTitre] = useState(valeurs?.titre ?? '');
  const [recit, setRecit] = useState(valeurs?.recit ?? '');
  const [precision, setPrecision] = useState<PrecisionSaisie>(valeurs?.precision ?? 'annee');
  const [annee, setAnnee] = useState<number | null>(valeurs?.annee ?? null);
  const [mois, setMois] = useState<number | null>(valeurs?.mois ?? null);
  const [jour, setJour] = useState<number | null>(valeurs?.jour ?? null);
  const [dateTexte, setDateTexte] = useState<string | null>(valeurs?.dateTexte ?? null);
  const [lieuId, setLieuId] = useState<string | null>(valeurs?.lieuId ?? null);
  const [lieuLibre, setLieuLibre] = useState<string | null>(valeurs?.lieuLibre ?? null);
  const [personnesChoisies, setPersonnesChoisies] = useState<OptionPersonne[]>(
    () =>
      (valeurs?.personnes ?? [])
        .map((id) => personnes.find((p) => p.id === id))
        .filter((p): p is OptionPersonne => Boolean(p))
  );
  const [photos, setPhotos] = useState<PhotoDeposee[]>(valeurs?.photos ?? []);

  useEffect(() => {
    if (etat.message) onFini?.();
  }, [etat.message, onFini]);

  // Suggestion de période dès qu’on a un récit et qu’on ne s’est pas encore
  // prononcé sur une date. On propose : le formulaire préremplit une seule fois,
  // et l’auteur reste libre de refuser d’un clic. La suggestion est dérivée du
  // récit ; seul le refus est un état propre, pour qu’elle ne se réinvite pas.
  const [suggestionRejetee, setSuggestionRejetee] = useState(false);
  const dateVide = annee === null && (!dateTexte || dateTexte.trim() === '');
  const suggestion = useMemo(
    () => (dateVide && !suggestionRejetee ? suggererPeriode(recit) : null),
    [dateVide, suggestionRejetee, recit]
  );

  function accepterSuggestion() {
    if (!suggestion) return;
    setAnnee(suggestion.annee);
    setPrecision(suggestion.precision);
    setSuggestionRejetee(true);
  }

  const lieuAperçu = useMemo(() => {
    if (lieuId) {
      return lieux.find((l) => l.id === lieuId)?.libelle ?? null;
    }
    return lieuLibre;
  }, [lieuId, lieuLibre, lieux]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
      <form action={action} className="flex flex-col gap-6">
        {valeurs && <input type="hidden" name="id" value={valeurs.id} />}

        <Champ
          label="Titre"
          name="titre"
          required
          maxLength={160}
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Le dimanche sous la tonnelle"
          aide="Quelques mots qui donnent envie de lire la suite."
        />

        <ZoneTexte
          label="Le récit"
          name="recit"
          required
          rows={12}
          value={recit}
          onChange={(e) => setRecit(e.target.value)}
          placeholder="Racontez comme vous le raconteriez à table."
          aide="C’est le cœur du site : ce qu’aucun acte d’état civil ne dira jamais."
        />

        {suggestion && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--rayon-petit)] border border-accent/30 bg-accent-clair p-3 text-sm">
            <p className="text-encre">
              Une année revient dans votre récit :{' '}
              <span className="font-medium">
                {suggestion.precision === 'decennie'
                  ? `années ${Math.floor(suggestion.annee / 10) * 10}`
                  : suggestion.annee}
              </span>
              . Faut-il la retenir ?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={accepterSuggestion}
                className="rounded-[var(--rayon-petit)] bg-accent px-3 py-1.5 text-xs font-medium text-accent-contraste transition hover:brightness-110"
              >
                Oui, retenir
              </button>
              <button
                type="button"
                onClick={() => setSuggestionRejetee(true)}
                className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-1.5 text-xs text-encre-douce transition hover:text-encre"
              >
                Non merci
              </button>
            </div>
          </div>
        )}

        <ChoixDate
          valeurs={{ precision, annee, mois, jour, dateTexte }}
          onChangement={(v) => {
            setPrecision(v.precision);
            setAnnee(v.annee);
            setMois(v.mois);
            setJour(v.jour);
            setDateTexte(v.dateTexte);
          }}
        />

        <ChoixLieu
          lieux={lieux}
          valeurs={{ lieuId, lieuLibre }}
          onChangement={(v) => {
            setLieuId(v.lieuId);
            setLieuLibre(v.lieuLibre);
          }}
        />

        <ChoixPersonnes
          personnes={personnes}
          valeurs={valeurs?.personnes}
          onChangement={setPersonnesChoisies}
        />

        <DepotPhotos
          utilisateurId={utilisateurId}
          actif={peutDeposerPhotos}
          valeurs={valeurs?.photos}
          onChangement={setPhotos}
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

      <ApercuSouvenir
        titre={titre}
        recit={recit}
        precision={precision}
        annee={annee}
        mois={mois}
        jour={jour}
        dateTexte={dateTexte}
        lieu={lieuAperçu}
        personnes={personnesChoisies}
        photos={photos}
      />
    </div>
  );
}
