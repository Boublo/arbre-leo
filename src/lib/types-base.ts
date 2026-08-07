/**
 * Typage du schéma « arbre ».
 *
 * Écrit à la main : le générateur de types de Supabase ne parcourt que le
 * schéma « public ». Toute modification des migrations doit être reportée ici.
 */

/** Insert et Update sont dérivés de Row ; seuls les champs sans valeur par défaut sont requis. */
type Table<Row, Requis extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Requis>;
  Update: Partial<Row>;
  Relationships: [];
};

// --- Vocabulaire -----------------------------------------------------------

export type RoleMembre = 'admin' | 'contributeur' | 'lecteur';
export type StatutMembre = 'en_attente' | 'valide' | 'refuse' | 'suspendu';
export type NiveauPreuve = 'acte' | 'anom' | 'insee' | 'memoire' | 'hypothese' | 'a_trouver';
export type StatutModeration = 'publie' | 'en_relecture' | 'masque';
export type TypeMedia = 'photo' | 'acte' | 'document' | 'audio' | 'video';
export type Sexe = 'M' | 'F' | 'inconnu';
export type PorteeFait = 'mondial' | 'national' | 'regional' | 'local' | 'familial';
export type StatutChantier = 'a_faire' | 'en_cours' | 'en_attente_reponse' | 'aboutie' | 'abandonnee';
export type PrecisionDate = 'jour' | 'mois' | 'annee' | 'decennie' | 'siecle' | 'inconnue';
export type QualificatifDate = 'exacte' | 'vers' | 'avant' | 'apres' | 'entre' | 'depuis' | 'jusqu_a';

export type TypeEvenement =
  | 'naissance' | 'bapteme' | 'mariage' | 'union_libre' | 'divorce' | 'fiancailles'
  | 'deces' | 'inhumation' | 'cremation' | 'profession' | 'residence' | 'recensement'
  | 'emigration' | 'immigration' | 'naturalisation' | 'service_militaire' | 'education'
  | 'distinction' | 'maladie' | 'autre';

// --- Lignes ----------------------------------------------------------------

export type Membre = {
  id: string;
  email: string;
  nom_affiche: string;
  role: RoleMembre;
  statut: StatutMembre;
  personne_id: string | null;
  message_demande: string | null;
  lien_famille: string | null;
  valide_par: string | null;
  valide_le: string | null;
  motif_refus: string | null;
  cree_le: string;
  modifie_le: string;
};

export type Lieu = {
  id: string;
  libelle: string;
  lieu_dit: string | null;
  commune: string | null;
  departement: string | null;
  region: string | null;
  pays: string | null;
  pays_actuel: string | null;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  cree_le: string;
};

export type Personne = {
  id: string;
  code_gedcom: string | null;
  branches: string[];
  prenoms: string | null;
  nom: string | null;
  nom_naissance: string | null;
  surnom: string | null;
  sexe: Sexe;
  notes: string | null;
  niveaux_preuve: NiveauPreuve[];
  presume_vivant: boolean;
  confidentiel: boolean;
  photo_id: string | null;
  /** Colonne calculée par la base : « Prénoms Nom ». */
  nom_complet: string | null;
  cree_par: string | null;
  modifie_par: string | null;
  cree_le: string;
  modifie_le: string;
};

export type Union = {
  id: string;
  code_gedcom: string | null;
  conjoint_a: string | null;
  conjoint_b: string | null;
  branches: string[];
  notes: string | null;
  niveaux_preuve: NiveauPreuve[];
  cree_le: string;
  modifie_le: string;
};

export type Filiation = {
  id: string;
  union_id: string;
  enfant_id: string;
  nature: string;
  cree_le: string;
};

export type Evenement = {
  id: string;
  personne_id: string | null;
  union_id: string | null;
  type: TypeEvenement;
  libelle: string | null;
  detail: string | null;
  date_texte: string | null;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  annee_fin: number | null;
  qualificatif: QualificatifDate;
  precision_date: PrecisionDate;
  lieu_id: string | null;
  niveau_preuve: NiveauPreuve | null;
  notes: string | null;
  /** Clé de tri chronologique calculée par la base, tolérante aux dates partielles. */
  date_tri: string | null;
  cree_par: string | null;
  cree_le: string;
};

export type Source = {
  id: string;
  personne_id: string | null;
  union_id: string | null;
  evenement_id: string | null;
  titre: string | null;
  texte: string | null;
  page: string | null;
  cote: string | null;
  depot: string | null;
  url: string | null;
  niveau_preuve: NiveauPreuve | null;
  cree_par: string | null;
  cree_le: string;
};

export type Media = {
  id: string;
  chemin: string;
  type: TypeMedia;
  titre: string | null;
  description: string | null;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  date_texte: string | null;
  lieu_id: string | null;
  mime: string | null;
  taille_octets: number | null;
  largeur: number | null;
  hauteur: number | null;
  original_id: string | null;
  cote: string | null;
  depot: string | null;
  transcription: string | null;
  statut: StatutModeration;
  depose_par: string | null;
  cree_le: string;
  modifie_le: string;
};

export type MediaPersonne = { media_id: string; personne_id: string; role: string };

export type Souvenir = {
  id: string;
  auteur_id: string;
  titre: string;
  recit: string;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  date_texte: string | null;
  precision_date: PrecisionDate;
  lieu_id: string | null;
  lieu_libre: string | null;
  statut: StatutModeration;
  epingle: boolean;
  date_tri: string | null;
  cree_le: string;
  modifie_le: string;
};

export type SouvenirPersonne = { souvenir_id: string; personne_id: string };
export type SouvenirMedia = { souvenir_id: string; media_id: string; ordre: number };

