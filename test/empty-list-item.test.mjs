/*
 * AN EMPTY LIST ITEM, ON THE WAY BACK (#159).
 *
 * Carve has no BARE spelling for one: a content-less marker is not a list item
 * at all (spec/resources/examples/core.md, stricter than CommonMark), so
 * `renderCarve` puts a `+` after the marker rather than nothing. On an ordered
 * item that `+` comes back as literal text - `1. +` renders `<li>+</li>` where
 * the pandoc document said an empty item - and the loss is silent.
 *
 * The bridge now spells it with a comment, which is content the reader removes
 * before any inline run. Measured on both the pinned `0.1.5` and a carve-js
 * `main` build: `1. %%` is an item whose body is empty.
 *
 * ENGINE INDEPENDENCE. The defect is in the REVERSE direction, so a hand-built
 * Pandoc document reaches it on any engine, the pinned one included. What the
 * engine changes is only whether the placeholder is VISIBLE in the returned
 * document - see the corpus test at the end, which asserts on the emitted
 * source for that reason rather than skipping.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import * as carve from '@markup-carve/carve';
import { carveAstToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const validate = new Ajv2020({ strict: false }).compile(
  JSON.parse(readFileSync(join(repo, 'spec', 'resources', 'ast-schema.json'), 'utf8')),
);

const doc = (blocks) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks });
const plain = (text) => ({ t: 'Plain', c: [{ t: 'Str', c: text }] });
const ordered = (items) => doc([{ t: 'OrderedList', c: [[1, { t: 'Decimal' }, { t: 'Period' }], items] }]);
const bullet = (items) => doc([{ t: 'BulletList', c: items }]);

/** The item bodies of the first list in a rendering, `<li>` contents in order. */
const items = (source) => [...carve.carveToHtml(source).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);

const codes = (result) => result.diagnostics.map((d) => d.code);

test('DEAD READER: each reader answers both ways on inputs built to disagree', () => {
  // A reader wired to nothing reports "empty" for everything and scores a
  // perfect zero, so each one is exercised on a case it must see and one it
  // must not - over Carve source and Pandoc documents this file does not
  // otherwise depend on, so a broken reader fails HERE rather than turning a
  // real assertion below into a pass.
  assert.deepEqual(items('1. a\n2. b\n'), ['a', 'b'], 'the item reader cannot see item bodies');
  assert.deepEqual(items('1. %%\n'), [''], 'the item reader cannot see an EMPTY body');
  assert.notDeepEqual(items('1. a\n'), items('1. b\n'), 'the item reader cannot tell two bodies apart');

  const doc1 = { t: 'Para', c: [{ t: 'SmallCaps', c: [{ t: 'Str', c: 's' }] }] };
  assert.deepEqual(codes(pandocToCarve(doc([doc1]))), ['smallcaps-degraded'],
    'the diagnostic reader cannot see a diagnostic that is there');
  assert.deepEqual(codes(pandocToCarve(doc([plain('a')]))), [],
    'the diagnostic reader invents a diagnostic');
});

for (const [kind, build] of [['ordered', ordered], ['bullet', bullet]]) {
  test(`pandoc -> carve: an empty ${kind} item comes back empty, not as a plus`, () => {
    const result = pandocToCarve(build([[]]));
    assert.ok(!/^\s*(?:1\.|-)\s*\+/m.test(result.carve), 'the marker is followed by a literal plus:\n' + result.carve);
    assert.deepEqual(items(result.carve), [''], 'the item did not come back empty: ' + JSON.stringify(result.carve));
    assert.deepEqual(codes(result), ['empty-list-item-spelled']);
    assert.equal(result.diagnostics[0].severity, 'normalized');
  });
}

test('pandoc -> carve: an empty item keeps its place among its siblings', () => {
  const result = pandocToCarve(ordered([[plain('a')], [], [plain('c')]]));
  assert.deepEqual(items(result.carve), ['a', '', 'c']);
});

test('pandoc -> carve: a task item with no body keeps its box', () => {
  // `stripTaskMarker` empties the paragraph rather than the item, which is the
  // second shape `rendersEmpty` has to see.
  const result = pandocToCarve(bullet([[plain('☐')]]));
  assert.match(result.carve, /^- \[ \] /, 'the unchecked box is gone: ' + JSON.stringify(result.carve));
  assert.deepEqual(codes(result), ['empty-list-item-spelled']);
  assert.equal(items(result.carve)[0].replace(/<[^>]*>/g, '').trim(), '', 'the body is not empty');
});

test('pandoc -> carve: a list with nothing empty in it is not touched', () => {
  const result = pandocToCarve(ordered([[plain('a')], [plain('b')]]));
  assert.deepEqual(codes(result), []);
  assert.ok(!result.carve.includes('%%'), 'a comment was invented: ' + JSON.stringify(result.carve));
});

test('the AST path leaves the empty item empty', () => {
  // `pandocToCarveAst` hands the exchange tree on whole and an empty item is
  // expressible there, so the source path's spelling must not leak into it.
  const { ast, diagnostics } = pandocToCarveAst(ordered([[]]));
  const item = ast.children[0].items[0];
  assert.deepEqual(item.children, []);
  assert.deepEqual(diagnostics.map((d) => d.code), []);
  assert.ok(validate(ast), 'the AST does not match ast-schema.json: ' + JSON.stringify(validate.errors));
});

/* --- The corpus route, which needs an engine that empties the item. */

const CORPUS_DOC = '442-a-marker-folds-only-strictly-between-the-item-s-base-and-content-column-8.crv';
const CORPUS_SOURCE = '- lead\n1. [t]: /t\n\nSee [t][].\n';

test(`${CORPUS_DOC} comes back without a placeholder`, () => {
  // TWO assertions, because only one of them can fire on the pinned engine.
  //
  // The emitted `+` is engine-independent - the writer puts it there whatever
  // parsed the document - so the first assertion carries the gate everywhere.
  // Whether it is VISIBLE is not: measured on `0.1.5`, the returned document
  // reads `See \[t][].`, and `1. +` standing before that renders `<li></li>`,
  // so the HTML halves agree and the second assertion passes over a document
  // that still holds the placeholder. On a build of carve-js `main` the link
  // resolves, the `+` survives as text, and the second one fires too.
  //
  // Recorded rather than skipped: a skip here would hide an assertion that
  // does its job on every engine.
  const source = readFileSync(join(repo, 'spec', 'tests', 'corpus', CORPUS_DOC), 'utf8');
  assert.equal(source, CORPUS_SOURCE, 'the corpus document moved; re-measure before trusting this test');
  const forward = carve.toAstJson ? carve.toAstJson(carve.parse(source)) : carve.parse(source);
  const back = pandocToCarve(carveAstToPandoc(forward, { roundtrip: true }).doc).carve;
  assert.ok(!/^\s*1\.\s*\+\s*$/m.test(back), 'the empty item came back as a placeholder:\n' + back);
  assert.equal(carve.carveToHtml(back), carve.carveToHtml(source));
});
