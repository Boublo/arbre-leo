/**
 * Test géométrique Laura / Léo / Julie — exécute le vrai layout TypeScript.
 *
 *   npx tsx scripts/test-geometrie-laura.ts
 */
import type { DonneesArbre, PersonneArbre } from '../src/lib/arbre';
import { disposerArbre } from '../src/lib/layout-arbre';
import { planifierLiens, SEUIL_COUPLE_ADJACENT, SEUIL_PONT_COUPLE } from '../src/lib/geometrie-liens';

const SEUIL_RACCORD = 160;

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
    ['gp1', []],
    ['gp2', []],
    ['pierre', ['gp1', 'gp2']],
    ['paul', ['gp1', 'gp2']],
    ['sophie', []],
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
  console.error('Échec test géométrie Laura :\n');
  for (const m of messages) console.error('  • ' + m);
  process.exit(1);
}

const donnees = construireGrapheLaura();
const disposition = disposerArbre(donnees, 'laura', 'famille');
const noeudParId = new Map(disposition.noeuds.map((n) => [n.personneId, n]));

const pierre = noeudParId.get('pierre');
const sophie = noeudParId.get('sophie');
const laura = noeudParId.get('laura');
const leo = noeudParId.get('leo');
const julie = noeudParId.get('julie');

const erreurs: string[] = [];

if (!pierre || !sophie || !laura || !leo || !julie) {
  echouer(['Nœuds manquants dans la disposition famille (Laura focus).']);
}

const distCouple = Math.abs(pierre!.x - sophie!.x);
const paul = noeudParId.get('paul');

const { segments } = planifierLiens(
  donnees,
  disposition.liens,
  noeudParId,
  'famille'
);
for (const seg of segments) {
  if (
    seg.id.startsWith('couple-') &&
    seg.kind === 'line' &&
    seg.x1 !== undefined &&
    seg.x2 !== undefined &&
    seg.y1 === seg.y2
  ) {
    const longueur = Math.abs(seg.x2 - seg.x1);
    if (longueur > SEUIL_PONT_COUPLE) {
      erreurs.push(
        `Barre dorée horizontale ${seg.id} : ${Math.round(longueur)} px > ${SEUIL_PONT_COUPLE} px`
      );
    }
  }
}

// AUDIT M1 : couple atomique — personne entre les époux, distance courte.
if (distCouple > SEUIL_COUPLE_ADJACENT) {
  erreurs.push(
    `Couple Pierre–Sophie trop éloignés : ${Math.round(distCouple)} px > ${SEUIL_COUPLE_ADJACENT} px (doit être collé)`
  );
}
if (paul) {
  const xMin = Math.min(pierre!.x, sophie!.x);
  const xMax = Math.max(pierre!.x, sophie!.x);
  if (paul.x > xMin && paul.x < xMax) {
    erreurs.push(
      `Paul (x=${Math.round(paul.x)}) est intercalé entre Pierre et Sophie — couple non atomique`
    );
  }
}

const centreParents = (pierre!.x + sophie!.x) / 2;
const centreEnfants = (laura!.x + leo!.x) / 2;
const deltaRaccord = Math.abs(centreParents - centreEnfants);
if (deltaRaccord > SEUIL_RACCORD) {
  erreurs.push(
    `Raccord parents→Laura/Léo : Δx = ${Math.round(deltaRaccord)} px > ${SEUIL_RACCORD} px`
  );
}

if (leo!.lien !== 'collateral') {
  erreurs.push(`Léo devrait être « collateral », obtenu « ${leo!.lien} »`);
}
if (julie!.lien !== 'cousin') {
  erreurs.push(`Julie devrait être « cousin », obtenu « ${julie!.lien} »`);
}

if (erreurs.length > 0) echouer(erreurs);

console.log('OK — test géométrie Laura (layout réel) :');
console.log(`  • couple Pierre–Sophie : ${Math.round(distCouple)} px`);
console.log(`  • raccord parents/enfants : ${Math.round(deltaRaccord)} px`);
console.log(`  • Léo = ${leo!.lien}, Julie = ${julie!.lien}`);
