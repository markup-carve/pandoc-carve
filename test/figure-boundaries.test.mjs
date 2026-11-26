import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveAstToPandoc, carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const str = (value) => ({ t: 'Str', c: value });
const image = (attr) => ({ t: 'Image', c: [attr, [str('Alternative')], ['p.png', '']] });
const figure = (outerAttr, imageAttr) => ({ t: 'Figure', c: [outerAttr, [null, [{ t: 'Plain', c: [str('Caption')] }]], [{ t: 'Plain', c: [image(imageAttr)] }]] });
const document = (block) => ({ 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [block] });
// C2-A-082 to C2-A-084: the captioned image paragraph is the node itself, with no figure around it.
const imageNode = (paragraphNode) => paragraphNode.children[0];
const pandocImages = (value) => Array.isArray(value) ? value.flatMap(pandocImages) : value && typeof value === 'object' ? [...(value.t === 'Image' ? [value] : []), ...pandocImages(value.c)] : [];

test('Carve sends alternative text and caption to separate Pandoc slots', () => {
  for (const source of [
    '![Alternative](p.png)\n^ Caption\n',
    '![Alternative](p.png){#img .inner}\n^ Caption\n',
    '{#fig .outer}\n![Alternative](p.png)\n^ Caption\n',
    '{#fig .outer}\n![Alternative](p.png){#img .inner}\n^ Caption\n',
  ]) {
    const { doc, warnings } = carveToPandoc(source);
    const [block] = doc.blocks;
    assert.equal(block.t, 'Figure', source);
    assert.equal(block.c[1][1][0].c[0].c, 'Caption', source);
    assert.equal(pandocImages(block)[0].c[1][0].c, 'Alternative', source);
    assert.deepEqual(warnings, [], source);
  }
});

test('Pandoc keeps Figure and Image attributes on their respective 0.2 nodes', () => {
  for (const [outer, inner, expected] of [
    [['', [], []], ['', [], []], '![Alternative](p.png)\n^ Caption\n'],
    [['', [], []], ['img', ['inner'], []], '![Alternative](p.png){#img .inner}\n^ Caption\n'],
    [['fig', ['outer'], []], ['', [], []], '{#fig .outer}\n![Alternative](p.png)\n^ Caption\n'],
    [['fig', ['outer'], []], ['img', ['inner'], []], '{#fig .outer}\n![Alternative](p.png){#img .inner}\n^ Caption\n'],
  ]) {
    const input = document(figure(outer, inner));
    const { carve, warnings } = pandocToCarve(input);
    assert.equal(carve, expected);
    assert.deepEqual(warnings, []);
    const node = pandocToCarveAst(input).ast.children[0];
    assert.equal(node.caption.children[0].children[0].value, 'Caption');
    assert.equal(imageNode(node).alt, 'Alternative');
    assert.equal(node.attrs?.id, outer[0] || undefined);
    assert.equal(imageNode(node).attrs?.id, inner[0] || undefined);
    const again = carveToPandoc(carve).doc.blocks[0];
    assert.equal(again.c[0][0], outer[0]);
    assert.equal(pandocImages(again)[0].c[0][0], inner[0]);
  }
});

test('a captioned image paragraph with an id and language comes back as one paragraph', () => {
  const caption = { type: 'caption', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Cap' }] }] };
  const ast = { type: 'document', astVersion: '2.0', children: [{ type: 'paragraph', role: 'image', attrs: { id: 'f', classes: ['c'], keyValues: [['lang', 'de'], ['dir', 'ltr']] }, children: [{ type: 'image', src: 'b.png', alt: 'a' }], caption }] };
  const node = pandocToCarveAst(carveAstToPandoc(ast).doc).ast.children[0];
  assert.deepEqual([node.type, node.role, node.attrs?.id], ['paragraph', 'image', 'f']);
  assert.deepEqual(node.attrs.classes, ['c']);
  assert.deepEqual(new Map(node.attrs.keyValues), new Map([['lang', 'de'], ['dir', 'ltr']]));
  assert.equal(node.caption.children[0].children[0].value, 'Cap');
});
