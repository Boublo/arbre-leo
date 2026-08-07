'use server';

import { chargerGrapheArbreFocus } from '@/lib/arbre-contexte-fiche';
import { serialiserGraphe, type GrapheSerialise } from '@/lib/arbre-graphe';

/**
 * Recharge le sous-graphe autour du focus pour l'écran /arbre.
 *
 * Ascendance et descendance complètes + voisinage latéral (BFS). La palette
 * de recherche utilise un index léger séparé (`chargerPersonnesRechercheArbre`).
 */
export async function chargerGrapheArbre(focusId: string): Promise<GrapheSerialise> {
  const donnees = await chargerGrapheArbreFocus(focusId);
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
