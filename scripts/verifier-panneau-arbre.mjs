/**
 * Garde-fou anti-régression : le panneau latéral de /arbre doit défiler.
 *
 *   node scripts/verifier-panneau-arbre.mjs
 *
 * Après la refonte des cartes (portrait en en-tête de fiche), le contenu du
 * panneau dépasse souvent la hauteur de l'écran. Le défilement ne fonctionne
 * que si la rangée flex et l'aside respectent le contrat min-h-0 — sans quoi
 * le panneau s'étire et overflow-y-auto n'a aucun effet.
 *
 * Ce script relit le fichier source et refuse de continuer si le contrat est
 * rompu. À lancer après toute modification de l'écran arbre ou de la fiche
 * latérale.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const FICHIER = resolve(ICI, '../src/components/arbre/ecran-arbre.tsx');

const source = readFileSync(FICHIER, 'utf8');

const CONTRATS = [
  {
    motif: /relative flex min-h-0 flex-1 overflow-hidden/,
    message:
      'La rangée arbre + panneau doit porter « min-h-0 » pour contraindre la hauteur flex.',
  },
  {
    motif: /aside className="[^"]*\bh-full\b[^"]*\bmin-h-0\b[^"]*\boverflow-y-auto\b/,
    message:
      'L’aside du panneau doit avoir h-full, min-h-0 et overflow-y-auto pour défiler.',
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
