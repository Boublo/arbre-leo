'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { TypeEvenement } from '@/lib/types-base';
import { EntreeFrise } from '@/components/chronologie/entree-frise';
import {
  FILTRES_INITIAUX,
  FiltresFrise,
  type Filtres,
} from '@/components/chronologie/filtres-frise';
import { MiniFrise, useDecennieVisible } from '@/components/chronologie/mini-frise';
import {
  regrouper,
  regrouperParLieu,
  type GroupeDecennie,
} from '@/components/chronologie/regroupement';
import { TiroirContexte } from '@/components/chronologie/tiroir-contexte';
import { VueParLieux } from '@/components/chronologie/vue-lieux';
import {
  accorderPluriel,
  chiffresRomains,
  estEtaye,
  ORDRE_EVENEMENTS,
  type EntreeChronologie,
} from '@/components/chronologie/vocabulaire';
import type { Portrait } from '@/components/portrait/types';

/**
 * La frise.
 *
 * Elle déroule le temps de la plus ancienne trace connue jusqu'à aujourd'hui,
 * en croisant deux fils : ce qui est arrivé à la famille, et ce qui est arrivé
 * autour d'elle. Tout est déjà chargé et mis en forme par la page ; ici on ne
 * fait que trier, compter et poser les repères — le filtrage est donc immédiat,
 * sans aller-retour avec le serveur.
 *
 * Trois compagnons complètent la lecture : la miniature de chronologie posée
 * en haut, qui donne la vue d'oiseau et laisse sauter d'une décennie à l'autre ;
 * la vue « par lieu » qui replie la frise sur sa géographie ; le tiroir de
 * contextualisation qui, sur un clic, ouvre le voisinage d'un événement
 * — même personne, même lieu, même époque — sans quitter la page.
 */

