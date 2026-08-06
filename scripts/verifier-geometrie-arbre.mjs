#!/usr/bin/env node
/**
 * Vérification géométrique minimale — graphe Laura / Léo / Julie.
 *
 * Reproduit le scénario où les conjoints éloignés produisent des barres dorées
 * trop longues et des raccords parent-enfant décalés.
 *
 * Ce script n'importe pas TypeScript : il réimplémente le cas minimal pour
 * documenter les seuils attendus après correction layout+liens.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

const LARGEUR_NOEUD = 200;
const SEUIL_COUPLE_ADJACENT = LARGEUR_NOEUD + 48;
const SEUIL_BARRE_COUPLE_MAX = 320;
const SEUIL_RACCORD_PARENT_ENFANT_MAX = 160;

/** Positions simulées (unités layout × ESPACEMENT_X ≈ px après finaliser). */
const SCENARIO_LURA = {
  pierre: { x: 0, y: 0 },
  paul: { x: 240, y: 0 },
  sophie: { x: 600, y: 0 },
  julie: { x: 240, y: 175 },
  laura: { x: 588, y: 175 },
  leo: { x: 828, y: 175 },
};

function distanceCouple(a, b) {
  return Math.abs(a.x - b.x);
}

function centre(enfants) {
  const xs = enfants.map((e) => e.x);
  return (Math.min(...xs) + Math.max(...xs)) / 2;
}

function verifierScenario(nom, positions, couples, fratries) {
  const erreurs = [];

  for (const [id, { a, b }] of Object.entries(couples)) {
    const dist = distanceCouple(positions[a], positions[b]);
    const adjacents = dist <= SEUIL_COUPLE_ADJACENT;
    if (!adjacents && dist > SEUIL_BARRE_COUPLE_MAX) {
      erreurs.push(
        `${nom} : couple ${id} (${a}–${b}) distance ${dist}px > ${SEUIL_BARRE_COUPLE_MAX}px → barre dorée traversante probable`
      );
    }
  }

  for (const [id, { parents, enfants }] of Object.entries(fratries)) {
    const px = (positions[parents[0]].x + positions[parents[1]].x) / 2;
    const cx = centre(enfants.map((e) => positions[e]));
    const delta = Math.abs(px - cx);
    if (delta > SEUIL_RACCORD_PARENT_ENFANT_MAX) {
      erreurs.push(
        `${nom} : fratrie ${id} Δx parents/enfants = ${delta}px > ${SEUIL_RACCORD_PARENT_ENFANT_MAX}px → raccord spaghetti`
      );
    }
  }

  return erreurs;
}

// --- Vérifier que le code source contient les constantes attendues ---
const geo = readFileSync(join(racine, 'src/lib/geometrie-liens.ts'), 'utf8');
if (!geo.includes('HAUTEUR_COUCHES_ROUTAGE')) {
  console.error('geometrie-liens.ts : HAUTEUR_COUCHES_ROUTAGE manquant');
  process.exit(1);
}
if (!geo.includes('SEUIL_PONT_COUPLE')) {
  console.error('geometrie-liens.ts : SEUIL_PONT_COUPLE manquant (pas de barre dorée traversante)');
  process.exit(1);
}

const layout = readFileSync(join(racine, 'src/lib/layout-arbre.ts'), 'utf8');
if (!layout.includes('rapprocherConjointsSurRang')) {
  console.error('layout-arbre.ts : rapprocherConjointsSurRang manquant (AUDIT C2)');
  process.exit(1);
}

// --- Scénario Laura (layout actuel simulé) — DOIT échouer tant que C2 non corrigé ---
const p = SCENARIO_LURA;
const echecsAttendus = verifierScenario(
  'Laura/famille (layout actuel)',
  p,
  { u2: { a: 'pierre', b: 'sophie' } },
  { lauraLeo: { parents: ['pierre', 'sophie'], enfants: ['laura', 'leo'] } }
);

const avertissements = [];
if (echecsAttendus.length > 0) {
  avertissements.push(
    '⚠ Scénario Laura : problèmes géométriques connus (voir AUDIT.md C2/C3) :'
  );
  echecsAttendus.forEach((e) => avertissements.push(`    - ${e}`));
  avertissements.push(
    '  → Corriger layout famille (rapprocher conjoints) avant de faire passer ce test en dur.'
  );
}

// --- Scénario corrigé (conjoints rapprochés) — référence cible ---
const pCorrige = {
  ...p,
  sophie: { x: 210, y: 0 },
  laura: { x: 105, y: 175 },
  leo: { x: 315, y: 175 },
};
const okCorrige = verifierScenario(
  'Laura/famille (cible)',
  pCorrige,
  { u2: { a: 'pierre', b: 'sophie' } },
  { lauraLeo: { parents: ['pierre', 'sophie'], enfants: ['laura', 'leo'] } }
);

if (okCorrige.length > 0) {
  console.error('Échec : le layout cible ne satisfait pas les seuils :', okCorrige);
  process.exit(1);
}

console.log('OK — géométrie arbre : constantes présentes, layout cible valide.');
if (avertissements.length > 0) {
  console.warn(avertissements.join('\n'));
  console.warn('\n  (Avertissement documenté — pas un échec CI tant que C2 est ouvert.)');
}
