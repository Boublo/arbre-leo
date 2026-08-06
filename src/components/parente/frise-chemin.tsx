import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';
import { Vignette } from '@/components/portrait/vignette';
import { portraitDePersonne } from '@/components/portrait/types';

/**
 * Frise horizontale des personnes qui relient A à B.
 *
 * La ligne se lit de gauche à droite : la première personne, la remontée
 * générationnelle jusqu'à l'ancêtre commun, puis la redescente jusqu'à la
 * seconde personne. Chaque case est une `<Vignette>`, la même que partout
 * ailleurs — mêmes règles de nommage, mêmes pastilles de côté. L'ancêtre
 * commun est mis en relief par un cadre accentué et une légende explicite.
 *
 * Deux jeux de flèches marquent la direction : « ↗ » tant que l'on monte,
 * « ↘ » dès que l'on descend. La distinction reste utile même pour un lien
 * court, car elle situe visuellement où se trouve le pivot.
 */
export function FriseChemin({
  chemin,
  ancetreCommun,
  donnees,
}: {
  chemin: string[];
  ancetreCommun: string | null;
  donnees: DonneesArbre;
}) {
  const etapes = chemin
    .map((id) => donnees.personnes.get(id))
    .filter((p): p is PersonneArbre => Boolean(p));

  if (etapes.length === 0) return null;

  const indexAncetre = ancetreCommun
    ? etapes.findIndex((p) => p.id === ancetreCommun)
    : -1;

  return (
    <div className="carte overflow-x-auto p-4 sm:p-5">
      <ol className="flex min-w-fit items-center gap-3">
        {etapes.map((personne, index) => (
          <li
            key={`${personne.id}-${index}`}
            className="flex shrink-0 items-center gap-3"
          >
            <Etape
              personne={personne}
              estAncetre={personne.id === ancetreCommun}
            />
            {index < etapes.length - 1 && (
              <Fleche direction={index < indexAncetre ? 'monte' : 'descend'} />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Etape({
  personne,
  estAncetre,
}: {
  personne: PersonneArbre;
  estAncetre: boolean;
}) {
  return (
    <div className="flex w-56 shrink-0 flex-col gap-1">
      {estAncetre && (
        <span className="text-center text-xs font-medium uppercase tracking-wider text-accent">
          Ancêtre commun
        </span>
      )}
      <div
        className={
          estAncetre
            ? 'rounded-[var(--rayon-petit)] ring-2 ring-accent'
            : ''
        }
      >
        <Vignette personne={portraitDePersonne(personne)} />
      </div>
    </div>
  );
}

function Fleche({ direction }: { direction: 'monte' | 'descend' }) {
  const symbole = direction === 'monte' ? '↗' : '↘';
  const legende =
    direction === 'monte'
      ? 'remonte vers l’ancêtre commun'
      : 'redescend vers la seconde personne';
  return (
    <span
      role="img"
      aria-label={legende}
      className="text-2xl text-encre-tres-douce"
    >
      {symbole}
    </span>
  );
}
