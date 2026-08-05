'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';

/**
 * Barre fine posée en haut de la page qui suit le défilement.
 *
 * Sur une fiche longue — vie, souvenirs, photos, conversations — on perd
 * vite le repère de « où j'en suis ». Cette barre le rend en silence, sans
 * empiéter sur la lecture : deux pixels d'accent qui s'étirent au fur et à
 * mesure de la descente. Un clic sur la barre emmène à la position
 * correspondante, ce qui suffit pour parcourir la page à grands sauts sans
 * dérouler la molette.
 *
 * Le composant est autonome : il s'abonne au défilement de la fenêtre au
 * montage, se désabonne au démontage, et ne rend rien de plus qu'une bande
 * fixée à l'écran.
 */
export function BarreScroll() {
  const [progression, setProgression] = useState(0);

  const mesurer = useCallback(() => {
    const hauteurDoc = document.documentElement.scrollHeight - window.innerHeight;
    if (hauteurDoc <= 0) {
      setProgression(0);
      return;
    }
    const ratio = window.scrollY / hauteurDoc;
    setProgression(Math.min(1, Math.max(0, ratio)));
  }, []);

  useEffect(() => {
    // Première mesure repoussée à la frame suivante pour éviter un setState
    // synchrone dans l'effet — le lint le refuse et cela évite un rendu en
    // cascade au montage.
    const id = window.requestAnimationFrame(mesurer);
    window.addEventListener('scroll', mesurer, { passive: true });
    window.addEventListener('resize', mesurer);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('scroll', mesurer);
      window.removeEventListener('resize', mesurer);
    };
  }, [mesurer]);

  function surClic(evt: MouseEvent<HTMLDivElement>) {
    const rect = evt.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (evt.clientX - rect.left) / rect.width));
    const hauteurDoc = document.documentElement.scrollHeight - window.innerHeight;
    if (hauteurDoc <= 0) return;
    window.scrollTo({ top: ratio * hauteurDoc, behavior: 'smooth' });
  }

  const pourcentage = Math.round(progression * 100);

  return (
    <div
      role="progressbar"
      aria-label="Progression dans la page"
      aria-valuenow={pourcentage}
      aria-valuemin={0}
      aria-valuemax={100}
      onClick={surClic}
      title="Cliquer pour sauter à cette position"
      // Un peu plus haut au survol pour signaler la cible cliquable, sans
      // recouvrir la page pour autant.
      className="group fixed inset-x-0 top-0 z-30 h-0.5 cursor-pointer bg-transparent hover:h-1"
    >
      <div
        aria-hidden
        className="h-full bg-accent transition-[width] duration-150 ease-out"
        style={{ width: `${pourcentage}%` }}
      />
    </div>
  );
}
