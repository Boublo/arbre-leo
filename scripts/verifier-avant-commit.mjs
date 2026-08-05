/**
 * Filet de sécurité pré-commit pour « L'arbre de Léo ».
 *
 *   node scripts/verifier-avant-commit.mjs
 *
 * Ce dépôt est public : rien de familial ne doit y entrer. Le `.gitignore` en
 * bloque déjà l'essentiel, ce script complète en relisant la version indexée
 * (staged) de chaque fichier sur le point d'être commité. Il refuse le commit
 * si l'un des filtres suivants s'allume :
 *
 *   1. Un patronyme de la famille écrit en clair, hors des fichiers où sa
 *      présence est assumée (README, docs de passation, exemples de config).
 *   2. Un prénom potentiellement réel combiné à un contexte identifiant :
 *      une année de naissance postérieure à 1930, ou un autre prénom sur la
 *      même ligne (composé « prénom + patronyme » typique d'un état civil).
 *   3. Un fichier de type privé (GEDCOM, acte numérisé, photo de famille)
 *      malgré le `.gitignore` — le filet double la ceinture.
 *   4. Un secret : jeton JWT Supabase, clé serveur `sb_secret_…`, URL de
 *      base ou service portant un mot de passe en clair, clé API tierce.
 *
 * Le script sort en code 1 en cas de violation, en pointant le fichier et la
 * ligne. Sans staging, il ne fait rien.
 *
 * Il peut être branché comme crochet git :
 *
 *   git config core.hooksPath .githooks
 *
 * — voir README.md et .githooks/pre-commit. Il n'est PAS activé par défaut :
 * c'est un outil sur mesure pour ce dépôt-ci, à choisir explicitement.
 */

import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

// ---------------------------------------------------------------------------
// Règles — ce que le filet cherche
// ---------------------------------------------------------------------------

/**
 * Patronymes de la famille. Chacun, pris isolément, est porté par des milliers
 * de personnes sans rapport ; c'est leur présence dans le code de CE dépôt qui
 * est problématique, parce qu'elle donne prise à un recoupement avec le reste
 * des indices publics du projet. La liste est déjà publique dans
 * `docs/PASSATION.md` : la reprendre ici ne divulgue rien de nouveau.
 */
const PATRONYMES = [
  'CHEREAU', 'SUIRE', 'SEGURA', 'BATALLER', 'SALMERON', 'BONDURAND',
  'ROPERO', 'BONINO', 'CHATAIGNIER', 'BOUSQUIER', 'SEVILLA', 'FABRA',
  'GOMEZ', 'BORRAYO', 'TORRES', 'MIRALLES', 'MUNOZ', 'ALLEMAND',
  'CARO', 'SERAZIN', 'LEPINE', 'MEANCE', 'VALLEE', 'GIMENEZ',
];

/**
 * Prénoms potentiellement réels. Beaucoup sont des mots français courants
 * (Pierre, Claude, Louis…) : on ne les signale que quand un autre indice les
 * situe dans un état civil — une année sensible, un autre prénom.
 * Formes accentuées et non accentuées : les deux graphies circulent dans les
 * pièces d'origine et dans les notes.
 */
const PRENOMS = [
  'Leo', 'Léo', 'Mathias', 'Loic', 'Loïc', 'David', 'Laura',
  'Christian', 'Sylviane', 'Corine', 'Corinne', 'Pierre', 'Pilar',
  'Jose', 'José', 'Sandrine', 'Aurora', 'Aurore', 'Veronique', 'Véronique',
  'Luc', 'Gerald', 'Gérald', 'Joseph', 'Josefa', 'Vicente', 'Pedro',
  'Louise', 'Louis', 'Liliane', 'Lucette', 'Claude', 'Narcisse',
  'Leone', 'Léone', 'Jean-Marc', 'Marie-Thérèse', 'Marie-Therese',
  'Francois', 'François', 'Gilles', 'Steve', 'Salvador', 'Gracia',
  'Felipe', 'Vincent', 'Manuel', 'Francisco', 'Francisca',
];

/**
 * Fichiers où la présence de ces mentions est légitime. Les listes ci-dessus
 * s'y arrêtent, mais les filtres « secrets » et « fichiers privés »
 * continuent de s'appliquer partout.
 */
const AUTORISES = new Set([
  '.env.example',
  'scripts/sources.config.example.mjs',
  'scripts/verifier-avant-commit.mjs',
  '.githooks/pre-commit',
  'docs/PASSATION.md',
  'docs/DONNEES.md',
  'README.md',
]);

