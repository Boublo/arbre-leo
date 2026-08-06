import Link from 'next/link';
import { creerClientServeur } from '@/lib/supabase/server';
import { deconnecter } from '@/app/actions/auth';
import { BasculeTheme } from '@/components/bascule-theme';
import { NOM_DU_SITE } from '@/lib/site';
import { LiensNavigation } from '@/components/navigation-liens';
import { MenuMobile } from '@/components/menu-mobile';

const LIENS = [
  { href: '/', libelle: 'Accueil' },
  { href: '/arbre', libelle: 'L’arbre' },
  { href: '/chronologie', libelle: 'Chronologie' },
  { href: '/carte', libelle: 'Carte' },
  { href: '/souvenirs', libelle: 'Souvenirs' },
  { href: '/recits', libelle: 'Récits' },
  { href: '/histoire', libelle: 'La grande Histoire' },
  { href: '/aujourdhui', libelle: 'Ces jours-ci' },
  { href: '/statistiques', libelle: 'Statistiques' },
  { href: '/recherches', libelle: 'Recherches' },
  { href: '/nouveautes', libelle: 'Quoi de neuf' },
];

export async function Navigation() {
  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: membre } = user
    ? await supabase.from('membres').select('nom_affiche, role').eq('id', user.id).maybeSingle()
    : { data: null };

  const { count: enAttente } =
    membre?.role === 'admin'
      ? await supabase
          .from('membres')
          .select('id', { count: 'exact', head: true })
          .eq('statut', 'en_attente')
      : { count: 0 };

  return (
    <header className="z-20 flex shrink-0 items-center gap-2 border-b border-bordure bg-fond-carte px-4 py-2.5 sm:gap-3">
      <MenuMobile
        liens={LIENS}
        admin={
          membre?.role === 'admin'
            ? { href: '/admin', enAttente: enAttente ?? 0 }
            : undefined
        }
      />

      <Link href="/" className="flex min-w-0 flex-1 items-baseline gap-2 truncate lg:flex-none">
        <span className="truncate font-titre text-lg">{NOM_DU_SITE}</span>
      </Link>

      <div className="hidden lg:block">
        <LiensNavigation liens={LIENS} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 text-sm sm:gap-2">
        {membre?.role === 'admin' && (
          <Link
            href="/admin"
            className="hidden items-center gap-1.5 rounded-[var(--rayon-petit)] px-2.5 py-2 text-encre-douce transition hover:bg-fond-doux hover:text-encre lg:flex"
          >
            Administration
            {enAttente ? (
              <span
                className="grid h-5 min-w-5 place-items-center rounded-full bg-alerte px-1.5 text-xs font-medium text-fond"
                title={`${enAttente} demande${enAttente > 1 ? 's' : ''} en attente`}
              >
                {enAttente}
              </span>
            ) : null}
          </Link>
        )}

        <BasculeTheme />

        {membre && (
          <span className="hidden max-w-[8rem] truncate text-encre-tres-douce sm:inline md:max-w-none">
            {membre.nom_affiche}
          </span>
        )}

        <form action={deconnecter}>
          <button
            type="submit"
            className="min-h-11 rounded-[var(--rayon-petit)] px-3 py-2 text-encre-douce transition hover:bg-fond-doux hover:text-encre"
          >
            Quitter
          </button>
        </form>
      </div>
    </header>
  );
}
