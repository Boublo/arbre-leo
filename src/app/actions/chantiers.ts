'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';
import type { StatutChantier } from '@/lib/types-base';
import { BRANCHE_PATERNELLE, BRANCHE_MATERNELLE } from '@/lib/branches';

/**
 * Les trois gestes de l'enquête généalogique.
 *
 * Un chantier, c'est une demande d'acte partie vers une mairie, une branche qui
 * bute sur un ancêtre sans parents connus, une hypothèse qui attend sa preuve.
 * Il s'ouvre, il se déplace d'une colonne à l'autre, et le jour où la réponse
 * arrive on consigne ce qu'elle a donné — c'est cette dernière ligne qui fait
 * la valeur du tableau, des années après.
 *
 * Le droit d'écrire n'est pas décidé ici : les politiques RLS de Postgres en
 * jugent. On se contente de traduire leur refus en une phrase compréhensible.
 */

export type EtatChantier = {
  erreur?: string;
  message?: string;
  /**
   * Ce que le formulaire portait au moment de l'envoi. React vide les champs
   * non contrôlés après chaque soumission : sans ce renvoi, une faute de frappe
   * dans le titre effacerait les dix autres champs.
   */
  saisie?: Record<string, string>;
};

/** Relit le formulaire pour pouvoir le rendre tel quel en cas de refus. */
function relire(donnees: FormData): Record<string, string> {
  const saisie: Record<string, string> = {};
  for (const [nom, valeur] of donnees.entries()) {
    if (typeof valeur === 'string' && valeur !== '') saisie[nom] = valeur;
  }
  return saisie;
}

const STATUTS = ['a_faire', 'en_cours', 'en_attente_reponse', 'aboutie', 'abandonnee'] as const;

// Les identifiants de branche viennent des fichiers GEDCOM d'origine : ils sont
// déclarés en configuration plutôt qu'écrits ici, ce dépôt étant public.
const BRANCHES = [BRANCHE_PATERNELLE, BRANCHE_MATERNELLE] as const;

/** Une date de formulaire : « 2026-03-12 ». */
const JOUR = /^\d{4}-\d{2}-\d{2}$/;

/** Le jour même, au format de la colonne `date` de Postgres. */
function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Un champ laissé vide vaut « non renseigné », pas « chaîne vide ». */
function champ(donnees: FormData, nom: string): string | undefined {
  const valeur = donnees.get(nom);
  if (typeof valeur !== 'string') return undefined;
  const propre = valeur.trim();
  return propre === '' ? undefined : propre;
}

// ---------------------------------------------------------------------------
// Ouvrir un chantier
// ---------------------------------------------------------------------------

const schemaOuverture = z.object({
  titre: z
    .string()
    .trim()
    .min(3, 'Donnez au chantier un titre un peu plus explicite.')
    .max(160, 'Le titre dépasse 160 caractères.'),
  objectif: z.string().trim().max(2000, 'L’objectif est trop long.').optional(),
  branche: z.enum(BRANCHES, 'Cette branche n’existe pas.').optional(),
  personneId: z.uuid('Cette personne n’est pas dans l’arbre.').optional(),
  organisme: z.string().trim().max(200, 'Le nom de l’organisme est trop long.').optional(),
  reference: z.string().trim().max(300, 'La référence est trop longue.').optional(),
  statut: z.enum(STATUTS, 'Ce statut n’existe pas.').default('a_faire'),
  blocage: z.string().trim().max(2000, 'La description du blocage est trop longue.').optional(),
  priorite: z.coerce
    .number('La priorité va de 1 à 5.')
    .int('La priorité va de 1 à 5.')
    .min(1, 'La priorité va de 1 à 5.')
    .max(5, 'La priorité va de 1 à 5.')
    .default(3),
  assigneA: z.uuid('Ce membre n’existe pas.').optional(),
  demandeLe: z.string().regex(JOUR, 'La date d’envoi de la demande n’est pas valide.').optional(),
});

export async function ouvrirChantier(
  _precedent: EtatChantier,
  donnees: FormData
): Promise<EtatChantier> {
  const analyse = schemaOuverture.safeParse({
    titre: champ(donnees, 'titre'),
    objectif: champ(donnees, 'objectif'),
    branche: champ(donnees, 'branche'),
    personneId: champ(donnees, 'personneId'),
    organisme: champ(donnees, 'organisme'),
    reference: champ(donnees, 'reference'),
    statut: champ(donnees, 'statut'),
    blocage: champ(donnees, 'blocage'),
    priorite: champ(donnees, 'priorite'),
    assigneA: champ(donnees, 'assigneA'),
    demandeLe: champ(donnees, 'demandeLe'),
  });

  if (!analyse.success) {
    return {
      erreur: analyse.error.issues[0]?.message ?? 'Le formulaire est incomplet.',
      saisie: relire(donnees),
    };
  }

  const c = analyse.data;
  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      erreur: 'Votre session a expiré. Reconnectez-vous pour ouvrir un chantier.',
      saisie: relire(donnees),
    };
  }

  const { error } = await supabase.from('chantiers_recherche').insert({
    titre: c.titre,
    objectif: c.objectif ?? null,
    branche: c.branche ?? null,
    personne_id: c.personneId ?? null,
    organisme: c.organisme ?? null,
    reference: c.reference ?? null,
    statut: c.statut,
    blocage: c.blocage ?? null,
    priorite: c.priorite,
    assigne_a: c.assigneA ?? null,
    // Un chantier déclaré d'emblée « en attente d'une réponse » sans date
    // d'envoi ne serait jamais relancé : on date la demande du jour.
    demande_le: c.demandeLe ?? (c.statut === 'en_attente_reponse' ? aujourdhui() : null),
    cree_par: user.id,
  });

  if (error) return { erreur: traduireErreur(error.message), saisie: relire(donnees) };

  revalidatePath('/recherches');
  return { message: 'Le chantier est ouvert.' };
}

