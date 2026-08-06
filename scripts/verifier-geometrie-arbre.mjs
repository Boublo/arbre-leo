#!/usr/bin/env node
/**
 * Vérification géométrique — constantes + test layout réel (fixture Laura).
 *
 *   node scripts/verifier-geometrie-arbre.mjs
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

const geo = readFileSync(join(racine, 'src/lib/geometrie-liens.ts'), 'utf8');
if (!geo.includes('HAUTEUR_COUCHES_ROUTAGE')) {
  console.error('geometrie-liens.ts : HAUTEUR_COUCHES_ROUTAGE manquant');
  process.exit(1);
}
if (!geo.includes('SEUIL_PONT_COUPLE')) {
  console.error('geometrie-liens.ts : SEUIL_PONT_COUPLE manquant');
  process.exit(1);
}

const layout = readFileSync(join(racine, 'src/lib/layout-arbre.ts'), 'utf8');
if (!layout.includes('rapprocherConjointsSurRang')) {
  console.error('layout-arbre.ts : rapprocherConjointsSurRang manquant (AUDIT C2)');
  process.exit(1);
}
if (!layout.includes('recentererFratriesSousCouples')) {
  console.error('layout-arbre.ts : recentererFratriesSousCouples manquant (AUDIT C3)');
  process.exit(1);
}

const test = spawnSync('npx', ['--yes', 'tsx', 'scripts/test-geometrie-laura.ts'], {
  cwd: racine,
  encoding: 'utf8',
  stdio: 'pipe',
});

if (test.stdout) process.stdout.write(test.stdout);
if (test.stderr) process.stderr.write(test.stderr);
if (test.status !== 0) process.exit(test.status ?? 1);

console.log('OK — vérification géométrie arbre (constantes + layout Laura).');
