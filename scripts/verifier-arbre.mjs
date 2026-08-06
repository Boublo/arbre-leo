#!/usr/bin/env node
/**
 * Suite anti-régression de l'écran /arbre.
 *
 *   node scripts/verifier-arbre.mjs
 *   npm run arbre:verifier
 *
 * À lancer avant tout commit touchant l'arbre, et en CI sur chaque PR.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

const ETAPES = [
  { cmd: ['node', 'scripts/verifier-chargement-arbre.mjs'], label: 'chargement graphe complet' },
  { cmd: ['node', 'scripts/verifier-zoom-arbre.mjs'], label: 'zoom recadrer / toutVoir' },
  { cmd: ['node', 'scripts/verifier-panneau-arbre.mjs'], label: 'panneau latéral desktop' },
  { cmd: ['node', 'scripts/verifier-panneau-mobile.mjs'], label: 'panneau mobile' },
  { cmd: ['node', 'scripts/verifier-navigation-arbre.mjs'], label: 'navigation viewport' },
  { cmd: ['node', 'scripts/verifier-liens-famille.mjs'], label: 'symboles liens famille' },
  { cmd: ['node', 'scripts/verifier-geometrie-arbre.mjs'], label: 'géométrie Laura + constantes' },
  { cmd: ['npx', '--yes', 'tsx', 'scripts/test-geometrie-ascendance.ts'], label: 'ascendance profonde' },
  { cmd: ['npx', '--yes', 'tsx', 'scripts/test-geometrie-ascendance-fratrie.ts'], label: 'ascendance fratrie + parent' },
  { cmd: ['npx', '--yes', 'tsx', 'scripts/test-geometrie-famille-complete.ts'], label: 'famille complète + ordre unions' },
  { cmd: ['npx', '--yes', 'tsx', 'scripts/test-geometrie-eclate.ts'], label: 'éclaté pedigree partiel' },
];

const echecs = [];

for (const { cmd, label } of ETAPES) {
  process.stdout.write(`→ ${label}… `);
  const result = spawnSync(cmd[0], cmd.slice(1), {
    cwd: racine,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status === 0) {
    console.log('OK');
    continue;
  }

  console.log('ÉCHEC');
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  echecs.push(label);
}

if (echecs.length > 0) {
  console.error(`\n${echecs.length} garde-fou(s) en échec : ${echecs.join(', ')}`);
  process.exit(1);
}

console.log(`\nTous les garde-fous arbre OK (${ETAPES.length} vérifications).`);
