'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';
import { formaterDate } from '@/lib/arbre';
import {
  NOMBRE_MAX_FICHIERS,
  TAILLE_MAX_FICHIER,
  TYPES_FICHIER_ACTE,
  VALEURS_NIVEAU_PREUVE_ACTE,
  VALEURS_TYPE_ACTE,
  libelleTypeActe,
  typeEvenementActe,
} from '@/lib/actes-partage';
import { BUCKET_MEDIAS } from '@/lib/souvenirs-partage';
import {
  ANNEE_MIN,
  VALEURS_PRECISION,
  VALEURS_QUALIFICATIF,
  anneeMax,
  colonnesDate,
  dateReelle,
} from '@/lib/saisie-personne';
import type { NiveauPreuve } from '@/lib/types-base';

/**
 * Versement d'un acte par un membre de la famille.
 *
 * Lieu → événement → source (transcription) → scan dans le bucket privé.
 * Le droit d'écrire est arbitré par les politiques RLS ; on se contente de
 * traduire leur refus.
 */

export type EtatActe = { erreur?: string; message?: string };

type ClientServeur = Awaited<ReturnType<typeof creerClientServeur>>;

const schemaFichier = z.object({
  chemin: z.string().trim().min(1).max(400),
  nom: z.string().trim().max(200).nullable().optional(),
  mime: z.string().trim().max(120),
  taille: z.number().int().min(0).max(TAILLE_MAX_FICHIER),
  largeur: z.number().int().positive().max(30000).nullable().optional(),
  hauteur: z.number().int().positive().max(30000).nullable().optional(),
});

const schemaActe = z
  .object({
    personneId: z.uuid('Cette fiche n’existe pas.'),
    typeActe: z.enum(VALEURS_TYPE_ACTE, 'Ce type d’acte n’existe pas.'),
    qualificatif: z.enum(VALEURS_QUALIFICATIF).default('exacte'),
    precision: z.enum(VALEURS_PRECISION).default('inconnue'),
    annee: z.coerce.number().int().min(ANNEE_MIN).max(anneeMax()).optional(),
    mois: z.coerce.number().int().min(1).max(12).optional(),
    jour: z.coerce.number().int().min(1).max(31).optional(),
    lieu: z.string().trim().max(200).optional(),
    cote: z.string().trim().max(200).optional(),
    depot: z.string().trim().max(200).optional(),
    transcription: z.string().trim().max(50000).optional(),
    niveauPreuve: z.enum(VALEURS_NIVEAU_PREUVE_ACTE, 'Ce niveau de preuve n’existe pas.'),
    fichiers: z.array(schemaFichier).max(NOMBRE_MAX_FICHIERS),
  })
  .superRefine((v, ctx) => {
    const manque = (message: string) => ctx.addIssue({ code: 'custom', message });

    if (v.precision !== 'inconnue' && v.annee === undefined) {
      manque('Indiquez au moins l’année de l’acte, ou choisissez « rien de sûr ».');
    }
    if ((v.precision === 'mois' || v.precision === 'jour') && v.mois === undefined) {
      manque('Indiquez le mois de l’acte.');
    }
    if (v.precision === 'jour' && v.jour === undefined) {
      manque('Indiquez le jour de l’acte.');
    }
    if (
      v.precision === 'jour' &&
      v.annee !== undefined &&
      v.mois !== undefined &&
      v.jour !== undefined &&
      !dateReelle(v.annee, v.mois, v.jour)
    ) {
      manque('Cette date n’a jamais existé.');
    }

    const aScan = v.fichiers.length > 0;
    const aTranscription = (v.transcription?.length ?? 0) >= 10;
    const aCote = (v.cote?.length ?? 0) > 0;
    if (!aScan && !aTranscription && !aCote) {
      manque(
        'Joignez le scan, recopiez au moins quelques lignes de l’acte, ou indiquez sa cote.'
      );
    }
  });

type ActeValide = z.infer<typeof schemaActe>;

function champ(donnees: FormData, nom: string): string | undefined {
  const valeur = donnees.get(nom);
  if (typeof valeur !== 'string') return undefined;
  const propre = valeur.trim();
  return propre === '' ? undefined : propre;
}

function lireFichiers(valeur: FormDataEntryValue | null): unknown {
  if (typeof valeur !== 'string' || valeur.trim() === '') return [];
  try {
    return JSON.parse(valeur);
  } catch {
    return null;
  }
}

