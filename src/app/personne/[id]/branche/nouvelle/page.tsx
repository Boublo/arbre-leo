import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Navigation } from '@/components/navigation';
import { Alerte } from '@/components/ui/champs';
import { chargerNomPersonne } from '@/components/personne/donnees';
import { chargerFoyersPourNouvelEnfant, lireDroitsSaisie } from '@/components/saisie/donnees';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/personne/[id]/branche/nouvelle'>): Promise<Metadata> {
  const { id } = await params;
  const nom = await chargerNomPersonne(id);
  return { title: nom ? `Préparer une branche de ${nom}` : 'Fiche introuvable' };
}

/**
 * Prépare les gestes existants sans écrire de relation toute seule.
 * Chaque lien conduit vers le formulaire qui affiche encore ses contrôles
 * et exige une validation humaine avant l'enregistrement.
 */
export default async function PageNouvelleBranche({
  params,
}: PageProps<'/personne/[id]/branche/nouvelle'>) {
  const { id } = await params;
  const droits = await lireDroitsSaisie();

  if (!droits.utilisateurId) redirect(`/connexion?suite=/personne/${id}/branche/nouvelle`);

  const [nom, foyers] = await Promise.all([chargerNomPersonne(id), chargerFoyersPourNouvelEnfant(id)]);
  if (!nom) notFound();

  return (
    <>
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href={`/personne/${id}`} className="lien-discret text-sm">
          ← Revenir à la fiche de {nom}
        </Link>

        <h1 className="mt-4 text-3xl">Préparer une petite branche</h1>
        <p className="mt-2 text-encre-douce">
          Partez de {nom}, puis assemblez le foyer et les enfants pas à pas. Aucun lien n&apos;est
          créé sur cette page : chaque étape reste modifiable et demande votre validation.
        </p>

        <div className="mt-6">
          <Alerte ton="info">
            Brouillon de parcours uniquement : les informations inconnues restent vides et une
            hypothèse doit être signalée dans le formulaire avant l&apos;enregistrement.
          </Alerte>
        </div>

        {droits.peutContribuer ? (
          <ol className="mt-8 flex flex-col gap-4">
            <Etape numero="1" titre="Constituer ou compléter le foyer">
              <p>Ajoutez un conjoint ou une conjointe seulement si cette relation est connue.</p>
              <Link href={`/personne/nouvelle?conjoint=${encodeURIComponent(id)}`} className="mt-3 inline-flex lien-discret">
                Ajouter un conjoint ou une conjointe
              </Link>
            </Etape>

            <Etape numero="2" titre="Ajouter ou rattacher les enfants">
              {foyers.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {foyers.map((foyer) => (
                    <li key={foyer.id}>
                      <Link
                        href={`/personne/nouvelle?union=${encodeURIComponent(foyer.id)}`}
                        className="lien-discret"
                      >
                        Ajouter un enfant {foyer.conjointNomComplet ? `avec ${foyer.conjointNomComplet}` : 'dans ce foyer'}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  Aucun foyer n&apos;est encore enregistré. Commencez par l&apos;étape 1, ou ajoutez une
                  personne sans rattachement si l&apos;autre parent est inconnu.
                </p>
              )}
              <Link href={`/personne/${id}/modifier#enfants`} className="mt-3 inline-flex lien-discret">
                Rattacher un enfant déjà présent dans l&apos;arbre
              </Link>
            </Etape>

            <Etape numero="3" titre="Relire avant chaque enregistrement">
              <p>
                Vérifiez les homonymes, les années et le foyer choisi. Le formulaire explique les
                incohérences certaines et laisse les informations incertaines à confirmer par un acte.
              </p>
            </Etape>
          </ol>
        ) : (
          <div className="mt-8">
            <Alerte ton="info">
              Votre compte peut préparer le parcours, mais seul un contributeur peut enregistrer les
              fiches et les liens familiaux.
            </Alerte>
          </div>
        )}
      </main>
    </>
  );
}

function Etape({ numero, titre, children }: { numero: string; titre: string; children: ReactNode }) {
  return (
    <li className="carte p-5">
      <p className="text-sm font-medium text-accent">Étape {numero}</p>
      <h2 className="mt-1 text-xl">{titre}</h2>
      <div className="mt-2 text-sm leading-6 text-encre-douce">{children}</div>
    </li>
  );
}
