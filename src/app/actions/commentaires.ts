'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';

/**
 * Le fil de discussion d'une fiche.
 *
 * Écrire sur une fiche, c'est souvent corriger : « ce n'est pas Oran mais
 * La Sénia », « ma mère disait 1947 ». Le droit d'écrire est arbitré par les
 * politiques RLS, pas ici : cette action se contente de vérifier la forme du
 * message et de signer l'auteur avec la session en cours, jamais avec un
 * identifiant venu du formulaire.
 */

export type EtatCommentaire = { erreur?: string; message?: string };

const schemaCommentaire = z.object({
  personneId: z.uuid('Cette fiche est introuvable.'),
  parentId: z.uuid('Ce message n’existe plus.').nullable(),
  texte: z
    .string()
    .trim()
    .min(2, 'Écrivez au moins quelques mots.')
    .max(4000, 'Message trop long : 4000 caractères au maximum.'),
});

export async function deposerCommentaire(
  _precedent: EtatCommentaire,
  donnees: FormData
): Promise<EtatCommentaire> {
  const parentBrut = donnees.get('parentId');

  const analyse = schemaCommentaire.safeParse({
    personneId: donnees.get('personneId'),
    parentId: typeof parentBrut === 'string' && parentBrut !== '' ? parentBrut : null,
    texte: donnees.get('texte'),
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Message incomplet.' };
  }

  const { personneId, parentId, texte } = analyse.data;
  const supabase = await creerClientServeur();

  // getUser() interroge le serveur d'authentification : on ne se fie pas au cookie seul.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erreur: 'Votre session a expiré. Reconnectez-vous pour écrire.' };
  }

  const { error } = await supabase.from('commentaires').insert({
    auteur_id: user.id,
    personne_id: personneId,
    parent_id: parentId,
    texte,
  });

  if (error) {
    return { erreur: traduireErreur(error.message) };
  }

  revalidatePath(`/personne/${personneId}`);

  return { message: 'Votre message est enregistré. Merci.' };
}

/** Les refus de la base sont en anglais et parlent de politiques : on traduit. */
function traduireErreur(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('row-level security') || m.includes('policy')) {
    return "Votre compte ne permet pas encore d'écrire sur les fiches. Demandez à un administrateur de la famille.";
  }
  if (m.includes('violates foreign key')) {
    return 'Cette fiche ou ce message n’existe plus.';
  }
  return 'Le message n’a pas pu être enregistré. Réessayez dans un instant.';
}
