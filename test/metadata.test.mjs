import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { carveToPandoc, pandocToCarve } from '../dist/index.js';
import { findPandoc } from './helpers.mjs';

const pandoc = findPandoc();

/*
 * The reader used to take one flat `key: value` line at a time. A nested map or
 * a block sequence therefore produced one "line not understood" per CHILD line
 * and left the PARENT key as an empty `MetaInlines` - a key that looks present
 * and carries nothing, with no diagnostic about the emptying. Going the other
 * way, `MetaMap` and a `MetaList` of maps hit `default: return null` and were
 * dropped, so `author: [ - name:, affiliation: ]` - the shape every pandoc
 * template reads - did not survive an import at all.
 *
 * Decision D5(b) stands: `MetaBlocks` keeps its skip-with-warn, because block
 * content has no honest YAML string form.
 */

const NESTED = `---
title: T
nested:
  a: 1
  b: two
list:
  - one
  - two
deep:
  x:
    y: z
flow: [a, b]
author:
  - name: Ada
    affil: X
  - name: Bob
---

Body.
`;

const readMeta = (source) =>
  JSON.parse(execFileSync(pandoc, ['-f', 'markdown', '-t', 'json'], { input: source, encoding: 'utf8' })).meta;

test('metadata: a nested map becomes a MetaMap, not an empty value', () => {
  const { doc, warnings } = carveToPandoc(NESTED);
  assert.deepEqual(warnings, [], 'nothing is "not understood" any more');
  assert.equal(doc.meta.nested.t, 'MetaMap');
  assert.equal(doc.meta.nested.c.a.c[0].c, '1');
  assert.equal(doc.meta.deep.c.x.t, 'MetaMap', 'two levels down');
  assert.equal(doc.meta.deep.c.x.c.y.c[0].c, 'z');
});

test('metadata: a block sequence becomes a MetaList', () => {
  const { doc } = carveToPandoc(NESTED);
  assert.equal(doc.meta.list.t, 'MetaList');
  assert.deepEqual(doc.meta.list.c.map((x) => x.c[0].c), ['one', 'two']);
  assert.equal(doc.meta.flow.t, 'MetaList', 'the flow form still works');
});

test('metadata: a sequence of maps keeps each map whole', () => {
  const { doc } = carveToPandoc(NESTED);
  const [ada, bob] = doc.meta.author.c;
  assert.equal(ada.t, 'MetaMap');
  assert.deepEqual(Object.keys(ada.c).sort(), ['affil', 'name'], 'the aligned second key belongs to the same item');
  assert.equal(ada.c.name.c[0].c, 'Ada');
  assert.deepEqual(Object.keys(bob.c), ['name']);
});

test('metadata: the reading matches pandoc\'s own', { skip: !pandoc && 'pandoc not found' }, () => {
  // The strongest available check: pandoc reads the same frontmatter with a
  // real YAML parser, and the two Metas must agree.
  const { doc } = carveToPandoc(NESTED);
  assert.deepEqual(doc.meta, readMeta(NESTED));
});

test('metadata: a MetaMap comes back as nested YAML', { skip: !pandoc && 'pandoc not found' }, () => {
  const doc = { 'pandoc-api-version': [1, 23, 1], meta: readMeta(NESTED), blocks: [] };
  const { carve, warnings } = pandocToCarve(doc);
  assert.deepEqual(warnings, []);
  assert.ok(carve.includes('nested:\n  a: 1\n  b: two'), carve);
  assert.ok(carve.includes('deep:\n  x:\n    y: z'), carve);
  assert.ok(carve.includes('list: [one, two]'), 'a list of scalars keeps the flow form');
  assert.ok(carve.includes('author:\n  - affil: X\n    name: Ada\n  - name: Bob'), carve);
});

test('metadata: the round trip preserves the whole Meta', { skip: !pandoc && 'pandoc not found' }, () => {
  const meta = readMeta(NESTED);
  const { carve } = pandocToCarve({ 'pandoc-api-version': [1, 23, 1], meta, blocks: [] });
  assert.deepEqual(carveToPandoc(carve).doc.meta, meta);
});

