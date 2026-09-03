/*
 * AN EXTENDED TASK STATE, ACROSS THE BRIDGE (#158).
 *
 * PART 12 pins `taskState` to `" " x - _ > ?` and defines the first two as the
 * defaults for `checked`. The other four say something pandoc's ballot box
 * cannot, and the forward direction used to write all of them as the same
 * `☐` with an EMPTY `warnings` - a loss that reported success.
 *
 * ENGINE INDEPENDENCE IS THE POINT OF THE SHAPE HERE. `carveAstToPandoc` and
 * `pandocToCarveAst` read and write the PART 12 exchange AST, so the two
 * directions can be measured against a hand-written tree on ANY engine,
 * including the pinned `0.1.5` whose parser never emits `taskState` at all.
 * Only the last test needs a `renderCarve` that spells the state, and it says
 * so and skips rather than passing quietly.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import * as carve from '@markup-carve/carve';
import { carveAstToPandoc, pandocToCarveAst, pandocToCarve } from '../dist/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const validate = new Ajv2020({ strict: false }).compile(
  JSON.parse(readFileSync(join(repo, 'spec', 'resources', 'ast-schema.json'), 'utf8')),
);

const EXTENDED = ['-', '_', '>', '?'];
const TASK_STATE_KEY = 'carve-task-state';

/** A one-item task list in the PART 12 exchange shape. */
const listAst = (item) => ({
  type: 'document',
  children: [{ type: 'list', ordered: false, tight: true, items: [{ ...item, children: [
    { type: 'paragraph', children: [{ type: 'text', value: 'body' }] },
  ] }] }],
});

/* --- The readers, and the controls that prove each one can answer both ways. */

/** The Div the roundtrip envelope wraps a list item in, or null. */
function itemDiv(doc) {
  const list = doc.blocks[0];
  const item = (list?.c?.[1] ?? list?.c)?.[0];
  const first = item?.[0];
  return first?.t === 'Div' ? first.c[0] : null;
}

/** The value the envelope carries for the task state, or null. */
const carriedState = (doc) => itemDiv(doc)?.[2].find(([k]) => k === TASK_STATE_KEY)?.[1] ?? null;

/** The task-state diagnostics of a conversion. */
const stateDiagnostics = (result) => result.diagnostics.filter((d) => d.code === 'task-state-dropped');

test('DEAD READER: each reader answers differently on a pair built to disagree', () => {
  // A reader wired to nothing answers uniformly and scores a perfect zero, so
  // every reader below is exercised on a case it must see and one it must not.
  const carried = carveAstToPandoc(listAst({ type: 'list_item', checked: false, taskState: '-' }), { roundtrip: true });
  const plain = carveAstToPandoc(listAst({ type: 'list_item', checked: false }), { roundtrip: true });

  assert.ok(itemDiv(carried.doc), 'itemDiv found no Div on the document that has one');
  assert.equal(itemDiv(plain.doc), null, 'itemDiv reported a Div on a plain unchecked item');
  assert.equal(carriedState(carried.doc), '-', 'carriedState did not read the state it was given');
  assert.equal(carriedState(plain.doc), null, 'carriedState invented a state');

  const dropped = carveAstToPandoc(listAst({ type: 'list_item', checked: false, taskState: '-' }));
  assert.equal(stateDiagnostics(dropped).length, 1, 'stateDiagnostics saw no diagnostic where there is one');
  assert.equal(stateDiagnostics(plain).length, 0, 'stateDiagnostics invented a diagnostic');
});

/* --- Forward. */

for (const state of EXTENDED) {
  test(`carve -> pandoc: "${state}" is carried under roundtrip and warned about without it`, () => {
    const ast = listAst({ type: 'list_item', checked: false, taskState: state });

    const carried = carveAstToPandoc(ast, { roundtrip: true });
    assert.equal(carriedState(carried.doc), state);
    assert.deepEqual(stateDiagnostics(carried), [], 'nothing is lost when the state is carried');

    const dropped = carveAstToPandoc(ast);
    assert.equal(carriedState(dropped.doc), null, 'the envelope is roundtrip-only');
    const [diagnostic] = stateDiagnostics(dropped);
    assert.ok(diagnostic, 'a state written as an unchecked box must say so');
    assert.equal(diagnostic.severity, 'lossy');
    assert.deepEqual(diagnostic.details, { taskState: state });
    assert.ok(
      dropped.warnings.some((w) => w.includes(`"${state}"`)),
      'the warning names the state that was dropped: ' + JSON.stringify(dropped.warnings),
    );
  });
}

