'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Raccourci clavier vers l'accueil.
 *
 * `H` — comme « home » — ou `Alt + A` — pour ceux qui gardent le `H` de
 * la casse d'une phrase en cours de frappe. Le raccourci ne se déclenche
 * pas quand on est en train d'écrire dans un champ : détourner une
 * frappe légitime serait pire que rendre le service.
 *
 * Le composant ne rend rien : il se contente de brancher un écouteur
 * clavier au montage et de le retirer à la sortie.
 */
export function RaccourciAccueil() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Sur la page d'accueil, le raccourci n'apporte rien — ne pas installer
    // d'écouteur pour ne pas gêner d'autres frappes.
    if (pathname === '/') return;

    function surTouche(evt: KeyboardEvent) {
      // Le champ actif l'emporte : on ne détourne pas la frappe d'un cousin
      // en train de saisir un commentaire ou un souvenir.
      const cible = evt.target as HTMLElement | null;
      if (cible) {
        if (cible.isContentEditable) return;
        const tag = cible.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      }

      const touche = evt.key.toLowerCase();
      // `H` seul, sans autre modificateur : le geste doit être franc.
      const estH =
        touche === 'h' && !evt.ctrlKey && !evt.metaKey && !evt.altKey && !evt.shiftKey;
      // `Alt + A` : la porte de sortie universelle, y compris quand `H`
      // ne convient pas (clavier étranger, main déjà sur Alt).
      const estAltA = evt.altKey && touche === 'a' && !evt.ctrlKey && !evt.metaKey;

      if (!estH && !estAltA) return;

      evt.preventDefault();
      router.push('/');
    }

    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [router, pathname]);

  return null;
}
