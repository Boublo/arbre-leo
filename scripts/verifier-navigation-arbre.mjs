#!/usr/bin/env node
/**
 * Garde anti-régression : navigation et repères de l'arbre.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

const checks = [
  {
    file: 'src/app/arbre/page.tsx',
    motifs: ['max-h-[calc(100dvh-3.25rem)]', 'overflow-hidden'],
    interdit: ['lg:h-auto'],
  },
  {
    file: 'src/components/arbre/vue-arbre.tsx',
    motifs: ['ReperesRang', 'IndicationsMobile', 'z-20', 'safe-area-inset-bottom'],
  },
  {
    file: 'src/components/arbre/reperes-rang.tsx',
    motifs: ['transform.y', 'nommerRang'],
  },
  {
    file: 'src/components/arbre/indications-mobile.tsx',
    motifs: ['Pincer', 'sm:hidden'],
  },
];

const erreurs = [];
for (const { file, motifs, interdit = [] } of checks) {
  const contenu = readFileSync(join(racine, file), 'utf8');
  for (const motif of motifs) {
    if (!contenu.includes(motif)) {
      erreurs.push(`${file} : motif manquant « ${motif} »`);
    }
  }
  for (const motif of interdit) {
    if (contenu.includes(motif)) {
      erreurs.push(`${file} : régression « ${motif} »`);
    }
  }
}

if (erreurs.length > 0) {
  console.error('Échec verifier-navigation-arbre :\n' + erreurs.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('OK — navigation arbre : viewport verrouillé, repères fixes, indications mobile.');
