#!/usr/bin/env node
/**
 * Vérifie que la prod arbre.modulyx.eu répond et redirige correctement.
 *
 *   npm run arbre:verifier-config-prod
 */
const ORIGINE = process.env.ARBRE_URL_PROD ?? 'https://arbre.modulyx.eu';

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

try {
  await verifier('/', [{ status: 307, locationContient: '/connexion' }]);
  await verifier('/arbre', [{ status: 307, locationContient: '/connexion' }]);
  await verifier('/connexion', [{ status: 200 }]);

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

console.log(`OK — ${ORIGINE} répond (redirection auth + page connexion).`);
console.log('  Rappel : vérifier manuellement Supabase Redirect URLs et NEXT_PUBLIC_SITE_URL sur Vercel.');
