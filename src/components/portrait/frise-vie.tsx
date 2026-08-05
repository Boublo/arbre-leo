import type { TypeEvenement } from '@/lib/types-base';
import type { Portrait } from '@/components/portrait/types';

/**
 * Les grands jalons d’une vie sur une ligne du temps.
 *
 * On n’en garde que les repères qui ont fait tourner l’existence : naissance,
 * unions, changements de métier, migrations, décoration, décès. Le reste — les
 * résidences successives, les recensements — appartient à la chronologie
 * détaillée de la fiche.
 *
 * Ce qu’on ne sait pas est aussi important que ce qu’on sait : la ligne est
 * pleine sur la période documentée, pointillée là où la famille cherche encore.
 */

/** Types d’événements portés par la frise. Volontairement plus courte que la liste des `TypeEvenement`. */
const TYPES_JALON = new Set<TypeEvenement>([
  'naissance',
  'bapteme',
  'fiancailles',
  'mariage',
  'union_libre',
  'divorce',
  'profession',
  'emigration',
  'immigration',
  'naturalisation',
  'service_militaire',
  'distinction',
  'deces',
  'inhumation',
  'cremation',
]);

const LIBELLE_JALON: Partial<Record<TypeEvenement, string>> = {
  naissance: 'Naissance',
  bapteme: 'Baptême',
  fiancailles: 'Fiançailles',
  mariage: 'Mariage',
  union_libre: 'Union libre',
  divorce: 'Divorce',
  profession: 'Métier',
  emigration: 'Départ du pays',
  immigration: 'Arrivée dans le pays',
  naturalisation: 'Naturalisation',
  service_militaire: 'Service',
  distinction: 'Distinction',
  deces: 'Décès',
  inhumation: 'Inhumation',
  cremation: 'Crémation',
};

/** Ce dont la frise a besoin d’un événement ; adapter au besoin depuis la fiche. */
export type EvenementFrise = {
  id: string;
  type: TypeEvenement;
  annee: number | null;
  /** Détail court à faire apparaître au survol : « bijoutier », « avec Marie ». */
  detail?: string | null;
  lieuCourt?: string | null;
};

const LARGEUR = 720;
const HAUTEUR = 130;
const MARGE_X = 32;
const Y_AXE = 74;

/**
 * `<FriseVie>` — se lit de gauche à droite, du plus ancien au plus récent.
 * Passe à hauteur automatique pour se ranger dans les fiches sans imposer sa
 * taille : c’est la largeur disponible qui commande.
 */
