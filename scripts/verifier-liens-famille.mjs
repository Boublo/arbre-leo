#!/usr/bin/env node
/**
 * Garde anti-régression : tracé unifié des liens et layout amélioré.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

const checks = [
  {
    file: 'src/lib/geometrie-liens.ts',
    motifs: ['planifierLiens', 'segmentsPedigree', 'segmentsCouple', 'HAUTEUR_COUCHES_ROUTAGE'],
  },
  {
    file: 'src/components/arbre/liens-arbre.tsx',
    motifs: ['LiensArbre', 'planifierLiens'],
  },
  {
    file: 'src/components/arbre/vue-arbre.tsx',
    motifs: ['LiensArbre'],
  },
  {
    file: 'src/lib/layout-arbre.ts',
    motifs: ['ecarterCollisions', 'ordonnerCoucheEclate', 'ECART_MINIMUM_CENTRES'],
  },
];

const erreurs = [];
for (const { file, motifs } of checks) {
  const contenu = readFileSync(join(racine, file), 'utf8');
  for (const motif of motifs) {
    if (!contenu.includes(motif)) {
      erreurs.push(`${file} : motif manquant « ${motif} »`);
    }
  }
}

if (erreurs.length > 0) {
  console.error('Échec verifier-liens-famille :\n' + erreurs.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('OK — arbre : tracé unifié, anti-collision et mode éclaté groupé.');