export function FriseChronologie({
  entrees,
  enTete,
  messageVide,
  portraits,
}: {
  entrees: EntreeChronologie[];
  /**
   * Ce que la page pose sous le titre : le choix de la personne suivie, et le
   * rappel de qui l'on suit. Rendu côté serveur, la frise ne fait que le placer.
   */
  enTete?: ReactNode;
  /** Ce qu'on dit quand la frise est vide dès le départ, filtres au repos. */
  messageVide?: ReactNode;
  /** Portraits des personnes, indexés par identifiant, pour la vignette du tiroir. */
  portraits: ReadonlyMap<string, Portrait>;
}) {
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_INITIAUX);
  const [contextualisee, setContextualisee] = useState<EntreeChronologie | null>(null);

  // Décennie actuellement visible dans la frise principale, observée depuis
  // les repères posés en flux. Sert à animer la miniature à mesure que
  // l'utilisateur fait défiler la page.
  const decennieVisible = useDecennieVisible();

  // Les types réellement présents, dans l'ordre d'une vie plutôt que dans
  // celui de l'alphabet, avec leur nombre : on ne propose pas de décocher
  // un type dont la base ne contient aucun exemple.
  const typesPresents = useMemo(() => {
    const comptes = new Map<TypeEvenement, number>();
    for (const entree of entrees) {
      if (entree.nature !== 'famille' || !entree.type) continue;
      comptes.set(entree.type, (comptes.get(entree.type) ?? 0) + 1);
    }
    return ORDRE_EVENEMENTS.filter((type) => comptes.has(type)).map((type) => ({
      type,
      nombre: comptes.get(type) ?? 0,
    }));
  }, [entrees]);

  const personnesPresentes = useMemo(() => {
    const comptes = new Map<string, { libelle: string; nombre: number }>();
    for (const entree of entrees) {
      for (const personne of entree.personnes) {
        const bloc = comptes.get(personne.id);
        if (bloc) bloc.nombre += 1;
        else comptes.set(personne.id, { libelle: personne.nom, nombre: 1 });
      }
    }
    return [...comptes.entries()]
      .map(([id, { libelle, nombre }]) => ({ id, libelle, nombre }))
      .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
  }, [entrees]);

  const lieuxPresents = useMemo(() => {
    const comptes = new Map<string, number>();
    for (const entree of entrees) {
      if (!entree.lieu) continue;
      comptes.set(entree.lieu, (comptes.get(entree.lieu) ?? 0) + 1);
    }
    return [...comptes.entries()]
      .map(([libelle, nombre]) => ({ libelle, nombre }))
      .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
  }, [entrees]);

  const nombreMarquants = useMemo(
    () => entrees.reduce((n, e) => (e.remarquable ? n + 1 : n), 0),
    [entrees]
  );

  const retenues = useMemo(
    () =>
      entrees.filter((entree) => {
        if (entree.nature === 'histoire' && filtres.masquerHistoire) return false;
        if (entree.type && filtres.typesEcartes.includes(entree.type)) return false;

        // Une entrée sans côté connu, ou commune aux deux, reste visible :
        // la masquer reviendrait à faire disparaître ce qu'on ignore.
        if (filtres.cote !== 'toutes' && entree.cote && entree.cote !== 'commune') {
          if (entree.cote !== filtres.cote) return false;
        }

        if (filtres.personneId !== null) {
          if (!entree.personnes.some((p) => p.id === filtres.personneId)) return false;
        }

        if (filtres.lieu !== null && entree.lieu !== filtres.lieu) return false;

        if (filtres.marquants && entree.remarquable === null) return false;

        if (
          filtres.seulementEtayes &&
          entree.nature === 'famille' &&
          !estEtaye(entree.niveauPreuve)
        ) {
          return false;
        }
        return true;
      }),
    [entrees, filtres]
  );

  const { siecles, sansAnnee } = useMemo(() => regrouper(retenues), [retenues]);
  const vueLieux = useMemo(() => regrouperParLieu(retenues), [retenues]);

  const comptes = useMemo(
    () => ({
      affichees: retenues.length,
      total: entrees.length,
      famille: retenues.filter((e) => e.nature === 'famille').length,
      histoire: retenues.filter((e) => e.nature === 'histoire').length,
    }),
    [retenues, entrees.length]
  );

  const premiereAnnee = siecles[0]?.premiereAnnee ?? null;
  const derniereAnnee = siecles.at(-1)?.derniereAnnee ?? null;

  const cibler = useCallback((decennie: number) => {
    const cible = document.getElementById(`decennie-${decennie}`);
    if (cible) {
      cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Décennie sans trace dans la sélection courante : on se cale sur le
      // repère de siècle le plus proche, pour ne jamais rester bloqué.
      const siecle = Math.floor(decennie / 100) + 1;
      document.getElementById(`siecle-${siecle}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const surContextualiser = useCallback((entree: EntreeChronologie) => {
    setContextualisee(entree);
  }, []);

  return (
    <>
      <header className="mx-auto w-full max-w-4xl px-4 pt-8 pb-5 sm:px-6">
        <h1 className="text-3xl">Chronologie</h1>
        <p className="mt-2 max-w-2xl text-encre-douce">
          Le temps de la famille et celui du monde, sur la même colonne.
          {premiereAnnee !== null && derniereAnnee !== null && (
            <> De {premiereAnnee} à {derniereAnnee}.</>
          )}{' '}
          Les naissances, mariages et départs sont posés sur des cartes pleines ;
          la grande Histoire, en retrait, sur fond discret. Un liseré d’or
          signale les faits adossés à un acte.
        </p>

        {enTete && <div className="mt-5 flex flex-col gap-4">{enTete}</div>}

        {/* La miniature ne parle qu'en années : elle est retirée en vue par
            lieu, où le temps n'est plus l'axe premier de lecture. */}
        {filtres.vue === 'chronologique' && (
          <div className="mt-5">
            <MiniFrise
              entrees={retenues}
              cibleAnnee={decennieVisible ?? premiereAnnee}
              onCibler={cibler}
            />
          </div>
        )}
      </header>

      <FiltresFrise
        filtres={filtres}
        surChangement={setFiltres}
        typesPresents={typesPresents}
        comptes={comptes}
        siecles={siecles.map((s) => s.siecle)}
        nombreSansAnnee={sansAnnee.length}
        personnesPresentes={personnesPresentes}
        lieuxPresents={lieuxPresents}
        nombreMarquants={nombreMarquants}
      />

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        {comptes.affichees === 0 ? (
          <p className="carte mt-10 px-5 py-8 text-center text-encre-douce">
            {comptes.total === 0
              ? // Rien à montrer avant même d'avoir touché aux réglages : c'est la
                // page qui sait pourquoi — base vide, ou lignée sans aucune date.
                (messageVide ??
                  'Aucun événement n’est encore enregistré. La frise se remplira dès que les premières dates seront versées dans la base.')
              : 'Aucune entrée ne répond à ces réglages. Rétablissez un type d’événement ou revenez aux deux branches.'}
          </p>
        ) : filtres.vue === 'lieux' ? (
          <VueParLieux vue={vueLieux} onContextualiser={surContextualiser} />
        ) : (
          <>
            {siecles.map((bloc) => (
              <section key={bloc.siecle} id={`siecle-${bloc.siecle}`} className="scroll-mt-36">
                {/* Le repère de siècle : une bande pleine, pour qu'on sache
                    toujours de quel monde on parle en descendant la page. */}
                <h2 className="mt-12 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[var(--rayon)] border border-bordure-forte bg-fond-doux px-4 py-3 text-2xl">
                  <span>
                    {chiffresRomains(bloc.siecle)}
                    <sup>e</sup> siècle
                  </span>
                  <span className="font-sans text-sm font-normal tabular-nums text-encre-tres-douce">
                    {bloc.premiereAnnee} – {bloc.derniereAnnee} ·{' '}
                    {accorderPluriel(bloc.total, 'entrée', 'entrées')}
                  </span>
                </h2>

                {bloc.decennies.map((decennie, rang) => (
                  <Decennie
                    key={decennie.decennie}
                    decennie={decennie}
                    premiere={rang === 0}
                    onContextualiser={surContextualiser}
                  />
                ))}
              </section>
            ))}

            {sansAnnee.length > 0 && (
              <section id="sans-annee" className="scroll-mt-36">
                <h2 className="mt-14 rounded-[var(--rayon)] border border-dashed border-bordure-forte bg-fond-doux px-4 py-3 text-2xl">
                  Événements dont l’année reste inconnue
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-encre-douce">
                  {accorderPluriel(sansAnnee.length, 'entrée n’a', 'entrées n’ont')} pas encore de
                  date. Elles sont rassemblées ici plutôt que rangées au hasard : un acte, un
                  recensement ou un souvenir finira par les situer.
                </p>
                <ol className="mt-5">
                  {sansAnnee.map((entree) => (
                    <EntreeFrise
                      key={entree.cle}
                      entree={entree}
                      onContextualiser={surContextualiser}
                    />
                  ))}
                </ol>
              </section>
            )}
          </>
        )}
      </div>

      <TiroirContexte
        entree={contextualisee}
        toutes={retenues}
        portraits={portraits}
        ouvert={contextualisee !== null}
        onFermer={() => setContextualisee(null)}
      />
    </>
  );
}

function Decennie({
  decennie,
  premiere,
  onContextualiser,
}: {
  decennie: GroupeDecennie;
  premiere: boolean;
  onContextualiser: (entree: EntreeChronologie) => void;
}) {
  return (
    <section
      id={`decennie-${decennie.decennie}`}
      data-decennie={decennie.decennie}
      className="mt-6 scroll-mt-36"
    >
      {/* Un silence de plusieurs décennies se dit, plutôt que de se traduire
          par un simple saut de numéro que personne ne remarque. */}
      {!premiere && decennie.ecart > 0 && (
        <p className="my-5 flex items-center gap-3 text-xs text-encre-tres-douce">
          <span className="flex-1 border-t border-dashed border-bordure" aria-hidden />
          {accorderPluriel(decennie.ecart * 10, 'année sans trace', 'années sans trace')}
          <span className="flex-1 border-t border-dashed border-bordure" aria-hidden />
        </p>
      )}

      <h3 className="mb-3 flex items-center gap-x-2.5 text-lg text-encre-douce">
        <span className="tabular-nums">Années {decennie.decennie}</span>
        <span className="font-sans text-xs font-normal tabular-nums text-encre-tres-douce">
          {accorderPluriel(decennie.total, 'entrée', 'entrées')}
        </span>
        <span className="h-px flex-1 bg-bordure" aria-hidden />
      </h3>

      {decennie.annees.map((annee) => (
        <div
          key={annee.annee}
          className="grid grid-cols-[2.75rem_1fr] items-start sm:grid-cols-[3.75rem_1fr]"
        >
          <h4 className="pr-3 pt-0.5 text-right text-sm font-medium tabular-nums text-encre-douce">
            {annee.annee}
          </h4>
          <ol className="min-w-0">
            {annee.entrees.map((entree) => (
              <EntreeFrise
                key={entree.cle}
                entree={entree}
                onContextualiser={onContextualiser}
              />
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
