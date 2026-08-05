/**
 * Rapport de santé de la base de « L'arbre de Léo ».
 *
 *   ARBRE_EMAIL=vous@exemple.fr ARBRE_MOTDEPASSE=… npm run arbre:diag
 *
 * Se connecte comme un membre ordinaire (les mêmes règles RLS s'appliquent qu'à
 * tout le monde) et parcourt la base pour signaler ce qui mérite un regard :
 * comptes globaux, anomalies chronologiques, personnes isolées, doublons
 * potentiels, chantiers en retard, couverture des preuves et têtes
 * d'ascendance.
 *
 * Aucune correction : le diagnostic se contente de dire ce qu'il voit.
 *
 * Sortie avec le code 1 si des anomalies ont été détectées, pour que le script
 * puisse être branché plus tard sur un crochet git pre-commit.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// --- Vérification des variables d'environnement ----------------------------

for (const cle of ['ARBRE_EMAIL', 'ARBRE_MOTDEPASSE']) {
  if (!process.env[cle]) {
    console.error(
      `Variable ${cle} manquante.\n` +
      'Exemple : ARBRE_EMAIL=vous@exemple.fr ARBRE_MOTDEPASSE=… npm run arbre:diag'
    );
    process.exit(1);
  }
}

// --- Lecture manuelle de .env.local ----------------------------------------
// `.env.local` n'est pas chargé automatiquement hors de Next : on le lit ici,
// comme dans scripts/import-medias.mjs.

const env = Object.fromEntries(
  readFileSync(resolve(ROOT, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

// --- Connexion --------------------------------------------------------------

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  db: { schema: 'arbre' },
  auth: { persistSession: false },
});

const { data: session, error: erreurConnexion } = await supabase.auth.signInWithPassword({
  email: process.env.ARBRE_EMAIL,
  password: process.env.ARBRE_MOTDEPASSE,
});

if (erreurConnexion) {
  console.error(`Connexion refusée : ${erreurConnexion.message}`);
  process.exit(1);
}

const { data: membre } = await supabase
  .from('membres')
  .select('nom_affiche, role, statut')
  .eq('id', session.user.id)
  .maybeSingle();

if (!membre || membre.statut !== 'valide') {
  console.error(
    `Ce compte ne peut pas lire la base (statut « ${membre?.statut ?? 'inconnu'} »).`
  );
  process.exit(1);
}

console.log(`Connecté : ${session.user.email} (${membre.role})\n`);

// --- Récupération des tables lues ------------------------------------------

async function chargerTout(table, colonnes) {
  const { data, error } = await supabase.from(table).select(colonnes);
  if (error) {
    console.error(`Lecture de ${table} refusée : ${error.message}`);
    process.exit(1);
  }
  return data ?? [];
}

const [
  personnes,
  unions,
  filiations,
  evenements,
  sources,
  lieux,
  faits,
  faitsPersonnes,
  chantiers,
] = await Promise.all([
  chargerTout('personnes', 'id, code_gedcom, prenoms, nom, nom_complet, presume_vivant, niveaux_preuve'),
  chargerTout('unions', 'id, conjoint_a, conjoint_b'),
  chargerTout('filiations', 'id, union_id, enfant_id'),
  chargerTout('evenements', 'id, personne_id, union_id, type, annee, mois, jour'),
  chargerTout('sources', 'id'),
  chargerTout('lieux', 'id'),
  chargerTout('faits_historiques', 'id, titre, annee_debut, annee_fin'),
  chargerTout('faits_personnes', 'fait_id, personne_id'),
  chargerTout('chantiers_recherche', 'id, titre, statut, demande_le'),
]);

// --- Index de travail -------------------------------------------------------

const personneParId = new Map(personnes.map((p) => [p.id, p]));
const unionParId = new Map(unions.map((u) => [u.id, u]));
const faitParId = new Map(faits.map((f) => [f.id, f]));

/** Année de naissance connue, si l'événement porte une année. */
const naissanceDe = new Map();
/** Année de décès (ou d'inhumation, à défaut) la plus ancienne connue. */
const decesDe = new Map();
/** Nombre d'événements rattachés à chaque personne. */
const nbEvtsParPersonne = new Map();

