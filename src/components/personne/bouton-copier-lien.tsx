'use client';

import { useEffect, useState } from 'react';
import {
  FournisseurNotifications,
  notifier,
} from '@/components/interactions/notification-instant';

/**
 * Petit bouton dans l'en-tête d'une fiche : copier le lien vers cette
 * personne, pour l'envoyer à un cousin par messagerie sans avoir à
 * expliquer par où passer.
 *
 * Le composant s'auto-suffit — pas de dépendance à un fournisseur de
 * notifications monté quelque part en amont : il enveloppe son propre
 * bouton dans un `FournisseurNotifications`, qui publie la fonction
 * `notifier()` au module. Le toast en bas à droite est rendu par ce même
 * fournisseur, en position fixe, indépendamment de l'endroit où le bouton
 * est posé.
 */

export function BoutonCopierLien({
  chemin,
  libelle,
}: {
  chemin: string;
  libelle: string;
}) {
  return (
    <FournisseurNotifications>
      <BoutonInterieur chemin={chemin} libelle={libelle} />
    </FournisseurNotifications>
  );
}

function BoutonInterieur({ chemin, libelle }: { chemin: string; libelle: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    if (typeof window === 'undefined') return;
    // On construit l'URL complète au clic pour hériter du protocole et
    // du domaine réels — utile en préproduction comme en local.
    const url = `${window.location.origin}${chemin}`;
    try {
      await navigator.clipboard.writeText(url);
      notifier(`Lien vers ${libelle} copié dans le presse-papier.`, 'succes');
      setCopie(true);
    } catch {
      notifier(
        'La copie n’a pas fonctionné — le presse-papier est indisponible.',
        'erreur',
      );
    }
  }

  // Le label du bouton bascule brièvement pour confirmer visuellement, en
  // plus du toast : deux canaux valent mieux qu'un pour les lecteurs pressés.
  useEffect(() => {
    if (!copie) return;
    const id = window.setTimeout(() => setCopie(false), 2000);
    return () => window.clearTimeout(id);
  }, [copie]);

  return (
    <button
      type="button"
      onClick={copier}
      aria-label={`Copier le lien vers la fiche de ${libelle}`}
      title="Copier le lien de cette personne"
      className="inline-flex items-center gap-1.5 rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-2.5 py-1 text-xs text-encre-douce transition hover:border-bordure-forte hover:bg-fond-doux hover:text-encre"
    >
      <IconeLien />
      <span>{copie ? 'Lien copié' : 'Copier le lien'}</span>
    </button>
  );
}

function IconeLien() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path d="M8.5 11.5 11.5 8.5" strokeLinecap="round" />
      <path
        d="M11 5.5l1.5-1.5a2.5 2.5 0 0 1 3.5 3.5L14.5 9"
        strokeLinecap="round"
      />
      <path
        d="M9 11l-1.5 1.5a2.5 2.5 0 0 1-3.5-3.5L5.5 7.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
