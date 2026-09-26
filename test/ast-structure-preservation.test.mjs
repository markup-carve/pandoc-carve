import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveAstToPandoc, pandocToCarveAst, pandocToCarve, carveToPandoc, carveToCarveAst } from '../dist/index.js';
const text = value => ({ type: 'text', value });
const para = value => ({ type: 'paragraph', children: [text(value)] });
const document = children => ({ type: 'document', srcByteLength: 0, children });
const empty = ['', [], []];

test('sections retain nested blocks, inline formatting, attributes and explicit levels', () => {
  const section = { type: 'section', level: 2, attrs: { id: 'part', classes: ['chapter'] }, children: [
    { type: 'heading', level: 2, children: [text('Title')] },
    { type: 'section', children: [{ type: 'paragraph', children: [{ type: 'strong', children: [text('bold')] }] }] },
  ] };
  const forward = carveAstToPandoc(document([section]), { roundtrip: true });
  assert.deepEqual(forward.diagnostics, []);
  assert.equal(forward.doc.blocks[0].t, 'Div');
  assert.equal(forward.doc.blocks[0].c[1][0].t, 'Header');
  const reverse = pandocToCarveAst(forward.doc);
  assert.deepEqual(reverse.diagnostics, []);
  assert.equal(reverse.ast.children[0].type, 'section');
  assert.equal(reverse.ast.children[0].level, 2);
  assert.equal(reverse.ast.children[0].attrs.id, 'part');
  assert.deepEqual(reverse.ast.children[0].children, section.children);
  const source = pandocToCarve(forward.doc);
  assert.ok(source.diagnostics.some(d => d.code === 'structure-unspellable'));
  assert.match(source.carve, /Title/);
  assert.match(source.carve, /#part/);
  assert.match(source.carve, /chapter/);
  assert.match(source.carve, /\*bold\*/);
});

test('block cells use the table AST and preserve blocks without ListTable', () => {
  const cellBlocks = [{ t: 'Para', c: [{ t: 'Str', c: 'one' }] },
    { t: 'BulletList', c: [[{ t: 'Para', c: [{ t: 'Str', c: 'two' }] }]] }];
  const table = { t: 'Table', c: [empty, [null, []], [[{ t: 'AlignDefault' }, { t: 'ColWidth', c: 0.5 }]],
    [empty, []], [[empty, 0, [], [[empty, [[['cell', [], []], { t: 'AlignLeft' }, 1, 1, cellBlocks]]]]]], [empty, []]] };
  const input = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [table] };
  const reverse = pandocToCarveAst(input);
  assert.deepEqual(reverse.diagnostics, []);
  const actual = reverse.ast.children[0];
  assert.equal(actual.type, 'table');
  assert.equal(actual.columns[0].width, 0.5);
  assert.equal(actual.rows[0].cells[0].children, undefined);
  assert.equal(actual.rows[0].cells[0].blocks[0].children[0].value, 'one');
  assert.equal(actual.rows[0].cells[0].blocks[1].type, 'list');
  const forward = carveAstToPandoc(reverse.ast, { listTable: false });
  assert.deepEqual(forward.diagnostics, []);
  assert.deepEqual(forward.doc.blocks[0].c[4][0][3][0][1][0][4], cellBlocks);
  assert.match(pandocToCarve(input).carve, /::: list-table/);
});

test('a nested section in a block cell keeps its block structure', () => {
  const ast = document([{ type: 'table', rows: [{ type: 'table_row', cells: [{ type: 'table_cell', header: false,
    blocks: [{ type: 'section', children: [para('content')] }] }] }] }]);
  const result = carveAstToPandoc(ast, { listTable: false });
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.doc.blocks[0].c[4][0][3][0][1][0][4][0].t, 'Div');
});


test('section metadata is opt-in and invalid levels are refused', () => {
  const ast = document([{ type: 'section', children: [para('content')] }]);
  assert.deepEqual(carveAstToPandoc(ast).doc.blocks[0].c[0], empty);
  ast.children[0].level = 7;
  assert.throws(() => carveAstToPandoc(ast), /section level/);
});


test('literal private-use Unicode remains distinct from escaped spaces through a legacy parser', () => {
  const source = 'a\ue000\\ b\n';
  assert.deepEqual(carveToCarveAst(source).children[0].children.map(n => n.type), ['text', 'non_breaking_space', 'text']);
  assert.equal(carveToPandoc(source).doc.blocks[0].c.map(n => n.c ?? ' ').join(''), 'a\ue000\u00a0b');
  assert.equal(carveAstToPandoc(document([para('a\ue000b')])).doc.blocks[0].c[0].c, 'a\ue000b');
});

 test('legacy external AST interpretation is explicit', () => {
  const ast = document([para('a\ue000b')]);
  assert.equal(carveAstToPandoc(ast, { legacySpaceSentinels: true }).doc.blocks[0].c[0].c, 'a\u00a0b');
  const nodes = carveToCarveAst('a\\ b').children[0].children;
  assert.deepEqual(nodes.map(n => [n.pos.startOffset, n.pos.endOffset]), [[0, 1], [1, 3], [3, 4]]);
 });
