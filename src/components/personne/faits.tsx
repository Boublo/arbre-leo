import { Etiquette, Rien, Section } from '@/components/personne/blocs';
import { LIBELLE_PORTEE } from '@/components/personne/vocabulaire';
import type { FaitFiche } from '@/components/personne/donnees';

/**
 * La grande Histoire, telle qu'elle l'a traversée.
 *
 * Une date de guerre ou d'exode ne dit rien tant qu'on ne sait pas ce qu'elle a
 * changé pour cette personne-là : c'est l'incidence, notée à la main pour
 * chaque rattachement, qui fait le lien entre un manuel scolaire et une vie.
 */
export function FaitsPersonne({ faits }: { faits: FaitFiche[] }) {
  return (
    <Section titre="Ce que l’Histoire lui a fait traverser" compte={faits.length}>
      {faits.length === 0 ? (
        <Rien>Aucun fait historique ne lui est rattaché pour l’instant.</Rien>
      ) : (
        <ul className="flex flex-col gap-5">
          {faits.map((f) => (
            <li key={f.id} className="border-t border-bordure pt-5 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-base">{f.titre}</h3>
                <span className="text-sm text-encre-douce">{f.periode}</span>
                <Etiquette>{LIBELLE_PORTEE[f.portee]}</Etiquette>
              </div>

              {f.lieu && <p className="mt-0.5 text-xs text-encre-tres-douce">{f.lieu}</p>}

              {f.resume && (
                <p className="mt-2 text-sm leading-relaxed text-encre-douce">{f.resume}</p>
              )}

              {f.incidence && (
                <p className="mt-2 border-l-2 border-accent/40 py-1 pl-3 text-sm leading-relaxed text-encre">
                  {f.incidence}
                </p>
              )}

              {f.sourceUrl && (
                <p className="mt-2">
                  <a
                    href={f.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lien-discret text-sm"
                  >
                    En savoir plus
                  </a>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
