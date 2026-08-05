'use client';

import { useFormStatus } from 'react-dom';
import type { ComponentProps, ReactNode } from 'react';

export function Champ({
  label,
  aide,
  ...props
}: ComponentProps<'input'> & { label: string; aide?: ReactNode }) {
  const id = props.id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-encre">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre
                   placeholder:text-encre-tres-douce
                   focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      />
      {aide && <p className="text-xs text-encre-douce">{aide}</p>}
    </div>
  );
}

export function ZoneTexte({
  label,
  aide,
  ...props
}: ComponentProps<'textarea'> & { label: string; aide?: ReactNode }) {
  const id = props.id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-encre">
        {label}
      </label>
      <textarea
        id={id}
        {...props}
        className="min-h-28 resize-y rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre
                   placeholder:text-encre-tres-douce
                   focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      />
      {aide && <p className="text-xs text-encre-douce">{aide}</p>}
    </div>
  );
}

/** Bouton de formulaire qui se désactive et s'annonce pendant l'envoi. */
export function BoutonEnvoi({
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
      className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste
                 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? enCours : children}
    </button>
  );
}

export function Alerte({ ton, children }: { ton: 'erreur' | 'succes' | 'info'; children: ReactNode }) {
  const styles = {
    erreur: 'border-erreur/40 bg-erreur/10 text-erreur',
    succes: 'border-succes/40 bg-succes/10 text-succes',
    info: 'border-bordure bg-fond-doux text-encre-douce',
  }[ton];

  return (
    <p role={ton === 'erreur' ? 'alert' : 'status'} className={`rounded-[var(--rayon-petit)] border px-3 py-2.5 text-sm ${styles}`}>
      {children}
    </p>
  );
}
