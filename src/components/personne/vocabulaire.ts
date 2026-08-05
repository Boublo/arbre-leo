import type {
  PorteeFait,
  Sexe,
  StatutModeration,
  TypeEvenement,
  TypeMedia,
} from '@/lib/types-base';

/**
 * Le vocabulaire de la fiche, dit en clair.
 *
 * La base parle en codes (« anom », « inhumation », « en_relecture ») parce
 * qu'il faut bien trier. La fiche, elle, s'adresse à des cousins qui n'ont
 * jamais ouvert un registre : tout se traduit ici, une seule fois.
 */

export const LIBELLE_EVENEMENT: Record<TypeEvenement, string> = {
  naissance: 'Naissance',
  bapteme: 'Baptême',
  mariage: 'Mariage',
  union_libre: 'Union libre',
  divorce: 'Divorce',
  fiancailles: 'Fiançailles',
  deces: 'Décès',
  inhumation: 'Inhumation',
  cremation: 'Crémation',
  profession: 'Métier',
  residence: 'Résidence',
  recensement: 'Recensement',
  emigration: 'Départ du pays',
  immigration: 'Arrivée dans le pays',
  naturalisation: 'Naturalisation',
  service_militaire: 'Service militaire',
  education: 'Études',
  distinction: 'Distinction',
  maladie: 'Maladie',
  autre: 'Autre',
};

/**
 * Les niveaux de preuve viennent d'un module commun : la fiche, l'arbre et
 * les chantiers doivent en donner exactement la même définition.
 */
export { PREUVES as PREUVE, trierParFiabilite, meilleurePreuve } from '@/lib/preuves';

export const LIBELLE_MEDIA: Record<TypeMedia, string> = {
  photo: 'Photographie',
  acte: 'Acte',
  document: 'Document',
  audio: 'Enregistrement sonore',
  video: 'Vidéo',
};

export const LIBELLE_PORTEE: Record<PorteeFait, string> = {
  mondial: 'Histoire mondiale',
  national: 'Histoire nationale',
  regional: 'Histoire régionale',
  local: 'Histoire locale',
  familial: 'Histoire de la famille',
};

/**
 * Ce qui n'est pas encore publié se signale : un membre voit parfois son propre
 * dépôt avant relecture, autant qu'il sache où il en est.
 */
export const LIBELLE_MODERATION: Record<StatutModeration, string | null> = {
  publie: null,
  en_relecture: 'En attente de relecture',
  masque: 'Masqué pour la famille',
};

export const LIBELLE_SEXE: Record<Sexe, string> = {
  M: 'Homme',
  F: 'Femme',
  inconnu: 'Sexe non renseigné',
};

/** « dit » ou « dite », « né » ou « née » — l'accord suit le sexe connu. */
export function accorder(sexe: Sexe, mot: string): string {
  return sexe === 'F' ? `${mot}e` : mot;
}

/** Les branches sont nommées dans la base : on se contente de les présenter. */
export function nommerBranche(branche: string): string {
  const propre = branche.replace(/[_-]+/g, ' ').trim();
  return propre.charAt(0).toUpperCase() + propre.slice(1);
}
