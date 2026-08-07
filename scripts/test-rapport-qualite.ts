/**
 * Jeu de données fictif du rapport de qualité.
 *
 * Exécution : npx tsx scripts/test-rapport-qualite.ts
 *
 * Les noms, dates et identifiants ci-dessous sont inventés. Ce test vérifie
 * que les alertes restent de simples signaux lisibles, jamais des corrections.
 */
import { analyserCoherence } from '../src/lib/coherence';
import type { DonneesArbre, PersonneArbre } from '../src/lib/arbre';

function personne(
  id: string,
  nomComplet: string,
  naissance: number | null,
  deces: number | null = null,
  unions: string[] = [],
  issuDe: string | null = null,
): PersonneArbre {
  return {
    id,
    codeGedcom: null,
    prenoms: nomComplet,
    nom: null,
    nomComplet,
    surnom: null,
    sexe: 'inconnu',
    branches: [],
    niveauxPreuve: [],
    presumeVivant: false,
    notes: null,
    photoId: null,
    photoUrl: null,
    naissance: naissance === null ? null : { annee: naissance, mois: null, jour: null, texte: '', lieu: null, lieuCourt: null, lieuId: null },
    deces: deces === null ? null : { annee: deces, mois: null, jour: null, texte: '', lieu: null, lieuCourt: null, lieuId: null },
    inhumation: null,
    profession: null,
    unions,
    issuDe,
    descendanceIncomplete: false,
  };
}

const donnees: DonneesArbre = {
  personnes: new Map([
    ['chronologie', personne('chronologie', 'Cas chronologique', 1980, 1970)],
    ['parent-tardif', personne('parent-tardif', 'Parent tardif', 1990, null, ['u-tardif'])],
    ['enfant-tot', personne('enfant-tot', 'Enfant trop tôt', 1980, null, [], 'u-tardif')],
    ['parent-age', personne('parent-age', 'Parent âgé', 1900, null, ['u-age'])],
    ['enfant-age', personne('enfant-age', 'Enfant écarté', 1980, null, [], 'u-age')],
    ['isolee', personne('isolee', 'Personne isolée', 1950)],
    ['doublon-a', personne('doublon-a', 'Alex Exemple', 1940)],
    ['doublon-b', personne('doublon-b', 'Alex Exemple', 1940)],
  ]),
  unions: new Map([
    ['u-tardif', { id: 'u-tardif', conjointA: 'parent-tardif', conjointB: null, enfants: ['enfant-tot'], mariage: null }],
    ['u-age', { id: 'u-age', conjointA: 'parent-age', conjointB: null, enfants: ['enfant-age'], mariage: null }],
  ]),
  parents: new Map([
    ['chronologie', []],
    ['parent-tardif', []],
    ['enfant-tot', ['parent-tardif']],
    ['parent-age', []],
    ['enfant-age', ['parent-age']],
    ['isolee', []],
    ['doublon-a', []],
    ['doublon-b', []],
  ]),
  enfants: new Map([
    ['chronologie', []],
    ['parent-tardif', ['enfant-tot']],
    ['enfant-tot', []],
    ['parent-age', ['enfant-age']],
    ['enfant-age', []],
    ['isolee', []],
    ['doublon-a', []],
    ['doublon-b', []],
  ]),
};

const rapport = analyserCoherence(donnees);
const titres = new Set(rapport.anomalies.map((anomalie) => anomalie.titre));

for (const titre of [
  'Décès antérieur à la naissance',
  'Enfant né avant le parent',
  'Écart d’âge parent–enfant inhabituel',
  'Personne isolée',
  'Doublon potentiel',
]) {
  if (!titres.has(titre)) throw new Error(`Alerte attendue absente : ${titre}`);
}

if (rapport.doublons.length !== 1 || rapport.doublons[0]?.personneIds.length !== 2) {
  throw new Error('Le doublon fictif devrait être signalé, sans fusion.');
}

if (!rapport.anomalies.some((anomalie) => anomalie.severite === 'critique')) {
  throw new Error('Le rapport devrait distinguer au moins une anomalie critique.');
}

console.log(`OK — rapport qualité fictif : ${rapport.anomalies.length} alertes, ${rapport.doublons.length} doublon potentiel.`);
