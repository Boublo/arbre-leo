import { createClient } from '@supabase/supabase-js';
import type { BaseDeDonnees } from '@/lib/types-base';

/**
 * Client Supabase service role — réservé aux tâches planifiées (cron rappels).
 * Ne jamais exposer au navigateur.
 */
export function creerClientService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL manquant.');
  }

  return createClient<BaseDeDonnees, 'arbre'>(url, cle, {
    db: { schema: 'arbre' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
