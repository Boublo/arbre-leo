import { creerClientServeur } from '@/lib/supabase/server';
import { formaterDate } from '@/lib/arbre';
import {
  estIdentifiant,
  type CommentaireFiche,
  type MediaFiche,
} from '@/components/personne/donnees';
import type { Commentaire, Media, Membre, StatutModeration } from '@/lib/types-base';

const BUCKET_MEDIAS = 'arbre-medias';
const DUREE_LIEN_SIGNE = 3600;

function formaterHorodatage(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export type PhotoDetail = {
  media: MediaFiche;
  personneId: string;
  nomPersonne: string;
  estPortraitCarte: boolean;
  demandePortraitEnAttente: boolean;
  commentaires: CommentaireFiche[];
};

/**
 * Une photo de l’album d’une personne, avec son fil de souvenirs.
 */
export async function chargerPhotoPersonne(
  personneId: string,
  mediaId: string
): Promise<PhotoDetail | null> {
  if (!estIdentifiant(personneId) || !estIdentifiant(mediaId)) return null;

  const supabase = await creerClientServeur();

  const { data: personne } = await supabase
    .from('personnes')
    .select('id, nom_complet, prenoms, nom, photo_id')
    .eq('id', personneId)
    .maybeSingle();
  if (!personne) return null;

  const { data: lien } = await supabase
    .from('medias_personnes')
    .select('media_id, role')
    .eq('personne_id', personneId)
    .eq('media_id', mediaId)
    .maybeSingle();
  if (!lien) return null;

  const { data: media } = await supabase
    .from('medias')
    .select('*')
    .eq('id', mediaId)
    .maybeSingle();
  if (!media) return null;

  const { data: commentairesBruts } = await supabase
    .from('commentaires')
    .select('*')
    .eq('media_id', mediaId)
    .order('cree_le');

  const commentaires: Commentaire[] = commentairesBruts ?? [];
  const idsAuteurs = [...new Set(commentaires.map((c) => c.auteur_id))];

  const { data: auteurs } =
    idsAuteurs.length > 0
      ? await supabase.from('membres').select('id, nom_affiche').in('id', idsAuteurs)
      : { data: [] as Pick<Membre, 'id' | 'nom_affiche'>[] };

  const nomAuteur = new Map((auteurs ?? []).map((a) => [a.id, a.nom_affiche]));

  const { data: signe } = await supabase.storage
    .from(BUCKET_MEDIAS)
    .createSignedUrl(media.chemin, DUREE_LIEN_SIGNE);

  const { data: demandeEnAttente } = await supabase
    .from('demandes_portrait_carte')
    .select('id')
    .eq('personne_id', personneId)
    .eq('media_id', mediaId)
    .eq('statut', 'en_attente')
    .maybeSingle();

  const m = media as Media;
  const fiche: MediaFiche = {
    id: m.id,
    type: m.type,
    titre: m.titre,
    description: m.description,
    date: formaterDate(m),
    annee: m.annee,
    mois: m.mois,
    jour: m.jour,
    lieu: null,
    transcription: m.transcription,
    cote: m.cote,
    depot: m.depot,
    role: lien.role,
    statut: m.statut as StatutModeration,
    url: signe?.signedUrl ?? null,
    estImage: m.mime ? m.mime.startsWith('image/') : m.type === 'photo',
    largeur: m.largeur ?? null,
    hauteur: m.hauteur ?? null,
  };

  return {
    media: fiche,
    personneId,
    nomPersonne: personne.nom_complet?.trim() || personne.prenoms || personne.nom || 'Sans nom',
    estPortraitCarte: personne.photo_id === mediaId,
    demandePortraitEnAttente: demandeEnAttente !== null,
    commentaires: assemblerFil(commentaires, nomAuteur),
  };
}

function assemblerFil(
  commentaires: Commentaire[],
  nomAuteur: Map<string, string>
): CommentaireFiche[] {
  const parId = new Map<string, CommentaireFiche>();
  const racines: CommentaireFiche[] = [];

  for (const c of commentaires) {
    parId.set(c.id, {
      id: c.id,
      texte: c.texte,
      auteur: nomAuteur.get(c.auteur_id) ?? 'Un membre de la famille',
      date: formaterHorodatage(c.cree_le),
      statut: c.statut,
      reponses: [],
    });
  }

  for (const c of commentaires) {
    const noeud = parId.get(c.id)!;
    if (c.parent_id && parId.has(c.parent_id)) {
      parId.get(c.parent_id)!.reponses.push(noeud);
    } else {
      racines.push(noeud);
    }
  }

  return racines;
}
