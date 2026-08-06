import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Rafraîchit la session à chaque requête et barre l'accès aux pages privées.
 *
 * Ce filtre est un premier tri, pas la sécurité : celle-ci est assurée par les
 * politiques RLS de Postgres. Un membre non validé qui contournerait cette
 * redirection ne lirait de toute façon aucune donnée familiale.
 *
 * Depuis Next 16, ce fichier s'appelle `proxy.ts` et non plus `middleware.ts`.
 */

/** Pages accessibles sans être connecté. */
const PUBLIQUES = ['/connexion', '/inscription', '/auth', '/erreur'];

export async function proxy(request: NextRequest) {
  let reponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'arbre' },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesAEcrire) {
          for (const { name, value } of cookiesAEcrire) {
            request.cookies.set(name, value);
          }
          reponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesAEcrire) {
            reponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // getUser() interroge le serveur d'authentification : contrairement à
  // getSession(), il ne se contente pas de croire le cookie.
  const { data: { user } } = await supabase.auth.getUser();

  const chemin = request.nextUrl.pathname;
  const estPublique = PUBLIQUES.some((p) => chemin === p || chemin.startsWith(`${p}/`));

  if (!user && !estPublique) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';

    // La destination doit garder ses paramètres : un membre à qui l'on envoie
    // le lien d'une branche précise doit y arriver après s'être connecté, et
    // non sur l'arbre par défaut.
    const destination = `${chemin}${request.nextUrl.search}`;
    url.search = '';
    url.searchParams.set('suite', destination);

    return NextResponse.redirect(url);
  }

  // Un compte connecté mais non encore validé n'a rien à faire ailleurs que
  // sur sa page d'attente.
  if (user && !estPublique && chemin !== '/attente') {
    const { data: membre } = await supabase
      .from('membres')
      .select('statut')
      .eq('id', user.id)
      .maybeSingle();

    if (!membre || membre.statut !== 'valide') {
      const url = request.nextUrl.clone();
      url.pathname = '/attente';
      const destination = `${chemin}${request.nextUrl.search}`;
      url.search = '';
      if (destination !== '/attente' && destination !== '/attente/') {
        url.searchParams.set('suite', destination);
      }
      return NextResponse.redirect(url);
    }
  }

  return reponse;
}

export const config = {
  matcher: [
    // Tout sauf les ressources statiques et les images.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
