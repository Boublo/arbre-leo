'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';

/**
 * Fil de discussion — fiche ou photo.
 *
 * Une seule cible à la fois (contrainte SQL). L’auteur vient de la session,
 * jamais du formulaire.
 */

export type EtatCommentaire = { erreur?: string; message?: string };

const schema = z
  .object({
    personneId: z.uuid().optional(),
    mediaId: z.uuid().optional(),
    parentId: z.uuid().nullable(),
    texte: z
      .string()
      .trim()
      .min(2, 'Écrivez au moins quelques mots.')
      .max(4000, 'Message trop long : 4000 caractères au maximum.'),
  })
  .superRefine((v, ctx) => {
    const aPersonne = Boolean(v.personneId);
    const aMedia = Boolean(v.mediaId);
    if (aPersonne === aMedia) {
      ctx.addIssue({
        code: 'custom',
        message: 'Indiquez la fiche ou la photo concernée.',
      });
    }
  });

export async function deposerCommentaire(
  _precedent: EtatCommentaire,
  donnees: FormData
): Promise<EtatCommentaire> {
  const parentBrut = donnees.get('parentId');
  const personneBrut = donnees.get('personneId');
  const mediaBrut = donnees.get('mediaId');

  const analyse = schema.safeParse({
    personneId:
      typeof personneBrut === 'string' && personneBrut !== '' ? personneBrut : undefined,
    mediaId: typeof mediaBrut === 'string' && mediaBrut !== '' ? mediaBrut : undefined,
    parentId: typeof parentBrut === 'string' && parentBrut !== '' ? parentBrut : null,
    texte: donnees.get('texte'),
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Message incomplet.' };
  }

  const { personneId, mediaId, parentId, texte } = analyse.data;
  const supabase = await creerClientServeur();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erreur: 'Votre session a expiré. Reconnectez-vous pour écrire.' };
  }

  const { error } = await supabase.from('commentaires').insert({
    auteur_id: user.id,
    personne_id: personneId ?? null,
    media_id: mediaId ?? null,
    parent_id: parentId,
    texte,
  });

  if (error) {
    return { erreur: traduireErreur(error.message) };
  }

  if (personneId) revalidatePath(`/personne/${personneId}`);
  if (mediaId) {
    // On ne connaît pas forcément la personne ici : la page photo se
    // revalide via le layout personne.
    revalidatePath('/personne', 'layout');
  }

  return { message: 'Votre message est enregistré. Merci.' };
}

function traduireErreur(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('row-level security') || m.includes('policy')) {
    return "Votre compte ne permet pas encore d'écrire ici. Demandez à un administrateur de la famille.";
  }
  if (m.includes('violates foreign key')) {
    return 'Cette fiche, cette photo ou ce message n’existe plus.';
  }
  if (m.includes('commentaires_une_seule_cible') || m.includes('check constraint')) {
    return 'Le message doit porter sur une fiche ou une photo, pas les deux.';
  }
  return 'Le message n’a pas pu être enregistré. Réessayez dans un instant.';
}
