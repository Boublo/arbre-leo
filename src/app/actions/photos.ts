'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';
import {
  BUCKET_MEDIAS,
  TAILLE_MAX_PHOTO,
  TYPES_PHOTO,
} from '@/lib/souvenirs-partage';

/**
 * Dépôt d’un portrait pour une personne.
 *
 * L’album se remplit librement (contributeurs, ou tout membre pour une personne
 * décédée). Le portrait de la carte de l’arbre (`photo_id`) ne change qu’avec
 * l’accord d’un administrateur — les autres déposent une demande.
 */

export type EtatPortrait = { erreur?: string; message?: string };

type ClientServeur = Awaited<ReturnType<typeof creerClientServeur>>;

const schemaPhoto = z.object({
  chemin: z.string().trim().min(1).max(400),
  nom: z.string().trim().max(200).nullable().optional(),
  mime: z.string().trim().max(120),
  taille: z.number().int().min(0).max(TAILLE_MAX_PHOTO),
  largeur: z.number().int().positive().max(30000).nullable().optional(),
  hauteur: z.number().int().positive().max(30000).nullable().optional(),
});

const schemaPortrait = z.object({
  personneId: z.uuid('Cette fiche n’existe pas.'),
  titre: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  portraitSurCarte: z.boolean(),
  photo: schemaPhoto,
});

type PortraitValide = z.infer<typeof schemaPortrait>;

function champ(donnees: FormData, nom: string): string | undefined {
  const valeur = donnees.get(nom);
  if (typeof valeur !== 'string') return undefined;
  const propre = valeur.trim();
  return propre === '' ? undefined : propre;
}

function lirePhoto(valeur: FormDataEntryValue | null): unknown {
  if (typeof valeur !== 'string' || valeur.trim() === '') return null;
  try {
    const parse = JSON.parse(valeur);
    return Array.isArray(parse) ? parse[0] : parse;
  } catch {
    return null;
  }
}

function analyser(donnees: FormData) {
  return schemaPortrait.safeParse({
    personneId: champ(donnees, 'personneId'),
    titre: champ(donnees, 'titre'),
    description: champ(donnees, 'description'),
    portraitSurCarte: donnees.get('portraitSurCarte') !== null,
    photo: lirePhoto(donnees.get('photos')),
  });
}

function premierMessage(erreur: z.ZodError): string {
  return erreur.issues[0]?.message ?? 'Formulaire incomplet.';
}

function verifierPhoto(photo: PortraitValide['photo'], utilisateurId: string): string | null {
  if (!photo.chemin.startsWith(`${utilisateurId}/`) || photo.chemin.includes('..')) {
    return 'Ce fichier ne vous appartient pas.';
  }
  if (!TYPES_PHOTO.includes(photo.mime as (typeof TYPES_PHOTO)[number])) {
    return 'Le fichier n’est pas dans un format d’image accepté.';
  }
  return null;
}

async function peutDeposerAlbum(
  supabase: ClientServeur,
  personneId: string
): Promise<boolean> {
  const { data } = await supabase.rpc('peut_deposer_photo_album', { p_personne_id: personneId });
  return data === true;
}

async function poserPortraitCarte(
  supabase: ClientServeur,
  personneId: string,
  mediaId: string,
  utilisateurId: string
): Promise<EtatPortrait | null> {
  const { data: estAdmin } = await supabase.rpc('est_admin');
  if (estAdmin === true) {
    const { error } = await supabase
      .from('personnes')
      .update({ photo_id: mediaId, modifie_par: utilisateurId })
      .eq('id', personneId);
    if (error) return { erreur: traduire(error.message) };

    await supabase
      .from('medias_personnes')
      .update({ role: 'portrait' })
      .eq('media_id', mediaId)
      .eq('personne_id', personneId);

    return { message: 'Portrait de la carte mis à jour.' };
  }

  return deposerDemandePortrait(supabase, personneId, mediaId, utilisateurId);
}

async function deposerDemandePortrait(
  supabase: ClientServeur,
  personneId: string,
  mediaId: string,
  utilisateurId: string
): Promise<EtatPortrait> {
  const { data: existante } = await supabase
    .from('demandes_portrait_carte')
    .select('id')
    .eq('personne_id', personneId)
    .eq('media_id', mediaId)
    .eq('statut', 'en_attente')
    .maybeSingle();

  if (existante) {
    return {
      message:
        'Une demande est déjà en attente pour cette photo. Un administrateur l’examinera bientôt.',
    };
  }

  const { error } = await supabase.from('demandes_portrait_carte').insert({
    personne_id: personneId,
    media_id: mediaId,
    demandeur_id: utilisateurId,
  });

  if (error) return { erreur: traduire(error.message) };

  return {
    message:
      'Photo ajoutée à l’album. Votre demande pour la carte de l’arbre a été transmise à un administrateur.',
  };
}

