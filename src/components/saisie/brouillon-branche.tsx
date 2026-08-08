'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type EtatBrouillon = {
  foyer: boolean;
  enfants: boolean;
  relecture: boolean;
  notes: string;
};

const ETAT_VIDE: EtatBrouillon = { foyer: false, enfants: false, relecture: false, notes: '' };

/**
 * Brouillon volontairement limité à l’onglet actif : aucun contenu n’est
 * envoyé au serveur et il n’existe aucune écriture groupée à partir de lui.
 */
export function BrouillonBranche({ personneId }: { personneId: string }) {
  const [etat, setEtat] = useState<EtatBrouillon>(ETAT_VIDE);
  const [pret, setPret] = useState(false);
  const cle = `arbre:branche-session:${personneId}`;

  useEffect(() => {
    let annule = false;
    // Laisse le premier rendu se stabiliser avant de lire le stockage du navigateur.
    const temporisation = window.setTimeout(() => {
      if (annule) return;
      try {
        const brut = sessionStorage.getItem(cle);
        if (brut) {
          const lu = JSON.parse(brut) as Partial<EtatBrouillon>;
          setEtat({
            foyer: lu.foyer === true,
            enfants: lu.enfants === true,
            relecture: lu.relecture === true,
            notes: typeof lu.notes === 'string' ? lu.notes.slice(0, 2000) : '',
          });
        }
      } catch {
        // Navigateur privé ou contenu ancien invalide : le brouillon reste vide.
      } finally {
        setPret(true);
      }
    }, 0);
    return () => {
      annule = true;
      window.clearTimeout(temporisation);
    };
  }, [cle]);

  useEffect(() => {
    if (!pret) return;
    try {
      sessionStorage.setItem(cle, JSON.stringify(etat));
    } catch {
      // La page demeure utilisable sans stockage de session.
    }
  }, [cle, etat, pret]);

  function basculer(cleEtape: 'foyer' | 'enfants' | 'relecture') {
    setEtat((actuel) => ({ ...actuel, [cleEtape]: !actuel[cleEtape] }));
  }

  function effacer() {
    setEtat(ETAT_VIDE);
    try {
      sessionStorage.removeItem(cle);
    } catch {
      // Le nouvel état vide reste affiché même si le stockage est indisponible.
    }
  }

  const terminees = [etat.foyer, etat.enfants, etat.relecture].filter(Boolean).length;

  return (
    <section aria-labelledby="brouillon-titre" className="carte mt-8 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 id="brouillon-titre" className="text-xl">Brouillon de cet onglet</h2>
          <p className="mt-1 text-sm leading-6 text-encre-douce">
            {terminees}/3 étapes relues. Ce repère reste dans cet onglet seulement : il ne crée ni
            personne, ni foyer, ni lien familial.
          </p>
        </div>
        <button type="button" onClick={effacer} className="lien-discret text-sm">
          Effacer ce brouillon
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Etape cochee={etat.foyer} onChanger={() => basculer('foyer')}>
          Le foyer et le ou les adultes concernés ont été vérifiés.
        </Etape>
        <Etape cochee={etat.enfants} onChanger={() => basculer('enfants')}>
          Les enfants à créer ou rattacher ont été distingués des homonymes possibles.
        </Etape>
        <Etape cochee={etat.relecture} onChanger={() => basculer('relecture')}>
          Les dates, sources et incertitudes ont été relues avant chaque enregistrement.
        </Etape>
      </div>

      <label className="mt-5 block text-sm font-medium text-encre" htmlFor="notes-branche">
        Notes de préparation (facultatif)
        <textarea
          id="notes-branche"
          value={etat.notes}
          onChange={(evenement) => setEtat((actuel) => ({ ...actuel, notes: evenement.target.value.slice(0, 2000) }))}
          rows={4}
          maxLength={2000}
          placeholder="Par exemple : acte à relire, homonyme à comparer, date approximative…"
          className="mt-2 w-full rounded-[var(--rayon-petit)] border border-bordure bg-fond px-3 py-2 font-normal leading-6 text-encre"
        />
      </label>
      <p className="mt-2 text-xs leading-5 text-encre-tres-douce">
        Évitez d’y recopier un acte ou des informations sensibles : ce texte n’est pas enregistré dans l’arbre et disparaît si vous effacez les données de cet onglet.
      </p>
    </section>
  );
}

function Etape({ cochee, onChanger, children }: { cochee: boolean; onChanger: () => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--rayon-petit)] border border-bordure p-3 text-sm leading-6 text-encre">
      <input type="checkbox" checked={cochee} onChange={onChanger} className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" />
      <span>{children}</span>
    </label>
  );
}
