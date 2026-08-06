'use client';

/**
 * Bascule clair/sombre.
 *
 * Aucun état React : le thème vit dans l'attribut `data-theme` de la racine,
 * posé avant le premier rendu par le script de `layout.tsx`. L'icône affichée
 * est choisie par CSS selon ce même attribut — ce qui évite à la fois un effet
 * au montage et le clignotement d'une icône fausse pendant l'hydratation.
 *
 * Le choix est retenu dans le navigateur. Sans choix explicite, le thème clair
 * (parchemin) s'applique — le sombre ne s'active que via cette bascule.
 */
export function BasculeTheme() {
  function basculer() {
    const racine = document.documentElement;
    const actuel = racine.dataset.theme === 'dark' ? 'dark' : 'light';

    const suivant = actuel === 'dark' ? 'light' : 'dark';
    racine.dataset.theme = suivant;

    try {
      localStorage.setItem('arbre-theme', suivant);
    } catch {
      // Navigation privée ou stockage refusé : le thème tiendra le temps de la visite.
    }
  }

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label="Changer de thème clair ou sombre"
      title="Changer de thème"
      className="grid h-11 w-11 place-items-center rounded-[var(--rayon-petit)] text-encre-douce transition hover:bg-fond-doux"
    >
      <span aria-hidden className="icone-theme-sombre">☾</span>
      <span aria-hidden className="icone-theme-clair">☀</span>
    </button>
  );
}
