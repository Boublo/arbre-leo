import { NextResponse } from 'next/server';
import { creerClientServeur } from '@/lib/supabase/server';

/**
 * Export JSON — le graphe complet, tel que la base le voit.
 *
 * C’est la sortie pour les développeurs et les outils d’analyse à venir :
 * personnes, unions, filiations, événements, lieux et sources, dans leur forme
 * brute. Les identifiants suffisent à recomposer les liens.
 *
 * Comme pour le CSV, la porte est fermée à qui n’est pas membre validé. Les
 * politiques RLS écartent déjà les fiches confidentielles pour un non-admin,
 * et on masque en plus les dates des personnes présumées vivantes — les
 * colonnes existent, elles restent seulement vides.
 */

type EvenementRow = {
  id: string;
  personne_id: string | null;
  union_id: string | null;
  type: string;
  libelle: string | null;
  detail: string | null;
  date_texte: string | null;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  annee_fin: number | null;
  qualificatif: string;
  precision_date: string;
  lieu_id: string | null;
  niveau_preuve: string | null;
  notes: string | null;
  date_tri: string | null;
  cree_par: string | null;
  cree_le: string;
};

export async function GET() {
  const supabase = await creerClientServeur();

  const { data: estMembre } = await supabase.rpc('est_membre_valide');
  if (estMembre !== true) {
    return NextResponse.json(
      { erreur: 'Accès réservé aux membres validés.' },
      { status: 403 }
    );
  }

  const { data: estAdminData } = await supabase.rpc('est_admin');
  const estAdmin = estAdminData === true;

  const [personnesRes, unionsRes, filiationsRes, evenementsRes, lieuxRes, sourcesRes] =
    await Promise.all([
      supabase
        .from('personnes')
        .select(
          'id, code_gedcom, branches, prenoms, nom, nom_naissance, surnom, sexe, notes, niveaux_preuve, presume_vivant, confidentiel, photo_id, nom_complet, cree_le, modifie_le'
        ),
      supabase
        .from('unions')
        .select(
          'id, code_gedcom, conjoint_a, conjoint_b, branches, notes, niveaux_preuve, cree_le, modifie_le'
        ),
      supabase.from('filiations').select('id, union_id, enfant_id, nature, cree_le'),
      supabase
        .from('evenements')
        .select(
          'id, personne_id, union_id, type, libelle, detail, date_texte, annee, mois, jour, annee_fin, qualificatif, precision_date, lieu_id, niveau_preuve, notes, date_tri, cree_par, cree_le'
        ),
      supabase
        .from('lieux')
        .select(
          'id, libelle, lieu_dit, commune, departement, region, pays, pays_actuel, latitude, longitude, note, cree_le'
        ),
      supabase
        .from('sources')
        .select(
          'id, personne_id, union_id, evenement_id, titre, texte, page, cote, depot, url, niveau_preuve, cree_par, cree_le'
        ),
    ]);

  const erreur =
    personnesRes.error ??
    unionsRes.error ??
    filiationsRes.error ??
    evenementsRes.error ??
    lieuxRes.error ??
    sourcesRes.error;
  if (erreur) {
    return NextResponse.json(
      { erreur: `Export JSON impossible : ${erreur.message}` },
      { status: 500 }
    );
  }

  let personnes = personnesRes.data ?? [];
  let evenements = (evenementsRes.data ?? []) as EvenementRow[];
  let sources = sourcesRes.data ?? [];

  if (!estAdmin) {
    // Défense en profondeur : la RLS filtre déjà les fiches confidentielles.
    const cachees = new Set(personnes.filter((p) => p.confidentiel).map((p) => p.id));
    personnes = personnes.filter((p) => !cachees.has(p.id));

    // Coupe les événements et sources rattachés aux fiches écartées.
    if (cachees.size > 0) {
      evenements = evenements.filter(
        (e) => !e.personne_id || !cachees.has(e.personne_id)
      );
      sources = sources.filter(
        (s) => !s.personne_id || !cachees.has(s.personne_id)
      );
    }

    // Masque les dates des vivants : les colonnes existent, elles restent nulles.
    const vivants = new Set(personnes.filter((p) => p.presume_vivant).map((p) => p.id));
    if (vivants.size > 0) {
      evenements = evenements.map((e) =>
        e.personne_id && vivants.has(e.personne_id)
          ? {
              ...e,
              annee: null,
              mois: null,
              jour: null,
              annee_fin: null,
              date_texte: null,
              date_tri: null,
            }
          : e
      );
    }
  }

  const corps = {
    personnes,
    unions: unionsRes.data ?? [],
    filiations: filiationsRes.data ?? [],
    evenements,
    lieux: lieuxRes.data ?? [],
    sources,
  };

  return NextResponse.json(corps, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="arbre-leo.json"',
      'Cache-Control': 'private, no-store',
    },
  });
}
