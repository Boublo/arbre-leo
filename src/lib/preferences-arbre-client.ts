'use client';

import { guideDejaVu } from '@/components/arbre/guide-arbre';
import {
  lireFiltreBrancheEclateInitial,
  lireMasquerLiensLointainsInitial,
  lireProfondeurEclateInitiale,
} from '@/components/arbre/reglage-profondeur-eclate';
import type { FiltreBrancheEclate, ModeArbre } from '@/lib/layout-arbre';
import { CLE_FOND_ARBRE, lireFondArbreDepuisStockage } from '@/lib/fond-arbre';
import { lireStockage } from '@/lib/stockage-client';

export const CLE_MODE_ARBRE = 'arbre-mode';
const MODES_ARBRE: ModeArbre[] = ['ascendance', 'famille', 'descendance', 'eclate'];

export function lireModeArbreClient(): ModeArbre {
  if (!guideDejaVu()) return 'ascendance';
  const sauve = lireStockage(CLE_MODE_ARBRE);
  if (sauve && MODES_ARBRE.includes(sauve as ModeArbre)) return sauve as ModeArbre;
  return 'ascendance';
}

export function lireGuideOuvertClient(): boolean {
  return !guideDejaVu();
}

export function lireProfondeurEclateClient(): number {
  return lireProfondeurEclateInitiale();
}

export function lireFiltreBrancheEclateClient(): FiltreBrancheEclate {
  return lireFiltreBrancheEclateInitial();
}

export function lireMasquerLiensLointainsClient(): boolean {
  return lireMasquerLiensLointainsInitial();
}

export function lireFondArbreClient() {
  return lireFondArbreDepuisStockage(lireStockage);
}
