/**
 * Test ascendance profonde — chaîne d'ancêtres + piège sous-graphe BFS.
 *
 *   npx tsx scripts/test-geometrie-ascendance.ts
 *
 * Prouve pourquoi /arbre doit envoyer le graphe complet : un sous-graphe
 * à profondeur 4 tronque la 5ᵉ génération et réduit rangMax.
 */
import type { DonneesArbre, PersonneArbre } from '../src/lib/arbre';
import { disposerArbre, HAUTEUR_NOEUD } from '../src/lib/layout-arbre';
import {
  extraireSousGraphe,
  PROFONDEUR_SOUS_GRAPHE_ARBRE,
} from '../src/lib/arbre-graphe';

const GENERATIONS = 5;
const SEUIL_K_LISIBLE = 0.5;

function personne(id: string, issuDe: string | null): PersonneArbre {
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
    unions: [],
    issuDe,
    inhumation: null,
    descendanceIncomplete: false,
  };
}

/** Chaîne linéaire g0 → g1 → … → gN (g0 = focus, jeune). */
function construireChaine(generations: number): DonneesArbre {
  const personnes = new Map<string, PersonneArbre>();
  const parents = new Map<string, string[]>();
  const enfants = new Map<string, string[]>();

  for (let i = 0; i <= generations; i++) {
    const id = `g${i}`;
    const parentId = i < generations ? `g${i + 1}` : null;
    personnes.set(id, personne(id, parentId ? `u_${i}` : null));
    if (parentId) {
      parents.set(id, [parentId]);
      enfants.set(parentId, [id]);
    }
  }

  return { personnes, unions: new Map(), parents, enfants };
}

function echouer(messages: string[]): never {
  console.error('Échec test géométrie ascendance :\n');
  for (const m of messages) console.error('  • ' + m);
  process.exit(1);
}

const donnees = construireChaine(GENERATIONS);
const disposition = disposerArbre(donnees, 'g0', 'ascendance');

const erreurs: string[] = [];

if (disposition.rangMax < GENERATIONS) {
  erreurs.push(
    `rangMax = ${disposition.rangMax}, attendu ≥ ${GENERATIONS} (chaîne complète)`
  );
}
if (disposition.noeuds.length !== GENERATIONS + 1) {
  erreurs.push(
    `nœuds = ${disposition.noeuds.length}, attendu ${GENERATIONS + 1} sur la chaîne`
  );
}

const focus = disposition.noeuds.find((n) => n.personneId === 'g0');
const ancetre = disposition.noeuds.find((n) => n.personneId === `g${GENERATIONS}`);
if (!focus || focus.rang !== 0) {
  erreurs.push('Le focus g0 doit être au rang 0');
}
if (!ancetre || ancetre.rang !== GENERATIONS) {
  erreurs.push(`L'ancêtre g${GENERATIONS} doit être au rang ${GENERATIONS}`);
}

// Simulation recadrer : k fixe 1.0 (comme vue-arbre.tsx desktop)
const kRecadrer = 1.0;
if (kRecadrer < SEUIL_K_LISIBLE) {
  erreurs.push(`k recadrer ${kRecadrer} < seuil lisible ${SEUIL_K_LISIBLE}`);
}

// Piège sous-graphe : profondeur BFS 4 ne suffit pas pour 5 sauts parentaux
const sousGraphe = extraireSousGraphe(donnees, 'g0', PROFONDEUR_SOUS_GRAPHE_ARBRE);
const dispositionTronquee = disposerArbre(sousGraphe, 'g0', 'ascendance');
if (dispositionTronquee.rangMax >= disposition.rangMax) {
  erreurs.push(
    'Le sous-graphe BFS ne tronque pas la chaîne — le test garde-fou est invalide'
  );
}

// Fit-all simulé sur grand arbre : k serait minuscule
const viewportW = 1200;
const viewportH = 800;
const marge = 90;
const kFitAll = Math.min(
  (viewportW - marge * 2) / Math.max(disposition.largeur, 1),
  (viewportH - marge * 2) / Math.max(disposition.hauteur + HAUTEUR_NOEUD, 1),
  1.1
);
if (kFitAll >= kRecadrer) {
  erreurs.push(
    `fit-all k=${kFitAll.toFixed(3)} devrait être < recadrer k=${kRecadrer} sur ascendance profonde`
  );
}

if (erreurs.length > 0) echouer(erreurs);

console.log('OK — test ascendance profonde (layout réel) :');
console.log(`  • ${disposition.noeuds.length} nœuds, rangMax = ${disposition.rangMax}`);
console.log(
  `  • sous-graphe BFS(${PROFONDEUR_SOUS_GRAPHE_ARBRE}) → rangMax = ${dispositionTronquee.rangMax} (tronqué)`
);
console.log(`  • k recadrer = ${kRecadrer}, k fit-all simulé = ${kFitAll.toFixed(3)}`);