export type Recit = {
  id: string;
  patronyme: string | null;
  theme: string | null;
  branche: string | null;
  titre: string;
  chapeau: string | null;
  /** Corps du récit, rédigé en Markdown. */
  corps: string;
  annee_debut: number | null;
  annee_fin: number | null;
  auteur_id: string;
  statut: StatutModeration;
  epingle: boolean;
  cree_le: string;
  modifie_le: string;
};

export type RecitPersonne = { recit_id: string; personne_id: string };

export type FaitHistorique = {
  id: string;
  titre: string;
  resume: string | null;
  description: string | null;
  annee_debut: number;
  mois_debut: number | null;
  jour_debut: number | null;
  annee_fin: number | null;
  lieu_id: string | null;
  lieu_libre: string | null;
  portee: PorteeFait;
  branche: string | null;
  source_url: string | null;
  cree_par: string | null;
  cree_le: string;
  modifie_le: string;
};

export type FaitPersonne = { fait_id: string; personne_id: string; incidence: string | null };

export type ChantierRecherche = {
  id: string;
  titre: string;
  objectif: string | null;
  branche: string | null;
  personne_id: string | null;
  organisme: string | null;
  reference: string | null;
  statut: StatutChantier;
  blocage: string | null;
  priorite: number;
  assigne_a: string | null;
  demande_le: string | null;
  reponse_le: string | null;
  resultat: string | null;
  cree_par: string | null;
  cree_le: string;
  modifie_le: string;
};

export type Commentaire = {
  id: string;
  auteur_id: string;
  personne_id: string | null;
  souvenir_id: string | null;
  media_id: string | null;
  parent_id: string | null;
  texte: string;
  statut: StatutModeration;
  cree_le: string;
  modifie_le: string;
};

export type EntreeJournal = {
  id: number;
  acteur_id: string | null;
  action: string;
  table_cible: string;
  ligne_id: string | null;
  avant: unknown;
  apres: unknown;
  cree_le: string;
};

export type TypeNotification =
  | 'demande_acces'
  | 'acces_valide'
  | 'acces_refuse'
  | 'commentaire'
  | 'reponse_commentaire'
  | 'nouveau_souvenir'
  | 'nouvelle_photo'
  | 'nouvelle_personne'
  | 'demande_portrait_carte'
  | 'portrait_carte_accepte'
  | 'portrait_carte_refuse';

export type StatutDemandePortrait = 'en_attente' | 'acceptee' | 'refusee';

export type DemandePortraitCarte = {
  id: string;
  personne_id: string;
  media_id: string;
  demandeur_id: string;
  statut: StatutDemandePortrait;
  traite_par: string | null;
  traite_le: string | null;
  motif_refus: string | null;
  cree_le: string;
};

export type Notification = {
  id: string;
  destinataire_id: string;
  type: TypeNotification;
  titre: string;
  corps: string | null;
  lien: string | null;
  source_table: string | null;
  source_id: string | null;
  auteur_id: string | null;
  lu_le: string | null;
  cree_le: string;
};

// --- Assemblage ------------------------------------------------------------

export type BaseDeDonnees = {
  arbre: {
    Tables: {
      membres: Table<Membre, 'id' | 'email' | 'nom_affiche'>;
      lieux: Table<Lieu, 'libelle'>;
      personnes: Table<Personne>;
      unions: Table<Union>;
      filiations: Table<Filiation, 'union_id' | 'enfant_id'>;
      evenements: Table<Evenement, 'type'>;
      sources: Table<Source>;
      medias: Table<Media, 'chemin'>;
      medias_personnes: Table<MediaPersonne, 'media_id' | 'personne_id'>;
      souvenirs: Table<Souvenir, 'auteur_id' | 'titre' | 'recit'>;
      souvenirs_personnes: Table<SouvenirPersonne, 'souvenir_id' | 'personne_id'>;
      souvenirs_medias: Table<SouvenirMedia, 'souvenir_id' | 'media_id'>;
      recits: Table<Recit, 'auteur_id' | 'titre' | 'corps'>;
      recits_personnes: Table<RecitPersonne, 'recit_id' | 'personne_id'>;
      faits_historiques: Table<FaitHistorique, 'titre' | 'annee_debut'>;
      faits_personnes: Table<FaitPersonne, 'fait_id' | 'personne_id'>;
      chantiers_recherche: Table<ChantierRecherche, 'titre'>;
      commentaires: Table<Commentaire, 'auteur_id' | 'texte'>;
      notifications: Table<Notification, 'destinataire_id' | 'type' | 'titre'>;
      demandes_portrait_carte: Table<
        DemandePortraitCarte,
        'personne_id' | 'media_id' | 'demandeur_id'
      >;
      journal: Table<EntreeJournal, 'action' | 'table_cible'>;
    };
    Views: Record<string, never>;
    Functions: {
      est_membre_valide: { Args: Record<string, never>; Returns: boolean };
      est_admin: { Args: Record<string, never>; Returns: boolean };
      peut_contribuer: { Args: Record<string, never>; Returns: boolean };
      peut_deposer_photo_album: { Args: { p_personne_id: string }; Returns: boolean };
      personne_est_decedee: { Args: { p_personne_id: string }; Returns: boolean };
      assurer_fiche_membre: { Args: Record<string, never>; Returns: Membre };
    };
    Enums: {
      role_membre: RoleMembre;
      statut_membre: StatutMembre;
      niveau_preuve: NiveauPreuve;
      statut_moderation: StatutModeration;
      type_media: TypeMedia;
      sexe: Sexe;
      portee_fait: PorteeFait;
      statut_chantier: StatutChantier;
      type_evenement: TypeEvenement;
      precision_date: PrecisionDate;
      qualificatif_date: QualificatifDate;
    };
    CompositeTypes: Record<string, never>;
  };
};
