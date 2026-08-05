'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { BaseDeDonnees } from '@/lib/types-base';

/**
 * Client Supabase côté navigateur.
 *
 * Toutes les requêtes visent le schéma « arbre » : le schéma « public » de ce
 * projet appartient à une autre application.
 */
export function creerClientNavigateur() {
  return createBrowserClient<BaseDeDonnees, 'arbre'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'arbre' } }
  );
}
