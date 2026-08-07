import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';
import { joursDepuis, SEUIL_RELANCE } from '@/lib/relance-chantier';

/**
 * Détection déterministe d’incohérences — même esprit que `scripts/diagnostic.mjs`,
 * utilisable depuis l’admin sans LLM. Aucune correction automatique.
 */

export type SeveriteAnomalie = 'critique' | 'attention' | 'info';

export type RegleQualite =
  | 'QLT-001'
  | 'QLT-002'
  | 'QLT-003'
  | 'QLT-004'
  | 'QLT-005'
  | 'QLT-006'
  | 'QLT-007'
  | 'QLT-009'
  | 'QLT-010';

export type Anomalie = {
  id: string;
  regleId: RegleQualite;
  severite: SeveriteAnomalie;
  titre: string;
  detail: string;
  personneIds: string[];
  lien?: { href: string; libelle: string };
};

export type DoublonPotentiel = {
  cle: string;
  personneIds: string[];
  libelle: string;
  anneeNaissance: number;
};

export type RapportCoherence = {
  anomalies: Anomalie[];
  doublons: DoublonPotentiel[];
  comptes: {
    personnes: number;
    unions: number;
    avecNaissance: number;
    avecDeces: number;
    isolees: number;
  };
  couverture: {
    naissanceConnue: number;
    preuveActeOuAnom: number;
  };
};

export type ResumeQualite = {
  schemaVersion: 1;
  genereLe: string;
  source: 'administration' | 'diagnostic-cli' | 'ci-fictive';
  comptes: RapportCoherence['comptes'];
  couverture: RapportCoherence['couverture'];
  anomalies: Record<SeveriteAnomalie, number>;
  regles: Array<{
    id: RegleQualite;
    severite: SeveriteAnomalie;
    occurrences: number;
  }>;
  statut: 'sain' | 'a_revoir' | 'bloquant';
};

export type ChantierQualite = {
  id: string;
  statut: string;
  demande_le: string | null;
  reponse_le: string | null;
};

export type FaitQualite = {
  id: string;
  annee_debut: number | null;
};

export type FaitPersonneQualite = {
  fait_id: string;
  personne_id: string;
};

const TOLERANCE_FAIT_APRES_DECES = 5;

/**
 * Signale les rattachements historiques incompatibles avec les bornes de vie
 * connues. Une tolérance couvre les mentions posthumes et commémoratives.
 */
export function analyserFaitsHorsPeriode(
  donnees: DonneesArbre,
  faits: FaitQualite[],
  rattachements: FaitPersonneQualite[]
): Anomalie[] {
  const faitsParId = new Map(faits.map((fait) => [fait.id, fait]));
  const anomalies: Anomalie[] = [];

  for (const rattachement of rattachements) {
    const personne = donnees.personnes.get(rattachement.personne_id);
    const fait = faitsParId.get(rattachement.fait_id);
    if (!personne || !fait || fait.annee_debut === null) continue;
    const annee = fait.annee_debut;

    const naissance = personne.naissance?.annee;
    const deces = personne.deces?.annee;
    const avantNaissance = naissance !== null && naissance !== undefined && annee < naissance;
    const apresDeces = deces !== null && deces !== undefined && annee > deces + TOLERANCE_FAIT_APRES_DECES;
    if (!avantNaissance && !apresDeces) continue;

    anomalies.push({
      id: `fait-hors-periode:${fait.id}:${personne.id}`,
      regleId: 'QLT-006',
      severite: 'attention',
      titre: 'Fait historique hors période de vie',
      detail: avantNaissance
        ? `Un fait daté de ${annee} précède la naissance connue.`
        : `Un fait daté de ${annee} est postérieur de plus de ${TOLERANCE_FAIT_APRES_DECES} ans au décès connu.`,
      personneIds: [personne.id],
    });
  }

  return anomalies;
}

/**
 * Les demandes dépassant le délai de relance sont des signaux de suivi, pas
 * des erreurs généalogiques. L'identité du chantier reste sur la page dédiée.
 */
export function analyserChantiersEnAttente(
  chantiers: ChantierQualite[],
  maintenant: number = Date.now()
): Anomalie[] {
  return chantiers.flatMap((chantier) => {
    const attente = joursDepuis(chantier.demande_le, maintenant);
    if (
      chantier.statut !== 'en_attente_reponse' ||
      chantier.reponse_le ||
      attente === null ||
      attente < SEUIL_RELANCE
    ) {
      return [];
    }
    return [{
      id: `relance-chantier:${chantier.id}`,
      regleId: 'QLT-007',
      severite: 'attention',
      titre: 'Recherche sans réponse à relancer',
      detail: `Une demande attend une réponse depuis ${attente} jours.`,
      personneIds: [],
      lien: { href: '/recherches', libelle: 'Voir les recherches' },
    }];
  });
}

