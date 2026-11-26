import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { carveToCarveAst, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { findPandoc } from './helpers.mjs';

const pandoc = findPandoc();
const GRID = `+------+---------------+
| a    | - one
|      | - two
+------+---------------+
| b    | para one
|      |
|      | para two
+------+---------------+

Table: A caption
`;
const RICH_HTML = `<table><caption>Cap</caption><thead><tr><th>H1</th><th>H2</th></tr></thead><tbody><tr><td rowspan="2">spanning</td><td><ul><li>x</li><li>y</li></ul></td></tr><tr><td>plain</td></tr></tbody><tfoot><tr><td>f1</td><td>f2</td></tr></tfoot></table>`;
const read = (source, from) => JSON.parse(execFileSync(pandoc, ['-f', from, '-t', 'json'], { input: source, encoding: 'utf8' }));
const table = (doc) => pandocToCarveAst(doc).ast.children[0];
const body = (node) => node.children.find((x) => x.type === 'table_body');
const cell = (node, row, col) => body(node).children[row].children[col];

test('block cells: a table with block content stays a table in the 0.2 tree', { skip: !pandoc && 'pandoc not found' }, () => {
  const { ast, warnings } = pandocToCarveAst(read(GRID, 'markdown'));
  const node = ast.children[0];
  assert.equal(node.type, 'table');
  assert.equal(body(node).children.length, 2);
  assert.equal(cell(node, 0, 1).children[0].type, 'list');
  assert.deepEqual(cell(node, 0, 1).children[0].children.map((item) => item.children[0].children[0].value), ['one', 'two']);
  assert.deepEqual(cell(node, 1, 1).children.map((block) => block.type), ['paragraph', 'paragraph']);
  assert.equal(node.caption.children[0].children.map((x) => x.value).join(''), 'A caption');
  assert.deepEqual(warnings, []);
});

test('block cells: source output reparses as one table without a stray paragraph', { skip: !pandoc && 'pandoc not found' }, () => {
  const { carve, warnings } = pandocToCarve(read(GRID, 'markdown'));
  assert.deepEqual(carveToCarveAst(carve).children.map((x) => x.type), ['table']);
  assert.ok(warnings.some((w) => w.includes('structure-unspellable') && w.includes('table_cell')), warnings.join(' | '));
});

test('block cells: head, row span, caption and foot stay in the 0.2 tree', { skip: !pandoc && 'pandoc not found' }, () => {
  const node = table(read(RICH_HTML, 'html'));
  assert.deepEqual(node.children.map((x) => x.type), ['table_head', 'table_body', 'table_foot']);
  assert.equal(cell(node, 0, 0).rowspan, 2);
  assert.equal(node.caption.children[0].children[0].value, 'Cap');
});

test('block cells: the source writer reports a row span it cannot spell', { skip: !pandoc && 'pandoc not found' }, () => {
  const { warnings } = pandocToCarve(read(RICH_HTML, 'html'));
  assert.ok(warnings.some((w) => w.includes('rowspan') && w.includes('table_cell')), warnings.join(' | '));
});

test('block cells: column alignment stays in column records', { skip: !pandoc && 'pandoc not found' }, () => {
  const aligned = `+:-------+---------------:+
| head   | other          |
+:=======+===============:+
| a      | - one
|        | - two
+--------+----------------+
`;
  const { ast, warnings } = pandocToCarveAst(read(aligned, 'markdown'));
  assert.deepEqual(ast.children[0].columns.map((x) => x.align), ['left', 'right']);
  assert.deepEqual(warnings, []);
});

test("block cells: a body's intermediate header rows stay in that body", () => {
  const block = (t, c) => ({ t, c });
  const pCell = (blocks) => [['', [], []], { t: 'AlignDefault' }, 1, 1, blocks];
  const pRow = (blocks) => [['', [], []], [pCell(blocks)]];
  const doc = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Table', c: [
    ['', [], []], [null, []], [[{ t: 'AlignDefault' }, { t: 'ColWidthDefault' }]], [['', [], []], []],
    [[['', [], []], 0, [pRow([block('Plain', [{ t: 'Str', c: 'mid' }])])], [pRow([block('BulletList', [[block('Plain', [{ t: 'Str', c: 'x' }])]])])]]],
    [['', [], []], []],
  ] }] };
  const { ast, warnings } = pandocToCarveAst(doc);
  // C2-A-088: no headRows field; the intermediate head row keeps its header cells.
  assert.equal(body(ast.children[0]).headRows, undefined);
  assert.equal(cell(ast.children[0], 0, 0).header, true);
  assert.equal(cell(ast.children[0], 1, 0).children[0].type, 'list');
  assert.deepEqual(warnings, []);
});

test('block cells: an all-inline table remains a table without diagnostics', { skip: !pandoc && 'pandoc not found' }, () => {
  const { ast, warnings } = pandocToCarveAst(read('| a | b |\n|---|---|\n| x | y |\n', 'markdown'));
  assert.equal(ast.children[0].type, 'table');
  assert.deepEqual(warnings, []);
});

test('block cells: an empty cell alongside a block cell stays empty', { skip: !pandoc && 'pandoc not found' }, () => {
  const src = `+---+--------+
|   | - one  |
+---+--------+
`;
  const node = table(read(src, 'markdown'));
  // C2-A-091: a cell holds at least one child; an empty cell is one empty cell_paragraph.
  assert.deepEqual(cell(node, 0, 0).children, [{ type: 'cell_paragraph', children: [] }]);
  assert.equal(cell(node, 0, 1).children[0].type, 'list');
});

test('block cells: two paragraphs alone trigger a source loss diagnostic', { skip: !pandoc && 'pandoc not found' }, () => {
  const src = `+------+-----------+
| a    | para one
|      |
|      | para two
+------+-----------+
`;
  const doc = read(src, 'markdown');
  assert.deepEqual(cell(table(doc), 0, 1).children.map((x) => x.type), ['paragraph', 'paragraph']);
  const { carve, warnings } = pandocToCarve(doc);
  assert.deepEqual(carveToCarveAst(carve).children.map((x) => x.type), ['table']);
  assert.ok(warnings.some((w) => w.includes('structure-unspellable') && w.includes('table_cell')), warnings.join(' | '));
});

test('block cells: merged body groups and their attributes are reported', () => {
  const C = (blocks) => [['', [], []], { t: 'AlignDefault' }, 1, 1, blocks];
  const R = (blocks) => [['', [], []], [C(blocks)]];
  const doc = { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Table', c: [
    ['', [], []], [null, []], [[{ t: 'AlignDefault' }, { t: 'ColWidthDefault' }]], [['', [], []], []],
    [[['', ['g1'], []], 0, [], [R([{ t: 'BulletList', c: [[{ t: 'Plain', c: [{ t: 'Str', c: 'x' }] }]] }])]],
      [['', [], []], 0, [], [R([{ t: 'Plain', c: [{ t: 'Str', c: 'p' }] }])]]], [['', [], []], []],
  ] }] };
  const { ast, warnings } = pandocToCarveAst(doc);
  assert.equal(ast.children[0].children.filter((x) => x.type === 'table_body').length, 2);
  assert.deepEqual(ast.children[0].children[0].attrs.classes, ['g1']);
  assert.deepEqual(warnings, []);
  const sourceWarnings = pandocToCarve(doc).warnings;
  // C2-B-230: the writer spells the body partition; the body's attributes remain unspellable.
  assert.ok(sourceWarnings.some((w) => w.includes('field-unspellable') && w.includes('attrs') && w.includes('table_body')), sourceWarnings.join(' | '));
});
