'use client';

import { useActionState } from 'react';
import { ajouterFait, type EtatFait } from '@/app/actions/faits';
import { Champ, ZoneTexte, BoutonEnvoi, Alerte } from '@/components/ui/champs';
import { Selecteur } from '@/components/histoire/champs-histoire';
import { PORTEES } from '@/components/histoire/portee';

const PORTEES_ORDONNEES = ['mondial', 'national', 'regional', 'local', 'familial'] as const;

/**
 * Dépôt d'un fait. Seule l'année de début est exigée : mieux vaut un fait un
 * peu nu, versé tant qu'on y pense, qu'une fiche parfaite jamais écrite. Le
 * formulaire reste replié pour ne pas encombrer la lecture.
 */
export function FormulaireFait({ ouvertParDefaut = false }: { ouvertParDefaut?: boolean }) {
  const [etat, action] = useActionState<EtatFait, FormData>(ajouterFait, {});

  return (
    <section id="ajouter" className="carte scroll-mt-6 p-6">
      <details open={ouvertParDefaut} className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden
            className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-bordure
                       text-encre-douce transition group-open:rotate-45"
          >
            +
          </span>
          <span>
            <span className="text-lg" style={{ fontFamily: 'var(--font-titre)' }}>
              Verser un fait dans la grande Histoire
            </span>
            <span className="mt-1 block text-sm text-encre-douce">
              Un événement du monde qui a compté pour la famille, même de loin.
            </span>
          </span>
        </summary>

        <form action={action} className="mt-6 flex flex-col gap-4">
          <Champ
            label="Titre"
            name="titre"
            required
            maxLength={200}
            placeholder="Rapatriement des Français d’Algérie"
            aide="Nommez le fait comme on le nommerait dans un livre d’histoire."
          />

          <Champ
            label="Résumé"
            name="resume"
            maxLength={400}
            placeholder="En quelques mois, plus de huit cent mille personnes traversent la Méditerranée."
            aide="Une phrase, celle qui s’affichera dans la liste."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Champ
              label="Année de début"
              name="anneeDebut"
              type="number"
              inputMode="numeric"
              required
              min={1000}
              max={new Date().getFullYear() + 1}
              placeholder="1962"
              aide="Obligatoire : c’est elle qui range le fait dans sa période."
            />
            <Champ
              label="Année de fin"
              name="anneeFin"
              type="number"
              inputMode="numeric"
              min={1000}
              max={new Date().getFullYear() + 1}
              placeholder="1963"
              aide="À laisser vide si le fait tient en une seule année."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Champ
              label="Lieu"
              name="lieu"
              maxLength={200}
              placeholder="Oran, Algérie"
              aide="Le lieu tel qu’on le nommait à l’époque."
            />

            <Selecteur
              label="Portée"
              name="portee"
              defaultValue="national"
              required
              aide="De quelle hauteur regarde-t-on ce fait ?"
            >
              {PORTEES_ORDONNEES.map((portee) => (
                <option key={portee} value={portee}>
                  {PORTEES[portee].libelle} — {PORTEES[portee].explication}
                </option>
              ))}
            </Selecteur>
          </div>

          <ZoneTexte
            label="Récit"
            name="description"
            maxLength={20000}
            placeholder="Ce qui s’est passé, dans le détail : les causes, le déroulé, ce qu’il en est resté."
            aide="Facultatif. Ce texte n’apparaît que sur la fiche du fait."
          />

          <Champ
            label="Adresse de la source"
            name="sourceUrl"
            type="url"
            maxLength={1000}
            placeholder="https://…"
            aide="Un article, une notice d’archives, une page de musée. Http ou https uniquement."
          />

          {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}
          {etat.message && <Alerte ton="succes">{etat.message}</Alerte>}

          <div className="flex items-center gap-4">
            <BoutonEnvoi enCours="Enregistrement…">Verser ce fait</BoutonEnvoi>
            <p className="text-xs text-encre-tres-douce">
              Vous pourrez ensuite dire qui, dans la famille, l’a traversé.
            </p>
          </div>
        </form>
      </details>
    </section>
  );
}
