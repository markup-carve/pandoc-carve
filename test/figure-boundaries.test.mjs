import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const str = (value) => ({ t: 'Str', c: value });
const image = (attr) => ({ t: 'Image', c: [attr, [str('Alternative')], ['p.png', '']] });
const figure = (outerAttr, imageAttr) => ({
  t: 'Figure',
  c: [outerAttr, [null, [{ t: 'Plain', c: [str('Caption')] }]], [{ t: 'Plain', c: [image(imageAttr)] }]],
});
const document = (block) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [block] });

test('Carve sends alternative text and caption to separate Pandoc slots', () => {
  for (const source of [
    '![Alternative](p.png)\n^ Caption\n',
    '![Alternative](p.png){#img .inner}\n^ Caption\n',
    '{#fig .outer}\n![Alternative](p.png)\n^ Caption\n',
    '{#fig .outer}\n![Alternative](p.png){#img .inner}\n^ Caption\n',
  ]) {
    const result = carveToPandoc(source);
    const [block] = result.doc.blocks;
    assert.equal(block.t, 'Figure', source);
    assert.equal(block.c[1][1][0].c[0].c, 'Caption', source);
    assert.equal(block.c[2][0].c[0].c[1][0].c, 'Alternative', source);
    assert.deepEqual(result.diagnostics, [], source);
  }
});

test('Pandoc keeps Figure and Image attributes on their respective Carve nodes', () => {
  for (const [outer, inner, expected] of [
    [['', [], []], ['', [], []], '![Alternative](p.png)\n^ Caption\n'],
    [['', [], []], ['img', ['inner'], []], '![Alternative](p.png){#img .inner}\n^ Caption\n'],
    [['fig', ['outer'], []], ['', [], []], '{#fig .outer}\n![Alternative](p.png)\n^ Caption\n'],
    [['fig', ['outer'], []], ['img', ['inner'], []], '{#fig .outer}\n![Alternative](p.png){#img .inner}\n^ Caption\n'],
  ]) {
    const input = document(figure(outer, inner));
    const result = pandocToCarve(input);
    assert.equal(result.carve, expected);
    assert.deepEqual(result.diagnostics, []);
    const node = pandocToCarveAst(input).ast.children[0];
    assert.equal(node.caption.children[0].children[0].value, 'Caption');
    assert.equal(node.children[0].alt, 'Alternative');
    assert.equal(node.attrs?.id, outer[0] || undefined);
    assert.equal(node.children[0].attrs?.id, inner[0] || undefined);
    assert.deepEqual(carveToPandoc(result.carve).doc.blocks[0], input.blocks[0]);
  }
});
