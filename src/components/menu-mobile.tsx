'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tiroir } from '@/components/interactions/tiroir';
import {
  GROUPES_NAVIGATION,
  LIENS_PRINCIPAUX,
  type GroupeNavigation,
} from '@/lib/navigation-site';

/**
 * Navigation repliée derrière un bouton menu sur petit écran.
 * Les liens du bandeau principal restent visibles à partir de `lg`.
 * Le tiroir reprend le regroupement Voir / Raconter / Chercher / Outils.
 */
export function MenuMobile({
  admin,
  maFiche,
  groupes = GROUPES_NAVIGATION,
}: {
  admin?: { href: string; enAttente: number };
  /** Lien vers la fiche de la personne liée au compte (mobile : absent du bandeau). */
  maFiche?: { href: string };
  groupes?: readonly GroupeNavigation[];
}) {
  const chemin = usePathname() ?? '/';
  const [etatMenu, setEtatMenu] = useState({ chemin, ouvert: false });
  const menuOuvert = etatMenu.chemin === chemin && etatMenu.ouvert;

  return (
    <>
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-[var(--rayon-petit)] text-encre-douce transition hover:bg-fond-doux hover:text-encre lg:hidden"
        aria-expanded={menuOuvert}
        aria-controls="menu-mobile-navigation"
        aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
        onClick={() =>
          setEtatMenu((courant) =>
            courant.chemin === chemin
              ? { chemin, ouvert: !courant.ouvert }
              : { chemin, ouvert: true },
          )
        }
      >
        <span aria-hidden className="text-xl leading-none">
          {menuOuvert ? '✕' : '☰'}
        </span>
      </button>

      <Tiroir ouvert={menuOuvert} onFermer={() => setEtatMenu({ chemin, ouvert: false })} cote="gauche" titre="Parcourir">
        <nav id="menu-mobile-navigation" className="flex flex-col gap-4">
          <SectionLiens titre="Voir" liens={LIENS_PRINCIPAUX} chemin={chemin} />

          {groupes.map((groupe) => (
            <SectionLiens
              key={groupe.id}
              titre={groupe.titre}
              liens={groupe.liens}
              chemin={chemin}
            />
          ))}

          <SectionLiens
            titre="Mon compte"
            liens={[
              { href: '/notifications', libelle: 'Notifications' },
              ...(maFiche ? [{ href: maFiche.href, libelle: 'Ma fiche' }] : []),
            ]}
            chemin={chemin}
          />

          {admin && (
            <Link
              href={admin.href}
              className="flex items-center gap-2 rounded-[var(--rayon-petit)] border border-bordure px-4 py-3 text-encre-douce transition hover:bg-fond-doux hover:text-encre"
            >
              Administration
              {admin.enAttente > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-alerte px-1.5 text-xs font-medium text-accent-contraste">
                  {admin.enAttente}
                </span>
              )}
            </Link>
          )}
        </nav>
      </Tiroir>
    </>
  );
}

function SectionLiens({
  titre,
  liens,
  chemin,
}: {
  titre: string;
  liens: readonly { href: string; libelle: string }[];
  chemin: string;
}) {
  return (
    <div>
      <p className="px-4 pb-1 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-encre-tres-douce">
        {titre}
      </p>
      <ul className="flex flex-col gap-1">
        {liens.map((lien) => {
          const courant =
            lien.href === '/'
              ? chemin === '/'
              : chemin === lien.href || chemin.startsWith(`${lien.href}/`);

          return (
            <li key={lien.href}>
              <Link
                href={lien.href}
                aria-current={courant ? 'page' : undefined}
                className={
                  courant
                    ? 'block rounded-[var(--rayon-petit)] bg-fond-doux px-4 py-3 font-medium text-encre'
                    : 'block rounded-[var(--rayon-petit)] px-4 py-3 text-encre-douce transition hover:bg-fond-doux hover:text-encre'
                }
              >
                {lien.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
