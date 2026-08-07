'use client';

import { useActionState, useRef } from 'react';
import { ouvrirChantier, type EtatChantier } from '@/app/actions/chantiers';
import { Champ, ZoneTexte, BoutonEnvoi, Alerte } from '@/components/ui/champs';
import { ListeDeroulante } from '@/components/recherches/controles';
import { PistesAOuvrir } from '@/components/recherches/pistes-a-ouvrir';
import { UnionsSansEnfant } from '@/components/recherches/unions-sans-enfant';
import { BRANCHES, COLONNES, PRIORITES, type PisteVue } from '@/components/recherches/vocabulaire';
import { dateMariageLisible, libelleCouple, type UnionSansEnfant } from '@/lib/unions-sans-enfant';

/**
 * L'ouverture d'un chantier, et à côté les pistes qui n'attendent que ça.
 *
 * Les deux vont ensemble : cliquer sur une piste remplit le formulaire du nom
 * de la personne et de sa branche, il ne reste qu'à dire à quelle mairie on
 * écrit. Le remplissage se fait sur les champs eux-mêmes, dans le gestionnaire
 * de clic : React vide le formulaire après chaque envoi, et c'est la valeur
 * renvoyée par l'action qui reprend la main en cas de refus.
 */
export function ZoneOuverture({
  pistes,
  unionsSansEnfant,
  personnes,
  membres,
  peutContribuer,
}: {
  pistes: PisteVue[];
  unionsSansEnfant: UnionSansEnfant[];
  personnes: { id: string; nom: string }[];
  membres: { id: string; nom: string }[];
  peutContribuer: boolean;
}) {
  const [etat, action] = useActionState<EtatChantier, FormData>(ouvrirChantier, {});
  const formulaire = useRef<HTMLFormElement>(null);

  /** Valeur à réafficher : ce qui a été refusé, sinon rien. */
  const saisi = (nom: string, defaut = '') => etat.saisie?.[nom] ?? defaut;

  function amorcerDepuisUnion(union: UnionSansEnfant) {
    const champs = formulaire.current?.elements;
    if (!champs) return;

    const titre = champs.namedItem('titre');
    const objectif = champs.namedItem('objectif');
    const personne = champs.namedItem('personneId');
    const branche = champs.namedItem('branche');

    const couple = libelleCouple(union);
    const date = dateMariageLisible(union);
    const cible = union.conjointA ?? union.conjointB;

    if (titre instanceof HTMLInputElement) {
      titre.value = `Descendance de ${couple}`;
      titre.focus();
      titre.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    if (objectif instanceof HTMLTextAreaElement) {
      objectif.value = `Retrouver les actes de naissance des enfants de ${couple}${
        date ? ` (mariage ${date})` : ''
      }. Commencer par les tables décennales et les registres de l’état civil du lieu du mariage.`;
    }
    if (personne instanceof HTMLSelectElement && cible) personne.value = cible.id;
    if (branche instanceof HTMLSelectElement && union.branches.length === 1) {
      branche.value = union.branches[0];
    }
  }

  function amorcerDepuisPiste(piste: PisteVue) {
    const champs = formulaire.current?.elements;
    if (!champs) return;

    const titre = champs.namedItem('titre');
    const objectif = champs.namedItem('objectif');
    const personne = champs.namedItem('personneId');
    const branche = champs.namedItem('branche');

    if (titre instanceof HTMLInputElement) {
      titre.value = `Documenter ${piste.nom}`;
      titre.focus();
      titre.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    if (objectif instanceof HTMLTextAreaElement && objectif.value === '') {
      objectif.value =
        'Retrouver les actes qui établissent cette personne : naissance, mariage, décès, et le nom de ses parents.';
    }
    if (personne instanceof HTMLSelectElement) personne.value = piste.id;
    if (branche instanceof HTMLSelectElement && piste.branches.length === 1) {
      branche.value = piste.branches[0];
    }
  }

  // Un lecteur voit les pistes — elles font partie de l'histoire de l'enquête —
  // mais l'ouverture d'un chantier lui est fermée, comme en base.
  if (!peutContribuer) {
    return (
      <div className="flex flex-col gap-3 lg:max-w-lg">
        <UnionsSansEnfant unions={unionsSansEnfant} peutContribuer={peutContribuer} />
        <PistesAOuvrir pistes={pistes} />
        <p className="text-sm text-encre-tres-douce">
          Votre compte est en lecture seule. Demandez à un administrateur de la famille de vous
          passer contributeur pour ouvrir un chantier.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="ouvrir-un-chantier" className="carte flex flex-col gap-4 p-5">
        <div>
          <h2 id="ouvrir-un-chantier" className="text-lg">
            Ouvrir un chantier
          </h2>
          <p className="mt-1 text-sm text-encre-douce">
            Une demande d’acte, une branche bloquée, une hypothèse à vérifier. Seul le titre est
            obligatoire : le reste se complète au fil de l’enquête.
          </p>
        </div>

        <form ref={formulaire} action={action} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Champ
              label="Titre"
              name="titre"
              required
              maxLength={160}
              defaultValue={saisi('titre')}
              placeholder="Acte de décès à demander à la mairie"
              aide="Ce qu’il faut obtenir, en une ligne."
            />
          </div>

          <div className="sm:col-span-2">
            <ZoneTexte
              label="Objectif"
              name="objectif"
              maxLength={2000}
              defaultValue={saisi('objectif')}
              placeholder="Nommer les parents, aujourd’hui inconnus, et dater le mariage."
              aide="Ce que ce document doit apprendre à l’arbre."
            />
          </div>

          <Champ
            label="Organisme"
            name="organisme"
            maxLength={200}
            defaultValue={saisi('organisme')}
            placeholder="Mairie — service population, ou archives départementales"
            aide="Celui qu’il faudra relancer."
          />

          <Champ
            label="Référence"
            name="reference"
            maxLength={300}
            defaultValue={saisi('reference')}
            placeholder="Cote du registre, numéro de téléservice, n° de dossier"
          />

          <ListeDeroulante
            label="Personne concernée"
            name="personneId"
            defaultValue={saisi('personneId')}
            options={[
              { valeur: '', libelle: '— aucune en particulier —' },
              ...personnes.map((p) => ({ valeur: p.id, libelle: p.nom })),
            ]}
          />

          <ListeDeroulante
            label="Branche"
            name="branche"
            defaultValue={saisi('branche')}
            options={[
              { valeur: '', libelle: '— les deux —' },
              ...BRANCHES.map((b) => ({ valeur: b.valeur, libelle: b.libelle })),
            ]}
          />

          <ListeDeroulante
            label="Priorité"
            name="priorite"
            defaultValue={saisi('priorite', '3')}
            options={PRIORITES.map((p) => ({
              valeur: String(p.valeur),
              libelle: `${p.libelle} — ${p.aide}`,
            }))}
          />

          <ListeDeroulante
            label="Colonne de départ"
            name="statut"
            defaultValue={saisi('statut', 'a_faire')}
            options={COLONNES.map((c) => ({ valeur: c.statut, libelle: c.libelle }))}
          />

          <Champ
            label="Demande envoyée le"
            name="demandeLe"
            type="date"
            defaultValue={saisi('demandeLe')}
            aide="À renseigner si le courrier est déjà parti."
          />

          {membres.length > 0 && (
            <ListeDeroulante
              label="Suivi par"
              name="assigneA"
              defaultValue={saisi('assigneA')}
              options={[
                { valeur: '', libelle: '— personne pour l’instant —' },
                ...membres.map((m) => ({ valeur: m.id, libelle: m.nom })),
              ]}
            />
          )}

          <div className="sm:col-span-2">
            <ZoneTexte
              label="Blocage"
              name="blocage"
              maxLength={2000}
              defaultValue={saisi('blocage')}
              placeholder="Ce qui empêche d’avancer : acte non communicable, commune introuvable, registre détruit."
            />
          </div>

          {etat.erreur && (
            <div className="sm:col-span-2">
              <Alerte ton="erreur">{etat.erreur}</Alerte>
            </div>
          )}
          {etat.message && (
            <div className="sm:col-span-2">
              <Alerte ton="succes">{etat.message}</Alerte>
            </div>
          )}

          <div className="sm:col-span-2">
            <BoutonEnvoi enCours="Ouverture…">Ouvrir le chantier</BoutonEnvoi>
          </div>
        </form>
      </section>

      <div className="flex flex-col gap-4">
        <UnionsSansEnfant
          unions={unionsSansEnfant}
          onOuvrirChantier={amorcerDepuisUnion}
          peutContribuer={peutContribuer}
        />
        <PistesAOuvrir pistes={pistes} onOuvrir={amorcerDepuisPiste} />
      </div>
    </div>
  );
}
