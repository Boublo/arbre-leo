'use server';

import { chargerArbre } from '@/lib/arbre';
import { serialiserGraphe, type GrapheSerialise } from '@/lib/arbre-graphe';

/**
 * Charge le sous-graphe autour d'une personne pour l'écran /arbre.
 * Appelé quand le focus change vers quelqu'un hors du graphe déjà en mémoire.
 */
export async function chargerGrapheArbre(focusId: string): Promise<GrapheSerialise> {
  const donnees = await chargerArbre();
  if (!donnees.personnes.has(focusId)) {
    return serialiserGraphe({
      personnes: new Map(),
      unions: new Map(),
      parents: new Map(),
      enfants: new Map(),
    });
  }
  return serialiserGraphe(donnees);
}
