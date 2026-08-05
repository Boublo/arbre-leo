import { coteDesBranches, TON_COTE } from '@/lib/branches';
import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';
import {
  formaterAnneesDeVie,
  portraitDePersonne,
} from '@/components/portrait/types';
import { Vignette } from '@/components/portrait/vignette';

/**
 * Barre de parenté immédiate — le contexte au premier coup d’œil.
 *
 * Posée en tête de la fiche, elle place la personne dans son bout de rivière :
 * deux générations en amont — grands-parents, parents — la personne elle-même
 * et, en aval, ses enfants. Ni un arbre entier, ni la parenté complète : juste
 * de quoi savoir de qui l’on descend et à qui l’on a donné vie.
 *
 * Chaque case est une `<Vignette>`, celle qu’on emploie partout ailleurs pour
 * citer quelqu’un : mêmes règles de nommage, mêmes pastilles de côté, mêmes
 * dates. Le sujet reste au centre, mis en relief mais inerte pour éviter la
 * boucle « aller chez soi ».
 *
 * L’ensemble est un `<nav>` : les technologies d’assistance l’annoncent comme
 * une aide à la circulation, pas comme un contenu de première lecture.
 */
export function BarreParente({
  focusId,
  donnees,
}: {
  focusId: string;
  donnees: DonneesArbre;
}) {
  const focus = donnees.personnes.get(focusId);
  if (!focus) return null;

  const parents = idsVersPersonnes(donnees.parents.get(focusId) ?? [], donnees);

  // Grands-parents : ceux des parents connus, en gardant l’ordre paternel puis
  // maternel autant que possible — c’est plus lisible qu’un mélange. Un même
  // ancêtre partagé par les deux parents n’est cité qu’une fois.
  const grandsParents = dedoublonner(
    parents.flatMap((p) =>
      idsVersPersonnes(donnees.parents.get(p.id) ?? [], donnees)
    )
  );

  const enfants = idsVersPersonnes(donnees.enfants.get(focusId) ?? [], donnees);

  // Les rangées ne s’affichent que si l’on a de quoi les remplir. Une fiche
  // sans parenté connue ne doit pas laisser une bande vide au-dessus du titre.
  const aQuelqueChose =
    grandsParents.length > 0 || parents.length > 0 || enfants.length > 0;
  if (!aQuelqueChose) return null;

  return (
    <nav
      aria-label={`Parenté immédiate de ${focus.nomComplet}`}
      className="carte flex flex-col gap-4 p-4 sm:p-5"
    >
      <p className="text-xs uppercase tracking-wider text-encre-tres-douce">
        {autourDe(focus)}
      </p>

      {grandsParents.length > 0 && (
        <Rangee libelle="Grands-parents" personnes={grandsParents} />
      )}
      {parents.length > 0 && <Rangee libelle="Parents" personnes={parents} />}

      <RangeeFocus focus={focus} />

      {enfants.length > 0 && <Rangee libelle="Enfants" personnes={enfants} />}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Rangées
// ---------------------------------------------------------------------------

function Rangee({
  libelle,
  personnes,
}: {
  libelle: string;
  personnes: PersonneArbre[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
        {libelle}
      </span>
      <ul className="grid gap-2 sm:grid-cols-2">
        {personnes.map((p) => (
          <li key={p.id}>
            <Vignette personne={portraitDePersonne(p)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * La rangée du sujet : même vocabulaire visuel que les autres — pastille de
 * côté, nom, années — mais sans lien, avec un cadre accentué qui dit « vous
 * êtes ici ».
 */
function RangeeFocus({ focus }: { focus: PersonneArbre }) {
  const portrait = portraitDePersonne(focus);
  const cote = coteDesBranches(focus.branches);
  const annees = formaterAnneesDeVie(portrait);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-accent">
        Cette fiche
      </span>
      <div
        aria-current="page"
        className="flex items-start gap-3 rounded-[var(--rayon-petit)] border px-3 py-2.5"
        style={{
          borderColor: 'var(--accent)',
          background: 'var(--accent-clair)',
        }}
      >
        <span
          aria-hidden
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: TON_COTE[cote] }}
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-encre">
            {focus.nomComplet}
          </span>
          {focus.surnom && (
            <span className="truncate text-xs italic text-encre-douce">
              « {focus.surnom} »
            </span>
          )}
          {annees && (
            <span className="truncate text-xs text-encre-douce">{annees}</span>
          )}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Petites aides
// ---------------------------------------------------------------------------

function idsVersPersonnes(ids: readonly string[], donnees: DonneesArbre): PersonneArbre[] {
  return ids
    .map((id) => donnees.personnes.get(id))
    .filter((p): p is PersonneArbre => Boolean(p));
}

function dedoublonner(personnes: PersonneArbre[]): PersonneArbre[] {
  const vus = new Set<string>();
  return personnes.filter((p) => (vus.has(p.id) ? false : (vus.add(p.id), true)));
}

/**
 * « Autour d’Anne », « Autour de Léo » — la voyelle initiale décide de
 * l’élision. Sans ça, on affiche une préposition qui grince à la lecture.
 */
function autourDe(personne: PersonneArbre): string {
  const nom = personne.nomComplet;
  const voyelles = 'AEIOUYÀÂÄÉÈÊËÎÏÔÖÙÛÜ';
  if (nom.length > 0 && voyelles.includes(nom.charAt(0))) {
    return `Autour d’${nom}`;
  }
  return `Autour de ${nom}`;
}
