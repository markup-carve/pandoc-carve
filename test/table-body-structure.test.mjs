/*
 * Does the converted table have the body split its source asks for?
 *
 * test/spec-corpus.test.mjs asserts conversion, AST-schema conformance and the
 * absence of unrecognized-node degradation. None of those can see a table whose
 * bodies collapsed: a one-body table is a valid tree, converts without warning
 * and validates against the schema, so seventeen corpus documents that spell
 * `body-rows`, `body-header-rows` and `body-header-cols` passed while the
 * structure they describe was not produced (#223).
 *
 * The expectation is read from the DOCUMENT, not written down here. Each of
 * those documents states its partition in the attribute block above its table,
 * and PART 12's table contract fixes what the words mean: `body-rows="2,3"` is
 * two bodies of two and three data rows, the header lists need one entry per
 * body, an empty column entry leaves `rowHeadColumns` unset, `body-rows=""`
 * states no bodies at all, and the counts together must partition the table
 * exactly. Metadata that breaks one of those rules "stays ordinary attributes
 * and produces no explicit partition", which is an expectation too - the seven
 * `541-*` documents exist to pin it, and a converter that invented a partition
 * for them would be as wrong as one that drops a valid split.
 *
 * So both arms are checked: a valid statement must be produced, an invalid one
 * must survive as passthrough attributes over a single implicit body.
 *
 * ENGINE_LAG is a waiver, not a setting. It is keyed to the ENGINE PIN: the
 * published engine leaves the three keys unconsumed, which is release lag
 * tracked in carve-js#2495 and not a defect here, and the list below is only
 * honored while the installed engine is the version it was measured against.
 * The next engine bump expires it, loudly, and so does a document that starts
 * matching - neither can be waived by accident.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carveToPandoc } from '../dist/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = join(repo, 'spec', 'tests', 'corpus');

/** The engine version ENGINE_LAG was measured against. */
const LAG_PIN = '0.1.8';

/**
 * Documents whose split the pinned engine cannot produce yet.
 *
 * Every entry names the upstream ticket. `pin:` means the published engine
 * parses the document against a clause it has not shipped support for; it
 * clears when the pin moves, because the expiry test below refuses to honor
 * this list on any other engine version.
 */
const ENGINE_LAG = new Map([
  [
    '538-multiple-table-bodies-have-positional-source-metadata.crv',
    'pin: the engine leaves body-rows/body-header-rows/body-header-cols unconsumed (carve-js#2495)',
  ],
  [
    '539-empty-table-bodies-keep-their-source-boundaries.crv',
    'pin: the engine leaves the body metadata unconsumed (carve-js#2495)',
  ],
  [
    '540-a-table-with-no-bodies-keeps-its-head-and-foot.crv',
    'pin: body-rows="" states no bodies, the engine emits one empty body (carve-js#2495)',
  ],
  [
    '542-a-span-across-bodies-keeps-their-header-semantics.crv',
    'pin: the engine leaves the body metadata unconsumed (carve-js#2495)',
  ],
  [
    '544-explicit-body-counts-include-native-header-cells.crv',
    'pin: the engine reads the native header row as a head instead of counting it into the body (carve-js#2495)',
  ],
]);

const BODY_KEYS = ['body-rows', 'body-header-rows', 'body-header-cols'];

test('the spec corpus submodule is checked out', () => {
  assert.ok(
    existsSync(corpusDir),
    corpusDir + ' is missing. Run "git submodule update --init". A failure rather ' +
      'than a skip: a skipped corpus and a correctly split one read the same.',
  );
});

/** The installed engine, which is what the waiver is keyed to. */
function installedEngine() {
  const path = join(repo, 'node_modules', '@markup-carve', 'carve', 'package.json');
  assert.ok(existsSync(path), path + ' is missing - the engine is not installed');
  return JSON.parse(readFileSync(path, 'utf8')).version;
}

/**
 * The attribute block above a pipe table, as the author wrote it.
 *
 * Only `key=value` pairs are read, and only unquoted values or a `"..."` one:
 * that is every spelling the body metadata uses in the corpus, and a pair this
 * cannot read is reported rather than assumed absent.
 */
function authoredAttributes(source) {
  const found = [];
  const lines = source.split('\n');
  for (const [i, line] of lines.entries()) {
    const block = /^\{(.*)\}\s*$/.exec(line.trim());
    if (!block) continue;
    if (!(lines[i + 1] ?? '').trimStart().startsWith('|')) continue;
    const pairs = new Map();
    for (const match of block[1].matchAll(/([A-Za-z][\w-]*)=(?:"([^"]*)"|(\S*))/g)) {
      pairs.set(match[1], match[2] ?? match[3] ?? '');
    }
    found.push(pairs);
  }
  return found;
}

