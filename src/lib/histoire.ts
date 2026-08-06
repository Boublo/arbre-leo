import { cache } from 'react';
import { creerClientServeur } from '@/lib/supabase/server';
import { formaterDate, lieuCourt } from '@/lib/arbre';
import type { PorteeFait } from '@/lib/types-base';

/**
 * La grande Histoire : chargement des faits et découpage en périodes.
 *
 * Une vie ne se lit pas hors de son époque. Une traversée de la Méditerranée,
 * un décès à vingt ans, un déménagement en catastrophe ne veulent rien dire
 * seuls : ce sont la misère andalouse, la Grande Guerre, la fin de l'Algérie
 * française. Ce module tient ce fond de tableau et relie chaque fait aux
 * personnes de l'arbre qui l'ont traversé.
 */

type ClientArbre = Awaited<ReturnType<typeof creerClientServeur>>;

const COLONNES =
  'id, titre, resume, description, annee_debut, mois_debut, jour_debut, annee_fin, lieu_id, lieu_libre, portee, branche, source_url';

/** Une personne de l'arbre et ce que le fait a changé pour elle. */
export type PersonneTouchee = {
  id: string;
  nomComplet: string;
  branches: string[];
  incidence: string | null;
};

export type Fait = {
  id: string;
  titre: string;
  resume: string | null;
  description: string | null;
  anneeDebut: number;
  anneeFin: number | null;
  /** « 1954 – 1962 », « 8 mai 1945 », « vers 1890 ». */
  dateTexte: string;
  lieu: string | null;
  lieuCourt: string | null;
  portee: PorteeFait;
  branche: string | null;
  sourceUrl: string | null;
  personnes: PersonneTouchee[];
};

type LigneFait = {
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
};

const MOTIF_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Périodes
// ---------------------------------------------------------------------------

export type Periode = {
  id: string;
  titre: string;
  chapeau: string;
  debut: number;
  /** Dernière année incluse ; `null` pour la période encore ouverte. */
  fin: number | null;
};

/**
 * Le découpage suit les ruptures qui ont réellement déplacé les deux familles,
 * pas les siècles ronds : c'est ce qui permet de lire l'arbre en face de son
 * époque plutôt qu'en face d'un calendrier.
 */
export const PERIODES: Periode[] = [
  {
    id: 'avant-1830',
    titre: 'Avant 1830',
    chapeau: 'Le temps des villages : la terre, la paroisse, et des registres tenus à la plume.',
    debut: 0,
    fin: 1829,
  },
  {
    id: '1830-1869',
    titre: '1830 – 1869',
    chapeau:
      'La conquête de l’Algérie ouvre une rive neuve. On y fonde des villages de colonisation pendant que l’Europe du Sud a faim.',
    debut: 1830,
    fin: 1869,
  },
  {
    id: '1870-1913',
    titre: '1870 – 1913',
    chapeau:
      'Le grand âge des départs : l’Andalousie passe la mer vers l’Oranie, les campagnes de l’Ouest et des Alpes se vident vers les villes.',
    debut: 1870,
    fin: 1913,
  },
  {
    id: '1914-1918',
    titre: '1914 – 1918',
    chapeau: 'La Grande Guerre prend les hommes de vingt ans, sur les deux rives de la Méditerranée.',
    debut: 1914,
    fin: 1918,
  },
  {
    id: '1919-1938',
    titre: '1919 – 1938',
    chapeau: 'L’entre-deux-guerres : reconstruire, s’installer, se faire naturaliser, ouvrir un commerce.',
    debut: 1919,
    fin: 1938,
  },
  {
    id: '1939-1945',
    titre: '1939 – 1945',
    chapeau: 'La Seconde Guerre mondiale, l’Occupation, puis le débarquement d’Afrique du Nord.',
    debut: 1939,
    fin: 1945,
  },
  {
    id: '1946-1962',
    titre: '1946 – 1962',
    chapeau: 'La guerre d’Algérie, l’été 1962 et le rapatriement : une famille entière change de pays.',
    debut: 1946,
    fin: 1962,
  },
  {
    id: '1963-1989',
    titre: '1963 – 1989',
    chapeau: 'Recommencer ailleurs : l’industrie, les grands ensembles, l’école pour tous.',
    debut: 1963,
    fin: 1989,
  },
  {
    id: 'depuis-1990',
    titre: 'Depuis 1990',
    chapeau: 'L’époque dont la famille se souvient encore de première main.',
    debut: 1990,
    fin: null,
  },
];

export type GroupePeriode = { periode: Periode; faits: Fait[] };

/** Range les faits dans leur période et jette les périodes restées vides. */
export function repartirParPeriode(faits: Fait[]): GroupePeriode[] {
  const groupes: GroupePeriode[] = PERIODES.map((periode) => ({ periode, faits: [] }));

  for (const fait of faits) {
    const rang = groupes.findIndex(
      ({ periode }) =>
        fait.anneeDebut >= periode.debut && (periode.fin === null || fait.anneeDebut <= periode.fin)
    );
    // Un fait antérieur au premier repère est versé dans la première période
    // plutôt que perdu en silence.
    const groupe = groupes[rang >= 0 ? rang : 0];
    if (groupe) groupe.faits.push(fait);
  }

  return groupes.filter((groupe) => groupe.faits.length > 0);
}

