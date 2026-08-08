import Link from 'next/link';
import { GrilleLiens, LienFiche, ListePreuves, Rien, Section } from '@/components/personne/blocs';
import { LIBELLE_EVENEMENT } from '@/components/personne/vocabulaire';
import type { Fiche, FiliationFiche, Foyer, LienPersonne, MembreFratrie } from '@/components/personne/donnees';

/**
 * La parenté, reconstituée depuis les unions et les filiations.
 *
 * La base ne connaît pas la notion de « frère » : elle sait qu'une union a
 * produit plusieurs enfants. Tout se déduit de là, y compris les demi-frères et
 * demi-sœurs, nés d'une autre union d'un des deux parents.
 */
export function ParentePersonne({ fiche }: { fiche: Fiche }) {
  const { parents, filiations, fratrie, foyers, natureFiliation } = fiche;
  const filiationsPossibles = filiations.filter((filiation) => estHypotheseFiliation(filiation.nature));
  const filiationsEtablies = filiations.filter((filiation) => !estHypotheseFiliation(filiation.nature));
  const parentsEtablis = filiationsEtablies.flatMap((filiation) => filiation.parents);
  const vide = parents.length === 0 && fratrie.length === 0 && foyers.length === 0;

  return (
    <Section titre="Sa parenté">
      {vide ? (
        <Rien>
          Personne n’est encore rattaché à cette fiche : ni parents, ni union, ni enfants.{' '}
          <Link href={`/personne/${fiche.personne.id}/modifier#parents`} className="lien-discret">
            Désigner ses parents
          </Link>
        </Rien>
      ) : (
        <div className="flex flex-col gap-6">
          {parents.length === 0 && (
            <p className="text-sm text-encre-douce">
              <Link href={`/personne/${fiche.personne.id}/modifier#parents`} className="lien-discret">
                Désigner ses parents
              </Link>
            </p>
          )}
          {parentsEtablis.length > 0 && (
            <Groupe titre="Parents" precision={natureFiliation && `Filiation ${natureFiliation}`}>
              <GrilleLiens>
                {parentsEtablis.map((p) => (
                  <li key={p.id}>
                    <LienFiche personne={p} />
                  </li>
                ))}
              </GrilleLiens>
            </Groupe>
          )}

          {filiationsPossibles.length > 0 && (
            <Groupe titre="Parents possibles" precision="Hypothèses à confirmer par un acte">
              <div className="flex flex-col gap-4">
                {filiationsPossibles.map((filiation) => (
                  <FiliationPossible key={filiation.id} filiation={filiation} />
                ))}
              </div>
            </Groupe>
          )}

          {filiations.length === 0 && parents.length > 0 && (
            <Groupe titre="Parents" precision={natureFiliation && `Filiation ${natureFiliation}`}>
              <GrilleLiens>
                {parents.map((p) => (
                  <li key={p.id}>
                    <LienFiche personne={p} />
                  </li>
                ))}
              </GrilleLiens>
            </Groupe>
          )}

          {fratrie.length > 0 && (
            <Groupe titre="Frères et sœurs">
              <GrilleLiens>
                {fratrie.map((f) => (
                  <li key={f.personne.id}>
                    <LienFiche personne={f.personne} mention={mentionFratrie(f)} />
                  </li>
                ))}
              </GrilleLiens>
            </Groupe>
          )}

          {foyers.map((foyer) => (
            <FoyerBloc key={foyer.id} foyer={foyer} />
          ))}
        </div>
      )}
    </Section>
  );
}

function FiliationPossible({ filiation }: { filiation: FiliationFiche }) {
  return (
    <div className="rounded-lg border border-bordure bg-fond-doux p-3">
      {filiation.nature && <p className="mb-2 text-xs text-encre-douce">{filiation.nature}</p>}
      <GrilleLiens>
        {filiation.parents.map((parent) => (
          <li key={parent.id}>
            <LienFiche personne={parent} />
          </li>
        ))}
      </GrilleLiens>
    </div>
  );
}

function FoyerBloc({ foyer }: { foyer: Foyer }) {
  const titre = foyer.conjoint ? `Avec ${foyer.conjoint.nomComplet}` : 'Union';

  return (
    <div className="border-t border-bordure pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-base">{titre}</h3>

      {foyer.evenements.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 text-sm text-encre-douce">
          {foyer.evenements.map((e) => (
            <li key={e.id}>
              {LIBELLE_EVENEMENT[e.type]}
              {e.date && ` le ${e.date}`}
              {e.lieu && ` — ${e.lieu}`}
            </li>
          ))}
        </ul>
      )}

      {foyer.conjoint && (
        <div className="mt-3">
          <GrilleLiens>
            <li>
              <LienFiche personne={foyer.conjoint} mention="conjoint" />
            </li>
          </GrilleLiens>
        </div>
      )}

      {foyer.enfants.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            Enfants
          </h4>
          <GrilleLiens>
            {foyer.enfants.map((enfant) => (
              <li key={enfant.personne.id}>
                <LienFiche personne={enfant.personne} mention={enfant.nature ?? undefined} />
              </li>
            ))}
          </GrilleLiens>
        </div>
      )}

      {foyer.notes && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-encre-douce">
          {foyer.notes}
        </p>
      )}

      {foyer.niveauxPreuve.length > 0 && (
        <div className="mt-3">
          <ListePreuves niveaux={foyer.niveauxPreuve} />
        </div>
      )}
    </div>
  );
}

function Groupe({
  titre,
  precision,
  children,
}: {
  titre: string;
  precision?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-base">{titre}</h3>
        {precision && <span className="text-xs text-encre-tres-douce">{precision}</span>}
      </div>
      {children}
    </div>
  );
}

function mentionFratrie({ personne, demi }: MembreFratrie): string | undefined {
  if (!demi) return undefined;
  return motDemi(personne);
}

function estHypotheseFiliation(nature: string | null): boolean {
  return Boolean(nature && /hypoth[eè]se|[àa] confirmer/i.test(nature));
}

function motDemi(personne: LienPersonne): string {
  if (personne.sexe === 'F') return 'demi-sœur';
  if (personne.sexe === 'M') return 'demi-frère';
  return 'demi-fratrie';
}
