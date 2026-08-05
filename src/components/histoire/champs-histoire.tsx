'use client';

import type { ComponentProps, ReactNode } from 'react';

/**
 * Une liste déroulante accordée aux champs de `@/components/ui/champs`.
 * Volontairement native : c'est ce qui se manipule le mieux au clavier, à la
 * souris et sur un téléphone, y compris pour les lecteurs les plus âgés.
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