for (const e of evenements) {
  if (!e.personne_id) continue;
  nbEvtsParPersonne.set(e.personne_id, (nbEvtsParPersonne.get(e.personne_id) ?? 0) + 1);
  if (e.type === 'naissance' && e.annee) {
    if (!naissanceDe.has(e.personne_id)) naissanceDe.set(e.personne_id, e.annee);
  }
  if ((e.type === 'deces' || e.type === 'inhumation') && e.annee) {
    const dejaConnu = decesDe.get(e.personne_id);
    if (dejaConnu === undefined || e.annee < dejaConnu) decesDe.set(e.personne_id, e.annee);
  }
}

const conjointsAvecUnion = new Set();
for (const u of unions) {
  if (u.conjoint_a) conjointsAvecUnion.add(u.conjoint_a);
  if (u.conjoint_b) conjointsAvecUnion.add(u.conjoint_b);
}
const enfantsAvecFiliation = new Set(filiations.map((f) => f.enfant_id));

// --- Petit rendu de tableau ASCII ------------------------------------------

function tableAscii(entetes, lignes) {
  if (lignes.length === 0) return '  (rien à signaler)\n';
  const largeurs = entetes.map((titre, i) =>
    Math.max(String(titre).length, ...lignes.map((l) => String(l[i] ?? '').length))
  );
  const barre = '+' + largeurs.map((l) => '-'.repeat(l + 2)).join('+') + '+';
  const ligne = (vals) =>
    '| ' + vals.map((v, i) => String(v ?? '').padEnd(largeurs[i])).join(' | ') + ' |';
  return [barre, ligne(entetes), barre, ...lignes.map(ligne), barre].join('\n') + '\n';
}

/** Coupe court pour ne pas défoncer la largeur des tableaux. */
const court = (t, n = 40) => (t && t.length > n ? t.slice(0, n - 1) + '…' : (t ?? ''));

const anomalies = [];

// ---------------------------------------------------------------------------
// 1. Comptes globaux
// ---------------------------------------------------------------------------

console.log('=== COMPTES GLOBAUX ===\n');
console.log(tableAscii(
  ['Table', 'Enregistrements'],
  [
    ['personnes', personnes.length],
    ['unions', unions.length],
    ['filiations', filiations.length],
    ['événements', evenements.length],
    ['sources', sources.length],
    ['lieux', lieux.length],
    ['faits historiques', faits.length],
    ['chantiers de recherche', chantiers.length],
  ],
));

// ---------------------------------------------------------------------------
// 2. Anomalies chronologiques
// ---------------------------------------------------------------------------

console.log('=== ANOMALIES CHRONOLOGIQUES ===\n');

// 2a. Décès antérieur à la naissance
const decesAvantNaissance = [];
for (const p of personnes) {
  const n = naissanceDe.get(p.id);
  const d = decesDe.get(p.id);
  if (n && d && d < n) {
    decesAvantNaissance.push([court(p.nom_complet), n, d]);
    anomalies.push(`${p.nom_complet} : décès (${d}) antérieur à la naissance (${n})`);
  }
}
console.log('Personnes dont le décès précède la naissance :');
console.log(tableAscii(['Personne', 'Naissance', 'Décès'], decesAvantNaissance));

// 2b. Enfants nés avant leurs parents et écarts parent-enfant hors [12, 60] ans
const parentsParEnfant = new Map();
for (const f of filiations) {
  const u = unionParId.get(f.union_id);
  if (!u) continue;
  const parents = parentsParEnfant.get(f.enfant_id) ?? [];
  if (u.conjoint_a) parents.push(u.conjoint_a);
  if (u.conjoint_b) parents.push(u.conjoint_b);
  parentsParEnfant.set(f.enfant_id, parents);
}

