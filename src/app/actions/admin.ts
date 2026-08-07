'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { exigerAdmin } from '@/app/admin/garde';

/**
 * Les décisions de l'administrateur.
 *
 * Chacune de ces actions commence par `exigerAdmin()` : une Server Action est
 * une adresse comme une autre, appelable sans passer par la page. Le contrôle
 * est donc refait ici, et non hérité de l'affichage.
 *
 * Toute saisie est relue par zod avant d'atteindre la base, et les erreurs que
 * la base renvoie sont retraduites en français (voir `traduireErreurBase`).
 */

export type EtatAdmin = { erreur?: string; message?: string };

const identifiantMembre = z.uuid('Ce membre est introuvable.');
const identifiantPersonne = z.uuid('Cette fiche est introuvable.');
const role = z.enum(['lecteur', 'contributeur', 'admin']);

// ---------------------------------------------------------------------------
// Demandes d'accès
// ---------------------------------------------------------------------------

const schemaValidation = z.object({ membreId: identifiantMembre, role });

/** Ouvre l'accès à un demandeur, avec le rôle que l'administrateur lui accorde. */
export async function validerDemande(
  _precedent: EtatAdmin,
  donnees: FormData
): Promise<EtatAdmin> {
  const { supabase, moi } = await exigerAdmin();

  const analyse = schemaValidation.safeParse({
    membreId: donnees.get('membreId'),
    role: donnees.get('role'),
  });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Demande incomplète.' };
  }

  const { error } = await supabase
    .from('membres')
    .update({
      role: analyse.data.role,
      statut: 'valide',
      valide_par: moi.id,
      valide_le: new Date().toISOString(),
      motif_refus: null,
    })
    .eq('id', analyse.data.membreId);

  if (error) return { erreur: traduireErreurBase(error) };

  rafraichir();
  return { message: 'Accès ouvert.' };
}

const schemaRefus = z.object({
  membreId: identifiantMembre,
  motif: z
    .string()
    .trim()
    .min(3, 'Indiquez un motif : la personne le lira.')
    .max(500, 'Motif trop long.'),
});

/** Écarte une demande. Le motif est affiché au demandeur sur sa page d'attente. */
export async function refuserDemande(
  _precedent: EtatAdmin,
  donnees: FormData
): Promise<EtatAdmin> {
  const { supabase, moi } = await exigerAdmin();

  const analyse = schemaRefus.safeParse({
    membreId: donnees.get('membreId'),
    motif: donnees.get('motif'),
  });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Demande incomplète.' };
  }

  if (analyse.data.membreId === moi.id) {
    return { erreur: 'Vous ne pouvez pas écarter votre propre demande.' };
  }

  const { error } = await supabase
    .from('membres')
    .update({
      statut: 'refuse',
      motif_refus: analyse.data.motif,
      valide_par: moi.id,
      valide_le: new Date().toISOString(),
    })
    .eq('id', analyse.data.membreId);

  if (error) return { erreur: traduireErreurBase(error) };

  rafraichir();
  return { message: 'Demande écartée.' };
}

// ---------------------------------------------------------------------------
// Membres déjà validés
// ---------------------------------------------------------------------------

const schemaRole = z.object({ membreId: identifiantMembre, role });

export async function changerRole(
  _precedent: EtatAdmin,
  donnees: FormData
): Promise<EtatAdmin> {
  const { supabase } = await exigerAdmin();

  const analyse = schemaRole.safeParse({
    membreId: donnees.get('membreId'),
    role: donnees.get('role'),
  });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Demande incomplète.' };
  }

  const { error } = await supabase
    .from('membres')
    .update({ role: analyse.data.role })
    .eq('id', analyse.data.membreId);

  if (error) return { erreur: traduireErreurBase(error) };

  rafraichir();
  return { message: 'Rôle enregistré.' };
}

const schemaStatut = z.object({
  membreId: identifiantMembre,
  // Un refus passe par `refuserDemande`, qui exige un motif.
  statut: z.enum(['valide', 'suspendu', 'en_attente']),
});

/** Suspend un accès, le rétablit, ou remet une demande écartée sur la pile. */
export async function changerStatut(
  _precedent: EtatAdmin,
  donnees: FormData
): Promise<EtatAdmin> {
  const { supabase, moi } = await exigerAdmin();

  const analyse = schemaStatut.safeParse({
    membreId: donnees.get('membreId'),
    statut: donnees.get('statut'),
  });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Demande incomplète.' };
  }

  const { membreId, statut } = analyse.data;

  if (membreId === moi.id && statut !== 'valide') {
    return { erreur: 'Vous ne pouvez pas vous retirer vous-même l’accès.' };
  }

  const { error } = await supabase
    .from('membres')
    .update(
      statut === 'valide'
        ? { statut, motif_refus: null, valide_par: moi.id, valide_le: new Date().toISOString() }
        : { statut }
    )
    .eq('id', membreId);

  if (error) return { erreur: traduireErreurBase(error) };

  rafraichir();
  return {
    message:
      statut === 'valide'
        ? 'Accès rétabli.'
        : statut === 'suspendu'
          ? 'Accès suspendu.'
          : 'Demande remise en attente.',
  };
}

