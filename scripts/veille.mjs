/**
 * Ce que la base compte aujourd'hui, comparé à la dernière fois qu'on a regardé.
 *
 *   ARBRE_EMAIL=… ARBRE_MOTDEPASSE=… node scripts/veille.mjs
 *
 * Utile quand l'autre agent de recherche vient de faire une session : on
 * lance ce script et il dit en une passe qui a été ajouté, corrigé, à quoi
 * s'attendre en base.
 *
 * L'instantané précédent vit dans `data/veille.json` (dossier `/data/` exclu
 * de git par le .gitignore). Le fichier est réécrit à chaque passage.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const EMPREINTE = resolve(ROOT, 'data/veille.json');

// --- Connexion --------------------------------------------------------------

for (const cle of ['ARBRE_EMAIL', 'ARBRE_MOTDEPASSE']) {
  if (!process.env[cle]) {
    console.error(`Variable ${cle} manquante.\n` +
      'Exemple : ARBRE_EMAIL=vous@exemple.fr ARBRE_MOTDEPASSE=… npm run arbre:veille');
    process.exit(2);
  }
}

const env = Object.fromEntries(
  readFileSync(resolve(ROOT, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  db: { schema: 'arbre' },
  auth: { persistSession: false },
});

const { error: erreurConnexion } = await supabase.auth.signInWithPassword({
  email: process.env.ARBRE_EMAIL,
  password: process.env.ARBRE_MOTDEPASSE,
});
if (erreurConnexion) {
  console.error(`Connexion refusée : ${erreurConnexion.message}`);
  process.exit(2);
}

// --- Lecture de l'état courant ---------------------------------------------

async function comptes() {
  const [pers, unions, filiations, evts, sources, faits, chantiers, souvenirs] = await Promise.all([
    supabase.from('personnes').select('id', { count: 'exact', head: true }),
    supabase.from('unions').select('id', { count: 'exact', head: true }),
    supabase.from('filiations').select('id', { count: 'exact', head: true }),
    supabase.from('evenements').select('id', { count: 'exact', head: true }),
    supabase.from('sources').select('id', { count: 'exact', head: true }),
    supabase.from('faits_historiques').select('id', { count: 'exact', head: true }),
    supabase.from('chantiers_recherche').select('id', { count: 'exact', head: true }),
    supabase.from('souvenirs').select('id', { count: 'exact', head: true }),
  ]);
  return {
    personnes: pers.count ?? 0,
    unions: unions.count ?? 0,
    filiations: filiations.count ?? 0,
    evenements: evts.count ?? 0,
    sources: sources.count ?? 0,
    faits: faits.count ?? 0,
    chantiers: chantiers.count ?? 0,
    souvenirs: souvenirs.count ?? 0,
  };
}

/** État léger pour la comparaison : ce qui suffit à repérer les changements. */
async function instantane() {
  const [personnesRes, unionsRes, sourcesRes] = await Promise.all([
    supabase
      .from('personnes')
      .select('id, code_gedcom, nom_complet, cree_le, modifie_le'),
    supabase.from('unions').select('id, code_gedcom, cree_le'),
    supabase.from('sources').select('id, personne_id, niveau_preuve, cree_le'),
  ]);
  return {
    date: new Date().toISOString(),
    comptes: await comptes(),
    personnes: Object.fromEntries(
      (personnesRes.data ?? []).map((p) => [
        p.id,
        {
          code: p.code_gedcom,
          nom: p.nom_complet,
          cree: p.cree_le,
          modifie: p.modifie_le,
        },
      ])
    ),
    unions: Object.fromEntries(
      (unionsRes.data ?? []).map((u) => [u.id, { code: u.code_gedcom, cree: u.cree_le }])
    ),
    sources: (sourcesRes.data ?? []).map((s) => ({
      id: s.id,
      personneId: s.personne_id,
      niveau: s.niveau_preuve,
      cree: s.cree_le,
    })),
  };
}

const courant = await instantane();

// --- Comparaison avec le passage précédent ---------------------------------

const precedent = existsSync(EMPREINTE) ? JSON.parse(readFileSync(EMPREINTE, 'utf8')) : null;

if (!precedent) {
  console.log('Premier passage — état de départ enregistré.\n');
  console.log(`  ${courant.comptes.personnes} personnes, ${courant.comptes.unions} unions,`);
  console.log(`  ${courant.comptes.evenements} événements, ${courant.comptes.sources} sources.`);
  writeFileSync(EMPREINTE, JSON.stringify(courant, null, 2));
  process.exit(0);
}

const idsAvant = new Set(Object.keys(precedent.personnes));
const idsApres = new Set(Object.keys(courant.personnes));

