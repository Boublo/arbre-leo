'use client';

import { useFormStatus } from 'react-dom';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Les quelques contrôles que `@/components/ui/champs` ne fournit pas encore :
 * une liste déroulante, un bouton de second plan, une étiquette d'état.
 *
 * Chaque champ reçoit un `id` explicite : plusieurs formulaires cohabitent sur
 * la page d'administration, et deux libellés ne peuvent pas désigner le même
 * identifiant sans casser la lecture au clavier comme au lecteur d'écran.
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

/**
 * Bouton d'envoi pour les gestes qui ne sont pas l'action principale d'une
 * carte : suspendre, refuser, détacher.
 */
export function BoutonSecondaire({
  children,
  enCours = 'Envoi…',
  ton = 'neutre',
  disabled,
  ...props
}: ComponentProps<'button'> & { enCours?: string; ton?: 'neutre' | 'alerte' }) {
  const { pending } = useFormStatus();
  const styles =
    ton === 'alerte'
      ? 'border-erreur/50 text-erreur hover:bg-erreur/10'
      : 'border-bordure-forte text-encre hover:bg-fond-doux';

  return (
    <button
      type="submit"
      {...props}
      disabled={pending || disabled}
      aria-busy={pending}
      className={`rounded-[var(--rayon-petit)] border px-4 py-2.5 text-sm font-medium transition
                  disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
    >
      {pending ? enCours : children}
    </button>
  );
}

/**
 * Étiquette d'état. La pastille colorée n'ajoute qu'un repère : l'information
 * est portée par le texte, jamais par la seule couleur.
 */
export function Etiquette({ ton, children }: { ton: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-bordure bg-fond-doux px-2.5 py-0.5 text-xs font-medium text-encre">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ton }} aria-hidden />
      {children}
    </span>
  );
}
