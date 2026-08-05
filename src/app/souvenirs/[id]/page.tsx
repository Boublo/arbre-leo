import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { GalerieSouvenir } from '@/components/souvenirs/galerie-souvenir';
import { FormulaireCommentaire } from '@/components/souvenirs/formulaire-commentaire';
import { EditionSouvenir } from '@/components/souvenirs/edition-souvenir';
import type { ValeursSouvenir } from '@/components/souvenirs/formulaire-souvenir';
import { epinglerSouvenir, supprimerCommentaire, supprimerSouvenir } from '@/app/actions/souvenirs';
import {
  chargerLieux,
  chargerPersonnesMentionnables,
  chargerSouvenir,
  formaterHorodatage,
  lireDroits,
  type SouvenirDetail,
} from '@/lib/souvenirs';
import { creerClientServeur } from '@/lib/supabase/server';
import type { PrecisionSaisie } from '@/lib/souvenirs-partage';
import type { PrecisionDate } from '@/lib/types-base';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/souvenirs/[id]'>) {
  const { id } = await params;
  const supabase = await creerClientServeur();
  const { data } = await supabase.from('souvenirs').select('titre').eq('id', id).maybeSingle();
  return { title: data?.titre ?? 'Souvenir' };
}

/** Le formulaire ne connaît pas « siècle » : on retombe alors sur l’inconnu. */
function precisionSaisie(precision: PrecisionDate): PrecisionSaisie {
  if (precision === 'jour' || precision === 'mois' || precision === 'annee' || precision === 'decennie') {
    return precision;
  }
  return 'inconnue';
}

export default async function PageSouvenir({ params }: PageProps<'/souvenirs/[id]'>) {
  const { id } = await params;

  const [souvenir, droits] = await Promise.all([chargerSouvenir(id), lireDroits()]);
  if (!souvenir) notFound();

  const peutReprendre =
    droits.estAdmin || (droits.utilisateurId !== null && droits.utilisateurId === souvenir.auteurId);

  // Les listes de reprise ne sont chargées que pour qui peut effectivement reprendre.
  const [lieux, personnes] = peutReprendre
    ? await Promise.all([chargerLieux(), chargerPersonnesMentionnables()])
    : [[], []];

  const valeurs: ValeursSouvenir = {
    id: souvenir.id,
    titre: souvenir.titre,
    recit: souvenir.recit,
    precision: precisionSaisie(souvenir.precisionDate),
    annee: souvenir.annee,
    mois: souvenir.mois,
    jour: souvenir.jour,
    dateTexte: souvenir.dateTexte,
    lieuId: souvenir.lieuId,
    lieuLibre: souvenir.lieuLibre,
    personnes: souvenir.personnes.map((p) => p.id),
    photos: souvenir.photos.map((photo) => ({
      cle: photo.id,
      mediaId: photo.id,
      chemin: photo.chemin,
      nom: photo.titre ?? 'photo',
      mime: '',
      taille: 0,
      largeur: photo.largeur,
      hauteur: photo.hauteur,
      apercu: photo.url,
    })),
  };

  const lecture = <Lecture souvenir={souvenir} />;

  return (
    <>
      <Navigation />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/souvenirs" className="lien-discret text-sm">
          ← Revenir au mur
        </Link>

        <div className="mt-6 flex flex-col gap-8">
          {peutReprendre && droits.utilisateurId ? (
            <EditionSouvenir
              valeurs={valeurs}
              lieux={lieux}
              personnes={personnes}
              utilisateurId={droits.utilisateurId}
              peutDeposerPhotos={droits.peutContribuer}
            >
              {lecture}
            </EditionSouvenir>
          ) : (
            lecture
          )}

          {(peutReprendre || droits.estAdmin) && (
            <Outils souvenir={souvenir} estAdmin={droits.estAdmin} peutSupprimer={peutReprendre} />
          )}

          <Commentaires souvenir={souvenir} droits={droits} />
        </div>
      </main>
    </>
  );
}

