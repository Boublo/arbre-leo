'use client';

import { useRouter } from 'next/navigation';
import { SelecteurPersonne } from '@/components/arbre/selecteur-personne';
import type { PersonneArbre } from '@/lib/arbre';
import { urlOptionsImpression, type OptionsImpressionArbre } from '@/lib/arbre-impression';
import type { PersonneRecherche } from '@/lib/arbre-graphe';
import type { ModeArbre } from '@/lib/layout-arbre';

/**
 * Changer la personne de départ sur la page imprimable sans perdre les réglages.
 */
export function SelecteurPersonneImpression({
  focus,
  personnes,
  suggestions,
  mode,
  options,
}: {
  focus: PersonneArbre;
  personnes: PersonneRecherche[];
  suggestions: PersonneRecherche[];
  mode: ModeArbre;
  options: OptionsImpressionArbre;
}) {
  const router = useRouter();

  return (
    <div className="arbre-impr-selecteur">
      <span className="arbre-impr-selecteur-label">Partir de</span>
      <SelecteurPersonne
        personnes={personnes}
        suggestions={suggestions}
        choisie={focus}
        onChoix={(id) => {
          router.push(urlOptionsImpression({ personne: id, mode }, options));
        }}
      />
    </div>
  );
}
