#!/usr/bin/env node
/**
 * Garde-fou : zoom par défaut lisible (recadrer), pas « tout réduire ».
 *
 * Régression août 2026 : toutVoir() au chargement rendait les cartes minuscules
 * en ascendance profonde. Le bouton ⤢ garde le zoom « tout voir ».
 *
 *   node scripts/verifier-zoom-arbre.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const fichier = join(racine, 'src/components/arbre/vue-arbre.tsx');
const source = readFileSync(fichier, 'utf8');

const CONTRATS = [
  {
    motif: /const recadrer = useCallback/,
    message: 'recadrer() doit exister — cadre par défaut centré sur le focus',
  },
  {
    motif: /const toutVoir = useCallback/,
    message: 'toutVoir() doit exister — réservé au bouton ⤢',
  },
  {
    motif: /function ancreVerticale/,
    message: 'ancreVerticale() — position verticale du focus selon le mode',
  },
  {
    motif: /const k = width < 1024 \? 0\.9 : 0\.88/,
    message: 'recadrer doit utiliser k ≈ 0.88–0.9 (échelle lisible), pas fit-all',
  },
  {
    motif: /setTimeout\(recadrer,\s*60\)/,
    message: 'useEffect initial doit appeler recadrer, pas toutVoir',
  },
  {
    motif: /tailleVue\.largeur <= 0 \|\| tailleVue\.hauteur <= 0/,
    message: 'recadrer doit attendre une taille de cadre non nulle (panneau absolu)',
  },
  {
    motif: /onClick=\{toutVoir\}/,
    message: 'toutVoir uniquement sur le bouton « Voir tout »',
  },
  {
    motif: /width === 0 \|\| height === 0/,
    message: 'recadrer/toutVoir doivent ignorer un SVG 0×0',
  },
];

const INTERDITS = [
  {
    motif: /useEffect\([\s\S]*?setTimeout\(toutVoir,\s*60\)/,
    message: 'useEffect ne doit pas appeler toutVoir au chargement',
  },
];

const manques = CONTRATS.filter((c) => !c.motif.test(source));
const regressions = INTERDITS.filter((c) => c.motif.test(source));

if (manques.length > 0 || regressions.length > 0) {
  console.error('Contrat zoom arbre non respecté :\n');
  for (const m of manques) console.error('  • ' + m.message);
  for (const r of regressions) console.error('  • RÉGRESSION : ' + r.message);
  console.error('\nFichier : ' + fichier.replace(/\\/g, '/'));
  process.exit(1);
}

console.log('OK — zoom arbre : recadrer par défaut, toutVoir sur demande.');
