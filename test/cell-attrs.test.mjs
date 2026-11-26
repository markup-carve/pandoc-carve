import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { carveToCarveAst, carveToPandoc, carveAstToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';
import { findPandoc, pandocRender } from './helpers.mjs';

const pandoc = findPandoc();
const SRC = '|= A |= B |\n|{#c1 .hi k=v} c |{.y} d |{.rowcls}\n';
const bodyOf = (doc) => doc.blocks[0].c[4][0][3];
const headOf = (doc) => doc.blocks[0].c[3][1];
const body = (ast) => ast.children[0].children.find((x) => x.type === 'table_body');
const row = (ast) => body(ast).children[0];
const T = (value, extra = {}) => ({ type: 'table_cell', header: false, ...extra, children: value ? [{ type: 'cell_paragraph', children: [{ type: 'text', value }] }] : [] });
const oneRowAst = (cells) => ({ type: 'document', astVersion: '2.0', children: [{ type: 'table', columns: cells.map(() => ({ type: 'table_column' })), children: [{ type: 'table_body', children: [{ type: 'table_row', children: cells }] }] }] });

test('cell attrs: a cell attribute block reaches Pandoc as the cell Attr', () => {
  const { doc, warnings } = carveToPandoc(SRC);
  const cells = bodyOf(doc)[0][1];
  assert.deepEqual(cells[0][0], ['c1', ['hi'], [['k', 'v']]]);
  assert.deepEqual(cells[1][0], ['', ['y'], []]);
  assert.deepEqual(warnings, []);
});

test('cell attrs: a row attribute block reaches Pandoc as the row Attr', () => {
  assert.deepEqual(bodyOf(carveToPandoc(SRC).doc)[0][0], ['', ['rowcls'], []]);
});

test('cell attrs: a cell with no attributes still carries the empty Attr', () => {
  const { doc } = carveToPandoc('|= A |\n| plain |\n');
  assert.deepEqual(bodyOf(doc)[0][1][0][0], ['', [], []]);
  assert.deepEqual(bodyOf(doc)[0][0], ['', [], []]);
});

test('cell attrs: row and cell Attrs come back into 0.2 children', () => {
  const ast = pandocToCarveAst(carveToPandoc(SRC).doc).ast;
  assert.deepEqual(row(ast).attrs, { classes: ['rowcls'] });
  assert.deepEqual(row(ast).children[0].attrs, { id: 'c1', classes: ['hi'], keyValues: [['k', 'v']] });
  assert.deepEqual(row(ast).children[1].attrs, { classes: ['y'] });
});

test('cell attrs: a source round trip preserves row and cell attributes', () => {
  const source = pandocToCarve(carveToPandoc(SRC).doc).carve;
  assert.ok(source.includes('{#c1 .hi k=v}'), source);
  assert.ok(source.includes('{.rowcls}'), source);
  const left = carveToCarveAst(source).children[0].children[1].children[0];
  const right = carveToCarveAst(SRC).children[0].children[1].children[0];
  assert.deepEqual(left.attrs, right.attrs);
  assert.deepEqual(left.children.map((x) => x.attrs), right.children.map((x) => x.attrs));
});

test('cell attrs: a head-row cell keeps its Attr', () => {
  const { doc } = carveToPandoc('|={.hh} H |\n|{.dd} d |\n');
  assert.deepEqual(headOf(doc)[0][1][0][0], ['', ['hh'], []]);
  const head = pandocToCarveAst(doc).ast.children[0].children[0];
  assert.deepEqual(head.children[0].children[0].attrs, { classes: ['hh'] });
  assert.equal(head.children[0].children[0].header, true);
});

test('cell attrs: attributes on a continuation cell survive through the row carrier', () => {
  const ast = oneRowAst([T('a'), T('', { span: 'colspan', attrs: { classes: ['zz'] } })]);
  const { doc, warnings } = carveAstToPandoc(ast);
  assert.equal(bodyOf(doc)[0][1].length, 1);
  assert.deepEqual(warnings, []);
  assert.deepEqual(row(pandocToCarveAst(doc).ast).children[1].attrs, { classes: ['zz'] });
});

test('cell attrs: an orphan continuation keeps its attributes in the row carrier', () => {
  const ast = oneRowAst([T('', { span: 'colspan', attrs: { classes: ['orphan'] } })]);
  const { doc, warnings } = carveAstToPandoc(ast);
  assert.deepEqual(warnings, []);
  assert.deepEqual(row(pandocToCarveAst(doc).ast).children[0].attrs, { classes: ['orphan'] });
});

test('cell attrs: section nodes and cell attrs compose', () => {
  const ast = { type: 'document', astVersion: '2.0', children: [{ type: 'table', columns: [{ type: 'table_column' }], children: [
    { type: 'table_head', children: [{ type: 'table_row', children: [T('H', { header: true })] }] },
    { type: 'table_body', children: [{ type: 'table_row', attrs: { classes: ['br'] }, children: [T('b', { attrs: { id: 'bc' } })] }] },
    { type: 'table_foot', children: [{ type: 'table_row', attrs: { classes: ['fr'] }, children: [T('f')] }] },
  ] }] };
  const { doc } = carveAstToPandoc(ast);
  assert.deepEqual(bodyOf(doc)[0][0], ['', ['br'], []]);
  assert.deepEqual(bodyOf(doc)[0][1][0][0], ['bc', [], []]);
  assert.deepEqual(doc.blocks[0].c[5][1][0][0], ['', ['fr'], []]);
  const groups = pandocToCarveAst(doc).ast.children[0].children;
  assert.deepEqual(groups.map((x) => x.type), ['table_head', 'table_body', 'table_foot']);
  assert.deepEqual(groups[1].children[0].attrs, { classes: ['br'] });
  assert.deepEqual(groups[2].children[0].attrs, { classes: ['fr'] });
});

test('cell attrs: Pandoc writes them into HTML', { skip: !pandoc && 'pandoc not found' }, () => {
  const html = pandocRender(pandoc, carveToPandoc(SRC).doc, 'html');
  assert.ok(html.includes('id="c1"'), html);
  assert.ok(/class="[^"]*\bhi\b/u.test(html), html);
  assert.ok(/class="[^"]*\browcls\b/u.test(html), html);
  assert.ok(html.includes('k="v"'), html);
});

test('cell attrs: a table Pandoc read from HTML imports both Attrs', { skip: !pandoc && 'pandoc not found' }, () => {
  const doc = JSON.parse(execFileSync(pandoc, ['-f', 'html', '-t', 'json'], { input: '<table><tr class="rr"><td id="c" class="cc" data-k="v">a</td></tr></table>', encoding: 'utf8' }));
  const ast = pandocToCarveAst(doc).ast;
  assert.deepEqual(row(ast).attrs, { classes: ['rr'] });
  assert.deepEqual(row(ast).children[0].attrs, { id: 'c', classes: ['cc'], keyValues: [['k', 'v']] });
  const source = pandocToCarve(doc).carve;
  assert.ok(source.includes('{#c .cc k=v}'), source);
  assert.ok(source.includes('{.rr}'), source);
});
