/**
 * Petites icônes cousues au bas des nœuds de l'arbre pour signaler la richesse
 * d'une fiche : un livre pour un acte d'état civil retrouvé, un appareil photo
 * pour un portrait déposé, une bulle pour une note ou un souvenir.
 *
 * Volontairement minuscules : elles ne doivent jamais voler la vedette au nom
 * de la personne. On les affiche seulement quand l'échelle laisse la place, la
 * décision revient au composant appelant.
 *
 * Aucun de ces indicateurs n'implique une nouvelle requête : ils lisent ce que
 * l'arbre a déjà en main — `niveauxPreuve`, `photoId`, `notes`. Un affichage
 * plus fin (nombre exact de sources, de médias, de souvenirs) demanderait un
 * chargement supplémentaire qui doublerait le temps d'ouverture de l'arbre.
 */

import type { PersonneArbre } from '@/lib/arbre';

const TAILLE = 11;

export type IconeRichesse = 'acte' | 'media' | 'souvenir';

export function iconesPour(personne: PersonneArbre): IconeRichesse[] {
  const icones: IconeRichesse[] = [];
  const preuves = personne.niveauxPreuve;

  if (preuves.includes('acte') || preuves.includes('anom')) icones.push('acte');
  if (personne.photoId) icones.push('media');
  if (personne.notes && personne.notes.trim().length > 0) icones.push('souvenir');

  return icones;
}

const LIBELLES: Record<IconeRichesse, string> = {
  acte: 'Un acte retrouvé',
  media: 'Un portrait déposé',
  souvenir: 'Une note ou un souvenir',
};

export function IconeSvg({
  type,
  x,
  y,
  couleur,
}: {
  type: IconeRichesse;
  x: number;
  y: number;
  couleur: string;
}) {
  const commun = {
    transform: `translate(${x - TAILLE / 2}, ${y - TAILLE / 2})`,
    'aria-label': LIBELLES[type],
  } as const;

  if (type === 'acte') {
    return (
      <g {...commun}>
        <title>{LIBELLES[type]}</title>
        <path
          d={`M 1 1 L 5 1 Q 5.5 1 5.5 1.5 L 5.5 ${TAILLE - 1.5}
              Q 5.5 ${TAILLE - 1} 5 ${TAILLE - 1} L 1 ${TAILLE - 1} Z`}
          fill={couleur}
          opacity={0.9}
        />
        <path
          d={`M ${TAILLE - 1} 1 L ${TAILLE - 5} 1 Q ${TAILLE - 5.5} 1 ${TAILLE - 5.5} 1.5
              L ${TAILLE - 5.5} ${TAILLE - 1.5} Q ${TAILLE - 5.5} ${TAILLE - 1} ${TAILLE - 5} ${TAILLE - 1}
              L ${TAILLE - 1} ${TAILLE - 1} Z`}
          fill={couleur}
          opacity={0.9}
        />
        <line
          x1={TAILLE / 2}
          y1={1.5}
          x2={TAILLE / 2}
          y2={TAILLE - 1.5}
          stroke={couleur}
          strokeWidth={0.5}
          opacity={0.6}
        />
      </g>
    );
  }

  if (type === 'media') {
    return (
      <g {...commun}>
        <title>{LIBELLES[type]}</title>
        <rect
          x={0.5}
          y={2.5}
          width={TAILLE - 1}
          height={TAILLE - 3.5}
          rx={1.2}
          fill={couleur}
          opacity={0.85}
        />
        <rect x={3.5} y={1} width={4} height={2} rx={0.4} fill={couleur} opacity={0.85} />
        <circle cx={TAILLE / 2} cy={TAILLE / 2 + 0.6} r={2.2} fill="var(--fond-carte)" />
        <circle cx={TAILLE / 2} cy={TAILLE / 2 + 0.6} r={1.2} fill={couleur} />
      </g>
    );
  }

  // souvenir : bulle
  return (
    <g {...commun}>
      <title>{LIBELLES[type]}</title>
      <path
        d={`M 1 2 Q 1 1 2 1 L ${TAILLE - 2} 1 Q ${TAILLE - 1} 1 ${TAILLE - 1} 2
            L ${TAILLE - 1} ${TAILLE - 4} Q ${TAILLE - 1} ${TAILLE - 3} ${TAILLE - 2} ${TAILLE - 3}
            L 4 ${TAILLE - 3} L 2 ${TAILLE - 1} L 2.5 ${TAILLE - 3}
            Q 1 ${TAILLE - 3} 1 ${TAILLE - 4} Z`}
        fill={couleur}
        opacity={0.9}
      />
    </g>
  );
}