test('carve -> pandoc: the two default states are not Carve-only information', () => {
  // `" "` and `"x"` are legal `taskState` values that say exactly what
  // `checked` already says, so carrying them would put an envelope on every
  // task item in the corpus and warning about them would be noise.
  for (const [state, checked] of [[' ', false], ['x', true]]) {
    const result = carveAstToPandoc(listAst({ type: 'list_item', checked, taskState: state }), { roundtrip: true });
    assert.equal(carriedState(result.doc), null, `"${state}" needs no envelope`);
    assert.deepEqual(stateDiagnostics(result), [], `"${state}" is not a loss`);
  }
});

test('carve -> pandoc: an item with its own attributes keeps them beside the state', () => {
  const ast = listAst({
    type: 'list_item', checked: false, taskState: '>',
    attrs: { id: 'i', classes: ['c'], keyValues: { k: 'v' } },
  });
  const attr = itemDiv(carveAstToPandoc(ast, { roundtrip: true }).doc);
  assert.equal(attr[0], 'i');
  assert.deepEqual(attr[1], ['c']);
  assert.deepEqual(attr[2], [['k', 'v'], ['carve-list-item', 'true'], [TASK_STATE_KEY, '>']]);
});

/* --- Reverse. */

for (const state of EXTENDED) {
  test(`pandoc -> carve: the envelope restores "${state}" onto the item`, () => {
    const doc = carveAstToPandoc(listAst({ type: 'list_item', checked: false, taskState: state }), { roundtrip: true }).doc;
    const { ast } = pandocToCarveAst(doc);
    const item = ast.children[0].items[0];
    assert.equal(item.taskState, state);
    assert.equal(item.checked, false, 'PART 12 requires checked: false beside an extended state');
    assert.equal(item.attrs, undefined, 'the private key must not survive as an authored attribute');
    assert.ok(validate(ast), 'the restored AST does not match ast-schema.json: ' + JSON.stringify(validate.errors));
  });
}

test('pandoc -> carve: a checked item never takes an extended state', () => {
  // The envelope is data on the wire, so a document that pairs `☒` with an
  // extended state must not produce the tree PART 12 rejects.
  const doc = carveAstToPandoc(listAst({ type: 'list_item', checked: true }), { roundtrip: true }).doc;
  const list = doc.blocks[0];
  list.c[0] = [{ t: 'Div', c: [['', [], [['carve-list-item', 'true'], [TASK_STATE_KEY, '-']]], list.c[0]] }];
  const { ast } = pandocToCarveAst(doc);
  const item = ast.children[0].items[0];
  assert.equal(item.checked, true);
  assert.equal(item.taskState, undefined);
  assert.ok(validate(ast), 'the restored AST does not match ast-schema.json: ' + JSON.stringify(validate.errors));
});

/* --- The source round trip, which needs an engine that spells the state. */

/**
 * Whether the installed `renderCarve` writes `taskState`, measured rather than
 * inferred from a version string.
 *
 * The control is the point: `[x]` must come back on EVERY engine, so a probe
 * that cannot see a marker at all fails here instead of skipping the test
 * below and reading as a pass.
 */
function rendersTaskState() {
  const render = (item) => carve.renderCarve(listAst(item));
  assert.match(render({ type: 'list_item', checked: true }), /\[x\]/,
    'the capability probe cannot see a task marker it should - it is broken, not the engine');
  return /\[-\]/.test(render({ type: 'list_item', checked: false, taskState: '-' }));
}

const NO_TASK_STATE_WRITER =
  `the installed engine (${carve.LIB_VERSION ?? 'unknown'}) does not spell taskState in ` +
  'renderCarve, so a source round trip cannot show the state either way; live once the ' +
  'engine pin moves past carve-js#1601';

test('carve -> pandoc -> carve: every extended state survives as source', {
  skip: rendersTaskState() ? false : NO_TASK_STATE_WRITER,
}, () => {
  const source = '- [-] dropped\n- [_] paused\n- [>] deferred\n- [?] maybe\n';
  const doc = carveAstToPandoc(carve.toAstJson
    ? carve.toAstJson(carve.parse(source))
    : carve.parse(source), { roundtrip: true }).doc;
  const back = pandocToCarve(doc).carve;
  assert.equal(carve.carveToHtml(back), carve.carveToHtml(source));
  for (const state of EXTENDED) assert.ok(back.includes(`[${state}]`), `"${state}" is missing from:\n${back}`);
});
