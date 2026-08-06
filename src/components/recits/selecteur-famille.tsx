'use client';

import Link from 'next/link';

/**
 * Sélecteur de famille pour la liste des récits.
 *
 * Une puce par patronyme, plus une « Toutes » qui rend la sélection à zéro.
 * L'état actif est marqué en fond plein — jamais par la seule couleur, le
 * `aria-current` fait foi pour un lecteur d'écran. Les liens portent la seule
 * information dont ils ont besoin : le patronyme choisi passe en `?famille=`.
 */
export function SelecteurFamille({
  choix,
  actif,
}: {
  choix: readonly { patronyme: string; nombre: number }[];
  actif: string | null;
}) {
  return (
    <nav aria-label="Choisir une famille" className="flex flex-wrap gap-2">
      <Puce
        href="/recits"
        libelle="Toutes les familles"
        nombre={choix.reduce((n, c) => n + c.nombre, 0)}
        actif={actif === null}
      />
      {choix.map((c) => (
        <Puce
          key={c.patronyme}
          href={`/recits?famille=${encodeURIComponent(c.patronyme)}`}
          libelle={c.patronyme}
          nombre={c.nombre}
          actif={actif === c.patronyme}
        />
      ))}
    </nav>
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