/** A count as the attributes spell one: a non-negative safe integer, or null. */
function count(text) {
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) ? value : null;
}

/** The flat row total of a Pandoc Table, and its sections. */
function shape(table) {
  const headRows = table.c[3][1].length;
  const footRows = table.c[5][1].length;
  const bodies = table.c[4].map((body) => ({
    rowHeadColumns: typeof body[1] === 'number' ? body[1] : body[1]?.c ?? 0,
    headRows: body[2].length,
    bodyRows: body[3].length,
  }));
  const total =
    headRows + footRows + bodies.reduce((sum, b) => sum + b.headRows + b.bodyRows, 0);
  return { headRows, footRows, bodies, total };
}

/**
 * What the attribute block asks for, or why it asks for nothing.
 *
 * `partition` is the stated structure when the statement is valid; `invalid`
 * carries the rule it breaks, in which case the keys have to stay passthrough.
 */
function stated(pairs, actual) {
  const raw = pairs.get('body-rows');
  if (raw === undefined) return null;

  const entries = raw === '' ? [] : raw.split(',');
  const bodyRows = entries.map(count);
  if (bodyRows.some((value) => value === null)) {
    return { invalid: 'body-rows holds an entry that is not a count: ' + JSON.stringify(raw) };
  }

  const lists = {};
  for (const key of ['body-header-rows', 'body-header-cols']) {
    const text = pairs.get(key);
    if (text === undefined) continue;
    const parts = text === '' ? [] : text.split(',');
    if (parts.length !== entries.length) {
      return {
        invalid:
          key + ' has ' + parts.length + ' entry/entries for ' + entries.length +
          ' body/bodies - the contract requires one per body',
      };
    }
    const values = parts.map((part) => (part === '' ? null : count(part)));
    if (parts.some((part, i) => part !== '' && values[i] === null)) {
      return { invalid: key + ' holds an entry that is not a count: ' + JSON.stringify(text) };
    }
    lists[key] = values;
  }

  const bodies = bodyRows.map((rows, i) => ({
    bodyRows: rows,
    headRows: lists['body-header-rows']?.[i] ?? 0,
    rowHeadColumns: lists['body-header-cols']?.[i] ?? null,
  }));

  // The partition is stated against the table's own rows, and only `header-rows`
  // and `footer-rows` take rows out of the bodies. An unspelled head is zero
  // rather than whatever the conversion produced: 544 is the document that says
  // so, counting a native `|=` header row into its body.
  const headRows = count(pairs.get('header-rows') ?? '0') ?? 0;
  const footRows = count(pairs.get('footer-rows') ?? '0') ?? 0;
  const sum =
    headRows + footRows + bodies.reduce((total, b) => total + b.headRows + b.bodyRows, 0);
  if (sum !== actual.total) {
    return {
      invalid:
        'the counts partition ' + sum + ' row(s) but the table has ' + actual.total,
    };
  }
  return { partition: { headRows, footRows, bodies } };
}

/** How many documents each arm classified, so neither can go unexercised. */
const arms = { valid: 0, invalid: 0 };

/** @returns {string | null} the structural difference, or null when it matches */
function difference(source) {
  const { doc } = carveToPandoc(source);
  const tables = doc.blocks.filter((block) => block.t === 'Table');
  const blocks = authoredAttributes(source);
  if (tables.length !== 1 || blocks.length !== 1) {
    return (
      'this check reads one attributed table per document; found ' + tables.length +
      ' table(s) and ' + blocks.length + ' attribute block(s). Widen the reader rather ' +
      'than letting the document go unchecked'
    );
  }
  const actual = shape(tables[0]);
  const expectation = stated(blocks[0], actual);
  if (expectation === null) return null;
  arms[expectation.invalid ? 'invalid' : 'valid'] += 1;

  const passthrough = new Map(tables[0].c[0][2]);
  if (expectation.invalid) {
    const dropped = BODY_KEYS.filter((key) => blocks[0].has(key) && !passthrough.has(key));
    if (dropped.length > 0) {
      return (
        'invalid body metadata (' + expectation.invalid + ') must stay ordinary ' +
        'attributes, but ' + dropped.join(', ') + ' did not survive into the table'
      );
    }
    if (actual.bodies.length > 1) {
      return (
        'invalid body metadata (' + expectation.invalid + ') must produce no explicit ' +
        'partition, but the table has ' + actual.bodies.length + ' bodies'
      );
    }
    return null;
  }

  const want = expectation.partition;
  const found = [];
  if (want.bodies.length !== actual.bodies.length) {
    found.push(
      'body count: stated ' + want.bodies.length + ', produced ' + actual.bodies.length,
    );
  }
  for (const [i, body] of want.bodies.entries()) {
    const got = actual.bodies[i];
    if (!got) continue;
    if (body.bodyRows !== got.bodyRows) {
      found.push('body ' + (i + 1) + ' rows: stated ' + body.bodyRows + ', produced ' + got.bodyRows);
    }
    if (body.headRows !== got.headRows) {
      found.push(
        'body ' + (i + 1) + ' header rows: stated ' + body.headRows + ', produced ' + got.headRows,
      );
    }
    if (body.rowHeadColumns !== null && body.rowHeadColumns !== got.rowHeadColumns) {
      found.push(
        'body ' + (i + 1) + ' row-head columns: stated ' + body.rowHeadColumns +
          ', produced ' + got.rowHeadColumns,
      );
    }
  }
  if (want.headRows !== actual.headRows) {
    found.push('head rows: stated ' + want.headRows + ', produced ' + actual.headRows);
  }
  if (want.footRows !== actual.footRows) {
    found.push('foot rows: stated ' + want.footRows + ', produced ' + actual.footRows);
  }
  const unconsumed = BODY_KEYS.filter((key) => passthrough.has(key));
  if (unconsumed.length > 0) {
    found.push(
      'unconsumed: ' + unconsumed.join(', ') + ' reached the table as passthrough ' +
        'attributes, so nothing read them',
    );
  }
  return found.length === 0 ? null : found.join('; ');
}

