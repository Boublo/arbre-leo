import Link from 'next/link';
import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';

/**
 * Ce que la fiche invite à faire après lecture.
 *
 * Posée en pied, cette bande relance le mouvement plutôt que de laisser
 * l’utilisateur seul devant la fin d’un texte. Trois portes s’ouvrent, toujours
 * dans le même ordre, pour que la main s’y habitue :
 *   — Fratrie complète, si l’onglet « Parenté » n’a pas déjà été ouvert.
 *   — Chronologie de la lignée, pour prendre du recul le long de la branche.
 *   — Une autre personne au hasard, pour arpenter la famille sans plan.
 *
 * Le tirage au sort se fait au serveur, à partir de ce que la base a bien
 * voulu renvoyer — RLS oblige, on ne proposera jamais quelqu’un dont on
 * n’aurait de toute façon pas la fiche.
 */
export function NavigationContextuelle({
  focusId,
  donnees,
}: {
  focusId: string;
  donnees: DonneesArbre;
}) {
  const suivant = tirerAuHasard(focusId, donnees);

  return (
    <nav
      aria-label="Continuer l’exploration"
      className="carte flex flex-col gap-3 p-4 sm:p-5"
    >
      <p className="text-xs uppercase tracking-wider text-encre-tres-douce">
        Aller plus loin
      </p>

      <ul className="grid gap-3 sm:grid-cols-3">
        <li>
          {/* L’onglet « Parenté » de la fiche courante : une ancre plutôt qu’un
              lien externe, pour ne pas quitter la personne qu’on est en train
              de lire. Le composant d’onglets s’occupe de faire défiler. */}
          <Bouton
            href={`/personne/${focusId}#parente`}
            titre="Voir la fratrie complète"
            aide="Parents, frères et sœurs, enfants — tout ce qui l’entoure."
          />
        </li>
        <li>
          <Bouton
            href={`/chronologie?personne=${encodeURIComponent(focusId)}&portee=lignee`}
            titre="Chronologie de sa lignée"
            aide="Ce que sa branche a vécu, en regard des grands événements."
          />
        </li>
        <li>
          {suivant ? (
            <Bouton
              href={`/personne/${suivant.id}`}
              titre="Un membre au hasard"
              aide={soustitreHasard(suivant)}
            />
          ) : (
            <BoutonMuet
              titre="Un membre au hasard"
              aide="Un seul cousin est encore chargé — pas de quoi tirer."
            />
          )}
        </li>
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Rendus élémentaires
// ---------------------------------------------------------------------------

function Bouton({
  href,
  titre,
  aide,
}: {
  href: string;
  titre: string;
  aide: string;
}) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col gap-1 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-3 py-3 transition hover:border-bordure-forte hover:bg-accent-clair focus-visible:outline-none focus-visible:border-bordure-forte focus-visible:bg-accent-clair focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="text-sm font-medium text-encre">{titre}</span>
      <span className="text-xs leading-relaxed text-encre-douce">{aide}</span>
    </Link>
  );
}

function BoutonMuet({ titre, aide }: { titre: string; aide: string }) {
  return (
    <div
      aria-disabled
      className="flex h-full flex-col gap-1 rounded-[var(--rayon-petit)] border border-dashed border-bordure px-3 py-3"
    >
      <span className="text-sm font-medium text-encre-tres-douce">{titre}</span>
      <span className="text-xs leading-relaxed text-encre-tres-douce">{aide}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tirage
// ---------------------------------------------------------------------------

/**
 * Pioche quelqu’un d’autre que la personne courante. Sans hasard : le tirage
 * est déterministe par un décalage stable dérivé de l'identifiant de la
 * personne focus. À chaque affichage, la même fiche renvoie donc au même
 * cousin ; la redécouverte se fait en passant d'une fiche à l'autre, non en
 * rechargeant la page — la stabilité du rendu est ainsi tenue.
 */
function tirerAuHasard(
  eviter: string,
  donnees: DonneesArbre
): PersonneArbre | null {
  const candidats = [...donnees.personnes.values()].filter(
    (p) => p.id !== eviter
  );
  if (candidats.length === 0) return null;

  // Somme des points de code de l'identifiant : déterministe, indépendant de
  // la plateforme, sans besoin d'un hachage.
  let empreinte = 0;
  for (let i = 0; i < eviter.length; i += 1) {
    empreinte = (empreinte + eviter.charCodeAt(i)) | 0;
  }
  const index = Math.abs(empreinte) % candidats.length;
  return candidats[index] ?? null;
}

function soustitreHasard(personne: PersonneArbre): string {
  const annees = anneesDeVie(personne);
  return annees
    ? `${personne.nomComplet} · ${annees}`
    : `Sauter jusqu’à ${personne.nomComplet}.`;
}

function anneesDeVie(personne: PersonneArbre): string | null {
  const n = personne.naissance?.annee;
  const d = personne.deces?.annee;
  if (n && d) return `${n} – ${d}`;
  if (n) return personne.sexe === 'F' ? `née en ${n}` : `né en ${n}`;
  if (d) return personne.sexe === 'F' ? `morte en ${d}` : `mort en ${d}`;
  return null;
}
