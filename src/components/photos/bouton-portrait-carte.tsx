'use client';

import { useState, useTransition } from 'react';
import { choisirPortraitCarte } from '@/app/actions/photos';
import { Alerte } from '@/components/ui/champs';
import type { StatutDemandePortrait } from '@/lib/types-base';

/** Pose une photo de l’album sur la carte de l’arbre, ou dépose une demande. */
export function BoutonPortraitCarte({
  personneId,
  mediaId,
  dejaPortrait,
  demandePortrait,
  estAdmin,
}: {
  personneId: string;
  mediaId: string;
  dejaPortrait: boolean;
  demandePortrait?: { statut: StatutDemandePortrait; motifRefus: string | null };
  estAdmin?: boolean;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  if (dejaPortrait) {
    return (
      <p className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-3 py-2 text-sm text-encre-douce">
        Cette photo est le portrait affiché sur la carte de l’arbre.
      </p>
    );
  }

  if (demandePortrait?.statut === 'en_attente') {
    return (
      <p className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-3 py-2 text-sm text-encre-douce">
        Une demande est en attente : un administrateur examinera cette photo pour la carte de
        l’arbre.
      </p>
    );
  }

  if (demandePortrait?.statut === 'acceptee') {
    return (
      <p className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-3 py-2 text-sm text-encre-douce">
        Cette photo a été acceptée pour la carte, mais une autre image y figure actuellement.
      </p>
    );
  }

  const libelleBouton = estAdmin
    ? pending
      ? 'Mise à jour…'
      : 'Afficher sur la carte de l’arbre'
    : pending
      ? 'Envoi de la demande…'
      : 'Demander pour la carte de l’arbre';

  return (
    <div className="flex flex-col gap-2">
      {demandePortrait?.statut === 'refusee' && (
        <Alerte ton="erreur">
          Demande écartée
          {demandePortrait.motifRefus ? ` : ${demandePortrait.motifRefus}` : '.'} Vous pouvez en
          déposer une nouvelle.
        </Alerte>
      )}
      {!estAdmin && (
        <p className="text-sm text-encre-douce">
          L’album se gère librement ; poser une photo sur la carte de l’arbre demande
          l’accord d’un administrateur.
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          setErreur(null);
          start(async () => {
            const r = await choisirPortraitCarte(personneId, mediaId);
            if (r.erreur) setErreur(r.erreur);
            else setMessage(r.message ?? 'Demande enregistrée.');
          });
        }}
        className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-4 py-2 text-sm font-medium text-encre transition hover:bg-fond-doux disabled:opacity-50"
      >
        {libelleBouton}
      </button>
      {message && <Alerte ton="succes">{message}</Alerte>}
      {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
    </div>
  );
}