// ---------------------------------------------------------------------------
// Mise en forme
// ---------------------------------------------------------------------------

/** « 1954 – 1962 » quand le fait dure, « 8 mai 1945 » quand il tient en un jour. */
export function formaterPeriodeFait(ligne: {
  annee_debut: number;
  mois_debut: number | null;
  jour_debut: number | null;
  annee_fin: number | null;
}): string {
  const debut = formaterDate({
    annee: ligne.annee_debut,
    mois: ligne.mois_debut,
    jour: ligne.jour_debut,
  });

  if (ligne.annee_fin && ligne.annee_fin !== ligne.annee_debut) {
    return `${debut} – ${ligne.annee_fin}`;
  }
  return debut;
}

// ---------------------------------------------------------------------------
// Chargement
// ---------------------------------------------------------------------------

/**
 * La table peut ne pas exister encore sur une base fraîchement montée : on
 * préfère alors l'état d'accueil à une page d'erreur. Toute autre erreur remonte.
 */
function tableAbsente(erreur: { code?: string; message?: string } | null): boolean {
  if (!erreur) return false;
  if (erreur.code === '42P01' || erreur.code === 'PGRST205') return true;
  const message = erreur.message?.toLowerCase() ?? '';
  return message.includes('does not exist') || message.includes('could not find the table');
}

async function chargerLieux(supabase: ClientArbre, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from('lieux').select('id, libelle').in('id', ids);
  return new Map((data ?? []).map((lieu) => [lieu.id, lieu.libelle]));
}

/**
 * Les rattachements et les personnes sont lus séparément : une personne
 * masquée par les politiques RLS disparaît alors de la liste sans faire échouer
 * la page — c'est le comportement voulu, la base fait foi.
 */
async function chargerPersonnesTouchees(
  supabase: ClientArbre,
  idsFaits: string[]
): Promise<Map<string, PersonneTouchee[]>> {
  const parFait = new Map<string, PersonneTouchee[]>();
  if (idsFaits.length === 0) return parFait;

  const { data: liens } = await supabase
    .from('faits_personnes')
    .select('fait_id, personne_id, incidence')
    .in('fait_id', idsFaits);

  const lignes = liens ?? [];
  const idsPersonnes = [...new Set(lignes.map((lien) => lien.personne_id))];
  if (idsPersonnes.length === 0) return parFait;

  const { data: personnes } = await supabase
    .from('personnes')
    .select('id, nom_complet, prenoms, nom, branches')
    .in('id', idsPersonnes);

  const parId = new Map((personnes ?? []).map((p) => [p.id, p]));

  for (const lien of lignes) {
    const personne = parId.get(lien.personne_id);
    if (!personne) continue;

    const liste = parFait.get(lien.fait_id) ?? [];
    liste.push({
      id: personne.id,
      nomComplet: personne.nom_complet?.trim() || personne.prenoms || personne.nom || 'Inconnu',
      branches: personne.branches ?? [],
      incidence: lien.incidence,
    });
    parFait.set(lien.fait_id, liste);
  }

  for (const liste of parFait.values()) {
    liste.sort((a, b) => a.nomComplet.localeCompare(b.nomComplet, 'fr'));
  }

  return parFait;
}

function assembler(ligne: LigneFait, lieux: Map<string, string>, personnes: PersonneTouchee[]): Fait {
  const libelle = (ligne.lieu_id ? lieux.get(ligne.lieu_id) : null) ?? ligne.lieu_libre ?? null;

  return {
    id: ligne.id,
    titre: ligne.titre,
    resume: ligne.resume,
    description: ligne.description,
    anneeDebut: ligne.annee_debut,
    anneeFin: ligne.annee_fin,
    dateTexte: formaterPeriodeFait(ligne),
    lieu: libelle,
    lieuCourt: lieuCourt(libelle),
    portee: ligne.portee,
    branche: ligne.branche,
    sourceUrl: ligne.source_url,
    personnes,
  };
}

/** Tous les faits, du plus ancien au plus récent, avec les personnes rattachées. */
export async function chargerFaits(): Promise<Fait[]> {
  const supabase = await creerClientServeur();

  const { data, error } = await supabase
    .from('faits_historiques')
    .select(COLONNES)
    .order('annee_debut', { ascending: true })
    .order('mois_debut', { ascending: true, nullsFirst: true })
    .order('titre', { ascending: true });

  if (error) {
    if (tableAbsente(error)) return [];
    throw new Error(`Chargement de la grande Histoire impossible : ${error.message}`);
  }

  const lignes = (data ?? []) as LigneFait[];
  if (lignes.length === 0) return [];

  const [lieux, personnes] = await Promise.all([
    chargerLieux(
      supabase,
      [...new Set(lignes.map((l) => l.lieu_id).filter((id): id is string => id !== null))]
    ),
    chargerPersonnesTouchees(supabase, lignes.map((l) => l.id)),
  ]);

  return lignes.map((ligne) => assembler(ligne, lieux, personnes.get(ligne.id) ?? []));
}