const enfantAvantParent = [];
const ecartHorsPlage = [];
for (const [enfantId, parentsIds] of parentsParEnfant) {
  const enfant = personneParId.get(enfantId);
  const nEnfant = naissanceDe.get(enfantId);
  if (!enfant || !nEnfant) continue;
  for (const parentId of parentsIds) {
    const parent = personneParId.get(parentId);
    const nParent = naissanceDe.get(parentId);
    if (!parent || !nParent) continue;
    const ecart = nEnfant - nParent;
    if (ecart <= 0) {
      enfantAvantParent.push([court(enfant.nom_complet), nEnfant, court(parent.nom_complet), nParent]);
      anomalies.push(
        `${enfant.nom_complet} (${nEnfant}) né avant son parent ${parent.nom_complet} (${nParent})`
      );
    } else if (ecart < 12 || ecart > 60) {
      ecartHorsPlage.push([
        court(parent.nom_complet), nParent, court(enfant.nom_complet), nEnfant, `${ecart} ans`,
      ]);
      anomalies.push(
        `Écart parent-enfant invraisemblable (${ecart} ans) : ${parent.nom_complet} → ${enfant.nom_complet}`
      );
    }
  }
}
console.log('Enfants nés avant leurs parents :');
console.log(tableAscii(['Enfant', 'Né en', 'Parent', 'Né en'], enfantAvantParent));

console.log('Écarts parent-enfant hors [12, 60] ans :');
console.log(tableAscii(['Parent', 'Né en', 'Enfant', 'Né en', 'Écart'], ecartHorsPlage));

// 2c. Faits historiques rattachés hors période de vie
// Tolérance de cinq ans après la mort : une mention nécrologique reste plausible.
const TOLERANCE_APRES_DECES = 5;
const faitsHorsPeriode = [];
for (const fp of faitsPersonnes) {
  const p = personneParId.get(fp.personne_id);
  const f = faitParId.get(fp.fait_id);
  if (!p || !f || !f.annee_debut) continue;
  const n = naissanceDe.get(fp.personne_id);
  const d = decesDe.get(fp.personne_id);
  if (n && f.annee_debut < n) {
    faitsHorsPeriode.push([court(f.titre, 30), f.annee_debut, court(p.nom_complet), `né en ${n}`]);
    anomalies.push(
      `Fait « ${f.titre} » (${f.annee_debut}) rattaché à ${p.nom_complet}, né en ${n}`
    );
  } else if (d && f.annee_debut > d + TOLERANCE_APRES_DECES) {
    faitsHorsPeriode.push([court(f.titre, 30), f.annee_debut, court(p.nom_complet), `mort en ${d}`]);
    anomalies.push(
      `Fait « ${f.titre} » (${f.annee_debut}) rattaché à ${p.nom_complet}, mort en ${d}`
    );
  }
}
console.log('Faits historiques rattachés hors période de vie :');
console.log(tableAscii(['Fait', 'Année', 'Personne', 'État'], faitsHorsPeriode));

// ---------------------------------------------------------------------------
// 3. Personnes isolées
// ---------------------------------------------------------------------------

console.log('=== PERSONNES ISOLÉES ===\n');
const isolees = [];
for (const p of personnes) {
  const aEvts = (nbEvtsParPersonne.get(p.id) ?? 0) > 0;
  const aUnion = conjointsAvecUnion.has(p.id);
  const aFiliation = enfantsAvecFiliation.has(p.id);
  if (!aEvts && !aUnion && !aFiliation) {
    isolees.push([court(p.nom_complet), p.code_gedcom ?? '']);
    anomalies.push(`Personne isolée : ${p.nom_complet}`);
  }
}
console.log('Sans événement, sans union, sans filiation :');
console.log(tableAscii(['Personne', 'Code GEDCOM'], isolees));

// ---------------------------------------------------------------------------
// 4. Doublons potentiels
// ---------------------------------------------------------------------------

console.log('=== DOUBLONS POTENTIELS ===\n');

