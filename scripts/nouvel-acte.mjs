/**
 * Canevas interactif de versement d'un acte en base.
 *
 *   npm run arbre:acte
 *
 * Pose les questions dans le terminal et écrit un fichier SQL horodaté dans
 * `data/sql-actes/`, prêt à être relu puis exécuté à la main. Ce script ne
 * touche jamais à la base — c'est le propriétaire qui joue le SQL après
 * relecture, comme pour tout ce qui vit dans `data/sql-actes/`.
 *
 * Aucune dépendance externe : les questions passent par `node:readline`.
 *
 * Le fichier produit porte le préfixe `acte:` sur les nouveaux `code_gedcom`
 * (convention de la §5 de `docs/PASSATION.md`) et applique partout
 * `on conflict do nothing` pour rester rejouable — recopier le même SQL deux
 * fois n'a aucun effet secondaire.
 */

import { createInterface } from 'node:readline';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DEST = resolve(ROOT, 'data/sql-actes');

// ---------------------------------------------------------------------------
// Petit outillage d'interaction
// ---------------------------------------------------------------------------
//
// On n'utilise pas `rl.question()` : sur Windows, quand l'entrée standard est
// un fichier ou un pipe (`node ... < reponses.txt`), Node clôt le flux dès
// l'EOF et les callbacks des questions restant en attente ne sont jamais
// appelés — le processus se termine sur « Detected unsettled top-level await ».
//
// À la place, on écoute les événements `line` sur l'interface readline, on
// bufferise ce qui arrive, et on distribue au fur et à mesure aux questions
// posées. Le même code sert au terminal interactif et à l'exécution scriptée.

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });

const lignes = [];
const attentes = [];
let flotFerme = false;

rl.on('line', (ligne) => {
  if (attentes.length) attentes.shift()(ligne);
  else lignes.push(ligne);
});
rl.on('close', () => {
  flotFerme = true;
  while (attentes.length) attentes.shift()('');
});

/** Pose une question, renvoie la réponse coupée aux espaces. */
function demander(question) {
  return new Promise((resoudre) => {
    process.stdout.write(question);
    const suite = (ligne) => resoudre((ligne ?? '').trim());
    if (lignes.length) suite(lignes.shift());
    else if (flotFerme) suite('');
    else attentes.push(suite);
  });
}

/** Pose une question et refuse une réponse vide. */
async function demanderObligatoire(question) {
  for (;;) {
    const rep = await demander(question);
    if (rep) return rep;
    console.log('  (réponse obligatoire)');
  }
}

/** Pose une question à choix fermé, renvoie la valeur retenue. */
async function demanderChoix(question, choix) {
  const liste = choix.join(' / ');
  for (;;) {
    const rep = (await demander(`${question} [${liste}] : `)).toLowerCase();
    if (choix.includes(rep)) return rep;
    console.log(`  Réponse attendue : ${liste}`);
  }
}

// ---------------------------------------------------------------------------
// Normalisation, échappement, correspondances
// ---------------------------------------------------------------------------

/** Chaîne SQL avec délimiteur $t$ : évite d'échapper les apostrophes françaises. */
const t = (v) => (v === null || v === undefined || v === '' ? 'null' : `$t$${v}$t$`);

