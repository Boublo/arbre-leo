/**
 * Ascendance : deux parents sur la même rangée doivent rester adjacents
 * pour que la barre dorée et le pedigree soient lisibles.
 */
import type { DonneesArbre, PersonneArbre, UnionArbre } from '../src/lib/arbre';
import { disposerArbre } from '../src/lib/layout-arbre';
import {
  conjointsAdjacents,
  planifierLiens,
  SEUIL_COUPLE_ADJACENT,
} from '../src/lib/geometrie-liens';

const U_PIERRE_SOPHIE = 'u_pierre_sophie';

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

function construire(): DonneesArbre {
  const personnes = new Map<string, PersonneArbre>([
    ['gp1', personne('gp1', 'Aïeul', null, ['u_gp'])],
    ['gp2', personne('gp2', 'Aïeule', null, ['u_gp'])],
    ['pierre', personne('pierre', 'Pierre', 'u_gp', [U_PIERRE_SOPHIE])],
    ['sophie', personne('sophie', 'Sophie', null, [U_PIERRE_SOPHIE])],
    ['laura', personne('laura', 'Laura', U_PIERRE_SOPHIE)],
    ['leo', personne('leo', 'Léo', U_PIERRE_SOPHIE)],
  ]);

  const unions = new Map<string, UnionArbre>([
    [
      'u_gp',
      {
        id: 'u_gp',
        conjointA: 'gp1',
        conjointB: 'gp2',
        enfants: ['pierre'],
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
  ]);

  const parents = new Map([
    ['pierre', ['gp1', 'gp2']],
    ['laura', ['pierre', 'sophie']],
    ['leo', ['pierre', 'sophie']],
  ]);
  const enfants = new Map([
    ['gp1', ['pierre']],
    ['gp2', ['pierre']],
    ['pierre', ['laura', 'leo']],
    ['sophie', ['laura', 'leo']],
  ]);

  return { personnes, unions, parents, enfants };
}

const donnees = construire();
const disposition = disposerArbre(donnees, 'laura', 'ascendance');
const noeudParId = new Map(disposition.noeuds.map((n) => [n.personneId, n]));
const erreurs: string[] = [];

const pierre = noeudParId.get('pierre');
const sophie = noeudParId.get('sophie');
if (!pierre || !sophie) {
  erreurs.push('Pierre ou Sophie absents en ascendance');
} else {
  const dist = Math.abs(pierre.x - sophie.x);
  if (dist > SEUIL_COUPLE_ADJACENT) {
    erreurs.push(
      `Couple Pierre–Sophie trop éloignés en ascendance : ${Math.round(dist)} px`
    );
  }
  if (!conjointsAdjacents(pierre, sophie)) {
    erreurs.push('Pierre et Sophie ne sont pas adjacents (barre dorée absente)');
  }
}

const { segments } = planifierLiens(
  donnees,
  disposition.liens,
  noeudParId,
  'ascendance'
);
if (!segments.some((s) => s.id === `couple-${U_PIERRE_SOPHIE}`)) {
  erreurs.push('Barre dorée Pierre–Sophie manquante en ascendance');
}

if (erreurs.length > 0) {
  console.error(erreurs.map((e) => `• ${e}`).join('\n'));
  process.exit(1);
}

console.log('OK — ascendance : couple Pierre–Sophie adjacent et barre dorée présente.');