test('metadata: the emitted frontmatter is read the same way by pandoc', { skip: !pandoc && 'pandoc not found' }, () => {
  // The emitter is not writing YAML only this repo can read.
  const meta = readMeta(NESTED);
  const { carve } = pandocToCarve({ 'pandoc-api-version': [1, 23, 1], meta, blocks: [] });
  const yaml = carve.replace(/^---yaml\n/, '---\n');
  assert.deepEqual(readMeta(yaml), meta);
});

test('metadata: MetaBlocks is skipped with a warning, which is policy', { skip: !pandoc && 'pandoc not found' }, () => {
  const source = `---
abstract: |
  Para one.

  Para two.
keywords:
  - a
---

Body.
`;
  const meta = readMeta(source);
  assert.equal(meta.abstract.t, 'MetaBlocks', 'the premise');

  const { carve, warnings } = pandocToCarve({ 'pandoc-api-version': [1, 23, 1], meta, blocks: [] });
  assert.ok(
    warnings.some((w) => w.includes('abstract') && w.includes('MetaBlocks')),
    warnings.join(' | '),
  );
  assert.ok(!carve.includes('abstract'), 'no half-serialized value is written');
  assert.ok(carve.includes('keywords: [a]'), 'the rest of the metadata is unaffected');
});

test('metadata: a line that fits no shape is still reported and skipped', () => {
  const { doc, warnings } = carveToPandoc('---\ngood: yes\n!!weird\n---\n\nBody.\n');
  assert.equal(doc.meta.good.c[0].c, 'yes');
  assert.ok(
    warnings.some((w) => w.includes('line not understood') && w.includes('!!weird')),
    warnings.join(' | '),
  );
});

test('metadata: a key with nothing under it is an empty value, not a hang', () => {
  const { doc, warnings } = carveToPandoc('---\nempty:\nafter: x\n---\n\nBody.\n');
  assert.deepEqual(doc.meta.empty, { t: 'MetaInlines', c: [] });
  assert.equal(doc.meta.after.c[0].c, 'x', 'the reader kept going');
  assert.deepEqual(warnings, []);
});

test('metadata: a malformed deeper line terminates instead of spinning', () => {
  // The reader advances only when a line is consumed, so an indented line that
  // fits nothing must be reported and stepped over by hand.
  const { doc, warnings } = carveToPandoc('---\nkey:\n  !!weird\nafter: x\n---\n\nBody.\n');
  assert.equal(doc.meta.after.c[0].c, 'x');
  assert.ok(
    warnings.some((w) => w.includes('not understood') && w.includes('!!weird')),
    warnings.join(' | '),
  );
});

test('metadata: a non-yaml frontmatter format is still refused', () => {
  const { doc, warnings } = carveToPandoc('---toml\ntitle = "T"\n---\n\nBody.\n');
  assert.deepEqual(doc.meta, {});
  assert.ok(warnings.some((w) => w.includes('not supported')), warnings.join(' | '));
});

test('metadata: a quoted list scalar holding a colon stays a scalar', { skip: !pandoc && 'pandoc not found' }, () => {
  // `- "scope: local"` looks like a `key: value` line once the quotes are
  // ignored, and pandoc reads it as one string. Reading it as a map produced a
  // key of `"scope`.
  const source = `---
keywords:
  - "scope: local"
  - plain
---

B.
`;
  const { doc } = carveToPandoc(source);
  assert.deepEqual(doc.meta, readMeta(source));
  assert.equal(doc.meta.keywords.c[0].t, 'MetaInlines');
});

test('metadata: an empty map keeps its shape through the round trip', () => {
  // `key:` with nothing under it reads back as an EMPTY VALUE, not an empty
  // map, so an empty map needs the flow spelling to survive.
  const meta = { cfg: { t: 'MetaMap', c: {} }, k: { t: 'MetaInlines', c: [{ t: 'Str', c: 'v' }] } };
  const { carve, warnings } = pandocToCarve({ 'pandoc-api-version': [1, 23, 1], meta, blocks: [] });
  assert.deepEqual(warnings, [], 'an empty map is not a value with no YAML form');
  assert.ok(carve.includes('cfg: {}'), carve);
  assert.deepEqual(carveToPandoc(carve).doc.meta, meta);
});

test('metadata: a quoted key is still a key', () => {
  const { doc, warnings } = carveToPandoc('---\n"a b": v\n---\n\nB.\n');
  assert.deepEqual(warnings, []);
  assert.equal(doc.meta['a b'].c[0].c, 'v');
});
