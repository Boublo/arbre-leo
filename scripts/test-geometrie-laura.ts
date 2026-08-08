/** Test géométrique synthétique du mode famille. */
import type { DonneesArbre, PersonneArbre } from '../src/lib/arbre';
import { disposerArbre } from '../src/lib/layout-arbre';
import { planifierLiens, SEUIL_COUPLE_ADJACENT, SEUIL_PONT_COUPLE } from '../src/lib/geometrie-liens';

const SEUIL_RACCORD = 160;
const U_ASC = 'u_asc';
const U_FOYER = 'u_foyer';
const U_BRANCHE = 'u_branche';

function personne(id: string, libelle: string, issuDe: string | null, unions: string[] = []): PersonneArbre {
  return {
    id, codeGedcom: null, prenoms: libelle, nom: null, nomComplet: libelle,
    surnom: null, sexe: 'M', branches: ['test'], niveauxPreuve: [], presumeVivant: false,
    notes: null, photoId: null, photoUrl: null, naissance: null, deces: null,
    profession: null, unions, issuDe, inhumation: null, descendanceIncomplete: false,
  };
}

function construireGraphe(): DonneesArbre {
  const personnes = new Map<string, PersonneArbre>([
    ['a1', personne('a1', 'Ascendant un', null, [U_ASC])],
    ['a2', personne('a2', 'Ascendant deux', null, [U_ASC])],
    ['parent_a', personne('parent_a', 'Parent A', U_ASC, [U_FOYER])],
    ['parent_b', personne('parent_b', 'Parent B', U_ASC, [U_BRANCHE])],
    ['conjoint', personne('conjoint', 'Conjoint', null, [U_FOYER])],
    ['focus', personne('focus', 'Focus', U_FOYER)],
    ['fratrie', personne('fratrie', 'Fratrie', U_FOYER)],
    ['cousin', personne('cousin', 'Cousin', U_BRANCHE)],
  ]);
  const unions = new Map([
    [U_ASC, { id: U_ASC, conjointA: 'a1', conjointB: 'a2', enfants: ['parent_a', 'parent_b'], mariage: null }],
    [U_FOYER, { id: U_FOYER, conjointA: 'parent_a', conjointB: 'conjoint', enfants: ['focus', 'fratrie'], mariage: null }],
    [U_BRANCHE, { id: U_BRANCHE, conjointA: 'parent_b', conjointB: null, enfants: ['cousin'], mariage: null }],
  ]);
  const parents = new Map([
    ['a1', []], ['a2', []], ['parent_a', ['a1', 'a2']], ['parent_b', ['a1', 'a2']],
    ['conjoint', []], ['focus', ['parent_a', 'conjoint']], ['fratrie', ['parent_a', 'conjoint']], ['cousin', ['parent_b']],
  ]);
  const enfants = new Map([
    ['a1', ['parent_a', 'parent_b']], ['a2', ['parent_a', 'parent_b']],
    ['parent_a', ['focus', 'fratrie']], ['conjoint', ['focus', 'fratrie']],
    ['parent_b', ['cousin']], ['focus', []], ['fratrie', []], ['cousin', []],
  ]);
  return { personnes, unions, parents, enfants };
}

function echouer(messages: string[]): never {
  console.error('Échec test géométrie famille :\n');
  for (const message of messages) console.error('  • ' + message);
  process.exit(1);
}

const donnees = construireGraphe();
const disposition = disposerArbre(donnees, 'focus', 'famille');
const noeudParId = new Map(disposition.noeuds.map((noeud) => [noeud.personneId, noeud]));
const parentA = noeudParId.get('parent_a');
const conjoint = noeudParId.get('conjoint');
const focus = noeudParId.get('focus');
const fratrie = noeudParId.get('fratrie');
const cousin = noeudParId.get('cousin');
const parentB = noeudParId.get('parent_b');
const erreurs: string[] = [];

if (!parentA || !conjoint || !focus || !fratrie || !cousin || !parentB) echouer(['Nœuds synthétiques manquants.']);
const distanceCouple = Math.abs(parentA!.x - conjoint!.x);
const { segments } = planifierLiens(donnees, disposition.liens, noeudParId, 'famille');
for (const segment of segments) {
  if (segment.id.startsWith('couple-') && segment.kind === 'line' && segment.x1 !== undefined && segment.x2 !== undefined && segment.y1 === segment.y2) {
    if (Math.abs(segment.x2 - segment.x1) > SEUIL_PONT_COUPLE) erreurs.push(`Barre de couple trop longue : ${segment.id}`);
  }
}
if (distanceCouple > SEUIL_COUPLE_ADJACENT) erreurs.push(`Couple trop éloigné : ${Math.round(distanceCouple)} px`);
const minCouple = Math.min(parentA!.x, conjoint!.x);
const maxCouple = Math.max(parentA!.x, conjoint!.x);
if (parentB!.x > minCouple && parentB!.x < maxCouple) erreurs.push('Branche voisine intercalée dans le couple');

const centreParents = (parentA!.x + conjoint!.x) / 2;
const centreEnfants = (focus!.x + fratrie!.x) / 2;
if (Math.abs(centreParents - centreEnfants) > SEUIL_RACCORD) erreurs.push('Raccord parents-enfants trop long');
if (fratrie!.lien !== 'collateral') erreurs.push(`Lien fratrie inattendu : ${fratrie!.lien}`);
if (cousin!.lien !== 'cousin') erreurs.push(`Lien cousin inattendu : ${cousin!.lien}`);
if (erreurs.length > 0) echouer(erreurs);

console.log('OK — test géométrie famille synthétique :');
console.log(`  • couple : ${Math.round(distanceCouple)} px`);
console.log(`  • raccord parents-enfants : ${Math.round(Math.abs(centreParents - centreEnfants))} px`);
console.log(`  • liens : fratrie=${fratrie!.lien}, cousin=${cousin!.lien}`);
