'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';

/**
 * Écriture des récits — Server Actions.
 *
 * Trois règles portent tout :
 *  - `auteur_id` vaut toujours l'utilisateur courant, jamais ce qu'apporte le
 *    formulaire ;
 *  - le droit de créer, modifier, supprimer, épingler est arbitré par les
 *    politiques RLS du schéma « arbre » — on lit leur verdict plutôt que de
 *    recopier leur logique ;
 *  - un récit se rattache à un patronyme OU à un thème, jamais aux deux.
 */

export type EtatRecit = { erreur?: string; message?: string };

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ANNEE_MIN = 1500;
const anneeMax = () => new Date().getFullYear();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schemaRecit = z
  .object({
    patronyme: z.string().trim().max(120).nullable(),
    theme: z.string().trim().max(160).nullable(),
    branche: z.string().trim().max(60).nullable(),
    titre: z
      .string()
      .trim()
      .min(3, 'Donnez un titre d’au moins trois caractères.')
      .max(160, 'Ce titre est trop long : cent soixante caractères au plus.'),
    chapeau: z.string().trim().max(400).nullable(),
    corps: z
      .string()
      .trim()
      .min(20, 'Un récit tient sur davantage que deux phrases.')
      .max(40000, 'Ce récit dépasse la longueur permise.'),
    anneeDebut: z
      .number()
      .int()
      .min(ANNEE_MIN, `Rien avant ${ANNEE_MIN}.`)
      .max(anneeMax(), 'Cette année n’est pas encore arrivée.')
      .nullable(),
    anneeFin: z
      .number()
      .int()
      .min(ANNEE_MIN, `Rien avant ${ANNEE_MIN}.`)
      .max(anneeMax(), 'Cette année n’est pas encore arrivée.')
      .nullable(),
    personnes: z.array(z.string().uuid()).max(80, 'Trop de personnes citées.'),
  })
  .superRefine((v, ctx) => {
    if (!v.patronyme && !v.theme) {
      ctx.addIssue({
        code: 'custom',
        path: ['patronyme'],
        message: 'Choisissez une famille ou saisissez un thème.',
      });
    }
    if (v.patronyme && v.theme) {
      ctx.addIssue({
        code: 'custom',
        path: ['theme'],
        message: 'Un récit se rattache à une famille ou à un thème, pas aux deux.',
      });
    }
    if (v.anneeDebut !== null && v.anneeFin !== null && v.anneeFin < v.anneeDebut) {
      ctx.addIssue({
        code: 'custom',
        path: ['anneeFin'],
        message: 'L’année de fin est antérieure à celle de début.',
      });
    }
  });

function texte(valeur: FormDataEntryValue | null): string | null {
  const brut = String(valeur ?? '').trim();
  return brut === '' ? null : brut;
}

function entier(valeur: FormDataEntryValue | null): number | null {
  const brut = texte(valeur);
  if (brut === null) return null;
  const nombre = Number(brut);
  return Number.isFinite(nombre) ? Math.trunc(nombre) : null;
}

function identifiant(valeur: FormDataEntryValue | null): string | null {
  const brut = texte(valeur);
  return brut !== null && UUID.test(brut) ? brut : null;
}

function analyser(donnees: FormData) {
  return schemaRecit.safeParse({
    patronyme: texte(donnees.get('patronyme')),
    theme: texte(donnees.get('theme')),
    branche: texte(donnees.get('branche')),
    titre: String(donnees.get('titre') ?? ''),
    chapeau: texte(donnees.get('chapeau')),
    corps: String(donnees.get('corps') ?? ''),
    anneeDebut: entier(donnees.get('anneeDebut')),
    anneeFin: entier(donnees.get('anneeFin')),
    personnes: donnees.getAll('personnes').map((v) => String(v)),
  });
}

function premierMessage(erreur: z.ZodError): string {
  return erreur.issues[0]?.message ?? 'Formulaire incomplet.';
}

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

