'use client';

import { useActionState, useState } from 'react';
import {
  creerRecit,
  modifierRecit,
  type EtatRecit,
} from '@/app/actions/recits';
import { Alerte, BoutonEnvoi, Champ, ZoneTexte } from '@/components/ui/champs';
import { ChoixPersonnesRecit } from '@/components/recits/choix-personnes';
import type { PersonneCitee } from '@/lib/recits';

export type ValeursRecit = {
  id: string;
  patronyme: string | null;
  theme: string | null;
  branche: string | null;
  titre: string;
  chapeau: string | null;
  corps: string;
  anneeDebut: number | null;
  anneeFin: number | null;
  personnes: string[];
};

/**
 * Formulaire d'écriture d'un récit — pose et modifie.
 *
 * On demande d'abord la famille (patronyme choisi) OU un thème libre : les
 * deux ne se cumulent pas, la contrainte est écrite en clair. Puis titre,
 * chapeau, période et corps. La saisie du corps est délibérément une simple
 * zone de texte : le Markdown est rendu à la lecture, pas ici.
 */
export function FormulaireRecit({
  mode,
  patronymes,
  personnes,
  valeurs,
}: {
  mode: 'creation' | 'modification';
  patronymes: readonly string[];
  personnes: PersonneCitee[];
  valeurs?: ValeursRecit;
}) {
  const [etat, action] = useActionState<EtatRecit, FormData>(
    mode === 'creation' ? creerRecit : modifierRecit,
    {}
  );

  const [rattachement, setRattachement] = useState<'famille' | 'theme'>(
    valeurs?.theme && !valeurs.patronyme ? 'theme' : 'famille'
  );
  const [patronyme, setPatronyme] = useState<string>(valeurs?.patronyme ?? '');
  const [theme, setTheme] = useState<string>(valeurs?.theme ?? '');

  return (
    <form action={action} className="flex flex-col gap-6">
      {valeurs && <input type="hidden" name="id" value={valeurs.id} />}

      <fieldset className="flex flex-col gap-3 rounded-[var(--rayon)] border border-bordure p-4">
        <legend className="px-1.5 text-sm font-medium text-encre">À quoi le rattacher ?</legend>

        <div role="radiogroup" className="flex flex-wrap gap-2">
          <ChoixRattachement
            valeur="famille"
            libelle="Une famille"
            actif={rattachement === 'famille'}
            onChoix={() => setRattachement('famille')}
          />
          <ChoixRattachement
            valeur="theme"
            libelle="Un thème libre"
            actif={rattachement === 'theme'}
            onChoix={() => setRattachement('theme')}
          />
        </div>

        {rattachement === 'famille' ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="patronyme" className="text-sm font-medium text-encre">
              Famille (patronyme)
            </label>
            <select
              id="patronyme"
              name="patronyme"
              required
              value={patronyme}
              onChange={(e) => setPatronyme(e.target.value)}
              className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre
                         focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            >
              <option value="">— Choisir —</option>
              {patronymes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <p className="text-xs text-encre-douce">
              Choisissez le nom qui coiffe la branche : le récit se rangera parmi les autres
              de cette famille.
            </p>
            <input type="hidden" name="theme" value="" />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="theme" className="text-sm font-medium text-encre">
              Thème
            </label>
            <input
              id="theme"
              name="theme"
              type="text"
              required
              maxLength={120}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="La maison de vacances, les hivers en Oranie, le métier de meunier…"
              className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre
                         placeholder:text-encre-tres-douce
                         focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <p className="text-xs text-encre-douce">
              Un fil qui traverse la famille sans se rattacher à un patronyme précis.
            </p>
            <input type="hidden" name="patronyme" value="" />
          </div>
        )}
      </fieldset>

      <Champ
        label="Titre"
        name="titre"
        required
        maxLength={160}
        defaultValue={valeurs?.titre ?? ''}
        placeholder="La longue traversée depuis Oran"
        aide="La phrase que la famille lira en premier."
      />

      <ZoneTexte
        label="Chapeau"
        name="chapeau"
        rows={3}
        maxLength={400}
        defaultValue={valeurs?.chapeau ?? ''}
        placeholder="Deux ou trois lignes qui posent le décor."
        aide="Facultatif : sert de résumé en tête de récit et sous la carte."
      />

      <ZoneTexte
        label="Corps du récit"
        name="corps"
        required
        rows={18}
        defaultValue={valeurs?.corps ?? ''}
        placeholder={
          '# Titre de partie\n\nUn premier paragraphe.\n\n## Sous-titre\n\nDu texte, un **mot marqué** et un *autre en italique*.\n\n- une liste\n- si nécessaire'
        }
        aide="Markdown accepté : # titre, ## sous-titre, **gras**, *italique*, - listes, lignes vides entre paragraphes."
      />

      <fieldset className="flex flex-col gap-3 rounded-[var(--rayon)] border border-bordure p-4">
        <legend className="px-1.5 text-sm font-medium text-encre">Période</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ
            label="Année de début"
            name="anneeDebut"
            type="number"
            inputMode="numeric"
            min={1500}
            max={new Date().getFullYear()}
            defaultValue={valeurs?.anneeDebut ?? ''}
            placeholder="1930"
          />
          <Champ
            label="Année de fin"
            name="anneeFin"
            type="number"
            inputMode="numeric"
            min={1500}
            max={new Date().getFullYear()}
            defaultValue={valeurs?.anneeFin ?? ''}
            placeholder="1965"
          />
        </div>
        <p className="text-xs text-encre-douce">
          Facultatif. Une seule des deux suffit à situer le récit dans le temps.
        </p>
      </fieldset>

      <ChoixPersonnesRecit personnes={personnes} valeurs={valeurs?.personnes} />

      {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}
      {etat.message && <Alerte ton="succes">{etat.message}</Alerte>}

      <div className="flex flex-wrap items-center gap-3">
        <BoutonEnvoi enCours="Enregistrement…">
          {mode === 'creation' ? 'Publier ce récit' : 'Enregistrer les modifications'}
        </BoutonEnvoi>
      </div>
    </form>
  );
}

function ChoixRattachement({
  valeur,
  libelle,
  actif,
  onChoix,
}: {
  valeur: string;
  libelle: string;
  actif: boolean;
  onChoix: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={actif}
      onClick={onChoix}
      className={
        actif
          ? 'rounded-full border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-accent-contraste'
          : 'rounded-full border border-bordure bg-fond-carte px-3 py-1.5 text-sm text-encre-douce transition hover:border-bordure-forte hover:text-encre'
      }
    >
      <span className="sr-only">{valeur}</span>
      {libelle}
    </button>
  );
}