function normaliser(texte) {
  return (texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const parCle = new Map();
for (const p of personnes) {
  const n = naissanceDe.get(p.id);
  // Sans année, on ne peut rien affirmer : deux homonymes ne sont pas la même
  // personne pour autant. On ne cherche donc que les doublons avérés par la date.
  if (!n) continue;
  const cle = `${normaliser(p.prenoms)}|${normaliser(p.nom)}|${n}`;
  const groupe = parCle.get(cle) ?? [];
  groupe.push(p);
  parCle.set(cle, groupe);
}

const doublons = [];
for (const groupe of parCle.values()) {
  if (groupe.length < 2) continue;
  for (const p of groupe) {
    doublons.push([
      court(p.nom_complet), naissanceDe.get(p.id), p.code_gedcom ?? '', p.id,
    ]);
  }
  anomalies.push(
    `Doublon potentiel : ${groupe.map((p) => `${p.nom_complet} [${p.code_gedcom ?? p.id}]`).join(' + ')}`
  );
}
console.log('Même prénom + nom + année de naissance :');
console.log(tableAscii(['Personne', 'Naissance', 'Code GEDCOM', 'id'], doublons));

// ---------------------------------------------------------------------------
// 5. Chantiers en retard
// ---------------------------------------------------------------------------

const MAX_JOURS_ATTENTE = 60;
const AUJOURDHUI = new Date();

console.log('=== CHANTIERS EN RETARD ===\n');
const enRetard = [];
for (const c of chantiers) {
  if (c.statut !== 'en_attente_reponse' || !c.demande_le) continue;
  const jours = Math.round((AUJOURDHUI - new Date(c.demande_le)) / 86_400_000);
  if (jours > MAX_JOURS_ATTENTE) {
    enRetard.push([court(c.titre, 50), c.demande_le, `${jours} j`]);
    anomalies.push(`Chantier en retard (${jours} jours) : ${c.titre}`);
  }
}
console.log(`Statut « en_attente_reponse » depuis plus de ${MAX_JOURS_ATTENTE} jours :`);
console.log(tableAscii(['Chantier', 'Demandé le', 'Écoulé'], enRetard));

// ---------------------------------------------------------------------------
// 6. Couverture
// ---------------------------------------------------------------------------

console.log('=== COUVERTURE ===\n');
const total = personnes.length;
const avecNaissance = personnes.filter((p) => naissanceDe.has(p.id)).length;
const avecPreuveActe = personnes.filter((p) =>
  (p.niveaux_preuve ?? []).some((n) => n === 'acte' || n === 'anom')
).length;

const part = (n) => (total ? `${((n / total) * 100).toFixed(1)} %` : '—');

console.log(tableAscii(
  ['Indicateur', 'Compte', 'Sur', 'Part'],
  [
    ['Personnes avec année de naissance', avecNaissance, total, part(avecNaissance)],
    ['Personnes prouvées par acte ou ANOM', avecPreuveActe, total, part(avecPreuveActe)],
  ]
));

// ---------------------------------------------------------------------------
// 7. Têtes d'ascendance
// ---------------------------------------------------------------------------

console.log('=== CINQ PERSONNES LES PLUS ANCIENNES ===\n');
const anciennes = [...personnes]
  .filter((p) => naissanceDe.has(p.id))
  .sort((a, b) => naissanceDe.get(a.id) - naissanceDe.get(b.id))
  .slice(0, 5)
  .map((p) => [
    naissanceDe.get(p.id),
    court(p.nom_complet),
    decesDe.get(p.id) ?? '',
    p.code_gedcom ?? '',
  ]);
console.log('Un coup d\'œil pour vérifier que les têtes d\'ascendance n\'ont pas bougé :');
console.log(tableAscii(['Naissance', 'Personne', 'Décès', 'Code GEDCOM'], anciennes));

// ---------------------------------------------------------------------------
// Bilan et code de sortie
// ---------------------------------------------------------------------------

console.log('=== BILAN ===');
if (anomalies.length === 0) {
  console.log('Aucune anomalie détectée. La base est saine.');
  process.exit(0);
}

console.log(`${anomalies.length} anomalie(s) à examiner :`);
for (const a of anomalies.slice(0, 20)) console.log(`  · ${a}`);
if (anomalies.length > 20) console.log(`  … et ${anomalies.length - 20} autres (voir sections ci-dessus).`);
process.exit(1);
