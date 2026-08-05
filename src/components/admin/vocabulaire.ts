import type { Membre, RoleMembre, StatutMembre } from '@/lib/types-base';

/**
 * Le vocabulaire de l'administration, dit en clair.
 *
 * La base parle en identifiants (`en_attente`, `medias_personnes`, `update`) ;
 * l'administrateur, lui, est un membre de la famille. Tout ce qui s'affiche
 * passe par ce fichier, partagé entre la page et ses composants.
 */

// --- Formes transmises à l'affichage ---------------------------------------

/** Une demande d'accès : exactement ce sur quoi l'on décide, rien de plus. */
export type DemandeAdmin = Pick<
  Membre,
  'id' | 'email' | 'nom_affiche' | 'lien_famille' | 'message_demande' | 'motif_refus' | 'cree_le'
>;

export type MembreAdmin = Pick<
  Membre,
  'id' | 'email' | 'nom_affiche' | 'role' | 'statut' | 'personne_id' | 'lien_famille' | 'valide_le' | 'cree_le'
>;

/** Une fiche de l'arbre proposée au rattachement. */
export type FicheArbre = { id: string; libelle: string; precision: string | null };

export type LigneJournal = {
  id: number;
  action: string;
  tableCible: string;
  ligneId: string | null;
  creeLe: string;
  acteur: string | null;
};

// --- Rôles et statuts ------------------------------------------------------

/** Du moins étendu au plus étendu : l'ordre d'affichage des choix. */
export const ORDRE_ROLES: RoleMembre[] = ['lecteur', 'contributeur', 'admin'];

export const ROLES: Record<RoleMembre, { libelle: string; explication: string }> = {
  lecteur: {
    libelle: 'Lecteur',
    explication: 'Consulte l’arbre, les souvenirs et les photos. N’ajoute rien.',
  },
  contributeur: {
    libelle: 'Contributeur',
    explication: 'Dépose souvenirs, photos et commentaires, en plus de la lecture.',
  },
  admin: {
    libelle: 'Administrateur',
    explication: 'Accorde les accès, modère, et voit ce journal.',
  },
};

export const STATUTS: Record<StatutMembre, { libelle: string; ton: string }> = {
  en_attente: { libelle: 'En attente', ton: 'var(--alerte)' },
  valide: { libelle: 'Accès ouvert', ton: 'var(--succes)' },
  refuse: { libelle: 'Demande écartée', ton: 'var(--encre-tres-douce)' },
  suspendu: { libelle: 'Accès suspendu', ton: 'var(--erreur)' },
};

// --- Journal ---------------------------------------------------------------

const ACTIONS: Record<string, string> = {
  insert: 'Ajout',
  creation: 'Ajout',
  ajout: 'Ajout',
  update: 'Modification',
  modification: 'Modification',
  delete: 'Suppression',
  suppression: 'Suppression',
  truncate: 'Vidage',
};

/** « update » → « Modification ». Une valeur inconnue est rendue telle quelle. */
export function nommerAction(action: string): string {
  return ACTIONS[action.toLowerCase()] ?? action;
}

const TABLES: Record<string, string> = {
  membres: 'Membres',
  lieux: 'Lieux',
  personnes: 'Personnes',
  unions: 'Unions',
  filiations: 'Filiations',
  evenements: 'Événements',
  sources: 'Sources',
  medias: 'Médias',
  medias_personnes: 'Médias et personnes',
  souvenirs: 'Souvenirs',
  souvenirs_personnes: 'Souvenirs et personnes',
  souvenirs_medias: 'Souvenirs et médias',
  faits_historiques: 'Faits historiques',
  faits_personnes: 'Faits et personnes',
  chantiers_recherche: 'Chantiers de recherche',
  commentaires: 'Commentaires',
  journal: 'Journal',
};

export function nommerTable(table: string): string {
  return TABLES[table.toLowerCase()] ?? table;
}

// --- Dates -----------------------------------------------------------------

// Fuseau fixé : le rendu est fait sur le serveur, il ne doit pas dépendre de
// l'endroit où celui-ci tourne.
const FORMAT_JOUR = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

const FORMAT_HEURE = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
});

/** « 8 mars 2026 à 14:32 ». */
export function formaterHorodatage(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${FORMAT_JOUR.format(date)} à ${FORMAT_HEURE.format(date)}`;
}

/** « 8 mars 2026 », sans l'heure : suffisant pour une liste de membres. */
export function formaterJour(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return FORMAT_JOUR.format(date);
}

const FORMAT_NOMBRE = new Intl.NumberFormat('fr-FR');

export function formaterNombre(valeur: number | null): string {
  return FORMAT_NOMBRE.format(valeur ?? 0);
}

// --- Recherche -------------------------------------------------------------

// Les marques combinantes que laisse la d\u00e9composition NFD : U+0300 \u00e0 U+036F.
const MARQUES_DIACRITIQUES = new RegExp('[\u0300-\u036f]', 'g');

/**
 * Compare sans se soucier des accents ni de la casse : on cherche un nom sans accent
 * et l'on doit trouver « Ségura ».
 */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(MARQUES_DIACRITIQUES, '')
    .toLowerCase()
    .trim();
}