// ---------------------------------------------------------------------------
// Déplacer un chantier d'une colonne à l'autre
// ---------------------------------------------------------------------------

const schemaStatut = z.object({
  id: z.uuid('Ce chantier n’existe pas.'),
  statut: z.enum(STATUTS, 'Ce statut n’existe pas.'),
});

export async function changerStatutChantier(
  _precedent: EtatChantier,
  donnees: FormData
): Promise<EtatChantier> {
  const analyse = schemaStatut.safeParse({
    id: champ(donnees, 'id'),
    statut: champ(donnees, 'statut'),
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Déplacement impossible.' };
  }

  const { id, statut } = analyse.data;
  const supabase = await creerClientServeur();

  const { data: avant, error: erreurLecture } = await supabase
    .from('chantiers_recherche')
    .select('statut, demande_le, reponse_le')
    .eq('id', id)
    .maybeSingle();

  if (erreurLecture) return { erreur: traduireErreur(erreurLecture.message) };
  if (!avant) return { erreur: 'Ce chantier n’est plus accessible.' };
  if (avant.statut === statut) return {};

  const modifications: {
    statut: typeof statut;
    demande_le?: string;
    reponse_le?: string;
  } = { statut };

  // Les deux dates qui comptent se déduisent du mouvement : on évite ainsi
  // qu'un chantier attende sans qu'on sache depuis quand.
  if (statut === 'en_attente_reponse' && !avant.demande_le) {
    modifications.demande_le = aujourdhui();
  }
  if ((statut === 'aboutie' || statut === 'abandonnee') && !avant.reponse_le) {
    modifications.reponse_le = aujourdhui();
  }

  const { error } = await supabase
    .from('chantiers_recherche')
    .update(modifications)
    .eq('id', id);

  if (error) return { erreur: traduireErreur(error.message) };

  revalidatePath('/recherches');
  return { message: 'Chantier déplacé.' };
}

// ---------------------------------------------------------------------------
// Consigner le résultat
// ---------------------------------------------------------------------------

const schemaResultat = z.object({
  id: z.uuid('Ce chantier n’existe pas.'),
  resultat: z
    .string()
    .trim()
    .min(3, 'Dites en quelques mots ce que la réponse a donné.')
    .max(4000, 'Le résultat dépasse 4000 caractères.'),
  clore: z.boolean(),
});

export async function consignerResultat(
  _precedent: EtatChantier,
  donnees: FormData
): Promise<EtatChantier> {
  const analyse = schemaResultat.safeParse({
    id: champ(donnees, 'id'),
    resultat: champ(donnees, 'resultat'),
    clore: donnees.get('clore') !== null,
  });

  if (!analyse.success) {
    return {
      erreur: analyse.error.issues[0]?.message ?? 'Enregistrement impossible.',
      saisie: relire(donnees),
    };
  }

  const { id, resultat, clore } = analyse.data;
  const supabase = await creerClientServeur();

  const { data: avant, error: erreurLecture } = await supabase
    .from('chantiers_recherche')
    .select('statut, reponse_le')
    .eq('id', id)
    .maybeSingle();

  if (erreurLecture) {
    return { erreur: traduireErreur(erreurLecture.message), saisie: relire(donnees) };
  }
  if (!avant) return { erreur: 'Ce chantier n’est plus accessible.' };

  const modifications: { resultat: string; reponse_le: string; statut?: StatutChantier } = {
    resultat,
    reponse_le: avant.reponse_le ?? aujourdhui(),
  };
  if (clore) modifications.statut = 'aboutie';

  const { error } = await supabase
    .from('chantiers_recherche')
    .update(modifications)
    .eq('id', id);

  if (error) return { erreur: traduireErreur(error.message), saisie: relire(donnees) };

  revalidatePath('/recherches');
  return { message: clore ? 'Résultat consigné, chantier abouti.' : 'Résultat consigné.' };
}

// ---------------------------------------------------------------------------

/** Les messages de Postgres et de PostgREST sont en anglais : on les traduit. */
function traduireErreur(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'Vous n’avez pas le droit de modifier les chantiers. Demandez à un administrateur de vous passer contributeur.';
  }
  if (m.includes('does not exist') || m.includes('schema cache')) {
    return 'Le tableau des chantiers n’est pas encore installé dans la base.';
  }
  if (m.includes('violates foreign key')) {
    return 'La personne ou le membre indiqué n’existe pas dans la base.';
  }
  if (m.includes('jwt') || m.includes('expired')) {
    return 'Votre session a expiré. Reconnectez-vous.';
  }
  return 'L’enregistrement a échoué. Réessayez dans un instant.';
}
