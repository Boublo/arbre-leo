#!/usr/bin/env node
/**
 * Garde-fou : /arbre doit charger le graphe COMPLET côté client.
 *
 * Un sous-graphe BFS (profondeur 4) tronque l'ascendance profonde et casse
 * le layout — régression observée août 2026 (Mathias, 5+ générations).
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

if (page.includes('extraireSousGraphe')) {
  erreurs.push(
    'page.tsx : extraireSousGraphe ne doit pas être utilisé — ascendance tronquée'
  );
}
if (!/serialiserGraphe\s*\(\s*donnees\s*\)/.test(page)) {
  erreurs.push(
    'page.tsx : le graphe client doit être serialiserGraphe(donnees), pas un sous-graphe'
  );
}
if (!page.includes("signerPhotosPour: 'aucun'")) {
  erreurs.push(
    "page.tsx : chargerArbre({ signerPhotosPour: 'aucun' }) pour éviter de signer toutes les photos au SSR"
  );
}

if (action.includes('extraireSousGraphe')) {
  erreurs.push(
    'actions/arbre.ts : chargerGrapheArbre ne doit pas extraire un sous-graphe'
  );
}
if (!/serialiserGraphe\s*\(\s*donnees\s*\)/.test(action)) {
  erreurs.push(
    'actions/arbre.ts : chargerGrapheArbre doit renvoyer serialiserGraphe(donnees)'
  );
}
if (!action.includes("signerPhotosPour: 'aucun'")) {
  erreurs.push(
    "actions/arbre.ts : chargerGrapheArbre doit charger sans signatures photo serveur"
  );
}

if (!ecran.includes('useRafraichirPhotosArbre(graphe, setGraphe, idsPhotosVisibles)')) {
  erreurs.push(
    'ecran-arbre.tsx : useRafraichirPhotosArbre doit recevoir les ids visibles pour la signature lazy'
  );
}
if (!photos.includes('idsVisibles')) {
  erreurs.push(
    'use-rafraichir-photos-arbre.ts : signature limitée aux personnes visibles'
  );
}

if (erreurs.length > 0) {
  console.error('Échec verifier-chargement-arbre :\n');
  for (const e of erreurs) console.error('  • ' + e);
  process.exit(1);
}

console.log('OK — chargement arbre : graphe complet côté client, photos signées à la demande.');