/**
 * Deux faits de la grande Histoire pour ouvrir le livre de famille.
 * Portée nationale / mondiale uniquement — pas de personnes rattachées
 * (le dépôt est public ; les noms restent en base).
 */
export type FaitChapitre = Pick<
  Fait,
  'id' | 'titre' | 'resume' | 'dateTexte' | 'anneeDebut' | 'portee' | 'lieuCourt'
>;

export async function chargerChapitreAccueil(combien = 2): Promise<FaitChapitre[]> {
  const supabase = await creerClientServeur();

  const { data, error } = await supabase
    .from('faits_historiques')
    .select(
      'id, titre, resume, annee_debut, mois_debut, jour_debut, annee_fin, lieu_id, lieu_libre, portee'
    )
    .in('portee', ['mondial', 'national'])
    .order('annee_debut', { ascending: true })
    .limit(40);

  if (error) {
    if (tableAbsente(error)) return [];
    throw new Error(`Chargement du chapitre d’accueil impossible : ${error.message}`);
  }

  const lignes = (data ?? []) as LigneFait[];
  if (lignes.length === 0) return [];

  const lieux = await chargerLieux(
    supabase,
    [...new Set(lignes.map((l) => l.lieu_id).filter((id): id is string => id !== null))]
  );

  // Préférer les ruptures déjà encadrées par PERIODES (guerres, rapatriements…).
  const anneesCles = new Set<number>();
  for (const p of PERIODES) {
    if (p.debut >= 1870) {
      for (let a = p.debut; a <= (p.fin ?? p.debut + 20); a += 1) anneesCles.add(a);
    }
  }

  const notes = lignes.map((ligne) => {
    const dansCle = anneesCles.has(ligne.annee_debut) ? 0 : 1;
    const aResume = ligne.resume?.trim() ? 0 : 1;
    return { ligne, note: dansCle * 2 + aResume };
  });

  notes.sort(
    (a, b) =>
      a.note - b.note || a.ligne.annee_debut - b.ligne.annee_debut
  );

  return notes.slice(0, combien).map(({ ligne }) => {
    const libelle =
      (ligne.lieu_id ? lieux.get(ligne.lieu_id) : null) ?? ligne.lieu_libre ?? null;
    return {
      id: ligne.id,
      titre: ligne.titre,
      resume: ligne.resume,
      dateTexte: formaterPeriodeFait(ligne),
      anneeDebut: ligne.annee_debut,
      portee: ligne.portee,
      lieuCourt: lieuCourt(libelle),
    };
  });
}

/**
 * Un fait et son entourage. `null` si l'identifiant est inconnu ou hors de portée.
 * Mis en cache le temps de la requête : la fiche l'appelle deux fois, une fois
 * pour son titre de page, une fois pour son contenu.
 */
export const chargerFait = cache(async (id: string): Promise<Fait | null> => {
  // Un identifiant mal formé ferait échouer la requête côté Postgres : on
  // préfère répondre « inconnu » et laisser la page afficher un 404 propre.
  if (!MOTIF_UUID.test(id)) return null;

  const supabase = await creerClientServeur();

  const { data, error } = await supabase
    .from('faits_historiques')
    .select(COLONNES)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (tableAbsente(error)) return null;
    throw new Error(`Chargement du fait impossible : ${error.message}`);
  }
  if (!data) return null;

  const ligne = data as LigneFait;
  const [lieux, personnes] = await Promise.all([
    chargerLieux(supabase, ligne.lieu_id ? [ligne.lieu_id] : []),
    chargerPersonnesTouchees(supabase, [ligne.id]),
  ]);

  return assembler(ligne, lieux, personnes.get(ligne.id) ?? []);
});

/**
 * Le droit d'enrichir, tel que la base le voit. Ce n'est qu'un confort
 * d'affichage : c'est la politique RLS qui autorise ou refuse l'écriture.
 */
export const peutContribuer = cache(async (): Promise<boolean> => {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: membre } = await supabase
    .from('membres')
    .select('role, statut')
    .eq('id', user.id)
    .maybeSingle();

  return membre?.statut === 'valide' && (membre.role === 'admin' || membre.role === 'contributeur');
});

/** Les personnes proposées au rattachement, par ordre alphabétique. */
export async function chargerPersonnesAChoisir(): Promise<{ id: string; nomComplet: string }[]> {
  const supabase = await creerClientServeur();

  const { data } = await supabase.from('personnes').select('id, nom_complet, prenoms, nom');

  return (data ?? [])
    .map((p) => ({
      id: p.id,
      nomComplet: p.nom_complet?.trim() || p.prenoms || p.nom || 'Sans nom',
    }))
    .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet, 'fr'));
}
