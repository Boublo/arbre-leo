import type { Portrait } from '@/components/portrait/types';
import type { PortraitMentionnable } from '@/lib/souvenirs';

/**
 * Adapte un `PortraitMentionnable` — la forme qu’expose `chargerPortraitsMentionnables`
 * pour le formulaire de dépôt — en `Portrait`, ce que la Vignette partagée sait
 * dessiner. Le trait d’union entre la donnée du module « souvenirs » et le
 * composant du module « portrait ».
 */
export function portraitDePortrait(p: PortraitMentionnable): Portrait {
  return {
    id: p.id,
    nomComplet: p.nomComplet,
    surnom: p.surnom,
    sexe: p.sexe,
    branches: p.branches,
    presumeVivant: p.presumeVivant,
    anneeNaissance: p.anneeNaissance,
    anneeDeces: p.anneeDeces,
    lieuNaissance: p.lieuNaissance,
  };
}
