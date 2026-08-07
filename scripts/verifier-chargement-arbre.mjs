#!/usr/bin/env node
/**
 * Garde-fou : /arbre charge un sous-graphe focus (ascendance complète + BFS),
 * pas un BFS seul qui tronque la lignée profonde.
 *
 * Les portraits sont signés côté client pour les nœuds visibles seulement
 * (voir useRafraichirPhotosArbre), pas en bloc au chargement serveur.
 *
 *   node scripts/verifier-chargement-arbre.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

function lire(chemin) {
  return readFileSync(join(racine, chemin), 'utf8');
}

const erreurs = [];

const page = lire('src/app/arbre/page.tsx');
const action = lire('src/app/actions/arbre.ts');
const ecran = lire('src/components/arbre/ecran-arbre.tsx');
const photos = lire('src/components/arbre/use-rafraichir-photos-arbre.ts');
const graphe = lire('src/lib/arbre-graphe.ts');

if (page.includes('extraireSousGraphe(') && !page.includes('extraireSousGraphePourArbre')) {
  erreurs.push(
    'page.tsx : extraireSousGraphe seul tronque l’ascendance — utiliser chargerGrapheArbreFocus'
  );
}
if (!page.includes('chargerGrapheArbreFocus')) {
  erreurs.push('page.tsx : chargerGrapheArbreFocus pour le graphe autour du focus');
}
if (!page.includes('chargerPersonnesRechercheArbre')) {
  erreurs.push('page.tsx : chargerPersonnesRechercheArbre pour la palette de recherche');
}
if (!/serialiserGraphe\s*\(\s*donnees\s*\)/.test(page)) {
  erreurs.push('page.tsx : le graphe client doit être serialiserGraphe(donnees)');
}

if (action.includes('extraireSousGraphe(') && !action.includes('extraireSousGraphePourArbre')) {
  erreurs.push(
    'actions/arbre.ts : extraireSousGraphe seul tronque l’ascendance — utiliser chargerGrapheArbreFocus'
  );
}
if (!action.includes('chargerGrapheArbreFocus')) {
  erreurs.push('actions/arbre.ts : chargerGrapheArbreFocus pour recharger le focus');
}
if (!/serialiserGraphe\s*\(\s*donnees\s*\)/.test(action)) {
  erreurs.push('actions/arbre.ts : chargerGrapheArbre doit renvoyer serialiserGraphe(donnees)');
}

if (!graphe.includes('extraireSousGraphePourArbre')) {
  erreurs.push(
    'arbre-graphe.ts : extraireSousGraphePourArbre doit préserver ascendance et descendance complètes'
  );
}

if (!ecran.includes('useRafraichirPhotosArbre(graphe, setGraphe, idsPhotosVisibles)')) {
  erreurs.push(
    'ecran-arbre.tsx : useRafraichirPhotosArbre doit recevoir les ids visibles pour la signature lazy'
  );
}
if (!photos.includes('idsVisibles')) {
  erreurs.push('use-rafraichir-photos-arbre.ts : signature limitée aux personnes visibles');
}

if (erreurs.length > 0) {
  console.error('Échec verifier-chargement-arbre :\n');
  for (const e of erreurs) console.error('  • ' + e);
  process.exit(1);
}

console.log(
  'OK — chargement arbre : sous-graphe focus (ascendance complète), recherche légère, photos lazy.'
);
