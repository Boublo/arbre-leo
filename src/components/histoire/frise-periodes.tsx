import { CarteFait } from '@/components/histoire/carte-fait';
import type { GroupePeriode } from '@/lib/histoire';

/**
 * Les faits rangés par période, du plus ancien au plus récent. Le trait vertical
 * tient lieu de frise : il donne le sens de la lecture sans rien coder en dur.
 */
export function FrisePeriodes({ groupes }: { groupes: GroupePeriode[] }) {
  return (
    <div className="flex flex-col gap-12">
      {groupes.map(({ periode, faits }) => (
        <section
          key={periode.id}
          id={periode.id}
          aria-labelledby={`titre-${periode.id}`}
          className="scroll-mt-6 border-l-2 border-bordure pl-5"
        >
          <header>
            <h2 id={`titre-${periode.id}`} className="text-xl">
              {periode.titre}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-encre-douce">
              {periode.chapeau}
            </p>
          </header>

          <div className="mt-5 flex flex-col gap-4">
            {faits.map((fait) => (
              <CarteFait key={fait.id} fait={fait} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Raccourcis vers les périodes : la page peut devenir longue. */
export function SommairePeriodes({ groupes }: { groupes: GroupePeriode[] }) {
  if (groupes.length < 2) return null;

  return (
    <nav aria-label="Périodes" className="carte px-4 py-3">
      <ul className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
        {groupes.map(({ periode, faits }) => (
          <li key={periode.id}>
            <a
              href={`#${periode.id}`}
              className="inline-flex items-baseline gap-1.5 rounded-[var(--rayon-petit)] px-2 py-1 text-encre-douce transition hover:bg-fond-doux hover:text-encre"
            >
              {periode.titre}
              <span className="text-xs text-encre-tres-douce">{faits.length}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
