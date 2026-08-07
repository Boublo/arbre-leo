'use client';

import type { ComponentProps, ReactNode } from 'react';

/**
 * Les quelques contrôles que `@/components/ui/champs` ne propose pas, accordés
 * aux siens. Tout est natif à dessein : une liste déroulante et une case à
 * cocher du navigateur se manipulent au clavier, à la voix et au doigt sans
 * qu’on ait rien à réécrire — une partie de la famille est âgée.
 */

export function Selecteur({
  label,
  aide,
  children,
  ...props
}: ComponentProps<'select'> & { label: string; aide?: ReactNode }) {
  const id = props.id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-encre">
        {label}
      </label>
      <select
        id={id}
        {...props}
        className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre
                   focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      >
        {children}
      </select>
      {aide && <p className="text-xs text-encre-douce">{aide}</p>}
    </div>
  );
}

export function CaseACocher({
  label,
  aide,
  ...props
}: ComponentProps<'input'> & { label: ReactNode; aide?: ReactNode }) {
  const id = props.id ?? `${props.name}-${String(props.value ?? 'oui')}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm text-encre">
        <input
          id={id}
          type="checkbox"
          {...props}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
        />
        <span>{label}</span>
      </label>
      {aide && <p className="pl-6.5 text-xs text-encre-douce">{aide}</p>}
    </div>
  );
}

/** Un groupe de champs, encadré et nommé : la saisie est longue, elle se lit par blocs. */
export function Bloc({
  id,
  legende,
  aide,
  children,
}: {
  id?: string;
  legende: string;
  aide?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset id={id} className="flex flex-col gap-4 rounded-[var(--rayon)] border border-bordure p-4">
      <legend className="px-1.5 text-sm font-medium text-encre">{legende}</legend>
      {aide && <p className="-mt-1 text-xs text-encre-douce">{aide}</p>}
      {children}
    </fieldset>
  );
}
