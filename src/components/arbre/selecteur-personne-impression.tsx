'use client';

import { useRouter } from 'next/navigation';
import { urlOptionsImpression, type OptionsImpressionArbre } from '@/lib/arbre-impression';
import type { ModeArbre } from '@/lib/layout-arbre';

/**
 * Changer la personne de départ sur la page imprimable sans perdre les réglages.
 */
export function SelecteurPersonneImpression({
  personnes,
  focusId,
  mode,
  options,
}: {
  personnes: { id: string; nom: string }[];
  focusId: string;
  mode: ModeArbre;
  options: OptionsImpressionArbre;
}) {
  const router = useRouter();

  return (
    <label className="arbre-impr-selecteur">
      <span className="arbre-impr-selecteur-label">Partir de</span>
      <select
        className="arbre-impr-selecteur-choix"
        value={focusId}
        onChange={(e) => {
          router.push(
            urlOptionsImpression({ personne: e.target.value, mode }, options)
          );
        }}
      >
        {personnes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nom}
          </option>
        ))}
      </select>
    </label>
  );
}
