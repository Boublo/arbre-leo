import type { EntreeDecennie } from '@/lib/statistiques';

/**
 * Naissances et décès de la famille, décennie par décennie.
 *
 * Deux petites barres verticales par colonne — la naissance en vert doux, le
 * décès en rouge doux, avec la même opacité pour qu'aucune couleur n'écrase
 * l'autre. Le dessin est en SVG maison, sans dépendance : rien de plus qu'un
 * histogramme, mais posé sobrement.
 *
 * Une année ronde est affichée sous chaque colonne quand la place le permet ;
 * sinon, une année sur deux, pour ne pas rendre l'axe illisible. La légende
 * accompagne le dessin pour ceux qui distingueraient mal les deux teintes.
 */

const HAUTEUR_ZONE = 160;
const MARGE_HAUT = 12;
const MARGE_BAS = 34;
const LARGEUR_COLONNE = 44;
const ECART_COLONNE = 6;
const LARGEUR_BARRE = 18;
const ECART_BARRES = 4;

export function FriseDecennies({ entrees }: { entrees: EntreeDecennie[] }) {
  if (entrees.length === 0) {
    return (
      <figure className="carte p-5">
        <figcaption className="text-sm text-encre-tres-douce">
          Aucune date n&apos;est encore enregistrée : la frise reste à venir.
        </figcaption>
      </figure>
    );
  }

  const max = Math.max(1, ...entrees.flatMap((e) => [e.naissances, e.deces]));
  const largeurTotale =
    entrees.length * LARGEUR_COLONNE + Math.max(0, entrees.length - 1) * ECART_COLONNE;
  const hauteurTotale = MARGE_HAUT + HAUTEUR_ZONE + MARGE_BAS;

  // Une décennie sur combien affiche son année en clair sous l'axe : cadence
  // choisie pour que les libellés ne se chevauchent jamais à l'écran, même
  // quand la frise couvre trois siècles.
  const pasEtiquettes = entrees.length > 20 ? 5 : entrees.length > 10 ? 2 : 1;
  const bases = [0.25, 0.5, 0.75, 1];

  const totalNaissances = entrees.reduce((s, e) => s + e.naissances, 0);
  const totalDeces = entrees.reduce((s, e) => s + e.deces, 0);

  return (
    <figure className="carte flex flex-col gap-4 p-4 sm:p-5">
      <figcaption className="flex flex-col gap-1">
        <h3 className="text-lg leading-snug">La vie de la famille dans le temps</h3>
        <p className="text-sm text-encre-douce">
          Naissances et décès rangés par décennie : les creux sont ceux des
          générations perdues, les pics ceux des grandes fratries.
        </p>
      </figcaption>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${largeurTotale} ${hauteurTotale}`}
          role="img"
          aria-label="Frise des naissances et décès par décennie"
          className="block h-auto w-full min-w-[36rem]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Repères horizontaux : quatre traits légers pour donner l'échelle. */}
          {bases.map((base) => {
            const y = MARGE_HAUT + HAUTEUR_ZONE - HAUTEUR_ZONE * base;
            return (
              <line
                key={base}
                x1={0}
                x2={largeurTotale}
                y1={y}
                y2={y}
                stroke="var(--bordure)"
                strokeWidth={0.5}
                strokeDasharray="2 3"
              />
            );
          })}

          {/* Ligne de base. */}
          <line
            x1={0}
            x2={largeurTotale}
            y1={MARGE_HAUT + HAUTEUR_ZONE}
            y2={MARGE_HAUT + HAUTEUR_ZONE}
            stroke="var(--bordure-forte)"
            strokeWidth={0.75}
          />

          {entrees.map((entree, index) => {
            const x = index * (LARGEUR_COLONNE + ECART_COLONNE);
            const hN = (entree.naissances / max) * HAUTEUR_ZONE;
            const hD = (entree.deces / max) * HAUTEUR_ZONE;
            const largeurPaire = LARGEUR_BARRE * 2 + ECART_BARRES;
            const decalage = (LARGEUR_COLONNE - largeurPaire) / 2;
            const xN = x + decalage;
            const xD = xN + LARGEUR_BARRE + ECART_BARRES;
            const afficheEtiquette = index % pasEtiquettes === 0;

            return (
              <g key={entree.decennie}>
                {entree.naissances > 0 && (
                  <rect
                    x={xN}
                    y={MARGE_HAUT + HAUTEUR_ZONE - hN}
                    width={LARGEUR_BARRE}
                    height={hN}
                    fill="var(--succes)"
                    opacity={0.6}
                    rx={1}
                  >
                    <title>
                      {`Décennie ${entree.decennie} : ${entree.naissances} naissance${entree.naissances > 1 ? 's' : ''}`}
                    </title>
                  </rect>
                )}
                {entree.deces > 0 && (
                  <rect
                    x={xD}
                    y={MARGE_HAUT + HAUTEUR_ZONE - hD}
                    width={LARGEUR_BARRE}
                    height={hD}
                    fill="var(--erreur)"
                    opacity={0.6}
                    rx={1}
                  >
                    <title>
                      {`Décennie ${entree.decennie} : ${entree.deces} décès`}
                    </title>
                  </rect>
                )}

                {afficheEtiquette && (
                  <text
                    x={x + LARGEUR_COLONNE / 2}
                    y={MARGE_HAUT + HAUTEUR_ZONE + 14}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--encre-douce)"
                  >
                    {entree.decennie}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Légende visible en toutes conditions : la couleur ne suffit pas. */}
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-encre-douce">
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: 'var(--succes)', opacity: 0.6 }}
          />
          <span>
            Naissances{' '}
            <span className="tabular-nums text-encre-tres-douce">
              ({totalNaissances})
            </span>
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: 'var(--erreur)', opacity: 0.6 }}
          />
          <span>
            Décès{' '}
            <span className="tabular-nums text-encre-tres-douce">
              ({totalDeces})
            </span>
          </span>
        </li>
      </ul>
    </figure>
  );
}
