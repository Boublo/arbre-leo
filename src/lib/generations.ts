import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';

export type GenerationAscendance = {
  rang: number;
  libelle: string;
  personnes: PersonneArbre[];
};

/** Regroupe les ascendants connus par distance minimale, sans jamais compléter un lien absent. */
export function generationsAscendance(
  donnees: DonneesArbre,
  personneId: string,
  maximum = 8
): GenerationAscendance[] {
  if (!donnees.personnes.has(personneId)) return [];

  const rangParId = new Map<string, number>([[personneId, 0]]);
  let frontiere = [personneId];

  for (let rang = 1; rang <= maximum && frontiere.length > 0; rang += 1) {
    const suivante: string[] = [];
    for (const enfantId of frontiere) {
      for (const parentId of donnees.parents.get(enfantId) ?? []) {
        if (!donnees.personnes.has(parentId) || rangParId.has(parentId)) continue;
        rangParId.set(parentId, rang);
        suivante.push(parentId);
      }
    }
    frontiere = suivante;
  }

  const parRang = new Map<number, PersonneArbre[]>();
  for (const [id, rang] of rangParId) {
    const personne = donnees.personnes.get(id);
    if (!personne) continue;
    const liste = parRang.get(rang) ?? [];
    liste.push(personne);
    parRang.set(rang, liste);
  }

  return [...parRang.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rang, personnes]) => ({
      rang,
      libelle: libelleGeneration(rang),
      personnes: personnes.sort(
        (a, b) =>
          (a.naissance?.annee ?? Number.POSITIVE_INFINITY) -
            (b.naissance?.annee ?? Number.POSITIVE_INFINITY) ||
          a.nomComplet.localeCompare(b.nomComplet, 'fr')
      ),
    }));
}

function libelleGeneration(rang: number): string {
  if (rang === 0) return 'Point de départ';
  if (rang === 1) return 'Parents connus';
  if (rang === 2) return 'Grands-parents connus';
  return `${rang}e génération au-dessus`;
}
