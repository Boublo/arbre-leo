'use client';

import Link from 'next/link';
import type { PersonneArbre } from '@/lib/arbre';
import { PREUVES, trierParFiabilite } from '@/lib/preuves';

/**
 * Le panneau qui s'ouvre au clic sur quelqu'un.
 *
 * Il donne l'essentiel et deux issues : repartir de cette personne pour
 * explorer sa propre parenté, ou ouvrir sa fiche complète. C'est ce va-et-vient
 * qui rend l'arbre parcourable de proche en proche.
 */
export function FichePersonne({
  personne,
  annees,
  estFocus,
  onRepartirDIci,
  onFermer,
}: {
  personne: PersonneArbre;
  annees: string | null;
  estFocus: boolean;
  onRepartirDIci: () => void;
  onFermer: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl leading-tight">{personne.nomComplet}</h2>
          {personne.surnom && (
            <p className="text-sm text-encre-douce">
              dit{personne.sexe === 'F' ? 'e' : ''} « {personne.surnom} »
            </p>
          )}
          {annees && <p className="mt-0.5 text-sm text-encre-tres-douce">{annees}</p>}
        </div>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer le panneau"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--rayon-petit)] text-encre-douce hover:bg-fond-doux sm:h-8 sm:w-8"
        >
          ✕
        </button>
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        {personne.naissance && (
          <Ligne terme="Naissance">
            {personne.naissance.texte || 'Date inconnue'}
            {personne.naissance.lieu && (
              <span className="block text-encre-tres-douce">{personne.naissance.lieu}</span>
            )}
          </Ligne>
        )}

        {personne.deces ? (
          <Ligne terme="Décès">
            {personne.deces.texte || 'Date inconnue'}
            {personne.deces.lieu && (
              <span className="block text-encre-tres-douce">{personne.deces.lieu}</span>
            )}
          </Ligne>
        ) : personne.presumeVivant ? (
          <Ligne terme="Décès">
            <span className="text-encre-tres-douce">Aucun décès connu.</span>
          </Ligne>
        ) : null}

        {personne.profession && <Ligne terme="Métier">{personne.profession}</Ligne>}
      </dl>

      {personne.niveauxPreuve.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            Ce qui l’atteste
          </h3>
          <ul className="flex flex-col gap-1.5">
            {trierParFiabilite(personne.niveauxPreuve).map((niveau) => {
              const p = PREUVES[niveau];
              return (
                <li key={niveau} className="flex items-start gap-2 text-xs">
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: p.ton }}
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium text-encre">{p.libelle}</span>
                    <span className="block text-encre-tres-douce">{p.explication}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {personne.notes && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            Notes d’enquête
          </h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-encre-douce">
            {extraire(personne.notes, 700)}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {!estFocus && (
          <button
            type="button"
            onClick={onRepartirDIci}
            className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 text-sm font-medium text-accent-contraste transition hover:brightness-110"
          >
            Repartir d’ici
          </button>
        )}
        <Link
          href={`/personne/${personne.id}`}
          className="rounded-[var(--rayon-petit)] border border-bordure px-4 py-2.5 text-center text-sm text-encre transition hover:bg-fond-doux"
        >
          Ouvrir sa fiche complète
        </Link>
        <Link
          href={`/chronologie?personne=${encodeURIComponent(personne.id)}`}
          className="lien-discret text-center text-xs"
        >
          Voir sa chronologie
        </Link>
      </div>
    </div>
  );
}

function Ligne({ terme, children }: { terme: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-encre-tres-douce">{terme}</dt>
      <dd className="mt-0.5 text-encre">{children}</dd>
    </div>
  );
}

/** Coupe au dernier point avant la limite, pour ne pas trancher une phrase. */
function extraire(texte: string, max: number) {
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  const dernierPoint = coupe.lastIndexOf('.');
  return `${dernierPoint > max * 0.5 ? coupe.slice(0, dernierPoint + 1) : coupe}…`;
}
