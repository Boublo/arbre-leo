import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { ListeNotifications } from '@/components/notifications/liste-notifications';
import { PreferencesRappels } from '@/components/notifications/preferences-rappels';
import {
  compterNotificationsNonLues,
  listerNotifications,
} from '@/app/actions/notifications';
import { lirePreferencesRappels } from '@/app/actions/rappels';
import { creerClientServeur } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Notifications' };

export const dynamic = 'force-dynamic';

export default async function PageNotifications() {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/connexion?suite=/notifications');

  const [notifications, nonLues, prefs] = await Promise.all([
    listerNotifications(50),
    compterNotificationsNonLues(),
    lirePreferencesRappels(),
  ]);

  return (
    <>
      <Navigation />
      <main id="contenu-principal" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-wider text-encre-tres-douce">Activité</p>
          <h1 className="mt-1 font-titre text-3xl text-encre">Notifications</h1>
          <p className="mt-2 text-sm text-encre-douce">
            Commentaires, nouvelles photos, souvenirs et demandes d’accès — tout ce qui bouge
            dans l’arbre, pour ne rien manquer.
          </p>
        </header>

        <ListeNotifications notifications={notifications} nonLues={nonLues} />

        {prefs && <PreferencesRappels prefs={prefs} />}
      </main>
    </>
  );
}
