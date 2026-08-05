'use client';

import Link from 'next/link';
import type { LieuSitue, PersonneAuLieu } from '@/components/carte/types-carte';
import {
  COULEUR_COTE,
  LIBELLES_COTE,
  LIBELLES_TYPE,
  libelleSiecle,
  sansAccent,
  siecleDe,
} from '@/components/carte/vocabulaire';

type Props = {
  lieu: LieuSitue;
  debut: number;
  fin: number;
  surFermeture: () => void;
};

export function PanneauLieu({ lieu, debut, fin, surFermeture }: Props) {
  const paysChange =
    lieu.pays && lieu.paysActuel && sansAccent(lieu.pays) !== sansAccent(lieu.paysActuel);

  const parSiecle = grouperParSiecle(lieu.personnes);
  const nbSiecles = parSiecle.length;

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl leading-tight">{lieu.nom}</h2>
          {lieu.precision && (
            <p className="mt-0.5 text-sm text-encre-douce">{lieu.precision}</p>
          )}
        </div>
        <button
          type="button"
          onClick={surFermeture}
          aria-label="Fermer la fiche du lieu"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--rayon-petit)] text-encre-douce hover:bg-fond-doux"
        >
          ✕
        </button>
      </div>

      {lieu.photo && (
        <figure className="overflow-hidden rounded-[var(--rayon-petit)] border border-bordure">
          <div className="relative aspect-[4/3] w-full bg-fond-doux">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lieu.photo.url}
              alt={lieu.photo.titre ?? `Une photo du lieu ${lieu.nom}`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          {lieu.photo.titre && (
            <figcaption className="border-t border-bordure bg-fond-doux px-3 py-1.5 text-xs text-encre-douce">
              {lieu.photo.titre}
            </figcaption>
          )}
        </figure>
      )}

      <dl className="flex flex-col gap-3 text-sm">
        <Ligne terme="Libellé des actes">
          <span className="text-encre-douce">{lieu.libelle}</span>
        </Ligne>

        {paysChange ? (
          <Ligne terme="Pays">
            {lieu.pays}
            <span className="block text-encre-tres-douce">
              Aujourd’hui : {lieu.paysActuel}
            </span>
          </Ligne>
        ) : (lieu.paysActuel ?? lieu.pays) ? (
          <Ligne terme="Pays">{lieu.paysActuel ?? lieu.pays}</Ligne>
        ) : null}

        <Ligne terme="Coordonnées">
          <span className="tabular-nums text-encre-douce">
            {formaterCoordonnee(lieu.latitude, 'N', 'S')} ·{' '}
            {formaterCoordonnee(lieu.longitude, 'E', 'O')}
          </span>
        </Ligne>

        <Ligne terme="Présence de la famille">
          {lieu.evenements.length} événement{lieu.evenements.length > 1 ? 's' : ''}
          {lieu.anneeMin !== null && lieu.anneeMax !== null && (
            <span className="block text-encre-tres-douce">
              {lieu.anneeMin === lieu.anneeMax
                ? `en ${lieu.anneeMin}`
                : `de ${lieu.anneeMin} à ${lieu.anneeMax}`}
              {lieu.nbSansDate > 0 &&
                `, plus ${lieu.nbSansDate} sans date connue`}
            </span>
          )}
          <span className="block text-encre-tres-douce">{resumerCotes(lieu.parCote)}</span>
        </Ligne>
      </dl>

      {lieu.note && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            Ce qu’on sait du lieu
          </h3>
          <p className="text-sm leading-relaxed text-encre-douce">{lieu.note}</p>
        </div>
      )}

      {parSiecle.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            Qui est passé par là
            {nbSiecles > 1 && (
              <span className="ml-1 text-encre-tres-douce/80">
                — {nbSiecles} siècle{nbSiecles > 1 ? 's' : ''}
              </span>
            )}
          </h3>
          <div className="flex flex-col gap-3 text-sm">
            {parSiecle.map((groupe) => (
              <section key={groupe.libelle}>
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-encre-douce">
                  {groupe.libelle}
                  <span className="ml-1 text-encre-tres-douce">
                    · {groupe.personnes.length}
                  </span>
                </h4>
                <ul className="flex flex-col gap-1">
                  {groupe.personnes.map((personne) => (
                    <li key={personne.id} className="flex items-baseline gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: COULEUR_COTE[personne.cote] }}
                        aria-hidden
                      />
                      <Link href={`/personne/${personne.id}`} className="lien-discret">
                        {personne.nom}
                      </Link>
                      <span className="text-xs text-encre-tres-douce">
                        {personne.premiereAnnee !== null && (
                          <span className="tabular-nums">
                            dès {personne.premiereAnnee}
                          </span>
                        )}
                        {personne.nombre > 1 && (
                          <>
                            {personne.premiereAnnee !== null && ' · '}
                            {personne.nombre} événements
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}

      {lieu.faits.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            La grande Histoire à cet endroit
          </h3>
          <ul className="flex flex-col gap-2 text-sm">
            {lieu.faits.slice(0, 6).map((fait) => (
              <li key={fait.id} className="flex items-baseline gap-2">
                <span className="w-16 shrink-0 tabular-nums text-encre-tres-douce">
                  {fait.dateTexte}
                </span>
                <Link href={`/histoire/${fait.id}`} className="lien-discret">
                  {fait.titre}
                </Link>
              </li>
            ))}
            {lieu.faits.length > 6 && (
              <li className="text-xs text-encre-tres-douce">
                et {lieu.faits.length - 6} autre{lieu.faits.length - 6 > 1 ? 's' : ''} —{' '}
                <Link href="/histoire" className="lien-discret">
                  voir toute la frise
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      {lieu.nbSouvenirs > 0 && lieu.personnes.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            Souvenirs de famille
          </h3>
          <p className="text-sm text-encre-douce">
            <span className="tabular-nums">{lieu.nbSouvenirs}</span> souvenir
            {lieu.nbSouvenirs > 1 ? 's évoquent' : ' évoque'} explicitement ce lieu.{' '}
            <Link
              href={`/souvenirs?personne=${lieu.personnes[0].id}`}
              className="lien-discret"
            >
              Feuilleter les souvenirs de {lieu.personnes[0].nom}
            </Link>
            .
          </p>
        </div>
      )}

      {lieu.evenements.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            Ce qui s’y est passé
          </h3>
          <ul className="flex flex-col gap-2 text-sm">
            {lieu.evenements.map((evenement) => {
              const horsPeriode =
                evenement.annee !== null && (evenement.annee < debut || evenement.annee > fin);
              return (
                <li key={evenement.id} className={horsPeriode ? 'opacity-45' : undefined}>
                  <p className="text-encre">
                    {LIBELLES_TYPE[evenement.type]}
                    {evenement.personnes.length > 0 && (
                      <>
                        {' '}
                        <span className="text-encre-douce">
                          {evenement.personnes.map((personne, index) => (
                            <span key={personne.id}>
                              {index > 0 && ' et '}
                              <Link href={`/personne/${personne.id}`} className="lien-discret">
                                {personne.nom}
                              </Link>
                            </span>
                          ))}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-encre-tres-douce">
                    {evenement.date || 'date inconnue'}
                    {horsPeriode && ' · hors de la période affichée'}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Ligne({ terme, children }: { terme: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-encre-tres-douce">{terme}</dt>
      <dd className="mt-0.5 text-encre">{children}</dd>
    </div>
  );
}

/** « 35,65° N », « 0,62° O ». */
function formaterCoordonnee(valeur: number, positif: string, negatif: string): string {
  return `${Math.abs(valeur).toFixed(2).replace('.', ',')}° ${valeur >= 0 ? positif : negatif}`;
}

function resumerCotes(parCote: LieuSitue['parCote']): string {
  const morceaux: string[] = [];
  if (parCote.paternelle > 0) morceaux.push(`${LIBELLES_COTE.paternelle} : ${parCote.paternelle}`);
  if (parCote.maternelle > 0) morceaux.push(`${LIBELLES_COTE.maternelle} : ${parCote.maternelle}`);
  if (parCote.commune > 0) morceaux.push(`Sans branche connue : ${parCote.commune}`);
  return morceaux.join(' · ') || 'Personne n’y est rattachée.';
}

/**
 * Range les personnes par siècle du premier événement connu à ce lieu, ordre
 * chronologique. Les personnes sans année tombent dans un groupe « sans date »
 * placé en dernier, pour que le lecteur voie d'abord la trame des générations.
 */
function grouperParSiecle(
  personnes: readonly PersonneAuLieu[]
): { siecle: number | null; libelle: string; personnes: PersonneAuLieu[] }[] {
  const groupes = new Map<number | 'inconnu', PersonneAuLieu[]>();
  for (const personne of personnes) {
    const cle: number | 'inconnu' =
      personne.premiereAnnee === null ? 'inconnu' : siecleDe(personne.premiereAnnee);
    const liste = groupes.get(cle) ?? [];
    liste.push(personne);
    groupes.set(cle, liste);
  }

  return [...groupes.entries()]
    .sort((a, b) => {
      if (a[0] === 'inconnu') return 1;
      if (b[0] === 'inconnu') return -1;
      return (a[0] as number) - (b[0] as number);
    })
    .map(([cle, liste]) => ({
      siecle: cle === 'inconnu' ? null : (cle as number),
      libelle: cle === 'inconnu' ? 'Sans date connue' : libelleSiecle(cle as number),
      personnes: liste,
    }));
}
