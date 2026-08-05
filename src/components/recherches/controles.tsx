'use client';

import { useFormStatus } from 'react-dom';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Deux contrôles que `@/components/ui/champs` ne fournit pas encore : une liste
 * déroulante accordée aux champs de saisie, et un bouton d'envoi assez discret
 * pour tenir dans une fiche de chantier.
 */

export function ListeDeroulante({
  label,
  aide,
  options,
  ...props
}: ComponentProps<'select'> & {
  label: string;
  aide?: ReactNode;
  options: { valeur: string; libelle: string }[];
}) {
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
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.libelle}
          </option>
        ))}
      </select>
      {aide && <p className="text-xs text-encre-douce">{aide}</p>}
    </div>
  );
}

/** Bouton d'envoi de petite taille, qui s'annonce pendant l'envoi. */
export function BoutonDiscret({
  children,
  enCours = 'Envoi…',
  ...props
}: ComponentProps<'button'> & { enCours?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      {...props}
      className="rounded-[var(--rayon-petit)] border border-bordure-forte bg-fond-doux px-2.5 py-1.5
                 text-xs font-medium text-encre transition hover:border-accent hover:text-accent
                 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? enCours : children}
    </button>
  );
}
