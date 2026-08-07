import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ARBRE_VIDE,
  assemblerDonneesArbre,
  type DonneesArbre,
  type EntreesAssemblerArbre,
  type OptionsChargementArbre,
} from '@/lib/arbre';
import { PROFONDEUR_CONTEXTE_FICHE } from '@/lib/arbre-graphe';
import { creerClientServeur } from '@/lib/supabase/server';
import type { BaseDeDonnees } from '@/lib/types-base';

/**
 * Chargement ciblé pour les fiches personne (audit v1.2 — B3).
 *
 * Au lieu de `chargerArbre()` qui ramène toute la base, on ne charge que le
 * voisinage utile à la barre de parenté, au mini-arbre et à la navigation
 * contextuelle. Le résumé de branche passe par `chargerDonneesResumeBranche`.
 */

const COLONNES_PERSONNE =
  'id, code_gedcom, prenoms, nom, nom_complet, surnom, sexe, branches, niveaux_preuve, presume_vivant, notes, photo_id';

const TYPES_EVENEMENT_RESUME = ['naissance', 'deces', 'inhumation', 'profession', 'mariage'] as const;

type LigneUnion = { id: string; conjoint_a: string | null; conjoint_b: string | null };
type LigneFiliation = { union_id: string; enfant_id: string };

type Adjacence = {
  unions: Map<string, LigneUnion & { enfants: string[] }>;
  parents: Map<string, string[]>;
  enfants: Map<string, string[]>;
  issuDe: Map<string, string>;
  unionsParPersonne: Map<string, string[]>;
};

function construireAdjacence(
  lignesUnions: LigneUnion[],
  lignesFiliations: LigneFiliation[]
): Adjacence {
  const unions = new Map<string, LigneUnion & { enfants: string[] }>();
  for (const u of lignesUnions) {
    unions.set(u.id, { ...u, enfants: [] });
  }

  const parents = new Map<string, string[]>();
  const enfants = new Map<string, string[]>();
  const issuDe = new Map<string, string>();

  for (const f of lignesFiliations) {
    const union = unions.get(f.union_id);
    if (!union) continue;

    union.enfants.push(f.enfant_id);
    issuDe.set(f.enfant_id, f.union_id);

    const listeParents = parents.get(f.enfant_id) ?? [];
    for (const parentId of [union.conjoint_a, union.conjoint_b]) {
      if (!parentId) continue;
      listeParents.push(parentId);
      const listeEnfants = enfants.get(parentId) ?? [];
      listeEnfants.push(f.enfant_id);
      enfants.set(parentId, listeEnfants);
    }
    parents.set(f.enfant_id, listeParents);
  }

  const unionsParPersonne = new Map<string, string[]>();
  for (const u of unions.values()) {
    for (const conjoint of [u.conjoint_a, u.conjoint_b]) {
      if (!conjoint) continue;
      const liste = unionsParPersonne.get(conjoint) ?? [];
      liste.push(u.id);
      unionsParPersonne.set(conjoint, liste);
    }
  }

  return { unions, parents, enfants, issuDe, unionsParPersonne };
}

function voisinsAdjacence(adj: Adjacence, id: string): string[] {
  const voisins: string[] = [];

  for (const parentId of adj.parents.get(id) ?? []) voisins.push(parentId);
  for (const enfantId of adj.enfants.get(id) ?? []) voisins.push(enfantId);

  const unionNaissance = adj.issuDe.get(id);
  if (unionNaissance) {
    for (const frere of adj.unions.get(unionNaissance)?.enfants ?? []) {
      if (frere !== id) voisins.push(frere);
    }
  }

  for (const unionId of adj.unionsParPersonne.get(id) ?? []) {
    const union = adj.unions.get(unionId);
    if (!union) continue;
    for (const conjoint of [union.conjoint_a, union.conjoint_b]) {
      if (conjoint && conjoint !== id) voisins.push(conjoint);
    }
    for (const enfantId of union.enfants) voisins.push(enfantId);
  }

  return [...new Set(voisins)];
}