export async function deposerPortrait(
  _precedent: EtatPortrait,
  donnees: FormData
): Promise<EtatPortrait> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Votre session a expiré. Reconnectez-vous.' };

  const analyse = analyser(donnees);
  if (!analyse.success) return { erreur: premierMessage(analyse.error) };
  const v = analyse.data;

  const autorise = await peutDeposerAlbum(supabase, v.personneId);
  if (!autorise) {
    return {
      erreur:
        'Le dépôt de photos est réservé aux contributeurs, sauf pour l’album d’une personne décédée où tout membre peut participer.',
    };
  }

  const souciPhoto = verifierPhoto(v.photo, user.id);
  if (souciPhoto) return { erreur: souciPhoto };

  const { data: personne } = await supabase
    .from('personnes')
    .select('id, photo_id')
    .eq('id', v.personneId)
    .maybeSingle();
  if (!personne) {
    return { erreur: 'Cette fiche n’existe pas, ou la base vous refuse d’y écrire.' };
  }

  const mediaId = randomUUID();
  const { error: erreurMedia } = await supabase.from('medias').insert({
    id: mediaId,
    chemin: v.photo.chemin,
    type: 'photo',
    titre: v.titre ?? v.photo.nom ?? null,
    description: v.description ?? null,
    mime: v.photo.mime,
    taille_octets: v.photo.taille,
    largeur: v.photo.largeur ?? null,
    hauteur: v.photo.hauteur ?? null,
    depose_par: user.id,
  });
  if (erreurMedia) return { erreur: traduire(erreurMedia.message) };

  const { error: erreurLien } = await supabase.from('medias_personnes').insert({
    media_id: mediaId,
    personne_id: v.personneId,
    role: 'sujet',
  });
  if (erreurLien) {
    await nettoyerMedia(supabase, mediaId, v.photo.chemin);
    return { erreur: 'La photo n’a pas pu être rattachée à la fiche.' };
  }

  if (v.portraitSurCarte) {
    const resultat = await poserPortraitCarte(supabase, v.personneId, mediaId, user.id);
    if (resultat?.erreur) {
      return {
        erreur:
          'La photo est dans l’album, mais la demande pour la carte n’a pas pu être enregistrée. Réessayez depuis la fiche photo.',
      };
    }
  }

  rafraichir(v.personneId, mediaId);
  redirect(`/personne/${v.personneId}/photo/${mediaId}`);
}

/** Choisir une photo déjà dans l’album comme portrait de carte. */
export async function choisirPortraitCarte(
  personneId: string,
  mediaId: string
): Promise<EtatPortrait> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Votre session a expiré. Reconnectez-vous.' };

  const autorise = await peutDeposerAlbum(supabase, personneId);
  if (!autorise) {
    return { erreur: 'Vous n’avez pas le droit de modifier l’album de cette fiche.' };
  }

  const ids = z
    .object({
      personneId: z.uuid(),
      mediaId: z.uuid(),
    })
    .safeParse({ personneId, mediaId });
  if (!ids.success) return { erreur: 'Identifiants invalides.' };

  const { data: lien } = await supabase
    .from('medias_personnes')
    .select('media_id')
    .eq('media_id', ids.data.mediaId)
    .eq('personne_id', ids.data.personneId)
    .maybeSingle();
  if (!lien) {
    return { erreur: 'Cette photo n’appartient pas à cette fiche.' };
  }

  const { data: media } = await supabase
    .from('medias')
    .select('id, type, mime')
    .eq('id', ids.data.mediaId)
    .maybeSingle();
  if (!media || (media.type !== 'photo' && !media.mime?.startsWith('image/'))) {
    return { erreur: 'Seule une image peut devenir le portrait de la carte.' };
  }

  const resultat = await poserPortraitCarte(
    supabase,
    ids.data.personneId,
    ids.data.mediaId,
    user.id
  );
  if (!resultat) return { erreur: 'La demande n’a pas pu être enregistrée.' };
  if (resultat.erreur) return resultat;

  rafraichir(ids.data.personneId, ids.data.mediaId);
  return resultat;
}

async function nettoyerMedia(
  supabase: ClientServeur,
  mediaId: string,
  chemin: string
): Promise<void> {
  await supabase.from('medias').delete().eq('id', mediaId);
  await supabase.storage.from(BUCKET_MEDIAS).remove([chemin]);
}

function rafraichir(personneId: string, mediaId?: string) {
  revalidatePath(`/personne/${personneId}`);
  if (mediaId) revalidatePath(`/personne/${personneId}/photo/${mediaId}`);
  revalidatePath('/arbre');
  revalidatePath('/');
  revalidatePath('/admin');
}

function traduire(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'Vous n’avez pas le droit d’écrire sur cette fiche.';
  }
  if (m.includes('seuls les administrateurs')) {
    return 'Seuls les administrateurs peuvent poser directement un portrait sur la carte. Votre demande a été transmise.';
  }
  if (m.includes('duplicate key')) return 'Cette photo semble déjà enregistrée.';
  if (m.includes('foreign key')) return 'Cette fiche n’existe plus.';
  return 'Une erreur est survenue. Réessayez dans un instant.';
}
