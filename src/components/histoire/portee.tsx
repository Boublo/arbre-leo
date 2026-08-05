import type { PorteeFait } from '@/lib/types-base';

/**
 * La portée dit de quelle hauteur on regarde : une guerre mondiale et la
 * fermeture d'une usine n'occupent pas la même place dans une vie. Le libellé
 * est toujours écrit — la couleur ne fait que doubler l'information.
 */
export const PORTEES: Record<PorteeFait, { libelle: string; explication: string; teinte: string }> = {
  mondial: {
    libelle: 'Mondial',
    explication: 'Un fait qui a traversé le monde entier.',
    teinte: 'var(--commune)',
  },
  national: {
    libelle: 'National',
    explication: 'Un fait à l’échelle d’un pays.',
    teinte: 'var(--maternelle)',
  },
  regional: {
    libelle: 'Régional',
    explication: 'Un fait à l’échelle d’une province, d’une région ou d’un département.',
    teinte: 'var(--accent)',
  },
  local: {
    libelle: 'Local',
    explication: 'Un fait à l’échelle d’une commune, d’un village ou d’un quartier.',
    teinte: 'var(--alerte)',
  },
  familial: {
    libelle: 'Familial',
    explication: 'Un fait qui n’a compté que pour cette famille-là.',
    teinte: 'var(--or)',
  },
};

export function EtiquettePortee({ portee }: { portee: PorteeFait }) {
  const p = PORTEES[portee];

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{
        color: p.teinte,
        borderColor: `color-mix(in srgb, ${p.teinte} 40%, transparent)`,
        background: `color-mix(in srgb, ${p.teinte} 10%, transparent)`,
      }}
      title={p.explication}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.teinte }} aria-hidden />
      {p.libelle}
    </span>
  );
}

/** Certains faits ne concernent qu'un côté de l'arbre : la couleur de branche le dit. */
export function EtiquetteBranche({ branche }: { branche: string }) {
  const cle = branche.toLowerCase();
  const teinte = cle.includes('pater')
    ? 'var(--paternelle)'
    : cle.includes('mater')
      ? 'var(--maternelle)'
      : 'var(--commune)';

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{
        color: teinte,
        borderColor: `color-mix(in srgb, ${teinte} 40%, transparent)`,
        background: `color-mix(in srgb, ${teinte} 10%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: teinte }} aria-hidden />
      Branche {branche}
    </span>
  );
}
