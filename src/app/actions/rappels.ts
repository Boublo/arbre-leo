'use server';

import { revalidatePath } from 'next/cache';
import { creerClientServeur } from '@/lib/supabase/server';
import type { PreferencesRappels } from '@/lib/rappels-anniversaires';

export type EtatPreferencesRappels = {
  erreur?: string;
  message?: string;
};

export type PreferencesRappelsLues = PreferencesRappels & {
  email: string;
  nomAffiche: string;
};

export async function lirePreferencesRappels(): Promise<PreferencesRappelsLues | null> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('membres')
    .select(
      'email, nom_affiche, rappels_email, rappels_naissance, rappels_deces, rappels_mariage'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    email: data.email,
    nomAffiche: data.nom_affiche,
    rappels_email: data.rappels_email,
    rappels_naissance: data.rappels_naissance,
    rappels_deces: data.rappels_deces,
    rappels_mariage: data.rappels_mariage,
  };
}

export async function enregistrerPreferencesRappels(
  _precedent: EtatPreferencesRappels,
  donnees: FormData
): Promise<EtatPreferencesRappels> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: 'Connectez-vous pour modifier vos rappels.' };

  const rappels_email = donnees.has('rappels_email');
  const rappels_naissance = donnees.has('rappels_naissance');
  const rappels_deces = donnees.has('rappels_deces');
  const rappels_mariage = donnees.has('rappels_mariage');

  const { error } = await supabase
    .from('membres')
    .update({
      rappels_email,
      rappels_naissance,
      rappels_deces,
      rappels_mariage,
      modifie_le: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { erreur: 'Impossible d’enregistrer vos préférences.' };

  revalidatePath('/notifications');
  return { message: 'Préférences enregistrées.' };
}
