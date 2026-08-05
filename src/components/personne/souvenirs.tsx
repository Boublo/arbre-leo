import Link from 'next/link';
import { Etiquette, Moderation, Rien, Section } from '@/components/personne/blocs';
import type { SouvenirFiche } from '@/components/personne/donnees';

/**
 * Ce que la famille raconte d'elle.
 *
 * Les souvenirs ne sont pas des sources : personne ne demande de preuve à une
 * grand-mère. Ils sont présentés à part des événements, avec le nom de qui les
 * a déposés, parce qu'un récit vaut aussi par la voix qui le porte.
 */
export function SouvenirsPersonne({ souvenirs }: { souvenirs: SouvenirFiche[] }) {
  return (
    <Section titre="Souvenirs de famille" compte={souvenirs.length}>
      {souvenirs.length === 0 ? (
        <Rien>
          Personne n’a encore raconté quoi que ce soit à son sujet. Une anecdote, une odeur de
          cuisine, une phrase qu’elle répétait : tout compte.
        </Rien>
      ) : (
        <ul className="flex flex-col gap-5">
          {souvenirs.map((s) => (
            <li key={s.id} className="border-t border-bordure pt-5 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-base">
                  {/* Le souvenir a sa propre page : c'est là que se trouvent ses
                      photographies en grand et les commentaires qu'il a suscités. */}
                  <Link
                    href={`/souvenirs/${s.id}`}
                    className="transition hover:text-accent"
                  >
                    {s.titre}
                  </Link>
                </h3>
                {s.epingle && <Etiquette ton="or">Épinglé</Etiquette>}
                <Moderation statut={s.statut} />
              </div>

              <p className="mt-0.5 text-xs text-encre-tres-douce">
                {[s.auteur, s.date, s.lieu].filter(Boolean).join(' · ')}
              </p>

              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-encre-douce">
                {s.recit}
              </p>

              <Link
                href={`/souvenirs/${s.id}`}
                className="lien-discret mt-2 inline-block text-xs"
              >
                Ouvrir ce souvenir
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
