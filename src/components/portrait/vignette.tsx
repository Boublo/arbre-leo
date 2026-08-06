import Link from 'next/link';
import { coteDesBranches, LIBELLE_COTE, TON_COTE } from '@/lib/branches';
import {
  anneesCourtes,
  formaterAnneesDeVie,
  type Portrait,
  type PortraitEnrichi,
} from '@/components/portrait/types';

/**
 * Carte compacte de personne.
 *
 * Sert partout où l’on doit citer quelqu’un tout en ouvrant sa fiche : listes
 * de résultats, colonnes d’entourage, pieds de souvenirs. On n’y met que ce qui
 * permet de la reconnaître — nom, années, commune de naissance — et une
 * pastille du côté paternel ou maternel, pour situer sans lire.
 */
export function Vignette({ personne }: { personne: Portrait }) {
  const cote = coteDesBranches(personne.branches);
  const annees = formaterAnneesDeVie(personne);
  const meta = [annees, personne.lieuNaissance].filter(Boolean).join(' · ');

  return (
    <Link
      href={`/personne/${personne.id}`}
      className="group flex items-start gap-3 rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 transition hover:border-bordure-forte hover:bg-fond-doux"
    >
      <span
        aria-hidden
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: TON_COTE[cote] }}
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-encre">
          {personne.nomComplet}
        </span>
        {personne.surnom && (
          <span className="truncate text-xs italic text-encre-douce">
            {personne.sexe === 'F' ? 'dite' : 'dit'} {personne.surnom}
          </span>
        )}
        <span className="truncate text-xs text-encre-tres-douce">
          {meta || 'Dates inconnues'}
        </span>
        <span className="sr-only">{LIBELLE_COTE[cote]}</span>
      </span>
    </Link>
  );
}

/**
 * Variante étoffée : photo, métier, nombre de souvenirs rattachés.
 *
 * L’URL de la photo doit arriver déjà signée — le bucket est privé, et cette
 * vignette n’a aucune notion de session. Le nombre de souvenirs est fourni de
 * la même façon : à l’appelant de le calculer là où il fait sens.
 */
export function VignetteRiche({ personne }: { personne: PortraitEnrichi }) {
  const cote = coteDesBranches(personne.branches);
  const annees = anneesCourtes(personne);
  const nb = personne.nbSouvenirs ?? 0;
  const initiale = (personne.nomComplet.trim().charAt(0) || '?').toUpperCase();

  const legende = [annees, personne.profession].filter(Boolean).join(' · ');

  return (
    <Link
      href={`/personne/${personne.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--rayon)] border border-bordure bg-fond-carte shadow-[var(--ombre-douce)] transition hover:border-bordure-forte"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-fond-doux">
        {personne.photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire : hors du cache de l'optimiseur d'images. */
          <img
            src={personne.photoUrl}
            alt={`Portrait de ${personne.nomComplet}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full w-full items-center justify-center text-5xl text-encre-tres-douce"
            style={{ fontFamily: 'var(--font-titre)' }}
          >
            {initiale}
          </div>
        )}
        <span
          aria-hidden
          className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-fond-carte"
          style={{ background: TON_COTE[cote] }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-sm font-medium leading-tight text-encre">
          {personne.nomComplet}
        </span>
        {personne.surnom && (
          <span className="text-xs italic text-encre-douce">
            {personne.sexe === 'F' ? 'dite' : 'dit'} {personne.surnom}
          </span>
        )}
        {legende && (
          <span className="text-xs text-encre-tres-douce">{legende}</span>
        )}
        {personne.lieuNaissance && (
          <span className="text-xs text-encre-tres-douce">
            {personne.lieuNaissance}
          </span>
        )}
        {nb > 0 && (
          <span className="mt-1 text-xs text-encre-douce">
            {nb === 1 ? '1 souvenir' : `${nb} souvenirs`}
          </span>
        )}
        <span className="sr-only">{LIBELLE_COTE[cote]}</span>
      </div>
    </Link>
  );
}
