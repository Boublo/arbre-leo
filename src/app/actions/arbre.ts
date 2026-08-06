'use server';

import { chargerArbre, signerPhotosPersonnes } from '@/lib/arbre';
import {
  extraireSousGraphe,
  serialiserGraphe,
  type GrapheSerialise,
} from '@/lib/arbre-graphe';

/**
 * Charge le sous-graphe autour d'une personne pour l'écran /arbre.
 * Appelé quand le focus change vers quelqu'un hors du graphe déjà en mémoire.
 */
export async function chargerGrapheArbre(focusId: string): Promise<GrapheSerialise> {
  const donnees = await chargerArbre({ signerPhotosPour: new Set() });
  const sousGraphe = extraireSousGraphe(donnees, focusId);
  await signerPhotosPersonnes(sousGraphe.personnes, new Set(sousGraphe.personnes.keys()));
  return serialiserGraphe(sousGraphe);
}
