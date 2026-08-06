import Link from 'next/link';
import { creerClientServeur } from '@/lib/supabase/server';
import { deconnecter } from '@/app/actions/auth';
import { BasculeTheme } from '@/components/bascule-theme';
import { NOM_DU_SITE } from '@/lib/site';
import { LiensNavigation } from '@/components/navigation-liens';

const LIENS = [
  { href: '/', libelle: 'Accueil' },
  { href: '/arbre', libelle: 'L’arbre' },
  { href: '/chronologie', libelle: 'Chronologie' },
  { href: '/carte', libelle: 'Carte' },
  { href: '/souvenirs', libelle: 'Souvenirs' },
  { href: '/histoire', libelle: 'La grande Histoire' },
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
    <header className="z-20 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b border-bordure bg-fond-carte px-4 py-2.5">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="font-titre text-lg">{NOM_DU_SITE}</span>
      </Link>

      <LiensNavigation liens={LIENS} />

      <div className="ml-auto flex items-center gap-2 text-sm">
        {membre?.role === 'admin' && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-[var(--rayon-petit)] px-2.5 py-1.5 text-encre-douce transition hover:bg-fond-doux hover:text-encre"
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
          <span className="hidden text-encre-tres-douce sm:inline">{membre.nom_affiche}</span>
        )}

        <form action={deconnecter}>
          <button
            type="submit"
            className="rounded-[var(--rayon-petit)] px-2.5 py-1.5 text-encre-douce transition hover:bg-fond-doux hover:text-encre"
          >
            Quitter
          </button>
        </form>
      </div>
    </header>
  );
}
