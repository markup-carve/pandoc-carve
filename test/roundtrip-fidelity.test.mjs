/*
 * Round-trip cases from the spec corpus that each needed a bridge fix, kept
 * here so they run against the pinned engine whatever the corpus pin is.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToHtml } from '@markup-carve/carve';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { normalizeHtml } from './html-equivalence.mjs';

const roundtrip = (src) => {
  const forward = carveToPandoc(src, { roundtrip: true });
  return pandocToCarve(forward.doc).carve;
};

const cases = {
  'a comment-only list item keeps its marker': '- %% c\n- x\n',
  'a comment inside brackets is not escaped out of them': '[a %% c] d\n',
  'a caption number and a crossref to its label': '{#t}\n| a |\n^ Table #: x\n\nSee </#t>.\n',
  'an authored valigns and widths list': '{valigns=top,bottom widths=25,50}\n| a | b | c |\n',
  'a task item that opens with a nested list': '- [x] - b\n  - c\n',
  'an empty class token': '{class=""}\npara\n',
  'a link inside a crossref target heading': '# [l](/u) t\n\n</#l-t>\n',
  'a link inside a note inside a link': '[t ^[x [a](u) b]](/w)\n',
  'an unresolved reference inside a link': '[[x][]](/u)\n',
  'a note body that wraps over lines': '[^f]: d\n  {.c\n}\n  x\n\n[^f]\n',
  'an unresolved image naming a task box': '- [ ] ![x][r]\n',
};

for (const [name, src] of Object.entries(cases)) {
  test(`round trip: ${name}`, () => {
    const back = roundtrip(src);
    assert.equal(normalizeHtml(carveToHtml(back)), normalizeHtml(carveToHtml(src)), back);
  });
}

test('a crossref target heading exports its link once', () => {
  const links = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (node.t === 'Link') links.push(node.c[2][0]);
    walk(node.c);
  };
  walk(carveToPandoc('# [l](/u) t\n\n</#l-t>\n').doc.blocks);
  assert.deepEqual(links, ['/u', '#l-t']);
});

test('an authored pos attribute survives provenance', () => {
  const { ast } = pandocToCarveAst(carveToPandoc('![x][r]{pos=foo}\n', { roundtrip: true }).doc);
  assert.deepEqual(ast.children[0].children[0].attrs.keyValues, { pos: 'foo' });
});