// Types de fichiers qu'aucune situation ne justifie de commiter.
const EXTENSIONS_INTERDITES = /\.(ged|gedcom)$/i;
const NOMS_INTERDITS = /^(acte[^\\/]*\.(jpe?g|png|pdf|tiff?)|photo_[^\\/]*\.(jpe?g|png|tiff?))$/i;

// ---------------------------------------------------------------------------
// Détecteurs — expressions rationnelles préparées une fois
// ---------------------------------------------------------------------------

/** Un patronyme entouré de bords de mot ; on garde la casse d'origine. */
const RX_PATRONYME = new RegExp('\\b(' + PATRONYMES.join('|') + ')\\b');

/** Un prénom, avec bord de mot. Les prénoms accentués incluent leurs diacritiques. */
const RX_PRENOM = new RegExp('(?:^|[^\\p{L}])(' + PRENOMS.join('|') + ')(?=$|[^\\p{L}])', 'u');
const RX_PRENOM_G = new RegExp('(?:^|[^\\p{L}])(' + PRENOMS.join('|') + ')(?=$|[^\\p{L}])', 'gu');

/**
 * Année « sensible » : 1931 à 2029. Assez haute pour signaler une date de
 * naissance de personne présumée vivante ou d'événement récent, assez basse
 * pour ne pas balayer les dates de mariages du XIX siècle ou l'année en cours
 * quand elle apparaît seule dans un horodatage.
 */
const RX_ANNEE_SENSIBLE = /\b(19[3-9]\d|20[0-2]\d)\b/;

/** Jeton JWT (les publishable/anon keys Supabase commencent par eyJ...). */
const RX_JWT = /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/;

/** Nouvelle clé secrète Supabase, format sb_secret_… */
const RX_SB_SECRET = /\bsb_secret_[A-Za-z0-9_-]{16,}\b/;

