'use client';

import { useState, useTransition } from 'react';
import { choisirPortraitCarte } from '@/app/actions/photos';
import { Alerte } from '@/components/ui/champs';

/** Pose une photo de l’album sur la carte de l’arbre. */
export function BoutonPortraitCarte({
  personneId,
  mediaId,
  dejaPortrait,
}: {
  personneId: string;
  mediaId: string;
  dejaPortrait: boolean;
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

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          setErreur(null);
          start(async () => {
            const r = await choisirPortraitCarte(personneId, mediaId);
            if (r.erreur) setErreur(r.erreur);
            else setMessage(r.message ?? 'Portrait mis à jour.');
          });
        }}
        className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-4 py-2 text-sm font-medium text-encre transition hover:bg-fond-doux disabled:opacity-50"
      >
        {pending ? 'Mise à jour…' : 'Afficher sur la carte de l’arbre'}
      </button>
      {message && <Alerte ton="succes">{message}</Alerte>}
      {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
    </div>
  );
}
