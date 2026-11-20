/* Table sections in the Carve 0.2 tree and Pandoc's TableHead/Body/Foot. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carveAstToPandoc, carveToPandoc, pandocToCarve, pandocToCarveAst } from '../dist/index.js';

const text = (value) => ({ type: 'text', value });
const cell = (value, header = false) => ({ type: 'table_cell', header, children: [{ type: 'cell_paragraph', children: [text(value)] }] });
const row = (values, header = false) => ({ type: 'table_row', children: values.map((value) => cell(value, header)) });
const group = (type, values, extras = {}) => ({ type, ...extras, children: values.map(([a, b, header]) => row([a, b], header)) });
function tableAst() {
  return { type: 'document', astVersion: '2.0', children: [{
    type: 'table', columns: [{ type: 'table_column' }, { type: 'table_column' }],
    caption: { type: 'caption', short: [text('Totals')], children: [{ type: 'paragraph', children: [text('Quarterly totals')] }] },
    children: [
      group('table_head', [['Region', 'Total', true]]),
      group('table_body', [['North', '11']], { rowHeadColumns: 1 }),
      // C2-A-088: table_body has no headRows; the header cells of its first row carry the fact.
      group('table_body', [['South region', 'Total', true], ['South', '22']]),
      group('table_foot', [['All', '33']]),
    ],
  }] };
}
const S = (s) => ({ t: 'Str', c: s });
const pCell = (s) => [['', [], []], { t: 'AlignDefault' }, 1, 1, [{ t: 'Plain', c: [S(s)] }]];
const pRow = (...values) => [['', [], []], values.map(pCell)];
function pandocTable({ head = [], bodies = [], foot = [], shortCaption = null, columns = 2 } = {}) {
  return { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks: [{ t: 'Table', c: [
    ['', [], []], [shortCaption, [{ t: 'Plain', c: [S('Quarterly')] }]],
    Array.from({ length: columns }, () => [{ t: 'AlignDefault' }, { t: 'ColWidthDefault' }]),
    [['', [], []], head], bodies, [['', [], []], foot],
  ] }] };
}
const fixture = () => pandocTable({
  head: [pRow('Region', 'Total')],
  bodies: [
    [['', [], []], 1, [], [pRow('North', '11')]],
    [['north-2', ['totals'], []], 0, [pRow('South region', 'Total')], [pRow('South', '22')]],
  ],
  foot: [pRow('All', '33')], shortCaption: [S('Totals')],
});
const table = (ast) => ast.children[0];
const sections = (ast) => table(ast).children;
const parts = (doc) => doc.blocks[0].c;

// Carve tree to Pandoc: section boundaries are tree nodes, not row counts.
test('an explicit partition reaches pandoc as head, two bodies and a foot', () => {
  const { doc, warnings } = carveAstToPandoc(tableAst());
  const [, , , head, bodies, foot] = parts(doc);
  assert.deepEqual(warnings, []);
  assert.equal(head[1].length, 1);
  // C2-A-088: no head-row count, so a body's header row travels as a body row of header cells.
  assert.deepEqual(bodies.map((body) => [body[1], body[2].length, body[3].length]), [[1, 0, 1], [0, 0, 2]]);
  assert.equal(foot[1].length, 1);
  assert.equal(head[1][0][1][0][4][0].c[0].c, 'Region');
  assert.equal(bodies[1][3][1][1][0][4][0].c[0].c, 'South');
});

test('a body group carries its own attrs to the pandoc TableBody', () => {
  const ast = tableAst();
  sections(ast)[1].attrs = { id: 'north', classes: ['totals'] };
  assert.deepEqual(parts(carveAstToPandoc(ast).doc)[4][0][0], ['north', ['totals'], []]);
});

test('a short caption survives on a table that also carries sections', () => {
  assert.deepEqual(parts(carveAstToPandoc(tableAst()).doc)[1][0], [S('Totals')]);
});

test('a body header row remains separate from the table head (C2-A-088)', () => {
  const [, , , head, bodies] = parts(carveAstToPandoc(tableAst()).doc);
  assert.equal(head[1].length, 1);
  assert.equal(bodies[1][3].length, 2);
  assert.equal(bodies[1][3][0][1][0][0][2].some(([key]) => key === 'carve-header'), true);
});

test('a body carries no head-row count through a Pandoc round trip (C2-A-088)', () => {
  const back = pandocToCarveAst(carveAstToPandoc(tableAst()).doc).ast;
  assert.equal(sections(back).some((group) => 'headRows' in group), false);
});

test('a body row retains its header cell flag in the Pandoc carrier', () => {
  const back = pandocToCarveAst(carveAstToPandoc(tableAst()).doc).ast;
  assert.equal(sections(back)[2].children[0].children[0].header, true);
});

// C2-B-174: no row span crosses into the next body; the reader refuses such a tree before conversion.
test('a rowspan crossing a body boundary is refused', () => {
  const ast = tableAst();
  sections(ast)[1].children[0].children[0].rowspan = 2;
  assert.throws(() => carveAstToPandoc(ast), /row span reaches past the last row of its group/u);
});

// Pandoc to Carve tree: the 0.2 structure holds the groups directly.
test('pandoc bodies, foot and row-head columns become section nodes', () => {
  const groups = sections(pandocToCarveAst(fixture()).ast);
  assert.deepEqual(groups.map((g) => g.type), ['table_head', 'table_body', 'table_body', 'table_foot']);
  assert.deepEqual(groups.map((g) => g.children.length), [1, 1, 2, 1]);
  assert.equal(groups[1].rowHeadColumns, 1);
  // C2-A-088: Pandoc's intermediate head row becomes a row of header cells, with no headRows field.
  assert.equal(groups[2].headRows, undefined);
  assert.equal(groups[2].children[0].children[0].header, true);
  assert.deepEqual(groups[2].attrs, { id: 'north-2', classes: ['totals'] });
});

test('the AST target adds no partition attributes and no source diagnostic', () => {
  const { ast, warnings } = pandocToCarveAst(fixture());
  assert.equal(table(ast).attrs, undefined);
  assert.deepEqual(warnings, []);
});

test("a body's intermediate header row is imported as header cells", () => {
  const groups = sections(pandocToCarveAst(fixture()).ast);
  assert.equal(groups[2].children[0].children[0].header, true);
  assert.equal(groups[2].children[1].children[0].header, false);
});

test('the short caption survives alongside the sections', () => {
  assert.deepEqual(table(pandocToCarveAst(fixture()).ast).caption.short, [text('Totals')]);
});

test('control: an implicit Pandoc table gets one body node', () => {
  const doc = pandocTable({ head: [pRow('Region', 'Total')], bodies: [[['', [], []], 0, [], [pRow('North', '11')]]] });
  assert.deepEqual(sections(pandocToCarveAst(doc).ast).map((g) => g.type), ['table_head', 'table_body']);
});

test('the sections survive a full Carve AST to Pandoc to Carve AST round trip', () => {
  const ast = pandocToCarveAst(carveAstToPandoc(tableAst()).doc).ast;
  assert.deepEqual(sections(ast).map((g) => g.type), ['table_head', 'table_body', 'table_body', 'table_foot']);
  assert.deepEqual(sections(ast).map((g) => g.children.length), [1, 1, 2, 1]);
  assert.equal(sections(ast)[1].rowHeadColumns, 1);
  // C2-A-088: the header flag of the body's first row carries what headRows did.
  assert.equal(sections(ast)[2].children[0].children[0].header, true);
});

test('the AST path keeps the table node and each body boundary', () => {
  const { ast, warnings } = pandocToCarveAst(fixture());
  assert.equal(table(ast).type, 'table');
  assert.equal(sections(ast).filter((g) => g.type === 'table_body').length, 2);
  assert.deepEqual(warnings, []);
});

test('a body with no intermediate header has no declared headRows field', () => {
  assert.equal(sections(pandocToCarveAst(fixture()).ast)[1].headRows, undefined);
});

test('an empty body remains a node in the AST', () => {
  const doc = pandocTable({ bodies: [[['', [], []], 0, [], []], [['', [], []], 0, [], [pRow('a', 'b')]]] });
  assert.deepEqual(sections(pandocToCarveAst(doc).ast).map((g) => g.children.length), [0, 1]);
});

test('two bodies with equal row-head counts keep their boundary in the AST', () => {
  const doc = pandocTable({ bodies: [[['', [], []], 1, [], [pRow('a', 'b')]], [['', [], []], 1, [], [pRow('c', 'd')]]] });
  assert.deepEqual(sections(pandocToCarveAst(doc).ast).map((g) => g.rowHeadColumns), [1, 1]);
});

test('a row-head count covering every column remains explicit in the AST', () => {
  const doc = pandocTable({ columns: 1, bodies: [[['', [], []], 1, [], [pRow('a')]]] });
  assert.equal(sections(pandocToCarveAst(doc).ast)[0].rowHeadColumns, 1);
});

test('bodies that disagree on row-head columns retain both counts', () => {
  const doc = pandocTable({ bodies: [[['', [], []], 1, [], [pRow('a', 'b')]], [['', [], []], 0, [], [pRow('c', 'd')]]] });
  assert.deepEqual(sections(pandocToCarveAst(doc).ast).map((g) => g.rowHeadColumns ?? 0), [1, 0]);
});

test('a foot row may carry a header cell flag in the Carve AST', () => {
  const ast = tableAst();
  sections(ast)[3].children[0].children[0].header = true;
  const back = pandocToCarveAst(carveAstToPandoc(ast).doc).ast;
  assert.equal(sections(back)[3].children[0].children[0].header, true);
});

// C2-B-230 / C2-W-136: the writer spells bodies, body header rows and row-head columns; only body attrs stay unspellable.
test('the source writer spells the body partition and reports body attrs', () => {
  const { carve, warnings } = pandocToCarve(fixture());
  assert.match(carve, /^\{footer-rows=1 body-rows=1,1 body-header-rows=0,1 body-header-cols=1,0\}/u);
  assert.ok(warnings.some((w) => w.includes('attrs') && w.includes('table_body')), warnings.join(' | '));
  assert.ok(!warnings.some((w) => w.includes('rowHeadColumns') || w.includes('headRows')), warnings.join(' | '));
});

test('a foot remains a foot through the supported footer-rows source spelling', () => {
  const doc = pandocTable({ head: [pRow('Region', 'Total')], bodies: [[['', [], []], 0, [], [pRow('North', '11')]]], foot: [pRow('All', '33')] });
  const { carve } = pandocToCarve(doc);
  assert.match(carve, /^\{footer-rows=1\}/u);
  assert.equal(parts(carveToPandoc(carve).doc)[3][1].length, 1, 'the header remains a table head');
  assert.equal(parts(carveToPandoc(carve).doc)[5][1].length, 1);
});

test('a header cell below a plain row keeps its flag through the source round trip', () => {
  const source = '| a |\n|= b |\n';
  const { carve, warnings } = pandocToCarve(carveToPandoc(source).doc);
  assert.equal(carve, source);
  assert.deepEqual(warnings, []);
  assert.equal(sections(pandocToCarveAst(carveToPandoc(carve).doc).ast)[0].children[1].children[0].header, true);
});

test('a partition key on the incoming table attr is replaced by actual rows', () => {
  const doc = pandocTable({ head: [pRow('Region', 'Total')], bodies: [[['', [], []], 0, [], [pRow('North', '11')]]] });
  doc.blocks[0].c[0][2].push(['footer-rows', '1']);
  const { carve } = pandocToCarve(doc);
  assert.ok(!carve.includes('footer-rows'), carve);
  assert.equal(parts(carveToPandoc(carve).doc)[5][1].length, 0);
});

test('the stated footer count is absent from Pandoc table attributes', () => {
  const doc = carveToPandoc('{footer-rows=1}\n|= Region |= Total |\n| North | 11 |\n| All | 33 |\n').doc;
  assert.deepEqual(parts(doc)[0], ['', [], []]);
  assert.equal(parts(doc)[5][1].length, 1);
});

test('the AST path does not emit source spelling warnings', () => {
  assert.deepEqual(pandocToCarveAst(fixture()).warnings, []);
});

test('control: a flat table warns about nothing', () => {
  const doc = pandocTable({ head: [pRow('Region', 'Total')], bodies: [[['', [], []], 0, [], [pRow('North', '11')]]] });
  assert.deepEqual(pandocToCarveAst(doc).warnings, []);
});

function alignedTable(withHeader) {
  const doc = pandocTable({ head: withHeader ? [pRow('Region', 'Total')] : [], bodies: [[['', [], []], 0, [], [pRow('North', '11')]]] });
  doc.blocks[0].c[2] = Array.from({ length: 2 }, () => [{ t: 'AlignRight' }, { t: 'ColWidthDefault' }]);
  return doc;
}

test('column alignment with no header row lives in column records without a warning', () => {
  const { ast, warnings } = pandocToCarveAst(alignedTable(false));
  assert.deepEqual(table(ast).columns.map((c) => c.align), ['right', 'right']);
  assert.deepEqual(warnings, []);
});

test('a row-head count does not turn its cell into a column alignment', () => {
  const doc = alignedTable(false);
  doc.blocks[0].c[4][0][1] = 1;
  const { ast } = pandocToCarveAst(doc);
  assert.deepEqual(table(ast).columns.map((c) => c.align), ['right', 'right']);
  assert.equal(sections(ast)[0].children[0].children[0].align, undefined);
});

test('control: with a header row alignment stays on columns, unreported', () => {
  const { ast, warnings } = pandocToCarveAst(alignedTable(true));
  assert.deepEqual(table(ast).columns.map((c) => c.align), ['right', 'right']);
  assert.deepEqual(warnings, []);
});

test("a body's intermediate header row does not replace column alignment", () => {
  const doc = alignedTable(false);
  doc.blocks[0].c[4][0][2] = [pRow('Region', 'Total')];
  const { ast, warnings } = pandocToCarveAst(doc);
  assert.deepEqual(table(ast).columns.map((c) => c.align), ['right', 'right']);
  assert.deepEqual(warnings, []);
});
