import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Moderation, Rien, Section } from '@/components/personne/blocs';
import { LIBELLE_MEDIA } from '@/components/personne/vocabulaire';
import { FormulaireCommentairePhoto } from '@/components/photos/formulaire-commentaire-photo';
import { BoutonPortraitCarte } from '@/components/photos/bouton-portrait-carte';
import { PhotoDetailPleinEcran } from '@/components/photos/photo-detail-plein-ecran';
import { chargerPhotoPersonne } from '@/components/photos/donnees';
import { lireDroitsSaisie, peutDeposerPhotoAlbum } from '@/components/saisie/donnees';
import type { CommentaireFiche } from '@/components/personne/donnees';

export const dynamic = 'force-dynamic';

type ParamsPhoto = { params: Promise<{ id: string; mediaId: string }> };

export async function generateMetadata({ params }: ParamsPhoto): Promise<Metadata> {
  const { id, mediaId } = await params;
  const photo = await chargerPhotoPersonne(id, mediaId);
  return {
    title: photo
      ? photo.media.titre ?? `Photo de ${photo.nomPersonne}`
      : 'Photo introuvable',
  };
}

export default async function PagePhoto({ params }: ParamsPhoto) {
  const { id, mediaId } = await params;
  const [photo, droits, peutDeposer] = await Promise.all([
    chargerPhotoPersonne(id, mediaId),
    lireDroitsSaisie(),
    peutDeposerPhotoAlbum(id),
  ]);
  if (!photo) notFound();

  const { media, nomPersonne, estPortraitCarte, demandePortrait, commentaires } = photo;
  const titre = media.titre ?? `${LIBELLE_MEDIA[media.type]} sans titre`;
  const legende = [media.date, media.lieu, media.role].filter(Boolean).join(' · ');

  return (
    <>
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link href={`/personne/${id}`} className="lien-discret text-sm">
          ← Album de {nomPersonne}
        </Link>

        <header className="mt-4 flex flex-col gap-2">
          <h1 className="text-3xl">{titre}</h1>
          {legende && <p className="text-sm text-encre-tres-douce">{legende}</p>}
          <Moderation statut={media.statut} />
        </header>

        <figure className="mt-6 overflow-hidden rounded-[var(--rayon)] border border-bordure bg-fond-doux">
          {media.estImage && media.url ? (
            <PhotoDetailPleinEcran
              src={media.url}
              alt={titre}
              largeur={media.largeur ?? undefined}
              hauteur={media.hauteur ?? undefined}
            />
          ) : media.type === 'audio' && media.url ? (
            <audio controls className="w-full p-6" src={media.url}>
              Votre navigateur ne lit pas l’audio.
            </audio>
          ) : media.type === 'video' && media.url ? (
            <video controls className="mx-auto max-h-[min(75vh,720px)] w-full" src={media.url}>
              Votre navigateur ne lit pas la vidéo.
            </video>
          ) : media.url ? (
            <p className="p-8 text-center text-sm">
              <a href={media.url} target="_blank" rel="noopener noreferrer" className="lien-discret">
                Ouvrir le fichier
              </a>
            </p>
          ) : (
            <p className="p-8 text-center text-sm text-encre-tres-douce">
              Fichier momentanément indisponible
            </p>
          )}
        </figure>

        {media.description && (
          <p className="mt-4 text-sm leading-relaxed text-encre-douce">{media.description}</p>
        )}

        {peutDeposer && media.estImage && (
          <div className="mt-6">
            <BoutonPortraitCarte
              personneId={id}
              mediaId={mediaId}
              dejaPortrait={estPortraitCarte}
              demandePortrait={demandePortrait}
              estAdmin={droits.estAdmin}
            />
          </div>
        )}

        <div className="mt-10">
          <Section titre="Souvenirs sur cette photo" compte={compter(commentaires)}>
            {commentaires.length === 0 ? (
              <Rien>
                Personne n’a encore laissé de souvenir ici. Qui est sur le cliché ? Où a-t-il été
                pris ?
              </Rien>
            ) : (
              <ul className="mb-6 flex flex-col gap-5">
                {commentaires.map((c) => (
                  <li key={c.id}>
                    <Message commentaire={c} />
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-bordure pt-5">
              <FormulaireCommentairePhoto mediaId={mediaId} titrePhoto={titre} />
            </div>
          </Section>
        </div>
      </main>
    </>
  );
}

function Message({ commentaire: c }: { commentaire: CommentaireFiche }) {
  return (
    <article>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-sm font-medium text-encre">{c.auteur}</span>
        <span className="text-xs text-encre-tres-douce">{c.date}</span>
        <Moderation statut={c.statut} />
      </div>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-encre-douce">{c.texte}</p>
      {c.reponses.length > 0 && (
        <ul className="mt-4 flex flex-col gap-4 border-l border-bordure pl-4">
          {c.reponses.map((reponse) => (
            <li key={reponse.id}>
              <Message commentaire={reponse} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function compter(commentaires: CommentaireFiche[]): number {
  return commentaires.reduce((total, c) => total + 1 + compter(c.reponses), 0);
}
