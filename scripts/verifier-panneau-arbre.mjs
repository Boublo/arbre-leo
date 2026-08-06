/**
 * Garde-fou anti-régression : le panneau latéral de /arbre doit défiler.
 *
 *   node scripts/verifier-panneau-arbre.mjs
 *
 * Le contenu de la fiche (portrait + notes) dépasse souvent la hauteur de
 * l'écran. Le défilement ne fonctionne que si le panneau est borné en hauteur
 * (position absolue inset-y-0) et porte overflow-y-auto.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const FICHIER = resolve(ICI, '../src/components/arbre/ecran-arbre.tsx');

const source = readFileSync(FICHIER, 'utf8');

const CONTRATS = [
  {
    motif: /relative min-h-0 flex-1 overflow-hidden/,
    message:
      'Le cadre arbre + panneau doit porter « relative min-h-0 flex-1 overflow-hidden ».',
  },
  {
    motif: /absolute inset-0 min-h-0 min-w-0/,
    message:
      'L’arbre doit occuper le cadre en position absolue (absolute inset-0) pour ne pas être repoussé par le panneau.',
  },
  {
    motif: /aside className="[^"]*\babsolute\b[^"]*\binset-y-0\b[^"]*\boverflow-y-auto\b/,
    message:
      'L’aside du panneau doit être en absolute inset-y-0 avec overflow-y-auto pour défiler.',
  },
];

const manques = CONTRATS.filter((c) => !c.motif.test(source));

if (manques.length > 0) {
  console.error('Contrat de défilement du panneau latéral non respecté :\n');
  for (const m of manques) {
    console.error('  • ' + m.message);
  }
  console.error('\nFichier concerné : ' + FICHIER.replace(/\\/g, '/'));
  process.exit(1);
}

console.log('Panneau latéral de l’arbre : contrat de défilement OK.');