export async function creerRecit(
  _precedent: EtatRecit,
  donnees: FormData
): Promise<EtatRecit> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Votre session a expiré. Reconnectez-vous.' };

  // L'écriture est réservée aux contributeurs ; les lecteurs restent bienvenus
  // sur le mur.
  const { data: autorise } = await supabase.rpc('peut_contribuer');
  if (autorise !== true) {
    return {
      erreur:
        'L’écriture de récits est réservée aux contributeurs. Demandez à un administrateur si besoin.',
    };
  }

  const analyse = analyser(donnees);
  if (!analyse.success) return { erreur: premierMessage(analyse.error) };
  const v = analyse.data;

  const { data: recit, error } = await supabase
    .from('recits')
    .insert({
      auteur_id: user.id,
      patronyme: v.patronyme,
      theme: v.theme,
      branche: v.branche,
      titre: v.titre,
      chapeau: v.chapeau,
      corps: v.corps,
      annee_debut: v.anneeDebut,
      annee_fin: v.anneeFin,
    })
    .select('id')
    .single();

  if (error || !recit) return { erreur: traduire(error?.message) };

  const souci = await rattacherPersonnes(supabase, recit.id, v.personnes);
  if (souci) {
    revalidatePath('/recits');
    return {
      erreur: `${souci} Le récit est enregistré : vous pouvez le retrouver et le compléter.`,
    };
  }

  revalidatePath('/recits');
  redirect(`/recits/${recit.id}`);
}

// ---------------------------------------------------------------------------
// Modification
// ---------------------------------------------------------------------------

export async function modifierRecit(
  _precedent: EtatRecit,
  donnees: FormData
): Promise<EtatRecit> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Votre session a expiré. Reconnectez-vous.' };

  const id = identifiant(donnees.get('id'));
  if (!id) return { erreur: 'Récit introuvable.' };

  const analyse = analyser(donnees);
  if (!analyse.success) return { erreur: premierMessage(analyse.error) };
  const v = analyse.data;

  const { data: modifie, error } = await supabase
    .from('recits')
    .update({
      patronyme: v.patronyme,
      theme: v.theme,
      branche: v.branche,
      titre: v.titre,
      chapeau: v.chapeau,
      corps: v.corps,
      annee_debut: v.anneeDebut,
      annee_fin: v.anneeFin,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return { erreur: traduire(error.message) };
  if (!modifie) {
    return { erreur: 'Ce récit n’est pas le vôtre : vous ne pouvez pas le modifier.' };
  }

  // On réécrit d'un bloc les rattachements plutôt que de réconcilier : plus
  // sûr, et sans surcoût à cette échelle.
  await supabase.from('recits_personnes').delete().eq('recit_id', id);
  const souci = await rattacherPersonnes(supabase, id, v.personnes);
  if (souci) return { erreur: souci };

  revalidatePath('/recits');
  revalidatePath(`/recits/${id}`);
  redirect(`/recits/${id}`);
}

// ---------------------------------------------------------------------------
// Suppression, épinglage
// ---------------------------------------------------------------------------

export async function supprimerRecit(donnees: FormData): Promise<void> {
  const supabase = await creerClientServeur();
  const id = identifiant(donnees.get('id'));
  if (!id) return;

  // La cascade sur `recits_personnes` est portée par la contrainte de clé
  // étrangère : on supprime seulement le récit.
  await supabase.from('recits').delete().eq('id', id);

  revalidatePath('/recits');
  redirect('/recits');
}

export async function epinglerRecit(donnees: FormData): Promise<void> {
  const supabase = await creerClientServeur();
  const id = identifiant(donnees.get('id'));
  if (!id) return;

  const { data: autorise } = await supabase.rpc('est_admin');
  if (autorise !== true) return;

  await supabase
    .from('recits')
    .update({ epingle: String(donnees.get('epingle')) === '1' })
    .eq('id', id);

  revalidatePath('/recits');
  revalidatePath(`/recits/${id}`);
}

// ---------------------------------------------------------------------------
// Ficelle interne
// ---------------------------------------------------------------------------

type ClientServeur = Awaited<ReturnType<typeof creerClientServeur>>;

async function rattacherPersonnes(
  supabase: ClientServeur,
  recitId: string,
  personnes: string[]
): Promise<string | null> {
  const uniques = [...new Set(personnes)];
  if (uniques.length === 0) return null;

  const { error } = await supabase
    .from('recits_personnes')
    .insert(uniques.map((personneId) => ({ recit_id: recitId, personne_id: personneId })));

  if (error) return 'Une des personnes citées n’a pas pu être rattachée.';
  return null;
}

function traduire(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'Vous n’avez pas le droit d’écrire ceci.';
  }
  if (m.includes('duplicate key')) return 'Ce récit a déjà été enregistré.';
  if (m.includes('foreign key')) return 'Une des références indiquées n’existe pas.';
  return 'Une erreur est survenue. Réessayez dans un instant.';
}
