/**
 * Fusionne les deux GEDCOM d'ascendance en un seul modèle, autour de l'enfant.
 *
 *   node scripts/build-tree.mjs
 *
 * Les fichiers à lire sont déclarés dans `scripts/sources.config.mjs`, qui
 * n'est pas versionné : copier `sources.config.example.mjs` pour le créer.
 *
 * Produit `data/arbre-unifie.json` (jamais versionné non plus) et affiche un
 * rapport de fusion — doublons rapprochés, personnes présumées vivantes,
 * anomalies de dates — à relire avant tout import en base.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gedcomToModel } from './gedcom.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const { SOURCES: SOURCES_DECLAREES } = await import('./sources.config.mjs').catch(() => {
  console.error(
    "Aucune déclaration de sources.\n" +
    "Copiez scripts/sources.config.example.mjs en scripts/sources.config.mjs,\n" +
    'puis indiquez-y les chemins de vos fichiers GEDCOM.'
  );
  process.exit(1);
});

const SOURCES = SOURCES_DECLAREES.map((s) => ({
  branch: s.branche,
  label: s.libelle,
  path: resolve(HERE, s.chemin),
}));

/** Une personne est présumée vivante sans décès connu et née il y a moins de 110 ans. */
const PRESUMED_LIFESPAN = 110;
const THIS_YEAR = new Date().getUTCFullYear();

const eventOf = (person, type) => person.events.find((e) => e.type === type) ?? null;

function birthYear(person) {
  return eventOf(person, 'naissance')?.date?.year ?? null;
}

function isLikelyAlive(person, yearsOfChildren, yearsOfUnions) {
  const death = eventOf(person, 'deces') ?? eventOf(person, 'inhumation');
  if (death) return false;
  const year = birthYear(person);
  if (year !== null) return THIS_YEAR - year < PRESUMED_LIFESPAN;

  // Une personne sans année de naissance reste protégée, sauf lorsqu'un indice
  // généalogique objectif établit qu'elle aurait aujourd'hui plus de 110 ans.
  // Une naissance d'enfant il y a 98 ans ou plus implique au minimum 12 ans
  // pour le parent : il ne peut donc raisonnablement plus être vivant.
  const oldestChild = Math.min(...(yearsOfChildren.get(person.id) ?? []));
  if (Number.isFinite(oldestChild) && THIS_YEAR - oldestChild >= PRESUMED_LIFESPAN - 12) {
    return false;
  }

  // Même raisonnement pour une union datée : un mariage ancien établit que la
  // personne avait déjà atteint un âge minimal à cette date.
  const oldestUnion = Math.min(...(yearsOfUnions.get(person.id) ?? []));
  if (Number.isFinite(oldestUnion) && THIS_YEAR - oldestUnion >= PRESUMED_LIFESPAN - 12) {
    return false;
  }

  return null; // indéterminé : à traiter comme sensible
}

