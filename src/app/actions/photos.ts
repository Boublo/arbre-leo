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
 * Le fichier part d’abord dans le bucket privé ; cette action enregistre le
 * média, le relie à la fiche, et peut le poser sur `photo_id` pour qu’il
 * apparaisse sur la carte de l’arbre.
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

export async function deposerPortrait(
  _precedent: EtatPortrait,
  donnees: FormData
): Promise<EtatPortrait> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Votre session a expiré. Reconnectez-vous.' };

  const { data: autorise } = await supabase.rpc('peut_contribuer');
  if (autorise !== true) {
    return {
      erreur:
        'Le dépôt de photos est réservé aux contributeurs. Demandez à un administrateur d’ouvrir votre accès.',
    };
  }

  const analyse = analyser(donnees);
  if (!analyse.success) return { erreur: premierMessage(analyse.error) };
  const v = analyse.data;

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
    role: 'portrait',
  });
  if (erreurLien) {
    await nettoyerMedia(supabase, mediaId, v.photo.chemin);
    return { erreur: 'La photo n’a pas pu être rattachée à la fiche.' };
  }

  if (v.portraitSurCarte) {
    const { error: erreurPortrait } = await supabase
      .from('personnes')
      .update({ photo_id: mediaId, modifie_par: user.id })
      .eq('id', v.personneId);
    if (erreurPortrait) {
      return {
        erreur:
          'La photo est enregistrée sur la fiche, mais n’a pas pu être posée sur la carte. Un administrateur pourra la choisir manuellement.',
      };
    }
  }

  rafraichir(v.personneId);
  redirect(`/personne/${v.personneId}`);
}

async function nettoyerMedia(
  supabase: ClientServeur,
  mediaId: string,
  chemin: string
): Promise<void> {
  await supabase.from('medias').delete().eq('id', mediaId);
  await supabase.storage.from(BUCKET_MEDIAS).remove([chemin]);
}

function rafraichir(personneId: string) {
  revalidatePath(`/personne/${personneId}`);
  revalidatePath('/arbre');
  revalidatePath('/');
}

function traduire(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'Vous n’avez pas le droit d’écrire sur cette fiche.';
  }
  if (m.includes('duplicate key')) return 'Cette photo semble déjà enregistrée.';
  if (m.includes('foreign key')) return 'Cette fiche n’existe plus.';
  return 'Une erreur est survenue. Réessayez dans un instant.';
}
