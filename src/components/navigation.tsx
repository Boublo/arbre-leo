import Link from 'next/link';
import { creerClientServeur } from '@/lib/supabase/server';
import { deconnecter } from '@/app/actions/auth';
import { BasculeTheme } from '@/components/bascule-theme';
import { NOM_DU_SITE } from '@/lib/site';
import { LIENS_PRINCIPAUX } from '@/lib/navigation-site';
import { LiensNavigation } from '@/components/navigation-liens';
import { NavigationPlus } from '@/components/navigation-plus';
import { MenuMobile } from '@/components/menu-mobile';
import { ClocheNotifications } from '@/components/notifications/cloche-notifications';

export async function Navigation({ compact = false }: { compact?: boolean }) {
  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: membre } = user
    ? await supabase.from('membres').select('nom_affiche, role, personne_id, statut').eq('id', user.id).maybeSingle()
    : { data: null };

  const { count: enAttente } =
    membre?.role === 'admin'
      ? await supabase
          .from('membres')
          .select('id', { count: 'exact', head: true })
          .eq('statut', 'en_attente')
      : { count: 0 };

  return (
    <header className="sticky top-0 z-50 flex shrink-0 items-center gap-2 border-b border-bordure bg-fond-carte px-4 py-2.5 sm:gap-3">
      <MenuMobile
        admin={
          membre?.role === 'admin'
            ? { href: '/admin', enAttente: enAttente ?? 0 }
            : undefined
        }
        maFiche={
          membre?.statut === 'valide' && membre.personne_id
            ? { href: `/personne/${membre.personne_id}` }
            : undefined
        }
      />

      <Link
        href="/"
        className={`min-w-0 items-baseline gap-2 truncate ${
          compact
            ? 'flex min-w-0 max-w-[42vw] flex-1 sm:max-w-none lg:flex-none'
            : 'flex flex-1 lg:flex-none'
        }`}
      >
        <span className="truncate font-titre text-lg">{NOM_DU_SITE}</span>
      </Link>

      <div className="hidden items-center gap-1 lg:flex">
        <LiensNavigation liens={LIENS_PRINCIPAUX} />
        <NavigationPlus />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 text-sm sm:gap-2">
        {membre?.role === 'admin' && (
          <Link
            href="/admin"
            className="hidden min-h-11 items-center gap-1.5 rounded-[var(--rayon-petit)] px-2.5 py-2 text-encre-douce transition hover:bg-fond-doux hover:text-encre lg:flex"
          >
            Administration
            {enAttente ? (
              <span
                className="grid h-5 min-w-5 place-items-center rounded-full bg-alerte px-1.5 text-xs font-medium text-accent-contraste"
                title={`${enAttente} demande${enAttente > 1 ? 's' : ''} en attente`}
              >
                {enAttente}
              </span>
            ) : null}
          </Link>
        )}

        <BasculeTheme />

        {membre?.statut === 'valide' && membre.personne_id && (
          <Link
            href={`/personne/${membre.personne_id}`}
            className="hidden min-h-11 items-center rounded-[var(--rayon-petit)] px-2.5 py-2 text-encre-douce transition hover:bg-fond-doux hover:text-encre lg:flex"
          >
            Ma fiche
          </Link>
        )}

        {membre && <ClocheNotifications />}

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
