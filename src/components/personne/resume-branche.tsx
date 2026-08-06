import type { ResumeBranche } from '@/lib/resume-branche';

/**
 * Bloc sobre sous la frise : ce que l’arbre sait déjà de la branche,
 * sans jargon ni promesse d’IA.
 */
export function ResumeBrancheFiche({ resume }: { resume: ResumeBranche }) {
  return (
    <aside
      aria-labelledby="resume-branche-titre"
      className="apparition-douce rounded-[var(--rayon)] border border-bordure bg-fond-doux/60 px-4 py-4 sm:px-5"
    >
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.09em] text-encre-tres-douce">
        Branche {resume.brancheLibelle}
      </p>
      <h2 id="resume-branche-titre" className="mt-1 text-base font-medium text-encre sm:text-lg">
        {resume.phrase}
      </h2>
      {resume.points.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-encre-douce">
          {resume.points.map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden className="text-or">
                ·
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
