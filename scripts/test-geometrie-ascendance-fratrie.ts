/**
 * Test ascendance : focus + fratrie + parent(s) — traits qui touchent les cartes.
 *
 *   npm run arbre:tsx -- scripts/test-geometrie-ascendance-fratrie.ts
 *
 * Régression août 2026 (Mathias / Loïck / Sandrine) : le trait de filiation
 * flottait au-dessus du parent sans le toucher, et le parent restait sous
 * le focus seul au lieu du centre de la fratrie.
 */
import type { DonneesArbre, PersonneArbre, UnionArbre } from '../src/lib/arbre';
import { disposerArbre, HAUTEUR_NOEUD } from '../src/lib/layout-arbre';
import { planifierLiens } from '../src/lib/geometrie-liens';

const U = 'u_parents';

function personne(
  id: string,
  nom: string,
  issuDe: string | null,
  unions: string[] = []
): PersonneArbre {
  return {
    id,
    codeGedcom: null,
    prenoms: nom,
    nom: null,
    nomComplet: nom,
    surnom: null,
    sexe: 'M',
    branches: ['paternelle'],
    niveauxPreuve: [],
    presumeVivant: false,
    notes: null,
    photoId: null,
    photoUrl: null,
    naissance: null,
    deces: null,
    profession: null,
    unions,
    issuDe,
    inhumation: null,
    descendanceIncomplete: false,
  };
}

function construire(): DonneesArbre {
  const personnes = new Map<string, PersonneArbre>([
    ['mathias', personne('mathias', 'Mathias', U)],
    ['loick', personne('loick', 'Loïck', U)],
    ['sandrine', personne('sandrine', 'Sandrine', null, [U])],
  ]);

  const unions = new Map<string, UnionArbre>([
    [
      U,
      {
        id: U,
        conjointA: 'sandrine',
        conjointB: null,
        enfants: ['mathias', 'loick'],
        mariage: null,
      },
    ],
  ]);

  const parents = new Map([
    ['mathias', ['sandrine']],
    ['loick', ['sandrine']],
  ]);
  const enfants = new Map([['sandrine', ['mathias', 'loick']]]);

  return { personnes, unions, parents, enfants };
}

function echouer(messages: string[]): never {
  console.error('Échec test ascendance fratrie :\n');
  for (const m of messages) console.error('  • ' + m);
  process.exit(1);
}

const donnees = construire();
const disposition = disposerArbre(donnees, 'mathias', 'ascendance');
const noeudParId = new Map(disposition.noeuds.map((n) => [n.personneId, n]));

const mathias = noeudParId.get('mathias');
const loick = noeudParId.get('loick');
const sandrine = noeudParId.get('sandrine');
const erreurs: string[] = [];

if (!mathias || !loick || !sandrine) {
  echouer(['Nœuds manquants (mathias / loick / sandrine).']);
}

if (mathias!.rang !== 0 || loick!.rang !== 0) {
  erreurs.push('Mathias et Loïck doivent être au rang 0');
}
if (sandrine!.rang !== 1) {
  erreurs.push(`Sandrine doit être au rang 1 (parents), obtenu ${sandrine!.rang}`);
}

const cxFratrie = (mathias!.x + loick!.x) / 2;
const deltaParent = Math.abs(sandrine!.x - cxFratrie);
if (deltaParent > 4) {
  erreurs.push(
    `Sandrine non centrée sous la fratrie : Δx = ${Math.round(deltaParent)} px (Sandrine=${Math.round(sandrine!.x)}, centre fratrie=${Math.round(cxFratrie)})`
  );
}

const { segments } = planifierLiens(
  donnees,
  disposition.liens,
  noeudParId,
  'ascendance'
);

const descente = segments.find((s) => s.id === `descente-${U}` && s.kind === 'line');
if (!descente || descente.y1 === undefined || descente.y2 === undefined) {
  erreurs.push('Segment descente pedigree manquant');
} else {
  const yHautParent = sandrine!.y;
  const yBasEnfants = Math.max(mathias!.y, loick!.y) + HAUTEUR_NOEUD;
  // Le trait doit partir du haut de la carte parent (contact visible).
  if (Math.abs(descente.y1 - yHautParent) > 1 && Math.abs(descente.y2 - yHautParent) > 1) {
    erreurs.push(
      `Descente ne touche pas le haut de Sandrine (y=${yHautParent}) : segment ${descente.y1}→${descente.y2}`
    );
  }
  // Et ne doit pas flotter dans le trou au-dessus du parent.
  const yProcheParent = Math.abs(descente.y1 - yHautParent) < Math.abs(descente.y2 - yHautParent)
    ? descente.y1
    : descente.y2;
  if (yProcheParent < yHautParent - 1) {
    erreurs.push(
      `Trait flotte au-dessus de Sandrine (extrémité ${yProcheParent} < haut carte ${yHautParent})`
    );
  }
  // L'autre extrémité doit être entre les enfants et le parent.
  const yLoin = yProcheParent === descente.y1 ? descente.y2 : descente.y1;
  if (yLoin <= yBasEnfants - 1 || yLoin >= yHautParent + 1) {
    erreurs.push(
      `Routage pedigree mal placé (y=${yLoin}, attendu entre enfants ${yBasEnfants} et parent ${yHautParent})`
    );
  }
}

const fratrie = segments.find((s) => s.id === `fratrie-${U}`);
if (!fratrie) {
  erreurs.push('Barre de fratrie Mathias–Loïck manquante');
}

if (erreurs.length > 0) echouer(erreurs);

console.log('OK — test ascendance fratrie (Mathias / Loïck / Sandrine) :');
console.log(`  • Sandrine centrée sous fratrie (Δ=${Math.round(deltaParent)} px)`);
console.log(`  • Descente pedigree contacte y=${sandrine!.y} (haut parent)`);
console.log(`  • Barre fratrie présente`);
