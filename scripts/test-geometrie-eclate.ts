/** Test géométrique synthétique du mode éclaté. */
import type { DonneesArbre, PersonneArbre } from '../src/lib/arbre';
import { disposerArbre } from '../src/lib/layout-arbre';
import { planifierLiens, SEUIL_COUPLE_ADJACENT, SEUIL_PONT_COUPLE } from '../src/lib/geometrie-liens';

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
    ['parent_a', ['a1', 'a2']], ['parent_b', ['a1', 'a2']],
    ['focus', ['parent_a', 'conjoint']], ['fratrie', ['parent_a', 'conjoint']], ['cousin', ['parent_b']],
  ]);
  const enfants = new Map([
    ['a1', ['parent_a', 'parent_b']], ['a2', ['parent_a', 'parent_b']],
    ['parent_a', ['focus', 'fratrie']], ['conjoint', ['focus', 'fratrie']],
    ['parent_b', ['cousin']], ['focus', []], ['fratrie', []], ['cousin', []],
  ]);
  return { personnes, unions, parents, enfants };
}

function echouer(messages: string[]): never {
  console.error('Échec test géométrie éclatée :\n');
  for (const message of messages) console.error('  • ' + message);
  process.exit(1);
}

const donnees = construireGraphe();
const disposition = disposerArbre(donnees, 'focus', 'eclate');
const noeudParId = new Map(disposition.noeuds.map((noeud) => [noeud.personneId, noeud]));
const parentA = noeudParId.get('parent_a');
const conjoint = noeudParId.get('conjoint');
const focus = noeudParId.get('focus');
const fratrie = noeudParId.get('fratrie');
const a1 = noeudParId.get('a1');
const a2 = noeudParId.get('a2');
const erreurs: string[] = [];

if (!parentA || !conjoint || !focus || !fratrie || !a1 || !a2) echouer(['Nœuds synthétiques manquants.']);
if (parentA!.rang === conjoint!.rang) {
  const distance = Math.abs(parentA!.x - conjoint!.x);
  if (distance > SEUIL_COUPLE_ADJACENT) erreurs.push(`Couple trop éloigné : ${Math.round(distance)} px`);
  if (fratrie!.rang === parentA!.rang) {
    const min = Math.min(parentA!.x, conjoint!.x);
    const max = Math.max(parentA!.x, conjoint!.x);
    if (fratrie!.x > min && fratrie!.x < max) erreurs.push('Fratrie intercalée dans le couple');
  }
}

const { segments } = planifierLiens(donnees, disposition.liens, noeudParId, 'eclate');
const barresFratrie = segments.filter((segment) => segment.id.startsWith('fratrie-'));
const couplesHoriz = segments.filter((segment) =>
  segment.id.startsWith('couple-') && !segment.id.includes('stub') &&
  segment.kind === 'line' && segment.y1 === segment.y2
);
if (barresFratrie.length === 0) erreurs.push('Aucune barre de fratrie pedigree');
if (!barresFratrie.find((segment) => segment.id.includes(U_FOYER))) {
  erreurs.push('Barre de fratrie du foyer manquante');
}
for (const segment of couplesHoriz) {
  if (segment.x1 !== undefined && segment.x2 !== undefined && Math.abs(segment.x2 - segment.x1) > SEUIL_PONT_COUPLE) {
    erreurs.push(`Barre de couple trop longue : ${segment.id}`);
  }
}
const orthogonaux = segments.filter((segment) => segment.kind === 'path' && (segment.id.includes('->') || segment.d));
if (orthogonaux.length === 0 && disposition.liens.length > 4) erreurs.push('Liens orthogonaux attendus manquants');
if (erreurs.length > 0) echouer(erreurs);

console.log('OK — test géométrie éclatée synthétique :');
console.log(`  • barres de fratrie : ${barresFratrie.length}`);
console.log(`  • barres de couple : ${couplesHoriz.length}`);
console.log(`  • liens orthogonaux : ${orthogonaux.length}`);
