import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';

/**
 * Détection déterministe d’incohérences — même esprit que `scripts/diagnostic.mjs`,
 * utilisable depuis l’admin sans LLM. Aucune correction automatique.
 */

export type SeveriteAnomalie = 'critique' | 'attention' | 'info';

export type Anomalie = {
  id: string;
  severite: SeveriteAnomalie;
  titre: string;
  detail: string;
  personneIds: string[];
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
};

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

  for (const p of donnees.personnes.values()) {
    if (p.naissance?.annee != null) avecNaissance += 1;
    if (p.deces?.annee != null) avecDeces += 1;

    const n = p.naissance?.annee;
    const d = p.deces?.annee;
    if (n != null && d != null && d < n) {
      anomalies.push({
        id: `deces-avant-naissance:${p.id}`,
        severite: 'critique',
        titre: 'Décès antérieur à la naissance',
        detail: `${p.nomComplet} : naissance ${n}, décès ${d}.`,
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
          severite: 'attention',
          titre: 'Écart d’âge parent–enfant inhabituel',
          detail: `${parent.nomComplet} → ${p.nomComplet} : ${ecart} ans (attendu ${AGE_PARENT_MIN}–${AGE_PARENT_MAX}).`,
          personneIds: [p.id, parentId],
        });
      }
    }
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
      severite: 'attention',
      titre: 'Doublon potentiel',
      detail: `${liste.length} fiches pour « ${liste[0]!.nomComplet} » né(e) en ${annee}.`,
      personneIds: liste.map((p) => p.id),
    });
  }

  const ordre: Record<SeveriteAnomalie, number> = {
    critique: 0,
    attention: 1,
    info: 2,
  };
  anomalies.sort(
    (a, b) => ordre[a.severite] - ordre[b.severite] || a.titre.localeCompare(b.titre, 'fr')
  );
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
  };
}
