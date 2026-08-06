#!/usr/bin/env node
/**
 * Bascule le projet vers Vercel en une passe :
 *   1. Pousse chaque variable de .env.local sur les 3 environnements Vercel.
 *   2. Ajoute le domaine arbre.modulyx.eu au projet.
 *   3. Déclenche un déploiement production, attend qu'il finisse, affiche l'URL.
 *
 * Suppose que :
 *   - Le CLI vercel est installé et authentifié (`vercel whoami` renvoie boublo).
 *   - Le dossier courant est lié au projet (`vercel link` a été fait, un dossier
 *     .vercel/ est présent).
 *   - .env.local existe à la racine et est renseigné.
 *
 * Lancement :
 *     node scripts/mise-en-ligne.mjs
 *
 * Le script est idempotent :
 *   - Si une variable existe déjà, `vercel env rm` puis `add` la remet à jour.
 *   - Si le domaine est déjà ajouté, Vercel renvoie une erreur qu'on ignore.
 *   - Si les env vars sont déjà en place, le script les met à jour sans casse.
 *
 * Ne commite JAMAIS ce script après l'avoir tourné : il ne stocke rien lui-même
 * (les valeurs viennent de .env.local, qui est gitignoré), mais l'output du
 * terminal peut contenir des extraits ; nettoie l'historique de ton shell si
 * tu ne veux pas garder trace.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const ENV_FICHIER = resolve(ROOT, '.env.local');
const DOMAINE = 'arbre.modulyx.eu';

// --- Guards ---------------------------------------------------------------

if (!existsSync(ENV_FICHIER)) {
  console.error(`✗ Introuvable : ${ENV_FICHIER}`);
  process.exit(1);
}

if (!existsSync(resolve(ROOT, '.vercel/project.json'))) {
  console.error('✗ Projet non lié. Lance d abord : vercel link --yes --project=arbre-leo --scope=boublos-projects');
  process.exit(1);
}

// --- Lecture .env.local ---------------------------------------------------

/** @type {Record<string, string>} */
const variables = {};
for (const ligne of readFileSync(ENV_FICHIER, 'utf8').split(/\r?\n/)) {
  const trim = ligne.trim();
  if (!trim || trim.startsWith('#')) continue;
  const i = trim.indexOf('=');
  if (i < 0) continue;
  const cle = trim.slice(0, i).trim();
  const val = trim.slice(i + 1).trim();
  // Vercel injecte VERCEL_* automatiquement — ne pas les uploader.
  if (cle.startsWith('VERCEL_')) continue;
  if (cle === 'TEST_PING') continue;
  variables[cle] = val;
}

const noms = Object.keys(variables);
console.log(`Trouvé ${noms.length} variables dans .env.local :\n  ${noms.join('\n  ')}\n`);

// --- Helper CLI -----------------------------------------------------------

function vercel(args, options = {}) {
  const res = spawnSync('vercel', args, {
    cwd: ROOT,
    encoding: 'utf8',
    input: options.input,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
  });
  return {
    code: res.status ?? 1,
    stdout: (res.stdout ?? '').trim(),
    stderr: (res.stderr ?? '').trim(),
  };
}

// --- 1. Envoi des variables ------------------------------------------------

console.log('=== Envoi des variables d environnement ===\n');
for (const [cle, valeur] of Object.entries(variables)) {
  for (const env of ['production', 'preview', 'development']) {
    // Ignorer les échecs de rm (si la var n'existait pas encore).
    vercel(['env', 'rm', cle, env, '--yes'], {});
    const { code, stderr } = vercel(['env', 'add', cle, env], { input: valeur + '\n' });
    if (code === 0) {
      console.log(`  ✓ ${cle.padEnd(34)} → ${env}`);
    } else {
      console.log(`  ✗ ${cle.padEnd(34)} → ${env}  (${stderr.split('\n').pop()})`);
    }
  }
}
console.log();

// --- 2. Domaine -----------------------------------------------------------

console.log('=== Domaine ===\n');
const { code: codeDom, stdout: outDom, stderr: errDom } = vercel(
  ['domains', 'add', DOMAINE, 'arbre-leo'],
  {}
);
if (codeDom === 0) {
  console.log(`  ✓ ${DOMAINE} ajouté au projet`);
} else if (errDom.includes('already') || outDom.includes('already')) {
  console.log(`  · ${DOMAINE} déjà présent, on continue`);
} else {
  console.log(`  ? ${DOMAINE} : ${errDom || outDom}`);
}
console.log();

// --- 3. Deploy production -------------------------------------------------

console.log('=== Déploiement production ===\n');
const { code: codeDep, stdout: outDep, stderr: errDep } = vercel(['--prod', '--yes'], {});
if (codeDep === 0) {
  const url = (outDep.match(/https?:\/\/\S+/g) ?? []).pop() ?? outDep;
  console.log(`  ✓ Déployé : ${url}\n`);
} else {
  console.log(`  ✗ Échec du déploiement :\n${errDep || outDep}\n`);
  process.exit(2);
}

// --- 4. Rappels post-mise-en-ligne ---------------------------------------

console.log('=== À faire à la main ensuite ===\n');
console.log(`  1. Configurer le CNAME chez Gandi (modulyx.eu → Enregistrements DNS) :`);
console.log(`     Type CNAME · Nom arbre · Valeur cname.vercel-dns.com`);
console.log(`     (sans .modulyx.eu à la fin — erreur fréquente chez Gandi)`);
console.log('');
console.log(`  2. Une fois arbre.modulyx.eu actif, mettre :`);
console.log(`     NEXT_PUBLIC_SITE_URL=https://arbre.modulyx.eu`);
console.log(`     dans .env.local, puis relancer ce script.`);
console.log('');
console.log(`  3. Supabase → Authentication → URL Configuration :`);
console.log(`     Site URL      = https://arbre.modulyx.eu`);
console.log(`     Redirect URLs = https://arbre.modulyx.eu,`);
console.log(`                     https://arbre.modulyx.eu/auth/callback`);
console.log('');
console.log(`  4. Supabase → Authentication → Email Templates :`);
console.log(`     Remplacer « Libertimax » par « L arbre de Léo » dans le`);
console.log(`     sujet et le corps de chaque template.`);
console.log('');