const documents = existsSync(corpusDir)
  ? readdirSync(corpusDir)
      .filter((file) => file.endsWith('.crv'))
      .sort()
      .map((file) => ({ name: file, source: readFileSync(join(corpusDir, file), 'utf8') }))
      .filter(({ source }) => BODY_KEYS.some((key) => source.includes(key)))
  : [];

test('both arms of the check ran over real documents', () => {
  // A population check, not a floor on a literal: an engine bump or a corpus
  // regeneration that drops these documents would leave every assertion below
  // describing nothing, and the waiver's staleness test would pass for the
  // wrong reason. Both arms have to have measured something, because a reader
  // that silently stopped recognizing one of them reads as a clean run.
  assert.ok(
    documents.length >= ENGINE_LAG.size,
    'found ' + documents.length + ' document(s) spelling ' + BODY_KEYS.join('/') +
      ', fewer than the ' + ENGINE_LAG.size + ' the waiver names. Either the corpus ' +
      'shrank or the reader stopped finding them.',
  );
  assert.ok(
    arms.valid > 0 && arms.invalid > 0,
    'classified ' + arms.valid + ' valid and ' + arms.invalid + ' invalid ' +
      'statement(s) over ' + documents.length + ' document(s). Both arms exist ' +
      'because the corpus pins both, and an arm that measured nothing is not a pass.',
  );
});

const differing = new Map();
for (const { name, source } of documents) {
  const found = difference(source);
  if (found !== null) differing.set(name, found);
}

test('every corpus table has the body split its source states', () => {
  const unexpected = [...differing]
    .filter(([name]) => !ENGINE_LAG.has(name))
    .map(([name, found]) => name + ': ' + found);
  assert.deepEqual(
    unexpected,
    [],
    'table(s) whose converted structure is not the one their attribute block ' +
      'describes. Either the bridge lost the partition, or the pinned engine does ' +
      'not consume the metadata yet - in which case add the document to ENGINE_LAG ' +
      'with a "pin:" reason naming the upstream fix:\n  ' + unexpected.join('\n  '),
  );
});

test('the waiver is keyed to the engine pin and expires with it', () => {
  // The self-expiring arm. A waiver that outlives its measurement is a
  // permanent skip wearing a ticket reference.
  const installed = installedEngine();
  assert.equal(
    installed,
    LAG_PIN,
    'ENGINE_LAG was measured against engine ' + LAG_PIN + ' and the installed engine ' +
      'is ' + installed + '. Re-measure: drop the documents the new engine splits ' +
      'correctly, and move LAG_PIN to ' + installed + ' only for the ones it still ' +
      'cannot.',
  );
});

test('the waiver holds no document that already matches', () => {
  const matching = [...ENGINE_LAG.keys()].filter((name) => !differing.has(name));
  assert.deepEqual(
    matching,
    [],
    'these documents produce the split they state now and must come OFF ENGINE_LAG:\n  ' +
      matching.join('\n  '),
  );
});

test('every waiver entry names a document the corpus still has', () => {
  const names = new Set(documents.map(({ name }) => name));
  const missing = [...ENGINE_LAG.keys()].filter((name) => !names.has(name));
  assert.deepEqual(
    missing,
    [],
    'ENGINE_LAG names document(s) this check no longer measures:\n  ' + missing.join('\n  '),
  );
});
