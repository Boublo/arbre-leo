import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { BaseDeDonnees } from '@/lib/types-base';

/**
 * Client Supabase côté serveur, adossé aux cookies de la requête.
 *
 * `cookies()` est asynchrone depuis Next 16 : cette fonction doit être awaitée.
 */
export async function creerClientServeur() {
  const magasin = await cookies();

  return createServerClient<BaseDeDonnees, 'arbre'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'arbre' },
      cookies: {
        getAll: () => magasin.getAll(),
        setAll(cookiesAEcrire) {
          try {
            for (const { name, value, options } of cookiesAEcrire) {
              magasin.set(name, value, options);
            }
          } catch {
            // Appelé depuis un Server Component : l'écriture de cookies y est
            // interdite. Le rafraîchissement de session est assuré par proxy.ts,
            // on peut donc ignorer sans risque.
          }
        },
      },
    }
  );
}
