import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navigation } from '@/components/navigation';
import { BarreScroll } from '@/components/interactions/barre-scroll';
import { RaccourciAccueil } from '@/components/interactions/raccourci-accueil';
import { Vignette } from '@/components/portrait/vignette';
import { RenduMarkdown } from '@/components/recits/rendu-markdown';
import { epinglerRecit, supprimerRecit } from '@/app/actions/recits';
import {
  chargerRecit,
  chargerVoisins,
  formaterHorodatage,
  lireDroits,
  type RecitDetail,
  type RecitResume,
} from '@/lib/recits';
import { creerClientServeur } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/recits/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const supabase = await creerClientServeur();
  const { data } = await supabase.from('recits').select('titre').eq('id', id).maybeSingle();
  return { title: data?.titre ?? 'Récit' };
}

export default async function PageRecit({ params }: PageProps<'/recits/[id]'>) {
  const { id } = await params;

  const [recit, droits] = await Promise.all([chargerRecit(id), lireDroits()]);
  if (!recit) notFound();

  const voisins = await chargerVoisins(recit.id, recit.patronyme);
  const peutReprendre =
    droits.estAdmin ||
    (droits.utilisateurId !== null && droits.utilisateurId === recit.auteurId);

  const famille = recit.patronyme ?? recit.theme;

  return (
    <>
      <BarreScroll />
      <RaccourciAccueil />
      <Navigation />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <p className="mb-4">
          <Link
            href={
              recit.patronyme
                ? `/recits?famille=${encodeURIComponent(recit.patronyme)}`
                : '/recits'
            }
            className="lien-discret text-sm"
          >
            ← Revenir aux récits
          </Link>
        </p>

        <article className="flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {recit.epingle && (
                <span className="rounded-full border border-or/50 bg-or/10 px-2.5 py-0.5 text-xs font-medium text-or">
                  Épinglé
                </span>
              )}
              {recit.statut !== 'publie' && (
                <span className="rounded-full border border-alerte/50 bg-alerte/10 px-2.5 py-0.5 text-xs font-medium text-alerte">
                  {recit.statut === 'en_relecture' ? 'En relecture' : 'Masqué'}
                </span>
              )}
            </div>

            <h1 className="text-4xl leading-tight">{recit.titre}</h1>

            {recit.chapeau && (
              <p className="text-xl italic leading-relaxed text-encre-douce">
                {recit.chapeau}
              </p>
            )}

            {(famille || recit.periode) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-b border-bordure py-3 text-sm text-encre-douce">
                {famille && (
                  <span>
                    <span className="text-xs uppercase tracking-wider text-encre-tres-douce">
                      Famille ·{' '}
                    </span>
                    {famille}
                  </span>
                )}
                {recit.periode && (
                  <span>
                    <span className="text-xs uppercase tracking-wider text-encre-tres-douce">
                      Période ·{' '}
                    </span>
                    {recit.periode}
                  </span>
                )}
              </div>
            )}
          </header>

          <RenduMarkdown texte={recit.corps} />

          <p className="border-t border-bordure pt-4 text-sm text-encre-tres-douce">
            Écrit par {recit.auteur}, le {formaterHorodatage(recit.creeLe)}.
            {recit.modifieLe !== recit.creeLe && (
              <> Dernière retouche le {formaterHorodatage(recit.modifieLe)}.</>
            )}
          </p>

          {recit.personnes.length > 0 && (
            <section aria-label="Personnes citées" className="flex flex-col gap-3">
              <h2 className="text-lg">Personnes citées</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {recit.personnes.map((personne) => (
                  <li key={personne.id}>
                    <Vignette personne={personne} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(voisins.precedent || voisins.suivant) && (
            <VoisinsMemeFamille
              patronyme={recit.patronyme}
              precedent={voisins.precedent}
              suivant={voisins.suivant}
            />
          )}

          {(peutReprendre || droits.estAdmin) && (
            <Outils recit={recit} estAdmin={droits.estAdmin} peutReprendre={peutReprendre} />
          )}
        </article>
      </main>
    </>
  );
}

function VoisinsMemeFamille({
  patronyme,
  precedent,
  suivant,
}: {
  patronyme: string | null;
  precedent: RecitResume | null;
  suivant: RecitResume | null;
}) {
  return (
    <nav
      aria-label={`Autres récits ${patronyme ? `de la famille ${patronyme}` : 'proches'}`}
      className="grid gap-3 border-t border-bordure pt-4 sm:grid-cols-2"
    >
      {precedent ? (
        <Link
          href={`/recits/${precedent.id}`}
          className="group flex flex-col rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte p-3 transition hover:border-bordure-forte"
        >
          <span className="text-xs uppercase tracking-wider text-encre-tres-douce">
            ← Récit précédent
          </span>
          <span className="mt-1 text-encre transition group-hover:text-accent">
            {precedent.titre}
          </span>
        </Link>
      ) : (
        <span aria-hidden />
      )}
      {suivant ? (
        <Link
          href={`/recits/${suivant.id}`}
          className="group flex flex-col rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte p-3 text-right transition hover:border-bordure-forte"
        >
          <span className="text-xs uppercase tracking-wider text-encre-tres-douce">
            Récit suivant →
          </span>
          <span className="mt-1 text-encre transition group-hover:text-accent">
            {suivant.titre}
          </span>
        </Link>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}

function Outils({
  recit,
  estAdmin,
  peutReprendre,
}: {
  recit: RecitDetail;
  estAdmin: boolean;
  peutReprendre: boolean;
}) {
  return (
    <section className="carte flex flex-wrap items-center gap-3 p-4">
      {peutReprendre && (
        <Link
          href={`/recits/${recit.id}/modifier`}
          className="rounded-[var(--rayon-petit)] border border-bordure px-3 py-1.5 text-sm text-encre-douce transition hover:bg-fond-doux hover:text-encre"
        >
          Modifier
        </Link>
      )}

      {estAdmin && (
        <form action={epinglerRecit}>
          <input type="hidden" name="id" value={recit.id} />
          <input type="hidden" name="epingle" value={recit.epingle ? '0' : '1'} />
          <button
            type="submit"
            className="rounded-[var(--rayon-petit)] border border-bordure px-3 py-1.5 text-sm text-encre-douce transition hover:bg-fond-doux hover:text-encre"
          >
            {recit.epingle ? 'Retirer l’épingle' : 'Épingler en tête'}
          </button>
        </form>
      )}

      {peutReprendre && (
        <details className="ml-auto">
          <summary className="cursor-pointer text-sm text-encre-douce transition hover:text-erreur">
            Supprimer ce récit
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-encre-douce">
              Le récit et les rattachements aux personnes seront effacés. C’est sans retour.
            </p>
            <form action={supprimerRecit}>
              <input type="hidden" name="id" value={recit.id} />
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
