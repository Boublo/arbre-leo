'use client';

/**
 * Légende posée en bas de l'arbre.
 *
 * Elle rappelle ce que valent les couleurs, les traits pleins ou en pointillé,
 * le liseré vert des vivants et le fond doré de la personne choisie. Un lecteur
 * qui arrive sur l'arbre doit pouvoir la parcourir sans jamais avoir à demander
 * ce que veut dire tel signe.
 */

export function Legende() {
  return (
    <div className="pointer-events-auto carte flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 text-xs text-encre-douce">
      <Pastille couleur="var(--paternelle)">Côté paternel</Pastille>
      <Pastille couleur="var(--maternelle)">Côté maternel</Pastille>
      <Pastille couleur="var(--commune)">Les deux côtés</Pastille>

      <Separateur />

      <TraitDePreuve mode="plein">Filiation</TraitDePreuve>
      <TraitDePreuve mode="pointille">Implexe : personne déjà posée ailleurs</TraitDePreuve>

      <Separateur />

      <span className="flex items-center gap-1.5">
        <span className="flex h-4 w-7 overflow-hidden rounded-[3px] border border-bordure bg-fond-doux">
          <span className="h-full w-2 bg-paternelle" />
          <span className="flex-1 bg-fond-carte" />
        </span>
        Portrait (photo ou initiale)
      </span>

      <Separateur />

      <span className="flex items-center gap-1.5">
        <span className="h-4 w-7 rounded-[3px] border border-bordure-forte bg-fond-carte" />
        Frère, sœur
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-4 w-7 rounded-[3px] border border-bordure bg-fond-carte opacity-80" />
        Cousin, cousine
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-4 w-7 rounded-[3px] border border-dashed border-bordure-forte bg-fond-carte" />
        Conjoint
      </span>

      <Separateur />

      <span className="flex items-center gap-1.5">
        <svg width={22} height={8} aria-hidden>
          <line x1={1} y1={4} x2={21} y2={4} stroke="var(--or)" strokeWidth={3} opacity={0.85} />
        </svg>
        Couple (union)
      </span>

      <Separateur />

      <span className="flex items-center gap-1.5">
        <span className="grid h-4 w-6 place-items-center rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte">
          <span className="mr-4 h-3 w-1 rounded-[var(--rayon-petit)] bg-succes" />
        </span>
        Vivant
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-6 rounded-[var(--rayon-petit)] bg-accent" />
        Personne choisie
      </span>
    </div>
  );
}

function Pastille({ couleur, children }: { couleur: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: couleur }} />
      {children}
    </span>
  );
}

function TraitDePreuve({
  mode,
  children,
}: {
  mode: 'plein' | 'pointille';
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width={22} height={8} aria-hidden>
        <line
          x1={1}
          y1={4}
          x2={21}
          y2={4}
          stroke={mode === 'pointille' ? 'var(--or)' : 'var(--bordure-forte)'}
          strokeWidth={mode === 'pointille' ? 2 : 1.5}
          strokeDasharray={mode === 'pointille' ? '4 3' : undefined}
        />
      </svg>
      {children}
    </span>
  );
}

function Separateur() {
  return (
    <span aria-hidden className="hidden h-4 w-px bg-bordure sm:inline-block" />
  );
}