function analyser(donnees: FormData) {
  return schemaActe.safeParse({
    personneId: champ(donnees, 'personneId'),
    typeActe: champ(donnees, 'typeActe'),
    qualificatif: champ(donnees, 'acteQualificatif'),
    precision: champ(donnees, 'actePrecision'),
    annee: champ(donnees, 'acteAnnee'),
    mois: champ(donnees, 'acteMois'),
    jour: champ(donnees, 'acteJour'),
    lieu: champ(donnees, 'acteLieu'),
    cote: champ(donnees, 'cote'),
    depot: champ(donnees, 'depot'),
    transcription: champ(donnees, 'transcription'),
    niveauPreuve: champ(donnees, 'niveauPreuve'),
    fichiers: lireFichiers(donnees.get('fichiers')),
  });
}

function premierMessage(erreur: z.ZodError): string {
  return erreur.issues[0]?.message ?? 'Formulaire incomplet.';
}

function memeLieu(a: string, b: string): boolean {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' }) === 0;
}

async function resoudreLieu(
  supabase: ClientServeur,
  libelle: string | undefined
): Promise<{ id: string | null; erreur?: string }> {
  if (!libelle) return { id: null };

  const { data, error } = await supabase.from('lieux').select('id, libelle');
  if (error) return { id: null, erreur: traduire(error.message) };

  const connu = (data ?? []).find((l) => memeLieu(l.libelle, libelle));
  if (connu) return { id: connu.id };

  const { data: cree, error: erreurCreation } = await supabase
    .from('lieux')
    .insert({ libelle })
    .select('id')
    .single();

  if (erreurCreation || !cree) {
    return { id: null, erreur: `Le lieu « ${libelle} » n’a pas pu être ajouté.` };
  }
  return { id: cree.id };
}

function verifierFichiers(
  fichiers: ActeValide['fichiers'],
  utilisateurId: string
): string | null {
  for (const fichier of fichiers) {
    if (!fichier.chemin.startsWith(`${utilisateurId}/`) || fichier.chemin.includes('..')) {
      return 'Un des fichiers ne vous appartient pas.';
    }
    if (!TYPES_FICHIER_ACTE.includes(fichier.mime as (typeof TYPES_FICHIER_ACTE)[number])) {
      return 'Un des fichiers n’est pas au format accepté (image ou PDF).';
    }
  }
  return null;
}

function notesEvenement(v: ActeValide): string | null {
  const morceaux = [
    v.cote ? `Cote : ${v.cote}.` : null,
    v.depot ? `Dépôt : ${v.depot}.` : null,
  ].filter(Boolean);
  return morceaux.length > 0 ? morceaux.join(' ') : null;
}

function texteSource(v: ActeValide): string | null {
  if (v.transcription) return v.transcription;
  if (v.cote || v.depot) {
    return `${libelleTypeActe(v.typeActe)}, cote ${v.cote ?? '(à préciser)'}, ${v.depot ?? '(dépôt à préciser)'}.`;
  }
  return null;
}

function pageSource(v: ActeValide): string | null {
  const morceaux = [v.cote, v.depot].filter(Boolean);
  return morceaux.length > 0 ? morceaux.join(' — ') : null;
}

