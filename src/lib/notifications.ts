import type { TypeNotification } from '@/lib/types-base';

export const LIBELLE_TYPE_NOTIFICATION: Record<TypeNotification, string> = {
  demande_acces: 'Demande d’accès',
  acces_valide: 'Accès ouvert',
  acces_refuse: 'Demande refusée',
  commentaire: 'Commentaire',
  reponse_commentaire: 'Réponse',
  nouveau_souvenir: 'Souvenir',
  nouvelle_photo: 'Photo',
  nouvelle_personne: 'Nouvelle fiche',
  demande_portrait_carte: 'Portrait carte',
  portrait_carte_accepte: 'Portrait accepté',
  portrait_carte_refuse: 'Portrait écarté',
  anniversaire_naissance: 'Anniversaire',
  anniversaire_deces: 'En mémoire',
  anniversaire_mariage: 'Mariage',
  rappel_ephemerides: 'Ces jours-ci',
};

export const ICONE_TYPE_NOTIFICATION: Record<TypeNotification, string> = {
  demande_acces: '👤',
  acces_valide: '✓',
  acces_refuse: '✕',
  commentaire: '💬',
  reponse_commentaire: '↩',
  nouveau_souvenir: '📖',
  nouvelle_photo: '🖼',
  nouvelle_personne: '🌿',
  demande_portrait_carte: '🪪',
  portrait_carte_accepte: '✓',
  portrait_carte_refuse: '✕',
  anniversaire_naissance: '🎂',
  anniversaire_deces: '🕯',
  anniversaire_mariage: '💍',
  rappel_ephemerides: '📅',
};

export type NotificationAffichee = {
  id: string;
  type: TypeNotification;
  titre: string;
  corps: string | null;
  lien: string | null;
  lu: boolean;
  creeLe: string;
  libelleType: string;
  icone: string;
};

export function formaterHorodatageNotification(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const maintenant = Date.now();
  const ecart = maintenant - date.getTime();
  const minutes = Math.floor(ecart / 60_000);
  if (minutes < 1) return 'À l’instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `Il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours < 7) return `Il y a ${jours} j`;
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
