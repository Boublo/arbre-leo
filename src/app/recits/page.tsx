import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { BarreScroll } from '@/components/interactions/barre-scroll';
import { RaccourciAccueil } from '@/components/interactions/raccourci-accueil';
import { CarteRecit } from '@/components/recits/carte-recit';
import {
  SelecteurFamille,
  type FiltreRecitsActif,
} from '@/components/recits/selecteur-famille';
import {
  chargerChoixFamilles,
  chargerChoixThemes,
  chargerRecits,
  lireDroits,
  type FiltreRecitsListe,
} from '@/lib/recits';

export const metadata = { title: 'Récits de famille' };

export const dynamic = 'force-dynamic';

function premier(valeur: string | string[] | undefined): string | null {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  const propre = (brut ?? '').trim();
  return propre === '' ? null : propre;
}

function lireFiltre(
  famille: string | null,
  theme: string | null
): { filtre: FiltreRecitsListe; actif: FiltreRecitsActif } {
  if (theme) return { filtre: { type: 'theme', valeur: theme }, actif: { type: 'theme', valeur: theme } };
  if (famille) return { filtre: { type: 'famille', valeur: famille }, actif: { type: 'famille', valeur: famille } };
  return { filtre: { type: 'tous' }, actif: { type: 'tous' } };
}

export default async function PageRecits({ searchParams }: PageProps<'/recits'>) {
  const parametres = await searchParams;
  const famille = premier(parametres.famille);
  const theme = premier(parametres.theme);
  const { filtre, actif } = lireFiltre(famille, theme);

  const [choixFamilles, choixThemes, recits, droits] = await Promise.all([
    chargerChoixFamilles(),
    chargerChoixThemes(),
    chargerRecits(filtre),
    lireDroits(),
  ]);

  const familleConnue = famille && choixFamilles.some((c) => c.patronyme === famille);
  const famillesActives =
    famille && !familleConnue
      ? [...choixFamilles, { patronyme: famille, nombre: 0 }]
      : choixFamilles;

  const themeConnu = theme && choixThemes.some((c) => c.theme === theme);
  const themesActifs =
    theme && !themeConnu ? [...choixThemes, { theme, nombre: 0 }] : choixThemes;

  const libelleFiltre =
    actif.type === 'famille'
      ? `la famille ${actif.valeur}`
      : actif.type === 'theme'
        ? `le thème « ${actif.valeur} »`
        : null;

  return (
    <>
      <BarreScroll />
      <RaccourciAccueil />
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl">Récits de famille</h1>
            <p className="mt-2 max-w-2xl text-encre-douce">
              L’histoire longue plutôt que l’anecdote : ce qui traverse un couple, une
              maison, un métier, une génération. À écrire pour que le fil ne se perde pas.
            </p>
          </div>

          {droits.peutContribuer && (
            <Link
              href="/recits/nouveau"
              className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste transition hover:brightness-110"
            >
              Écrire un récit
            </Link>
          )}
        </div>

        <section className="mt-6" aria-label="Filtrer les récits">
          <SelecteurFamille familles={famillesActives} themes={themesActifs} actif={actif} />
        </section>

        <div className="mt-8">
          {recits.length === 0 ? (
            <EtatVide
              libelleFiltre={libelleFiltre}
              famille={famille}
              theme={theme}
              peutEcrire={droits.peutContribuer}
            />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recits.map((recit) => (
                <li key={recit.id}>
                  <CarteRecit recit={recit} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}

function EtatVide({
  libelleFiltre,
  famille,
  theme,
  peutEcrire,
}: {
  libelleFiltre: string | null;
  famille: string | null;
  theme: string | null;
  peutEcrire: boolean;
}) {
  const message = libelleFiltre
    ? `Aucun récit pour ${libelleFiltre} pour l’instant.`
    : `Aucun récit n’a encore été déposé. Le premier deviendra la matière du site.`;

  const hrefNouveau = theme
    ? `/recits/nouveau?theme=${encodeURIComponent(theme)}`
    : famille
      ? `/recits/nouveau?famille=${encodeURIComponent(famille)}`
      : '/recits/nouveau';

  return (
    <section className="carte flex flex-col items-center gap-4 p-8 text-center">
      <p className="text-encre-douce">{message}</p>
      {peutEcrire ? (
        <Link
          href={hrefNouveau}
          className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2 text-sm font-medium text-accent-contraste transition hover:brightness-110"
        >
          Écrire le premier récit
        </Link>
      ) : (
        <p className="text-xs text-encre-tres-douce">
          Seuls les contributeurs peuvent écrire un récit.
        </p>
      )}
    </section>
  );
}
