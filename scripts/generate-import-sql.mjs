/**
 * Traduit `data/arbre-unifie.json` en instructions SQL d'import.
 *
 *   node scripts/generate-import-sql.mjs
 *
 * Produit des blocs numérotés dans `data/sql/`, assez courts pour passer d'un
 * seul tenant. L'import est rejouable : les personnes et unions sont reprises
 * par leur `code_gedcom`, et les données dérivées (événements, filiations,
 * sources) sont remplacées à chaque passage. Ce que les membres ont déposé —
 * souvenirs, photos, commentaires — n'est jamais touché.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIEUX_CONNUS } from './lieux-connus.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SQL_DIR = resolve(ROOT, 'data/sql');

const tree = JSON.parse(readFileSync(resolve(ROOT, 'data/arbre-unifie.json'), 'utf8'));

/** Littéral SQL : `null`, ou chaîne entre quotes avec doublement des apostrophes. */
const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined || Number.isNaN(v) ? 'null' : String(v));
const arr = (values, cast) =>
  values.length === 0 ? `'{}'::${cast}[]` : `array[${values.map(q).join(',')}]::${cast}[]`;

// ---------------------------------------------------------------------------
// Correspondances GEDCOM → vocabulaire de la base
// ---------------------------------------------------------------------------

const TYPE_EVENEMENT = {
  naissance: 'naissance', bapteme: 'bapteme', mariage: 'mariage', divorce: 'divorce',
  fiancailles: 'fiancailles', deces: 'deces', inhumation: 'inhumation', cremation: 'cremation',
  profession: 'profession', residence: 'residence', recensement: 'recensement',
  emigration: 'emigration', immigration: 'immigration', naturalisation: 'naturalisation',
  service_militaire: 'service_militaire', education: 'education', bans: 'autre', evenement: 'autre',
};

const QUALIFICATIF = {
  about: 'vers', estimated: 'vers', calculated: 'vers',
  before: 'avant', after: 'apres', between: 'entre', from: 'depuis', to: 'jusqu_a',
};

const PREUVE = {
  ACTE: 'acte', ANOM: 'anom', INSEE: 'insee', MEMOIRE: 'memoire', 'A TROUVER': 'a_trouver',
};

const SEXE = { M: 'M', F: 'F' };

function precisionDe(date) {
  if (!date) return 'inconnue';
  if (date.day) return 'jour';
  if (date.month) return 'mois';
  if (date.year) return 'annee';
  return 'inconnue';
}

// ---------------------------------------------------------------------------
// Lieux
// ---------------------------------------------------------------------------

const libelles = new Set();
for (const p of tree.persons) for (const e of p.events) if (e.place) libelles.add(e.place);
for (const f of tree.families) for (const e of f.events) if (e.place) libelles.add(e.place);

/** « La Senia, Departement d'Oran, Algerie » → commune / département / pays. */
function decomposer(libelle) {
  const parts = libelle.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 1) return { commune: null, departement: null, region: null, pays: parts[0] };
  const pays = parts[parts.length - 1];
  const commune = parts[0];
  const departement = parts.length >= 3 ? parts[1] : null;
  const region = parts.length >= 4 ? parts[2] : null;
  return { commune, departement, region, pays };
}

const lieuxSql = [...libelles].sort().map((libelle) => {
  const { commune, departement, region, pays } = decomposer(libelle);
  const connu = LIEUX_CONNUS[libelle] ?? {};
  return `insert into arbre.lieux (libelle, commune, departement, region, pays, pays_actuel, latitude, longitude, note)
values (${q(libelle)}, ${q(commune)}, ${q(departement)}, ${q(region)}, ${q(pays)}, ${q(connu.paysActuel ?? pays)}, ${n(connu.lat)}, ${n(connu.lng)}, ${q(connu.note)})
on conflict (lower(libelle)) do update set
  latitude = coalesce(excluded.latitude, arbre.lieux.latitude),
  longitude = coalesce(excluded.longitude, arbre.lieux.longitude),
  pays_actuel = coalesce(excluded.pays_actuel, arbre.lieux.pays_actuel),
  note = coalesce(excluded.note, arbre.lieux.note);`;
});

