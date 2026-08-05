'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Petites notifications transitoires : un enregistrement réussi, un envoi qui a
 * échoué, un message qui doit se voir sans interrompre. Se retirent seules au
 * bout de quatre secondes.
 *
 * On peut appeler `notifier(...)` depuis un composant en passant par le hook
 * `useNotifier()`, ou depuis n'importe quel module qui importe la fonction
 * exportée — le fournisseur en aura publié la référence à son montage.
 *
 * L'annonce se fait dans une région `aria-live=polite` pour ne pas couper la
 * parole aux lecteurs d'écran.
 */

export type TonNotification = 'succes' | 'erreur' | 'info';

export type Notification = {
  id: number;
  ton: TonNotification;
  message: string;
};

type NotifierFn = (message: string, ton?: TonNotification) => void;

const ContexteNotifications = createContext<NotifierFn | null>(null);

/** Référence partagée au notifier courant : permet l'appel hors composant. */
let notifierGlobal: NotifierFn | null = null;

/** À appeler de n'importe où pour poser une notification. */
export function notifier(message: string, ton: TonNotification = 'info') {
  if (!notifierGlobal) {
    // Ne pas planter en dev si le fournisseur n'a pas encore été monté.
    if (typeof console !== 'undefined') {
      console.warn('[notifications] Aucun fournisseur monté :', message);
    }
    return;
  }
  notifierGlobal(message, ton);
}

/** Hook pour composants React ; équivalent à la fonction ci-dessus. */
export function useNotifier(): NotifierFn {
  const fn = useContext(ContexteNotifications);
  if (!fn) {
    throw new Error('useNotifier() doit être appelé sous <FournisseurNotifications>.');
  }
  return fn;
}

export function FournisseurNotifications({ children }: { children: ReactNode }) {
  const [liste, setListe] = useState<Notification[]>([]);
  const compteur = useRef(0);
  // Les minuteries en cours, pour pouvoir les annuler à la fermeture manuelle
  // ou au démontage du fournisseur : sans ce garde, un rappel appelle
  // `setListe` sur un composant démonté.
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const poser = useCallback<NotifierFn>((message, ton = 'info') => {
    const id = ++compteur.current;
    setListe((etat) => [...etat, { id, ton, message }]);
    // Retrait automatique après 4 s.
    const t = setTimeout(() => {
      timers.current.delete(id);
      setListe((etat) => etat.filter((n) => n.id !== id));
    }, 4000);
    timers.current.set(id, t);
  }, []);

  useEffect(() => {
    notifierGlobal = poser;
    return () => {
      if (notifierGlobal === poser) notifierGlobal = null;
    };
  }, [poser]);

  // Nettoyage au démontage du fournisseur : plus aucun rappel ne réveillera
  // un composant qui n'est plus là.
  useEffect(() => {
    const carte = timers.current;
    return () => {
      carte.forEach((t) => clearTimeout(t));
      carte.clear();
    };
  }, []);

  function retirer(id: number) {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setListe((etat) => etat.filter((n) => n.id !== id));
  }

  return (
    <ContexteNotifications.Provider value={poser}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {liste.map((n) => {
          const style =
            n.ton === 'succes'
              ? 'border-succes/40 bg-succes/10 text-succes'
              : n.ton === 'erreur'
                ? 'border-erreur/40 bg-erreur/10 text-erreur'
                : 'border-bordure bg-fond-carte text-encre';

          return (
            <div
              key={n.id}
              role={n.ton === 'erreur' ? 'alert' : 'status'}
              className={`notif-entree pointer-events-auto flex items-start gap-3 rounded-[var(--rayon-petit)] border px-3 py-2.5 text-sm shadow-[var(--shadow-douce)] ${style}`}
            >
              <span className="flex-1">{n.message}</span>
              <button
                type="button"
                onClick={() => retirer(n.id)}
                aria-label="Fermer la notification"
                className="rounded-[var(--rayon-petit)] px-1 text-encre-tres-douce transition hover:text-encre"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes notif-entree {
          from { transform: translateY(8px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        .notif-entree { animation: notif-entree 160ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .notif-entree { animation: none; }
        }
      `}</style>
    </ContexteNotifications.Provider>
  );
}