export function completerRapportCoherence(
  rapport: RapportCoherence,
  supplementaires: Anomalie[]
): RapportCoherence {
  return {
    ...rapport,
    anomalies: [...rapport.anomalies, ...supplementaires].sort(comparerAnomalies),
  };
}

const AGE_PARENT_MIN = 12;
const AGE_PARENT_MAX = 60;

/** Enlève accents et casse pour rapprocher homonymes. */
export function normaliserTexte(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function cleDoublon(p: PersonneArbre): string | null {
  const annee = p.naissance?.annee;
  if (annee == null) return null;
  const prenoms = normaliserTexte(p.prenoms ?? '');
  const nom = normaliserTexte(p.nom ?? '');
  if (!prenoms && !nom) return null;
  return `${prenoms}|${nom}|${annee}`;
}

/**
 * Parcourt le graphe déjà chargé et produit un rapport lisible.
 * Les anomalies sont triées : critiques d’abord, puis attention, puis info.
 */
export function analyserCoherence(donnees: DonneesArbre): RapportCoherence {
  const anomalies: Anomalie[] = [];
  let isolees = 0;
  let avecNaissance = 0;
  let avecDeces = 0;
  let avecPreuveActeOuAnom = 0;

  for (const p of donnees.personnes.values()) {
    if (p.naissance?.annee != null) avecNaissance += 1;
    if (p.deces?.annee != null) avecDeces += 1;
    if (p.niveauxPreuve.includes('acte') || p.niveauxPreuve.includes('anom')) {
      avecPreuveActeOuAnom += 1;
    }

    const n = p.naissance?.annee;
    const d = p.deces?.annee;
    if (n != null && d != null && d < n) {
      anomalies.push({
        id: `deces-avant-naissance:${p.id}`,
        regleId: 'QLT-001',
        severite: 'critique',
        titre: 'Décès antérieur à la naissance',
        detail: `${p.nomComplet} : naissance ${n}, décès ${d}.`,
        personneIds: [p.id],
      });
    }

    if (p.issuDe && !donnees.unions.has(p.issuDe)) {
      anomalies.push({
        id: `filiation-sans-union:${p.id}:${p.issuDe}`,
        regleId: 'QLT-009',
        severite: 'critique',
        titre: 'Filiation rattachée à une union absente',
        detail: `${p.nomComplet} référence un foyer introuvable dans le graphe chargé.`,
        personneIds: [p.id],
      });
    }

    const parents = donnees.parents.get(p.id) ?? [];
    const enfants = donnees.enfants.get(p.id) ?? [];
    const isole =
      parents.length === 0 &&
      enfants.length === 0 &&
      p.unions.length === 0 &&
      !p.issuDe;
    if (isole) {
      isolees += 1;
      anomalies.push({
        id: `isole:${p.id}`,
        regleId: 'QLT-004',
        severite: 'info',
        titre: 'Personne isolée',
        detail: `${p.nomComplet} n’a ni parents, ni enfants, ni union connus.`,
        personneIds: [p.id],
      });
    }

    for (const parentId of parents) {
      const parent = donnees.personnes.get(parentId);
      if (!parent) continue;
      const np = parent.naissance?.annee;
      const ne = p.naissance?.annee;
      if (np == null || ne == null) continue;

      if (ne < np) {
        anomalies.push({
          id: `enfant-avant-parent:${p.id}:${parentId}`,
          regleId: 'QLT-002',
          severite: 'critique',
          titre: 'Enfant né avant le parent',
          detail: `${p.nomComplet} (${ne}) avant ${parent.nomComplet} (${np}).`,
          personneIds: [p.id, parentId],
        });
        continue;
      }

      const ecart = ne - np;
      if (ecart < AGE_PARENT_MIN || ecart > AGE_PARENT_MAX) {
        anomalies.push({
          id: `ecart-age:${p.id}:${parentId}`,
          regleId: 'QLT-003',
          severite: 'attention',
          titre: 'Écart d’âge parent–enfant inhabituel',
          detail: `${parent.nomComplet} → ${p.nomComplet} : ${ecart} ans (attendu ${AGE_PARENT_MIN}–${AGE_PARENT_MAX}).`,
          personneIds: [p.id, parentId],
        });
      }
    }
  }

  const descendants = new Map<string, Set<string>>();
  const ajouterLienParentEnfant = (parentId: string | null, enfantId: string) => {
    if (!parentId || !donnees.personnes.has(parentId) || !donnees.personnes.has(enfantId)) return;
    const enfants = descendants.get(parentId) ?? new Set<string>();
    enfants.add(enfantId);
    descendants.set(parentId, enfants);
  };

  for (const [parentId, enfants] of donnees.enfants) {
    for (const enfantId of enfants) ajouterLienParentEnfant(parentId, enfantId);
  }
  for (const union of donnees.unions.values()) {
    for (const enfantId of union.enfants) {
      ajouterLienParentEnfant(union.conjointA, enfantId);
      ajouterLienParentEnfant(union.conjointB, enfantId);
    }
  }

  const etats = new Map<string, 'en-cours' | 'termine'>();
  const chemin: string[] = [];
  const cyclesVus = new Set<string>();
  const cleCycle = (ids: string[]) =>
    ids
      .map((_, debut) => [...ids.slice(debut), ...ids.slice(0, debut)].join(':'))
      .sort()[0]!;
  const visiter = (personneId: string) => {
    etats.set(personneId, 'en-cours');
    chemin.push(personneId);

    for (const enfantId of descendants.get(personneId) ?? []) {
      if (etats.get(enfantId) === 'en-cours') {
        const debut = chemin.indexOf(enfantId);
        const cycle = chemin.slice(debut);
        const cle = cleCycle(cycle);
        if (!cyclesVus.has(cle)) {
          cyclesVus.add(cle);
          anomalies.push({
            id: `cycle-filiation:${cle}`,
            regleId: 'QLT-010',
            severite: 'critique',
            titre: 'Cycle de filiation détecté',
            detail: `Le graphe relie circulairement ${cycle
              .map((id) => donnees.personnes.get(id)?.nomComplet ?? id)
              .join(' → ')}.`,
            personneIds: cycle,
          });
        }
      } else if (!etats.has(enfantId)) {
        visiter(enfantId);
      }
    }

    chemin.pop();
    etats.set(personneId, 'termine');
  };

  for (const personneId of donnees.personnes.keys()) {
    if (!etats.has(personneId)) visiter(personneId);
  }

  // Doublons : même prénoms + nom + année de naissance
  const parCle = new Map<string, PersonneArbre[]>();
  for (const p of donnees.personnes.values()) {
    const cle = cleDoublon(p);
    if (!cle) continue;
    const liste = parCle.get(cle) ?? [];
    liste.push(p);
    parCle.set(cle, liste);
  }

  const doublons: DoublonPotentiel[] = [];
  for (const [cle, liste] of parCle) {
    if (liste.length < 2) continue;
    const annee = liste[0]!.naissance!.annee!;
    doublons.push({
      cle,
      personneIds: liste.map((p) => p.id),
      libelle: liste.map((p) => p.nomComplet).join(' · '),
      anneeNaissance: annee,
    });
    anomalies.push({
      id: `doublon:${cle}`,
      regleId: 'QLT-005',
      severite: 'attention',
      titre: 'Doublon potentiel',
      detail: `${liste.length} fiches pour « ${liste[0]!.nomComplet} » né(e) en ${annee}.`,
      personneIds: liste.map((p) => p.id),
    });
  }

  anomalies.sort(comparerAnomalies);
  doublons.sort((a, b) => b.personneIds.length - a.personneIds.length);

  return {
    anomalies,
    doublons,
    comptes: {
      personnes: donnees.personnes.size,
      unions: donnees.unions.size,
      avecNaissance,
      avecDeces,
      isolees,
    },
    couverture: {
      naissanceConnue: avecNaissance,
      preuveActeOuAnom: avecPreuveActeOuAnom,
    },
  };
}

const ORDRE_SEVERITE: Record<SeveriteAnomalie, number> = {
  critique: 0,
  attention: 1,
  info: 2,
};

function comparerAnomalies(a: Anomalie, b: Anomalie): number {
  return ORDRE_SEVERITE[a.severite] - ORDRE_SEVERITE[b.severite] || a.titre.localeCompare(b.titre, 'fr');
}

/**
 * Produit un état partageable du contrôle sans y inclure de personne, de lieu
 * ou de source. La date est fournie par l'appelant pour garder les tests purs.
 */
export function resumerQualite(
  rapport: RapportCoherence,
  options: Pick<ResumeQualite, 'genereLe' | 'source'>
): ResumeQualite {
  const anomalies: Record<SeveriteAnomalie, number> = {
    critique: 0,
    attention: 0,
    info: 0,
  };
  const regles = new Map<RegleQualite, { severite: SeveriteAnomalie; occurrences: number }>();

  for (const anomalie of rapport.anomalies) {
    anomalies[anomalie.severite] += 1;
    const regle = regles.get(anomalie.regleId) ?? {
      severite: anomalie.severite,
      occurrences: 0,
    };
    regle.occurrences += 1;
    regles.set(anomalie.regleId, regle);
  }

  return {
    schemaVersion: 1,
    ...options,
    comptes: rapport.comptes,
    couverture: rapport.couverture,
    anomalies,
    regles: [...regles.entries()]
      .map(([id, regle]) => ({ id, ...regle }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    statut:
      anomalies.critique > 0 ? 'bloquant' : anomalies.attention > 0 ? 'a_revoir' : 'sain',
  };
}
