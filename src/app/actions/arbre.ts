'use server';

import { chargerArbre } from '@/lib/arbre';
import { serialiserGraphe, type GrapheSerialise } from '@/lib/arbre-graphe';

/**
 * Recharge le graphe complet pour l'écran /arbre.
 *
 * Historiquement nommé « sous-graphe » : un BFS tronquait l'ascendance.
 * On charge désormais tout l'arbre (mis en cache requête via `chargerArbre`)
 * puis on le sérialise. `focusId` sert uniquement à valider que la personne
 * existe encore.
 */
export async function chargerGrapheArbre(focusId: string): Promise<GrapheSerialise> {
  const donnees = await chargerArbre({ signerPhotosPour: 'aucun' });
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
