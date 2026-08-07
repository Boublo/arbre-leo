'use client';

import Link from 'next/link';
import type { ChoixFamille, ChoixTheme } from '@/lib/recits';

export type FiltreRecitsActif =
  | { type: 'tous' }
  | { type: 'famille'; valeur: string }
  | { type: 'theme'; valeur: string };

/**
 * Sélecteur familles + thèmes pour la liste des récits (audit B8).
 */
export function SelecteurFamille({
  familles,
  themes,
  actif,
}: {
  familles: readonly ChoixFamille[];
  themes: readonly ChoixTheme[];
  actif: FiltreRecitsActif;
}) {
  const totalFamilles = familles.reduce((n, c) => n + c.nombre, 0);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Choisir une famille" className="flex flex-wrap gap-2">
        <Puce
          href="/recits"
          libelle="Toutes les familles"
          nombre={totalFamilles}
          actif={actif.type === 'tous'}
        />
        {familles.map((c) => (
          <Puce
            key={c.patronyme}
            href={`/recits?famille=${encodeURIComponent(c.patronyme)}`}
            libelle={c.patronyme}
            nombre={c.nombre}
            actif={actif.type === 'famille' && actif.valeur === c.patronyme}
          />
        ))}
      </nav>

      {themes.length > 0 && (
        <nav aria-label="Choisir un thème" className="flex flex-wrap gap-2">
          <span className="w-full text-xs uppercase tracking-wider text-encre-tres-douce">
            Thèmes
          </span>
          {themes.map((c) => (
            <Puce
              key={c.theme}
              href={`/recits?theme=${encodeURIComponent(c.theme)}`}
              libelle={c.theme}
              nombre={c.nombre}
              actif={actif.type === 'theme' && actif.valeur === c.theme}
            />
          ))}
        </nav>
      )}
    </div>
  );
}

function Puce({
  href,
  libelle,
  nombre,
  actif,
}: {
  href: string;
  libelle: string;
  nombre: number;
  actif: boolean;
}) {
  const suffixe = nombre === 0 ? '' : nombre === 1 ? ' · 1 récit' : ` · ${nombre} récits`;
  return (
    <Link
      href={href}
      aria-current={actif ? 'page' : undefined}
      className={
        actif
          ? 'rounded-full border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-accent-contraste'
          : 'rounded-full border border-bordure bg-fond-carte px-3 py-1.5 text-sm text-encre-douce transition hover:border-bordure-forte hover:text-encre'
      }
    >
      {libelle}
      {suffixe && <span className="text-xs opacity-80">{suffixe}</span>}
    </Link>
  );
}
