import { test } from 'node:test';
import assert from 'node:assert/strict';
import { treesEqual } from '../vendor/carve/index.js';
import { carveAstToPandoc, pandocToCarveAst, pandocToCarve, carveToPandoc, carveToCarveAst } from '../dist/index.js';

const text = value => ({ type: 'text', value });
const paragraph = value => ({ type: 'paragraph', children: [text(value)] });
const document = children => ({ type: 'document', astVersion: '2.0', children });
const empty = ['', [], []];

test('sections retain nested blocks, formatting, attributes, and levels', () => {
  const section = { type: 'section', level: 2, attrs: { id: 'part', classes: ['chapter'] }, children: [
    { type: 'heading', level: 2, children: [text('Title')] },
    { type: 'section', children: [{ type: 'paragraph', children: [{ type: 'strong', children: [text('bold')] }] }] },
  ] };
  const forward = carveAstToPandoc(document([section]));
  assert.deepEqual(forward.warnings, []);
  assert.equal(forward.doc.blocks[0].t, 'Div');
  assert.equal(forward.doc.blocks[0].c[1][0].t, 'Header');
  const reverse = pandocToCarveAst(forward.doc);
  assert.ok(treesEqual(reverse.ast, document([section])));
  const source = pandocToCarve(forward.doc);
  assert.ok(source.warnings.some(warning => warning.includes('structure-unspellable')));
  assert.match(source.carve, /Title/u);
  assert.match(source.carve, /bold/u);
});

test('block cells retain separate blocks in the 0.2 table tree', () => {
  const cellBlocks = [{ t: 'Para', c: [{ t: 'Str', c: 'one' }] },
    { t: 'BulletList', c: [[{ t: 'Para', c: [{ t: 'Str', c: 'two' }] }]] }];
  const table = { t: 'Table', c: [empty, [null, []], [[{ t: 'AlignDefault' }, { t: 'ColWidth', c: 0.5 }]],
    [empty, []], [[empty, 0, [], [[empty, [[['cell', [], []], { t: 'AlignLeft' }, 1, 1, cellBlocks]]]]]], [empty, []]] };
  const input = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [table] };
  const ast = pandocToCarveAst(input).ast;
  const cell = ast.children[0].children[0].children[0].children[0];
  assert.equal(ast.children[0].columns[0].width, 0.5);
  assert.equal(cell.children[0].children[0].value, 'one');
  assert.equal(cell.children[1].type, 'list');
  assert.deepEqual(carveAstToPandoc(ast).doc.blocks[0].c[4][0][3][0][1][0][4], cellBlocks);
  assert.ok(pandocToCarve(input).warnings.some(warning => warning.includes('structure-unspellable')));
});

test('a nested section in a block cell keeps its block structure', () => {
  const ast = document([{ type: 'table', columns: [{ type: 'table_column' }], children: [{ type: 'table_body', children: [
    { type: 'table_row', children: [{ type: 'table_cell', header: false, children: [{ type: 'section', children: [paragraph('content')] }] }] },
  ] }] }]);
  const result = carveAstToPandoc(ast);
  assert.equal(result.doc.blocks[0].c[4][0][3][0][1][0][4][0].t, 'Div');
  assert.equal(pandocToCarveAst(result.doc).ast.children[0].children[0].children[0].children[0].children[0].type, 'section');
});

test('section level is optional and a nonpositive level is refused', () => {
  const ast = document([{ type: 'section', children: [paragraph('content')] }]);
  assert.deepEqual(carveAstToPandoc(ast).doc.blocks[0].c[0], ['', ['carve-section'], []]);
  ast.children[0].level = 0;
  assert.throws(() => carveAstToPandoc(ast), /not a count of at least 1/u);
});

test('private-use Unicode stays distinct from a nonbreaking space', () => {
  const source = 'a\ue000\\ b';
  const nodes = carveToCarveAst(source).children[0].children;
  assert.deepEqual(nodes.map(node => node.type), ['text', 'non_breaking_space', 'text']);
  const inlines = carveToPandoc(source).doc.blocks[0].c;
  assert.equal(inlines.map(node => node.c).join(''), 'a\ue000\u00a0b');
  assert.equal(carveAstToPandoc(document([paragraph('a\ue000b')])).doc.blocks[0].c[0].c, 'a\ue000b');
});
