import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';
import { ephemeridesDeCeJour, type Ephemeride } from '@/lib/ephemerides';
import { lieuCommemoration } from '@/lib/lieu-commemoration';
import { formaterDate } from '@/lib/arbre';

export type PreferencesRappels = {
  rappels_email: boolean;
  rappels_naissance: boolean;
  rappels_deces: boolean;
  rappels_mariage: boolean;
};

export type MembreRappel = {
  id: string;
  email: string;
  nom_affiche: string;
} & PreferencesRappels;

export type EntreeRappelEmail = {
  type: 'naissance' | 'deces' | 'mariage';
  titre: string;
  detail: string;
  lien: string;
  lieuCommemoration?: string;
};

/** Filtre les éphémérides selon les préférences du membre. */
export function filtrerEphemeridesPourMembre(
  ephemerides: Ephemeride[],
  prefs: PreferencesRappels
): Ephemeride[] {
  return ephemerides.filter((e) => {
    if (e.type === 'naissance') return prefs.rappels_naissance;
    if (e.type === 'deces') return prefs.rappels_deces;
    return prefs.rappels_mariage;
  });
}

export function ephemeridesVersEntreesEmail(
  ephemerides: Ephemeride[],
  siteUrl: string
): EntreeRappelEmail[] {
  const base = siteUrl.replace(/\/$/, '');

  return ephemerides.map((e) => {
    const dateEcrite = formaterDate({
      annee: e.annee,
      mois: e.mois,
      jour: e.jour,
    });

    if (e.type === 'mariage') {
      const noms = e.conjoints.map((p) => p.nomComplet).join(' et ');
      return {
        type: 'mariage',
        titre: noms,
        detail: `Union célébrée le ${dateEcrite} — ${resumeAnnees(e.annees)}.`,
        lien: `${base}/aujourdhui`,
      };
    }

    const p = e.personne;
    const feminin = p.sexe === 'F';

    if (e.type === 'naissance') {
      const legende = e.vivant
        ? e.annees === 0
          ? 'vient de naître'
          : `fête ses ${e.annees} ans`
        : e.annees === 0
          ? `${feminin ? 'née' : 'né'} aujourd'hui`
          : `aurait ${e.annees} ans`;
      return {
        type: 'naissance',
        titre: p.nomComplet,
        detail: `${feminin ? 'Née' : 'Né'} le ${dateEcrite} — ${legende}.`,
        lien: `${base}/personne/${p.id}`,
      };
    }

    const lieu = lieuCommemoration(p);
    const detailBase = `${feminin ? 'Décédée' : 'Décédé'} le ${dateEcrite} — ${resumeAnnees(e.annees)}.`;
    return {
      type: 'deces',
      titre: p.nomComplet,
      detail: lieu ? `${detailBase} ${libelleCommemorationCourt(lieu, feminin)}` : detailBase,
      lien: `${base}/personne/${p.id}#conversation`,
      lieuCommemoration: lieu?.libelle,
    };
  });
}

function libelleCommemorationCourt(
  lieu: NonNullable<ReturnType<typeof lieuCommemoration>>,
  feminin: boolean
): string {
  if (lieu.source === 'inhumation') {
    return feminin ? `Inhumée à ${lieu.libelle}.` : `Inhumé à ${lieu.libelle}.`;
  }
  return feminin ? `Lieu du décès : ${lieu.libelle}.` : `Lieu du décès : ${lieu.libelle}.`;
}

function resumeAnnees(annees: number): string {
  if (annees <= 0) return 'ce jour même';
  if (annees === 1) return 'il y a un an';
  return `il y a ${annees} ans`;
}

export function resumeCorpsNotification(
  entrees: EntreeRappelEmail[],
  dateLabel: string
): { titre: string; corps: string } {
  if (entrees.length === 1) {
    const e = entrees[0]!;
    return {
      titre:
        e.type === 'deces'
          ? `En mémoire de ${e.titre}`
          : e.type === 'mariage'
            ? `Mariage : ${e.titre}`
            : `Anniversaire de ${e.titre}`,
      corps: e.detail,
    };
  }

  const lignes = entrees.map((e) => `• ${e.titre} — ${e.detail}`);
  return {
    titre: `${entrees.length} anniversaires le ${dateLabel}`,
    corps: lignes.join('\n'),
  };
}

export function ephemeridesDuJour(donnees: DonneesArbre, reference = new Date()): Ephemeride[] {
  return ephemeridesDeCeJour(donnees, reference);
}

export type PersonneArbreExport = PersonneArbre;
