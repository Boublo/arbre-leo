/**
 * Reprend les fichiers GEDCOM et prépare l'import de ce qui a changé.
 *
 *   npm run arbre:maj
 *
 * Enchaîne la fusion et la génération du SQL, puis dit ce qui est nouveau par
 * rapport au dernier passage : combien de personnes, lesquelles, quelles
 * branches. C'est ce rapport qu'il faut lire avant d'envoyer quoi que ce soit
 * en base.
 *
 * L'import qui suit est rejouable et n'efface rien : rien n'oblige à repartir
 * de zéro, seules les nouveautés entrent.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const EMPREINTE = resolve(ROOT, 'data/derniere-fusion.json');

/** Ce qu'on retient d'un passage, pour savoir ce qui a bougé au suivant. */
function empreinteDe(arbre) {
  return {
    date: new Date().toISOString(),
    personnes: Object.fromEntries(
      arbre.persons.map((p) => [
        p.id,
        {
          nom: p.name.full,
          naissance: p.events.find((e) => e.type === 'naissance')?.date?.year ?? null,
        },
      ])
    ),
    familles: arbre.families.map((f) => f.id),
  };
}

const precedente = existsSync(EMPREINTE)
  ? JSON.parse(readFileSync(EMPREINTE, 'utf8'))
  : null;

// --- Fusion et génération ---------------------------------------------------

const lancer = (script) =>
  execFileSync(process.execPath, [resolve(HERE, script)], { encoding: 'utf8', cwd: ROOT });

console.log(lancer('build-tree.mjs'));
console.log(lancer('generate-import-sql.mjs'));

// --- Ce qui a changé --------------------------------------------------------

const arbre = JSON.parse(readFileSync(resolve(ROOT, 'data/arbre-unifie.json'), 'utf8'));
const courante = empreinteDe(arbre);

console.log('\n=== DEPUIS LE DERNIER PASSAGE ===');

if (!precedente) {
  console.log(`  Premier passage : ${arbre.persons.length} personnes, ${arbre.families.length} familles.`);
} else {
  const avant = new Set(Object.keys(precedente.personnes));
  const apres = new Set(Object.keys(courante.personnes));

  const nouvelles = [...apres].filter((id) => !avant.has(id));
  const disparues = [...avant].filter((id) => !apres.has(id));

  const modifiees = [...apres].filter((id) => {
    if (!avant.has(id)) return false;
    const a = precedente.personnes[id];
    const b = courante.personnes[id];
    return a.nom !== b.nom || a.naissance !== b.naissance;
  });

  console.log(`  ${nouvelles.length} nouvelles, ${modifiees.length} corrigées, ${disparues.length} disparues`);

  if (nouvelles.length) {
    console.log('\n  NOUVELLES :');
    for (const id of nouvelles.slice(0, 40)) {
      const p = courante.personnes[id];
      console.log(`    · ${p.nom}${p.naissance ? ` (${p.naissance})` : ''}`);
    }
    if (nouvelles.length > 40) console.log(`    … et ${nouvelles.length - 40} autres`);
  }

  if (modifiees.length) {
    console.log('\n  CORRIGÉES :');
    for (const id of modifiees.slice(0, 20)) {
      const a = precedente.personnes[id];
      const b = courante.personnes[id];
      console.log(`    · ${a.nom} (${a.naissance ?? '?'}) → ${b.nom} (${b.naissance ?? '?'})`);
    }
  }

  // Une disparition est presque toujours une anomalie : un identifiant GEDCOM
  // qui change, ou une personne retirée du fichier source. La ligne reste en
  // base — l'import n'efface rien — d'où l'avertissement.
  if (disparues.length) {
    console.log('\n  DISPARUES DU FICHIER SOURCE (elles restent en base) :');
    for (const id of disparues.slice(0, 20)) {
      const p = precedente.personnes[id];
      console.log(`    · ${p.nom}${p.naissance ? ` (${p.naissance})` : ''}  [${id}]`);
    }
  }
}

writeFileSync(EMPREINTE, JSON.stringify(courante, null, 2));

console.log('\n=== SUITE ===');
console.log('  Les blocs SQL sont dans data/sql/, à exécuter dans l’ordre de leur numérotation.');
console.log('  Ils portent tous « on conflict do nothing » : rejouables, sans rien effacer.');
