import { chargerArbreAvecClient } from '@/lib/arbre';
import {
  envoyerCourrielRappel,
  genererHtmlRappelAnniversaire,
  sujetRappelAnniversaire,
} from '@/lib/email-rappel-anniversaire';
import {
  ephemeridesDuJour,
  ephemeridesVersEntreesEmail,
  filtrerEphemeridesPourMembre,
  resumeCorpsNotification,
  type MembreRappel,
} from '@/lib/rappels-anniversaires';
import { creerClientService } from '@/lib/supabase/service';

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function libelleDateFrancais(date: Date): string {
  const jour = date.getDate();
  const jourEcrit = jour === 1 ? '1er' : String(jour);
  return `${jourEcrit} ${MOIS[date.getMonth()]}`;
}

function dateIsoCalendaire(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type ResultatRappels = {
  membres: number;
  emailsEnvoyes: number;
  notificationsCreees: number;
  ignores: number;
  erreurs: string[];
};

/**
 * Envoie les rappels du jour (courriel + notification in-app) à tous les membres
 * validés qui ont activé les rappels.
 */
export async function executerRappelsAnniversaires(
  reference = new Date()
): Promise<ResultatRappels> {
  const supabase = creerClientService();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arbre.modulyx.eu').replace(
    /\/$/,
    ''
  );
  const dateLabel = libelleDateFrancais(reference);
  const dateCalendaire = dateIsoCalendaire(reference);

  const { data: membres, error: erreurMembres } = await supabase
    .from('membres')
    .select(
      'id, email, nom_affiche, rappels_email, rappels_naissance, rappels_deces, rappels_mariage'
    )
    .eq('statut', 'valide');

  if (erreurMembres) {
    throw new Error(`Lecture des membres impossible : ${erreurMembres.message}`);
  }

  const donnees = await chargerArbreAvecClient(supabase, { signerPhotosPour: 'aucun' });
  const ephemeridesJour = ephemeridesDuJour(donnees, reference);

  const resultat: ResultatRappels = {
    membres: membres?.length ?? 0,
    emailsEnvoyes: 0,
    notificationsCreees: 0,
    ignores: 0,
    erreurs: [],
  };

  for (const membre of membres ?? []) {
    const prefs: MembreRappel = {
      id: membre.id,
      email: membre.email,
      nom_affiche: membre.nom_affiche,
      rappels_email: membre.rappels_email,
      rappels_naissance: membre.rappels_naissance,
      rappels_deces: membre.rappels_deces,
      rappels_mariage: membre.rappels_mariage,
    };

    const ephemerides = filtrerEphemeridesPourMembre(ephemeridesJour, prefs);
    if (ephemerides.length === 0) {
      resultat.ignores += 1;
      continue;
    }

    const entrees = ephemeridesVersEntreesEmail(ephemerides, siteUrl);
    const { titre, corps } = resumeCorpsNotification(entrees, dateLabel);

    const { data: dejaNotifie } = await supabase
      .from('rappels_envoyes')
      .select('membre_id')
      .eq('membre_id', membre.id)
      .eq('canal', 'in_app')
      .eq('date_calendaire', dateCalendaire)
      .maybeSingle();

    if (!dejaNotifie) {
      const { error: erreurNotif } = await supabase.from('notifications').insert({
        destinataire_id: membre.id,
        type: 'rappel_ephemerides',
        titre,
        corps,
        lien: '/aujourdhui',
        source_table: 'ephemerides',
        source_id: null,
        auteur_id: null,
      });

      if (erreurNotif) {
        resultat.erreurs.push(`Notification ${membre.email} : ${erreurNotif.message}`);
      } else {
        await supabase.from('rappels_envoyes').insert({
          membre_id: membre.id,
          canal: 'in_app',
          date_calendaire: dateCalendaire,
        });
        resultat.notificationsCreees += 1;
      }
    }

    if (!prefs.rappels_email) continue;

    const { data: dejaEmail } = await supabase
      .from('rappels_envoyes')
      .select('membre_id')
      .eq('membre_id', membre.id)
      .eq('canal', 'email')
      .eq('date_calendaire', dateCalendaire)
      .maybeSingle();

    if (dejaEmail) continue;

    const prenom = membre.nom_affiche.split(' ')[0] ?? membre.nom_affiche;
    const html = genererHtmlRappelAnniversaire({
      prenomDestinataire: prenom,
      dateLabel,
      entrees,
      lienCalendrier: `${siteUrl}/aujourdhui`,
      lienPreferences: `${siteUrl}/notifications`,
    });

    const envoi = await envoyerCourrielRappel({
      destinataire: membre.email,
      sujet: sujetRappelAnniversaire(dateLabel, entrees.length),
      html,
    });

    if (!envoi.ok) {
      resultat.erreurs.push(`Email ${membre.email} : ${envoi.erreur}`);
      continue;
    }

    await supabase.from('rappels_envoyes').insert({
      membre_id: membre.id,
      canal: 'email',
      date_calendaire: dateCalendaire,
    });
    resultat.emailsEnvoyes += 1;
  }

  return resultat;
}