function Lecture({ souvenir }: { souvenir: SouvenirDetail }) {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {souvenir.epingle && (
            <span className="rounded-full border border-or/50 bg-or/10 px-2.5 py-0.5 text-xs font-medium text-or">
              Épinglé
            </span>
          )}
          {souvenir.statut !== 'publie' && (
            <span className="rounded-full border border-alerte/50 bg-alerte/10 px-2.5 py-0.5 text-xs font-medium text-alerte">
              {souvenir.statut === 'en_relecture' ? 'En relecture' : 'Masqué'}
            </span>
          )}
        </div>

        <h1 className="text-3xl leading-tight">{souvenir.titre}</h1>

        <p className="text-encre-douce">
          {souvenir.date || 'Date inconnue'}
          {souvenir.lieu && <> · {souvenir.lieu}</>}
        </p>

        {souvenir.dateTexte && (
          <p className="text-sm italic text-encre-tres-douce">« {souvenir.dateTexte} »</p>
        )}
      </header>

      {souvenir.personnes.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            Qui y était
          </h2>
          <ul className="flex flex-wrap gap-2">
            {souvenir.personnes.map((personne) => (
              <li key={personne.id}>
                <Link
                  href={`/personne/${personne.id}`}
                  className="rounded-full border border-bordure bg-fond-doux px-3 py-1 text-sm text-encre-douce transition hover:border-accent hover:text-encre"
                >
                  {personne.nomComplet}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="whitespace-pre-line text-lg leading-relaxed text-encre">
        {souvenir.recit}
      </div>

      <GalerieSouvenir photos={souvenir.photos} titre={souvenir.titre} />

      <p className="border-t border-bordure pt-4 text-sm text-encre-tres-douce">
        Déposé par {souvenir.auteur}, le {formaterHorodatage(souvenir.creeLe)}.
      </p>
    </article>
  );
}

/** Épingler relève de la modération ; supprimer, de la propriété. */
function Outils({
  souvenir,
  estAdmin,
  peutSupprimer,
}: {
  souvenir: SouvenirDetail;
  estAdmin: boolean;
  peutSupprimer: boolean;
}) {
  return (
    <section className="carte flex flex-wrap items-center gap-4 p-4">
      {estAdmin && (
        <form action={epinglerSouvenir}>
          <input type="hidden" name="id" value={souvenir.id} />
          <input type="hidden" name="epingle" value={souvenir.epingle ? '0' : '1'} />
          <button
            type="submit"
            className="rounded-[var(--rayon-petit)] border border-bordure px-3 py-1.5 text-sm text-encre-douce transition hover:bg-fond-doux hover:text-encre"
          >
            {souvenir.epingle ? 'Retirer de la une' : 'Épingler en tête du mur'}
          </button>
        </form>
      )}

      {peutSupprimer && (
        <details className="ml-auto">
          <summary className="cursor-pointer text-sm text-encre-douce transition hover:text-erreur">
            Supprimer ce souvenir
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-encre-douce">
              Le récit, ses photos et ses commentaires seront effacés. C’est sans retour.
            </p>
            <form action={supprimerSouvenir}>
              <input type="hidden" name="id" value={souvenir.id} />
              <button
                type="submit"
                className="rounded-[var(--rayon-petit)] border border-erreur/50 bg-erreur/10 px-3 py-1.5 text-sm font-medium text-erreur transition hover:bg-erreur/20"
              >
                Oui, supprimer
              </button>
            </form>
          </div>
        </details>
      )}
    </section>
  );
}

function Commentaires({
  souvenir,
  droits,
}: {
  souvenir: SouvenirDetail;
  droits: { utilisateurId: string | null; estAdmin: boolean };
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-bordure pt-6">
      <h2 className="text-lg">
        {souvenir.commentaires.length === 0
          ? 'Personne n’a encore réagi'
          : `${souvenir.commentaires.length} réaction${souvenir.commentaires.length > 1 ? 's' : ''}`}
      </h2>

      {souvenir.commentaires.length > 0 && (
        <ul className="flex flex-col gap-3">
          {souvenir.commentaires.map((commentaire) => (
            <li key={commentaire.id} className="carte flex flex-col gap-2 p-4">
              <p className="text-xs text-encre-tres-douce">
                {commentaire.auteur} · {formaterHorodatage(commentaire.creeLe)}
              </p>
              <p className="whitespace-pre-line text-encre">{commentaire.texte}</p>

              {(droits.estAdmin || droits.utilisateurId === commentaire.auteurId) && (
                <form action={supprimerCommentaire}>
                  <input type="hidden" name="id" value={commentaire.id} />
                  <input type="hidden" name="souvenirId" value={souvenir.id} />
                  <button
                    type="submit"
                    className="text-xs text-encre-tres-douce underline underline-offset-2 transition hover:text-erreur"
                  >
                    Retirer ce mot
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {droits.utilisateurId && <FormulaireCommentaire souvenirId={souvenir.id} />}
    </section>
  );
}
