import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { Moderation, Rien, Section } from '@/components/personne/blocs';
import { LIBELLE_MEDIA } from '@/components/personne/vocabulaire';
import { FormulaireCommentairePhoto } from '@/components/photos/formulaire-commentaire-photo';
import { BoutonPortraitCarte } from '@/components/photos/bouton-portrait-carte';
import { PhotoDetailPleinEcran } from '@/components/photos/photo-detail-plein-ecran';
import { chargerNavigationPhotoPersonne, chargerPhotoPersonne } from '@/components/photos/donnees';
import { lireDroitsSaisie, peutDeposerPhotoAlbum } from '@/components/saisie/donnees';
import type { CommentaireFiche } from '@/components/personne/donnees';

export const dynamic = 'force-dynamic';

type ParamsPhoto = {
  params: Promise<{ id: string; mediaId: string }>;
  searchParams: Promise<{ contexte?: string; annee?: string }>;
};

export async function generateMetadata({ params }: ParamsPhoto): Promise<Metadata> {
  const { id, mediaId } = await params;
  const photo = await chargerPhotoPersonne(id, mediaId);
  return {
    title: photo
      ? photo.media.titre ?? `Photo de ${photo.nomPersonne}`
      : 'Photo introuvable',
  };
}

export default async function PagePhoto({ params, searchParams }: ParamsPhoto) {
  const { id, mediaId } = await params;
  const parametres = await searchParams;
  const anneeContexte = lireAnneeContexte(parametres);
  const garderContexteAlbum = parametres.contexte === 'periode' && anneeContexte !== undefined;
  const [photo, droits, peutDeposer, navigation] = await Promise.all([
    chargerPhotoPersonne(id, mediaId),
    lireDroitsSaisie(),
    peutDeposerPhotoAlbum(id),
    garderContexteAlbum
      ? chargerNavigationPhotoPersonne(id, mediaId, anneeContexte)
      : Promise.resolve(null),
  ]);
  if (!photo) notFound();

  const {
    media,
    nomPersonne,
    personnesLiees,
    lieu: lieuPhoto,
    estPortraitCarte,
    demandePortrait,
    commentaires,
  } = photo;
  const titre = media.titre ?? `${LIBELLE_MEDIA[media.type]} sans titre`;
  const legende = [media.date, media.lieu, media.role].filter(Boolean).join(' · ');

  return (
    <>
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link href={`/personne/${id}#photos`} className="lien-discret text-sm">
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

        {navigation && navigation.total > 1 && (
          <nav
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux/60 p-3"
            aria-label="Photos de la même période"
          >
            {navigation.precedente ? (
              <Link
                href={urlPhotoContexte(id, navigation.precedente.id, parametres.annee!)}
                className="lien-discret text-sm"
              >
                ← Photo précédente
              </Link>
            ) : (
              <span className="text-sm text-encre-tres-douce">Début de la période</span>
            )}
            <span className="text-xs text-encre-tres-douce">
              {navigation.total} photo{navigation.total > 1 ? 's' : ''} {libellePeriode(anneeContexte)}
            </span>
            {navigation.suivante ? (
              <Link
                href={urlPhotoContexte(id, navigation.suivante.id, parametres.annee!)}
                className="lien-discret text-sm"
              >
                Photo suivante →
              </Link>
            ) : (
              <span className="text-sm text-encre-tres-douce">Fin de la période</span>
            )}
          </nav>
        )}

        {media.description && (
          <p className="mt-4 text-sm leading-relaxed text-encre-douce">{media.description}</p>
        )}

        {(personnesLiees.length > 1 || lieuPhoto) && (
          <aside className="mt-5 rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux/60 p-4">
            <h2 className="text-sm font-medium text-encre">Repères de cette photo</h2>
            {personnesLiees.length > 1 && (
              <p className="mt-2 text-sm text-encre-douce">
                <span className="font-medium text-encre">Personnes liées : </span>
                {personnesLiees.map((personne, index) => (
                  <span key={personne.id}>
                    {index > 0 && ' · '}
                    <Link href={`/personne/${personne.id}`} className="lien-discret">
                      {personne.nom}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            {lieuPhoto && (
              <p className="mt-2 text-sm text-encre-douce">
                <span className="font-medium text-encre">Lieu : </span>
                {lieuPhoto.estSitue ? (
                  <Link href={`/carte?lieu=${encodeURIComponent(lieuPhoto.id)}`} className="lien-discret">
                    {lieuPhoto.libelle}
                  </Link>
                ) : (
                  lieuPhoto.libelle
                )}
              </p>
            )}
          </aside>
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

function lireAnneeContexte(parametres: { contexte?: string; annee?: string }): number | null | undefined {
  if (parametres.contexte !== 'periode') return undefined;
  if (parametres.annee === 'sans-date') return null;
  return parametres.annee && /^\d{4}$/.test(parametres.annee) ? Number(parametres.annee) : undefined;
}

function urlPhotoContexte(personneId: string, mediaId: string, annee: string): string {
  return `/personne/${personneId}/photo/${mediaId}?contexte=periode&annee=${annee}`;
}

function libellePeriode(annee: number | null | undefined): string {
  return annee === null ? 'sans date' : `de ${annee}`;
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