/** Débarrasse un texte de ses accents et de tout ce qui n'est pas alphanumérique. */
function normaliser(texte) {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Version basse-casse pour un nom de fichier lisible. */
function slugFichier(texte) {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const TYPES_ACTE = {
  naissance: { evenement: 'naissance', libelle: 'Acte de naissance' },
  mariage: { evenement: 'mariage', libelle: 'Acte de mariage' },
  deces: { evenement: 'deces', libelle: 'Acte de décès' },
  autre: { evenement: 'autre', libelle: 'Acte' },
};

const NIVEAUX_PREUVE = ['acte', 'anom', 'insee', 'memoire', 'hypothese'];

const MOIS_ABREGES = {
  JAN: 1, FEV: 2, FEB: 2, MAR: 3, AVR: 4, APR: 4, MAI: 5, MAY: 5, JUN: 6,
  JUL: 7, AOU: 8, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const MOIS_LONGS = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7,
  aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

/**
 * Décompose une saisie de date en composants exploitables.
 *
 * Reconnaît :
 *   « 7 OCT 1907 » ou « 7 octobre 1907 »   → jour, mois, année, exacte
 *   « OCT 1907 » ou « octobre 1907 »       → mois, année, exacte
 *   « 1907 »                                → année, exacte
 *   « vers 1850 » / « environ 1850 »        → année, vers
 *   « avant 1900 »                          → année, avant
 *   « après 1918 »                          → année, apres
 *
 * Une saisie non reconnue est conservée en `texte` avec `precision = inconnue` :
 * la base l'accepte, un humain peut ensuite la corriger.
 */
function analyserDate(brut) {
  const vide = { annee: null, mois: null, jour: null, qualificatif: 'exacte', precision: 'inconnue', texte: null };
  if (!brut) return vide;

  const brutNormalise = brut.trim();
  if (!brutNormalise) return vide;

  let qualificatif = 'exacte';
  let corps = brutNormalise;

  const sansAccent = corps.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const bas = sansAccent.toLowerCase();

  if (bas.startsWith('vers ') || bas.startsWith('environ ')) {
    qualificatif = 'vers';
    corps = sansAccent.replace(/^(vers|environ)\s+/i, '');
  } else if (bas.startsWith('avant ')) {
    qualificatif = 'avant';
    corps = sansAccent.replace(/^avant\s+/i, '');
  } else if (bas.startsWith('apres ')) {
    qualificatif = 'apres';
    corps = sansAccent.replace(/^apres\s+/i, '');
  } else {
    corps = sansAccent;
  }

  const parts = corps.trim().split(/\s+/).filter(Boolean);

  const moisDe = (mot) => {
    const abrev = mot.slice(0, 3).toUpperCase();
    if (MOIS_ABREGES[abrev]) return MOIS_ABREGES[abrev];
    if (MOIS_LONGS[mot.toLowerCase()]) return MOIS_LONGS[mot.toLowerCase()];
    return null;
  };

  let jour = null;
  let mois = null;
  let annee = null;

  if (parts.length === 3) {
    const j = parseInt(parts[0], 10);
    const a = parseInt(parts[2], 10);
    const m = moisDe(parts[1]);
    if (Number.isFinite(j) && j >= 1 && j <= 31 && m !== null && Number.isFinite(a) && a >= 1000) {
      jour = j;
      mois = m;
      annee = a;
    }
  } else if (parts.length === 2) {
    const a = parseInt(parts[1], 10);
    const m = moisDe(parts[0]);
    if (m !== null && Number.isFinite(a) && a >= 1000) {
      mois = m;
      annee = a;
    }
  } else if (parts.length === 1) {
    const a = parseInt(parts[0], 10);
    if (Number.isFinite(a) && a >= 1000) annee = a;
  }

  let precision = 'inconnue';
  if (jour) precision = 'jour';
  else if (mois) precision = 'mois';
  else if (annee) precision = 'annee';

  return { annee, mois, jour, qualificatif, precision, texte: brutNormalise };
}

/**
 * Décompose un libellé de lieu en commune / département / région / pays.
 * Même règle que `scripts/generate-import-sql.mjs` : on lit les composants
 * de gauche à droite, le dernier étant le pays.
 */
function decomposerLieu(libelle) {
  const parts = libelle.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return { commune: null, departement: null, region: null, pays: parts[0] };
  const pays = parts[parts.length - 1];
  const commune = parts[0];
  const departement = parts.length >= 3 ? parts[1] : null;
  const region = parts.length >= 4 ? parts[2] : null;
  return { commune, departement, region, pays };
}

// ---------------------------------------------------------------------------
// Composition du SQL
// ---------------------------------------------------------------------------

/**
 * Construit les blocs SQL à écrire.
 *
 * Ordre imposé par les dépendances : lieu d'abord, personne ensuite (si
 * nouvelle), puis événement, puis source. La séquence recopie la logique de
 * `scripts/generate-import-sql.mjs`, en plus court.
 */
function composerSql(saisie) {
  const morceaux = [];
  const commentaires = [];

  const typeInfo = TYPES_ACTE[saisie.typeActe];
  commentaires.push(`-- ${typeInfo.libelle} — ${saisie.prenoms} ${saisie.nom}`);
  commentaires.push(`-- Saisi le ${new Date().toISOString().slice(0, 10)} par le canevas nouvel-acte.mjs`);
  if (saisie.date.texte) commentaires.push(`-- Date : ${saisie.date.texte}`);
  if (saisie.lieuLibelle) commentaires.push(`-- Lieu : ${saisie.lieuLibelle}`);
  if (saisie.cote) commentaires.push(`-- Cote : ${saisie.cote}`);
  if (saisie.depot) commentaires.push(`-- Dépôt : ${saisie.depot}`);
  commentaires.push(`-- Niveau de preuve : ${saisie.niveauPreuve}`);
  if (saisie.typeActe === 'mariage') {
    commentaires.push('--');
    commentaires.push('-- ATTENTION mariage : la convention de la base attache un mariage à');
    commentaires.push('-- une union (arbre.unions), pas à une personne. L\'insertion ci-dessous');
    commentaires.push('-- respecte la contrainte evenements_un_seul_rattachement, mais il faudra');
    commentaires.push('-- probablement la retourner en événement d\'union une fois le conjoint');
    commentaires.push('-- retrouvé. Voir docs/PASSATION.md §4 cas c.');
  }
  morceaux.push(commentaires.join('\n'));

  // --- 1. Lieu ------------------------------------------------------------
  let lieuSql = null;
  if (saisie.lieuLibelle) {
    const l = decomposerLieu(saisie.lieuLibelle);
    lieuSql = [
      'insert into arbre.lieux (libelle, commune, departement, region, pays, pays_actuel)',
      `values (${t(saisie.lieuLibelle)}, ${t(l.commune)}, ${t(l.departement)}, ${t(l.region)}, ${t(l.pays)}, ${t(l.pays)})`,
      'on conflict (lower(libelle)) do nothing;',
    ].join('\n');
    morceaux.push('-- Lieu (créé s\'il n\'existe pas encore) -----------------------------------\n' + lieuSql);
  }

  // --- 2. Personne (si nouvelle) ------------------------------------------
  if (saisie.estNouvelle) {
    const notesPersonne = [
      `${typeInfo.libelle} du ${saisie.date.texte ?? '(date à préciser)'}.`,
      saisie.lieuLibelle ? `Lieu : ${saisie.lieuLibelle}.` : null,
      saisie.cote ? `Cote : ${saisie.cote}.` : null,
      saisie.depot ? `Dépôt : ${saisie.depot}.` : null,
      'Fiche créée par le canevas nouvel-acte.mjs ; à compléter (sexe, filiations, branches).',
    ].filter(Boolean).join('\n');

    const personneSql = [
      'insert into arbre.personnes (code_gedcom, branches, prenoms, nom, sexe, notes, niveaux_preuve, presume_vivant)',
      'values (',
      `  ${t(saisie.codeGedcom)},`,
      `  '{}'::text[],`,
      `  ${t(saisie.prenoms)},`,
      `  ${t(saisie.nom)},`,
      `  $t$inconnu$t$::arbre.sexe,`,
      `  ${t(notesPersonne)},`,
      `  array[${t(saisie.niveauPreuve)}]::arbre.niveau_preuve[],`,
      `  false`,
      ')',
      'on conflict (code_gedcom) do nothing;',
    ].join('\n');

    morceaux.push('-- Personne (nouvelle fiche, préfixe acte: par convention) -----------------\n' + personneSql);
  } else {
    morceaux.push(
      `-- Personne : rattachée à la fiche existante ${saisie.codeGedcom} (aucun insert).`
    );
  }

  // --- 3. Événement -------------------------------------------------------
  const d = saisie.date;
  const notesEvenement = [
    saisie.cote ? `Cote : ${saisie.cote}.` : null,
    saisie.depot ? `Dépôt : ${saisie.depot}.` : null,
  ].filter(Boolean).join(' ') || null;

  const lieuSelect = saisie.lieuLibelle
    ? `(select id from arbre.lieux where lower(libelle) = lower(${t(saisie.lieuLibelle)}))`
    : 'null';

  const evenementSql = [
    'insert into arbre.evenements (',
    '  personne_id, type, date_texte, annee, mois, jour,',
    '  qualificatif, precision_date, lieu_id, niveau_preuve, notes',
    ')',
    'select p.id,',
    `       ${t(typeInfo.evenement)}::arbre.type_evenement,`,
    `       ${t(d.texte)},`,
    `       ${d.annee ?? 'null'}, ${d.mois ?? 'null'}, ${d.jour ?? 'null'},`,
    `       ${t(d.qualificatif)}::arbre.qualificatif_date,`,
    `       ${t(d.precision)}::arbre.precision_date,`,
    `       ${lieuSelect},`,
    `       ${t(saisie.niveauPreuve)}::arbre.niveau_preuve,`,
    `       ${t(notesEvenement)}`,
    `from arbre.personnes p where p.code_gedcom = ${t(saisie.codeGedcom)}`,
    'on conflict (personne_id, union_id, type, date_texte, lieu_id, detail) do nothing;',
  ].join('\n');

  morceaux.push('-- Événement ---------------------------------------------------------------\n' + evenementSql);

  // --- 4. Source ----------------------------------------------------------
  const texteSource = [
    saisie.transcription ? saisie.transcription : null,
    !saisie.transcription && (saisie.cote || saisie.depot)
      ? `${typeInfo.libelle}, cote ${saisie.cote ?? '(à préciser)'}, ${saisie.depot ?? '(dépôt à préciser)'}.`
      : null,
  ].filter(Boolean).join('\n');

  if (texteSource) {
    const pageSource = [saisie.cote, saisie.depot].filter(Boolean).join(' — ') || null;
    const sourceSql = [
      'insert into arbre.sources (personne_id, texte, page, niveau_preuve)',
      'select p.id,',
      `       ${t(texteSource)},`,
      `       ${t(pageSource)},`,
      `       ${t(saisie.niveauPreuve)}::arbre.niveau_preuve`,
      `from arbre.personnes p where p.code_gedcom = ${t(saisie.codeGedcom)}`,
      'on conflict (personne_id, union_id, evenement_id, texte, page) do nothing;',
    ].join('\n');

    morceaux.push('-- Source (transcription ou cote de la pièce) ------------------------------\n' + sourceSql);
  }

  return morceaux.join('\n\n') + '\n';
}

// ---------------------------------------------------------------------------
// Interaction — les huit questions
// ---------------------------------------------------------------------------

async function poserLesQuestions() {
  console.log('\nCanevas de versement d\'un acte en base.\n');
  console.log('Réponses possibles à toute question : ligne vide pour laisser vide');
  console.log('(sauf mention du contraire), Ctrl+C pour abandonner.\n');

  // 1. Type d'acte
  const typeActe = await demanderChoix('1. Type d\'acte', Object.keys(TYPES_ACTE));

  // 2. Nom et prénoms
  console.log('\n2. Nom et prénoms de la personne concernée.');
  const nom = await demanderObligatoire('   Nom de famille : ');
  const prenoms = await demanderObligatoire('   Prénoms        : ');

  // 3. Date
  console.log('\n3. Date de l\'acte.');
  console.log('   Formats acceptés : « 7 OCT 1907 », « 7 octobre 1907 », « octobre 1907 »,');
  console.log('   « 1907 », « vers 1850 », « avant 1900 », « après 1918 ».');
  const dateBrute = await demander('   Date           : ');
  const date = analyserDate(dateBrute);
  if (dateBrute && date.precision === 'inconnue') {
    console.log(`   (date non reconnue, conservée telle quelle : « ${dateBrute} »)`);
  }

  // 4. Lieu
  console.log('\n4. Lieu, tel qu\'il figure sur l\'acte (composants séparés par des virgules).');
  console.log('   Exemple : « Oran, Département d\'Oran, Algérie ».');
  const lieuLibelle = await demander('   Lieu           : ') || null;

  // 5. Cote et dépôt
  console.log('\n5. Cote de l\'acte et dépôt qui la conserve.');
  const cote = await demander('   Cote           : ') || null;
  const depot = await demander('   Dépôt          : ') || null;

  // 6. Transcription (facultatif)
  console.log('\n6. Transcription libre de l\'acte (facultatif).');
  console.log('   Ligne vide pour passer, ou tapez le texte puis Entrée.');
  const transcription = await demander('   Transcription  : ') || null;

  // 7. Niveau de preuve
  console.log('');
  const niveauPreuve = await demanderChoix('7. Niveau de preuve', NIVEAUX_PREUVE);

  // 8. Rattachement
  console.log('\n8. Rattachement : code_gedcom d\'une personne déjà en base,');
  console.log('   ou « nouveau » pour créer une nouvelle fiche avec un code acte:…');
  const rattachement = await demanderObligatoire('   code_gedcom / nouveau : ');

  const estNouvelle = rattachement.toLowerCase() === 'nouveau';
  const codeGedcom = estNouvelle
    ? `acte:${normaliser(nom)}_${normaliser(prenoms)}`
    : rattachement;

  return {
    typeActe,
    nom,
    prenoms,
    date,
    lieuLibelle,
    cote,
    depot,
    transcription,
    niveauPreuve,
    estNouvelle,
    codeGedcom,
  };
}

// ---------------------------------------------------------------------------
// Écriture du fichier
// ---------------------------------------------------------------------------

/** Nom de fichier horodaté, unique si le même sujet a déjà été saisi aujourd'hui. */
function cheminFichier(saisie) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const base = `${aujourdhui}-${slugFichier(`${saisie.nom}-${saisie.prenoms}`)}`;
  let candidat = resolve(DEST, `${base}.sql`);
  let n = 2;
  while (existsSync(candidat)) {
    candidat = resolve(DEST, `${base}-${n}.sql`);
    n += 1;
  }
  return candidat;
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------

try {
  const saisie = await poserLesQuestions();
  const sql = composerSql(saisie);

  mkdirSync(DEST, { recursive: true });
  const chemin = cheminFichier(saisie);
  writeFileSync(chemin, sql);

  const relatif = chemin.replace(ROOT + '\\', '').replace(ROOT + '/', '').replace(/\\/g, '/');

  console.log('\n=== FICHIER ÉCRIT ===');
  console.log(`  ${relatif}`);
  console.log('\n=== SUITE ===');
  const etapes = [];
  etapes.push('Relisez le SQL — surtout les notes, la cote et le niveau de preuve.');
  if (saisie.estNouvelle) {
    etapes.push(
      `Le code_gedcom retenu est « ${saisie.codeGedcom} » : conservez-le\n` +
      '     entre deux passages pour ne pas recréer la personne.'
    );
  }
  etapes.push(
    'Exécutez le SQL dans le tableau Supabase du projet.\n' +
    `     (par exemple : psql "$DATABASE_URL" -f ${relatif})`
  );
  etapes.forEach((etape, i) => console.log(`  ${i + 1}. ${etape}`));
  console.log('\n  Rien n\'a été envoyé à la base. Tant que le SQL n\'est pas joué,');
  console.log('  ce fichier reste modifiable.');
} finally {
  rl.close();
}
