import Link from 'next/link';
import { accorderPluriel } from '@/components/chronologie/vocabulaire';
import type { Periode, PorteeLignee } from '@/components/chronologie/lignee';

/**
 * Le rappel de qui l'on suit.
 *
 * Une frise resserrée sans en-tête est un piège : on croit voir toute la
 * famille alors qu'il en manque les trois quarts. Ce bandeau dit donc en
 * toutes lettres sur qui la page est refermée, jusqu'où elle remonte, ce
 * qu'elle contient, et il laisse toujours la porte ouverte — la fiche d'un
 * côté, la famille entière de l'autre.
 */

export type ResumeLignee = {
  personneId: string;
  nom: string;
  /** « 1798 – 1861 », « née en 1798 », ou rien quand aucune date n'est connue. */
  annees: string | null;
  portee: PorteeLignee;
  generationsRemontees: number;
  generationsDescendues: number;
  nombrePersonnes: number;
  nombreEvenements: number;
  nombreFaits: number;
  periode: Periode | null;
};

const PHRASE: Record<PorteeLignee, string> = {
  lignee:
    'Sa vie, celle de tous ses ascendants connus et celle de sa descendance, du plus lointain aïeul retrouvé jusqu’à elle.',
  proche: 'Elle, ses parents, ses frères et sœurs, ses enfants — rien de plus.',
  toute: 'Toute la famille.',
};

export function BandeauLignee({ resume }: { resume: ResumeLignee }) {
  const chiffres = [
    resume.generationsRemontees > 0
      ? accorderPluriel(resume.generationsRemontees, 'génération remontée', 'générations remontées')
      : 'aucun ascendant connu',
    resume.generationsDescendues > 0
      ? accorderPluriel(resume.generationsDescendues, 'génération descendue', 'générations descendues')
      : null,
    accorderPluriel(resume.nombrePersonnes, 'personne suivie', 'personnes suivies'),
    accorderPluriel(resume.nombreEvenements, 'événement', 'événements'),
    resume.nombreFaits > 0
      ? accorderPluriel(resume.nombreFaits, 'repère d’Histoire', 'repères d’Histoire')
      : null,
  ].filter((chiffre): chiffre is string => chiffre !== null);

  return (
    <section
      aria-labelledby="lignee-suivie"
      className="carte border-l-4 border-l-accent px-4 py-4 sm:px-5"
    >
      <p className="text-xs uppercase tracking-wider text-encre-tres-douce">
        Chronologie resserrée
      </p>

      <h2 id="lignee-suivie" className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-2xl">
        {resume.nom}
        {resume.annees && (
          <span className="font-sans text-sm font-normal tabular-nums text-encre-douce">
            {resume.annees}
          </span>
        )}
      </h2>

      <p className="mt-2 max-w-2xl text-sm text-encre-douce">{PHRASE[resume.portee]}</p>

      <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-1.5 text-xs text-encre-douce">
        {chiffres.map((chiffre) => (
          <li
            key={chiffre}
            className="rounded-full border border-bordure bg-fond-doux px-2.5 py-0.5 tabular-nums"
          >
            {chiffre}
          </li>
        ))}
      </ul>

      {resume.periode && (
        <p className="mt-2.5 text-xs text-encre-tres-douce">
          La grande Histoire montrée ici s’arrête à la période que la lignée traverse,
          de {resume.periode.debut} à {resume.periode.fin}.
        </p>
      )}

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href={`/personne/${resume.personneId}`} className="lien-discret">
          Voir sa fiche
        </Link>
        <Link
          href="/chronologie"
          className="rounded-[var(--rayon-petit)] border border-bordure px-3 py-1.5 text-encre-douce transition hover:border-bordure-forte hover:bg-fond-doux hover:text-encre"
        >
          Revenir à la famille entière
        </Link>
      </p>
    </section>
  );
}
