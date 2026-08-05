/**
 * Analyseur GEDCOM 5.5.1 — sans dépendance.
 *
 * Deux fichiers d'ascendance produits séparément numérotent chacun leurs
 * enregistrements à partir de @I1@ et @F1@ : leurs identifiants se recouvrent.
 * On préfixe donc chaque identifiant par sa branche d'origine avant toute fusion.
 */

/** Une ligne GEDCOM : `NIVEAU [@XREF@] TAG [VALEUR]`. */
const LINE = /^\s*(\d+)\s+(?:(@[^@]+@)\s+)?([A-Za-z0-9_]+)(?:\s(.*))?$/;

const MONTHS = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

/**
 * Découpe le texte en un arbre de nœuds `{tag, xref, value, children}`.
 * CONT ajoute un saut de ligne, CONC concatène sans séparateur : les deux sont
 * repliés dans la valeur du nœud parent plutôt que conservés comme enfants.
 */
export function parseGedcom(text) {
  const roots = [];
  const stack = [];

  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const m = LINE.exec(raw);
    if (!m) continue;

    const [, levelStr, xref, tag, value = ''] = m;
    const level = Number(levelStr);

    if (tag === 'CONT' || tag === 'CONC') {
      const target = stack[level - 1];
      if (!target) continue;
      target.value += tag === 'CONT' ? `\n${value}` : value;
      continue;
    }

    const node = { tag, xref: xref ?? null, value, children: [] };
    if (level === 0) roots.push(node);
    else stack[level - 1]?.children.push(node);

    stack[level] = node;
    stack.length = level + 1;
  }

  return roots;
}

const child = (node, tag) => node.children.find((c) => c.tag === tag);
const childrenOf = (node, tag) => node.children.filter((c) => c.tag === tag);
const valueOf = (node, tag) => child(node, tag)?.value.trim() || null;

/** Retire les `@` autour d'un identifiant : `@I12@` → `I12`. */
const bare = (xref) => (xref ? xref.replace(/^@|@$/g, '') : null);

/**
 * Convertit une date GEDCOM en structure triable.
 * Gère `8 MAR 1993`, `ABT 1850`, `BEF 1900`, `BET 1850 AND 1860`, `1886`.
 */
export function parseDate(raw) {
  if (!raw) return null;
  const value = raw.trim();
  const upper = value.toUpperCase();

  let qualifier = null;
  let rest = upper;

  const between = /^BET(?:WEEN)?\s+(.+?)\s+AND\s+(.+)$/.exec(upper);
  if (between) {
    const from = parseDate(between[1]);
    const to = parseDate(between[2]);
    return {
      raw: value,
      qualifier: 'between',
      year: from?.year ?? null,
      month: null,
      day: null,
      rangeEndYear: to?.year ?? null,
      sortKey: from?.sortKey ?? null,
    };
  }

  const prefix = /^(ABT|ABOUT|EST|CAL|BEF|BEFORE|AFT|AFTER|FROM|TO)\s+(.+)$/.exec(upper);
  if (prefix) {
    const map = {
      ABT: 'about', ABOUT: 'about', EST: 'estimated', CAL: 'calculated',
      BEF: 'before', BEFORE: 'before', AFT: 'after', AFTER: 'after',
      FROM: 'from', TO: 'to',
    };
    qualifier = map[prefix[1]] ?? null;
    rest = prefix[2];
  }

  const full = /^(\d{1,2})\s+([A-Z]{3})\s+(\d{3,4})$/.exec(rest);
  if (full) {
    const [, d, mon, y] = full;
    const month = MONTHS[mon] ?? null;
    if (month) {
      return {
        raw: value, qualifier,
        year: Number(y), month, day: Number(d),
        rangeEndYear: null,
        sortKey: `${String(y).padStart(4, '0')}-${String(month).padStart(2, '0')}-${d.padStart(2, '0')}`,
      };
    }
  }

  const monthYear = /^([A-Z]{3})\s+(\d{3,4})$/.exec(rest);
  if (monthYear) {
    const month = MONTHS[monthYear[1]] ?? null;
    if (month) {
      const y = monthYear[2];
      return {
        raw: value, qualifier,
        year: Number(y), month, day: null,
        rangeEndYear: null,
        sortKey: `${y.padStart(4, '0')}-${String(month).padStart(2, '0')}-00`,
      };
    }
  }

  const yearOnly = /^(\d{3,4})$/.exec(rest);
  if (yearOnly) {
    const y = yearOnly[1];
    return {
      raw: value, qualifier,
      year: Number(y), month: null, day: null,
      rangeEndYear: null,
      sortKey: `${y.padStart(4, '0')}-00-00`,
    };
  }

  // Date libre non normalisable : on la conserve telle quelle pour l'affichage.
  return { raw: value, qualifier, year: null, month: null, day: null, rangeEndYear: null, sortKey: null };
}

/** Balises d'événement portant une DATE et/ou un PLAC. */
const EVENT_TAGS = {
  BIRT: 'naissance', CHR: 'bapteme', BAPM: 'bapteme', DEAT: 'deces', BURI: 'inhumation',
  CREM: 'cremation', MARR: 'mariage', DIV: 'divorce', ENGA: 'fiancailles',
  MARB: 'bans', RESI: 'residence', OCCU: 'profession', EDUC: 'education',
  EVEN: 'evenement', CENS: 'recensement', IMMI: 'immigration', EMIG: 'emigration',
  NATU: 'naturalisation', RETI: 'retraite', MILI: 'service_militaire',
};

