'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';

/**
 * Écriture de la grande Histoire.
 *
 * Toute saisie passe par zod avant d'atteindre la base, et l'écriture reste
 * soumise aux politiques RLS : un lecteur peut poster le formulaire, Postgres
 * le refusera. On se contente de traduire ce refus en français.
 */

export type EtatFait = { erreur?: string; message?: string };

const PORTEES = ['mondial', 'national', 'regional', 'local', 'familial'] as const;

const ANNEE_MIN = 1000;
const ANNEE_MAX = new Date().getFullYear() + 1;

const MOTIF_ANNEE = /^-?\d{1,4}$/;

/** Une case vide d'un formulaire vaut « non renseigné », pas « chaîne vide ». */
function texte(donnees: FormData, nom: string): string | undefined {
  const valeur = donnees.get(nom);
  if (typeof valeur !== 'string') return undefined;
  const propre = valeur.trim();
  return propre === '' ? undefined : propre;
}

/** N'accepte qu'une adresse web consultable : ni `javascript:`, ni `data:`. */
function estAdresseWeb(valeur: string): boolean {
  try {
    const url = new URL(valeur);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const annee = (role: string) =>
  z
    .string({ error: `L’année de ${role} est obligatoire.` })
    .regex(MOTIF_ANNEE, `L’année de ${role} doit être un nombre, par exemple 1962.`)
    .transform(Number)
    .refine(
      (valeur) => valeur >= ANNEE_MIN && valeur <= ANNEE_MAX,
      `L’année de ${role} doit être comprise entre ${ANNEE_MIN} et ${ANNEE_MAX}.`
    );

const schemaFait = z
  .object({
    titre: z
      .string({ error: 'Donnez un titre à ce fait.' })
      .min(3, 'Le titre doit faire au moins 3 caractères.')
      .max(200, 'Le titre ne doit pas dépasser 200 caractères.'),
    resume: z.string().max(400, 'Le résumé ne doit pas dépasser 400 caractères.').optional(),
    description: z
      .string()
      .max(20000, 'Le récit est trop long : 20 000 caractères au maximum.')
      .optional(),
    anneeDebut: annee('début'),
    anneeFin: annee('fin').optional(),
    lieu: z.string().max(200, 'Le lieu ne doit pas dépasser 200 caractères.').optional(),
    portee: z.enum(PORTEES, { error: 'Choisissez la portée de ce fait.' }),
    sourceUrl: z
      .string()
      .max(1000, 'L’adresse de la source est trop longue.')
      .refine(estAdresseWeb, 'L’adresse de la source doit commencer par http:// ou https://.')
      .optional(),
  })
  .refine((v) => v.anneeFin === undefined || v.anneeFin >= v.anneeDebut, {
    error: 'L’année de fin ne peut pas précéder l’année de début.',
    path: ['anneeFin'],
  });

/**
 * Verse un fait dans la grande Histoire, puis emmène son auteur sur sa fiche :
 * c'est là qu'il pourra dire qui, dans la famille, l'a traversé.
 */
export async function ajouterFait(_precedent: EtatFait, donnees: FormData): Promise<EtatFait> {
  const analyse = schemaFait.safeParse({
    titre: texte(donnees, 'titre'),
    resume: texte(donnees, 'resume'),
    description: texte(donnees, 'description'),
    anneeDebut: texte(donnees, 'anneeDebut'),
    anneeFin: texte(donnees, 'anneeFin'),
    lieu: texte(donnees, 'lieu'),
    portee: texte(donnees, 'portee'),
    sourceUrl: texte(donnees, 'sourceUrl'),
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Formulaire incomplet.' };
  }

  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erreur: 'Votre session a expiré. Reconnectez-vous pour verser un fait.' };
  }

  const { titre, resume, description, anneeDebut, anneeFin, lieu, portee, sourceUrl } = analyse.data;

  const { data, error } = await supabase
    .from('faits_historiques')
    .insert({
      titre,
      resume: resume ?? null,
      description: description ?? null,
      annee_debut: anneeDebut,
      annee_fin: anneeFin ?? null,
      lieu_libre: lieu ?? null,
      portee,
      source_url: sourceUrl ?? null,
      cree_par: user.id,
    })
    .select('id')
    .single();

  if (error) {
    return { erreur: traduireErreur(error) };
  }

  revalidatePath('/histoire');
  redirect(`/histoire/${data.id}`);
}

const schemaRattachement = z.object({
  faitId: z.uuid({ error: 'Fait introuvable.' }),
  personneId: z.uuid({ error: 'Choisissez la personne concernée.' }),
  incidence: z
    .string()
    .max(1000, 'L’incidence ne doit pas dépasser 1 000 caractères.')
    .optional(),
});

/**
 * Rattache une personne à un fait, avec ce que ce fait a changé pour elle.
 * Un rattachement déjà présent voit simplement son incidence réécrite.
 */
export async function rattacherPersonne(
  _precedent: EtatFait,
  donnees: FormData
): Promise<EtatFait> {
  const analyse = schemaRattachement.safeParse({
    faitId: texte(donnees, 'faitId'),
    personneId: texte(donnees, 'personneId'),
    incidence: texte(donnees, 'incidence'),
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Rattachement incomplet.' };
  }

  const { faitId, personneId, incidence } = analyse.data;
  const supabase = await creerClientServeur();

  const { error } = await supabase
    .from('faits_personnes')
    .upsert(
      { fait_id: faitId, personne_id: personneId, incidence: incidence ?? null },
      { onConflict: 'fait_id,personne_id' }
    );

  if (error) {
    return { erreur: traduireErreur(error) };
  }

  revalidatePath(`/histoire/${faitId}`);
  revalidatePath('/histoire');
  return { message: 'Rattachement enregistré.' };
}

const schemaDetachement = z.object({
  faitId: z.uuid({ error: 'Fait introuvable.' }),
  personneId: z.uuid({ error: 'Personne introuvable.' }),
});

/** Défait un rattachement : le fait et la personne restent, seul le lien tombe. */
export async function detacherPersonne(
  _precedent: EtatFait,
  donnees: FormData
): Promise<EtatFait> {
  const analyse = schemaDetachement.safeParse({
    faitId: texte(donnees, 'faitId'),
    personneId: texte(donnees, 'personneId'),
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Demande incomplète.' };
  }

  const { faitId, personneId } = analyse.data;
  const supabase = await creerClientServeur();

  const { error } = await supabase
    .from('faits_personnes')
    .delete()
    .eq('fait_id', faitId)
    .eq('personne_id', personneId);

  if (error) {
    return { erreur: traduireErreur(error) };
  }

  revalidatePath(`/histoire/${faitId}`);
  revalidatePath('/histoire');
  return { message: 'Rattachement retiré.' };
}

/** Les refus de Postgres sont en anglais et parlent de politiques : on traduit. */
function traduireErreur(erreur: { code?: string; message?: string }): string {
  const code = erreur.code ?? '';
  const message = (erreur.message ?? '').toLowerCase();

  if (code === '42501' || message.includes('row-level security')) {
    return 'Seuls les contributeurs et les administrateurs peuvent enrichir la grande Histoire.';
  }
  // Deux unicités peuvent lever un 23505 : le rattachement d'une personne déjà
  // liée, et un fait portant le même titre la même année. Postgres nomme la
  // contrainte fautive dans son message, ce qui permet de dire laquelle.
  if (code === '23505') {
    if (message.includes('faits_historiques_titre_annee')) {
      return 'Un fait porte déjà ce titre pour cette année. Ouvrez-le plutôt que d’en créer un second : les personnes rattachées à l’un ne le seraient pas à l’autre.';
    }
    return 'Cette personne est déjà rattachée à ce fait.';
  }
  if (code === '23503') return 'Le fait ou la personne visés n’existent plus.';
  if (code === '42P01' || code === 'PGRST205') {
    return 'La grande Histoire n’est pas encore installée en base. Prévenez un administrateur.';
  }
  return 'L’enregistrement a échoué. Réessayez dans un instant.';
}
