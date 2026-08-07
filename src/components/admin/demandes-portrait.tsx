'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import {
  validerDemandePortrait,
  refuserDemandePortrait,
  type EtatAdmin,
} from '@/app/actions/admin';
import { ZoneTexte, BoutonEnvoi, Alerte } from '@/components/ui/champs';
import { BoutonSecondaire } from '@/components/admin/champs-admin';
import { formaterHorodatage, type DemandePortraitAdmin } from '@/components/admin/vocabulaire';

/**
 * Demandes de portrait pour la carte de l'arbre.
 *
 * Les membres gèrent librement l'album ; seul l'affichage sur la carte passe
 * par l'administrateur.
 */
export function DemandesPortrait({ demandes }: { demandes: DemandePortraitAdmin[] }) {
  return (
    <section aria-labelledby="titre-portraits" className="flex flex-col gap-4">
      <header>
        <h2 id="titre-portraits" className="text-2xl">
          Portraits pour la carte
        </h2>
        <p className="mt-1 text-sm text-encre-douce">
          {demandes.length === 0
            ? 'Aucune photo en attente pour la carte de l’arbre.'
            : `${demandes.length} photo${demandes.length > 1 ? 's attendent' : ' attend'} d’être posée${demandes.length > 1 ? 's' : ''} sur la carte.`}
        </p>
      </header>

      {demandes.length > 0 && (
        <ul className="flex flex-col gap-4">
          {demandes.map((demande) => (
            <li key={demande.id}>
              <CarteDemandePortrait demande={demande} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CarteDemandePortrait({ demande }: { demande: DemandePortraitAdmin }) {
  const [etatValider, valider] = useActionState<EtatAdmin, FormData>(validerDemandePortrait, {});
  const [etatRefuser, refuser] = useActionState<EtatAdmin, FormData>(refuserDemandePortrait, {});

  return (
    <article className="carte flex flex-col gap-4 px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex shrink-0 gap-3">
          <figure className="flex flex-col gap-1">
            <img
              src={demande.urlPhoto ?? undefined}
              alt={demande.titrePhoto ?? 'Photo demandée'}
              className="h-28 w-28 rounded-[var(--rayon-petit)] border border-bordure object-cover bg-fond-doux"
            />
            <figcaption className="text-center text-[10px] text-encre-tres-douce">
              Demandée
            </figcaption>
          </figure>
          {demande.urlPortraitActuel && (
            <figure className="flex flex-col gap-1">
              <img
                src={demande.urlPortraitActuel}
                alt="Portrait actuel sur la carte"
                className="h-28 w-28 rounded-[var(--rayon-petit)] border border-bordure object-cover bg-fond-doux opacity-80"
              />
              <figcaption className="text-center text-[10px] text-encre-tres-douce">
                Sur la carte
              </figcaption>
            </figure>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <p className="font-medium text-encre">
                <Link href={`/personne/${demande.personneId}`} className="lien-discret">
                  {demande.nomPersonne}
                </Link>
              </p>
              <p className="text-sm text-encre-douce">
                {demande.titrePhoto ?? 'Photo sans titre'} · demandé par {demande.demandeur}
              </p>
            </div>
            <time className="text-xs text-encre-tres-douce" dateTime={demande.creeLe}>
              {formaterHorodatage(demande.creeLe)}
            </time>
          </div>

          <p className="mt-2 text-sm text-encre-douce">
            <Link
              href={`/personne/${demande.personneId}/photo/${demande.mediaId}`}
              className="lien-discret"
            >
              Voir la photo dans l’album →
            </Link>
          </p>
        </div>
      </div>

      {(etatValider.message || etatValider.erreur) && (
        <Alerte ton={etatValider.erreur ? 'erreur' : 'succes'}>
          {etatValider.erreur ?? etatValider.message}
        </Alerte>
      )}
      {(etatRefuser.message || etatRefuser.erreur) && (
        <Alerte ton={etatRefuser.erreur ? 'erreur' : 'succes'}>
          {etatRefuser.erreur ?? etatRefuser.message}
        </Alerte>
      )}

      <div className="flex flex-col gap-3 border-t border-bordure pt-4 sm:flex-row sm:items-end">
        <form action={valider} className="flex gap-2">
          <input type="hidden" name="demandeId" value={demande.id} />
          <BoutonEnvoi>Poser sur la carte</BoutonEnvoi>
        </form>

        <form action={refuser} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="demandeId" value={demande.id} />
          <div className="min-w-0 flex-1">
            <ZoneTexte
              label="Motif du refus"
              name="motif"
              rows={2}
              maxLength={500}
              placeholder="Photo floue, mauvais cadrage…"
              required
            />
          </div>
          <BoutonSecondaire type="submit">Écarter</BoutonSecondaire>
        </form>
      </div>
    </article>
  );
}
