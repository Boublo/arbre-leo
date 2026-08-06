#!/usr/bin/env node
/**
 * Garde anti-régression : les liens en mode « famille autour » doivent
 * aligner les barres de fratrie par rangée et séparer visuellement les groupes.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const liens = readFileSync(join(racine, 'src/components/arbre/liens-famille.tsx'), 'utf8');
const layout = readFileSync(join(racine, 'src/lib/layout-arbre.ts'), 'utf8');

const checks = [
  {
    fichier: 'liens-famille.tsx',
    motif: 'yBarreParRangEnfant',
    message: 'hauteur de barre unifiée par rangée d’enfants',
  },
  {
    fichier: 'liens-famille.tsx',
    motif: 'MARGE_SUR_ENFANTS',
    message: 'marge fixe au-dessus des cartes enfants',
  },
  {
    fichier: 'liens-famille.tsx',
    motif: 'xFratrieCentre',
    message: 'jonction T centrée sur la fratrie',
  },
  {
    fichier: 'layout-arbre.ts',
    motif: 'margeEntreGroupes',
    message: 'espacement minimal entre fratries cousines',
  },
];

const erreurs = [];
for (const { fichier, motif, message } of checks) {
  const contenu = fichier.includes('layout') ? layout : liens;
  if (!contenu.includes(motif)) {
    erreurs.push(`${fichier} : ${message} (${motif})`);
  }
}

if (erreurs.length > 0) {
  console.error('Échec verifier-liens-famille :\n' + erreurs.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('OK — liens famille : barres par rangée et espacement des groupes préservés.');
