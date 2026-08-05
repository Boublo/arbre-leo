/**
 * Verse les actes et photographies déjà numérisés dans le stockage privé.
 *
 *   ARBRE_EMAIL=... ARBRE_MOTDEPASSE=... node scripts/import-medias.mjs [--pour-de-vrai]
 *
 * Le script se connecte comme un membre ordinaire : il ne dispose d'aucune clé
 * privilégiée, et les politiques RLS s'appliquent à lui comme à tout le monde.
 * Le compte utilisé doit donc être validé et avoir le droit de contribuer.
 *
 * Sans `--pour-de-vrai`, rien n'est envoyé : le script se contente d'annoncer
 * ce qu'il ferait. Commencez toujours par là.
 *
 * Les fichiers à verser sont déclarés dans `scripts/medias.config.mjs`.
 */

import { readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const POUR_DE_VRAI = process.argv.includes('--pour-de-vrai');

// --- Configuration ----------------------------------------------------------

for (const cle of ['ARBRE_EMAIL', 'ARBRE_MOTDEPASSE']) {
  if (!process.env[cle]) {
    console.error(`Variable ${cle} manquante.\n` +
      'Exemple : ARBRE_EMAIL=vous@exemple.fr ARBRE_MOTDEPASSE=… node scripts/import-medias.mjs');
    process.exit(1);
  }
}

// `.env.local` n'est pas chargé automatiquement hors de Next : on le lit ici.
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const { MEDIAS } = await import('./medias.config.mjs').catch(() => {
  console.error(
    'Aucune déclaration de médias.\n' +
    'Copiez scripts/medias.config.example.mjs en scripts/medias.config.mjs.'
  );
  process.exit(1);
});

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.tif': 'image/tiff', '.tiff': 'image/tiff',
  '.pdf': 'application/pdf',
};

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

const utilisateur = session.user;
console.log(`Connecté : ${utilisateur.email}`);

const { data: membre } = await supabase
  .from('membres')
  .select('nom_affiche, role, statut')
  .eq('id', utilisateur.id)
  .maybeSingle();

if (!membre || membre.statut !== 'valide' || !['admin', 'contributeur'].includes(membre.role)) {
  console.error(
    `Ce compte n'a pas le droit de déposer (statut « ${membre?.statut ?? 'inconnu'} », ` +
    `rôle « ${membre?.role ?? 'inconnu'} »).`
  );
  process.exit(1);
}

// --- Rattachement aux personnes --------------------------------------------

const { data: personnes } = await supabase.from('personnes').select('id, nom_complet, code_gedcom');
const parNom = new Map((personnes ?? []).map((p) => [normaliser(p.nom_complet ?? ''), p]));

function normaliser(texte) {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Retrouve une personne par son nom, même approximatif. */
function trouverPersonne(nom) {
  const cible = normaliser(nom);
  if (parNom.has(cible)) return parNom.get(cible);

  // À défaut d'égalité, on accepte celle dont le nom contient tous les mots cherchés.
  const mots = cible.split(' ').filter(Boolean);
  const candidats = (personnes ?? []).filter((p) => {
    const n = normaliser(p.nom_complet ?? '');
    return mots.every((m) => n.includes(m));
  });
  return candidats.length === 1 ? candidats[0] : null;
}

// --- Versement --------------------------------------------------------------

let verses = 0;
let ignores = 0;
const introuvables = [];

for (const media of MEDIAS) {
  const cheminLocal = resolve(HERE, media.fichier);

  let taille;
  try {
    taille = statSync(cheminLocal).size;
  } catch {
    console.log(`  ✕ ${basename(media.fichier)} — fichier absent`);
    ignores += 1;
    continue;
  }

  const extension = extname(cheminLocal).toLowerCase();
  const mime = MIME[extension];
  if (!mime) {
    console.log(`  ✕ ${basename(media.fichier)} — format ${extension} non accepté`);
    ignores += 1;
    continue;
  }

  const rattachements = (media.personnes ?? [])
    .map((nom) => ({ nom, personne: trouverPersonne(nom) }));

  for (const r of rattachements) {
    if (!r.personne) introuvables.push(`${basename(media.fichier)} → « ${r.nom} »`);
  }

  const cheminDistant = `${utilisateur.id}/${media.type}/${basename(media.fichier)}`;

  console.log(
    `  ${POUR_DE_VRAI ? '→' : '·'} ${basename(media.fichier)} ` +
    `(${Math.round(taille / 1024)} Ko, ${media.type}) ` +
    `→ ${rattachements.filter((r) => r.personne).length} personne(s)`
  );

  if (!POUR_DE_VRAI) {
    verses += 1;
    continue;
  }

  const { error: erreurDepot } = await supabase.storage
    .from('arbre-medias')
    .upload(cheminDistant, readFileSync(cheminLocal), { contentType: mime, upsert: true });

  if (erreurDepot) {
    console.log(`      ✕ dépôt refusé : ${erreurDepot.message}`);
    ignores += 1;
    continue;
  }

  const { data: ligne, error: erreurLigne } = await supabase
    .from('medias')
    .upsert(
      {
        chemin: cheminDistant,
        type: media.type,
        titre: media.titre,
        description: media.description ?? null,
        annee: media.annee ?? null,
        transcription: media.transcription ?? null,
        cote: media.cote ?? null,
        depot: media.depot ?? null,
        mime,
        taille_octets: taille,
        depose_par: utilisateur.id,
      },
      { onConflict: 'chemin' }
    )
    .select('id')
    .single();

  if (erreurLigne) {
    console.log(`      ✕ enregistrement refusé : ${erreurLigne.message}`);
    ignores += 1;
    continue;
  }

  const liens = rattachements
    .filter((r) => r.personne)
    .map((r) => ({ media_id: ligne.id, personne_id: r.personne.id, role: 'sujet' }));

  if (liens.length) {
    await supabase.from('medias_personnes').upsert(liens, { onConflict: 'media_id,personne_id' });
  }

  verses += 1;
}

console.log(
  `\n${POUR_DE_VRAI ? 'Versés' : 'À verser'} : ${verses} · Ignorés : ${ignores}`
);

if (introuvables.length) {
  console.log('\nPersonnes non retrouvées dans l’arbre (le média est versé sans le lien) :');
  for (const i of introuvables) console.log(`  · ${i}`);
}

if (!POUR_DE_VRAI) {
  console.log('\nEssai à blanc. Relancez avec --pour-de-vrai pour envoyer.');
}
