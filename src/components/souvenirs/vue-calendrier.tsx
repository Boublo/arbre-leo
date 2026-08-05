import Link from 'next/link';
import { coteDesBranches, TON_COTE, LIBELLE_COTE } from '@/lib/branches';
import { MOIS } from '@/lib/souvenirs-partage';
import type {
  AnniversaireCalendrier,
  CalendrierAnniversaires,
  SouvenirResume,
} from '@/lib/souvenirs';

/**
 * L’année en douze cases.
 *
 * Une famille garde ses dates en tête à la façon d’un calendrier mural : le
 * mois de la grand-mère, l’anniversaire du grand-père, le mariage des parents.
 * Ici la même logique — chaque mois porte ses naissances, ses unions et ses
 * disparitions, plus les souvenirs qu’on a datés à cette période.
 */
export function VueCalendrier({
  souvenirs,
  calendrier,
}: {
  souvenirs: SouvenirResume[];
  calendrier: CalendrierAnniversaires;
}) {
  const souvenirsParMois = new Map<number, SouvenirResume[]>();
  for (const s of souvenirs) {
    if (s.mois === null) continue;
    const liste = souvenirsParMois.get(s.mois) ?? [];
    liste.push(s);
    souvenirsParMois.set(s.mois, liste);
  }

  const sansMois = souvenirs.filter((s) => s.mois === null);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOIS.map((nom, index) => {
          const numero = index + 1;
          const anniv = calendrier.get(numero) ?? [];
          const dedie = souvenirsParMois.get(numero) ?? [];
          return (
            <PavéMois
              key={nom}
              numero={numero}
              nom={nom}
              anniversaires={anniv}
              souvenirs={dedie}
            />
          );
        })}
      </div>

      {sansMois.length > 0 && (
        <section className="carte flex flex-col gap-3 p-5">
          <h3 className="text-sm font-medium uppercase tracking-wider text-encre-tres-douce">
            Sans mois connu
          </h3>
          <p className="text-xs text-encre-tres-douce">
            {sansMois.length} souvenir{sansMois.length > 1 ? 's' : ''} dont on ignore le mois. Il
            {sansMois.length > 1 ? 's restent' : ' reste'} lisible{sansMois.length > 1 ? 's' : ''}{' '}
            sur le mur.
          </p>
          <ul className="flex flex-wrap gap-2">
            {sansMois.slice(0, 12).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/souvenirs/${s.id}`}
                  className="rounded-full border border-bordure bg-fond-doux px-3 py-1 text-xs text-encre-douce transition hover:border-accent hover:text-encre"
                >
                  {s.titre}
                </Link>
              </li>
            ))}
            {sansMois.length > 12 && (
              <li className="px-1 py-1 text-xs text-encre-tres-douce">
                et {sansMois.length - 12} autres
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}

function PavéMois({
  numero,
  nom,
  anniversaires,
  souvenirs,
}: {
  numero: number;
  nom: string;
  anniversaires: AnniversaireCalendrier[];
  souvenirs: SouvenirResume[];
}) {
  const rien = anniversaires.length === 0 && souvenirs.length === 0;

  return (
    <section
      aria-label={nom}
      className="carte flex flex-col gap-3 p-4"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-xl capitalize">{nom}</h3>
        <span className="text-xs tabular-nums text-encre-tres-douce">
          {String(numero).padStart(2, '0')}
        </span>
      </div>

      {rien ? (
        <p className="text-xs text-encre-tres-douce">
          Aucun anniversaire connu ce mois-ci.
        </p>
      ) : (
        <>
          {anniversaires.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {anniversaires.map((a, i) => (
                <li key={`${a.personneId}-${a.type}-${i}`}>
                  <LigneAnniversaire entree={a} />
                </li>
              ))}
            </ul>
          )}

          {souvenirs.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-bordure pt-2">
              <p className="text-[0.7rem] font-medium uppercase tracking-wider text-encre-tres-douce">
                Souvenirs datés de ce mois
              </p>
              <ul className="flex flex-col gap-1">
                {souvenirs.slice(0, 4).map((s) => (
                  <li key={s.id} className="text-xs">
                    <Link
                      href={`/souvenirs/${s.id}`}
                      className="text-encre-douce transition hover:text-accent"
                    >
                      {s.titre}
                    </Link>
                    {s.annee !== null && (
                      <span className="ml-1 text-encre-tres-douce">· {s.annee}</span>
                    )}
                  </li>
                ))}
                {souvenirs.length > 4 && (
                  <li className="text-[0.7rem] text-encre-tres-douce">
                    et {souvenirs.length - 4} autres
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const VERBE: Record<AnniversaireCalendrier['type'], (sexe: string) => string> = {
  naissance: (sexe) => (sexe === 'F' ? 'née' : 'né'),
  deces: (sexe) => (sexe === 'F' ? 'morte' : 'mort'),
  mariage: () => 'mariés',
};

function LigneAnniversaire({ entree }: { entree: AnniversaireCalendrier }) {
  const cote = coteDesBranches(entree.branches);
  const verbe = VERBE[entree.type](entree.sexe);
  const jour = entree.jour ? `le ${entree.jour === 1 ? '1er' : entree.jour}` : null;
  const annee = entree.annee !== null ? `en ${entree.annee}` : null;
  const quand = [jour, annee].filter(Boolean).join(' ');

  return (
    <div className="flex items-start gap-2 text-sm">
      <span
        aria-hidden
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: TON_COTE[cote] }}
      />
      <p className="min-w-0 leading-snug text-encre">
        {entree.type === 'mariage' && entree.autrePersonneId && entree.autreNomComplet ? (
          <>
            <Lien id={entree.personneId} nom={entree.nomComplet} />
            <span className="text-encre-douce"> et </span>
            <Lien id={entree.autrePersonneId} nom={entree.autreNomComplet} />
            <span className="text-encre-douce"> {verbe}</span>
          </>
        ) : (
          <>
            <Lien id={entree.personneId} nom={entree.nomComplet} />
            <span className="text-encre-douce"> {verbe}</span>
          </>
        )}
        {quand && <span className="text-encre-tres-douce"> {quand}</span>}
        <span className="sr-only"> ({LIBELLE_COTE[cote]})</span>
      </p>
    </div>
  );
}

function Lien({ id, nom }: { id: string; nom: string }) {
  return (
    <Link href={`/personne/${id}`} className="text-encre underline decoration-bordure-forte underline-offset-2 transition hover:text-accent">
      {nom}
    </Link>
  );
}
