import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToCarveAst, carveToPandoc } from '../dist/index.js';

const attrs = source => carveToCarveAst(`[x]{${source}}`).children[0].children[0].attrs;
const pandocAttr = source => carveToPandoc(`[x]{${source}}`).doc.blocks[0].c[0].c[0];

test('a later ID key or shorthand wins the id', () => {
  assert.equal(attrs('#a ID=b #c').id, 'c');
  assert.deepEqual(pandocAttr('#a ID=b #c'), ['c', [], []]);
});

test('an ID key alone is the id and its last value wins', () => {
  assert.equal(attrs('ID=b').id, 'b');
  assert.equal(attrs('Id=b ID=c').id, 'c');
});

test('an ID key equal to shorthand produces one id', () => {
  assert.deepEqual(pandocAttr('#a ID=a'), ['a', [], []]);
});

test('CLASS keys join classes in source order', () => {
  assert.deepEqual(pandocAttr('.a CLASS=b ID=c #d'), ['d', ['a', 'b'], []]);
  assert.deepEqual(pandocAttr('CLASS=b .a'), ['', ['b', 'a'], []]);
  assert.deepEqual(pandocAttr('Class="b c" CLASS=d'), ['', ['b', 'c', 'd'], []]);
});

test('other names keep their first spelling and last value', () => {
  assert.deepEqual(pandocAttr('K=1 k=2 K=3'), ['', [], [['K', '3']]]);
  assert.deepEqual(pandocAttr('K=1 k=2 x=y'), ['', [], [['K', '2'], ['x', 'y']]]);
});

test('repeated classes retain their authored occurrences', () => {
  assert.deepEqual(pandocAttr('.x .y .x CLASS="y z"'), ['', ['x', 'y', 'x', 'y', 'z'], []]);
});

test('a folded unsafe name is still sanitized', () => {
  const result = carveToPandoc('[x]{onclick=a ONCLICK=b}');
  assert.deepEqual(result.doc.blocks[0].c[0].c[0], ['', [], []]);
  assert.ok(result.warnings.some(warning => warning.includes('unsafe attribute name onclick')));
});

test('an ID key on a heading beats its generated slug', () => {
  const keyed = carveToPandoc('{ID=x}\n# Head').doc.blocks[0];
  assert.equal(keyed.c[1][0], 'x');
  assert.equal(carveToPandoc('# Head').doc.blocks[0].c[1][0], 'Head');
  assert.equal(carveToPandoc('{#a}\n# Head').doc.blocks[0].c[1][0], 'a');
});
