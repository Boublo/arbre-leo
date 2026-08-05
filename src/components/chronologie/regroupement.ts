import {
  decennieDeLAnnee,
  siecleDeLaDecennie,
  type EntreeChronologie,
} from '@/components/chronologie/vocabulaire';

/**
 * Mise en paliers de la frise.
 *
 * Trois siècles à la file ne se lisent pas. On les découpe en siècles, puis en
 * décennies, puis en années : le lecteur descend d'un repère large vers un
 * repère précis, et retrouve toujours où il en est. Les décennies vides ne sont
 * pas dessinées — elles seraient des dizaines de bandes blanches — mais elles
 * sont comptées, pour qu'un long silence de la famille reste visible.
 *
 * Une vue alternative regroupe les mêmes entrées par lieu : elle sert quand
 * c'est la géographie de la famille qu'on cherche à embrasser, plutôt que sa
 * chronologie. Les deux regroupements partent des mêmes entrées et se laissent
 * choisir sans nouveau chargement.
 */

export type GroupeAnnee = {
  annee: number;
  entrees: EntreeChronologie[];
};

export type GroupeDecennie = {
  /** Première année de la décennie : 1750 pour 1750-1759. */
  decennie: number;
  annees: GroupeAnnee[];
  total: number;
  /** Nombre de décennies sans la moindre trace avant celle-ci. */
  ecart: number;
};

export type BlocSiecle = {
  siecle: number;
  decennies: GroupeDecennie[];
  total: number;
  premiereAnnee: number;
  derniereAnnee: number;
};

export type FriseRegroupee = {
  siecles: BlocSiecle[];
  /** Ce qui n'a pas d'année : jamais jeté, montré à part en fin de frise. */
  sansAnnee: EntreeChronologie[];
};

export function regrouper(entrees: EntreeChronologie[]): FriseRegroupee {
  const sansAnnee: EntreeChronologie[] = [];
  const parAnnee = new Map<number, EntreeChronologie[]>();

  for (const entree of entrees) {
    if (entree.annee === null) {
      sansAnnee.push(entree);
      continue;
    }
    const liste = parAnnee.get(entree.annee);
    if (liste) liste.push(entree);
    else parAnnee.set(entree.annee, [entree]);
  }

  const annees = [...parAnnee.keys()].sort((a, b) => a - b);

  const siecles: BlocSiecle[] = [];
  let decenniePrecedente: number | null = null;

  for (const annee of annees) {
    const entreesAnnee = parAnnee.get(annee) ?? [];
    const decennie = decennieDeLAnnee(annee);
    const siecle = siecleDeLaDecennie(decennie);

    let blocSiecle = siecles.at(-1);
    if (!blocSiecle || blocSiecle.siecle !== siecle) {
      blocSiecle = {
        siecle,
        decennies: [],
        total: 0,
        premiereAnnee: annee,
        derniereAnnee: annee,
      };
      siecles.push(blocSiecle);
    }

    let blocDecennie = blocSiecle.decennies.at(-1);
    if (!blocDecennie || blocDecennie.decennie !== decennie) {
      blocDecennie = {
        decennie,
        annees: [],
        total: 0,
        ecart:
          decenniePrecedente === null
            ? 0
            : Math.max(0, (decennie - decenniePrecedente) / 10 - 1),
      };
      blocSiecle.decennies.push(blocDecennie);
      decenniePrecedente = decennie;
    }

    blocDecennie.annees.push({ annee, entrees: entreesAnnee });
    blocDecennie.total += entreesAnnee.length;
    blocSiecle.total += entreesAnnee.length;
    blocSiecle.derniereAnnee = annee;
  }

  return { siecles, sansAnnee };
}

// ---------------------------------------------------------------------------
// Vue alternative : par lieu
// ---------------------------------------------------------------------------

export type GroupeLieu = {
  /** Libellé du lieu tel qu'affiché dans la frise. */
  lieu: string;
  /** Clef stable pour le DOM ; obtenue à partir du libellé. */
  cle: string;
  /** Entrées rattachées, triées de la plus ancienne à la plus récente. */
  entrees: EntreeChronologie[];
  premiereAnnee: number | null;
  derniereAnnee: number | null;
};

export type VueLieux = {
  groupes: GroupeLieu[];
  /** Les entrées sans lieu identifié : rassemblées à part plutôt que noyées. */
  sansLieu: EntreeChronologie[];
};

/** Nettoyage minimal pour rassembler les orthographes proches d'un même lieu. */
function cle(libelle: string): string {
  return libelle
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Regroupe les entrées par lieu, tel qu'affiché sur la frise (« Oran (Algérie) »
 * reste distinct d'« Oran », faute de mieux). Les groupes sont ordonnés par
 * date de leur première entrée : la géographie retrace ainsi le chemin réel de
 * la famille, du plus ancien au plus récent.
 */
export function regrouperParLieu(entrees: EntreeChronologie[]): VueLieux {
  const parCle = new Map<string, GroupeLieu>();
  const sansLieu: EntreeChronologie[] = [];

  for (const entree of entrees) {
    if (!entree.lieu) {
      sansLieu.push(entree);
      continue;
    }
    const cleLieu = cle(entree.lieu);
    let groupe = parCle.get(cleLieu);
    if (!groupe) {
      groupe = {
        lieu: entree.lieu,
        cle: cleLieu,
        entrees: [],
        premiereAnnee: null,
        derniereAnnee: null,
      };
      parCle.set(cleLieu, groupe);
    }
    groupe.entrees.push(entree);

    if (entree.annee !== null) {
      if (groupe.premiereAnnee === null || entree.annee < groupe.premiereAnnee) {
        groupe.premiereAnnee = entree.annee;
      }
      if (groupe.derniereAnnee === null || entree.annee > groupe.derniereAnnee) {
        groupe.derniereAnnee = entree.annee;
      }
    }
  }

  // On garde l'ordre chronologique interne — chaque groupe se lit alors comme
  // un carnet de séjour, du premier au dernier passage connu.
  for (const groupe of parCle.values()) {
    groupe.entrees.sort((a, b) => (a.tri < b.tri ? -1 : a.tri > b.tri ? 1 : 0));
  }

  const groupes = [...parCle.values()].sort((a, b) => {
    const debutA = a.premiereAnnee ?? Number.POSITIVE_INFINITY;
    const debutB = b.premiereAnnee ?? Number.POSITIVE_INFINITY;
    if (debutA !== debutB) return debutA - debutB;
    return a.lieu.localeCompare(b.lieu, 'fr');
  });

  return { groupes, sansLieu };
}
