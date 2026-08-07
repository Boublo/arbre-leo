import Link from 'next/link';
import { chargerParentsPourNouvelEnfant, lireDroitsSaisie } from '@/components/saisie/donnees';
import { construireUrlNouvelEnfant } from '@/lib/url-nouvel-enfant';
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
  parents = [],
}: {
  personneId: string;
  nomComplet: string;
  sexe: Sexe;
  parents?: { id: string; nomComplet: string; sexe: Sexe }[];
}) {
  const droits = await lireDroitsSaisie();
  if (!droits.peutContribuer) return null;

  const { pereId, mereId } = await chargerParentsPourNouvelEnfant(personneId, sexe);
  const urlNouvelEnfant = construireUrlNouvelEnfant(pereId, mereId);
  const parentsFratrie = parentsPourFratrie(parents);
  const urlNouvelleFratrie = construireUrlNouvelEnfant(parentsFratrie.pereId, parentsFratrie.mereId);
  const urlNouveauConjoint = `/personne/nouvelle?conjoint=${encodeURIComponent(personneId)}`;
  const aucunParent = parents.length === 0;
  const urlNouveauPere = `/personne/nouvelle?enfant=${encodeURIComponent(personneId)}&sexe=M`;
  const urlNouvelleMere = `/personne/nouvelle?enfant=${encodeURIComponent(personneId)}&sexe=F`;

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
        <Link href={urlNouvelEnfant} className="lien-discret">
          Ajouter un enfant de {nomComplet}
        </Link>
        <Link href={urlNouveauConjoint} className="lien-discret">
          Ajouter son conjoint ou sa conjointe
        </Link>
        {aucunParent && (
          <>
            <Link href={urlNouveauPere} className="lien-discret">
              Ajouter son père
            </Link>
            <Link href={urlNouvelleMere} className="lien-discret">
              Ajouter sa mère
            </Link>
          </>
        )}
        {parentsFratrie.libelles.length > 0 && (
          <Link href={urlNouvelleFratrie} className="lien-discret">
            Ajouter un frère ou une sœur
            <span className="sr-only"> avec {parentsFratrie.libelles.join(' et ')} prérempli{parentsFratrie.libelles.length > 1 ? 's' : ''}</span>
          </Link>
        )}
        <Link href={`/personne/${personneId}/modifier#enfants`} className="lien-discret">
          Rattacher un enfant déjà dans l’arbre
        </Link>
        <Link href={`/personne/${personneId}/modifier`} className="lien-discret">
          Corriger cette fiche
        </Link>
        <Link href={`/personne/${personneId}/acte/nouveau`} className="lien-discret">
          Verser un acte
        </Link>
        <Link href={`/personne/${personneId}/photo/nouveau`} className="lien-discret">
          Déposer une photo
        </Link>
      </span>
    </section>
  );
}

/** Préremplit uniquement les parents dont le rôle est connu ; aucun lien n'est inventé. */
function parentsPourFratrie(parents: { id: string; nomComplet: string; sexe: Sexe }[]) {
  const pere = parents.find((parent) => parent.sexe === 'M') ?? null;
  const mere = parents.find((parent) => parent.sexe === 'F') ?? null;
  return {
    pereId: pere?.id ?? '',
    mereId: mere?.id ?? '',
    libelles: [pere?.nomComplet, mere?.nomComplet].filter((nom): nom is string => Boolean(nom)),
  };
}