const nouvellesPersonnes = [...idsApres].filter((id) => !idsAvant.has(id));
const disparues = [...idsAvant].filter((id) => !idsApres.has(id));
const modifiees = [...idsApres].filter((id) => {
  if (!idsAvant.has(id)) return false;
  const a = precedent.personnes[id];
  const b = courant.personnes[id];
  return a.nom !== b.nom || a.modifie !== b.modifie;
});

const sourcesPrecedentes = new Set((precedent.sources ?? []).map((s) => s.id));
const nouvellesSources = (courant.sources ?? []).filter((s) => !sourcesPrecedentes.has(s.id));

const parNiveau = new Map();
for (const s of nouvellesSources) {
  const k = s.niveau ?? 'inconnu';
  parNiveau.set(k, (parNiveau.get(k) ?? 0) + 1);
}

// --- Rapport ---------------------------------------------------------------

const depuis = new Date(precedent.date);
const dureeH = (Date.now() - depuis.getTime()) / 3_600_000;
const quandDit =
  dureeH < 1 ? `il y a ${Math.round(dureeH * 60)} minutes` :
  dureeH < 24 ? `il y a ${Math.round(dureeH)} heures` :
  `il y a ${Math.round(dureeH / 24)} jours`;

console.log(`Dernière veille ${quandDit}, le ${depuis.toISOString().slice(0, 16).replace('T', ' à ')}\n`);

// Comptes
const cAv = precedent.comptes, cAp = courant.comptes;
const diff = (k) => (cAp[k] - cAv[k]);
const signe = (n) => (n > 0 ? `+${n}` : n < 0 ? String(n) : '');
const tableau = [
  ['Personnes', cAp.personnes, diff('personnes')],
  ['Unions', cAp.unions, diff('unions')],
  ['Filiations', cAp.filiations, diff('filiations')],
  ['Événements', cAp.evenements, diff('evenements')],
  ['Sources', cAp.sources, diff('sources')],
  ['Faits historiques', cAp.faits, diff('faits')],
  ['Chantiers', cAp.chantiers, diff('chantiers')],
  ['Souvenirs', cAp.souvenirs, diff('souvenirs')],
];
console.log('COMPTES :');
for (const [libelle, valeur, delta] of tableau) {
  const s = signe(delta);
  const marqueur = s ? `  ${s.padStart(4)} → ${valeur}` : `        ${valeur}`;
  console.log(`  ${libelle.padEnd(20)} ${marqueur}`);
}
console.log();

let alerte = false;

if (nouvellesPersonnes.length > 0) {
  console.log(`NOUVELLES PERSONNES (${nouvellesPersonnes.length}) :`);
  const details = nouvellesPersonnes
    .map((id) => courant.personnes[id])
    .sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''));
  for (const p of details.slice(0, 30)) {
    console.log(`  · ${p.nom.padEnd(38)} [${p.code ?? '—'}]`);
  }
  if (details.length > 30) console.log(`  … et ${details.length - 30} autres`);
  console.log();
}

if (modifiees.length > 0) {
  console.log(`CORRIGÉES (${modifiees.length}) :`);
  for (const id of modifiees.slice(0, 20)) {
    const a = precedent.personnes[id];
    const b = courant.personnes[id];
    if (a.nom !== b.nom) {
      console.log(`  · ${a.nom}  →  ${b.nom}`);
    } else {
      console.log(`  · ${b.nom}  (mise à jour)`);
    }
  }
  if (modifiees.length > 20) console.log(`  … et ${modifiees.length - 20} autres`);
  console.log();
}

if (nouvellesSources.length > 0) {
  console.log(`NOUVELLES SOURCES (${nouvellesSources.length}) :`);
  for (const [niveau, n] of [...parNiveau.entries()].sort()) {
    console.log(`  ${niveau.padEnd(12)} ${n}`);
  }
  console.log();
}

if (disparues.length > 0) {
  alerte = true;
  console.log(`⚠  PERSONNES DISPARUES (${disparues.length}) — anormal, à vérifier :`);
  for (const id of disparues) {
    console.log(`  · ${precedent.personnes[id].nom}  [${precedent.personnes[id].code ?? '—'}]`);
  }
  console.log();
}

if (
  nouvellesPersonnes.length === 0 &&
  modifiees.length === 0 &&
  nouvellesSources.length === 0 &&
  disparues.length === 0
) {
  console.log('Rien n’a bougé depuis la dernière veille.');
}

writeFileSync(EMPREINTE, JSON.stringify(courant, null, 2));

process.exit(alerte ? 1 : 0);
