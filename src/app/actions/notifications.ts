'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';
import {
  formaterHorodatageNotification,
  ICONE_TYPE_NOTIFICATION,
  LIBELLE_TYPE_NOTIFICATION,
  type NotificationAffichee,
} from '@/lib/notifications';
import type { Notification, TypeNotification } from '@/lib/types-base';

export type EtatNotifications = { erreur?: string; message?: string };

function mettreEnForme(ligne: Notification): NotificationAffichee {
  return {
    id: ligne.id,
    type: ligne.type,
    titre: ligne.titre,
    corps: ligne.corps,
    lien: ligne.lien,
    lu: ligne.lu_le !== null,
    creeLe: formaterHorodatageNotification(ligne.cree_le),
    libelleType: LIBELLE_TYPE_NOTIFICATION[ligne.type],
    icone: ICONE_TYPE_NOTIFICATION[ligne.type],
  };
}

export async function compterNotificationsNonLues(): Promise<number> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('destinataire_id', user.id)
    .is('lu_le', null);

  if (error) return 0;
  return count ?? 0;
}

export async function listerNotifications(limite = 30): Promise<NotificationAffichee[]> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('destinataire_id', user.id)
    .order('cree_le', { ascending: false })
    .limit(limite);

  if (error || !data) return [];
  return (data as Notification[]).map(mettreEnForme);
}

const schemaId = z.object({ id: z.uuid('Notification introuvable.') });

export async function marquerNotificationLue(
  _precedent: EtatNotifications,
  donnees: FormData,
): Promise<EtatNotifications> {
  const analyse = schemaId.safeParse({ id: donnees.get('id') });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Notification introuvable.' };
  }

  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Session expirée.' };

  const { error } = await supabase
    .from('notifications')
    .update({ lu_le: new Date().toISOString() })
    .eq('id', analyse.data.id)
    .eq('destinataire_id', user.id)
    .is('lu_le', null);

  if (error) return { erreur: 'Impossible de marquer la notification comme lue.' };

  rafraichir();
  return { message: 'Lu.' };
}

export async function marquerToutesNotificationsLues(): Promise<EtatNotifications> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Session expirée.' };

  const { error } = await supabase
    .from('notifications')
    .update({ lu_le: new Date().toISOString() })
    .eq('destinataire_id', user.id)
    .is('lu_le', null);

  if (error) return { erreur: 'Impossible de tout marquer comme lu.' };

  rafraichir();
  return { message: 'Tout est lu.' };
}

function rafraichir() {
  revalidatePath('/', 'layout');
  revalidatePath('/notifications');
}

export type { TypeNotification };
