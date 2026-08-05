import { siecleDeLaDecennie, type EntreeChronologie } from '@/components/chronologie/vocabulaire';

/**
 * Mise en paliers de la frise.
 *
 * Trois siècles à la file ne se lisent pas. On les découpe en siècles, puis en
 * décennies, puis en années : le lecteur descend d'un repère large vers un
 * repère précis, et retrouve toujours où il en est. Les décennies vides ne sont
 * pas dessinées — elles seraient des dizaines de bandes blanches — mais elles
 * sont comptées, pour qu'un long silence de la famille reste visible.
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
    const decennie = Math.floor(annee / 10) * 10;
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