export function FriseVie({
  personne,
  evenements,
}: {
  personne: Portrait;
  evenements: EvenementFrise[];
}) {
  const jalons = evenements
    .filter((e) => TYPES_JALON.has(e.type))
    .filter((e): e is EvenementFrise & { annee: number } => e.annee !== null)
    .sort((a, b) => a.annee - b.annee);

  const anneesConnues: number[] = [];
  if (personne.anneeNaissance) anneesConnues.push(personne.anneeNaissance);
  if (personne.anneeDeces) anneesConnues.push(personne.anneeDeces);
  for (const j of jalons) anneesConnues.push(j.annee);

  if (anneesConnues.length === 0) {
    return (
      <p className="text-sm text-encre-tres-douce">
        Aucune date n’est encore documentée pour tracer sa frise.
      </p>
    );
  }

  const anneeMin = Math.min(...anneesConnues);
  const anneeMax = Math.max(...anneesConnues);

  // Un peu d’air à droite et à gauche : la frise commence et finit toujours
  // par une portion pointillée, signal qu’il y a un « avant » et un « après ».
  const marge = Math.max(3, Math.round((anneeMax - anneeMin) * 0.08));
  const debut = anneeMin - marge;
  const fin = Math.max(anneeMin + 12, anneeMax + marge);

  const xPour = (annee: number): number => {
    const t = (annee - debut) / (fin - debut);
    return MARGE_X + t * (LARGEUR - 2 * MARGE_X);
  };

  // Bornes de la vie documentée : naissance/décès si connus, à défaut les
  // jalons extrêmes. Le segment plein sera tiré entre ces deux abscisses.
  const anneeCourante = new Date().getFullYear();
  const anneeVieDebut = personne.anneeNaissance ?? jalons[0]?.annee ?? anneeMin;
  // Pour une personne présumée vivante sans décès connu, on prolonge le
  // segment plein jusqu'à l'année courante — sinon la vie « se termine » à
  // sa naissance quand aucun jalon n'a été enregistré depuis.
  const anneeVieFin = personne.anneeDeces
    ? personne.anneeDeces
    : personne.presumeVivant
      ? Math.max(anneeCourante, jalons[jalons.length - 1]?.annee ?? anneeVieDebut)
      : (jalons[jalons.length - 1]?.annee ?? anneeMax);
  const xVieDebut = xPour(anneeVieDebut);
  const xVieFin = xPour(Math.max(anneeVieFin, anneeVieDebut));
  const vieOuverte = Boolean(personne.presumeVivant && !personne.anneeDeces);

  // Repères de décennies, sans encombrer les extrémités.
  const decennieDebut = Math.ceil(debut / 10) * 10;
  const decennieFin = Math.floor(fin / 10) * 10;
  const decennies: number[] = [];
  for (let d = decennieDebut; d <= decennieFin; d += 10) decennies.push(d);

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      role="img"
      aria-label={`Frise de vie de ${personne.nomComplet}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Fond pointillé : la lacune par défaut, ce qu’on ignore. */}
      <line
        x1={MARGE_X}
        y1={Y_AXE}
        x2={LARGEUR - MARGE_X}
        y2={Y_AXE}
        stroke="var(--bordure-forte)"
        strokeWidth={1.5}
        strokeDasharray="3 4"
      />

      {/* Segment plein : la vie documentée. Pour une personne présumée vivante,
          on pointille la partie « présent » — la vie continue au-delà de ce que
          l'arbre sait. */}
      <line
        x1={xVieDebut}
        y1={Y_AXE}
        x2={xVieFin}
        y2={Y_AXE}
        stroke="var(--accent)"
        strokeWidth={2}
        strokeDasharray={vieOuverte ? '5 3' : undefined}
      />

      {/* Repères de décennies. */}
      {decennies.map((d) => {
        const x = xPour(d);
        return (
          <g key={d}>
            <line
              x1={x}
              y1={Y_AXE + 6}
              x2={x}
              y2={Y_AXE + 10}
              stroke="var(--bordure-forte)"
              strokeWidth={1}
            />
            <text
              x={x}
              y={Y_AXE + 22}
              textAnchor="middle"
              fill="var(--encre-tres-douce)"
              fontSize={10}
            >
              {d}
            </text>
          </g>
        );
      })}

      {/* Jalons : point sur l’axe, tige vers le libellé au-dessus. */}
      {jalons.map((j, i) => (
        <Jalon
          key={j.id}
          jalon={j}
          x={xPour(j.annee)}
          y={Y_AXE}
          rangee={(i % 2) as 0 | 1}
        />
      ))}
    </svg>
  );
}

function Jalon({
  jalon,
  x,
  y,
  rangee,
}: {
  jalon: EvenementFrise & { annee: number };
  x: number;
  y: number;
  /** Deux hauteurs alternées pour que les libellés voisins ne se chevauchent pas. */
  rangee: 0 | 1;
}) {
  const yTige = rangee === 0 ? y - 22 : y - 40;
  const yTexte = yTige - 4;
  const libelle = LIBELLE_JALON[jalon.type] ?? 'Événement';
  const infoBulle = [
    `${libelle} — ${jalon.annee}`,
    jalon.lieuCourt,
    jalon.detail,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <g>
      <title>{infoBulle}</title>
      <line
        x1={x}
        y1={yTige}
        x2={x}
        y2={y - 3}
        stroke="var(--encre-tres-douce)"
        strokeWidth={0.6}
      />
      <circle
        cx={x}
        cy={y}
        r={4}
        fill="var(--fond-carte)"
        stroke={couleurJalon(jalon.type)}
        strokeWidth={1.5}
      />
      <text
        x={x}
        y={yTexte}
        textAnchor="middle"
        fill="var(--encre-douce)"
        fontSize={10}
      >
        {libelle}
      </text>
      <text
        x={x}
        y={y + 24}
        textAnchor="middle"
        fill="var(--encre-tres-douce)"
        fontSize={9}
        aria-hidden
      >
        {jalon.annee}
      </text>
    </g>
  );
}

function couleurJalon(type: TypeEvenement): string {
  if (type === 'naissance' || type === 'bapteme') return 'var(--succes)';
  if (type === 'deces' || type === 'inhumation' || type === 'cremation') {
    return 'var(--erreur)';
  }
  if (
    type === 'mariage' ||
    type === 'union_libre' ||
    type === 'fiancailles' ||
    type === 'divorce'
  ) {
    return 'var(--or)';
  }
  return 'var(--accent)';
}
