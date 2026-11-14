import { test } from 'node:test';
import assert from 'node:assert/strict';
import { treesEqual } from '../vendor/carve-v2/index.js';
import { carveToCarveAst, carveToPandoc, pandocToCarveAst } from '../dist/index.js';

test('a body header outside the leading run uses a cell carrier', () => {
  const source = '|= A |= B |\n| x |= y |';
  const original = carveToCarveAst(source);
  const result = carveToPandoc(source);
  const bodyCell = result.doc.blocks[0].c[4][0][3][0][1][1];
  assert.deepEqual(bodyCell[0][2], [['carve-header', '1']]);
  assert.deepEqual(result.warnings, []);
  assert.ok(treesEqual(original, pandocToCarveAst(result.doc).ast));
});

test('a header in the leading run uses the native Pandoc table head', () => {
  const result = carveToPandoc('|= A |= B |\n| x | y |');
  assert.equal(result.doc.blocks[0].c[3][1].length, 1);
  assert.deepEqual(result.doc.blocks[0].c[3][1][0][1][0][0][2], []);
  assert.deepEqual(result.warnings, []);
});

test('attributes on a math span ride on an attributed Span', () => {
  const result = carveToPandoc('An inline $`x = 1` and a named $`y`{aria-label="why"} one.');
  const wrapper = result.doc.blocks[0].c.find(node => node.t === 'Span');
  assert.equal(wrapper.c[1][0].t, 'Math');
  assert.deepEqual(wrapper.c[0][2], [['aria-label', 'why'], ['carve-inline-type', 'math']]);
  assert.deepEqual(result.warnings, []);
});

test('math spans without attributes need no inline attribute carrier', () => {
  const inline = carveToPandoc('Plain $`x` only.').doc.blocks[0].c;
  assert.equal(inline.find(node => node.t === 'Math').t, 'Math');
  assert.ok(!inline.some(node => node.t === 'Span'));
  const display = carveToPandoc('$$`x = 1`').doc.blocks[0];
  assert.equal(display.c[1][0].c[0].t, 'Math');
});
