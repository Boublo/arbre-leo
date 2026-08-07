'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { ModeArbre } from '@/lib/layout-arbre';
import { LIBELLE_MODE } from '@/lib/layout-arbre';
import {
  PROFONDEURS,
  urlOptionsImpression,
  type OptionsImpressionArbre,
} from '@/lib/arbre-impression';

const MODES: ModeArbre[] = ['ascendance', 'famille', 'descendance', 'eclate'];

/**
 * Barre d'outils de la page imprimable : modes, profondeur, photos, format.
 * Chaque option est un lien — pas de JavaScript requis pour prévisualiser.
 */
export function OptionsImpressionArbre({
  personneId,
  mode,
  options,
}: {
  personneId: string;
  mode: ModeArbre;
  options: OptionsImpressionArbre;
}) {
  const base = { personne: personneId, mode };

  return (
    <div className="arbre-impr-options no-imprimer">
      <nav className="arbre-impr-modes" aria-label="Vue à imprimer">
        {MODES.map((m) => (
          <Link
            key={m}
            href={urlOptionsImpression({ ...base, mode: m }, options)}
            className={m === mode ? 'arbre-impr-mode-actif' : 'arbre-impr-mode'}
            title={LIBELLE_MODE[m].aide}
          >
            {LIBELLE_MODE[m].titre}
          </Link>
        ))}
      </nav>

      <div className="arbre-impr-reglages">
        <Groupe label="Profondeur">
          {PROFONDEURS.map((p) => (
            <LienOption
              key={String(p.valeur)}
              href={urlOptionsImpression(base, { ...options, profondeur: p.valeur })}
              actif={options.profondeur === p.valeur}
            >
              {p.libelle}
            </LienOption>
          ))}
        </Groupe>

        <Groupe label="Photos">
          <LienOption
            href={urlOptionsImpression(base, { ...options, avecPhotos: true })}
            actif={options.avecPhotos}
          >
            Avec portraits
          </LienOption>
          <LienOption
            href={urlOptionsImpression(base, { ...options, avecPhotos: false })}
            actif={!options.avecPhotos}
          >
            Sans portraits
          </LienOption>
        </Groupe>

        <Groupe label="Format">
          <LienOption
            href={urlOptionsImpression(base, { ...options, format: 'paysage' })}
            actif={options.format === 'paysage'}
          >
            Paysage
          </LienOption>
          <LienOption
            href={urlOptionsImpression(base, { ...options, format: 'portrait' })}
            actif={options.format === 'portrait'}
          >
            Portrait
          </LienOption>
        </Groupe>
        <Groupe label="Découpage">
          <LienOption
            href={urlOptionsImpression(base, { ...options, decoupage: 'complet' })}
            actif={options.decoupage === 'complet'}
          >
            Une page
          </LienOption>
          <LienOption
            href={urlOptionsImpression(base, { ...options, decoupage: 'pages' })}
            actif={options.decoupage === 'pages'}
          >
            Plusieurs pages
          </LienOption>
        </Groupe>
      </div>
    </div>
  );
}

function Groupe({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="arbre-impr-groupe">
      <span className="arbre-impr-groupe-label">{label}</span>
      <div className="arbre-impr-groupe-boutons">{children}</div>
    </div>
  );
}

function LienOption({
  href,
  actif,
  children,
}: {
  href: string;
  actif: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={actif ? 'arbre-impr-opt-actif' : 'arbre-impr-opt'}>
      {children}
    </Link>
  );
}
