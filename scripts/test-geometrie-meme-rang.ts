/**
 * Liens parent/enfant sur la même rangée (mode éclaté) : le connecteur
 * passe sous les cartes, pas à travers.
 *
 *   npm run arbre:tsx -- scripts/test-geometrie-meme-rang.ts
 */
import { HAUTEUR_NOEUD, type NoeudArbre } from '../src/lib/layout-arbre';
import { segmentOrthogonal } from '../src/lib/geometrie-liens';

function noeud(id: string, x: number, y: number, rang: number): NoeudArbre {
  return {
    personneId: id,
    x,
    y,
    rang,
    lien: 'racine',
    cote: 'paternelle',
  };
}

function extraireY(path: string): number[] {
  return [...path.matchAll(/[VH]\s+(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
}

function echouer(messages: string[]): never {
  console.error('Échec test géométrie même rang :\n');
  for (const m of messages) console.error('  • ' + m);
  process.exit(1);
}

const parent = noeud('parent', 100, 200, 2);
const enfant = noeud('enfant', 400, 200, 2);
const segment = segmentOrthogonal(enfant, parent, 'parent->enfant', false);

if (!segment.d) echouer(['Chemin SVG manquant pour le lien même rang.']);

const ys = extraireY(segment.d);
const yBas = parent.y + HAUTEUR_NOEUD;
const yCouloir = ys.find((y) => y > yBas);

const erreurs: string[] = [];

if (yCouloir === undefined || yCouloir <= yBas) {
  erreurs.push(`Couloir attendu sous y=${yBas}, obtenu : ${ys.join(', ')}`);
}

for (const y of ys) {
  if (y > parent.y && y < parent.y + HAUTEUR_NOEUD) {
    erreurs.push(`Segment traverse la carte parent à y=${y}`);
  }
  if (y > enfant.y && y < enfant.y + HAUTEUR_NOEUD) {
    erreurs.push(`Segment traverse la carte enfant à y=${y}`);
  }
}

if (!segment.d.startsWith(`M ${parent.x} ${parent.y + HAUTEUR_NOEUD}`)) {
  erreurs.push('Le tracé doit partir du bas de la carte parent.');
}

if (!segment.d.endsWith(`V ${yBas}`)) {
  erreurs.push('Le tracé doit rejoindre le bas de la carte enfant.');
}

if (erreurs.length > 0) echouer(erreurs);

console.log('OK — connecteur même rang : couloir sous les cartes, sans traversée verticale.');