/** Clé de rapprochement : nom normalisé + année de naissance si connue. */
function matchKey(person) {
  const name = (person.name.full ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
  if (!name) return null;
  const year = birthYear(person);
  return year ? `${name}|${year}` : `${name}|?`;
}

// ---------------------------------------------------------------------------
// Lecture des deux branches
// ---------------------------------------------------------------------------

const models = SOURCES.map((source) => {
  const text = readFileSync(source.path, 'utf8');
  const model = gedcomToModel(text, source.branch);
  console.log(
    `${source.label.padEnd(26)} ${String(model.persons.length).padStart(3)} personnes, ` +
    `${String(model.families.length).padStart(3)} familles, ` +
    `${model.media.length} médias, ${model.sources.length} sources`
  );
  return { source, model };
});

const persons = models.flatMap((m) => m.model.persons);
const families = models.flatMap((m) => m.model.families);
const media = models.flatMap((m) => m.model.media);
const sources = models.flatMap((m) => m.model.sources);

// ---------------------------------------------------------------------------
// Rapprochement des doublons inter-branches
// ---------------------------------------------------------------------------
// Les personnes pivots peuvent apparaître des deux côtés : chacune est le point
// de jonction de sa propre branche et le conjoint dans l'autre. On les fond.

const byKey = new Map();
for (const person of persons) {
  const key = matchKey(person);
  if (!key || key.endsWith('|?')) continue;
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push(person);
}

const duplicates = [...byKey.entries()]
  .filter(([, group]) => group.length > 1)
  .map(([key, group]) => ({ key, ids: group.map((p) => p.id), names: group.map((p) => p.name.full) }));

/** id secondaire → id canonique retenu. Le premier vu (ordre des branches) gagne. */
const canonical = new Map();
for (const { ids } of duplicates) {
  const [keep, ...drop] = ids;
  for (const id of drop) canonical.set(id, keep);
}

const resolveId = (id) => (id ? canonical.get(id) ?? id : null);

/** Fusionne les enregistrements rapprochés : on additionne ce que chaque branche sait. */
const mergedPersons = new Map();
for (const person of persons) {
  const id = resolveId(person.id);
  const existing = mergedPersons.get(id);

  if (!existing) {
    mergedPersons.set(id, { ...person, id, mergedFrom: [person.id], branches: [person.branch] });
    continue;
  }

  existing.mergedFrom.push(person.id);
  if (!existing.branches.includes(person.branch)) existing.branches.push(person.branch);
  existing.notes = [...new Set([...existing.notes, ...person.notes])];
  existing.proofLevels = [...new Set([...existing.proofLevels, ...person.proofLevels])];
  existing.sources = [...existing.sources, ...person.sources];
  existing.media = [...existing.media, ...person.media];
  existing.famc = [...new Set([...existing.famc, ...person.famc])];
  existing.fams = [...new Set([...existing.fams, ...person.fams])];

  // On ne garde qu'un événement par type, en préférant celui qui porte une date.
  for (const event of person.events) {
    const twin = existing.events.find((e) => e.type === event.type);
    if (!twin) existing.events.push(event);
    else if (!twin.date && event.date) Object.assign(twin, event);
  }
}

const finalFamilies = families.map((family) => ({
  ...family,
  husband: resolveId(family.husband),
  wife: resolveId(family.wife),
  children: family.children.map(resolveId),
}));

for (const person of mergedPersons.values()) {
  person.famc = [...new Set(person.famc)];
  person.fams = [...new Set(person.fams)];
}

// ---------------------------------------------------------------------------
// Contrôles de cohérence
// ---------------------------------------------------------------------------

const knownIds = new Set(mergedPersons.keys());
const knownFamilies = new Set(finalFamilies.map((f) => f.id));
const anomalies = [];

for (const family of finalFamilies) {
  for (const [role, id] of [['époux', family.husband], ['épouse', family.wife]]) {
    if (id && !knownIds.has(id)) anomalies.push(`Famille ${family.id} : ${role} ${id} introuvable`);
  }
  for (const id of family.children) {
    if (!knownIds.has(id)) anomalies.push(`Famille ${family.id} : enfant ${id} introuvable`);
  }
}

for (const person of mergedPersons.values()) {
  for (const famId of [...person.famc, ...person.fams]) {
    if (!knownFamilies.has(famId)) {
      anomalies.push(`${person.name.full} (${person.id}) renvoie à la famille inconnue ${famId}`);
    }
  }

  const birth = birthYear(person);
  const death = eventOf(person, 'deces')?.date?.year ?? null;
  if (birth && death && death < birth) {
    anomalies.push(`${person.name.full} : décès (${death}) antérieur à la naissance (${birth})`);
  }
  if (birth && birth > THIS_YEAR) {
    anomalies.push(`${person.name.full} : naissance dans le futur (${birth})`);
  }
}

// Un enfant doit naître après ses parents, et d'une mère en âge de l'être.
for (const family of finalFamilies) {
  for (const parentId of [family.husband, family.wife]) {
    const parent = parentId ? mergedPersons.get(parentId) : null;
    const parentBirth = parent ? birthYear(parent) : null;
    if (!parentBirth) continue;
    for (const childId of family.children) {
      const childBirth = mergedPersons.has(childId) ? birthYear(mergedPersons.get(childId)) : null;
      if (childBirth && childBirth <= parentBirth + 12) {
        anomalies.push(
          `${parent.name.full} (né ${parentBirth}) aurait eu ${mergedPersons.get(childId).name.full} ` +
          `en ${childBirth} — écart invraisemblable`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Confidentialité et profondeur généalogique
// ---------------------------------------------------------------------------

const yearsOfChildren = new Map();
const yearsOfUnions = new Map();
for (const family of finalFamilies) {
  const marriageYear = family.events.find((event) => event.type === 'mariage')?.date?.year ?? null;
  for (const parentId of [family.husband, family.wife]) {
    if (!parentId) continue;
    const years = yearsOfChildren.get(parentId) ?? [];
    for (const childId of family.children) {
      const year = mergedPersons.has(childId) ? birthYear(mergedPersons.get(childId)) : null;
      if (year !== null) years.push(year);
    }
    yearsOfChildren.set(parentId, years);

    if (marriageYear !== null) {
      const unions = yearsOfUnions.get(parentId) ?? [];
      unions.push(marriageYear);
      yearsOfUnions.set(parentId, unions);
    }
  }
}

const living = [...mergedPersons.values()].filter(
  (p) => isLikelyAlive(p, yearsOfChildren, yearsOfUnions) !== false
);

const parentsOf = new Map();
for (const family of finalFamilies) {
  for (const childId of family.children) {
    const list = parentsOf.get(childId) ?? [];
    if (family.husband) list.push(family.husband);
    if (family.wife) list.push(family.wife);
    parentsOf.set(childId, list);
  }
}

/** Profondeur ascendante depuis une personne, en générations. */
function ascendDepth(startId) {
  let depth = 0;
  let frontier = [startId];
  const seen = new Set(frontier);
  while (frontier.length) {
    const next = [];
    for (const id of frontier) {
      for (const parent of parentsOf.get(id) ?? []) {
        if (seen.has(parent)) continue;
        seen.add(parent);
        next.push(parent);
      }
    }
    if (!next.length) break;
    depth += 1;
    frontier = next;
  }
  return { depth, reached: seen.size };
}

// La racine de l'arbre est la personne la plus récemment née qui n'a pas de
// descendance connue : c'est l'enfant depuis lequel on remonte.
const racine = [...mergedPersons.values()]
  .filter((p) => !finalFamilies.some((f) => f.husband === p.id || f.wife === p.id))
  .filter((p) => birthYear(p))
  .sort((a, b) => birthYear(b) - birthYear(a))[0] ?? null;

// Les points de jonction sont les personnes rapprochées entre les deux
// branches : chacune est le pivot de sa propre ascendance et le conjoint dans
// l'autre. Ce sont normalement les deux parents de la racine.
const jonctions = duplicates
  .map((d) => mergedPersons.get(canonical.get(d.ids[1]) ?? d.ids[0]))
  .filter(Boolean);

const oldest = [...mergedPersons.values()]
  .filter((p) => birthYear(p))
  .sort((a, b) => birthYear(a) - birthYear(b))
  .slice(0, 5);

// ---------------------------------------------------------------------------
// Rapport et écriture
// ---------------------------------------------------------------------------

const report = {
  generatedAt: new Date().toISOString(),
  counts: {
    personsBeforeMerge: persons.length,
    personsAfterMerge: mergedPersons.size,
    families: finalFamilies.length,
    media: media.length,
    sources: sources.length,
    presumedLiving: living.length,
  },
  duplicates,
  anomalies,
  racine: racine ? { id: racine.id, name: racine.name.full, born: birthYear(racine) } : null,
  jonctions: jonctions.map((p) => ({ id: p.id, name: p.name.full, branches: p.branches })),
  profondeur: Object.fromEntries(
    jonctions.map((p) => [p.name.full ?? p.id, ascendDepth(p.id)])
  ),
  oldestKnown: oldest.map((p) => ({ name: p.name.full, year: birthYear(p), branch: p.branches.join('+') })),
  presumedLiving: living.map((p) => ({ id: p.id, name: p.name.full, born: birthYear(p) })),
};

mkdirSync(resolve(ROOT, 'data'), { recursive: true });
writeFileSync(
  resolve(ROOT, 'data/arbre-unifie.json'),
  JSON.stringify(
    {
      generatedAt: report.generatedAt,
      headers: models.map((m) => m.model.header),
      persons: [...mergedPersons.values()],
      families: finalFamilies,
      media,
      sources,
    },
    null,
    2
  )
);
writeFileSync(resolve(ROOT, 'data/rapport-fusion.json'), JSON.stringify(report, null, 2));

console.log('\n=== FUSION ===');
console.log(`${report.counts.personsBeforeMerge} personnes lues → ${report.counts.personsAfterMerge} après rapprochement`);
console.log(`${report.counts.families} familles, ${report.counts.media} médias, ${report.counts.sources} sources`);
console.log(`${report.counts.presumedLiving} personnes présumées vivantes (à protéger)`);

console.log('\n=== RACINE DE L’ARBRE ===');
console.log(
  report.racine
    ? `  ${report.racine.name} (né en ${report.racine.born})`
    : '  AUCUNE : aucune personne sans descendance et avec une date de naissance.'
);

console.log('\n=== POINTS DE JONCTION ENTRE LES BRANCHES ===');
if (jonctions.length === 0) {
  console.log('  AUCUN : les deux branches ne se rejoignent nulle part. Vérifiez les sources.');
}
for (const [nom, mesure] of Object.entries(report.profondeur)) {
  console.log(`  ${nom} : ${mesure.depth} générations au-dessus, ${mesure.reached} personnes`);
}

console.log('\n=== ANCÊTRES LES PLUS ANCIENS ===');
for (const p of report.oldestKnown) console.log(`  ${p.year}  ${p.name} (${p.branch})`);

console.log(`\n=== DOUBLONS RAPPROCHÉS (${duplicates.length}) ===`);
for (const d of duplicates) console.log(`  ${d.names[0]} : ${d.ids.join(' + ')}`);

console.log(`\n=== ANOMALIES (${anomalies.length}) ===`);
for (const a of anomalies.slice(0, 25)) console.log(`  · ${a}`);
if (anomalies.length > 25) console.log(`  … et ${anomalies.length - 25} autres (voir data/rapport-fusion.json)`);

console.log('\nÉcrit : data/arbre-unifie.json et data/rapport-fusion.json');
