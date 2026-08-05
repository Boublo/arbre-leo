import { redirect } from 'next/navigation';
import { creerClientServeur } from '@/lib/supabase/server';
import type { RoleMembre, StatutMembre } from '@/lib/types-base';

/**
 * Barrière d'entrée de l'administration.
 *
 * Le lien « Administration » n'est affiché qu'aux administrateurs, mais une
 * adresse se tape à la main : la page comme chaque action repassent donc par
 * ici, côté serveur. Les politiques RLS restent l'autorité finale — ce contrôle
 * évite surtout d'afficher une page vide ou une erreur brute à quelqu'un qui
 * n'a rien à faire là.
 */

export type AdministrateurCourant = {
  id: string;
  nom_affiche: string;
  role: RoleMembre;
  statut: StatutMembre;
};

export async function exigerAdmin() {
  const supabase = await creerClientServeur();

  // getUser() interroge le serveur d'authentification plutôt que de se fier au
  // seul cookie de session.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion?suite=/admin');

  const { data: moi } = await supabase
    .from('membres')
    .select('id, nom_affiche, role, statut')
    .eq('id', user.id)
    .maybeSingle();

  if (!moi || moi.statut !== 'valide' || moi.role !== 'admin') redirect('/');

  return { supabase, moi: moi as AdministrateurCourant };
}