const schemaRattachement = z.object({
  membreId: identifiantMembre,
  // Chaîne vide : l'administrateur défait le rattachement.
  personneId: z.union([identifiantPersonne, z.literal('')]),
});

/** Relie un membre à sa propre fiche dans l'arbre. */
export async function rattacherPersonne(
  _precedent: EtatAdmin,
  donnees: FormData
): Promise<EtatAdmin> {
  const { supabase } = await exigerAdmin();

  const analyse = schemaRattachement.safeParse({
    membreId: donnees.get('membreId'),
    personneId: donnees.get('personneId') ?? '',
  });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Demande incomplète.' };
  }

  const personneId = analyse.data.personneId || null;

  const { error } = await supabase
    .from('membres')
    .update({ personne_id: personneId })
    .eq('id', analyse.data.membreId);

  if (error) return { erreur: traduireErreurBase(error) };

  rafraichir();
  return { message: personneId ? 'Rattachement enregistré.' : 'Rattachement retiré.' };
}

// ---------------------------------------------------------------------------
// Portraits de la carte de l'arbre
// ---------------------------------------------------------------------------

const schemaDemandePortrait = z.object({ demandeId: z.uuid('Demande introuvable.') });

/** Accepte une demande : la photo devient le portrait affiché sur la carte. */
export async function validerDemandePortrait(
  _precedent: EtatAdmin,
  donnees: FormData
): Promise<EtatAdmin> {
  const { supabase } = await exigerAdmin();

  const analyse = schemaDemandePortrait.safeParse({ demandeId: donnees.get('demandeId') });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Demande incomplète.' };
  }

  const { data: demande } = await supabase
    .from('demandes_portrait_carte')
    .select('personne_id, media_id')
    .eq('id', analyse.data.demandeId)
    .maybeSingle();

  const { error } = await supabase.rpc('accepter_demande_portrait_carte', {
    p_demande_id: analyse.data.demandeId,
  });
  if (error) return { erreur: traduireErreurBase(error) };

  rafraichir();
  revalidatePath('/arbre');
  revalidatePath('/arbre/imprimer');
  if (demande) {
    revalidatePath(`/personne/${demande.personne_id}`);
    revalidatePath(`/personne/${demande.personne_id}/photo/${demande.media_id}`);
  }
  return { message: 'Portrait de la carte validé.' };
}

const schemaRefusPortrait = z.object({
  demandeId: z.uuid('Demande introuvable.'),
  motif: z
    .string()
    .trim()
    .min(3, 'Indiquez un motif.')
    .max(500, 'Motif trop long.'),
});

/** Écarte une demande de portrait pour la carte. */
export async function refuserDemandePortrait(
  _precedent: EtatAdmin,
  donnees: FormData
): Promise<EtatAdmin> {
  const { supabase, moi } = await exigerAdmin();

  const analyse = schemaRefusPortrait.safeParse({
    demandeId: donnees.get('demandeId'),
    motif: donnees.get('motif'),
  });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Demande incomplète.' };
  }

  const { data: demande } = await supabase
    .from('demandes_portrait_carte')
    .select('personne_id, media_id')
    .eq('id', analyse.data.demandeId)
    .maybeSingle();

  const { error } = await supabase
    .from('demandes_portrait_carte')
    .update({
      statut: 'refusee',
      traite_par: moi.id,
      traite_le: new Date().toISOString(),
      motif_refus: analyse.data.motif,
    })
    .eq('id', analyse.data.demandeId)
    .eq('statut', 'en_attente');

  if (error) return { erreur: traduireErreurBase(error) };

  rafraichir();
  if (demande) {
    revalidatePath('/arbre/imprimer');
    revalidatePath(`/personne/${demande.personne_id}`);
    revalidatePath(`/personne/${demande.personne_id}/photo/${demande.media_id}`);
  }
  return { message: 'Demande de portrait écartée.' };
}

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

/** La navigation affiche le nombre de demandes en attente : tout est à refaire. */
function rafraichir() {
  revalidatePath('/', 'layout');
}

/**
 * La base se défend elle-même : un déclencheur interdit de retirer son rôle au
 * dernier administrateur, faute de quoi plus personne ne pourrait ouvrir un
 * accès. L'exception qu'il lève ne doit pas se traduire par une page d'erreur.
 */
function traduireErreurBase(erreur: { code?: string | null; message: string }): string {
  const m = erreur.message.toLowerCase();

  const dernierAdmin =
    (m.includes('dernier') || m.includes('last')) &&
    (m.includes('admin') || m.includes('administrateur'));

  if (dernierAdmin) {
    return (
      'L’arbre doit garder au moins un administrateur : sans lui, plus personne ' +
      'ne pourrait ouvrir un accès. Nommez d’abord quelqu’un d’autre ' +
      'administrateur, puis revenez sur ce changement.'
    );
  }

  if (erreur.code === '42501' || m.includes('row-level security') || m.includes('permission denied')) {
    return 'Ce changement vous est refusé par la base.';
  }

  // Exception levée par un déclencheur : son message est déjà rédigé en clair.
  if (erreur.code === 'P0001') return erreur.message;

  return 'Le changement n’a pas pu être enregistré. Réessayez dans un instant.';
}
