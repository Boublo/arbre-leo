import type { DonneesArbre, PersonneArbre, UnionArbre } from '@/lib/arbre';

/**
 * Passage du graphe familial entre le serveur et le navigateur.
 *
 * L'arbre est chargé une seule fois, puis le navigateur recalcule lui-même la
 * disposition à chaque fois qu'on change de personne ou de mode d'affichage.
 * Cent vingt-cinq nœuds se placent en quelques millisecondes : faire un
 * aller-retour au serveur pour cela n'apporterait qu'une attente.
 *
 * Les `Map` ne franchissent pas la frontière serveur/client, d'où la
 * conversion en tableaux de paires puis la reconstruction de l'autre côté.
 *
 * Ce module ne dépend d'aucun accès aux données : il peut donc être importé
 * aussi bien par un composant serveur que par un composant client.
 */

export type GrapheSerialise = {
  personnes: PersonneArbre[];
  unions: UnionArbre[];
  parents: [string, string[]][];
  enfants: [string, string[]][];
};

export function serialiserGraphe(donnees: DonneesArbre): GrapheSerialise {
  return {
    personnes: [...donnees.personnes.values()],
    unions: [...donnees.unions.values()],
    parents: [...donnees.parents.entries()],
    enfants: [...donnees.enfants.entries()],
  };
}

export function reconstruireGraphe(graphe: GrapheSerialise): DonneesArbre {
  return {
    personnes: new Map(graphe.personnes.map((p) => [p.id, p])),
    unions: new Map(graphe.unions.map((u) => [u.id, u])),
    parents: new Map(graphe.parents),
    enfants: new Map(graphe.enfants),
  };
}

/** Enlève accents et casse : une recherche sans accent doit trouver le nom accentué. */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Cherche une personne par nom, lieu ou année.
 *
 * Les années de vie accompagnent toujours le résultat : la base compte
 * plusieurs homonymes exacts, et un nom seul ne permet pas de les distinguer.
 */
export function chercherPersonnes(
  personnes: PersonneArbre[],
  requete: string,
  combien = 10
): PersonneArbre[] {
  const q = normaliser(requete);
  if (q.length < 2) return [];

  const mots = q.split(/\s+/).filter(Boolean);

  const notes = personnes
    .map((p) => {
      const nom = normaliser(p.nomComplet);
      const complet = normaliser(
        `${p.nomComplet} ${p.surnom ?? ''} ${p.naissance?.lieu ?? ''} ` +
        `${p.naissance?.annee ?? ''} ${p.deces?.annee ?? ''}`
      );

      if (!mots.every((m) => complet.includes(m))) return null;

      // Un nom qui commence par ce qu'on tape passe devant un nom qui le
      // contient au milieu : on cherche presque toujours par le début.
      const note = nom.startsWith(q) ? 0 : nom.includes(q) ? 1 : 2;
      return { personne: p, note };
    })
    .filter((r): r is { personne: PersonneArbre; note: number } => r !== null);

  return notes
    .sort(
      (a, b) =>
        a.note - b.note ||
        (b.personne.naissance?.annee ?? 0) - (a.personne.naissance?.annee ?? 0)
    )
    .slice(0, combien)
    .map((r) => r.personne);
}

/** « 1886 – 1954 », « née en 1993 », « † 1954 », ou rien si l'on ne sait pas. */
export function anneesDeVie(personne: PersonneArbre): string | null {
  const naissance = personne.naissance?.annee;
  const deces = personne.deces?.annee;

  if (naissance && deces) return `${naissance} – ${deces}`;
  if (naissance) {
    return personne.presumeVivant
      ? `né${personne.sexe === 'F' ? 'e' : ''} en ${naissance}`
      : `${naissance} – ?`;
  }
  if (deces) return `† ${deces}`;
  return null;
}

/** Ce que la personne compte autour d'elle, pour annoncer ce qu'on va voir. */
export function compterEntourage(donnees: DonneesArbre, personneId: string) {
  const ascendants = parcourir(donnees, personneId, 'parents');
  const descendants = parcourir(donnees, personneId, 'enfants');

  return {
    ascendants: ascendants.total,
    generationsAuDessus: ascendants.profondeur,
    descendants: descendants.total,
    generationsEnDessous: descendants.profondeur,
    freresEtSoeurs: fratrieDe(donnees, personneId).length,
  };
}

function parcourir(donnees: DonneesArbre, depart: string, sens: 'parents' | 'enfants') {
  const table = sens === 'parents' ? donnees.parents : donnees.enfants;
  const vus = new Set<string>([depart]);
  let frontiere = [depart];
  let profondeur = 0;

  // Garde-fou : une boucle de filiation ne doit pas faire tourner sans fin.
  while (frontiere.length > 0 && profondeur < 30) {
    const suivante: string[] = [];
    for (const id of frontiere) {
      for (const voisin of table.get(id) ?? []) {
        if (vus.has(voisin)) continue;
        vus.add(voisin);
        suivante.push(voisin);
      }
    }
    if (suivante.length === 0) break;
    frontiere = suivante;
    profondeur += 1;
  }

  return { total: vus.size - 1, profondeur };
}

export function fratrieDe(donnees: DonneesArbre, personneId: string): string[] {
  const personne = donnees.personnes.get(personneId);
  if (!personne?.issuDe) return [];
  return (donnees.unions.get(personne.issuDe)?.enfants ?? []).filter(
    (e) => e !== personneId && donnees.personnes.has(e)
  );
}
