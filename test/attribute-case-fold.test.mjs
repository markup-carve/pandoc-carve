import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveAstToPandoc } from '../dist/index.js';

// Trees as carve-js main writes them: one key per spelling, the spelling
// written last moved to the end, `order` at each slot's first write.
const span = (attrs) => ({
  type: 'document',
  children: [{ type: 'paragraph', children: [{ type: 'span', attrs, children: [{ type: 'text', value: 'x' }] }] }],
});
const convert = (attrs) => {
  const result = carveAstToPandoc(span(attrs));
  return { attr: result.doc.blocks[0].c[0].c[0], codes: result.diagnostics.map((d) => d.code) };
};

test('#id next to an ID key keeps the shorthand and says the order is unknown (#290)', () => {
  // `[x](/u){#a ID=b #c}`: carve-js renders id="c".
  const { attr, codes } = convert({ id: 'c', keyValues: { ID: 'b' }, order: ['#id', 'ID'] });
  assert.deepEqual(attr, ['c', [], []]);
  assert.deepEqual(codes, ['id-write-order-unknown']);
});

test('an ID key alone is the identifier', () => {
  assert.deepEqual(convert({ keyValues: { ID: 'b' }, order: ['ID'] }), { attr: ['b', [], []], codes: [] });
  // `{Id=b ID=c}`: the spelling written last holds the value.
  assert.deepEqual(convert({ keyValues: { Id: 'b', ID: 'c' }, order: ['Id', 'ID'] }).attr, ['c', [], []]);
});

test('an ID key with the same value as #id is one id, no diagnostic', () => {
  assert.deepEqual(convert({ id: 'a', keyValues: { ID: 'a' }, order: ['#id', 'ID'] }), { attr: ['a', [], []], codes: [] });
});

test('CLASS keys join the classes in source order (corpus 857-8)', () => {
  // `[x]{.a CLASS=b ID=c #d}` renders class="a b" id="d".
  const { attr } = convert({ classes: ['a'], keyValues: { CLASS: 'b', ID: 'c' }, id: 'd', order: ['.class', 'CLASS', 'ID', '#id'] });
  assert.deepEqual(attr, ['d', ['a', 'b'], []]);
  // `[x]{CLASS=b .a}` renders class="b a"; `{Class="b c" CLASS=d}` renders "b c d".
  assert.deepEqual(convert({ keyValues: { CLASS: 'b' }, classes: ['a'], order: ['CLASS', '.class'] }).attr, ['', ['b', 'a'], []]);
  assert.deepEqual(convert({ keyValues: { Class: 'b c', CLASS: 'd' }, order: ['Class', 'CLASS'] }).attr, ['', ['b', 'c', 'd'], []]);
});

test('any other name is one key: first spelling, last value (corpus 857-6)', () => {
  // `{K=1 k=2 K=3}` renders K="3".
  assert.deepEqual(convert({ keyValues: { k: '2', K: '3' }, order: ['K', 'k'] }).attr, ['', [], [['K', '3']]]);
  assert.deepEqual(convert({ keyValues: { K: '1', k: '2', x: 'y' }, order: ['K', 'k', 'x'] }).attr, ['', [], [['K', '2'], ['x', 'y']]]);
});

test('repeated classes render once, first occurrence kept', () => {
  assert.deepEqual(convert({ classes: ['x', 'y', 'x'], keyValues: { CLASS: 'y z' }, order: ['.class', 'CLASS'] }).attr, ['', ['x', 'y', 'z'], []]);
});

test('a folded name is still sanitized', () => {
  const { attr, codes } = convert({ keyValues: { onclick: 'a', ONCLICK: 'b' }, order: ['onclick', 'ONCLICK'] });
  assert.deepEqual(attr, ['', [], []]);
  assert.deepEqual(codes, ['unsafe-attribute-name']);
});