function collecterIdsVoisinage(
  adj: Adjacence,
  racineId: string,
  profondeurMax: number
): Set<string> {
  const ids = new Set<string>([racineId]);
  let frontiere = [racineId];

  for (let profondeur = 0; profondeur < profondeurMax; profondeur++) {
    const suivante: string[] = [];
    for (const id of frontiere) {
      for (const voisinId of voisinsAdjacence(adj, id)) {
        if (ids.has(voisinId)) continue;
        ids.add(voisinId);
        suivante.push(voisinId);
      }
    }
    if (suivante.length === 0) break;
    frontiere = suivante;
  }

  return ids;
}

async function chargerLignesAdjacence(
  supabase: SupabaseClient<BaseDeDonnees, 'arbre'>
): Promise<{ unions: LigneUnion[]; filiations: LigneFiliation[] }> {
  const [unionsRes, filiationsRes] = await Promise.all([
    supabase.from('unions').select('id, conjoint_a, conjoint_b'),
    supabase.from('filiations').select('union_id, enfant_id'),
  ]);

  const erreur = unionsRes.error ?? filiationsRes.error;
  if (erreur) throw new Error(`Adjacence impossible : ${erreur.message}`);

  return {
    unions: unionsRes.data ?? [],
    filiations: filiationsRes.data ?? [],
  };
}

function unionsPourIds(
  adj: Adjacence,
  ids: Set<string>
): { unions: LigneUnion[]; filiations: LigneFiliation[] } {
  const unions: LigneUnion[] = [];
  const filiations: LigneFiliation[] = [];

  for (const union of adj.unions.values()) {
    const touche =
      (union.conjoint_a && ids.has(union.conjoint_a)) ||
      (union.conjoint_b && ids.has(union.conjoint_b)) ||
      union.enfants.some((enfantId) => ids.has(enfantId));
    if (!touche) continue;

    unions.push({
      id: union.id,
      conjoint_a: union.conjoint_a,
      conjoint_b: union.conjoint_b,
    });
    for (const enfantId of union.enfants) {
      if (ids.has(enfantId)) {
        filiations.push({ union_id: union.id, enfant_id: enfantId });
      }
    }
  }

  return { unions, filiations };
}

async function chargerArbrePourIds(
  supabase: SupabaseClient<BaseDeDonnees, 'arbre'>,
  ids: Set<string>,
  adj: Adjacence,
  options: OptionsChargementArbre = {}
): Promise<DonneesArbre> {
  if (ids.size === 0) return ARBRE_VIDE;

  const listeIds = [...ids];
  const { unions: lignesUnions, filiations: lignesFiliations } = unionsPourIds(adj, ids);

  const idsUnions = lignesUnions.map((u) => u.id);
  const [personnesRes, evenementsPersonnesRes, evenementsUnionsRes] = await Promise.all([
    supabase.from('personnes').select(COLONNES_PERSONNE).in('id', listeIds),
    supabase
      .from('evenements')
      .select(
        'personne_id, union_id, type, annee, mois, jour, annee_fin, qualificatif, date_texte, detail, lieu_id, lieux(libelle)'
      )
      .in('personne_id', listeIds)
      .in('type', [...TYPES_EVENEMENT_RESUME]),
    idsUnions.length > 0
      ? supabase
          .from('evenements')
          .select(
            'personne_id, union_id, type, annee, mois, jour, annee_fin, qualificatif, date_texte, detail, lieu_id, lieux(libelle)'
          )
          .in('union_id', idsUnions)
          .in('type', [...TYPES_EVENEMENT_RESUME])
      : Promise.resolve({ data: [], error: null }),
  ]);

  const erreur =
    personnesRes.error ?? evenementsPersonnesRes.error ?? evenementsUnionsRes.error;
  if (erreur) throw new Error(`Chargement partiel impossible : ${erreur.message}`);

  const evenements = [...(evenementsPersonnesRes.data ?? []), ...(evenementsUnionsRes.data ?? [])];

  return assemblerDonneesArbre({
    lignesPersonnes: personnesRes.data ?? [],
    lignesUnions,
    lignesFiliations,
    lignesEvenements: evenements as unknown as EntreesAssemblerArbre['lignesEvenements'],
    options,
    supabase,
  });
}

