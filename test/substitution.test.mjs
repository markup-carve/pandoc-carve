import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc, pandocToCarveAst, pandocToCarve } from '../dist/index.js';

const source = '{-*old*-}{+*new*+}\n';
const expected = [
  { t: 'Span', c: [['', ['carve-delete'], []], [{ t: 'Strong', c: [{ t: 'Str', c: 'old' }] }]] },
  { t: 'Span', c: [['', ['carve-insert'], []], [{ t: 'Strong', c: [{ t: 'Str', c: 'new' }] }]] },
];

test('0.2 replacement halves retain inline structure in Pandoc', () => {
  const output = carveToPandoc(source);
  assert.deepEqual(output.doc.blocks[0].c, expected);
});

test('Pandoc delete and insert spans become separate 0.2 nodes', () => {
  const doc = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Para', c: expected }] };
  const nodes = pandocToCarveAst(doc).ast.children[0].children;
  assert.deepEqual(nodes, [
    { type: 'delete', children: [{ type: 'strong', children: [{ type: 'text', value: 'old' }] }] },
    { type: 'insert', children: [{ type: 'strong', children: [{ type: 'text', value: 'new' }] }] },
  ]);
  assert.equal(pandocToCarve(doc).carve, source);
});
