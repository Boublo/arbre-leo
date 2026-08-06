import Link from 'next/link';
import { Preuve, Rien, Section } from '@/components/personne/blocs';
import type { SourceFiche } from '@/components/personne/donnees';

/**
 * D'où vient ce qu'on affirme.
 *
 * Cette famille a passé des heures dans les registres : actes de l'état civil
 * d'Algérie, tables décennales du Marais poitevin, fichier des décès. Une fiche
 * sans ses sources n'est qu'une rumeur bien présentée — d'où la place donnée
 * ici aux transcriptions d'actes, recopiées mot pour mot.
 */
export function SourcesPersonne({
  sources,
  personneId,
  peutVerserActe = false,
}: {
  sources: SourceFiche[];
  personneId?: string;
  peutVerserActe?: boolean;
}) {
  return (
    <Section
      titre="Les sources"
      compte={sources.length}
      aide="Chaque information devrait pouvoir être remontée jusqu’à la pièce qui l’établit."
    >
      {sources.length === 0 ? (
        <Rien>
          Rien n’est encore rattaché à cette fiche. Un acte, une page de registre, même une
          référence notée à la main :{' '}
          {peutVerserActe && personneId ? (
            <>
              <Link href={`/personne/${personneId}/acte/nouveau`} className="lien-discret">
                versez-le ici
              </Link>
              .
            </>
          ) : (
            <>tout se verse ici.</>
          )}
        </Rien>
      ) : (
        <ul className="flex flex-col gap-4">
          {sources.map((s) => (
            <LigneSource key={s.id} source={s} />
          ))}
        </ul>
      )}

      {peutVerserActe && personneId && sources.length > 0 && (
        <p className="mt-3 text-sm">
          <Link href={`/personne/${personneId}/acte/nouveau`} className="lien-discret">
            Verser un acte ou une pièce
          </Link>
        </p>
      )}
    </Section>
  );
}

function LigneSource({ source: s }: { source: SourceFiche }) {
  const reference = [
    s.depot,
    s.cote && `cote ${s.cote}`,
    s.page && `page ${s.page}`,
  ].filter(Boolean);

  return (
    <li className="rounded-[var(--rayon-petit)] border border-bordure p-4">
      <p className="text-xs uppercase tracking-wider text-encre-tres-douce">{s.rattachement}</p>

      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base">{s.titre ?? 'Source sans titre'}</h3>
        {s.niveauPreuve && <Preuve niveau={s.niveauPreuve} />}
      </div>

      {reference.length > 0 && (
        <p className="mt-1 text-sm text-encre-douce">{reference.join(' · ')}</p>
      )}

      {s.url && (
        <p className="mt-1.5">
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="lien-discret text-sm"
          >
            Consulter la pièce en ligne
          </a>
        </p>
      )}

      {s.texte && (
        <figure className="mt-3 border-l-2 border-or/60 bg-fond-doux py-3 pl-4 pr-3">
          <figcaption className="mb-1.5 text-xs uppercase tracking-wider text-encre-tres-douce">
            Transcription
          </figcaption>
          <blockquote
            className="whitespace-pre-line text-sm leading-relaxed text-encre"
            style={{ fontFamily: 'var(--font-titre)' }}
          >
            {s.texte}
          </blockquote>
        </figure>
      )}
    </li>
  );
}
