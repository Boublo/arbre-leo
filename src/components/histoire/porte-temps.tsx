import Link from 'next/link';
import type { GenerationAscendance } from '@/lib/generations';

/** Porte vers la chronologie existante, bornée par les années réellement connues. */
export function PorteTemps({
  personneId,
  generations,
}: {
  personneId: string;
  generations: GenerationAscendance[];
}) {
  const annees = generations.flatMap((generation) =>
    generation.personnes.flatMap((personne) => [personne.naissance?.annee, personne.deces?.annee])
  ).filter((annee): annee is number => annee !== null && annee !== undefined);

  if (annees.length === 0) return null;
  const debut = Math.min(...annees);
  const fin = Math.max(...annees);

  return (
    <aside className="mb-6 rounded-[var(--rayon)] border border-accent/30 bg-accent-clair p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
        Voyage dans le temps
      </p>
      <h2 className="mt-1 text-xl text-encre">De {debut} à {fin}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-encre-douce">
        Cette période est calculée à partir des dates connues de cette ascendance. La chronologie y ajoute les événements familiaux et le contexte historique sourcé.
      </p>
      <Link
        href={`/chronologie?personne=${encodeURIComponent(personneId)}&portee=lignee`}
        className="mt-3 inline-block rounded-[var(--rayon-petit)] bg-accent px-3 py-2 text-sm font-medium text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Ouvrir la chronologie de la lignée
      </Link>
    </aside>
  );
}