// ---------------------------------------------------------------------------
// Personnes
// ---------------------------------------------------------------------------

const THIS_YEAR = new Date().getUTCFullYear();
const eventOf = (p, type) => p.events.find((e) => e.type === type) ?? null;

function presumeVivant(p) {
  if (eventOf(p, 'deces') || eventOf(p, 'inhumation')) return false;
  const y = eventOf(p, 'naissance')?.date?.year;
  if (!y) return false;
  return THIS_YEAR - y < 110;
}

const personnesSql = tree.persons.map((p) => {
  const preuves = p.proofLevels.map((l) => PREUVE[l]).filter(Boolean);
  return `insert into arbre.personnes (code_gedcom, branches, prenoms, nom, surnom, sexe, notes, niveaux_preuve, presume_vivant)
values (${q(p.id)}, ${arr(p.branches ?? [p.branch], 'text')}, ${q(p.name.given)}, ${q(p.name.surname)}, ${q(p.name.nickname)}, ${q(SEXE[p.sex] ?? 'inconnu')}::arbre.sexe, ${q(p.notes.join('\n\n'))}, ${arr(preuves, 'arbre.niveau_preuve')}, ${presumeVivant(p)})
on conflict (code_gedcom) do update set
  branches = excluded.branches, prenoms = excluded.prenoms, nom = excluded.nom,
  surnom = excluded.surnom, sexe = excluded.sexe, notes = excluded.notes,
  niveaux_preuve = excluded.niveaux_preuve, presume_vivant = excluded.presume_vivant;`;
});

// ---------------------------------------------------------------------------
// Unions et filiations
// ---------------------------------------------------------------------------

const unionsSql = tree.families.map((f) => {
  const preuves = f.proofLevels.map((l) => PREUVE[l]).filter(Boolean);
  const conjoint = (id) => (id ? `(select id from arbre.personnes where code_gedcom = ${q(id)})` : 'null');
  return `insert into arbre.unions (code_gedcom, conjoint_a, conjoint_b, branches, notes, niveaux_preuve)
values (${q(f.id)}, ${conjoint(f.husband)}, ${conjoint(f.wife)}, ${arr([f.branch], 'text')}, ${q(f.notes.join('\n\n'))}, ${arr(preuves, 'arbre.niveau_preuve')})
on conflict (code_gedcom) do update set
  conjoint_a = excluded.conjoint_a, conjoint_b = excluded.conjoint_b,
  notes = excluded.notes, niveaux_preuve = excluded.niveaux_preuve;`;
});

const filiationsSql = tree.families.flatMap((f) =>
  f.children.map(
    (c) => `insert into arbre.filiations (union_id, enfant_id)
select u.id, p.id from arbre.unions u, arbre.personnes p
where u.code_gedcom = ${q(f.id)} and p.code_gedcom = ${q(c)}
on conflict (union_id, enfant_id) do nothing;`
  )
);

// ---------------------------------------------------------------------------
// Événements
// ---------------------------------------------------------------------------

function evenementSql(e, cible, codeGedcom) {
  const type = TYPE_EVENEMENT[e.type] ?? 'autre';
  const d = e.date;
  const table = cible === 'personne' ? 'arbre.personnes' : 'arbre.unions';
  const colonne = cible === 'personne' ? 'personne_id' : 'union_id';
  const lieu = e.place
    ? `(select id from arbre.lieux where lower(libelle) = lower(${q(e.place)}))`
    : 'null';

  return `insert into arbre.evenements (${colonne}, type, libelle, detail, date_texte, annee, mois, jour, annee_fin, qualificatif, precision_date, lieu_id, notes)
select x.id, ${q(type)}::arbre.type_evenement, ${q(e.tag)}, ${q(e.detail)}, ${q(d?.raw)},
  ${n(d?.year)}, ${n(d?.month)}, ${n(d?.day)}, ${n(d?.rangeEndYear)},
  ${q(QUALIFICATIF[d?.qualifier] ?? 'exacte')}::arbre.qualificatif_date,
  ${q(precisionDe(d))}::arbre.precision_date,
  ${lieu}, ${q(e.notes.join('\n'))}
from ${table} x where x.code_gedcom = ${q(codeGedcom)}
on conflict (personne_id, union_id, type, date_texte, lieu_id, detail) do nothing;`;
}

