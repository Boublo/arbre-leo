import { NextResponse } from 'next/server';
import { creerClientServeur } from '@/lib/supabase/server';
import { NOM_DU_SITE } from '@/lib/site';
import type {
  Evenement,
  Filiation,
  Personne,
  Source,
  TypeEvenement,
  Union,
} from '@/lib/types-base';

/**
 * Export GEDCOM 5.5.1.
 *
 * Reconstruit un fichier GEDCOM lignage-lié à partir du contenu de la base :
 * personnes, unions, filiations, événements et sources. Le fichier suit le
 * standard 5.5.1 (encodage UTF-8, sauts de ligne \n, CONT/CONC pour les
 * longues valeurs) et sort en pièce jointe.
 *
 * Deux règles de confidentialité s'appliquent aux non-administrateurs :
 *   — les personnes marquées `confidentiel` sont retirées, ainsi que les
 *     unions, filiations, événements et sources qui les concernent ;
 *   — les personnes `presume_vivant` sont conservées mais leurs événements
 *     personnels perdent date et lieu (l'existence de l'événement reste).
 *
 * Les politiques RLS de Postgres restent l'autorité finale : ce filtrage
 * côté application n'est qu'un garde-fou supplémentaire.
 */

// ---------------------------------------------------------------------------
// Vocabulaire GEDCOM
// ---------------------------------------------------------------------------

const MOIS_GED = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/** Événements portés par un individu (INDI) et leur balise GEDCOM. */
const TAGS_PERSONNE: Partial<Record<TypeEvenement, string>> = {
  naissance: 'BIRT',
  bapteme: 'BAPM',
  deces: 'DEAT',
  inhumation: 'BURI',
  cremation: 'CREM',
  profession: 'OCCU',
  residence: 'RESI',
  recensement: 'CENS',
  emigration: 'EMIG',
  immigration: 'IMMI',
  naturalisation: 'NATU',
  service_militaire: 'EVEN',
  education: 'EDUC',
  distinction: 'EVEN',
  maladie: 'EVEN',
  autre: 'EVEN',
};

/** Événements portés par une union (FAM). */
const TAGS_UNION: Partial<Record<TypeEvenement, string>> = {
  mariage: 'MARR',
  union_libre: 'EVEN',
  fiancailles: 'ENGA',
  divorce: 'DIV',
};

/** Libellé à mettre en `TYPE` lorsque la balise est le générique `EVEN`. */
const TYPE_LIBELLE: Partial<Record<TypeEvenement, string>> = {
  service_militaire: 'Service militaire',
  distinction: 'Distinction',
  maladie: 'Maladie',
  autre: 'Autre',
  union_libre: 'Union libre',
};

// ---------------------------------------------------------------------------
// Écriture des lignes GEDCOM
// ---------------------------------------------------------------------------

/** Longueur cible d'une ligne : le standard autorise 255 octets, on découpe à 80. */
const LONGUEUR_MAX = 80;

/**
 * Un `@` en tête de valeur est le préfixe d'un pointeur : on le double pour
 * indiquer qu'il s'agit d'un simple caractère.
 */
function echapperArobase(valeur: string): string {
  return valeur.startsWith('@') ? `@${valeur}` : valeur;
}

function estPointeur(valeur: string): boolean {
  return /^@[^@\s]+@$/.test(valeur);
}

/**
 * Découpe un texte quelconque en un ou plusieurs enregistrements :
 *   — les sauts de ligne deviennent des balises `CONT` (niveau suivant) ;
 *   — les longues lignes sont découpées à `LONGUEUR_MAX` par des `CONC`.
 */
function poserTexte(sortie: string[], niveau: number, tag: string, texte: string): void {
  const morceaux = texte.replace(/\r\n/g, '\n').split('\n');

  morceaux.forEach((morceau, indexLigne) => {
    let reste = echapperArobase(morceau);
    let premierDeCeMorceau = true;

    do {
      const balise =
        premierDeCeMorceau && indexLigne === 0
          ? tag
          : premierDeCeMorceau
            ? 'CONT'
            : 'CONC';
      const niveauCourant = premierDeCeMorceau && indexLigne === 0 ? niveau : niveau + 1;
      const prefixe = `${niveauCourant} ${balise} `;
      const dispo = Math.max(1, LONGUEUR_MAX - prefixe.length);
      const partie = reste.slice(0, dispo);
      reste = reste.slice(dispo);
      sortie.push(`${prefixe}${partie}`);
      premierDeCeMorceau = false;
    } while (reste.length > 0);
  });
}

