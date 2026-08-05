import Link from 'next/link';
import { Preuve, Rien, Section } from '@/components/personne/blocs';
import { LIBELLE_EVENEMENT } from '@/components/personne/vocabulaire';
import type { EvenementFiche } from '@/components/personne/donnees';

/**
 * La vie, dans l'ordre où elle s'est déroulée.
 *
 * Naissance, baptême, métiers, résidences, mariages, décès, inhumation : tout
 * vient de la même table, tout se lit d'un trait. Les dates approximatives
 * (« vers 1840 ») gardent leur prudence, et ce qui n'est pas daté ferme la
 * marche plutôt que de fausser la chronologie.
 */
export function ViePersonne({ evenements }: { evenements: EvenementFiche[] }) {
  return (
    <Section titre="Sa vie" compte={evenements.length}>
      {evenements.length === 0 ? (
        <Rien>
          Aucun événement n’est encore consigné. Une naissance, un métier, une adresse : tout
          est bon à noter.
        </Rien>
      ) : (
        <ol className="ml-1 border-l border-bordure">
          {evenements.map((e) => (
            <LigneEvenement key={e.id} evenement={e} />
          ))}
        </ol>
      )}
    </Section>
  );
}

function LigneEvenement({ evenement: e }: { evenement: EvenementFiche }) {
  const titre = e.type === 'autre' && e.libelle ? e.libelle : LIBELLE_EVENEMENT[e.type];
  const sousTitre = e.libelle && e.libelle !== titre ? e.libelle : null;
  const marquant = e.type === 'naissance' || e.type === 'deces';

  return (
    <li className="relative pb-6 pl-6 last:pb-0">
      <span
        className={`absolute -left-[5.5px] top-2 h-2.5 w-2.5 rounded-full border-2 border-fond-carte ${
          marquant ? 'bg-accent' : 'bg-bordure-forte'
        }`}
        aria-hidden
      />

      <div className="flex flex-wrap items-baseline gap-x-2.5">
        <h3 className="text-base">{titre}</h3>
        <span className="text-sm text-encre-douce">{e.date || 'date inconnue'}</span>
      </div>

      {sousTitre && <p className="mt-0.5 text-sm text-encre">{sousTitre}</p>}
      {e.detail && <p className="mt-0.5 text-sm text-encre">{e.detail}</p>}

      {e.avec && (
        <p className="mt-0.5 text-sm text-encre-douce">
          avec{' '}
          <Link href={`/personne/${e.avec.id}`} className="lien-discret">
            {e.avec.nomComplet}
          </Link>
        </p>
      )}

      {e.lieu && <p className="mt-0.5 text-sm text-encre-douce">{e.lieu}</p>}

      {e.notes && (
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-encre-douce">
          {e.notes}
        </p>
      )}

      {e.niveauPreuve && (
        <div className="mt-1.5">
          <Preuve niveau={e.niveauPreuve} />
        </div>
      )}
    </li>
  );
}
