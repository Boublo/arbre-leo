import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Alerte } from '@/components/ui/champs';
import { FormulairePersonne } from '@/components/saisie/formulaire-personne';
import { SuppressionPersonne } from '@/components/saisie/suppression-personne';
import {
  chargerLiensExistants,
  chargerLibellesLieux,
  chargerPersonnesChoisissables,
  chargerUnions,
  chargerValeursPersonne,
  compterLiensRompus,
  lireDroitsSaisie,
} from '@/components/saisie/donnees';

/**
 * Corriger une fiche.
 *
 * Une généalogie se trompe : un prénom mal lu, une année reprise d’un cousin,
 * un père qui se révèle être un oncle. Tout ce qui est déjà écrit revient donc
 * en valeur initiale — on modifie ce qu’on veut, on laisse le reste.
 *
 * Les liens déjà en place sont montrés plutôt que redemandés : le bloc de
 * rattachement sert à en ajouter, et à changer les parents si l’on s’est
 * trompé de couple.
 */

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/personne/[id]/modifier'>): Promise<Metadata> {
  const { id } = await params;
  const valeurs = await chargerValeursPersonne(id);
  const nom = valeurs ? nomComplet(valeurs.prenoms, valeurs.nom) : null;
  return { title: nom ? `Corriger la fiche de ${nom}` : 'Fiche introuvable' };
}

function nomComplet(prenoms: string, nom: string): string {
  return [prenoms, nom].filter(Boolean).join(' ') || 'cette personne';
}

export default async function PageModifierPersonne({ params }: PageProps<'/personne/[id]/modifier'>) {
  const { id } = await params;
  const droits = await lireDroitsSaisie();

  if (!droits.utilisateurId) redirect(`/connexion?suite=/personne/${id}/modifier`);

  const valeurs = await chargerValeursPersonne(id);
  if (!valeurs) notFound();

  const personnes = await chargerPersonnesChoisissables();
  const [unions, lieux, liens, rompus] = await Promise.all([
    chargerUnions(personnes),
    chargerLibellesLieux(),
    chargerLiensExistants(id, personnes),
    droits.estAdmin ? compterLiensRompus(id) : Promise.resolve(null),
  ]);

  const nom = nomComplet(valeurs.prenoms, valeurs.nom);

  return (
    <>
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href={`/personne/${id}`} className="lien-discret text-sm">
          ← Revenir à sa fiche
        </Link>

        <h1 className="mt-4 text-3xl">Corriger la fiche de {nom}</h1>
        <p className="mt-2 text-encre-douce">
          Ce qui est déjà écrit est repris tel quel. Corrigez ce qui doit l’être et laissez le
          reste : rien n’est effacé de ce que vous ne touchez pas.
        </p>

        <div className="mt-8 flex flex-col gap-8">
          {droits.peutContribuer ? (
            <FormulairePersonne
              mode="modification"
              valeurs={valeurs}
              personnes={personnes}
              unions={unions}
              lieux={lieux}
              liens={liens}
            />
          ) : (
            <Alerte ton="info">
              Votre compte peut lire l’arbre mais pas encore l’écrire. Demandez à un administrateur
              de la famille de vous passer contributeur : la base refuserait la modification.
            </Alerte>
          )}

          {droits.estAdmin && rompus && (
            <SuppressionPersonne personneId={id} nomComplet={nom} liens={rompus} />
          )}
        </div>
      </main>
    </>
  );
}