/** Ligne à valeur : silencieusement ignorée si la valeur est vide. */
function poserLigne(
  sortie: string[],
  niveau: number,
  tag: string,
  valeur: string | null | undefined,
): void {
  if (valeur === null || valeur === undefined) return;
  const propre = String(valeur).trim();
  if (!propre) return;

  // Un pointeur (`@X1@`) reste tel quel : ni découpage ni échappement.
  if (estPointeur(propre)) {
    sortie.push(`${niveau} ${tag} ${propre}`);
    return;
  }

  poserTexte(sortie, niveau, tag, propre);
}

/** Ligne d'ouverture d'un bloc, sans valeur (ex. `1 BIRT`). */
function poserEntete(sortie: string[], niveau: number, tag: string): void {
  sortie.push(`${niveau} ${tag}`);
}

// ---------------------------------------------------------------------------
// Format des dates
// ---------------------------------------------------------------------------

type SourceDate = Pick<
  Evenement,
  'annee' | 'mois' | 'jour' | 'annee_fin' | 'qualificatif' | 'date_texte'
>;

function morceauDate(annee: number, mois: number | null, jour: number | null): string {
  if (jour && mois) return `${jour} ${MOIS_GED[mois - 1]} ${annee}`;
  if (mois) return `${MOIS_GED[mois - 1]} ${annee}`;
  return String(annee);
}

/** Traduit les morceaux d'une date base en la syntaxe date de GEDCOM. */
function dateGedcom(e: SourceDate): string | null {
  if (e.annee === null) return e.date_texte?.trim() || null;

  const base = morceauDate(e.annee, e.mois, e.jour);
  switch (e.qualificatif) {
    case 'vers':
      return `ABT ${base}`;
    case 'avant':
      return `BEF ${base}`;
    case 'apres':
      return `AFT ${base}`;
    case 'entre':
      return e.annee_fin ? `BET ${base} AND ${e.annee_fin}` : base;
    case 'depuis':
      return `FROM ${base}`;
    case 'jusqu_a':
      return `TO ${base}`;
    default:
      return base;
  }
}

// ---------------------------------------------------------------------------
// Sources → notes
// ---------------------------------------------------------------------------

function texteSource(s: Source): string {
  const parties: string[] = [];
  if (s.titre?.trim()) parties.push(s.titre.trim());
  if (s.texte?.trim()) parties.push(s.texte.trim());
  const references: string[] = [];
  if (s.depot?.trim()) references.push(`dépôt : ${s.depot.trim()}`);
  if (s.cote?.trim()) references.push(`cote : ${s.cote.trim()}`);
  if (s.page?.trim()) references.push(`page : ${s.page.trim()}`);
  if (references.length) parties.push(references.join(' — '));
  if (s.url?.trim()) parties.push(s.url.trim());
  return parties.join('\n');
}