export async function deposerActe(
  _precedent: EtatActe,
  donnees: FormData
): Promise<EtatActe> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Votre session a expiré. Reconnectez-vous.' };

  const { data: autorise } = await supabase.rpc('peut_contribuer');
  if (autorise !== true) {
    return {
      erreur:
        'Le versement d’actes est réservé aux contributeurs. Demandez à un administrateur d’ouvrir votre accès.',
    };
  }

  const analyse = analyser(donnees);
  if (!analyse.success) return { erreur: premierMessage(analyse.error) };
  const v = analyse.data;

  if (v.fichiers.length > 0) {
    const souci = verifierFichiers(v.fichiers, user.id);
    if (souci) return { erreur: souci };
  }

  const { data: personne } = await supabase
    .from('personnes')
    .select('id')
    .eq('id', v.personneId)
    .maybeSingle();
  if (!personne) {
    return { erreur: 'Cette fiche n’existe pas, ou la base vous refuse d’y écrire.' };
  }

  const lieu = await resoudreLieu(supabase, v.lieu);
  if (lieu.erreur) return { erreur: lieu.erreur };

  const dateColonnes = colonnesDate({
    qualificatif: v.qualificatif,
    precision: v.precision,
    annee: v.annee ?? null,
    mois: v.mois ?? null,
    jour: v.jour ?? null,
  });

  const dateTexte =
    v.precision === 'inconnue'
      ? null
      : formaterDate({
          annee: dateColonnes.annee,
          mois: dateColonnes.mois,
          jour: dateColonnes.jour,
          qualificatif: dateColonnes.qualificatif,
        }) || null;

  const { data: evenement, error: erreurEvenement } = await supabase
    .from('evenements')
    .insert({
      personne_id: v.personneId,
      type: typeEvenementActe(v.typeActe),
      date_texte: dateTexte,
      ...dateColonnes,
      lieu_id: lieu.id,
      niveau_preuve: v.niveauPreuve as NiveauPreuve,
      notes: notesEvenement(v),
      cree_par: user.id,
    })
    .select('id')
    .single();

  if (erreurEvenement || !evenement) {
    return { erreur: traduire(erreurEvenement?.message) };
  }

  const transcription = texteSource(v);
  if (transcription) {
    const { error: erreurSource } = await supabase.from('sources').insert({
      personne_id: v.personneId,
      evenement_id: evenement.id,
      titre: libelleTypeActe(v.typeActe),
      texte: transcription,
      page: pageSource(v),
      cote: v.cote ?? null,
      depot: v.depot ?? null,
      niveau_preuve: v.niveauPreuve as NiveauPreuve,
      cree_par: user.id,
    });
    if (erreurSource) {
      return {
        erreur: `L’événement est enregistré, mais la transcription n’a pas pu être ajoutée. ${traduire(erreurSource.message)}`,
      };
    }
  }

  if (v.fichiers.length > 0) {
    const souci = await rattacherScans(
      supabase,
      v.personneId,
      user.id,
      v,
      dateColonnes,
      dateTexte,
      lieu.id
    );
    if (souci) {
      revalidatePath(`/personne/${v.personneId}`);
      return {
        erreur: `${souci} L’acte est tout de même enregistré sur la fiche : vous pourrez joindre le scan plus tard.`,
      };
    }
  }

  revalidatePath(`/personne/${v.personneId}`);
  redirect(`/personne/${v.personneId}`);
}

async function rattacherScans(
  supabase: ClientServeur,
  personneId: string,
  utilisateurId: string,
  v: ActeValide,
  date: ReturnType<typeof colonnesDate>,
  dateTexte: string | null,
  lieuId: string | null
): Promise<string | null> {
  const medias = v.fichiers.map((fichier) => ({
    id: randomUUID(),
    chemin: fichier.chemin,
    type: 'acte' as const,
    titre: `${libelleTypeActe(v.typeActe)}${dateTexte ? `, ${dateTexte}` : ''}`,
    description: v.cote ? `Cote ${v.cote}` : null,
    mime: fichier.mime,
    taille_octets: fichier.taille,
    largeur: fichier.largeur ?? null,
    hauteur: fichier.hauteur ?? null,
    annee: date.annee,
    mois: date.mois,
    jour: date.jour,
    date_texte: dateTexte,
    lieu_id: lieuId,
    cote: v.cote ?? null,
    depot: v.depot ?? null,
    transcription: v.transcription ?? null,
    depose_par: utilisateurId,
  }));

  const { error: erreurMedias } = await supabase.from('medias').insert(medias);
  if (erreurMedias) return 'Le scan n’a pas pu être enregistré.';

  const { error: erreurLiens } = await supabase.from('medias_personnes').insert(
    medias.map((m) => ({
      media_id: m.id,
      personne_id: personneId,
      role: 'sujet',
    }))
  );
  if (erreurLiens) {
    await supabase.storage.from(BUCKET_MEDIAS).remove(medias.map((m) => m.chemin));
    await supabase.from('medias').delete().in(
      'id',
      medias.map((m) => m.id)
    );
    return 'Le scan n’a pas pu être rattaché à la fiche.';
  }

  return null;
}

function traduire(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'Vous n’avez pas le droit d’écrire sur cette fiche.';
  }
  if (m.includes('duplicate key')) return 'Cet acte semble déjà versé.';
  if (m.includes('foreign key')) return 'Une des références indiquées n’existe pas.';
  return 'Une erreur est survenue. Réessayez dans un instant.';
}
