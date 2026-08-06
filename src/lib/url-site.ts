/**
 * URL publique du site, sans slash final.
 *
 * Sert aux liens de confirmation e-mail et aux redirections canoniques.
 * En production, `NEXT_PUBLIC_SITE_URL` doit pointer vers le domaine définitif
 * (par ex. https://arbre.modulyx.eu), pas vers une URL *.vercel.app de
 * secours — sinon les nouveaux inscrits arrivent sur le mauvais hôte.
 */
export function obtenirUrlSite(): string {
  const depuisEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (depuisEnv) return depuisEnv.replace(/\/$/, '');

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}
