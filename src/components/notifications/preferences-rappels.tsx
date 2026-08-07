'use client';

import { useActionState } from 'react';
import {
  enregistrerPreferencesRappels,
  type EtatPreferencesRappels,
  type PreferencesRappelsLues,
} from '@/app/actions/rappels';

/**
 * Réglages des rappels par courriel pour les anniversaires familiaux.
 */
export function PreferencesRappels({ prefs }: { prefs: PreferencesRappelsLues }) {
  const [etat, action, enCours] = useActionState<EtatPreferencesRappels, FormData>(
    enregistrerPreferencesRappels,
    {}
  );

  return (
    <section
      aria-labelledby="titre-rappels"
      className="carte mt-8 flex flex-col gap-4 p-5"
    >
      <div>
        <h2 id="titre-rappels" className="text-lg text-encre">
          Rappels « Ces jours-ci »
        </h2>
        <p className="mt-1 text-sm text-encre-douce">
          Un courriel discret le matin des anniversaires de naissance et de décès —
          avec le lieu de repos quand on le connaît, pour vous aider à commémorer
          les aïeux. Envoyé à <span className="text-encre">{prefs.email}</span>.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-3 text-sm">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="rappels_email"
            value="1"
            defaultChecked={prefs.rappels_email}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-encre">Recevoir les rappels par courriel</span>
            <span className="mt-0.5 block text-encre-douce">
              Un seul message par jour, seulement s’il y a un anniversaire.
            </span>
          </span>
        </label>

        <fieldset className="ml-7 flex flex-col gap-2 border-l border-bordure pl-4">
          <legend className="sr-only">Types d’anniversaires</legend>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="rappels_naissance"
              value="1"
              defaultChecked={prefs.rappels_naissance}
            />
            Naissances
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="rappels_deces"
              value="1"
              defaultChecked={prefs.rappels_deces}
            />
            Décès (avec lieu de repos si connu)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="rappels_mariage"
              value="1"
              defaultChecked={prefs.rappels_mariage}
            />
            Mariages
          </label>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={enCours}
            className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2 text-sm text-accent-contraste transition hover:opacity-90 disabled:opacity-60"
          >
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {etat.message && (
            <p role="status" className="text-sm text-succes">
              {etat.message}
            </p>
          )}
          {etat.erreur && (
            <p role="alert" className="text-sm text-danger">
              {etat.erreur}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
