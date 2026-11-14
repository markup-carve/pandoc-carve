import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SMART_GLYPHS, SMART_KIND_NAMES, parse, render, treesEqual } from '../vendor/carve-v2/index.js';
import { carveAstToPandoc, carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const strings = value => Array.isArray(value) ? value.flatMap(strings) : !value || typeof value !== 'object' ? [] : value.t === 'Str' ? [value.c] : strings(value.c);

test('every current smart-punctuation kind exports its engine glyph', () => {
  assert.equal(SMART_KIND_NAMES.length, SMART_GLYPHS.length);
  assert.ok(SMART_KIND_NAMES.length >= 18);
  for (let i = 0; i < SMART_KIND_NAMES.length; i++) {
    const kind = SMART_KIND_NAMES[i];
    const glyph = SMART_GLYPHS[i];
    const ast = { type: 'document', astVersion: '2.0', children: [{ type: 'paragraph', children: [{ type: 'smart_punctuation', kind, source: glyph, glyph }] }] };
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
