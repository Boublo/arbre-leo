'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  compterNotificationsNonLues,
  listerNotifications,
  marquerNotificationLue,
  marquerToutesNotificationsLues,
} from '@/app/actions/notifications';
import type { NotificationAffichee } from '@/lib/notifications';
import { styleMenuAncre, useFermerMenuAncre, useMenuAncre } from '@/lib/menu-ancre';

/**
 * Cloche de navigation : pastille de non-lus et aperçu des dernières alertes.
 */
export function ClocheNotifications() {
  const [ouvert, setOuvert] = useState(false);
  const [nonLues, setNonLues] = useState(0);
  const [liste, setListe] = useState<NotificationAffichee[]>([]);
  const [enChargement, startTransition] = useTransition();
  const ancreRef = useRef<HTMLButtonElement>(null);
  const { menuRef, position } = useMenuAncre(ouvert, ancreRef, { aligner: 'droite' });

  const charger = () => {
    startTransition(async () => {
      const [compte, notifications] = await Promise.all([
        compterNotificationsNonLues(),
        listerNotifications(8),
      ]);
      setNonLues(compte);
      setListe(notifications);
    });
  };

  useEffect(() => {
    charger();
    const intervalle = window.setInterval(charger, 60_000);
    return () => window.clearInterval(intervalle);
  }, []);

  useFermerMenuAncre(ouvert, () => setOuvert(false), ancreRef, menuRef);

  async function ouvrirNotification(notification: NotificationAffichee) {
    if (!notification.lu) {
      const donnees = new FormData();
      donnees.set('id', notification.id);
      await marquerNotificationLue({}, donnees);
      charger();
    }
    setOuvert(false);
  }

  async function toutMarquerLu() {
    await marquerToutesNotificationsLues();
    charger();
  }

  const panneau = ouvert
    ? createPortal(
        <div
          ref={(el) => {
            menuRef.current = el;
          }}
          role="menu"
          style={styleMenuAncre(position)}
          className="fixed z-[60] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--rayon)] border border-bordure bg-fond-carte shadow-[var(--ombre-forte)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-bordure px-4 py-3">
            <p className="text-sm font-medium text-encre">Notifications</p>
            {nonLues > 0 && (
              <button
                type="button"
                onClick={toutMarquerLu}
                className="text-xs text-accent transition hover:underline"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <ul className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {enChargement && liste.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-encre-tres-douce">Chargement…</li>
            ) : liste.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-encre-tres-douce">
                Rien pour le moment. Les nouveaux commentaires, photos et demandes d’accès
                apparaîtront ici.
              </li>
            ) : (
              liste.map((notification) => (
                <li key={notification.id} className="border-b border-bordure last:border-b-0">
                  {notification.lien ? (
                    <Link
                      href={notification.lien}
                      role="menuitem"
                      onClick={() => ouvrirNotification(notification)}
                      className={`flex gap-3 px-4 py-3 transition hover:bg-fond-doux ${
                        notification.lu ? 'opacity-80' : 'bg-accent-clair/30'
                      }`}
                    >
                      <LigneNotification notification={notification} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => ouvrirNotification(notification)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-fond-doux ${
                        notification.lu ? 'opacity-80' : 'bg-accent-clair/30'
                      }`}
                    >
                      <LigneNotification notification={notification} />
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>

          <div className="border-t border-bordure px-4 py-2.5 text-center">
            <Link
              href="/notifications"
              onClick={() => setOuvert(false)}
              className="text-xs font-medium text-accent transition hover:underline"
            >
              Voir tout l’historique
            </Link>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative">
      <button
        ref={ancreRef}
        type="button"
        onClick={() => {
          setOuvert((v) => !v);
          if (!ouvert) charger();
        }}
        aria-expanded={ouvert}
        aria-haspopup="true"
        aria-label={
          nonLues > 0
            ? `Notifications : ${nonLues} non lue${nonLues > 1 ? 's' : ''}`
            : 'Notifications'
        }
        className="relative grid min-h-11 min-w-11 place-items-center rounded-[var(--rayon-petit)] text-encre-douce transition hover:bg-fond-doux hover:text-encre"
      >
        <span aria-hidden className="text-lg leading-none">
          🔔
        </span>
        {nonLues > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-alerte px-1 text-[10px] font-semibold text-accent-contraste">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {panneau}
    </div>
  );
}

function LigneNotification({ notification }: { notification: NotificationAffichee }) {
  return (
    <>
      <span
        aria-hidden
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fond-doux text-sm"
      >
        {notification.icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-encre">{notification.titre}</span>
          {!notification.lu && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
          )}
        </span>
        {notification.corps && (
          <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-encre-douce">
            {notification.corps}
          </span>
        )}
        <span className="mt-1 block text-[0.65rem] text-encre-tres-douce">
          {notification.libelleType} · {notification.creeLe}
        </span>
      </span>
    </>
  );
}