const evenementsSql = [
  ...tree.persons.flatMap((p) => p.events.map((e) => evenementSql(e, 'personne', p.id))),
  ...tree.families.flatMap((f) => f.events.map((e) => evenementSql(e, 'union', f.id))),
];

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/** Une source citée sans transcription n'apporte rien : on ne la reprend pas. */
const sourcesSql = tree.persons.flatMap((p) =>
  p.sources
    .filter((s) => s.text || s.notes.length)
    .map((s) => {
      const texte = [s.text, ...s.notes].filter(Boolean).join('\n');
      // Le marqueur de fiabilité est souvent posé en tête de la transcription.
      const marqueur = Object.keys(PREUVE).find((m) => texte.toUpperCase().includes(`[${m}]`));
      const niveau = marqueur ? `${q(PREUVE[marqueur])}::arbre.niveau_preuve` : 'null';
      return `insert into arbre.sources (personne_id, texte, page, niveau_preuve)
select id, ${q(texte)}, ${q(s.page)}, ${niveau}
from arbre.personnes where code_gedcom = ${q(p.id)}
on conflict (personne_id, union_id, evenement_id, texte, page) do nothing;`;
    })
);

// ---------------------------------------------------------------------------
// Écriture par blocs
// ---------------------------------------------------------------------------

/**
 * Regroupe les instructions en blocs courts.
 *
 * La limite est basse à dessein : chaque bloc est recopié tel quel par un agent
 * avant d'être exécuté, et un gros bloc se recopie lentement et se tronque
 * facilement. Mieux vaut beaucoup de petits blocs, exécutables en parallèle.
 */
function enBlocs(instructions, limite = 6_000) {
  const blocs = [];
  let courant = [];
  let taille = 0;
  for (const sql of instructions) {
    if (taille + sql.length > limite && courant.length) {
      blocs.push(courant);
      courant = [];
      taille = 0;
    }
    courant.push(sql);
    taille += sql.length + 1;
  }
  if (courant.length) blocs.push(courant);
  return blocs;
}

rmSync(SQL_DIR, { recursive: true, force: true });
mkdirSync(SQL_DIR, { recursive: true });

// Aucune suppression préalable : chaque instruction porte sa clause
// `on conflict do nothing`, adossée aux index d'unicité posés par la migration
// 0007. Rejouer l'import ne crée donc pas de doublon et n'efface rien — ce qui
// vaut mieux que de vider des tables pour les reremplir aussitôt.
const sections = [
  ['01-lieux', lieuxSql],
  ['02-personnes', personnesSql],
  ['03-unions', unionsSql],
  ['04-filiations', filiationsSql],
  ['05-evenements', evenementsSql],
  ['06-sources', sourcesSql],
];

const manifeste = [];
for (const [nom, instructions] of sections) {
  const blocs = enBlocs(instructions);
  blocs.forEach((bloc, i) => {
    const suffixe = blocs.length > 1 ? `-${String(i + 1).padStart(2, '0')}` : '';
    const fichier = `${nom}${suffixe}.sql`;
    writeFileSync(resolve(SQL_DIR, fichier), bloc.join('\n'));
    manifeste.push({ fichier, instructions: bloc.length, octets: bloc.join('\n').length });
  });
}

writeFileSync(resolve(SQL_DIR, 'manifeste.json'), JSON.stringify(manifeste, null, 2));

console.log(`${manifeste.length} blocs écrits dans data/sql/`);
for (const m of manifeste) {
  console.log(`  ${m.fichier.padEnd(24)} ${String(m.instructions).padStart(4)} instructions  ${String(Math.round(m.octets / 1024)).padStart(4)} Ko`);
}
