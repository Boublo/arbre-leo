import Link from 'next/link';
import { lireDroitsSaisie } from '@/components/saisie/donnees';
import type { Sexe } from '@/lib/types-base';

/**
 * L’entrée de la saisie, posée là où l’on est quand l’envie vient.
 *
 * On ne se dit jamais « je vais aller ajouter quelqu’un » : on lit la fiche
 * d’un grand-père, on constate qu’il manque un de ses fils, et c’est à cet
 * instant qu’il faut pouvoir l’écrire. Le lien vit donc sur la fiche, pas dans
 * un menu.
 *
 * Il n’ouvre aucun droit : la barre ne s’affiche qu’à ceux que la base
 * autorise déjà à contribuer, et la Server Action revérifie tout.
 */
export async function BarreDeSaisie({
  personneId,
  nomComplet,
  sexe,
}: {
  personneId: string;
  nomComplet: string;
  sexe: Sexe;
}) {
  const droits = await lireDroitsSaisie();
  if (!droits.peutContribuer) return null;

  // Le rôle de parent dépend du sexe connu : sans lui, on n’a rien à préremplir
  // et l’on s’en tient au lien nu.
  const cote = sexe === 'M' ? 'pere' : sexe === 'F' ? 'mere' : null;

  return (
    <section className="carte flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
      <Link
        href="/personne/nouvelle"
        className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste transition hover:brightness-110"
      >
        Ajouter quelqu’un
      </Link>

      <p className="text-sm text-encre-douce">
        Un enfant, un conjoint, un aïeul qui manque encore à l’arbre.
      </p>

      <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {cote && (
          <Link href={`/personne/nouvelle?${cote}=${personneId}`} className="lien-discret">
            Ajouter un enfant de {nomComplet}
          </Link>
        )}
        <Link href={`/personne/${personneId}/modifier`} className="lien-discret">
          Corriger cette fiche
        </Link>
        <Link href={`/personne/${personneId}/acte/nouveau`} className="lien-discret">
          Verser un acte
        </Link>
      </span>
    </section>
  );
}
