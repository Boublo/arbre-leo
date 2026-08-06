/**
 * Plusieurs unions sur une même rangée d'enfants : couloirs pedigree bornés
 * et réutilisés quand les groupes sont horizontalement disjoints.
 *
 *   npx tsx scripts/test-geometrie-couloirs.ts
 */
import type { DonneesArbre, PersonneArbre } from '../src/lib/arbre';
import { ESPACEMENT_Y, HAUTEUR_NOEUD, LARGEUR_NOEUD, type NoeudArbre } from '../src/lib/layout-arbre';
import { planifierLiens } from '../src/lib/geometrie-liens';

const COULOIR_MAX =
  Math.floor((ESPACEMENT_Y - HAUTEUR_NOEUD - 10 - 10) / 8) * 8;

function personne(id: string, issuDe: string | null, unions: string[] = []): PersonneArbre {
  return {
    id,
    codeGedcom: null,
    prenoms: id,
    nom: null,
    nomComplet: id,
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

function echouer(messages: string[]): never {
  console.error('Échec test couloirs pedigree :\n');
  for (const m of messages) console.error('  • ' + m);
  process.exit(1);
}

const NB_UNIONS = 20;
const yParent = 0;
const yEnfant = ESPACEMENT_Y;
const rangParent = 0;
const rangEnfant = 1;

const personnes = new Map<string, PersonneArbre>();
const unions = new Map<string, { id: string; conjointA: string; conjointB: string | null; enfants: string[]; mariage: null }>();
const parents = new Map<string, string[]>();
const enfants = new Map<string, string[]>();
const noeudParId = new Map<string, NoeudArbre>();
const liens: { id: string; parentId: string; enfantId: string; reprise: boolean }[] = [];

for (let i = 0; i < NB_UNIONS; i++) {
  const unionId = `u${i}`;
  const pId = `p${i}`;
  const cId = `c${i}`;
  personnes.set(pId, personne(pId, null, [unionId]));
  personnes.set(cId, personne(cId, unionId));
  unions.set(unionId, {
    id: unionId,
    conjointA: pId,
    conjointB: null,
    enfants: [cId],
    mariage: null,
  });
  parents.set(cId, [pId]);
  enfants.set(pId, [cId]);

  const xParent = i * (LARGEUR_NOEUD + 80);
  const xEnfant = xParent;
  noeudParId.set(pId, {
    personneId: pId,
    x: xParent,
    y: yParent,
    rang: rangParent,
    lien: 'racine',
    cote: 'paternelle',
  });
  noeudParId.set(cId, {
    personneId: cId,
    x: xEnfant,
    y: yEnfant,
    rang: rangEnfant,
    lien: 'descendant',
    cote: 'paternelle',
  });
  liens.push({ id: `${pId}->${cId}`, parentId: pId, enfantId: cId, reprise: false });
}

const donnees: DonneesArbre = { personnes, unions, parents, enfants };
const { segments } = planifierLiens(donnees, liens, noeudParId, 'descendance');

const yParentBas = yParent + HAUTEUR_NOEUD;
const yEnfantHaut = yEnfant;
const barresFratrie = segments.filter((s) => s.id.startsWith('fratrie-'));

const erreurs: string[] = [];

if (barresFratrie.length !== NB_UNIONS) {
  erreurs.push(`Attendu ${NB_UNIONS} barres de fratrie, obtenu ${barresFratrie.length}`);
}

const yBarres = barresFratrie.map((s) => s.y1!);
const yBarreBase = yEnfantHaut - 10;
const decalageMax = Math.max(...yBarres.map((y) => Math.abs(y - yBarreBase)));

if (yBarres.length > 1 && new Set(yBarres).size !== 1) {
  erreurs.push(
    `Groupes disjoints : une seule hauteur de barre attendue, obtenu ${new Set(yBarres).size} valeurs`
  );
}

if (decalageMax > COULOIR_MAX) {
  erreurs.push(
    `Décalage pedigree trop grand : ${decalageMax}px > ${COULOIR_MAX}px (couloir inter-rangées)`
  );
}

for (const yBarre of yBarres) {
  if (yBarre <= yParentBas || yBarre >= yEnfantHaut) {
    erreurs.push(`Barre de fratrie hors corridor : y=${yBarre} (attendu entre ${yParentBas} et ${yEnfantHaut})`);
  }
}

if (erreurs.length > 0) echouer(erreurs);

console.log(`OK — ${NB_UNIONS} unions disjointes : 1 couloir pedigree, segments dans le corridor.`);
