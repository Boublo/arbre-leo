'use client';

import Link from 'next/link';
import type { LieuSitue } from '@/components/carte/types-carte';
import {
  COULEUR_COTE,
  LIBELLES_COTE,
  LIBELLES_TYPE,
  sansAccent,
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

      {lieu.personnes.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            Qui est passé par là
          </h3>
          <ul className="flex flex-col gap-1 text-sm">
            {lieu.personnes.map((personne) => (
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
                  {personne.nombre} événement{personne.nombre > 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>
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