function extractEvents(node) {
  const events = [];
  for (const c of node.children) {
    const type = EVENT_TAGS[c.tag];
    if (!type) continue;
    const dateRaw = valueOf(c, 'DATE');
    const place = valueOf(c, 'PLAC');
    const detail = c.value.trim() || null;
    const notes = childrenOf(c, 'NOTE').map((n) => n.value.trim()).filter(Boolean);
    if (!dateRaw && !place && !detail && notes.length === 0) continue;
    events.push({
      type,
      tag: c.tag,
      detail,
      date: parseDate(dateRaw),
      place,
      age: valueOf(c, 'AGE'),
      notes,
    });
  }
  return events;
}

function extractName(node) {
  const nameNode = child(node, 'NAME');
  if (!nameNode) return { full: null, given: null, surname: null };

  const given = valueOf(nameNode, 'GIVN');
  const surname = valueOf(nameNode, 'SURN');
  const raw = nameNode.value.trim();

  // Forme GEDCOM standard : « Prénoms /NOM/ ».
  const slashed = /^(.*?)\s*\/([^/]*)\/\s*(.*)$/.exec(raw);
  const fallbackGiven = slashed ? slashed[1].trim() : raw;
  const fallbackSurname = slashed ? slashed[2].trim() : '';

  const g = given || fallbackGiven || null;
  const s = surname || fallbackSurname || null;

  return {
    full: [g, s].filter(Boolean).join(' ') || raw || null,
    given: g,
    surname: s,
    nickname: valueOf(nameNode, 'NICK'),
    raw,
  };
}

const collectNotes = (node) =>
  childrenOf(node, 'NOTE').map((n) => n.value.trim()).filter(Boolean);

const collectSources = (node) =>
  childrenOf(node, 'SOUR').map((s) => ({
    ref: bare(s.value.trim().match(/^@.+@$/) ? s.value.trim() : null),
    text: s.value.trim().match(/^@.+@$/) ? null : s.value.trim(),
    page: valueOf(s, 'PAGE'),
    notes: collectNotes(s),
  }));

const collectMedia = (node) =>
  childrenOf(node, 'OBJE').map((o) => ({
    ref: bare(o.value.trim().match(/^@.+@$/) ? o.value.trim() : null),
    file: valueOf(o, 'FILE'),
    title: valueOf(o, 'TITL'),
    format: valueOf(o, 'FORM'),
  }));

/**
 * Les notes portent des marqueurs de fiabilité posés par l'enquête familiale :
 * [ACTE], [ANOM], [INSEE], [MEMOIRE], [A TROUVER].
 */
const PROOF_LEVELS = ['ACTE', 'ANOM', 'INSEE', 'MEMOIRE', 'A TROUVER'];

function proofLevelsIn(notes) {
  const found = new Set();
  for (const note of notes) {
    for (const level of PROOF_LEVELS) {
      if (note.toUpperCase().includes(`[${level}]`)) found.add(level);
    }
  }
  return [...found];
}

/**
 * Transforme un fichier GEDCOM en `{persons, families, media, sources, header}`,
 * chaque identifiant étant préfixé par la branche pour permettre la fusion.
 */
export function gedcomToModel(text, branch) {
  const roots = parseGedcom(text);
  const id = (xref) => (xref ? `${branch}:${bare(xref)}` : null);

  const persons = [];
  const families = [];
  const media = [];
  const sources = [];
  let header = null;

  for (const node of roots) {
    switch (node.tag) {
      case 'HEAD': {
        header = {
          branch,
          source: valueOf(node, 'SOUR'),
          date: valueOf(node, 'DATE'),
          file: valueOf(node, 'FILE'),
          note: collectNotes(node).join('\n'),
        };
        break;
      }

      case 'INDI': {
        const notes = collectNotes(node);
        persons.push({
          id: id(node.xref),
          gedcomId: bare(node.xref),
          branch,
          name: extractName(node),
          sex: valueOf(node, 'SEX'),
          events: extractEvents(node),
          notes,
          proofLevels: proofLevelsIn(notes),
          sources: collectSources(node),
          media: collectMedia(node),
          famc: childrenOf(node, 'FAMC').map((c) => id(c.value.trim())).filter(Boolean),
          fams: childrenOf(node, 'FAMS').map((c) => id(c.value.trim())).filter(Boolean),
        });
        break;
      }

      case 'FAM': {
        const notes = collectNotes(node);
        families.push({
          id: id(node.xref),
          gedcomId: bare(node.xref),
          branch,
          husband: id(valueOf(node, 'HUSB')),
          wife: id(valueOf(node, 'WIFE')),
          children: childrenOf(node, 'CHIL').map((c) => id(c.value.trim())).filter(Boolean),
          events: extractEvents(node),
          notes,
          proofLevels: proofLevelsIn(notes),
          sources: collectSources(node),
        });
        break;
      }

      case 'OBJE': {
        media.push({
          id: id(node.xref),
          branch,
          file: valueOf(node, 'FILE'),
          title: valueOf(node, 'TITL'),
          format: valueOf(node, 'FORM'),
          notes: collectNotes(node),
        });
        break;
      }

      case 'SOUR': {
        sources.push({
          id: id(node.xref),
          branch,
          title: valueOf(node, 'TITL'),
          author: valueOf(node, 'AUTH'),
          publication: valueOf(node, 'PUBL'),
          repository: valueOf(node, 'REPO'),
          text: valueOf(node, 'TEXT'),
          notes: collectNotes(node),
        });
        break;
      }
    }
  }

  return { header, persons, families, media, sources };
}
