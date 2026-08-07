import type { SupabaseClient } from '@supabase/supabase-js';
import type { BaseDeDonnees } from '@/lib/types-base';

/** Union enregistrée dont aucune descendance n'est encore saisie. */
export type UnionSansEnfant = {
  id: string;
  branches: string[];
  conjointA: { id: string; nom: string; anneeNaissance: number | null } | null;
  conjointB: { id: string; nom: string; anneeNaissance: number | null } | null;
  mariage: { annee: number | null; mois: number | null; jour: number | null } | null;
  notes: string | null;
};

type ClientArbre = SupabaseClient<BaseDeDonnees, 'arbre'>;

/**
 * Couples mariés (ou constitués) sans enfant en base — pistes de recherche
 * évidentes pour compléter la descendance.
 *
 * On exclut les unions où les deux conjoints connus sont mineurs au moment du
 * mariage ou n'ont pas encore l'âge d'avoir des enfants aujourd'hui, sauf si
 * l'union porte une note documentée (acte, ANOM, etc.).
 */
export async function listerUnionsSansEnfant(
  supabase: ClientArbre
): Promise<UnionSansEnfant[]> {
  const anneeCourante = new Date().getFullYear();

  const [unionsRes, filiationsRes, evenementsRes, naissancesRes] = await Promise.all([
    supabase.from('unions').select('id, conjoint_a, conjoint_b, branches, notes'),
    supabase.from('filiations').select('union_id'),
    supabase
      .from('evenements')
      .select('union_id, annee, mois, jour')
      .eq('type', 'mariage'),
    supabase.from('evenements').select('personne_id, annee').eq('type', 'naissance'),
  ]);

  if (unionsRes.error) throw unionsRes.error;
  if (filiationsRes.error) throw filiationsRes.error;
  if (evenementsRes.error) throw evenementsRes.error;
  if (naissancesRes.error) throw naissancesRes.error;

  const unionsAvecEnfants = new Set(
    (filiationsRes.data ?? []).map((f) => f.union_id)
  );

  const mariages = new Map(
    (evenementsRes.data ?? []).map((e) => [
      e.union_id,
      { annee: e.annee, mois: e.mois, jour: e.jour },
    ])
  );

  const naissances = new Map(
    (naissancesRes.data ?? []).map((e) => [e.personne_id, e.annee])
  );

  const idsConjoints = new Set<string>();
  for (const u of unionsRes.data ?? []) {
    if (u.conjoint_a) idsConjoints.add(u.conjoint_a);
    if (u.conjoint_b) idsConjoints.add(u.conjoint_b);
  }

  const personnesRes = idsConjoints.size
    ? await supabase
        .from('personnes')
        .select('id, nom_complet, prenoms, nom')
        .in('id', [...idsConjoints])
    : { data: [], error: null };

  if (personnesRes.error) throw personnesRes.error;

  const noms = new Map(
    (personnesRes.data ?? []).map((p) => [
      p.id,
      p.nom_complet?.trim() || [p.prenoms, p.nom].filter(Boolean).join(' ') || 'Sans nom',
    ])
  );

  const ageDe = (id: string | null, anneeRef: number): number | null => {
    if (!id) return null;
    const annee = naissances.get(id);
    return annee == null ? null : anneeRef - annee;
  };

  const resultat: UnionSansEnfant[] = [];

  for (const u of unionsRes.data ?? []) {
    if (unionsAvecEnfants.has(u.id)) continue;

    const mariage = mariages.get(u.id) ?? null;

    // Union fantôme (un seul conjoint, pas de mariage enregistré) : ce n'est pas
    // un couple à compléter mais une hypothèse de filiation en attente de preuve.
    const coupleComplet = u.conjoint_a && u.conjoint_b;
    if (!coupleComplet && !mariage?.annee) continue;

    const anneeRef = mariage?.annee ?? anneeCourante;

    const ageA = ageDe(u.conjoint_a, anneeRef);
    const ageB = ageDe(u.conjoint_b, anneeRef);

    const auMoinsUnMajeur =
      (ageA !== null && ageA > 18) ||
      (ageB !== null && ageB > 18) ||
      ageA === null ||
      ageB === null;

    if (!auMoinsUnMajeur) continue;

    resultat.push({
      id: u.id,
      branches: u.branches ?? [],
      conjointA: u.conjoint_a
        ? {
            id: u.conjoint_a,
            nom: noms.get(u.conjoint_a) ?? 'Conjoint',
            anneeNaissance: naissances.get(u.conjoint_a) ?? null,
          }
        : null,
      conjointB: u.conjoint_b
        ? {
            id: u.conjoint_b,
            nom: noms.get(u.conjoint_b) ?? 'Conjoint',
            anneeNaissance: naissances.get(u.conjoint_b) ?? null,
          }
        : null,
      mariage,
      notes: u.notes,
    });
  }

  return resultat.sort((a, b) => {
    const anneeA = a.mariage?.annee ?? 9999;
    const anneeB = b.mariage?.annee ?? 9999;
    if (anneeA !== anneeB) return anneeA - anneeB;
    const nomA = a.conjointA?.nom ?? a.conjointB?.nom ?? '';
    const nomB = b.conjointA?.nom ?? b.conjointB?.nom ?? '';
    return nomA.localeCompare(nomB, 'fr');
  });
}

/** Extrait la première piste utile des notes d'union (ligne [ACTE], [ANOM], etc.). */
export function pisteUnion(union: UnionSansEnfant): string | null {
  if (!union.notes?.trim()) return null;
  const ligne = union.notes
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith('[RATTACHEMENT'));
  if (!ligne) return null;
  return ligne.length > 140 ? `${ligne.slice(0, 137)}…` : ligne;
}

/** Libellé lisible d'un couple pour l'affichage. */
export function libelleCouple(union: UnionSansEnfant): string {
  const a = union.conjointA?.nom;
  const b = union.conjointB?.nom;
  if (a && b) return `${a} × ${b}`;
  if (a) return a;
  if (b) return b;
  return 'Couple sans nom';
}

/**
 * Lien vers le formulaire d'ajout, parents pré-remplis selon la convention
 * de l'application (conjoint_a = père, conjoint_b = mère).
 */
export function urlAjoutEnfant(union: UnionSansEnfant): string | null {
  const params = new URLSearchParams();
  if (union.conjointA) params.set('pere', union.conjointA.id);
  if (union.conjointB) params.set('mere', union.conjointB.id);
  if ([...params.keys()].length === 0) return null;
  return `/personne/nouvelle?${params}`;
}

/** Date de mariage formatée si connue. */
export function dateMariageLisible(union: UnionSansEnfant): string | null {
  const { mariage } = union;
  if (!mariage?.annee) return null;
  const parts: string[] = [];
  if (mariage.jour) parts.push(String(mariage.jour).padStart(2, '0'));
  if (mariage.mois) parts.push(String(mariage.mois).padStart(2, '0'));
  parts.push(String(mariage.annee));
  return parts.join('/');
}
