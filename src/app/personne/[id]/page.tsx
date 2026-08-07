import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { chargerFiche, chargerNomPersonne } from '@/components/personne/donnees';
import { EnTetePersonne } from '@/components/personne/en-tete';
import { BandeauVivant } from '@/components/personne/bandeau-vivant';
import { FriseFiche } from '@/components/personne/frise-fiche';
import { OrganisationFiche, type Compteurs } from '@/components/personne/organisation-fiche';
import { ViePersonne } from '@/components/personne/vie';
import { ParentePersonne } from '@/components/personne/parente';
import { NotesPersonne } from '@/components/personne/notes';
import { SourcesPersonne } from '@/components/personne/sources';
import { MediasPersonne } from '@/components/personne/medias';
import { SouvenirsPersonne } from '@/components/personne/souvenirs';
import { RecitsQuiLaMentionnent } from '@/components/personne/recits';
import { FaitsPersonne } from '@/components/personne/faits';
import { CommentairesPersonne } from '@/components/personne/commentaires';
import { BarreDeSaisie } from '@/components/saisie/lien-ajout';
import { lireDroitsSaisie, peutDeposerPhotoAlbum } from '@/components/saisie/donnees';
import { BarreParente } from '@/components/portrait/barre-parente';
import { SectionMiniArbre } from '@/components/portrait/section-mini-arbre';
import { NavigationContextuelle } from '@/components/decouverte/navigation-contextuelle';
import { BarreScroll } from '@/components/interactions/barre-scroll';
import { RaccourciAccueil } from '@/components/interactions/raccourci-accueil';
import { ResumeBrancheFiche } from '@/components/personne/resume-branche';
import { personneEstVivante } from '@/lib/vivant';
import { chargerArbre } from '@/lib/arbre';
import { chargerRecitsPourPersonne } from '@/lib/recits';
import { resumerBranche } from '@/lib/resume-branche';

/**
 * La fiche complète d'une personne.
 *
 * On y vient depuis l'arbre pour tout savoir de quelqu'un : sa vie dans
 * l'ordre, sa parenté, ce qui l'atteste, ce que la famille en raconte. La page
 * s'ouvre sur le contexte immédiat — une barre de parenté et une frise de vie
 * — puis répartit le reste entre onglets pour ne pas noyer le lecteur : cinq
 * matières séparées qu'on ne consulte presque jamais dans la même minute.
 */

// Une correction déposée par un cousin doit se voir au rechargement suivant.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/personne/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const nom = await chargerNomPersonne(id);
  return { title: nom ?? 'Fiche introuvable' };
}

export default async function PagePersonne({ params }: PageProps<'/personne/[id]'>) {
  const { id } = await params;

  // La fiche vient de plusieurs tables ; l'arbre entier sert au contexte
  // (parenté immédiate, tirage d'un membre au hasard). Les deux appels sont
  // indépendants, on les mène en parallèle.
  const [fiche, donneesArbre, recits, droits, peutDeposerPhotos] = await Promise.all([
    chargerFiche(id),
    chargerArbre(),
    chargerRecitsPourPersonne(id),
    lireDroitsSaisie(),
    peutDeposerPhotoAlbum(id),
  ]);

  if (!fiche) notFound();

  const resumeBranche = resumerBranche(donneesArbre, id);

  const compteurs: Compteurs = {
    vue: fiche.evenements.length + fiche.sources.length + fiche.faits.length,
    parente:
      fiche.parents.length +
      fiche.fratrie.length +
      fiche.foyers.reduce((n, f) => n + (f.conjoint ? 1 : 0) + f.enfants.length, 0),
    souvenirs: fiche.souvenirs.length + recits.length,
    photos: fiche.medias.length,
    conversation: compterCommentaires(fiche.commentaires),
  };

  return (
    <>
      <BarreScroll />
      <RaccourciAccueil />
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <p className="mb-4">
          <Link
            href={`/arbre?personne=${encodeURIComponent(id)}`}
            className="lien-discret text-sm"
          >
            ← Revenir à l’arbre
          </Link>
        </p>

        <div className="flex flex-col gap-6">
          {personneEstVivante(fiche.personne.presume_vivant, {
            aEvenementFinDeVie: Boolean(fiche.deces || fiche.inhumation),
          }) && (
            <BandeauVivant />
          )}

          <BarreParente focusId={fiche.personne.id} donnees={donneesArbre} />

          <SectionMiniArbre
            focusId={fiche.personne.id}
            donnees={donneesArbre}
            nomComplet={fiche.nomComplet}
          />

          <EnTetePersonne fiche={fiche} />

          <FriseFiche fiche={fiche} />

          {resumeBranche ? <ResumeBrancheFiche resume={resumeBranche} /> : null}

          <BarreDeSaisie
            personneId={fiche.personne.id}
            nomComplet={fiche.nomComplet}
            sexe={fiche.personne.sexe}
          />

          <OrganisationFiche
            compteurs={compteurs}
            vue={
              <>
                <ViePersonne evenements={fiche.evenements} />
                <SourcesPersonne
                  sources={fiche.sources}
                  personneId={fiche.personne.id}
                  peutVerserActe={droits.peutContribuer}
                />
                <NotesPersonne notes={fiche.personne.notes} />
                <FaitsPersonne faits={fiche.faits} />
              </>
            }
            parente={<ParentePersonne fiche={fiche} />}
            souvenirs={<SouvenirsPersonne souvenirs={fiche.souvenirs} />}
            recits={<RecitsQuiLaMentionnent recits={recits} />}
            photos={
              <MediasPersonne
                medias={fiche.medias}
                evenements={fiche.evenements}
                faits={fiche.faits}
                personneId={fiche.personne.id}
                peutDeposer={peutDeposerPhotos}
                photoCarteId={fiche.personne.photo_id}
              />
            }
            conversation={
              <CommentairesPersonne
                personneId={fiche.personne.id}
                nomPersonne={fiche.nomComplet}
                commentaires={fiche.commentaires}
              />
            }
          />

          <NavigationContextuelle focusId={fiche.personne.id} donnees={donneesArbre} />
        </div>
      </main>
    </>
  );
}

type NoeudCommentaire = { reponses: NoeudCommentaire[] };

function compterCommentaires(commentaires: NoeudCommentaire[]): number {
  return commentaires.reduce(
    (total, c) => total + 1 + compterCommentaires(c.reponses),
    0
  );
}
