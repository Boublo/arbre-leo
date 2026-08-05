import { coteDesBranches, TON_COTE } from '@/lib/branches';
import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';
import { anneesCourtes, portraitDePersonne } from '@/components/portrait/types';

const LARGEUR = 300;
const HAUTEUR = 200;
const LARGEUR_CASE = 92;
const HAUTEUR_CASE = 34;
// Rayon en pixels : reflète --rayon-petit (0.5rem à 16px de base). Centralisé
// ici pour rester en écho du design system sans introduire de lecture runtime
// de getComputedStyle dans un SVG rendu côté serveur.
const RAYON_CASE = 8;

const Y_PARENTS = 22;
const Y_FOCUS = 100;
const Y_ENFANTS = 178;

/**
 * Aperçu figé de la parenté immédiate.
 *
 * Rôle : donner d’un coup d’œil ce qui entoure une personne — parents en haut,
 * elle-même et ses éventuels conjoints au milieu, ses enfants en dessous — sans
 * remplacer la vue complète de l’arbre. Chaque case mène à sa fiche.
 *
 * Le composant est délibérément figé : pas de zoom, pas de dépliement. Ce qui
 * est complet appelle la vue complète.
 */
export function MiniArbre({
  focusId,
  donnees,
}: {
  focusId: string;
  donnees: DonneesArbre;
}) {
  const focus = donnees.personnes.get(focusId);
  if (!focus) return null;

  const parents = (donnees.parents.get(focusId) ?? [])
    .map((id) => donnees.personnes.get(id))
    .filter((p): p is PersonneArbre => Boolean(p));

  const enfants = (donnees.enfants.get(focusId) ?? [])
    .map((id) => donnees.personnes.get(id))
    .filter((p): p is PersonneArbre => Boolean(p));

  const conjoints = uniques(
    focus.unions.flatMap((uid) => {
      const u = donnees.unions.get(uid);
      if (!u) return [];
      return [u.conjointA, u.conjointB].filter(
        (c): c is string => Boolean(c) && c !== focusId
      );
    })
  )
    .map((id) => donnees.personnes.get(id))
    .filter((p): p is PersonneArbre => Boolean(p));

  if (parents.length === 0 && conjoints.length === 0 && enfants.length === 0) {
    return (
      <p className="text-sm text-encre-tres-douce">
        Aucun proche n’est encore rattaché à {focus.nomComplet}.
      </p>
    );
  }

  const xParents = repartir(parents.length, LARGEUR);
  const xLigneCentrale = repartir(1 + conjoints.length, LARGEUR);
  const xEnfants = repartir(enfants.length, LARGEUR);

  // La personne choisie tient toujours la première place de sa rangée : c’est
  // d’elle que partent les liens vers les enfants.
  const xFocus = xLigneCentrale[0]!;

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      role="img"
      aria-label={`Parenté immédiate de ${focus.nomComplet}`}
      className="h-auto w-full max-w-[300px]"
      preserveAspectRatio="xMidYMid meet"
    >
      {parents.map((p, i) => (
        <line
          key={`lp-${p.id}`}
          x1={xParents[i]}
          y1={Y_PARENTS + HAUTEUR_CASE / 2}
          x2={xFocus}
          y2={Y_FOCUS - HAUTEUR_CASE / 2}
          stroke="var(--bordure-forte)"
          strokeWidth={1}
        />
      ))}

      {conjoints.map((c, i) => {
        const x = xLigneCentrale[i + 1]!;
        const [gauche, droite] = xFocus <= x ? [xFocus, x] : [x, xFocus];
        return (
          <line
            key={`lc-${c.id}`}
            x1={gauche + LARGEUR_CASE / 2}
            y1={Y_FOCUS}
            x2={droite - LARGEUR_CASE / 2}
            y2={Y_FOCUS}
            stroke="var(--or)"
            strokeWidth={1.5}
          />
        );
      })}

      {enfants.map((e, i) => (
        <line
          key={`le-${e.id}`}
          x1={xFocus}
          y1={Y_FOCUS + HAUTEUR_CASE / 2}
          x2={xEnfants[i]}
          y2={Y_ENFANTS - HAUTEUR_CASE / 2}
          stroke="var(--bordure-forte)"
          strokeWidth={1}
        />
      ))}

      {parents.map((p, i) => (
        <Case key={p.id} personne={p} x={xParents[i]!} y={Y_PARENTS} />
      ))}
      <Case personne={focus} x={xFocus} y={Y_FOCUS} focus />
      {conjoints.map((c, i) => (
        <Case
          key={c.id}
          personne={c}
          x={xLigneCentrale[i + 1]!}
          y={Y_FOCUS}
        />
      ))}
      {enfants.map((e, i) => (
        <Case key={e.id} personne={e} x={xEnfants[i]!} y={Y_ENFANTS} />
      ))}
    </svg>
  );
}

