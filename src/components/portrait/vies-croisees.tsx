import Link from 'next/link';
import { coteDesBranches, TON_COTE } from '@/lib/branches';
import { formaterAnneesDeVie, type Portrait } from '@/components/portrait/types';

/**
 * Une ligne dense « Prénom NOM (1886–1961) · métier · lieu ».
 *
 * Pensée pour les listes serrées où chaque personne ne dispose que d’une ligne
 * — chronologies parallèles, ensembles de fratries, listes d’auteurs de
 * souvenirs. La forme reste lisible sur mobile : les compléments passent à la
 * ligne plutôt que de tronquer le nom.
 */
export function VieCourte({
  personne,
  profession,
  lieu,
}: {
  personne: Portrait;
  /** Métier à afficher, si l’on veut préciser autre chose que celui du portrait. */
  profession?: string | null;
  /** Lieu explicite, à défaut on retombe sur le lieu de naissance du portrait. */
  lieu?: string | null;
}) {
  const cote = coteDesBranches(personne.branches);
  const annees = formaterAnneesDeVie(personne);
  const lieuAffiche = lieu ?? personne.lieuNaissance;

  const complements = [profession, lieuAffiche].filter(
    (v): v is string => Boolean(v)
  );

  return (
    <Link
      href={`/personne/${personne.id}`}
      className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-encre-douce transition hover:text-accent"
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 shrink-0 self-center rounded-full"
        style={{ background: TON_COTE[cote] }}
      />
      <span className="font-medium text-encre">{personne.nomComplet}</span>
      {annees && <span className="text-encre-tres-douce">({annees})</span>}
      {complements.map((c, i) => (
        <span key={`${i}-${c}`} className="text-encre-tres-douce">
          · {c}
        </span>
      ))}
    </Link>
  );
}
