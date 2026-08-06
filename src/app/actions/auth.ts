'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';
import { obtenirUrlSite } from '@/lib/url-site';

export type EtatFormulaire = { erreur?: string; message?: string };

const schemaInscription = z.object({
  email: z.string().email("Cette adresse e-mail n'est pas valide."),
  motDePasse: z.string().min(10, 'Le mot de passe doit faire au moins 10 caractères.'),
  nomAffiche: z.string().trim().min(2, 'Indiquez le nom sous lequel la famille vous connaît.'),
  lienFamille: z.string().trim().min(3, 'Précisez votre lien avec la famille.'),
  message: z.string().trim().max(2000).optional(),
});

/**
 * Crée un compte. L'accès n'est pas ouvert pour autant : un déclencheur en base
 * inscrit le nouveau venu avec le statut « en attente », et c'est un
 * administrateur qui décidera. Le tout premier compte créé devient admin,
 * sans quoi personne ne pourrait valider personne.
 */
export async function inscrire(_precedent: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const analyse = schemaInscription.safeParse({
    email: donnees.get('email'),
    motDePasse: donnees.get('motDePasse'),
    nomAffiche: donnees.get('nomAffiche'),
    lienFamille: donnees.get('lienFamille'),
    message: donnees.get('message') ?? undefined,
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Formulaire incomplet.' };
  }

  const { email, motDePasse, nomAffiche, lienFamille, message } = analyse.data;
  const supabase = await creerClientServeur();

  const { error } = await supabase.auth.signUp({
    email,
    password: motDePasse,
    options: {
      emailRedirectTo: `${obtenirUrlSite()}/auth/callback`,
      // Repris par le déclencheur `gerer_nouvelle_inscription` pour remplir la fiche membre.
      data: { nom_affiche: nomAffiche, lien_famille: lienFamille, message_demande: message ?? '' },
    },
  });

  if (error) {
    return { erreur: traduireErreur(error.message) };
  }

  return {
    message:
      "Votre demande est enregistrée. Confirmez d'abord votre adresse en cliquant sur le lien reçu par e-mail, puis attendez qu'un administrateur de la famille vous ouvre l'accès.",
  };
}

const schemaConnexion = z.object({
  email: z.string().email("Cette adresse e-mail n'est pas valide."),
  motDePasse: z.string().min(1, 'Saisissez votre mot de passe.'),
});

export async function connecter(_precedent: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const analyse = schemaConnexion.safeParse({
    email: donnees.get('email'),
    motDePasse: donnees.get('motDePasse'),
  });

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Formulaire incomplet.' };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.signInWithPassword({
    email: analyse.data.email,
    password: analyse.data.motDePasse,
  });

  if (error) {
    return { erreur: traduireErreur(error.message) };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: membre } = await supabase
      .from('membres')
      .select('statut')
      .eq('id', user.id)
      .maybeSingle();

    // Tant qu'un admin n'a pas ouvert l'accès, on évite d'envoyer sur l'accueil
    // (ou ailleurs) : la page d'attente explique la suite.
    if (!membre || membre.statut !== 'valide') {
      revalidatePath('/', 'layout');
      redirect('/attente');
    }
  }

  const suite = String(donnees.get('suite') ?? '/');
  // On ne redirige que vers une route interne : une valeur venue du formulaire
  // ne doit pas pouvoir envoyer l'utilisateur sur un site tiers.
  const destination = suite.startsWith('/') && !suite.startsWith('//') ? suite : '/';

  revalidatePath('/', 'layout');
  redirect(destination);
}

export async function deconnecter() {
  const supabase = await creerClientServeur();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/connexion');
}

/** Les messages de Supabase sont en anglais : on les rend intelligibles. */
function traduireErreur(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Adresse e-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return "Confirmez d'abord votre adresse en cliquant sur le lien reçu par e-mail.";
  if (m.includes('user already registered')) return 'Un compte existe déjà avec cette adresse.';
  if (m.includes('password')) return 'Mot de passe trop court ou trop simple.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Patientez quelques minutes.';
  return "Une erreur est survenue. Réessayez dans un instant.";
}
