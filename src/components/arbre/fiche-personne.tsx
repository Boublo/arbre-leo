'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PersonneArbre } from '@/lib/arbre';
import { urlImpressionArbre } from '@/lib/arbre-impression';
import type { ModeArbre } from '@/lib/layout-arbre';
import { coteDesBranches, LIBELLE_COTE, TON_COTE } from '@/lib/branches';
import { PREUVES, trierParFiabilite } from '@/lib/preuves';
import { VisionneusePhoto } from '@/components/photos/visionneuse-photo';
import { PhotoSignee } from '@/components/photos/photo-signee';

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
  peutDeposerPhoto = false,
  modeArbre = 'ascendance',
}: {
  personne: PersonneArbre;
  annees: string | null;
  estFocus: boolean;
  onRepartirDIci: () => void;
  onFermer: () => void;
  peutDeposerPhoto?: boolean;
  modeArbre?: ModeArbre;
}) {
  const cote = coteDesBranches(personne.branches);
  const initiale = (personne.nomComplet.trim().charAt(0) || '?').toUpperCase();
  const [photoAgrandie, setPhotoAgrandie] = useState(false);

  return (
    <div className="flex flex-col">
      {/* Portrait en en-tête — même logique que les cartes de l'arbre */}
      <div className="relative aspect-[5/3] w-full overflow-hidden bg-fond-doux">
        {personne.photoUrl ? (
          <>
            <button
              type="button"
              onClick={() => setPhotoAgrandie(true)}
              className="group relative h-full w-full cursor-zoom-in"
              aria-label={`Agrandir le portrait de ${personne.nomComplet}`}
            >
              <PhotoSignee
                src={personne.photoUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 400px"
                className="object-cover"
              />
              <span
                aria-hidden
                className="absolute inset-0 flex items-center justify-center bg-encre/0 transition group-hover:bg-encre/10 group-focus-visible:bg-encre/10"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full border border-bordure bg-fond-carte/90 text-base text-encre-douce opacity-0 shadow-[var(--ombre-douce)] backdrop-blur-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  ⤢
                </span>
              </span>
            </button>
            <VisionneusePhoto
              src={personne.photoUrl}
              alt={`Portrait de ${personne.nomComplet}`}
              ouverte={photoAgrandie}
              onFermer={() => setPhotoAgrandie(false)}
            />
          </>
        ) : (
          <div
            aria-hidden
            className="flex h-full w-full items-center justify-center text-6xl text-encre-tres-douce"
            style={{ fontFamily: 'var(--font-titre)' }}
          >
            {initiale}
          </div>
        )}
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-1"
          style={{ background: TON_COTE[cote] }}
        />
        {personne.presumeVivant && (
          <span className="absolute bottom-2 right-2 rounded-full bg-succes px-2 py-0.5 text-[10px] font-medium text-accent-contraste">
            Vivant
          </span>
        )}
        {peutDeposerPhoto && (
          <Link
            href={`/personne/${personne.id}/photo/nouveau`}
            className="absolute bottom-2 left-2 rounded-full border border-bordure bg-fond-carte/90 px-3 py-1 text-xs font-medium text-encre shadow-[var(--ombre-douce)] backdrop-blur-sm transition hover:bg-fond-carte"
          >
            {personne.photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
          </Link>
        )}
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer le panneau"
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border border-bordure bg-fond-carte/90 text-encre-douce shadow-[var(--ombre-douce)] backdrop-blur-sm hover:bg-fond-carte"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
            {LIBELLE_COTE[cote]}
          </p>
          <h2 className="mt-1 text-xl leading-tight">{personne.nomComplet}</h2>
          {personne.surnom && (
            <p className="text-sm text-encre-douce">
              dit{personne.sexe === 'F' ? 'e' : ''} « {personne.surnom} »
            </p>
          )}
          {annees && <p className="mt-0.5 text-sm text-encre-tres-douce">{annees}</p>}
          {personne.profession && (
            <p className="mt-1 text-sm text-encre-douce">{personne.profession}</p>
          )}
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
                      <span className="block text-encre-douce">{p.explication}</span>
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
            href={urlImpressionArbre(personne.id, modeArbre)}
            className="rounded-[var(--rayon-petit)] border border-bordure px-4 py-2.5 text-center text-sm text-encre transition hover:bg-fond-doux"
          >
            Imprimer son arbre
          </Link>
          <Link
            href={`/personne/${personne.id}/imprimer`}
            className="lien-discret text-center text-xs"
          >
            Fiche imprimable
          </Link>
          <Link
            href={`/chronologie?personne=${encodeURIComponent(personne.id)}`}
            className="lien-discret text-center text-xs"
          >
            Voir sa chronologie
          </Link>
        </div>
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
