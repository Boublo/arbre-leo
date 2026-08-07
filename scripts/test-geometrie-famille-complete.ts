/**
 * Régression famille : conjoints et cousins ne dépendent pas de l'ordre des unions.
 */
import type { DonneesArbre, PersonneArbre, UnionArbre } from '../src/lib/arbre';
import { disposerArbre } from '../src/lib/layout-arbre';
import { planifierLiens, SEUIL_COUPLE_ADJACENT } from '../src/lib/geometrie-liens';

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
    inhumation: null,
    descendanceIncomplete: false,
  };
}

const personnes = new Map<string, PersonneArbre>([
  ['grand-pere', personne('grand-pere', null, ['grands-parents'])],
  ['grand-mere', personne('grand-mere', null, ['grands-parents'])],
  ['parent', personne('parent', 'grands-parents', ['parents-focus'])],
  ['autre-parent', personne('autre-parent', null, ['parents-focus'])],
  ['oncle', personne('oncle', 'grands-parents', ['oncle-tante'])],
  ['tante', personne('tante', null, ['oncle-tante'])],
  ['focus', personne('focus', 'parents-focus')],
  ['cousine', personne('cousine', 'oncle-tante')],
]);

// L'union de l'oncle précède volontairement celle qui rend l'oncle visible.
// Un parcours en une seule passe perdait alors la tante et la cousine.
const unions = new Map<string, UnionArbre>([
  [
    'oncle-tante',
    {
      id: 'oncle-tante',
      conjointA: 'oncle',
      conjointB: 'tante',
      enfants: ['cousine'],
      mariage: null,
    },
  ],
  [
    'grands-parents',
    {
      id: 'grands-parents',
      conjointA: 'grand-pere',
      conjointB: 'grand-mere',
      enfants: ['parent', 'oncle'],
      mariage: null,
    },
  ],
  [
    'parents-focus',
    {
      id: 'parents-focus',
      conjointA: 'parent',
      conjointB: 'autre-parent',
      enfants: ['focus'],
      mariage: null,
    },
  ],
]);

const parents = new Map<string, string[]>([
  ['parent', ['grand-pere', 'grand-mere']],
  ['oncle', ['grand-pere', 'grand-mere']],
  ['focus', ['parent', 'autre-parent']],
  ['cousine', ['oncle', 'tante']],
]);
const enfants = new Map<string, string[]>([
  ['grand-pere', ['parent', 'oncle']],
  ['grand-mere', ['parent', 'oncle']],
  ['parent', ['focus']],
  ['autre-parent', ['focus']],
  ['oncle', ['cousine']],
  ['tante', ['cousine']],
]);

const donnees: DonneesArbre = { personnes, unions, parents, enfants };
const disposition = disposerArbre(donnees, 'focus', 'famille');
const noeudParId = new Map(disposition.noeuds.map((noeud) => [noeud.personneId, noeud]));
const erreurs: string[] = [];

for (const id of ['oncle', 'tante', 'cousine']) {
  if (!noeudParId.has(id)) erreurs.push(`Nœud familial manquant : ${id}`);
}

const oncle = noeudParId.get('oncle');
const tante = noeudParId.get('tante');
if (oncle && tante && Math.abs(oncle.x - tante.x) > SEUIL_COUPLE_ADJACENT) {
  erreurs.push('Le couple oncle–tante n’est pas adjacent');
}

const { segments } = planifierLiens(
  donnees,
  disposition.liens,
  noeudParId,
  disposition.mode
);
if (!segments.some((segment) => segment.id === 'fratrie-oncle-tante')) {
  erreurs.push('Le lien oncle/tante → cousine est manquant');
}

if (erreurs.length > 0) {
  console.error(erreurs.map((erreur) => `• ${erreur}`).join('\n'));
  process.exit(1);
}

console.log('OK — famille complète indépendamment de l’ordre des unions.');
