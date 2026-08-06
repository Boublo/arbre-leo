import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';
import { compterEntourage } from '@/lib/arbre-graphe';
import { LIBELLE_COTE, coteDesBranches } from '@/lib/branches';

/**
 * Résumé déterministe d’une branche autour d’une personne.
 * Sourcé uniquement sur les données déjà en base — pas d’invention, pas de LLM.
 */

export type ResumeBranche = {
  personneId: string;
  phrase: string;
  points: string[];
  brancheLibelle: string;
};

function topLieux(personnes: PersonneArbre[], combien = 3): string[] {
  const compte = new Map<string, number>();
  for (const p of personnes) {
    const lieu = p.naissance?.lieuCourt;
    if (!lieu) continue;
    compte.set(lieu, (compte.get(lieu) ?? 0) + 1);
  }
  return [...compte.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .slice(0, combien)
    .map(([lieu]) => lieu);
}

function topMetiers(personnes: PersonneArbre[], combien = 3): string[] {
  const compte = new Map<string, number>();
  for (const p of personnes) {
    const metier = p.profession?.trim();
    if (!metier) continue;
    compte.set(metier, (compte.get(metier) ?? 0) + 1);
  }
  return [...compte.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .slice(0, combien)
    .map(([m]) => m);
}

/**
 * Résume l’entourage et la branche de couleur d’une personne.
 * Si la branche est vide, on parle de l’entourage immédiat seulement.
 */
export function resumerBranche(
  donnees: DonneesArbre,
  personneId: string
): ResumeBranche | null {
  const personne = donnees.personnes.get(personneId);
  if (!personne) return null;

  const cote = coteDesBranches(personne.branches);
  const brancheLibelle = LIBELLE_COTE[cote];

  const memeBranche = [...donnees.personnes.values()].filter((p) => {
    if (personne.branches.length === 0) return p.id === personneId;
    return p.branches.some((b) => personne.branches.includes(b));
  });

  const pool = memeBranche.length > 1 ? memeBranche : [personne];

  let minAnnee = Number.POSITIVE_INFINITY;
  let maxAnnee = Number.NEGATIVE_INFINITY;
  for (const p of pool) {
    for (const a of [p.naissance?.annee, p.deces?.annee]) {
      if (a == null) continue;
      if (a < minAnnee) minAnnee = a;
      if (a > maxAnnee) maxAnnee = a;
    }
  }

  const entourage = compterEntourage(donnees, personneId);
  const lieux = topLieux(pool);
  const metiers = topMetiers(pool);

  const points: string[] = [];
  points.push(
    `${pool.length} personne${pool.length > 1 ? 's' : ''} sur la branche ${brancheLibelle.toLowerCase()}.`
  );

  if (Number.isFinite(minAnnee) && Number.isFinite(maxAnnee)) {
    points.push(
      minAnnee === maxAnnee
        ? `Année documentée : ${minAnnee}.`
        : `Période couverte : ${minAnnee} – ${maxAnnee}.`
    );
  }

  if (entourage.ascendants > 0 || entourage.descendants > 0) {
    points.push(
      `Autour de ${personne.prenoms?.split(' ')[0] ?? personne.nomComplet} : ` +
        `${entourage.ascendants} ascendant${entourage.ascendants > 1 ? 's' : ''}, ` +
        `${entourage.descendants} descendant${entourage.descendants > 1 ? 's' : ''}` +
        (entourage.freresEtSoeurs > 0
          ? `, ${entourage.freresEtSoeurs} frère${entourage.freresEtSoeurs > 1 ? 's' : ''} ou sœur${entourage.freresEtSoeurs > 1 ? 's' : ''}`
          : '') +
        '.'
    );
  }

  if (lieux.length > 0) {
    points.push(`Lieux de naissance les plus fréquents : ${lieux.join(', ')}.`);
  }
  if (metiers.length > 0) {
    points.push(`Métiers rencontrés : ${metiers.join(', ')}.`);
  }

  const phrase =
    Number.isFinite(minAnnee) && Number.isFinite(maxAnnee) && pool.length > 1
      ? `La branche ${brancheLibelle.toLowerCase()} compte ${pool.length} personnes documentées entre ${minAnnee} et ${maxAnnee}.`
      : `Autour de ${personne.nomComplet}, la branche ${brancheLibelle.toLowerCase()} rassemble ce que l’arbre sait déjà.`;

  return {
    personneId,
    phrase,
    points,
    brancheLibelle,
  };
}
