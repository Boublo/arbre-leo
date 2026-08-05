/**
 * Projection de la carte.
 *
 * À l'échelle de l'Europe de l'Ouest et du Maghreb, une équirectangulaire
 * suffit : on étire simplement les longitudes du cosinus de la latitude
 * moyenne, faute de quoi la France paraîtrait deux fois trop large. Rien n'est
 * emprunté à une bibliothèque, et le cadrage se déduit des lieux réellement
 * situés — si la famille n'avait bougé que dans un département, la carte se
 * serrerait sur ce département.
 */

/** Un point du globe, dans l'ordre des cartographes : longitude puis latitude. */
export type Coord = readonly [number, number];

export type Point = { x: number; y: number };

/** État du zoom : facteur d'échelle et décalage, en pixels du dessin. */
export type Transformation = { k: number; x: number; y: number };

export type Cadre = {
  /** Dimensions de la planche dessinée, au plus grand dans la place offerte. */
  largeur: number;
  hauteur: number;
  /** Longitude et latitude vers les coordonnées du dessin, avant zoom. */
  projeter: (longitude: number, latitude: number) => Point;
  /** Bornes géographiques de la planche : rien n'est dessiné au-delà. */
  bornes: { ouest: number; est: number; sud: number; nord: number };
};

const DEGRE = Math.PI / 180;

/** En deçà, un lieu isolé donnerait une échelle absurde. */
const ETENDUE_MINIMALE = 0.8;

/** Cadrage de repli quand aucun lieu n'est situé : l'Europe de l'Ouest. */
const CADRAGE_PAR_DEFAUT = { ouest: -6, est: 12, sud: 35, nord: 49 };

/**
 * La planche est taillée sur les lieux eux-mêmes, puis agrandie autant que la
 * place le permet. Elle ne s'étire jamais pour remplir l'écran : au-delà de
 * ces bornes, le trait de côte dessiné à la main deviendrait faux, et il vaut
 * mieux laisser du blanc que de montrer une géographie inventée.
 */
export function calculerCadre(
  points: readonly { longitude: number; latitude: number }[],
  largeurDisponible: number,
  hauteurDisponible: number,
  margeRelative = 0.09
): Cadre {
  let { ouest, est, sud, nord } = CADRAGE_PAR_DEFAUT;

  if (points.length > 0) {
    ouest = Number.POSITIVE_INFINITY;
    est = Number.NEGATIVE_INFINITY;
    sud = Number.POSITIVE_INFINITY;
    nord = Number.NEGATIVE_INFINITY;
    for (const p of points) {
      ouest = Math.min(ouest, p.longitude);
      est = Math.max(est, p.longitude);
      sud = Math.min(sud, p.latitude);
      nord = Math.max(nord, p.latitude);
    }
  }

  [ouest, est] = etendre(ouest, est);
  [sud, nord] = etendre(sud, nord);

  // Un peu d'air autour des lieux extrêmes, pour que leur nom tienne.
  const airLongitude = (est - ouest) * margeRelative;
  const airLatitude = (nord - sud) * margeRelative;
  ouest -= airLongitude;
  est += airLongitude;
  sud -= airLatitude;
  nord += airLatitude;

  // Un degré de longitude vaut moins qu'un degré de latitude dès qu'on monte
  // vers le nord : c'est tout le correctif de cette projection.
  const aplatissement = Math.max(Math.cos(((sud + nord) / 2) * DEGRE), 0.15);

  const largeurGeographique = (est - ouest) * aplatissement;
  const hauteurGeographique = nord - sud;
  const echelle = Math.max(
    Math.min(
      Math.max(largeurDisponible, 1) / largeurGeographique,
      Math.max(hauteurDisponible, 1) / hauteurGeographique
    ),
    0.01
  );

  const largeur = Math.floor(largeurGeographique * echelle);
  const hauteur = Math.floor(hauteurGeographique * echelle);

  const projeter = (longitude: number, latitude: number): Point => ({
    x: (longitude - ouest) * aplatissement * echelle,
    y: (nord - latitude) * echelle,
  });

  return { largeur, hauteur, projeter, bornes: { ouest, est, sud, nord } };
}

function etendre(minimum: number, maximum: number): [number, number] {
  if (maximum - minimum >= ETENDUE_MINIMALE) return [minimum, maximum];
  const centre = (minimum + maximum) / 2;
  return [centre - ETENDUE_MINIMALE / 2, centre + ETENDUE_MINIMALE / 2];
}

/** Position à l'écran une fois le zoom appliqué. */
export function versEcran(
  cadre: Cadre,
  transformation: Transformation,
  longitude: number,
  latitude: number
): Point {
  const point = cadre.projeter(longitude, latitude);
  return {
    x: point.x * transformation.k + transformation.x,
    y: point.y * transformation.k + transformation.y,
  };
}

/** Suite de coordonnées géographiques en chemin SVG. */
export function cheminGeographique(
  coords: readonly Coord[],
  cadre: Cadre,
  fermer = false
): string {
  if (coords.length === 0) return '';
  const morceaux = coords.map(([longitude, latitude], index) => {
    const { x, y } = cadre.projeter(longitude, latitude);
    return `${index === 0 ? 'M' : 'L'}${arrondir(x)} ${arrondir(y)}`;
  });
  return morceaux.join(' ') + (fermer ? ' Z' : '');
}

const arrondir = (valeur: number) => Math.round(valeur * 10) / 10;

/**
 * Contraint le zoom au cadre : on ne peut ni reculer au-delà de la vue
 * d'ensemble, ni faire glisser la carte hors de l'écran.
 */
export function contraindre(
  transformation: Transformation,
  largeur: number,
  hauteur: number,
  echelleMax = 14
): Transformation {
  const k = Math.min(Math.max(transformation.k, 1), echelleMax);
  return {
    k,
    x: Math.min(0, Math.max(largeur * (1 - k), transformation.x)),
    y: Math.min(0, Math.max(hauteur * (1 - k), transformation.y)),
  };
}
