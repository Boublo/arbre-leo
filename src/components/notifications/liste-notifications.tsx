'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  marquerNotificationLue,
  marquerToutesNotificationsLues,
} from '@/app/actions/notifications';
import type { NotificationAffichee } from '@/lib/notifications';

export function ListeNotifications({
  notifications,
  nonLues,
}: {
  notifications: NotificationAffichee[];
  nonLues: number;
}) {
  const router = useRouter();
  const [enCours, startTransition] = useTransition();

  function rafraichir() {
    startTransition(() => router.refresh());
  }

  async function marquerLue(id: string) {
    const donnees = new FormData();
    donnees.set('id', id);
    await marquerNotificationLue({}, donnees);
    rafraichir();
  }

  async function toutLu() {
    await marquerToutesNotificationsLues();
    rafraichir();
  }

  if (notifications.length === 0) {
    return (
      <div className="carte p-8 text-center">
        <p className="font-titre text-xl text-encre">Rien pour le moment</p>
        <p className="mt-2 text-sm text-encre-douce">
          Vous serez prévenu ici des nouveaux commentaires, photos, souvenirs et demandes
          d’accès à l’arbre.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {nonLues > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toutLu}
            disabled={enCours}
            className="text-sm text-accent transition hover:underline disabled:opacity-50"
          >
            Tout marquer comme lu ({nonLues})
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <article
              className={`carte flex gap-4 p-4 sm:p-5 ${
                notification.lu ? '' : 'border-accent/30 bg-accent-clair/20'
              }`}
            >
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fond-doux text-lg"
              >
                {notification.icone}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="font-medium text-encre">{notification.titre}</h2>
                  <span className="text-xs text-encre-tres-douce">
                    {notification.libelleType} · {notification.creeLe}
                  </span>
                </div>
                {notification.corps && (
                  <p className="mt-1 text-sm leading-relaxed text-encre-douce">{notification.corps}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {notification.lien && (
                    <Link
                      href={notification.lien}
                      onClick={() => {
                        if (!notification.lu) void marquerLue(notification.id);
                      }}
                      className="font-medium text-accent transition hover:underline"
                    >
                      Ouvrir →
                    </Link>
                  )}
                  {!notification.lu && (
                    <button
                      type="button"
                      onClick={() => marquerLue(notification.id)}
                      className="text-encre-tres-douce transition hover:text-encre"
                    >
                      Marquer comme lu
                    </button>
                  )}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
