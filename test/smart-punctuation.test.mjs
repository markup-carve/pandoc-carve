import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SMART_PUNCTUATION, parse, render, treesEqual } from '@markup-carve/carve';
import { carveAstToPandoc, carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const strings = value => Array.isArray(value) ? value.flatMap(strings) : !value || typeof value !== 'object' ? [] : value.t === 'Str' ? [value.c] : strings(value.c);

test('every current smart-punctuation kind exports its engine glyph', () => {
  assert.ok(SMART_PUNCTUATION.length >= 18);
  for (const { kind, glyph, source } of SMART_PUNCTUATION) {
    const ast = { type: 'document', astVersion: '2.0', children: [{ type: 'paragraph', children: [{ type: 'smart_punctuation', kind, source, glyph }] }] };
    assert.ok(strings(carveAstToPandoc(ast).doc.blocks).includes(glyph), kind);
  }
});

test('double arrows survive a 0.2 JSON round trip', () => {
  const source = 'Canonical: <== ==> <=>\n';
  const initial = parse(source);
  const returned = pandocToCarveAst(carveToPandoc(source).doc).ast;
  assert.ok(treesEqual(initial, returned));
  assert.equal(render(parse(pandocToCarve(carveToPandoc(source).doc).carve)), render(initial));
});
