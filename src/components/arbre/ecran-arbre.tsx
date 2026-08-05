'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { VueArbre, type ArbreSerialise } from '@/components/arbre/vue-arbre';
import type { PersonneArbre } from '@/lib/arbre';
import { PREUVES, trierParFiabilite } from '@/lib/preuves';

// Les niveaux de preuve sont définis une seule fois, dans @/lib/preuves : la
// fiche d'une personne et ce panneau doivent en donner la même définition.

export function EcranArbre({
  ascendance,
  complet,
}: {
  ascendance: ArbreSerialise;
  complet: ArbreSerialise;
}) {
  const [selection, setSelection] = useState<string | null>(null);

  // Le mode « toute la famille » contient tout le monde : c'est l'index le plus sûr.
  const parId = useMemo(
    () => new Map(complet.personnes.map((p) => [p.id, p])),
    [complet.personnes]
  );

  const personne = selection ? parId.get(selection) ?? null : null;

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div className="flex-1">
        <VueArbre
          ascendance={ascendance}
          complet={complet}
          personneSelectionnee={selection}
          onSelection={setSelection}
        />
      </div>

      {personne && (
        <aside className="w-full max-w-sm shrink-0 overflow-y-auto border-l border-bordure bg-fond-carte">
          <FichePersonne personne={personne} onFermer={() => setSelection(null)} />
        </aside>
      )}
    </div>
  );
}

function FichePersonne({
  personne,
  onFermer,
}: {
  personne: PersonneArbre;
  onFermer: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl leading-tight">{personne.nomComplet}</h2>
          {personne.surnom && (
            <p className="text-sm text-encre-douce">dit{personne.sexe === 'F' ? 'e' : ''} « {personne.surnom} »</p>
          )}
        </div>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer la fiche"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--rayon-petit)] text-encre-douce hover:bg-fond-doux"
        >
          ✕
        </button>
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        {personne.naissance && (
          <Ligne terme="Naissance">
            {personne.naissance.texte}
            {personne.naissance.lieu && (
              <span className="block text-encre-tres-douce">{personne.naissance.lieu}</span>
            )}
          </Ligne>
        )}

        {personne.deces ? (
          <Ligne terme="Décès">
            {personne.deces.texte}
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

      <Link
        href={`/personne/${personne.id}`}
        className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 text-center text-sm font-medium text-accent-contraste transition hover:brightness-110"
      >
        Ouvrir la fiche complète
      </Link>
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
