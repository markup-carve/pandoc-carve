import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, render, treesEqual } from '@markup-carve/carve';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const roundTrip = source => pandocToCarve(carveToPandoc(source).doc).carve;

test('a literal of spaces survives the 0.2 Pandoc JSON trip', () => {
  const source = '!`  `\n';
  assert.ok(treesEqual(parse(source), pandocToCarveAst(carveToPandoc(source).doc).ast));
  assert.equal(render(parse(roundTrip(source))), render(parse(source)));
});

test('a literal beside an ordinary code span keeps its plain style and value', () => {
  const source = '`x ` and !`y `\n';
  const blocks = carveToPandoc(source).doc.blocks;
  const inline = blocks[0].c;
  assert.equal(inline[0].t, 'Code');
  const literal = inline.find(node => node.t === 'Span');
  assert.deepEqual(literal.c[0][1], ['carve-literal']);
  assert.ok(treesEqual(parse(source), pandocToCarveAst(carveToPandoc(source).doc).ast));
});

test('a literal exports as plain styled text, not a Pandoc Code', () => {
  const inline = carveToPandoc('a !`b` c\n').doc.blocks[0].c;
  const literal = inline.find(node => node.t === 'Span');
  assert.equal(literal.c[1][0].t, 'Str');
  assert.equal(literal.c[1][0].c, 'b');
  assert.equal(render(parse(roundTrip('a !`b` c\n'))), '<p>a b c</p>');
});
