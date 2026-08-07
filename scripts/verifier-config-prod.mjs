#!/usr/bin/env node
/**
 * Vérifie que la prod arbre.modulyx.eu répond et redirige correctement.
 *
 *   npm run arbre:verifier-config-prod
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGINE = process.env.ARBRE_URL_PROD ?? 'https://arbre.modulyx.eu';
const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

const erreurs = [];

async function verifier(chemin, attentes) {
  const url = `${ORIGINE}${chemin}`;
  const reponse = await fetch(url, { redirect: 'manual' });
  const location = reponse.headers.get('location') ?? '';

  for (const { status, locationContient } of attentes) {
    if (status !== undefined && reponse.status !== status) {
      erreurs.push(`${chemin} : statut ${reponse.status} (attendu ${status})`);
    }
    if (locationContient && !location.includes(locationContient)) {
      erreurs.push(`${chemin} : Location « ${location} » ne contient pas « ${locationContient} »`);
    }
  }
}

/** Le cron Vercel doit atteindre le handler JSON, pas la page de connexion. */
async function verifierCronRappels() {
  const chemin = '/api/cron/rappels-anniversaires';
  const reponse = await fetch(`${ORIGINE}${chemin}`, { redirect: 'manual' });
  const location = reponse.headers.get('location') ?? '';

  if (reponse.status === 307 || reponse.status === 302 || location.includes('/connexion')) {
    erreurs.push(
      `${chemin} : redirigé vers la connexion — ajouter /api/cron aux routes publiques du proxy`
    );
    return;
  }

  const corps = await reponse.text();
  if (!corps.trimStart().startsWith('{')) {
    erreurs.push(`${chemin} : réponse non JSON (statut ${reponse.status})`);
    return;
  }

  if (reponse.status !== 401 && reponse.status !== 503) {
    erreurs.push(`${chemin} : statut ${reponse.status} (attendu 401 sans secret ou 503 si CRON_SECRET absent)`);
  }
}

function verifierProxyCron() {
  const source = readFileSync(join(racine, 'src/proxy.ts'), 'utf8');
  if (!source.includes("'/api/cron'")) {
    erreurs.push('src/proxy.ts : /api/cron absent des routes publiques');
  }
}

try {
  verifierProxyCron();

  await verifier('/', [{ status: 307, locationContient: '/connexion' }]);
  await verifier('/arbre', [{ status: 307, locationContient: '/connexion' }]);
  await verifier('/connexion', [{ status: 200 }]);
  await verifierCronRappels();

  const accueil = await fetch(`${ORIGINE}/connexion`);
  const html = await accueil.text();
  if (!html.includes('Se connecter')) {
    erreurs.push('Page /connexion : formulaire introuvable');
  }
} catch (cause) {
  erreurs.push(`Impossible de joindre ${ORIGINE} : ${cause instanceof Error ? cause.message : cause}`);
}

if (erreurs.length > 0) {
  console.error('Échec vérification config prod :\n');
  for (const e of erreurs) console.error('  •', e);
  process.exit(1);
}

console.log(`OK — ${ORIGINE} répond (redirection auth, cron JSON, page connexion).`);
console.log('  Rappel : CRON_SECRET, RESEND_API_KEY et SUPABASE_SERVICE_ROLE_KEY sur Vercel Production.');
