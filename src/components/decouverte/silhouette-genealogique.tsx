/**
 * Silhouette généalogique.
 *
 * Une pyramide dessinée en SVG, une bande horizontale par génération,
 * proportionnelle au nombre de personnes qu'elle compte. Rien de nominatif :
 * ni prénom, ni date, ni surnom. Juste la forme que prend la famille quand on
 * la regarde de très loin — les branches qui s'écartent, celles qui se
 * resserrent, le point où tout se rejoint.
 *
 * Le SVG est décoratif, mais son intitulé et sa description alimentent une
 * lecture accessible : les personnes qui n'accèdent pas au dessin obtiennent
 * l'information sous forme d'un tableau associé.
 */

export type BandeGeneration = {
  /** Libellé de la génération : « Génération 1 », « Bisaïeuls », etc. */
  libelle: string;
  /** Effectif connu pour cette génération. Zéro est admis (bande vide). */
  nombre: number;
};

/** Hauteur de bande, en unités SVG : chaque génération occupe la même place. */
const HAUTEUR_BANDE = 28;
/** Interligne entre deux bandes. */
const INTER_BANDE = 6;
/** Largeur totale du SVG, en unités : la bande la plus large la remplira. */
const LARGEUR = 200;
/** Marge intérieure verticale, pour ne pas coller les bords du cadre. */
const MARGE_V = 8;

export function Silhouette({
  parGeneration,
  titre = 'Silhouette de l’arbre',
  legende,
}: {
  parGeneration: BandeGeneration[];
  /** Titre du dessin, lu par les technologies d'assistance. */
  titre?: string;
  /** Phrase courte qui accompagne le dessin — dit ce qu'il faut y voir. */
  legende?: string;
}) {
  if (parGeneration.length === 0) {
    return (
      <figure className="carte p-5">
        <figcaption className="text-sm text-encre-tres-douce">
          Aucune génération à représenter pour l&apos;instant.
        </figcaption>
      </figure>
    );
  }

  const maxNombre = Math.max(1, ...parGeneration.map((b) => b.nombre));
  const totalPersonnes = parGeneration.reduce((s, b) => s + b.nombre, 0);
  const hauteurTotale =
    parGeneration.length * HAUTEUR_BANDE +
    (parGeneration.length - 1) * INTER_BANDE +
    MARGE_V * 2;

  const motGeneration = parGeneration.length > 1 ? 'générations' : 'génération';
  const motPersonnesTotal = totalPersonnes > 1 ? 'personnes' : 'personne';
  const motPersonnesMax = maxNombre > 1 ? 'personnes' : 'personne';
  const description =
    legende ??
    `Silhouette de l’arbre sur ${parGeneration.length} ${motGeneration}, ` +
      `${totalPersonnes} ${motPersonnesTotal} au total. La bande la plus large ` +
      `compte ${maxNombre} ${motPersonnesMax}.`;

  return (
    <figure className="carte flex flex-col gap-4 p-5">
      <figcaption className="flex flex-col gap-1">
        <h3 className="text-lg leading-snug">{titre}</h3>
        <p className="text-sm text-encre-douce">{description}</p>
      </figcaption>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        {/* --- Le dessin ---------------------------------------------------- */}
        <svg
          viewBox={`0 0 ${LARGEUR} ${hauteurTotale}`}
          role="img"
          aria-labelledby="silhouette-titre silhouette-desc"
          className="h-auto w-full max-w-md self-center"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id="silhouette-titre">{titre}</title>
          <desc id="silhouette-desc">{description}</desc>

          {parGeneration.map((bande, index) => {
            const largeur =
              bande.nombre === 0
                ? 0
                : Math.max(4, (bande.nombre / maxNombre) * LARGEUR);
            const y = MARGE_V + index * (HAUTEUR_BANDE + INTER_BANDE);
            const x = (LARGEUR - largeur) / 2;

            return (
              <g key={`${bande.libelle}-${index}`}>
                {/* Rail médian : donne le sens de la pyramide, même quand
                    une bande est vide. */}
                <line
                  x1={LARGEUR / 2}
                  x2={LARGEUR / 2}
                  y1={y}
                  y2={y + HAUTEUR_BANDE}
                  stroke="var(--bordure)"
                  strokeWidth={0.5}
                />
                {bande.nombre > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={largeur}
                    height={HAUTEUR_BANDE}
                    rx={3}
                    fill="var(--accent-clair)"
                    stroke="var(--accent)"
                    strokeWidth={0.75}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* --- Le tableau associé : accessibilité et lecture rapide -------- */}
        <ol className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          {parGeneration.map((bande, index) => (
            <li
              key={`liste-${bande.libelle}-${index}`}
              className="flex items-baseline justify-between gap-3 border-b border-bordure py-1 last:border-b-0"
            >
              <span className="text-encre">{bande.libelle}</span>
              <span className="tabular-nums text-encre-douce">
                {bande.nombre === 0
                  ? '—'
                  : bande.nombre === 1
                    ? '1 personne'
                    : `${bande.nombre} personnes`}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