const chargerContexteFicheEnCache = cache(
  async (personneId: string): Promise<DonneesArbre> => {
    const supabase = await creerClientServeur();

    const { data: existe, error: erreurExiste } = await supabase
      .from('personnes')
      .select('id')
      .eq('id', personneId)
      .maybeSingle();
    if (erreurExiste) throw new Error(erreurExiste.message);
    if (!existe) return ARBRE_VIDE;

    const { unions, filiations } = await chargerLignesAdjacence(supabase);
    const adj = construireAdjacence(unions, filiations);
    const ids = collecterIdsVoisinage(adj, personneId, PROFONDEUR_CONTEXTE_FICHE);

    return chargerArbrePourIds(supabase, ids, adj, { signerPhotosPour: 'aucun' });
  }
);

/** Sous-graphe autour d'une personne pour la fiche (barre parenté, mini-arbre). */
export async function chargerContexteFiche(personneId: string): Promise<DonneesArbre> {
  return chargerContexteFicheEnCache(personneId);
}

const chargerDonneesResumeBrancheEnCache = cache(
  async (personneId: string): Promise<DonneesArbre> => {
    const supabase = await creerClientServeur();

    const { data: focus, error: erreurFocus } = await supabase
      .from('personnes')
      .select('id, branches')
      .eq('id', personneId)
      .maybeSingle();
    if (erreurFocus) throw new Error(erreurFocus.message);
    if (!focus) return ARBRE_VIDE;

    const branches = focus.branches ?? [];
    const [{ unions, filiations }, personnesBrancheRes] = await Promise.all([
      chargerLignesAdjacence(supabase),
      branches.length > 0
        ? supabase.from('personnes').select(COLONNES_PERSONNE).overlaps('branches', branches)
        : supabase.from('personnes').select(COLONNES_PERSONNE).eq('id', personneId),
    ]);

    if (personnesBrancheRes.error) {
      throw new Error(`Branche impossible : ${personnesBrancheRes.error.message}`);
    }

    const lignesPersonnes = personnesBrancheRes.data ?? [];
    const idsBranche = new Set(lignesPersonnes.map((p) => p.id));
    if (!idsBranche.has(personneId) && branches.length === 0) {
      idsBranche.add(personneId);
    }

    const evenementsRes =
      idsBranche.size > 0
        ? await supabase
            .from('evenements')
            .select(
              'personne_id, union_id, type, annee, mois, jour, annee_fin, qualificatif, date_texte, detail, lieu_id, lieux(libelle)'
            )
            .in('personne_id', [...idsBranche])
            .in('type', [...TYPES_EVENEMENT_RESUME])
        : { data: [], error: null };

    if (evenementsRes.error) throw new Error(`Événements branche : ${evenementsRes.error.message}`);

    const donneesBranche = await assemblerDonneesArbre({
      lignesPersonnes,
      lignesUnions: unions,
      lignesFiliations: filiations,
      lignesEvenements: (evenementsRes.data ?? []) as unknown as EntreesAssemblerArbre['lignesEvenements'],
      options: { signerPhotosPour: 'aucun' },
      supabase,
    });

    return donneesBranche;
  }
);

/**
 * Données pour `resumerBranche` : personnes de la branche + adjacence complète
 * pour compter ascendants/descendants sans charger toute la base.
 */
export async function chargerDonneesResumeBranche(personneId: string): Promise<DonneesArbre> {
  return chargerDonneesResumeBrancheEnCache(personneId);
}
