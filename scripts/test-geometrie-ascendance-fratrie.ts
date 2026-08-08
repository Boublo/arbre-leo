/**
 * Test ascendance : focus + fratrie + parent — traits qui touchent les cartes.
 *
 *   npm run arbre:tsx -- scripts/test-geometrie-ascendance-fratrie.ts
 */
import type { DonneesArbre, PersonneArbre, UnionArbre } from '../src/lib/arbre';
import { disposerArbre, HAUTEUR_NOEUD } from '../src/lib/layout-arbre';
import { planifierLiens } from '../src/lib/geometrie-liens';

const U = 'u_parent';

function personne(id: string, libelle: string, issuDe: string | null, unions: string[] = []): PersonneArbre {
  return {
    id, codeGedcom: null, prenoms: libelle, nom: null, nomComplet: libelle,
    surnom: null, sexe: 'M', branches: ['test'], niveauxPreuve: [],
    presumeVivant: false, notes: null, photoId: null, photoUrl: null,
    naissance: null, deces: null, profession: null, unions, issuDe,
    inhumation: null, descendanceIncomplete: false,
  };
}

function construire(): DonneesArbre {
  const personnes = new Map<string, PersonneArbre>([
    ['enfant_un', personne('enfant_un', 'Enfant un', U)],
    ['enfant_deux', personne('enfant_deux', 'Enfant deux', U)],
    ['parent', personne('parent', 'Parent', null, [U])],
  ]);
  const unions = new Map<string, UnionArbre>([[U, {
    id: U, conjointA: 'parent', conjointB: null,
    enfants: ['enfant_un', 'enfant_deux'], mariage: null,
  }]]);
  const parents = new Map([
    ['enfant_un', ['parent']], ['enfant_deux', ['parent']],
  ]);
  const enfants = new Map([['parent', ['enfant_un', 'enfant_deux']]]);
  return { personnes, unions, parents, enfants };
}

function echouer(messages: string[]): never {
  console.error('Échec test ascendance fratrie :\n');
  for (const message of messages) console.error('  • ' + message);
  process.exit(1);
}

const donnees = construire();
const disposition = disposerArbre(donnees, 'enfant_un', 'ascendance');
const noeudParId = new Map(disposition.noeuds.map((noeud) => [noeud.personneId, noeud]));
const enfantUn = noeudParId.get('enfant_un');
const enfantDeux = noeudParId.get('enfant_deux');
const parent = noeudParId.get('parent');
const erreurs: string[] = [];

if (!enfantUn || !enfantDeux || !parent) echouer(['Nœuds synthétiques manquants.']);
if (enfantUn!.rang !== 0 || enfantDeux!.rang !== 0) erreurs.push('Les enfants doivent être au rang 0');
if (parent!.rang !== 1) erreurs.push(`Le parent doit être au rang 1, obtenu ${parent!.rang}`);

const centreFratrie = (enfantUn!.x + enfantDeux!.x) / 2;
const deltaParent = Math.abs(parent!.x - centreFratrie);
if (deltaParent > 4) erreurs.push(`Parent non centré sous la fratrie : Δx = ${Math.round(deltaParent)} px`);

const { segments } = planifierLiens(donnees, disposition.liens, noeudParId, 'ascendance');
const descente = segments.find((segment) => segment.id === `descente-${U}` && segment.kind === 'line');
if (!descente || descente.y1 === undefined || descente.y2 === undefined) {
  erreurs.push('Segment de descente pedigree manquant');
} else {
  const yHautParent = parent!.y;
  const yBasEnfants = Math.max(enfantUn!.y, enfantDeux!.y) + HAUTEUR_NOEUD;
  if (Math.abs(descente.y1 - yHautParent) > 1 && Math.abs(descente.y2 - yHautParent) > 1) {
    erreurs.push('La descente ne touche pas le haut de la carte parent');
  }
  const yProcheParent = Math.abs(descente.y1 - yHautParent) < Math.abs(descente.y2 - yHautParent)
    ? descente.y1 : descente.y2;
  if (yProcheParent < yHautParent - 1) erreurs.push('Le trait flotte au-dessus du parent');
  const yLoin = yProcheParent === descente.y1 ? descente.y2 : descente.y1;
  if (yLoin <= yBasEnfants - 1 || yLoin >= yHautParent + 1) {
    erreurs.push('Le routage pedigree est mal placé');
  }
}

if (!segments.find((segment) => segment.id === `fratrie-${U}`)) erreurs.push('Barre de fratrie manquante');
if (erreurs.length > 0) echouer(erreurs);

console.log('OK — test ascendance fratrie synthétique :');
console.log(`  • parent centré sous fratrie (Δ=${Math.round(deltaParent)} px)`);
console.log(`  • descente pedigree contacte y=${parent!.y}`);
console.log('  • barre de fratrie présente');
