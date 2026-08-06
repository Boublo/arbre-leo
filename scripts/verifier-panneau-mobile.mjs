#!/usr/bin/env node
/**
 * Garde-fou : panneau mobile (fiche) — scroll interne + body lock sous lg.
 *
 *   node scripts/verifier-panneau-mobile.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const fichier = join(racine, 'src/components/interactions/panneau-mobile.tsx');
const source = readFileSync(fichier, 'utf8');

const CONTRATS = [
  {
    motif: /matchMedia\('\(max-width: 1023px\)'\)/,
    message: 'Verrouiller body.overflow uniquement sous lg (matchMedia 1023px)',
  },
  {
    motif: /if \(mobile\) document\.body\.style\.overflow = 'hidden'/,
    message: 'body lock conditionnel au mobile',
  },
  {
    motif: /overflow-y-auto overscroll-y-contain.*touch-pan-y/,
    message: 'Zone de scroll interne avec touch-pan-y pour fiches longues',
  },
  {
    motif: /flex max-h-\[min\(85dvh,100%\)\].*overflow-hidden/,
    message: 'Dialog en flex-col overflow-hidden (scroll dans l’enfant)',
  },
  {
    motif: /lg:hidden/,
    message: 'Panneau masqué sur grand écran (panneau latéral desktop)',
  },
];

const manques = CONTRATS.filter((c) => !c.motif.test(source));

if (manques.length > 0) {
  console.error('Contrat panneau mobile non respecté :\n');
  for (const m of manques) console.error('  • ' + m.message);
  console.error('\nFichier : ' + fichier.replace(/\\/g, '/'));
  process.exit(1);
}

console.log('OK — panneau mobile : scroll et body lock conformes.');
