'use client';

import { Vignette } from '@/components/portrait/vignette';
import { portraitDePortrait } from '@/components/souvenirs/portrait-mentionnable';
import type { PortraitMentionnable } from '@/lib/souvenirs';
import { extraitRecit, MOIS, type PrecisionSaisie } from '@/lib/souvenirs-partage';
import type { PhotoDeposee } from '@/components/souvenirs/depot-photos';

/**
 * Ce que la carte donnera, avant qu’elle ne soit déposée.
 *
 * Le formulaire tient la vérité ; ce panneau ne fait que la refléter, sans
 * jamais l’écrire en base. Pensé pour rester à droite du formulaire sur les
 * grands écrans et passer en dessous sur mobile — un aperçu qui gêne serait
 * contreproductif.
 */
export function ApercuSouvenir({
  titre,
  recit,
  precision,
  annee,
  mois,
  jour,
  dateTexte,
  lieu,
  personnes,
  photos,
}: {
  titre: string;
  recit: string;
  precision: PrecisionSaisie;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  dateTexte: string | null;
  lieu: string | null;
  personnes: PortraitMentionnable[];
  photos: PhotoDeposee[];
}) {
  const date = formaterDatePourApercu({ precision, annee, mois, jour, dateTexte });
  const photoVisible = photos.find((p) => p.apercu);

  const vide =
    titre.trim().length === 0 &&
    recit.trim().length === 0 &&
    personnes.length === 0 &&
    photos.length === 0;

  return (
    <aside
      aria-label="Aperçu du souvenir"
      className="lg:sticky lg:top-6 flex flex-col gap-3"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
        Aperçu — non enregistré
      </p>

      {vide ? (
        <div className="carte flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-encre-douce">Rien encore.</p>
          <p className="text-xs text-encre-tres-douce">
            Ce cadre montrera votre souvenir tel que la famille le lira, au fur et à mesure de votre saisie.
          </p>
        </div>
      ) : (
        <article className="carte overflow-hidden">
          {photoVisible && (
            <div className="aspect-[4/3] overflow-hidden bg-fond-doux">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoVisible.apercu ?? ''}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-col gap-3 p-5">
            <h3 className="text-2xl leading-tight">
              {titre.trim() || <span className="text-encre-tres-douce">Un titre…</span>}
            </h3>

            <p className="text-sm text-encre-tres-douce">
              {date || 'Date à préciser'}
              {lieu && lieu.trim().length > 0 && <> · {lieu.trim()}</>}
              {photos.length > 0 && (
                <>
                  {' · '}
                  {photos.length} photo{photos.length > 1 ? 's' : ''}
                </>
              )}
            </p>

            {dateTexte && dateTexte.trim().length > 0 && (
              <p className="text-xs italic text-encre-tres-douce">« {dateTexte.trim()} »</p>
            )}

            {recit.trim().length > 0 ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-encre-douce">
                {extraitRecit(recit, 480)}
              </p>
            ) : (
              <p className="text-sm text-encre-tres-douce">Le récit apparaîtra ici.</p>
            )}

            {personnes.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-bordure pt-3">
                <p className="text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
                  Qui y était
                </p>
                <ul className="flex flex-col gap-1.5">
                  {personnes.slice(0, 3).map((p) => (
                    <li key={p.id}>
                      <Vignette personne={portraitDePortrait(p)} />
                    </li>
                  ))}
                  {personnes.length > 3 && (
                    <li className="text-xs text-encre-tres-douce">
                      et {personnes.length - 3} autre{personnes.length - 3 > 1 ? 's' : ''}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </article>
      )}
    </aside>
  );
}

function formaterDatePourApercu({
  precision,
  annee,
  mois,
  jour,
  dateTexte,
}: {
  precision: PrecisionSaisie;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  dateTexte: string | null;
}): string {
  if (precision === 'inconnue') return dateTexte?.trim() || '';
  if (annee === null) return '';

  if (precision === 'decennie') {
    return `années ${Math.floor(annee / 10) * 10}`;
  }
  if (precision === 'jour' && mois && jour) {
    const j = jour === 1 ? '1er' : String(jour);
    return `${j} ${MOIS[mois - 1]} ${annee}`;
  }
  if (precision === 'mois' && mois) {
    return `${MOIS[mois - 1]} ${annee}`;
  }
  return String(annee);
}