function poserSource(sortie: string[], niveau: number, s: Source): void {
  const texte = texteSource(s);
  if (!texte) return;
  poserLigne(sortie, niveau, 'NOTE', texte);
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await creerClientServeur();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('Réservé aux membres.', { status: 401 });
  }

  const { data: valide, error: erreurRpc } = await supabase.rpc('est_membre_valide');
  if (erreurRpc || !valide) {
    return new NextResponse('Réservé aux membres validés.', { status: 403 });
  }

  const { data: moi } = await supabase
    .from('membres')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const estAdmin = moi?.role === 'admin';

  const [personnesRes, unionsRes, filiationsRes, evenementsRes, sourcesRes, lieuxRes] =
    await Promise.all([
      supabase
        .from('personnes')
        .select(
          'id, code_gedcom, prenoms, nom, nom_naissance, surnom, sexe, notes, presume_vivant, confidentiel',
        ),
      supabase.from('unions').select('id, conjoint_a, conjoint_b, notes'),
      supabase.from('filiations').select('union_id, enfant_id'),
      supabase
        .from('evenements')
        .select(
          'id, personne_id, union_id, type, detail, date_texte, annee, mois, jour, annee_fin, qualificatif, precision_date, lieu_id, notes',
        )
        .order('date_tri', { ascending: true, nullsFirst: false }),
      supabase
        .from('sources')
        .select('id, personne_id, union_id, evenement_id, titre, texte, page, cote, depot, url'),
      supabase.from('lieux').select('id, libelle'),
    ]);

  const erreur =
    personnesRes.error ??
    unionsRes.error ??
    filiationsRes.error ??
    evenementsRes.error ??
    sourcesRes.error ??
    lieuxRes.error;
  if (erreur) {
    return new NextResponse(
      `Export impossible : ${erreur.message}`,
      { status: 500 },
    );
  }

  const personnes = (personnesRes.data ?? []) as Array<
    Pick<
      Personne,
      | 'id'
      | 'code_gedcom'
      | 'prenoms'
      | 'nom'
      | 'nom_naissance'
      | 'surnom'
      | 'sexe'
      | 'notes'
      | 'presume_vivant'
      | 'confidentiel'
    >
  >;
  const unions = (unionsRes.data ?? []) as Array<
    Pick<Union, 'id' | 'conjoint_a' | 'conjoint_b' | 'notes'>
  >;
  const filiations = (filiationsRes.data ?? []) as Filiation[];
  const evenements = (evenementsRes.data ?? []) as Evenement[];
  const sources = (sourcesRes.data ?? []) as Source[];
  const lieuParId = new Map<string, string>(
    (lieuxRes.data ?? []).map((l) => [l.id, l.libelle]),
  );

  // ---- Filtrage confidentiel -----------------------------------------------

  const personnesVisibles = estAdmin ? personnes : personnes.filter((p) => !p.confidentiel);
  const idsPersonnes = new Set(personnesVisibles.map((p) => p.id));
  const personneParId = new Map(personnesVisibles.map((p) => [p.id, p]));

  const unionsVisibles = unions.filter(
    (u) =>
      (u.conjoint_a === null || idsPersonnes.has(u.conjoint_a)) &&
      (u.conjoint_b === null || idsPersonnes.has(u.conjoint_b)),
  );
  const idsUnions = new Set(unionsVisibles.map((u) => u.id));

  const filiationsVisibles = filiations.filter(
    (f) => idsUnions.has(f.union_id) && idsPersonnes.has(f.enfant_id),
  );

  // Attribution des identifiants GEDCOM (`@I1@`, `@F1@`, …). On numérote de
  // façon stable dans l'ordre où la base nous les a rendus, ce qui produit un
  // fichier identique d'un export à l'autre tant que la base ne bouge pas.
  const xrefPersonne = new Map<string, string>();
  personnesVisibles.forEach((p, i) => xrefPersonne.set(p.id, `@I${i + 1}@`));

  const xrefUnion = new Map<string, string>();
  unionsVisibles.forEach((u, i) => xrefUnion.set(u.id, `@F${i + 1}@`));

  // ---- Index événements et sources -----------------------------------------

  const evtsParPersonne = new Map<string, Evenement[]>();
  const evtsParUnion = new Map<string, Evenement[]>();
  for (const e of evenements) {
    if (e.personne_id && idsPersonnes.has(e.personne_id)) {
      const liste = evtsParPersonne.get(e.personne_id) ?? [];
      liste.push(e);
      evtsParPersonne.set(e.personne_id, liste);
    } else if (e.union_id && idsUnions.has(e.union_id)) {
      const liste = evtsParUnion.get(e.union_id) ?? [];
      liste.push(e);
      evtsParUnion.set(e.union_id, liste);
    }
  }

  const sourcesParPersonne = new Map<string, Source[]>();
  const sourcesParUnion = new Map<string, Source[]>();
  const sourcesParEvenement = new Map<string, Source[]>();
  for (const s of sources) {
    if (s.evenement_id) {
      const liste = sourcesParEvenement.get(s.evenement_id) ?? [];
      liste.push(s);
      sourcesParEvenement.set(s.evenement_id, liste);
    } else if (s.personne_id && idsPersonnes.has(s.personne_id)) {
      const liste = sourcesParPersonne.get(s.personne_id) ?? [];
      liste.push(s);
      sourcesParPersonne.set(s.personne_id, liste);
    } else if (s.union_id && idsUnions.has(s.union_id)) {
      const liste = sourcesParUnion.get(s.union_id) ?? [];
      liste.push(s);
      sourcesParUnion.set(s.union_id, liste);
    }
  }

  // ---- Familles ------------------------------------------------------------

  const familyByConjoint = new Map<string, string[]>();
  for (const u of unionsVisibles) {
    for (const c of [u.conjoint_a, u.conjoint_b]) {
      if (!c) continue;
      const liste = familyByConjoint.get(c) ?? [];
      liste.push(u.id);
      familyByConjoint.set(c, liste);
    }
  }
  const unionOrigineParEnfant = new Map<string, string>();
  const enfantsParUnion = new Map<string, string[]>();
  for (const f of filiationsVisibles) {
    unionOrigineParEnfant.set(f.enfant_id, f.union_id);
    const liste = enfantsParUnion.get(f.union_id) ?? [];
    liste.push(f.enfant_id);
    enfantsParUnion.set(f.union_id, liste);
  }

  // ---- Génération ----------------------------------------------------------

  const lignes: string[] = [];
  const maintenant = new Date();
  const dateEnTete = morceauDate(
    maintenant.getUTCFullYear(),
    maintenant.getUTCMonth() + 1,
    maintenant.getUTCDate(),
  );
  const dateFichier = maintenant.toISOString().slice(0, 10);

  // En-tête
  poserEntete(lignes, 0, 'HEAD');
  poserLigne(lignes, 1, 'SOUR', 'ArbreDeLeo');
  poserLigne(lignes, 2, 'NAME', NOM_DU_SITE);
  poserLigne(lignes, 2, 'VERS', '1.0');
  poserLigne(lignes, 1, 'DATE', dateEnTete);
  poserEntete(lignes, 1, 'GEDC');
  poserLigne(lignes, 2, 'VERS', '5.5.1');
  poserLigne(lignes, 2, 'FORM', 'LINEAGE-LINKED');
  poserLigne(lignes, 1, 'CHAR', 'UTF-8');
  poserLigne(lignes, 1, 'LANG', 'French');
  poserLigne(lignes, 1, 'SUBM', '@SUBM1@');

  // Soumissionnaire minimal — l'auteur du fichier est l'application elle-même.
  poserEntete(lignes, 0, '@SUBM1@ SUBM');
  poserLigne(lignes, 1, 'NAME', NOM_DU_SITE);

  // Personnes
  for (const p of personnesVisibles) {
    const xref = xrefPersonne.get(p.id)!;
    lignes.push(`0 ${xref} INDI`);

    const masquerDates = p.presume_vivant && !estAdmin;

    // Nom principal : `Prénoms /NOM/`. Le nom peut être absent (personne
    // connue par le seul prénom) — dans ce cas on émet quand même `//`.
    const prenoms = p.prenoms?.trim() ?? '';
    const nom = p.nom?.trim() ?? '';
    poserLigne(lignes, 1, 'NAME', `${prenoms} /${nom}/`.trim() || '?');
    if (prenoms) poserLigne(lignes, 2, 'GIVN', prenoms);
    if (nom) poserLigne(lignes, 2, 'SURN', nom);

    // Nom de naissance distinct : forme alternative typée `birth`.
    if (p.nom_naissance && p.nom_naissance.trim() && p.nom_naissance !== nom) {
      poserLigne(lignes, 1, 'NAME', `${prenoms} /${p.nom_naissance.trim()}/`.trim());
      poserLigne(lignes, 2, 'TYPE', 'birth');
      poserLigne(lignes, 2, 'SURN', p.nom_naissance.trim());
    }

    // Surnom : forme alternative typée `aka`.
    if (p.surnom?.trim()) {
      poserLigne(lignes, 1, 'NAME', `${prenoms} /${nom}/`.trim() || p.surnom);
      poserLigne(lignes, 2, 'TYPE', 'aka');
      poserLigne(lignes, 2, 'NICK', p.surnom.trim());
    }

    const sexeGed = p.sexe === 'M' ? 'M' : p.sexe === 'F' ? 'F' : 'U';
    poserLigne(lignes, 1, 'SEX', sexeGed);

    // Événements individuels
    for (const e of evtsParPersonne.get(p.id) ?? []) {
      const tag = TAGS_PERSONNE[e.type];
      if (!tag) continue;

      // Certaines balises portent une valeur directe (profession → OCCU).
      const valeurEntete = tag === 'OCCU' ? e.detail?.trim() || null : null;
      if (valeurEntete) {
        poserLigne(lignes, 1, tag, valeurEntete);
      } else {
        poserEntete(lignes, 1, tag);
      }
      if (tag === 'EVEN') {
        poserLigne(lignes, 2, 'TYPE', TYPE_LIBELLE[e.type] ?? e.type);
      }

      if (!masquerDates) {
        poserLigne(lignes, 2, 'DATE', dateGedcom(e));
        if (e.lieu_id) poserLigne(lignes, 2, 'PLAC', lieuParId.get(e.lieu_id) ?? null);
      }
      if (e.detail && tag !== 'OCCU' && !masquerDates) {
        poserLigne(lignes, 2, 'NOTE', e.detail);
      }
      if (e.notes && !masquerDates) poserLigne(lignes, 2, 'NOTE', e.notes);

      if (!masquerDates) {
        for (const s of sourcesParEvenement.get(e.id) ?? []) poserSource(lignes, 2, s);
      }
    }

    // Familles conjugales (personne comme conjoint) puis famille d'origine.
    for (const uid of familyByConjoint.get(p.id) ?? []) {
      const fx = xrefUnion.get(uid);
      if (fx) poserLigne(lignes, 1, 'FAMS', fx);
    }
    const originId = unionOrigineParEnfant.get(p.id);
    if (originId) {
      const fx = xrefUnion.get(originId);
      if (fx) poserLigne(lignes, 1, 'FAMC', fx);
    }

    if (p.notes && !masquerDates) poserLigne(lignes, 1, 'NOTE', p.notes);
    if (!masquerDates) {
      for (const s of sourcesParPersonne.get(p.id) ?? []) poserSource(lignes, 1, s);
    }
  }

  // Familles
  for (const u of unionsVisibles) {
    const xref = xrefUnion.get(u.id)!;
    lignes.push(`0 ${xref} FAM`);

    // Choix `HUSB` / `WIFE` en fonction du sexe de chaque conjoint. Faute
    // d'information, on met le premier en `HUSB` et le second en `WIFE`.
    const conjA = u.conjoint_a ? personneParId.get(u.conjoint_a) : null;
    const conjB = u.conjoint_b ? personneParId.get(u.conjoint_b) : null;

    let tagA: 'HUSB' | 'WIFE' | null = null;
    let tagB: 'HUSB' | 'WIFE' | null = null;

    if (conjA?.sexe === 'F') tagA = 'WIFE';
    else if (conjA?.sexe === 'M') tagA = 'HUSB';

    if (conjB?.sexe === 'F') tagB = 'WIFE';
    else if (conjB?.sexe === 'M') tagB = 'HUSB';

    // Résolution des cas indéterminés : on complète pour éviter les doublons.
    if (conjA && tagA === null) tagA = tagB === 'HUSB' ? 'WIFE' : 'HUSB';
    if (conjB && tagB === null) tagB = tagA === 'HUSB' ? 'WIFE' : 'HUSB';

    if (conjA && tagA) {
      const cx = xrefPersonne.get(conjA.id);
      if (cx) poserLigne(lignes, 1, tagA, cx);
    }
    if (conjB && tagB) {
      const cx = xrefPersonne.get(conjB.id);
      if (cx) poserLigne(lignes, 1, tagB, cx);
    }

    // Événements d'union (mariage, divorce…).
    for (const e of evtsParUnion.get(u.id) ?? []) {
      const tag = TAGS_UNION[e.type];
      if (!tag) continue;

      poserEntete(lignes, 1, tag);
      if (tag === 'EVEN') poserLigne(lignes, 2, 'TYPE', TYPE_LIBELLE[e.type] ?? e.type);

      poserLigne(lignes, 2, 'DATE', dateGedcom(e));
      if (e.lieu_id) poserLigne(lignes, 2, 'PLAC', lieuParId.get(e.lieu_id) ?? null);
      if (e.detail) poserLigne(lignes, 2, 'NOTE', e.detail);
      if (e.notes) poserLigne(lignes, 2, 'NOTE', e.notes);
      for (const s of sourcesParEvenement.get(e.id) ?? []) poserSource(lignes, 2, s);
    }

    // Enfants
    for (const enfantId of enfantsParUnion.get(u.id) ?? []) {
      const cx = xrefPersonne.get(enfantId);
      if (cx) poserLigne(lignes, 1, 'CHIL', cx);
    }

    if (u.notes) poserLigne(lignes, 1, 'NOTE', u.notes);
    for (const s of sourcesParUnion.get(u.id) ?? []) poserSource(lignes, 1, s);
  }

  poserEntete(lignes, 0, 'TRLR');

  const contenu = lignes.join('\n') + '\n';

  return new NextResponse(contenu, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="arbre-de-leo-${dateFichier}.ged"`,
      'Cache-Control': 'no-store',
    },
  });
}
