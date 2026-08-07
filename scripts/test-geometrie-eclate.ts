/**
 * Test géométrie mode « Tout » (éclaté) — pedigree partiel + couples (AUDIT M3).
 *
 *   npx tsx scripts/test-geometrie-eclate.ts
 */
import type { DonneesArbre, PersonneArbre } from '../src/lib/arbre';
import { disposerArbre } from '../src/lib/layout-arbre';
import {
  planifierLiens,
  SEUIL_COUPLE_ADJACENT,
  SEUIL_PONT_COUPLE,
} from '../src/lib/geometrie-liens';

const U_AIEUX = 'u_aieux';
const U_PIERRE_SOPHIE = 'u_pierre_sophie';
const U_PAUL = 'u_paul';

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

function construireGrapheLaura(): DonneesArbre {
  const personnes = new Map<string, PersonneArbre>([
    ['gp1', personne('gp1', 'Aïeul paternel', null, [U_AIEUX])],
    ['gp2', personne('gp2', 'Aïeule paternelle', null, [U_AIEUX])],
    ['pierre', personne('pierre', 'Pierre', U_AIEUX, [U_PIERRE_SOPHIE])],
    ['paul', personne('paul', 'Paul', U_AIEUX, [U_PAUL])],
    ['sophie', personne('sophie', 'Sophie', null, [U_PIERRE_SOPHIE])],
    ['laura', personne('laura', 'Laura', U_PIERRE_SOPHIE)],
    ['leo', personne('leo', 'Léo', U_PIERRE_SOPHIE)],
    ['julie', personne('julie', 'Julie', U_PAUL)],
  ]);

  const unions = new Map([
    [
      U_AIEUX,
      {
        id: U_AIEUX,
        conjointA: 'gp1',
        conjointB: 'gp2',
        enfants: ['pierre', 'paul'],
        mariage: null,
      },
    ],
    [
      U_PIERRE_SOPHIE,
      {
        id: U_PIERRE_SOPHIE,
        conjointA: 'pierre',
        conjointB: 'sophie',
        enfants: ['laura', 'leo'],
        mariage: null,
      },
    ],
    [
      U_PAUL,
      {
        id: U_PAUL,
        conjointA: 'paul',
        conjointB: null,
        enfants: ['julie'],
        mariage: null,
      },
    ],
  ]);

  const parents = new Map([
    ['pierre', ['gp1', 'gp2']],
    ['paul', ['gp1', 'gp2']],
    ['laura', ['pierre', 'sophie']],
    ['leo', ['pierre', 'sophie']],
    ['julie', ['paul']],
  ]);

  const enfants = new Map([
    ['gp1', ['pierre', 'paul']],
    ['gp2', ['pierre', 'paul']],
    ['pierre', ['laura', 'leo']],
    ['sophie', ['laura', 'leo']],
    ['paul', ['julie']],
    ['laura', []],
    ['leo', []],
    ['julie', []],
  ]);

  return { personnes, unions, parents, enfants };
}

function echouer(messages: string[]): never {
  console.error('Échec test géométrie éclatée :\n');
  for (const m of messages) console.error('  • ' + m);
  process.exit(1);
}

const donnees = construireGrapheLaura();
const disposition = disposerArbre(donnees, 'laura', 'eclate');
const noeudParId = new Map(disposition.noeuds.map((n) => [n.personneId, n]));

const pierre = noeudParId.get('pierre');
const sophie = noeudParId.get('sophie');
const laura = noeudParId.get('laura');
const leo = noeudParId.get('leo');
const gp1 = noeudParId.get('gp1');
const gp2 = noeudParId.get('gp2');

const erreurs: string[] = [];

if (!pierre || !sophie || !laura || !leo || !gp1 || !gp2) {
  echouer(['Nœuds manquants en mode éclaté (Laura focus).']);
}

// Couples atomiques sur même rangée BFS
if (pierre!.rang === sophie!.rang) {
  const dist = Math.abs(pierre!.x - sophie!.x);
  if (dist > SEUIL_COUPLE_ADJACENT) {
    erreurs.push(
      `Couple Pierre–Sophie trop éloignés en éclaté : ${Math.round(dist)} px > ${SEUIL_COUPLE_ADJACENT}`
    );
  }
  if (leo!.rang === pierre!.rang) {
    const xMin = Math.min(pierre!.x, sophie!.x);
    const xMax = Math.max(pierre!.x, sophie!.x);
    if (leo!.x > xMin && leo!.x < xMax) {
      erreurs.push('Léo intercalé entre Pierre et Sophie en mode éclaté');
    }
  }
}

const { segments } = planifierLiens(donnees, disposition.liens, noeudParId, 'eclate');

const barresFratrie = segments.filter((s) => s.id.startsWith('fratrie-'));
const couplesHoriz = segments.filter(
  (s) =>
    s.id.startsWith('couple-') &&
    !s.id.includes('stub') &&
    s.kind === 'line' &&
    s.y1 === s.y2
);

if (barresFratrie.length === 0) {
  erreurs.push(
    'Aucune barre de fratrie pedigree en mode éclaté — attendu pour unions à rang adjacent (M3)'
  );
}

// Laura (rang 0) est enfant adjacent de Pierre/Sophie (rang 1) → doit être en pedigree
const fratriePierreSophie = barresFratrie.find((s) => s.id.includes(U_PIERRE_SOPHIE));
if (!fratriePierreSophie) {
  erreurs.push(`Barre fratrie manquante pour l'union ${U_PIERRE_SOPHIE} (Laura sous parents)`);
}

// Pas de pont doré interminable
for (const seg of couplesHoriz) {
  if (seg.x1 === undefined || seg.x2 === undefined) continue;
  const longueur = Math.abs(seg.x2 - seg.x1);
  if (longueur > SEUIL_PONT_COUPLE) {
    erreurs.push(`Barre couple ${seg.id} trop longue : ${Math.round(longueur)} px`);
  }
}

// Encore des L pour les cas non adjacents (ex. Léo même rang que parents)
const orthogonaux = segments.filter(
  (s) => s.kind === 'path' && (s.id.includes('->') || s.d)
);
if (orthogonaux.length === 0 && disposition.liens.length > 4) {
  erreurs.push('Attendu : quelques L orthogonaux pour liens non adjacents / implexe');
}

if (erreurs.length > 0) echouer(erreurs);

console.log('OK — test géométrie éclatée (pedigree partiel) :');
console.log(`  • barres fratrie pedigree : ${barresFratrie.length}`);
console.log(`  • barres couple : ${couplesHoriz.length}`);
console.log(`  • L orthogonaux restants : ${orthogonaux.length}`);
console.log(
  `  • Pierre–Sophie : Δ=${Math.round(Math.abs(pierre!.x - sophie!.x))} px, rang=${pierre!.rang}`
);