/** URL contenant `utilisateur:motdepasse@` — cas typique d'un DATABASE_URL. */
const RX_URL_AVEC_MDP =
  /\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqps?):\/\/[^\s"'<>]*:[^\s"'@\/<>]+@/i;

/** Autres clés API bien identifiées. */
const RX_CLE_API =
  /\b(sk-[A-Za-z0-9_-]{20,}|xox[abposr]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b/;

// ---------------------------------------------------------------------------
// Lecture de l'index git
// ---------------------------------------------------------------------------

/** Fichiers ajoutés, copiés ou modifiés dans l'index. */
function fichiersEnStaging() {
  try {
    const sortie = execFileSync(
      'git',
      ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
      { encoding: 'utf8' }
    );
    return sortie.split(/\r?\n/).filter(Boolean);
  } catch (err) {
    console.error("Impossible de lire l'index git : " + (err.message ?? err));
    process.exit(2);
  }
}

/**
 * Lit la version *indexée* d'un fichier (celle qui va vraiment être commitée),
 * pas la copie de travail : entre `git add` et `git commit`, l'utilisateur a
 * pu revenir sur ses modifications.
 */
function lireStaging(chemin) {
  try {
    return execFileSync('git', ['show', ':' + chemin], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vérifications
// ---------------------------------------------------------------------------

class Violations {
  constructor() {
    this.liste = [];
  }
  ajouter(chemin, ligne, message) {
    this.liste.push({ chemin, ligne, message });
  }
  get taille() {
    return this.liste.length;
  }
  afficher() {
    for (const v of this.liste) {
      const position = v.ligne ? ':' + v.ligne : '';
      console.error('  ' + v.chemin + position + '  ' + v.message);
    }
  }
}

/** Vérifie le chemin lui-même : extension, motif de nom. */
function verifierChemin(chemin, violations) {
  const nom = basename(chemin);
  if (EXTENSIONS_INTERDITES.test(chemin)) {
    violations.ajouter(
      chemin,
      null,
      'fichier généalogique (*.ged, *.gedcom) — les GEDCOM vivent hors du dépôt'
    );
  }
  if (NOMS_INTERDITS.test(nom)) {
    violations.ajouter(
      chemin,
      null,
      'nom de fichier suspect (' + nom + ') — actes et photos ne se versionnent pas'
    );
  }
}

/** Extrait un morceau centré autour de la première occurrence, pour le message. */
function extrait(ligne, index, longueur = 60) {
  const debut = Math.max(0, index - 15);
  const fin = Math.min(ligne.length, debut + longueur);
  let morceau = ligne.slice(debut, fin).replace(/\s+/g, ' ').trim();
  if (debut > 0) morceau = '…' + morceau;
  if (fin < ligne.length) morceau = morceau + '…';
  return morceau;
}

/** Détection ligne par ligne. */
function verifierContenu(chemin, contenu, violations) {
  const cheminNorm = chemin.replace(/\\/g, '/');
  const autorise = AUTORISES.has(cheminNorm);
  const lignes = contenu.split(/\r?\n/);

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];
    const num = i + 1;

    // Secrets — jamais autorisés, y compris dans les fichiers de la liste blanche.
    if (RX_JWT.test(ligne)) {
      violations.ajouter(chemin, num, 'jeton JWT (commence par eyJ…) — clé Supabase probable');
    }
    if (RX_SB_SECRET.test(ligne)) {
      violations.ajouter(chemin, num, 'clé secrète Supabase (sb_secret_…) — ne doit jamais partir');
    }
    if (RX_CLE_API.test(ligne)) {
      violations.ajouter(chemin, num, 'clé API tierce (sk-…, xox…, AKIA…, ghp_…)');
    }
    if (RX_URL_AVEC_MDP.test(ligne)) {
      violations.ajouter(chemin, num, 'URL portant un mot de passe en clair (utilisateur:motdepasse@…)');
    }

    if (autorise) continue;

    // Un patronyme suffit : la liste est courte et spécifique.
    const patron = RX_PATRONYME.exec(ligne);
    if (patron) {
      violations.ajouter(
        chemin,
        num,
        'patronyme familial « ' + patron[1] + ' » (contexte : ' + extrait(ligne, patron.index) + ')'
      );
    }

    // Un prénom seul ne suffit pas — Pierre, Claude, Louis sont trop communs.
    // On signale s'il coïncide avec une année postérieure à 1930 ou un autre prénom.
    RX_PRENOM_G.lastIndex = 0;
    const prenomsSurLigne = [];
    let m;
    while ((m = RX_PRENOM_G.exec(ligne)) !== null) {
      prenomsSurLigne.push({ nom: m[1], index: m.index + (m[0].length - m[1].length) });
      if (RX_PRENOM_G.lastIndex === m.index) RX_PRENOM_G.lastIndex++;
    }
    if (prenomsSurLigne.length === 0) continue;

    const annee = RX_ANNEE_SENSIBLE.exec(ligne);
    if (annee) {
      const p = prenomsSurLigne[0];
      violations.ajouter(
        chemin,
        num,
        'prénom « ' + p.nom + ' » et année ' + annee[1] +
          ' sur la même ligne (contexte : ' + extrait(ligne, p.index) + ')'
      );
    } else if (prenomsSurLigne.length >= 2) {
      const [a, b] = prenomsSurLigne;
      violations.ajouter(
        chemin,
        num,
        'deux prénoms sur la même ligne (« ' + a.nom + ' » puis « ' + b.nom +
          ' ») — probable état civil (contexte : ' + extrait(ligne, a.index) + ')'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------

const violations = new Violations();
const fichiers = fichiersEnStaging();

if (fichiers.length === 0) {
  console.log('Aucun fichier en staging — rien à vérifier.');
  process.exit(0);
}

for (const chemin of fichiers) {
  verifierChemin(chemin, violations);
  const contenu = lireStaging(chemin);
  if (contenu === null) continue;
  // Binaires : présence d'un octet nul dans les premiers ko.
  if (contenu.indexOf('\0', 0) !== -1) continue;
  verifierContenu(chemin, contenu, violations);
}

if (violations.taille > 0) {
  console.error(
    '\n' + violations.taille + ' violation(s) — commit refusé.\n'
  );
  violations.afficher();
  console.error(
    '\nSi une occurrence est légitime, déplacez-la dans un fichier autorisé\n' +
      '(README.md, docs/PASSATION.md, docs/DONNEES.md, .env.example,\n' +
      'scripts/sources.config.example.mjs) — la vraie donnée familiale, elle,\n' +
      'reste hors du dépôt : GEDCOM dans un dossier privé, secrets dans .env.local.\n' +
      '\n' +
      'Ce crochet est facultatif : « git config --unset core.hooksPath » le débranche.'
  );
  process.exit(1);
}

console.log(
  fichiers.length + ' fichier(s) vérifié(s), rien de sensible — commit autorisé.'
);
process.exit(0);
