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
if (!layout.includes('unitesAtomiquesSurRang') || !layout.includes('ordonnerAvecCouplesAtomiques')) {
  console.error('layout-arbre.ts : couples atomiques manquants (AUDIT M1)');
  process.exit(1);
}
if (!layout.includes('groupesConjoints')) {
  console.error('layout-arbre.ts : groupesConjoints manquant (multi-unions / ordre)');
  process.exit(1);
}

if (!geo.includes('enfantsPedigree') && !geo.includes("mode === 'famille'")) {
  // Le mode éclaté doit pouvoir utiliser le pedigree (AUDIT M3) — pas d'exclusion hardcodée.
}

if (/mode !== 'eclate' && rangProche/.test(geo) || /mode !== ['"]eclate['"] &&/.test(geo)) {
  console.error(
    "geometrie-liens.ts : le mode éclaté ne doit plus être exclu du pedigree (AUDIT M3)"
  );
  process.exit(1);
}

// Ascendance : le trait doit partir du haut des parents, pas flotter au-dessus.
if (/yHautParents\s*-\s*MARGE_SOUS_PARENTS/.test(geo)) {
  console.error(
    'geometrie-liens.ts : yHautParents - MARGE crée un trou au-dessus des parents (ascendance)'
  );
  process.exit(1);
}
if (!geo.includes('yHautParents')) {
  console.error('geometrie-liens.ts : yDepart ascendance doit utiliser yHautParents');
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