function Case({
  personne,
  x,
  y,
  focus = false,
}: {
  personne: PersonneArbre;
  x: number;
  y: number;
  focus?: boolean;
}) {
  const portrait = portraitDePersonne(personne);
  const cote = coteDesBranches(personne.branches);
  const annees = anneesCourtes(portrait);

  const contenu = (
    <>
      <title>
        {personne.nomComplet}
        {annees ? ` — ${annees}` : ''}
      </title>
      <rect
        className="case"
        x={x - LARGEUR_CASE / 2}
        y={y - HAUTEUR_CASE / 2}
        width={LARGEUR_CASE}
        height={HAUTEUR_CASE}
        rx={RAYON_CASE}
        fill="var(--fond-carte)"
        stroke={focus ? 'var(--accent)' : 'var(--bordure)'}
        strokeWidth={focus ? 1.5 : 1}
      />
      <rect
        x={x - LARGEUR_CASE / 2}
        y={y + HAUTEUR_CASE / 2 - 3}
        width={LARGEUR_CASE}
        height={3}
        fill={TON_COTE[cote]}
      />
      <text
        x={x}
        y={y - 3}
        textAnchor="middle"
        fill="var(--encre)"
        fontSize={9}
        fontWeight={focus ? 600 : 500}
      >
        {tronquer(personne.nomComplet, 18)}
      </text>
      {annees && (
        <text
          x={x}
          y={y + 8}
          textAnchor="middle"
          fill="var(--encre-douce)"
          fontSize={8}
        >
          {annees}
        </text>
      )}
    </>
  );

  // La case focus n'a pas d'ancre : ce serait un lien fantôme sans destination.
  // On la rend en <g role="img"> pour rester annoncée sans promettre du cliquable.
  if (focus) {
    return (
      <g
        role="img"
        aria-current="true"
        aria-label={`${personne.nomComplet}${annees ? ` (${annees})` : ''}`}
      >
        {contenu}
      </g>
    );
  }

  return (
    <a
      href={`/personne/${personne.id}`}
      aria-label={`${personne.nomComplet}${annees ? ` (${annees})` : ''}`}
      className="transition hover:opacity-80 focus:outline-none [&:focus-visible_rect.case]:stroke-accent"
    >
      {contenu}
    </a>
  );
}

/**
 * Distribue `n` cases sur `largeur`, avec une marge suffisante pour que les
 * cases de bord ne débordent pas et se posent avec un peu d’air.
 */
function repartir(n: number, largeur: number): number[] {
  if (n === 0) return [];
  const marge = LARGEUR_CASE / 2 + 6;
  if (n === 1) return [largeur / 2];
  const pas = (largeur - 2 * marge) / (n - 1);
  return Array.from({ length: n }, (_, i) => marge + i * pas);
}

function uniques(ids: string[]): string[] {
  return [...new Set(ids)];
}

function tronquer(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  return texte.slice(0, max - 1).trimEnd() + '…';
}
