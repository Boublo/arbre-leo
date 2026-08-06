import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';

/**
 * Ces jours-ci.
 *
 * Retrouve dans l'arbre les événements — naissances, mariages, décès — qui
 * tombent aux mêmes mois-jour qu'une date de référence, sans tenir compte de
 * l'année. Utile pour dire « aujourd'hui, X aurait 90 ans » ou « demain, tel
 * couple aurait fêté ses 40 ans de mariage ».
 *
 * Aucune bibliothèque de date n'est nécessaire : `Date` natif suffit, et les
 * dates de la base restent en morceaux (année/mois/jour) — on compare morceau
 * par morceau, ce qui évite tout décalage de fuseau horaire.
 */

/** Ce qu'on retient d'un événement pour l'afficher au coin du calendrier. */
export type Ephemeride =
  | {
      type: 'naissance';
      personne: PersonneArbre;
      mois: number;
      jour: number;
      annee: number;
      /** Nombre d'années entre l'événement et le jour visé. */
      annees: number;
      /**
       * `true` si la personne est présumée vivante : elle fête ses X ans,
       * `false` si elle est décédée : elle « aurait » X ans.
       */
      vivant: boolean;
    }
  | {
      type: 'deces';
      personne: PersonneArbre;
      mois: number;
      jour: number;
      annee: number;
      annees: number;
    }
  | {
      type: 'mariage';
      unionId: string;
      conjoints: PersonneArbre[];
      mois: number;
      jour: number;
      annee: number;
      annees: number;
    };

/** Une journée et les éphémérides qui l'accompagnent. */
export type JourneeEphemerides = {
  date: Date;
  ephemerides: Ephemeride[];
};

// ---------------------------------------------------------------------------
// Manipulation de dates : rien que du `Date` natif.
// ---------------------------------------------------------------------------

/**
 * Nouvelle `Date` calée sur minuit local, décalée d'un nombre de jours.
 * L'usage de `setDate` fait passer proprement les fins de mois et le 29 février.
 */
function jourLocal(reference: Date, decalageJours = 0): Date {
  const d = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  if (decalageJours !== 0) d.setDate(d.getDate() + decalageJours);
  return d;
}

// ---------------------------------------------------------------------------
// Lecture d'un jour
// ---------------------------------------------------------------------------

/**
 * Toutes les éphémérides tombant sur un jour donné.
 *
 * Les personnes et les unions dont on ne connaît pas au moins mois, jour et
 * année sont écartées : sans année, impossible de dire depuis combien de temps
 * l'événement a eu lieu, et le libellé « aurait X ans » perd son sens.
 *
 * L'ordre du retour est stable : d'abord les naissances, puis les mariages,
 * puis les décès. Un même ordre chaque fois évite le vacillement d'une visite
 * à l'autre pour un jour de repère.
 */
export function ephemeridesDeCeJour(
  donnees: DonneesArbre,
  cible: Date
): Ephemeride[] {
  const moisCible = cible.getMonth() + 1;
  const jourCible = cible.getDate();
  const anneeCible = cible.getFullYear();

  const naissances: Ephemeride[] = [];
  const deces: Ephemeride[] = [];
  const mariages: Ephemeride[] = [];

  for (const p of donnees.personnes.values()) {
    const n = p.naissance;
    if (
      n &&
      n.mois === moisCible &&
      n.jour === jourCible &&
      n.annee !== null
    ) {
      naissances.push({
        type: 'naissance',
        personne: p,
        mois: n.mois,
        jour: n.jour,
        annee: n.annee,
        annees: anneeCible - n.annee,
        vivant: p.presumeVivant,
      });
    }

    const d = p.deces;
    if (
      d &&
      d.mois === moisCible &&
      d.jour === jourCible &&
      d.annee !== null
    ) {
      deces.push({
        type: 'deces',
        personne: p,
        mois: d.mois,
        jour: d.jour,
        annee: d.annee,
        annees: anneeCible - d.annee,
      });
    }
  }

  for (const u of donnees.unions.values()) {
    const m = u.mariage;
    if (!m || m.mois !== moisCible || m.jour !== jourCible || m.annee === null) {
      continue;
    }
    const conjoints: PersonneArbre[] = [];
    for (const cid of [u.conjointA, u.conjointB]) {
      if (!cid) continue;
      const personne = donnees.personnes.get(cid);
      if (personne) conjoints.push(personne);
    }
    // Un mariage sans conjoint identifiable ne dirait rien : on l'ignore.
    if (conjoints.length === 0) continue;

    mariages.push({
      type: 'mariage',
      unionId: u.id,
      conjoints,
      mois: m.mois,
      jour: m.jour,
      annee: m.annee,
      annees: anneeCible - m.annee,
    });
  }

  const parNom = (a: Ephemeride, b: Ephemeride) => {
    const nomA =
      a.type === 'mariage' ? a.conjoints[0]?.nomComplet ?? '' : a.personne.nomComplet;
    const nomB =
      b.type === 'mariage' ? b.conjoints[0]?.nomComplet ?? '' : b.personne.nomComplet;
    return nomA.localeCompare(nomB, 'fr');
  };

  return [
    ...naissances.sort(parNom),
    ...mariages.sort(parNom),
    ...deces.sort(parNom),
  ];
}

// ---------------------------------------------------------------------------
// Semaine et prochaines éphémérides
// ---------------------------------------------------------------------------

/**
 * Découpe la fenêtre à venir en une suite de journées, chacune assortie de
 * ses éphémérides. La première journée est le jour de référence lui-même.
 *
 * Une journée sans événement figure toujours dans le tableau : au rendu, le
 * choix d'afficher ou non ce jour appartient à la page qui appelle.
 */
export function ephemeridesSemaine(
  donnees: DonneesArbre,
  reference: Date,
  nombreJours = 7
): JourneeEphemerides[] {
  const debut = jourLocal(reference);
  const resultat: JourneeEphemerides[] = [];
  for (let i = 0; i < nombreJours; i += 1) {
    const date = jourLocal(debut, i);
    resultat.push({ date, ephemerides: ephemeridesDeCeJour(donnees, date) });
  }
  return resultat;
}

/**
 * Les prochaines éphémérides, à partir du jour de référence, jusqu'à en
 * réunir `combien` ou dépasser la fenêtre balayée.
 *
 * Utile à l'accueil, qui n'a de place que pour quelques entrées : le jour
 * même s'il en propose assez, sinon les jours suivants dans l'ordre.
 */
export function prochainesEphemerides(
  donnees: DonneesArbre,
  reference: Date,
  combien: number,
  fenetreJours = 14
): Ephemeride[] {
  if (combien <= 0) return [];

  const rassemblees: Ephemeride[] = [];
  for (let i = 0; i < fenetreJours && rassemblees.length < combien; i += 1) {
    rassemblees.push(
      ...ephemeridesDeCeJour(donnees, jourLocal(reference, i))
    );
  }
  return rassemblees.slice(0, combien);
}
