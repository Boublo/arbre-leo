'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';
import {
  ANNEE_MIN,
  BUCKET_MEDIAS,
  NOMBRE_MAX_PHOTOS,
  TAILLE_MAX_PHOTO,
  TYPES_PHOTO,
  anneeMax,
  dateReelle,
} from '@/lib/souvenirs-partage';
import type { PrecisionDate } from '@/lib/types-base';

/**
 * Le dépôt d’un souvenir.
 *
 * Trois règles tiennent tout :
 * - `auteur_id` vaut toujours l’utilisateur courant, jamais ce que dit le
 *   formulaire ;
 * - le droit de modifier ou de supprimer est arbitré par les politiques RLS,
 *   pas par ces fonctions : on les laisse répondre et on lit leur réponse ;
 * - une photo ne peut être rattachée qu’à un fichier déposé par soi-même,
 *   sous son propre préfixe dans le bucket.
 */

export type EtatSouvenir = { erreur?: string; message?: string };

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const schemaPhoto = z.object({
  /** Renseigné pour une photo déjà enregistrée : on se contente de la relier. */
  mediaId: z.string().uuid().nullable().optional(),
  chemin: z.string().trim().min(1).max(400),
  nom: z.string().trim().max(200).nullable().optional(),
  // Vides pour une photo déjà enregistrée : ces colonnes ne sont pas réécrites.
  mime: z.string().trim().max(120),
  taille: z.number().int().min(0).max(TAILLE_MAX_PHOTO),
  largeur: z.number().int().positive().max(30000).nullable().optional(),
  hauteur: z.number().int().positive().max(30000).nullable().optional(),
});

type PhotoValidee = z.infer<typeof schemaPhoto>;

const schemaSouvenir = z
  .object({
    titre: z
      .string()
      .trim()
      .min(3, 'Donnez un titre d’au moins trois caractères.')
      .max(160, 'Ce titre est trop long : cent soixante caractères au plus.'),
    recit: z
      .string()
      .trim()
      .min(10, 'Le récit est bien court : racontez-nous.')
      .max(20000, 'Le récit dépasse la longueur permise.'),
    precision: z.enum(['jour', 'mois', 'annee', 'decennie', 'inconnue']),
    annee: z
      .number()
      .int()
      .min(ANNEE_MIN, `Aucun souvenir ne remonte avant ${ANNEE_MIN}.`)
      .max(anneeMax(), 'Cette année n’est pas encore arrivée.')
      .nullable(),
    mois: z.number().int().min(1).max(12).nullable(),
    jour: z.number().int().min(1).max(31).nullable(),
    dateTexte: z.string().trim().max(160, 'Cette précision de date est trop longue.').nullable(),
    lieuId: z.string().uuid('Ce lieu n’existe pas.').nullable(),
    lieuLibre: z.string().trim().max(160, 'Ce nom de lieu est trop long.').nullable(),
    personnes: z.array(z.string().uuid()).max(80, 'Trop de personnes mentionnées.'),
    photos: z
      .array(schemaPhoto)
      .max(NOMBRE_MAX_PHOTOS, `Pas plus de ${NOMBRE_MAX_PHOTOS} photos par souvenir.`),
  })
  .superRefine((v, ctx) => {
    if (v.precision !== 'inconnue' && v.annee === null) {
      ctx.addIssue({ code: 'custom', path: ['annee'], message: 'Indiquez au moins une année.' });
    }
    if ((v.precision === 'mois' || v.precision === 'jour') && v.mois === null) {
      ctx.addIssue({ code: 'custom', path: ['mois'], message: 'Indiquez le mois.' });
    }
    if (v.precision === 'jour' && v.jour === null) {
      ctx.addIssue({ code: 'custom', path: ['jour'], message: 'Indiquez le jour.' });
    }
    if (
      v.precision === 'jour' &&
      v.annee !== null &&
      v.mois !== null &&
      v.jour !== null &&
      !dateReelle(v.annee, v.mois, v.jour)
    ) {
      ctx.addIssue({ code: 'custom', path: ['jour'], message: 'Cette date n’a jamais existé.' });
    }
  });

