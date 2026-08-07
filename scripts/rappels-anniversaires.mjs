/**
 * Déclenche manuellement les rappels d'anniversaires (même logique que le cron Vercel).
 *
 *   CRON_SECRET=… NEXT_PUBLIC_SITE_URL=… RESEND_API_KEY=… \
 *   SUPABASE_SERVICE_ROLE_KEY=… node scripts/rappels-anniversaires.mjs
 */

const secret = process.env.CRON_SECRET;
const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

if (!secret) {
  console.error('Variable CRON_SECRET manquante.');
  process.exit(2);
}

const url = `${base}/api/cron/rappels-anniversaires?secret=${encodeURIComponent(secret)}`;
const reponse = await fetch(url);
const corps = await reponse.json();

if (!reponse.ok) {
  console.error('Échec :', corps);
  process.exit(1);
}

console.log(JSON.stringify(corps, null, 2));
