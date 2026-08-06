import Link from 'next/link';
import type { Anomalie, DoublonPotentiel, RapportCoherence } from '@/lib/coherence';

/**
 * Tableau de cohérence pour l’administration — lecture seule.
 * Les fusions restent manuelles (RPC réservée aux admins en SQL).
 */

const STYLE_SEVERITE: Record<
  Anomalie['severite'],
  { libelle: string; classe: string }
> = {
  critique: {
    libelle: 'Critique',
    classe: 'border-erreur/40 bg-erreur/10 text-erreur',
  },
  attention: {
    libelle: 'Attention',
    classe: 'border-alerte/40 bg-alerte/10 text-alerte',
  },
  info: {
    libelle: 'Info',
    classe: 'border-bordure bg-fond-doux text-encre-douce',
  },
};

export function CoherenceAdmin({ rapport }: { rapport: RapportCoherence }) {
  const critiques = rapport.anomalies.filter((a) => a.severite === 'critique');
  const attentions = rapport.anomalies.filter((a) => a.severite === 'attention');
  const infos = rapport.anomalies.filter((a) => a.severite === 'info');

  // Les isolées peuvent être nombreuses : on plafonne l’affichage info.
  const anomaliesVisibles = [
    ...critiques,
    ...attentions,
    ...infos.slice(0, 12),
  ];

  return (
    <section aria-labelledby="coherence-titre" className="flex flex-col gap-5">
      <div>
        <h2 id="coherence-titre" className="text-xl">
          Cohérence de l’arbre
        </h2>
        <p className="mt-1 text-sm text-encre-douce">
          Contrôles déterministes (dates, filiations, doublons). Aucune
          correction automatique — chaque ligne renvoie aux fiches concernées.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CarteCompte libelle="Personnes" valeur={rapport.comptes.personnes} />
        <CarteCompte libelle="Avec naissance" valeur={rapport.comptes.avecNaissance} />
        <CarteCompte libelle="Critiques" valeur={critiques.length} accent="erreur" />
        <CarteCompte libelle="Doublons" valeur={rapport.doublons.length} accent="alerte" />
      </ul>

      {anomaliesVisibles.length === 0 ? (
        <p className="carte p-5 text-sm text-encre-douce">
          Aucune anomalie détectée sur les règles actuelles. La base est saine
          pour ce tour de contrôle.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {anomaliesVisibles.map((a) => (
            <li key={a.id}>
              <LigneAnomalie anomalie={a} />
            </li>
          ))}
        </ul>
      )}

      {infos.length > 12 && (
        <p className="text-xs text-encre-tres-douce">
          {infos.length - 12} personne
          {infos.length - 12 > 1 ? 's' : ''} isolée
          {infos.length - 12 > 1 ? 's' : ''} supplémentaire
          {infos.length - 12 > 1 ? 's' : ''} non listée
          {infos.length - 12 > 1 ? 's' : ''} (voir le diagnostic CLI).
        </p>
      )}

      {rapport.doublons.length > 0 && (
        <DoublonsAdmin doublons={rapport.doublons} />
      )}
    </section>
  );
}

function CarteCompte({
  libelle,
  valeur,
  accent,
}: {
  libelle: string;
  valeur: number;
  accent?: 'erreur' | 'alerte';
}) {
  return (
    <li className="carte p-4">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-encre-tres-douce">
        {libelle}
      </p>
      <p
        className={
          accent === 'erreur'
            ? 'mt-1 text-2xl text-erreur'
            : accent === 'alerte'
              ? 'mt-1 text-2xl text-alerte'
              : 'mt-1 text-2xl text-encre'
        }
      >
        {valeur}
      </p>
    </li>
  );
}

function LigneAnomalie({ anomalie }: { anomalie: Anomalie }) {
  const style = STYLE_SEVERITE[anomalie.severite];
  return (
    <article className="carte flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-[var(--rayon-petit)] border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.06em] ${style.classe}`}
          >
            {style.libelle}
          </span>
          <h3 className="text-sm font-medium text-encre">{anomalie.titre}</h3>
        </div>
        <p className="mt-1 text-sm text-encre-douce">{anomalie.detail}</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {anomalie.personneIds.map((id) => (
          <li key={id}>
            <Link
              href={`/personne/${id}`}
              className="text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Ouvrir
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

function DoublonsAdmin({ doublons }: { doublons: DoublonPotentiel[] }) {
  return (
    <div className="flex flex-col gap-3 border-t border-bordure pt-5">
      <h3 className="text-lg">Doublons potentiels</h3>
      <p className="text-sm text-encre-douce">
        Même prénoms, nom et année de naissance. Pour fusionner, utilisez la
        fonction SQL réservée aux administrateurs — aucune fusion depuis
        l’interface pour l’instant.
      </p>
      <ul className="flex flex-col gap-2">
        {doublons.map((d) => (
          <li key={d.cle} className="carte p-4">
            <p className="text-sm font-medium text-encre">
              {d.libelle}{' '}
              <span className="font-normal text-encre-tres-douce">
                · né(e) en {d.anneeNaissance} · {d.personneIds.length} fiches
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-3">
              {d.personneIds.map((id) => (
                <li key={id}>
                  <Link
                    href={`/personne/${id}`}
                    className="text-sm text-accent underline-offset-4 hover:underline"
                  >
                    Fiche {id.slice(0, 8)}…
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