type SouvenirValide = z.infer<typeof schemaSouvenir>;

function texte(valeur: FormDataEntryValue | null): string | null {
  const brut = String(valeur ?? '').trim();
  return brut === '' ? null : brut;
}

/** Une saisie illisible vaut absence : le message d’erreur reste alors en français. */
function entier(valeur: FormDataEntryValue | null): number | null {
  const brut = texte(valeur);
  if (brut === null) return null;
  const nombre = Number(brut);
  return Number.isFinite(nombre) ? Math.trunc(nombre) : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Refuse tout ce qui n’est pas un identifiant : Postgres n’a pas à trancher. */
function identifiant(valeur: FormDataEntryValue | null): string | null {
  const brut = texte(valeur);
  return brut !== null && UUID.test(brut) ? brut : null;
}

/** Les photos voyagent en JSON : c’est le navigateur qui les a déjà téléversées. */
function lirePhotos(valeur: FormDataEntryValue | null): unknown {
  const brut = texte(valeur);
  if (brut === null) return [];
  try {
    return JSON.parse(brut);
  } catch {
    // Un JSON illisible échouera à la validation, avec un message clair.
    return null;
  }
}

function analyser(donnees: FormData) {
  return schemaSouvenir.safeParse({
    titre: String(donnees.get('titre') ?? ''),
    recit: String(donnees.get('recit') ?? ''),
    precision: String(donnees.get('precision') ?? 'inconnue'),
    annee: entier(donnees.get('annee')),
    mois: entier(donnees.get('mois')),
    jour: entier(donnees.get('jour')),
    dateTexte: texte(donnees.get('dateTexte')),
    lieuId: texte(donnees.get('lieuId')),
    lieuLibre: texte(donnees.get('lieuLibre')),
    personnes: donnees.getAll('personnes').map((v) => String(v)),
    photos: lirePhotos(donnees.get('photos')),
  });
}

/** Traduit la précision demandée en colonnes de la table. */
function composerDate(v: SouvenirValide): {
  annee: number | null;
  mois: number | null;
  jour: number | null;
  precision_date: PrecisionDate;
} {
  switch (v.precision) {
    case 'jour':
      return { annee: v.annee, mois: v.mois, jour: v.jour, precision_date: 'jour' };
    case 'mois':
      return { annee: v.annee, mois: v.mois, jour: null, precision_date: 'mois' };
    case 'annee':
      return { annee: v.annee, mois: null, jour: null, precision_date: 'annee' };
    case 'decennie':
      return {
        annee: v.annee === null ? null : Math.floor(v.annee / 10) * 10,
        mois: null,
        jour: null,
        precision_date: 'decennie',
      };
    default:
      return { annee: null, mois: null, jour: null, precision_date: 'inconnue' };
  }
}

/**
 * Un fichier ne peut être revendiqué que par celui qui l’a déposé : le chemin
 * doit commencer par son identifiant. Sans cela, un membre pourrait rattacher
 * à son souvenir n’importe quel fichier du bucket.
 */
function verifierNouvellesPhotos(photos: PhotoValidee[], utilisateurId: string): string | null {
  for (const photo of photos) {
    if (photo.mediaId) continue;
    if (!photo.chemin.startsWith(`${utilisateurId}/`) || photo.chemin.includes('..')) {
      return 'Un des fichiers ne vous appartient pas.';
    }
    if (!TYPES_PHOTO.includes(photo.mime)) {
      return 'Un des fichiers n’est pas dans un format d’image accepté.';
    }
  }
  return null;
}

function premierMessage(erreur: z.ZodError): string {
  return erreur.issues[0]?.message ?? 'Formulaire incomplet.';
}

// ---------------------------------------------------------------------------
// Dépôt
// ---------------------------------------------------------------------------

export async function deposerSouvenir(
  _precedent: EtatSouvenir,
  donnees: FormData
): Promise<EtatSouvenir> {
  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Votre session a expiré. Reconnectez-vous.' };

  const analyse = analyser(donnees);
  if (!analyse.success) return { erreur: premierMessage(analyse.error) };
  const v = analyse.data;

  if (v.photos.length > 0) {
    const { data: autorise } = await supabase.rpc('peut_contribuer');
    if (autorise !== true) {
      return {
        erreur:
          'Le dépôt de photos est réservé aux contributeurs. Votre récit, lui, reste le bienvenu.',
      };
    }
    const souci = verifierNouvellesPhotos(v.photos, user.id);
    if (souci) return { erreur: souci };
  }

  const date = composerDate(v);

  const { data: souvenir, error } = await supabase
    .from('souvenirs')
    .insert({
      auteur_id: user.id,
      titre: v.titre,
      recit: v.recit,
      ...date,
      date_texte: v.dateTexte,
      lieu_id: v.lieuId,
      lieu_libre: v.lieuId ? null : v.lieuLibre,
    })
    .select('id')
    .single();

  if (error || !souvenir) {
    return { erreur: traduire(error?.message) };
  }

  const souci = await rattacher(supabase, souvenir.id, user.id, v, date);
  if (souci) {
    // Le récit, lui, est bien enregistré : il ne faut pas laisser croire l'inverse.
    revalidatePath('/souvenirs');
    return { erreur: `${souci} Le récit est enregistré : retrouvez-le sur le mur pour le compléter.` };
  }

  revalidatePath('/souvenirs');
  redirect(`/souvenirs/${souvenir.id}`);
}

// ---------------------------------------------------------------------------
// Modification
// ---------------------------------------------------------------------------

export async function modifierSouvenir(
  _precedent: EtatSouvenir,
  donnees: FormData
): Promise<EtatSouvenir> {
  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Votre session a expiré. Reconnectez-vous.' };

  const id = identifiant(donnees.get('id'));
  if (!id) return { erreur: 'Souvenir introuvable.' };

  const analyse = analyser(donnees);
  if (!analyse.success) return { erreur: premierMessage(analyse.error) };
  const v = analyse.data;

  const nouvelles = v.photos.filter((p) => !p.mediaId);
  if (nouvelles.length > 0) {
    const { data: autorise } = await supabase.rpc('peut_contribuer');
    if (autorise !== true) {
      return { erreur: 'Le dépôt de photos est réservé aux contributeurs.' };
    }
    const souci = verifierNouvellesPhotos(v.photos, user.id);
    if (souci) return { erreur: souci };
  }

  // Les photos conservées doivent déjà appartenir à ce souvenir : on ne
  // rattache pas un média venu d’ailleurs sur simple demande du formulaire.
  const { data: liens } = await supabase
    .from('souvenirs_medias')
    .select('media_id')
    .eq('souvenir_id', id);
  const dejaLiees = new Set((liens ?? []).map((l) => l.media_id));

  const conservees = v.photos.filter((p) => p.mediaId);
  if (conservees.some((p) => !dejaLiees.has(p.mediaId as string))) {
    return { erreur: 'Une des photos ne fait pas partie de ce souvenir.' };
  }

  const date = composerDate(v);

  // La politique RLS n’autorise cette mise à jour qu’à l’auteur ou à un admin :
  // si elle ne renvoie aucune ligne, c’est que le droit manque.
  const { data: modifie, error } = await supabase
    .from('souvenirs')
    .update({
      titre: v.titre,
      recit: v.recit,
      ...date,
      date_texte: v.dateTexte,
      lieu_id: v.lieuId,
      lieu_libre: v.lieuId ? null : v.lieuLibre,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return { erreur: traduire(error.message) };
  if (!modifie) return { erreur: 'Ce souvenir n’est pas le vôtre : vous ne pouvez pas le modifier.' };

  // Les rattachements sont réécrits en entier : plus sûr qu’une réconciliation.
  await supabase.from('souvenirs_personnes').delete().eq('souvenir_id', id);
  await supabase.from('souvenirs_medias').delete().eq('souvenir_id', id);

  const souci = await rattacher(supabase, id, user.id, v, date);
  if (souci) return { erreur: souci };

  // Les photos retirées n’ont plus de raison d’occuper le bucket.
  const gardees = new Set(conservees.map((p) => p.mediaId as string));
  const orphelines = [...dejaLiees].filter((mediaId) => !gardees.has(mediaId));
  if (orphelines.length > 0) await oublierMedias(supabase, orphelines);

  revalidatePath('/souvenirs');
  revalidatePath(`/souvenirs/${id}`);
  return { message: 'Souvenir mis à jour.' };
}

// ---------------------------------------------------------------------------
// Suppression, épinglage
// ---------------------------------------------------------------------------

export async function supprimerSouvenir(donnees: FormData): Promise<void> {
  const supabase = await creerClientServeur();
  const id = identifiant(donnees.get('id'));
  if (!id) return;

  const { data: liens } = await supabase
    .from('souvenirs_medias')
    .select('media_id')
    .eq('souvenir_id', id);

  // La suppression du souvenir emporte les rattachements (cascade), mais pas
  // les médias eux-mêmes : ils pourraient servir ailleurs.
  const { data: supprime } = await supabase
    .from('souvenirs')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (supprime) {
    const medias = (liens ?? []).map((l) => l.media_id);
    if (medias.length > 0) await oublierMedias(supabase, medias);
  }

  revalidatePath('/souvenirs');
  redirect('/souvenirs');
}

/** Mettre un souvenir en tête du mur est un acte de modération : réservé aux admins. */
export async function epinglerSouvenir(donnees: FormData): Promise<void> {
  const supabase = await creerClientServeur();
  const id = identifiant(donnees.get('id'));
  if (!id) return;

  const { data: autorise } = await supabase.rpc('est_admin');
  if (autorise !== true) return;

  await supabase
    .from('souvenirs')
    .update({ epingle: String(donnees.get('epingle')) === '1' })
    .eq('id', id);

  revalidatePath('/souvenirs');
  revalidatePath(`/souvenirs/${id}`);
}

// ---------------------------------------------------------------------------
// Commentaires
// ---------------------------------------------------------------------------

const schemaCommentaire = z.object({
  souvenirId: z.string().uuid('Souvenir introuvable.'),
  texte: z
    .string()
    .trim()
    .min(2, 'Écrivez quelques mots.')
    .max(4000, 'Ce commentaire est trop long.'),
});

export async function commenterSouvenir(
  _precedent: EtatSouvenir,
  donnees: FormData
): Promise<EtatSouvenir> {
  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Votre session a expiré. Reconnectez-vous.' };

  const analyse = schemaCommentaire.safeParse({
    souvenirId: String(donnees.get('souvenirId') ?? ''),
    texte: String(donnees.get('texte') ?? ''),
  });
  if (!analyse.success) return { erreur: premierMessage(analyse.error) };

  const { error } = await supabase.from('commentaires').insert({
    auteur_id: user.id,
    souvenir_id: analyse.data.souvenirId,
    texte: analyse.data.texte,
  });

  if (error) return { erreur: traduire(error.message) };

  revalidatePath(`/souvenirs/${analyse.data.souvenirId}`);
  return { message: 'Commentaire publié.' };
}

export async function supprimerCommentaire(donnees: FormData): Promise<void> {
  const supabase = await creerClientServeur();
  const id = identifiant(donnees.get('id'));
  const souvenirId = identifiant(donnees.get('souvenirId'));
  if (!id) return;

  await supabase.from('commentaires').delete().eq('id', id);
  if (souvenirId) revalidatePath(`/souvenirs/${souvenirId}`);
}

// ---------------------------------------------------------------------------
// Ficelle interne
// ---------------------------------------------------------------------------

type ClientServeur = Awaited<ReturnType<typeof creerClientServeur>>;

/**
 * Écrit les personnes mentionnées et les photos d’un souvenir.
 * Les identifiants des médias sont tirés ici : on connaît ainsi l’ordre sans
 * dépendre de celui que la base voudra bien renvoyer.
 */
async function rattacher(
  supabase: ClientServeur,
  souvenirId: string,
  utilisateurId: string,
  v: SouvenirValide,
  date: { annee: number | null; mois: number | null; jour: number | null }
): Promise<string | null> {
  const personnes = [...new Set(v.personnes)];
  if (personnes.length > 0) {
    const { error } = await supabase
      .from('souvenirs_personnes')
      .insert(personnes.map((personneId) => ({ souvenir_id: souvenirId, personne_id: personneId })));
    if (error) return 'Une des personnes mentionnées n’a pas pu être rattachée.';
  }

  if (v.photos.length === 0) return null;

  const liens: { souvenir_id: string; media_id: string; ordre: number }[] = [];
  const aCreer: {
    id: string;
    chemin: string;
    type: 'photo';
    titre: string | null;
    mime: string;
    taille_octets: number;
    largeur: number | null;
    hauteur: number | null;
    lieu_id: string | null;
    annee: number | null;
    mois: number | null;
    jour: number | null;
    depose_par: string;
  }[] = [];

  v.photos.forEach((photo, index) => {
    const mediaId = photo.mediaId ?? randomUUID();
    if (!photo.mediaId) {
      aCreer.push({
        id: mediaId,
        chemin: photo.chemin,
        type: 'photo',
        titre: photo.nom ?? null,
        mime: photo.mime,
        taille_octets: photo.taille,
        largeur: photo.largeur ?? null,
        hauteur: photo.hauteur ?? null,
        // La photo hérite du lieu et de la date du souvenir : c’est ce que la
        // galerie et la carte auront de plus juste à se mettre sous la dent.
        lieu_id: v.lieuId,
        annee: date.annee,
        mois: date.mois,
        jour: date.jour,
        depose_par: utilisateurId,
      });
    }
    liens.push({ souvenir_id: souvenirId, media_id: mediaId, ordre: index });
  });

  if (aCreer.length > 0) {
    const { error } = await supabase.from('medias').insert(aCreer);
    if (error) return 'Les photos n’ont pas pu être enregistrées.';
  }

  const { error } = await supabase.from('souvenirs_medias').insert(liens);
  if (error) return 'Les photos n’ont pas pu être reliées au souvenir.';

  return null;
}

/**
 * Retire des médias et leurs fichiers. Au mieux : si RLS refuse (le fichier
 * n’est pas le nôtre), on n’insiste pas, l’essentiel est déjà détaché.
 */
async function oublierMedias(supabase: ClientServeur, mediaIds: string[]): Promise<void> {
  const { data } = await supabase
    .from('medias')
    .delete()
    .in('id', mediaIds)
    .select('chemin');

  const chemins = (data ?? []).map((m) => m.chemin);
  if (chemins.length > 0) {
    await supabase.storage.from(BUCKET_MEDIAS).remove(chemins);
  }
}

/** Les messages de Postgres sont en anglais et parlent de contraintes. */
function traduire(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'Vous n’avez pas le droit d’écrire ceci.';
  }
  if (m.includes('duplicate key')) return 'Ce souvenir a déjà été enregistré.';
  if (m.includes('foreign key')) return 'Une des références indiquées n’existe pas.';
  return 'Une erreur est survenue. Réessayez dans un instant.';
}
